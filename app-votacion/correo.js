/*!
 * © Opita Digital — Todos los derechos reservados.
 * Envío de correos por SMTP (Gmail, Outlook, Hostinger, etc.) sin librerías:
 * configuración, plantillas, reintentos e historial de envíos.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const tls = require('node:tls');
const crypto = require('node:crypto');
const { ErrorValidacion } = require('./store');

const TIEMPO_LIMITE = 20000;

// ---------- Cliente SMTP ----------
class Conexion {
  constructor(socket) {
    this.usar(socket);
  }

  usar(socket) {
    this.socket = socket;
    this.bufer = '';
    this.esperando = null;
    socket.setEncoding('utf8');
    socket.on('data', (d) => { this.bufer += d; this.revisar(); });
    socket.on('error', (e) => this.fallar(e));
    socket.on('close', () => this.fallar(Object.assign(new Error('El servidor cerró la conexión'), { code: 'CERRADO' })));
  }

  revisar() {
    if (!this.esperando) return;
    const lineas = this.bufer.split('\r\n');
    for (let i = 0; i < lineas.length - 1; i++) {
      if (/^\d{3} /.test(lineas[i]) || /^\d{3}$/.test(lineas[i])) {
        const respuesta = lineas.slice(0, i + 1);
        this.bufer = lineas.slice(i + 1).join('\r\n');
        const { resolver } = this.esperando;
        this.esperando = null;
        clearTimeout(this.reloj);
        resolver({ codigo: Number(respuesta[i].slice(0, 3)), texto: respuesta.join('\n') });
        return;
      }
    }
  }

  fallar(e) {
    if (!this.esperando) return;
    const { rechazar } = this.esperando;
    this.esperando = null;
    clearTimeout(this.reloj);
    rechazar(e);
  }

  leer() {
    return new Promise((resolver, rechazar) => {
      this.esperando = { resolver, rechazar };
      this.reloj = setTimeout(() => this.fallar(Object.assign(new Error('El servidor de correo no respondió a tiempo'), { code: 'ETIMEDOUT' })), TIEMPO_LIMITE);
      this.revisar();
    });
  }

  async enviar(comando, esperado, oculto = false) {
    this.socket.write(`${comando}\r\n`);
    const r = await this.leer();
    if (!esperado.includes(r.codigo)) {
      const e = new Error(`${oculto ? comando.split(' ')[0] : comando} → ${r.texto}`);
      e.smtp = r.codigo;
      throw e;
    }
    return r;
  }
}

function conectar({ host, puerto, seguridad }) {
  return new Promise((resolver, rechazar) => {
    const opciones = { host, port: puerto, servername: host };
    const s = seguridad === 'ssl' ? tls.connect(opciones) : net.connect(opciones);
    const listo = seguridad === 'ssl' ? 'secureConnect' : 'connect';
    const reloj = setTimeout(() => { s.destroy(); rechazar(Object.assign(new Error('Tiempo de conexión agotado'), { code: 'ETIMEDOUT' })); }, TIEMPO_LIMITE);
    s.once(listo, () => { clearTimeout(reloj); resolver(s); });
    s.once('error', (e) => { clearTimeout(reloj); rechazar(e); });
  });
}

const b64 = (t) => Buffer.from(t, 'utf8').toString('base64');
const envolver = (t) => t.replace(/.{1,76}/g, '$&\r\n');
const cabecera = (t) => (/^[\x20-\x7e]*$/.test(t) ? t : `=?UTF-8?B?${b64(t)}?=`);

function armarMensaje({ de, nombre, para, asunto, texto, html }) {
  const dominio = (de.split('@')[1] || 'localhost').replace(/[^a-z0-9.-]/gi, '');
  const limite = `=_opita_${crypto.randomBytes(12).toString('hex')}`;
  const fecha = new Date().toUTCString().replace('GMT', '+0000');
  return [
    `From: ${cabecera(nombre)} <${de}>`,
    `To: <${para}>`,
    `Subject: ${cabecera(asunto)}`,
    `Date: ${fecha}`,
    `Message-ID: <${crypto.randomUUID()}@${dominio}>`,
    'MIME-Version: 1.0',
    'X-Mailer: Opita Digital',
    `Content-Type: multipart/alternative; boundary="${limite}"`,
    '',
    `--${limite}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    envolver(b64(texto)),
    `--${limite}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    envolver(b64(html)),
    `--${limite}--`,
    '',
  ].join('\r\n');
}

/** Envía un correo. Lanza un Error con el detalle del servidor si falla. */
async function enviarSMTP(cfg, mensaje) {
  let socket = await conectar(cfg);
  const c = new Conexion(socket);
  try {
    const saludo = await c.leer();
    if (saludo.codigo !== 220) throw Object.assign(new Error(`Saludo inesperado: ${saludo.texto}`), { smtp: saludo.codigo });
    const nombreEquipo = 'opita-campana.local';
    let ehlo = await c.enviar(`EHLO ${nombreEquipo}`, [250]);
    if (cfg.seguridad === 'starttls') {
      await c.enviar('STARTTLS', [220]);
      socket.removeAllListeners('data');
      socket.removeAllListeners('error');
      socket.removeAllListeners('close');
      socket = await new Promise((resolver, rechazar) => {
        const t = tls.connect({ socket, servername: cfg.host }, () => resolver(t));
        t.once('error', rechazar);
      });
      c.usar(socket);
      ehlo = await c.enviar(`EHLO ${nombreEquipo}`, [250]);
    }
    if (cfg.usuario) {
      if (/AUTH[ =][^\n]*PLAIN/i.test(ehlo.texto)) {
        await c.enviar(`AUTH PLAIN ${b64(`\u0000${cfg.usuario}\u0000${cfg.clave}`)}`, [235], true);
      } else {
        await c.enviar('AUTH LOGIN', [334]);
        await c.enviar(b64(cfg.usuario), [334], true);
        await c.enviar(b64(cfg.clave), [235], true);
      }
    }
    await c.enviar(`MAIL FROM:<${cfg.remitente}>`, [250]);
    await c.enviar(`RCPT TO:<${mensaje.para}>`, [250, 251]);
    await c.enviar('DATA', [354]);
    const cuerpo = armarMensaje({ de: cfg.remitente, nombre: cfg.nombre, ...mensaje })
      .replace(/\r\n\./g, '\r\n..'); // líneas que empiezan con punto
    socket.write(`${cuerpo}\r\n.\r\n`);
    const fin = await c.leer();
    if (fin.codigo !== 250) throw Object.assign(new Error(`El servidor no aceptó el mensaje: ${fin.texto}`), { smtp: fin.codigo });
    c.enviar('QUIT', [221]).catch(() => {});
    return fin.texto;
  } finally {
    setTimeout(() => socket.destroy(), 500);
  }
}

