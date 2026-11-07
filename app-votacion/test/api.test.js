'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { crearServidor } = require('../server');

const CLAVE = 'clave-de-prueba';
const ADMIN = { Authorization: `Bearer ${CLAVE}` };
let servidor;
let base;

before(async () => {
  servidor = crearServidor({ claveAdmin: CLAVE }); // sin archivo: solo memoria
  await new Promise((r) => servidor.listen(0, r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => servidor.close());

function cliente() {
  let cookie = '';
  return async (ruta, { method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(base + ruta, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { estado: res.status, datos: await res.json().catch(() => null), res };
  };
}

test('solo el administrador crea encuestas; se vota una sola vez y se cierra', async () => {
  const ana = cliente();
  const beto = cliente();

  const sinPermiso = await ana('/api/encuestas', {
    method: 'POST', body: { pregunta: 'x', opciones: ['a', 'b'] },
  });
  assert.equal(sinPermiso.estado, 401);

  const creada = await ana('/api/encuestas', {
    method: 'POST',
    headers: ADMIN,
    body: { pregunta: '  ¿Lenguaje favorito? ', opciones: ['Python', 'JavaScript', ''] },
  });
  assert.equal(creada.estado, 201);
  const { encuesta } = creada.datos;
  assert.equal(encuesta.pregunta, '¿Lenguaje favorito?');
  assert.equal(encuesta.opciones.length, 2);

  assert.equal((await ana(`/api/encuestas/${encuesta.id}/votar`, { method: 'POST', body: { opcion: 0 } })).estado, 200);
  const doble = await ana(`/api/encuestas/${encuesta.id}/votar`, { method: 'POST', body: { opcion: 1 } });
  assert.equal(doble.estado, 409);

  const votoBeto = await beto(`/api/encuestas/${encuesta.id}/votar`, { method: 'POST', body: { opcion: 1 } });
  assert.equal(votoBeto.datos.totalVotos, 2);
  assert.equal(votoBeto.datos.miVoto, 1);

  const vista = await ana(`/api/encuestas/${encuesta.id}`);
  assert.equal(vista.datos.miVoto, 0);
  assert.deepEqual(vista.datos.opciones.map((o) => o.votos), [1, 1]);
  assert.equal(vista.datos.votantes, undefined);

  const sinSesion = await beto(`/api/encuestas/${encuesta.id}/cerrar`, { method: 'POST', body: {} });
  assert.equal(sinSesion.estado, 401);
  const cierre = await ana(`/api/encuestas/${encuesta.id}/cerrar`, { method: 'POST', body: {}, headers: ADMIN });
  assert.equal(cierre.datos.cerrada, true);

  const tarde = await cliente()(`/api/encuestas/${encuesta.id}/votar`, { method: 'POST', body: { opcion: 0 } });
  assert.equal(tarde.estado, 409);
});

test('valida las entradas', async () => {
  const c = cliente();
  const casos = [
    { pregunta: '', opciones: ['a', 'b'] },
    { pregunta: 'x', opciones: ['solo una'] },
    { pregunta: 'x', opciones: ['A', 'a'] },
    { pregunta: 'x', opciones: Array.from({ length: 11 }, (_, i) => `o${i}`) },
    { pregunta: 'x'.repeat(201), opciones: ['a', 'b'] },
    { pregunta: 'x', opciones: 'a,b' },
  ];
  for (const body of casos) {
    assert.equal((await c('/api/encuestas', { method: 'POST', body, headers: ADMIN })).estado, 400, JSON.stringify(body));
  }

  const { datos } = await c('/api/encuestas', { method: 'POST', body: { pregunta: 'ok', opciones: ['a', 'b'] }, headers: ADMIN });
  for (const opcion of [-1, 2, 0.5, '0', null]) {
    const r = await c(`/api/encuestas/${datos.encuesta.id}/votar`, { method: 'POST', body: { opcion } });
    assert.equal(r.estado, 400);
  }
  assert.equal((await c('/api/encuestas/noexiste')).estado, 404);
  assert.equal((await c('/api/encuestas/__proto__')).estado, 404);
});

test('rechaza orígenes externos, JSON malformado y rutas fuera de public', async () => {
  const c = cliente();
  const externo = await c('/api/encuestas', {
    method: 'POST',
    body: { pregunta: 'x', opciones: ['a', 'b'] },
    headers: { Origin: 'https://malicioso.example' },
  });
  assert.equal(externo.estado, 403);

  const res = await fetch(`${base}/api/registros`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo',
  });
  assert.equal(res.status, 400);

  const texto = await fetch(`${base}/api/registros`, { method: "POST", body: "hola" });
  assert.equal(texto.status, 415);

  const salir = await fetch(`${base}/..%2fserver.js`);
  assert.equal(salir.status, 404);

  const inicio = await fetch(`${base}/`);
  assert.equal(inicio.status, 200);
  assert.match(inicio.headers.get('content-security-policy'), /default-src 'self'/);
  assert.match(inicio.headers.get('set-cookie'), /HttpOnly/);
});

test('no permite dos encuestas abiertas con la misma pregunta', async () => {
  const c = cliente();
  const body = { pregunta: '¿Hacemos la reunión el sábado?', opciones: ['Sí', 'No'] };
  assert.equal((await c('/api/encuestas', { method: 'POST', body, headers: ADMIN })).estado, 201);
  const repetida = await c('/api/encuestas', {
    method: 'POST', headers: ADMIN, body: { ...body, pregunta: '¿hacemos la reunion el SABADO?' },
  });
  assert.equal(repetida.estado, 409);
  assert.equal(repetida.datos.campo, 'pregunta');
  const opciones = await c('/api/encuestas', {
    method: 'POST', headers: ADMIN, body: { pregunta: 'Otra', opciones: ['Sí', 'si'] },
  });
  assert.equal(opciones.estado, 400);
});
