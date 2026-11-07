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
const { crearUsuarios, PERMISOS, ROLES, IDS_PERMISOS } = require('./usuarios');
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

function crearServidor({ archivoDatos, archivoRegistros, archivoAjustes, archivoUsuarios, claveAdmin, nombreCampana } = {}) {
  const usuarios = crearUsuarios(archivoUsuarios);
  const store = crearStore(archivoDatos);
  const registros = crearRegistros(archivoRegistros);
  const ajustes = crearAjustes(archivoAjustes, { nombre: nombreCampana });
  const claveHash = claveAdmin ? hashClave(claveAdmin) : null;

  // Sesiones del panel: token aleatorio -> { vence, usuarioId } (usuarioId null = clave maestra)
  const sesiones = new Map();

  function crearSesion(usuarioId = null) {
    const token = crypto.randomBytes(32).toString('base64url');
    sesiones.set(token, { vence: Date.now() + DURACION_SESION, usuarioId });
    if (usuarioId) usuarios.registrarAcceso(usuarioId);
    return `sesion=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${DURACION_SESION / 1000}`;
  }

  const MAESTRO = Object.freeze({
    id: null, maestro: true, nombre: 'Director (clave maestra)', puesto: 'Dueño de la cuenta', correo: '', permisos: IDS_PERMISOS,
  });

  // Bloqueo simple contra fuerza bruta: 10 intentos fallidos por IP cada 15 min.
  const fallos = new Map();
  const pedidosClave = new Map(); // solicitudes de "olvidé mi contraseña" por IP
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

  // ¿Quién hace la petición? Devuelve el perfil (con sus permisos actuales) o null.
  function identidad(req) {
    const token = leerCookies(req).sesion;
    const s = token && sesiones.get(token);
    if (s) {
      if (s.vence < Date.now()) { sesiones.delete(token); return null; }
      if (!s.usuarioId) return MAESTRO;
      const u = usuarios.activo(s.usuarioId);
      if (!u) { sesiones.delete(token); return null; } // perfil desactivado o eliminado
      return { ...u, maestro: false };
    }
    const m = (req.headers.authorization || '').match(/^Bearer (.+)$/);
    return m && claveCorrecta(m[1]) ? MAESTRO : null;
  }

  const NOMBRE_PERMISO = Object.fromEntries(PERMISOS.map((p) => [p.id, p.nombre.toLowerCase()]));

  /** Exige sesión y, si se indica, un permiso. Devuelve el perfil. */
  function exigirPermiso(req, permiso) {
    const ip = req.socket.remoteAddress || '';
    // Con la clave en la cabecera, una IP bloqueada no puede seguir probando claves
    if (req.headers.authorization) verificarBloqueo(ip);
    const quien = identidad(req);
    if (!quien) {
      verificarBloqueo(ip);
      registrarFallo(ip);
      throw new ErrorValidacion('Inicie sesión en el panel', 401);
    }
    if (permiso && !quien.permisos.includes(permiso)) {
      throw new ErrorValidacion(`Su perfil no tiene permiso para ${NOMBRE_PERMISO[permiso] || permiso}`, 403);
    }
    return quien;
  }

  const datosSesion = (q) => (q ? {
    admin: true,
    usuario: { id: q.id, nombre: q.nombre, puesto: q.puesto, correo: q.correo, permisos: q.permisos, maestro: Boolean(q.maestro) },
  } : { admin: false, usuario: null });

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
        enviarJSON(res, 200, { ...publicos, totalRegistros: registros.total(), marca: MARCA }, extra);
        return;
      }
      if (ruta === '/api/ajustes' && req.method === 'GET') {
        exigirPermiso(req, 'ajustes');
        enviarJSON(res, 200, ajustes.obtener(), extra);
        return;
      }
      if (ruta === '/api/app/version' && req.method === 'GET') {
        enviarJSON(res, 200, leerVersionApp(), extra);
        return;
      }
      if (ruta === '/api/ajustes' && req.method === 'PUT') {
        exigirPermiso(req, 'ajustes');
        const cuerpo = await leerCuerpo(req, 700 * 1024); // admite la foto del candidato
        enviarJSON(res, 200, ajustes.actualizar(cuerpo), extra);
        return;
      }
      if (ruta === '/api/sesion' && req.method === 'GET') {
        enviarJSON(res, 200, datosSesion(identidad(req)), extra);
        return;
      }
      if (ruta === '/api/sesion' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || '';
        verificarBloqueo(ip);
        const { correo, clave } = await leerCuerpo(req);
        let quien = null;
        if (correo && String(correo).trim()) {
          const u = usuarios.verificar(correo, clave);
          if (u) quien = { ...u, maestro: false };
        } else if (claveCorrecta(clave)) {
          quien = MAESTRO;
        }
        if (!quien) {
          registrarFallo(ip);
          throw new ErrorValidacion(correo ? 'Correo o contraseña incorrectos' : 'Contraseña incorrecta', 401);
        }
        fallos.delete(ip);
        const cookiesSalida = [crearSesion(quien.id)];
        if (extra['Set-Cookie']) cookiesSalida.push(extra['Set-Cookie']);
        enviarJSON(res, 200, datosSesion(quien), { 'Set-Cookie': cookiesSalida });
        return;
      }
      if (ruta === '/api/sesion' && req.method === 'DELETE') {
        sesiones.delete(cookies.sesion);
        enviarJSON(res, 200, { admin: false }, {
          'Set-Cookie': 'sesion=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
        });
        return;
      }

      // ---- Olvidé mi contraseña: avisa al director (la respuesta es igual exista o no el correo) ----
      if (ruta === '/api/olvide' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || '';
        const p = pedidosClave.get(ip);
        if (p && Date.now() - p.desde > VENTANA) pedidosClave.delete(ip);
        const actual = pedidosClave.get(ip) || { n: 0, desde: Date.now() };
        if (actual.n >= 5) throw new ErrorValidacion('Demasiadas solicitudes. Espere 15 minutos.', 429);
        actual.n += 1;
        pedidosClave.set(ip, actual);
        const { correo } = await leerCuerpo(req);
        if (!correo || !String(correo).includes('@')) throw new ErrorValidacion('Escriba su correo', 400, 'correo');
        usuarios.solicitarClave(correo);
        enviarJSON(res, 200, { ok: true }, extra);
        return;
      }

      // ---- Mi contraseña ----
      if (ruta === '/api/mi-clave' && req.method === 'PUT') {
        const quien = exigirPermiso(req);
        if (quien.maestro) throw new ErrorValidacion('La clave maestra se cambia en el servidor (ADMIN_PASSWORD)', 400);
        const { actual, nueva } = await leerCuerpo(req);
        usuarios.cambiarClavePropia(quien.id, actual, nueva);
        enviarJSON(res, 200, { ok: true }, extra);
        return;
      }

      // ---- Usuarios y permisos ----
      if (ruta === '/api/usuarios' && req.method === 'GET') {
        exigirPermiso(req, 'usuarios');
        enviarJSON(res, 200, { usuarios: usuarios.listar(), permisos: PERMISOS, roles: ROLES }, extra);
        return;
      }
      if (ruta === '/api/usuarios' && req.method === 'POST') {
        exigirPermiso(req, 'usuarios');
        enviarJSON(res, 201, usuarios.crear(await leerCuerpo(req)), extra);
        return;
      }
      const mu = ruta.match(/^\/api\/usuarios\/([0-9a-f-]{36})$/);
      if (mu && req.method === 'PUT') {
        const quien = exigirPermiso(req, 'usuarios');
        enviarJSON(res, 200, usuarios.actualizar(mu[1], await leerCuerpo(req), quien.id), extra);
        return;
      }
      if (mu && req.method === 'DELETE') {
        const quien = exigirPermiso(req, 'usuarios');
        usuarios.eliminar(mu[1], quien.id);
        enviarJSON(res, 200, { ok: true }, extra);
        return;
      }

      // ---- Panel ----
      if (ruta === '/api/panel' && req.method === 'GET') {
        exigirPermiso(req, 'tablero');
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
        exigirPermiso(req, 'exportar');
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
        exigirPermiso(req, 'registros');
        enviarJSON(res, 200, registros.listar(), extra);
        return;
      }
      if (ruta === '/api/registros.csv' && req.method === 'GET') {
        exigirPermiso(req, 'exportar');
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
        exigirPermiso(req, 'eliminar');
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
        exigirPermiso(req, 'encuestas');
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
          exigirPermiso(req, 'encuestas');
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
  const archivoUsuarios = process.env.USUARIOS_FILE || path.join(__dirname, 'data', 'usuarios.json');
  crearServidor({ archivoDatos, archivoRegistros, archivoAjustes, archivoUsuarios, claveAdmin, nombreCampana }).listen(puerto, () => {
    console.log(`Formulario público: http://localhost:${puerto}/`);
    console.log(`Panel del equipo:   http://localhost:${puerto}/#/panel`);
  });
}

module.exports = { crearServidor };