// Explicación en español de por qué falló un envío
function explicar(e) {
  const m = String(e.message || e);
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(e.code)) return 'No se encontró el servidor de correo. Revise el nombre del servidor (ej.: smtp.gmail.com).';
  if (['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH'].includes(e.code)) return 'El servidor de correo rechazó la conexión. Revise el puerto y la seguridad (465 = SSL, 587 = STARTTLS).';
  if (e.code === 'ETIMEDOUT') return 'El servidor de correo no respondió a tiempo. Revise el puerto o la conexión a internet del servidor.';
  if (e.smtp === 535 || e.smtp === 534 || /auth/i.test(m) && e.smtp >= 500) return 'Usuario o contraseña del correo incorrectos. En Gmail debe usar una "contraseña de aplicación", no su contraseña normal.';
  if (e.smtp === 550 || e.smtp === 553) return `El servidor rechazó el destinatario o el remitente: ${m}`;
  if (e.smtp >= 400 && e.smtp < 500) return `El servidor de correo está ocupado o limitó los envíos; se reintentó. Detalle: ${m}`;
  if (/certificate|self.signed|SSL|TLS/i.test(m)) return 'Problema con la conexión segura. Pruebe con la otra opción de seguridad (SSL o STARTTLS).';
  return m;
}
const esTemporal = (e) => !e.smtp || (e.smtp >= 400 && e.smtp < 500);

