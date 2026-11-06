/*!
 * App de campaña — © Opita Digital. Todos los derechos reservados.
 * Prohibida su copia, distribución o modificación sin autorización escrita.
 */
'use strict';

// Servidor HTTP de la app de campaña. Sin dependencias externas.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { crearStore, ErrorValidacion } = require('./store');
const { crearRegistros, MAX_FIRMA } = require('./registros');
const { crearAjustes } = require('./ajustes');
const { crearGoogle } = require('./google');
const MARCA = require('./marca');
const { crearExcelTablero } = require('./exportar/excel');
const { crearReportePDF } = require('./exportar/pdf');

const PUBLICO = path.join(__dirname, 'public');
const MAX_CUERPO = 16 * 1024;
const DURACION_SESION = 8 * 60 * 60 * 1000; // 8 horas
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.apk': 'application/vnd.android.package-archive',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const CABECERAS_SEGURIDAD = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; " +
    "font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function leerCookies(req) {
  const out = {};
  for (const parte of (req.headers.cookie || '').split(';')) {
    const i = parte.indexOf('=');
    if (i > 0) {
      try {
        out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim());
      } catch { /* cookie malformada: se ignora */ }
    }
  }
  return out;
}

function enviarJSON(res, estado, datos, extra = {}) {
  res.writeHead(estado, {
    ...CABECERAS_SEGURIDAD,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extra,
  });
  res.end(JSON.stringify(datos));
}

