'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { enviarSMTP, crearCorreo } = require('../correo');
const { crearServidor } = require('../server');

// Servidor SMTP de mentira (sin TLS) que guarda lo que recibe
function servidorSMTP({ claveBuena = 'clave-app', rechazarAuth = false } = {}) {
  const recibidos = [];
  const srv = net.createServer((s) => {
    s.setEncoding('utf8');
    let bufer = '';
    let enDatos = false;
    let actual = {};
    let paso = '';
    s.write('220 prueba ESMTP\r\n');
    s.on('data', (d) => {
      bufer += d;
      let i;
      while ((i = bufer.indexOf('\r\n')) >= 0) {
        const linea = bufer.slice(0, i);
        bufer = bufer.slice(i + 2);
        if (enDatos) {
          if (linea === '.') { enDatos = false; recibidos.push(actual); s.write('250 2.0.0 OK en cola\r\n'); actual = {}; }
          else actual.datos = `${actual.datos || ''}${linea}\r\n`;
          continue;
        }
        if (paso === 'usuario') { actual.usuario = Buffer.from(linea, 'base64').toString(); paso = 'clave'; s.write('334 UGFzc3dvcmQ6\r\n'); continue; }
        if (paso === 'clave') {
          paso = '';
          const ok = !rechazarAuth && Buffer.from(linea, 'base64').toString() === claveBuena;
          s.write(ok ? '235 2.7.0 Aceptado\r\n' : '535 5.7.8 Usuario o clave incorrectos\r\n');
          continue;
        }
        if (/^EHLO/i.test(linea)) s.write('250-prueba\r\n250-AUTH LOGIN\r\n250 OK\r\n');
        else if (linea === 'AUTH LOGIN') { paso = 'usuario'; s.write('334 VXNlcm5hbWU6\r\n'); }
        else if (/^MAIL FROM:/.test(linea)) { actual.de = linea.slice(10); s.write('250 OK\r\n'); }
        else if (/^RCPT TO:/.test(linea)) { actual.para = linea.slice(8); s.write('250 OK\r\n'); }
        else if (linea === 'DATA') { enDatos = true; s.write('354 Envíe el mensaje\r\n'); }
        else if (linea === 'QUIT') { s.write('221 Adiós\r\n'); s.end(); }
        else s.write('500 ?\r\n');
      }
    });
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, puerto: srv.address().port, recibidos })));
}

const decodificarHtml = (datos) => {
  const partes = datos.split(/--=_opita_[a-f0-9]+/);
  const html = partes.find((p) => p.includes('text/html'));
  return Buffer.from(html.split('\r\n\r\n')[1].replace(/\r\n/g, ''), 'base64').toString('utf8');
};

test('el cliente SMTP envía un correo completo (autenticación, remitente, asunto con tildes, HTML)', async () => {
  const { srv, puerto, recibidos } = await servidorSMTP();
  try {
    const cfg = { host: '127.0.0.1', puerto, seguridad: 'ninguna', usuario: 'equipo@campana.co', clave: 'clave-app', remitente: 'equipo@campana.co', nombre: 'Campaña Ñandú' };
    const r = await enviarSMTP(cfg, { para: 'laura@campana.co', asunto: 'Código de verificación · 482913', texto: 'Su código es 482913', html: '<b>482913</b> ¡Listo!' });
    assert.match(r, /250/);
    await new Promise((x) => setTimeout(x, 50));
    assert.equal(recibidos.length, 1);
    const m = recibidos[0];
    assert.equal(m.usuario, 'equipo@campana.co');
    assert.equal(m.de, '<equipo@campana.co>');
    assert.equal(m.para, '<laura@campana.co>');
    assert.match(m.datos, /^From: =\?UTF-8\?B\?/m, 'nombre con tildes codificado');
    assert.match(m.datos, /^Message-ID: <.+@campana\.co>/m);
    assert.match(m.datos, /^Date: /m);
    assert.match(decodificarHtml(m.datos), /482913.*¡Listo!/);
  } finally {
    srv.close();
  }
});

test('explica en español por qué falla (contraseña mala, servidor apagado) y reintenta los fallos temporales', async () => {
  const { srv, puerto } = await servidorSMTP({ rechazarAuth: true });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'correo-'));
  try {
    const c = crearCorreo(path.join(dir, 'correo.json'), { esperas: [5, 5] });
    c.configurar({ host: '127.0.0.1', puerto, seguridad: 'ninguna', usuario: 'a@b.co', clave: 'mala', remitente: 'a@b.co' });
    const r = await c.enviar({ para: 'x@y.co', asunto: 'Hola', texto: 'x', html: 'x' });
    assert.equal(r.ok, false);
    assert.match(r.error, /contraseña de aplicación/);
    assert.equal(c.publico().envios[0].ok, false, 'queda en el historial');
    assert.equal(c.publico().clave, undefined, 'la contraseña del correo nunca se muestra');
    assert.equal(c.publico().tieneClave, true);

    c.configurar({ host: '127.0.0.1', puerto: 1, seguridad: 'ninguna' });
    const r2 = await c.enviar({ para: 'x@y.co', asunto: 'Hola', texto: 'x', html: 'x' });
    assert.match(r2.error, /rechazó la conexión|no respondió/);

    // Fallo temporal (4xx) dos veces y luego éxito: llega gracias al reintento
    let intentos = 0;
    const c2 = crearCorreo(null, { esperas: [5, 5], enviador: async () => {
      intentos += 1;
      if (intentos < 3) throw Object.assign(new Error('421 Intente más tarde'), { smtp: 421 });
      return '250 OK';
    } });
    c2.configurar({ host: 'smtp.x.co', puerto: 465, seguridad: 'ssl', usuario: 'a@b.co', clave: 'k', remitente: 'a@b.co' });
    assert.deepEqual(await c2.enviar({ para: 'x@y.co', asunto: 'A', texto: 'x', html: 'x' }), { ok: true });
    assert.equal(intentos, 3);
    assert.equal(c2.publico().envios[0].intentos, 3);
  } finally {
    srv.close();
  }
});