// ---------- Plantillas ----------
function plantillaCodigo({ campana, titulo, intro, codigo, minutos }) {
  const texto = `${titulo}\n\n${intro}\n\nSu código es: ${codigo}\n\nVence en ${minutos} minutos. Si usted no lo pidió, ignore este mensaje.\n\n${campana}\n— Desarrollado por Opita Digital`;
  const html = `<!doctype html><html lang="es"><body style="margin:0;background:#F4EFE6;font-family:Arial,Helvetica,sans-serif;color:#1F2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4EFE6;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FCFAF5;border:1px solid #E4DCCB;border-radius:18px;overflow:hidden">
<tr><td style="background:#0E1B2C;padding:26px 28px;text-align:center">
<div style="font-family:Georgia,serif;font-size:22px;letter-spacing:3px;color:#F4EFE6;text-transform:uppercase">${esc(campana)}</div>
<div style="color:#C9A45C;font-size:13px;margin-top:6px">Equipo de campaña</div></td></tr>
<tr><td style="padding:28px">
<h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 10px;color:#0E1B2C">${esc(titulo)}</h1>
<p style="font-size:15px;line-height:1.5;margin:0 0 22px;color:#3B4759">${esc(intro)}</p>
<div style="text-align:center;margin:0 0 22px"><span style="display:inline-block;font-family:'Courier New',monospace;font-size:34px;font-weight:bold;letter-spacing:10px;color:#0E1B2C;background:#F3E6C4;border:1px solid #C9A45C;border-radius:12px;padding:14px 22px">${codigo}</span></div>
<p style="font-size:13px;color:#7B8290;margin:0">Vence en ${minutos} minutos. Si usted no lo pidió, puede ignorar este mensaje.</p>
</td></tr>
<tr><td style="padding:14px 28px;border-top:1px solid #E4DCCB;font-size:11px;color:#A7ABB3">Desarrollado por Opita Digital</td></tr>
</table></td></tr></table></body></html>`;
  return { texto, html };
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- Configuración e historial ----------
function crearCorreo(archivo, { enviador = enviarSMTP, esperas = [1000, 3000] } = {}) {
  let estado = { config: null, envios: [] };
  if (archivo && fs.existsSync(archivo)) {
    try { estado = { ...estado, ...JSON.parse(fs.readFileSync(archivo, 'utf8')) }; } catch { /* vacío */ }
  }
  // Variables de entorno (opcional): tienen prioridad si están completas
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    estado.config = {
      host: process.env.SMTP_HOST, puerto: Number(process.env.SMTP_PORT) || 465,
      seguridad: process.env.SMTP_SECURE || (Number(process.env.SMTP_PORT) === 587 ? 'starttls' : 'ssl'),
      usuario: process.env.SMTP_USER, clave: process.env.SMTP_PASS,
      remitente: process.env.SMTP_FROM || process.env.SMTP_USER, nombre: process.env.SMTP_NAME || 'Equipo de campaña',
    };
  }

  function guardar() {
    if (!archivo) return;
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    const tmp = `${archivo}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(estado, null, 2), { mode: 0o600 });
    fs.renameSync(tmp, archivo);
  }

  const configurado = () => Boolean(estado.config && estado.config.host && estado.config.remitente);

  function publico() {
    const c = estado.config || {};
    return {
      configurado: configurado(),
      host: c.host || '', puerto: c.puerto || 465, seguridad: c.seguridad || 'ssl',
      usuario: c.usuario || '', remitente: c.remitente || '', nombre: c.nombre || '',
      tieneClave: Boolean(c.clave),
      envios: estado.envios.slice(0, 30),
    };
  }

  function configurar(d = {}) {
    const actual = estado.config || {};
    const host = String(d.host ?? actual.host ?? '').trim().toLowerCase();
    if (!/^[a-z0-9.-]+$/.test(host)) throw new ErrorValidacion('Escriba el servidor de correo (ej.: smtp.gmail.com)', 400, 'host');
    const puerto = Number(d.puerto ?? actual.puerto ?? 465);
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new ErrorValidacion('Puerto no válido', 400, 'puerto');
    const seguridad = d.seguridad ?? actual.seguridad ?? 'ssl';
    if (!['ssl', 'starttls', 'ninguna'].includes(seguridad)) throw new ErrorValidacion('Seguridad no válida', 400, 'seguridad');
    const usuario = String(d.usuario ?? actual.usuario ?? '').trim();
    const remitente = String(d.remitente || usuario || actual.remitente || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(remitente)) throw new ErrorValidacion('Escriba el correo remitente', 400, 'remitente');
    const nombre = String(d.nombre ?? actual.nombre ?? 'Equipo de campaña').trim().slice(0, 60) || 'Equipo de campaña';
    const clave = d.clave ? String(d.clave) : actual.clave || '';
    estado.config = { host, puerto, seguridad, usuario, clave, remitente, nombre };
    guardar();
    return publico();
  }

  function anotar(para, asunto, ok, detalle, intentos) {
    estado.envios.unshift({ fecha: new Date().toISOString(), para, asunto, ok, detalle, intentos });
    estado.envios = estado.envios.slice(0, 100);
    guardar();
  }

  /** Envía con reintentos. Devuelve { ok, error }. Nunca lanza. */
  async function enviar(mensaje) {
    if (!configurado()) return { ok: false, error: 'No hay correo de envío configurado (Ajustes → Correo de envío).' };
    let ultimo = null;
    for (let intento = 1; intento <= esperas.length + 1; intento++) {
      try {
        const r = await enviador(estado.config, mensaje);
        anotar(mensaje.para, mensaje.asunto, true, String(r).slice(0, 160), intento);
        return { ok: true };
      } catch (e) {
        ultimo = e;
        if (!esTemporal(e) || intento > esperas.length) break;
        await new Promise((r) => setTimeout(r, esperas[intento - 1]));
      }
    }
    const explicacion = explicar(ultimo);
    anotar(mensaje.para, mensaje.asunto, false, explicacion, esperas.length + 1);
    return { ok: false, error: explicacion };
  }

  return { configurado, publico, configurar, enviar };
}

module.exports = { crearCorreo, enviarSMTP, plantillaCodigo, armarMensaje, explicar };