function leerCuerpo(req, max = MAX_CUERPO) {
  return new Promise((resolve, reject) => {
    const tipo = req.headers['content-type'] || '';
    if (!tipo.startsWith('application/json')) {
      reject(new ErrorValidacion('Se esperaba application/json', 415));
      return;
    }
    let tam = 0;
    const partes = [];
    req.on('data', (c) => {
      tam += c.length;
      if (tam > max) {
        reject(new ErrorValidacion('Cuerpo demasiado grande', 413));
        req.destroy();
        return;
      }
      partes.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(partes).toString('utf8') || '{}'));
      } catch {
        reject(new ErrorValidacion('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

function servirEstatico(req, res, ruta, cookie) {
  let relativa;
  try {
    relativa = ruta === '/' ? 'index.html' : decodeURIComponent(ruta).replace(/^\/+/, '');
  } catch {
    enviarJSON(res, 404, { error: 'No encontrado' });
    return;
  }
  const archivo = path.resolve(PUBLICO, relativa);
  if (!archivo.startsWith(PUBLICO + path.sep)) {
    enviarJSON(res, 404, { error: 'No encontrado' });
    return;
  }
  fs.readFile(archivo, (err, datos) => {
    if (err) {
      enviarJSON(res, 404, { error: 'No encontrado' });
      return;
    }
    const ext = path.extname(archivo);
    res.writeHead(200, {
      ...CABECERAS_SEGURIDAD,
      'Content-Type': TIPOS[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache',
      ...(cookie ? { 'Set-Cookie': cookie } : {}),
    });
    res.end(req.method === 'HEAD' ? undefined : datos);
  });
}

function hashClave(v) {
  return crypto.createHash('sha256').update(String(v)).digest();
}

function leerVersionApp() {
  try {
    const v = JSON.parse(fs.readFileSync(path.join(PUBLICO, 'descargas', 'version.json'), 'utf8'));
    const existe = fs.existsSync(path.join(PUBLICO, 'descargas', 'campana.apk'));
    return { disponible: existe, ...v, apk: '/descargas/campana.apk' };
  } catch {
    return { disponible: false };
  }
}

function crearServidor({ archivoDatos, archivoRegistros, archivoAjustes, claveAdmin, nombreCampana, google: opcionesGoogle } = {}) {
  const google = crearGoogle(opcionesGoogle);
  const canjes = new Map(); // token de un solo uso (app Android) -> vencimiento
  const store = crearStore(archivoDatos);
  const registros = crearRegistros(archivoRegistros);
  const ajustes = crearAjustes(archivoAjustes, { nombre: nombreCampana });
  const claveHash = claveAdmin ? hashClave(claveAdmin) : null;

  // Sesiones del panel: token aleatorio -> vencimiento.
  const sesiones = new Map();

  function crearSesion() {
    const token = crypto.randomBytes(32).toString('base64url');
    sesiones.set(token, Date.now() + DURACION_SESION);
    return `sesion=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACION_SESION / 1000}`;
  }

  function urlBase(req) {
    const publica = ajustes.obtener().urlPublica;
    if (publica) return new URL(publica).origin;
    const proto = req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    return `${proto}://${req.headers.host}`;
  }

  function redirigir(res, destino, cookies = []) {
    res.writeHead(302, { ...CABECERAS_SEGURIDAD, Location: destino, 'Cache-Control': 'no-store', ...(cookies.length ? { 'Set-Cookie': cookies } : {}) });
    res.end();
  }

  // Rutas de "Entrar con Google". Devuelve true si atendió la petición.
  async function rutasGoogle(req, res, url, ruta, cookies) {
    if (!ruta.startsWith('/auth/') || req.method !== 'GET') return false;
    const fallo = (motivo) => redirigir(res, `/?acceso=${encodeURIComponent(motivo)}#/panel`,
      ['oauth_estado=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0']);

    if (ruta === '/auth/google') {
      if (!google.configurado) { fallo('google-no-configurado'); return true; }
      const estado = `${crypto.randomBytes(24).toString('base64url')}${url.searchParams.get('app') ? '.app' : ''}`;
      redirigir(res, google.urlAutorizacion(`${urlBase(req)}/auth/google/callback`, estado),
        [`oauth_estado=${estado}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=600`]);
      return true;
    }
    if (ruta === '/auth/google/callback') {
      const estado = url.searchParams.get('state') || '';
      if (!google.configurado || !cookies.oauth_estado || estado !== cookies.oauth_estado) { fallo('estado'); return true; }
      try {
        const { correo } = await google.canjear(url.searchParams.get('code') || '', `${urlBase(req)}/auth/google/callback`);
        if (!ajustes.obtener().correosEquipo.includes(correo)) { fallo('correo-no-autorizado'); return true; }
        const borrarEstado = 'oauth_estado=; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=0';
        if (estado.endsWith('.app')) {
          const t = crypto.randomBytes(32).toString('base64url');
          canjes.set(t, Date.now() + 2 * 60 * 1000);
          redirigir(res, `opitacampana://sesion?t=${t}`, [borrarEstado]);
        } else {
          redirigir(res, '/#/panel', [crearSesion(), borrarEstado]);
        }
      } catch {
        fallo('google');
      }
      return true;
    }
    if (ruta === '/auth/canje') {
      const t = url.searchParams.get('t') || '';
      const vence = canjes.get(t);
      canjes.delete(t);
      if (!vence || vence < Date.now()) { fallo('enlace-vencido'); return true; }
      redirigir(res, '/#/panel', [crearSesion()]);
      return true;
    }
    return false;
  }

  // Bloqueo simple contra fuerza bruta: 10 intentos fallidos por IP cada 15 min.
  const fallos = new Map();
  const VENTANA = 15 * 60 * 1000;

  function verificarBloqueo(ip) {
    const f = fallos.get(ip);
    if (f && Date.now() - f.desde > VENTANA) fallos.delete(ip);
    if ((fallos.get(ip)?.n || 0) >= 10) {
      throw new ErrorValidacion('Demasiados intentos. Espere 15 minutos.', 429);
    }
  }
  function registrarFallo(ip) {
    const actual = fallos.get(ip) || { n: 0, desde: Date.now() };
    actual.n += 1;
    fallos.set(ip, actual);
  }
  function claveCorrecta(valor) {
    return Boolean(claveHash && typeof valor === 'string' &&
      crypto.timingSafeEqual(claveHash, hashClave(valor)));
  }

  function sesionValida(req) {
    const token = leerCookies(req).sesion;
    if (!token) return false;
    const vence = sesiones.get(token);
    if (!vence) return false;
    if (vence < Date.now()) {
      sesiones.delete(token);
      return false;
    }
    return true;
  }

  function esAdmin(req) {
    if (sesionValida(req)) return true;
    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    return Boolean(m && claveCorrecta(m[1]));
  }

  function exigirAdmin(req) {
    const ip = req.socket.remoteAddress || '';
    if (sesionValida(req)) return;
    verificarBloqueo(ip);
    if (!esAdmin(req)) {
      registrarFallo(ip);
      throw new ErrorValidacion('Inicie sesión como administrador', 401);
    }
    fallos.delete(ip);
  }

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const ruta = url.pathname;

    // Identidad anónima del votante: cookie aleatoria HttpOnly.
    const cookies = leerCookies(req);
    let votante = /^[A-Za-z0-9_-]{20,64}$/.test(cookies.votante || '') ? cookies.votante : null;
    const extra = {};
    if (!votante) {
      votante = crypto.randomBytes(24).toString('base64url');
      extra['Set-Cookie'] =
        `votante=${votante}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`;
    }

    try {
      if (await rutasGoogle(req, res, url, ruta, cookies)) return;

      if (!ruta.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          enviarJSON(res, 405, { error: 'Método no permitido' });
          return;
        }
        servirEstatico(req, res, ruta, extra['Set-Cookie']);
        return;
      }

      // Protección CSRF básica: las peticiones que modifican datos deben ser del mismo origen.
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        const origen = req.headers.origin;
        if (origen && origen !== `http://${req.headers.host}` && origen !== `https://${req.headers.host}`) {
          throw new ErrorValidacion('Origen no permitido', 403);
        }
      }

      // ---- Configuración y sesión ----
      if (ruta === '/api/config' && req.method === 'GET') {
        const { correosEquipo, ...publicos } = ajustes.obtener();
        enviarJSON(res, 200, { ...publicos, totalRegistros: registros.total(), marca: MARCA, google: google.configurado }, extra);
        return;
      }
      if (ruta === '/api/ajustes' && req.method === 'GET') {
        exigirAdmin(req);
        enviarJSON(res, 200, ajustes.obtener(), extra);
        return;
      }
      if (ruta === '/api/app/version' && req.method === 'GET') {
        enviarJSON(res, 200, leerVersionApp(), extra);
        return;
      }
      if (ruta === '/api/ajustes' && req.method === 'PUT') {
        exigirAdmin(req);
        const cuerpo = await leerCuerpo(req, 700 * 1024); // admite la foto del candidato
        enviarJSON(res, 200, ajustes.actualizar(cuerpo), extra);
        return;
      }
      if (ruta === '/api/sesion' && req.method === 'GET') {
        enviarJSON(res, 200, { admin: sesionValida(req) }, extra);
        return;
      }
      if (ruta === '/api/sesion' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || '';
        verificarBloqueo(ip);
        const { clave } = await leerCuerpo(req);
        if (!claveCorrecta(clave)) {
          registrarFallo(ip);
          throw new ErrorValidacion('Contraseña incorrecta', 401);
        }
        fallos.delete(ip);
        const token = crypto.randomBytes(32).toString('base64url');
        sesiones.set(token, Date.now() + DURACION_SESION);
        const cookiesSalida = [
          `sesion=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACION_SESION / 1000}`,
        ];
        if (extra['Set-Cookie']) cookiesSalida.push(extra['Set-Cookie']);
        enviarJSON(res, 200, { admin: true }, { 'Set-Cookie': cookiesSalida });
        return;
      }
      if (ruta === '/api/sesion' && req.method === 'DELETE') {
        sesiones.delete(cookies.sesion);
        enviarJSON(res, 200, { admin: false }, {
          'Set-Cookie': 'sesion=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
        });
        return;
      }

      // ---- Panel ----
      if (ruta === '/api/panel' && req.method === 'GET') {
        exigirAdmin(req);
        const encuestas = store.listar();
        const filtro = {
          periodo: url.searchParams.get('periodo') || '30',
          comuna: url.searchParams.get('comuna') || '',
          edad: url.searchParams.get('edad') || '',
        };
        enviarJSON(res, 200, {
          ...registros.estadisticas(filtro),
          encuestas: {
            total: encuestas.length,
            activas: encuestas.filter((e) => !e.cerrada).length,
            votos: encuestas.reduce((s, e) => s + e.totalVotos, 0),
            lista: encuestas.slice(0, 4),
          },
        }, extra);
        return;
      }

      // ---- Descargas: Excel del tablero y reporte PDF ----
      if ((ruta === '/api/tablero.xlsx' || ruta === '/api/reporte.pdf') && req.method === 'GET') {
        exigirAdmin(req);
        const filtro = {
          periodo: url.searchParams.get('periodo') || '30',
          comuna: url.searchParams.get('comuna') || '',
          edad: url.searchParams.get('edad') || '',
        };
        const aj = ajustes.obtener();
        const encuestas = store.listar();
        const encuesta = encuestas.find((e) => !e.cerrada) || encuestas[0] || null;
        const votos = encuestas.reduce((t, e) => t + e.totalVotos, 0);
        const fecha = new Date().toISOString().slice(0, 10);
        const slug = aj.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'campana';
        let cuerpo; let tipo; let nombre;
        if (ruta === '/api/tablero.xlsx') {
          cuerpo = crearExcelTablero(registros.listar(), {
            nombre: aj.nombre, comuna: filtro.comuna, edad: filtro.edad, encuesta, votos,
          });
          tipo = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          nombre = `tablero-${slug}-${fecha}.xlsx`;
        } else {
          const periodos = { 7: 'últimos 7 días', 30: 'últimos 30 días', 90: 'últimos 90 días', todo: 'desde el inicio' };
          const partes = [periodos[filtro.periodo] || 'últimos 30 días'];
          if (filtro.comuna) partes.push(filtro.comuna);
          if (filtro.edad) partes.push(`${filtro.edad} años`);
          cuerpo = crearReportePDF({
            nombre: aj.nombre,
            candidato: aj.candidato,
            filtroTexto: `Filtros: ${partes.join(' · ')}`,
            stats: registros.estadisticas(filtro),
            lista: registros.listaFiltrada(filtro),
            votos,
            generado: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' }),
          });
          tipo = 'application/pdf';
          nombre = `reporte-${slug}-${fecha}.pdf`;
        }
        res.writeHead(200, {
          ...CABECERAS_SEGURIDAD,
          'Content-Type': tipo,
          'Content-Disposition': `attachment; filename="${nombre}"`,
          'Content-Length': cuerpo.length,
          'Cache-Control': 'no-store',
        });
        res.end(cuerpo);
        return;
      }

      // ---- Registros de la campaña ----
      if (ruta === '/api/barrios' && req.method === 'GET') {
        enviarJSON(res, 200, registros.barrios(), extra);
        return;
      }
      if (ruta === '/api/registros' && req.method === 'POST') {
        const cuerpo = await leerCuerpo(req, MAX_FIRMA + 4096);
        enviarJSON(res, 201, registros.agregar(cuerpo), extra);
        return;
      }
      if (ruta === '/api/registros' && req.method === 'GET') {
        exigirAdmin(req);
        enviarJSON(res, 200, registros.listar(), extra);
        return;
      }
      if (ruta === '/api/registros.csv' && req.method === 'GET') {
        exigirAdmin(req);
        res.writeHead(200, {
          ...CABECERAS_SEGURIDAD,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="registros-campana.csv"',
          'Cache-Control': 'no-store',
        });
        res.end(registros.csv());
        return;
      }
      const mr = ruta.match(/^\/api\/registros\/([0-9a-f-]{36})$/);
      if (mr && req.method === 'DELETE') {
        exigirAdmin(req);
        registros.eliminar(mr[1]);
        enviarJSON(res, 200, { ok: true }, extra);
        return;
      }

      // ---- Encuestas ----
      if (ruta === '/api/encuestas' && req.method === 'GET') {
        enviarJSON(res, 200, store.listar(), extra);
        return;
      }
      if (ruta === '/api/encuestas' && req.method === 'POST') {
        exigirAdmin(req);
        const cuerpo = await leerCuerpo(req);
        enviarJSON(res, 201, store.crear(cuerpo), extra);
        return;
      }

      const m = ruta.match(/^\/api\/encuestas\/([A-Za-z0-9_-]{1,32})(\/votar|\/cerrar)?$/);
      if (m) {
        const [, id, accion] = m;
        if (!accion && req.method === 'GET') {
          const e = store.obtener(id, votante);
          if (!e) throw new ErrorValidacion('Encuesta no encontrada', 404);
          enviarJSON(res, 200, e, extra);
          return;
        }
        if (accion === '/votar' && req.method === 'POST') {
          const { opcion } = await leerCuerpo(req);
          enviarJSON(res, 200, store.votar(id, opcion, votante), extra);
          return;
        }
        if (accion === '/cerrar' && req.method === 'POST') {
          exigirAdmin(req);
          enviarJSON(res, 200, store.cerrar(id), extra);
          return;
        }
      }

      throw new ErrorValidacion('Ruta no encontrada', 404);
    } catch (err) {
      if (err instanceof ErrorValidacion) {
        enviarJSON(res, err.estado, { error: err.message, ...(err.campo ? { campo: err.campo } : {}) }, extra);
      } else {
        console.error(err);
        enviarJSON(res, 500, { error: 'Error interno' }, extra);
      }
    }
  });
}

if (require.main === module) {
  const puerto = Number(process.env.PORT) || 3000;
  const archivoDatos = process.env.DATA_FILE || path.join(__dirname, 'data', 'encuestas.json');
  const archivoRegistros =
    process.env.REGISTROS_FILE || path.join(__dirname, 'data', 'registros.json');
  let claveAdmin = process.env.ADMIN_PASSWORD;
  if (!claveAdmin) {
    claveAdmin = crypto.randomBytes(9).toString('base64url');
    console.log(`ADMIN_PASSWORD no definida. Contraseña temporal del panel: ${claveAdmin}`);
  }
  const nombreCampana = process.env.NOMBRE_CAMPANA;
  const archivoAjustes = process.env.AJUSTES_FILE || path.join(__dirname, 'data', 'ajustes.json');
  const google = { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET };
  crearServidor({ archivoDatos, archivoRegistros, archivoAjustes, claveAdmin, nombreCampana, google }).listen(puerto, () => {
    console.log(`Formulario público: http://localhost:${puerto}/`);
    console.log(`Panel del equipo:   http://localhost:${puerto}/#/panel`);
  });
}

module.exports = { crearServidor };