test('códigos por correo: verificar la cuenta al entrar y cambiar la contraseña', async () => {
  const enviados = [];
  const enviador = async (cfg, m) => { enviados.push(m); return '250 OK'; };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codigos-'));
  const otro = crearServidor({ claveAdmin: 'maestra-123', archivoUsuarios: path.join(dir, 'u.json'), archivoCorreo: path.join(dir, 'c.json'), enviadorCorreo: enviador });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  const json = { 'Content-Type': 'application/json' };
  const MAESTRA = { ...json, Authorization: 'Bearer maestra-123' };
  const post = async (ruta, body, headers = json) => {
    const r = await fetch(url + ruta, { method: 'POST', headers, body: JSON.stringify(body) });
    return { estado: r.status, datos: await r.json(), r };
  };
  const ultimoCodigo = () => /(\d{6}) es su código/.exec(enviados.at(-1).asunto)[1];
  try {
    await post('/api/usuarios', { nombre: 'Laura Perdomo', correo: 'laura@campana.co', clave: 'clave-laura-1', rol: 'digitador' }, MAESTRA);

    // Sin correo configurado: entra directo
    assert.ok((await post('/api/sesion', { correo: 'laura@campana.co', clave: 'clave-laura-1' })).datos.usuario);

    // Configurar el correo de envío y probarlo
    const cfg = await fetch(`${url}/api/correo`, { method: 'PUT', headers: MAESTRA, body: JSON.stringify({ host: 'smtp.gmail.com', puerto: 465, seguridad: 'ssl', usuario: 'campana@gmail.com', clave: 'app-pass', nombre: 'Neiva Primero' }) });
    assert.equal(cfg.status, 200);
    const pub = await cfg.json();
    assert.equal(pub.configurado, true);
    assert.equal(pub.clave, undefined);
    assert.equal((await fetch(`${url}/api/correo`)).status, 401);
    const prueba = await post('/api/correo/prueba', { para: 'director@campana.co' }, MAESTRA);
    assert.equal(prueba.estado, 200);
    assert.equal(enviados.at(-1).para, 'director@campana.co');

    // Laura (correo sin verificar) ahora necesita el código
    const paso1 = await post('/api/sesion', { correo: 'laura@campana.co', clave: 'clave-laura-1' });
    assert.equal(paso1.datos.requiereCodigo, true);
    assert.equal(paso1.datos.envio, 'enviado');
    assert.match(paso1.datos.correo, /^l•+@campana\.co$/);
    assert.ok(!paso1.r.headers.getSetCookie().some((c) => c.startsWith('sesion=')), 'todavía no hay sesión');
    assert.equal(enviados.at(-1).para, 'laura@campana.co');
    const codigo = ultimoCodigo();
    assert.match(enviados.at(-1).html, new RegExp(codigo));

    assert.equal((await post('/api/sesion/codigo', { pendiente: paso1.datos.pendiente, codigo: '000000' === codigo ? '111111' : '000000' })).estado, 400);
    assert.equal((await post('/api/sesion/reenviar', { pendiente: paso1.datos.pendiente })).estado, 429, 'reenviar solo después de un minuto');
    const paso2 = await post('/api/sesion/codigo', { pendiente: paso1.datos.pendiente, codigo });
    assert.equal(paso2.estado, 200);
    assert.ok(paso2.r.headers.getSetCookie().some((c) => c.startsWith('sesion=')));

    // Ya verificada: la siguiente vez entra sin código
    assert.ok((await post('/api/sesion', { correo: 'laura@campana.co', clave: 'clave-laura-1' })).datos.usuario);
    const lista = await (await fetch(`${url}/api/usuarios`, { headers: MAESTRA })).json();
    assert.equal(lista.usuarios[0].correoVerificado, true);
    assert.equal(lista.usuarios[0].codigo, undefined, 'el código nunca se muestra');

    // Olvidé mi contraseña con código
    const antes = enviados.length;
    assert.deepEqual((await post('/api/olvide', { correo: 'nadie@campana.co' })).datos, { ok: true, modo: 'codigo' });
    assert.equal(enviados.length, antes, 'a un correo desconocido no se le envía nada');
    assert.deepEqual((await post('/api/olvide', { correo: 'laura@campana.co' })).datos, { ok: true, modo: 'codigo' });
    const cod = ultimoCodigo();
    assert.match(enviados.at(-1).asunto, /cambiar la contraseña/);
    assert.equal((await post('/api/olvide/confirmar', { correo: 'laura@campana.co', codigo: cod, nueva: 'corta' })).estado, 400);
    assert.equal((await post('/api/olvide/confirmar', { correo: 'laura@campana.co', codigo: '999999' === cod ? '888888' : '999999', nueva: 'clave-nueva-22' })).estado, 400);
    assert.equal((await post('/api/olvide/confirmar', { correo: 'laura@campana.co', codigo: cod, nueva: 'clave-nueva-22' })).estado, 200);
    assert.equal((await post('/api/olvide/confirmar', { correo: 'laura@campana.co', codigo: cod, nueva: 'otra-clave-33' })).estado, 400, 'el código sirve una sola vez');
    assert.ok((await post('/api/sesion', { correo: 'laura@campana.co', clave: 'clave-nueva-22' })).datos.usuario);
  } finally {
    otro.close();
  }
});
