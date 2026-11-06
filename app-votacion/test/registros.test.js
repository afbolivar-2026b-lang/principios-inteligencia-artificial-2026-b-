'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { crearServidor } = require('../server');

const CLAVE = 'clave-de-prueba';
// PNG válido de 1x1 píxel.
const FIRMA = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

let servidor;
let base;

before(async () => {
  servidor = crearServidor({ claveAdmin: CLAVE });
  await new Promise((r) => servidor.listen(0, r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

function persona(extra = {}) {
  return {
    nombre: 'María José',
    apellido: 'Gómez Peña',
    cedula: '1.075.234.567',
    edad: 34,
    telefono: '300 123 4567',
    barrio: 'Las Granjas',
    comuna: 'Comuna 2',
    firma: FIRMA,
    autorizacion: true,
    ...extra,
  };
}

async function registrar(body) {
  const res = await fetch(`${base}/api/registros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { estado: res.status, datos: await res.json() };
}

function admin(ruta, clave = CLAVE) {
  return fetch(base + ruta, { headers: { Authorization: `Bearer ${clave}` } });
}

test('registra una persona y la muestra solo al administrador', async () => {
  const r = await registrar(persona());
  assert.equal(r.estado, 201);
  assert.equal(r.datos.nombre, 'María José');
  assert.equal(r.datos.cedula, undefined, 'la respuesta pública no devuelve datos personales');

  const duplicada = await registrar(persona({ cedula: '1075234567' }));
  assert.equal(duplicada.estado, 409);

  assert.equal((await fetch(`${base}/api/registros`)).status, 401);
  assert.equal((await admin('/api/registros', 'mala')).status, 401);

  const lista = await (await admin('/api/registros')).json();
  assert.equal(lista.length, 1);
  assert.equal(lista[0].cedula, '1075234567');
  assert.equal(lista[0].telefono, '3001234567');
  assert.equal(lista[0].firma, FIRMA);

  const csv = await admin('/api/registros.csv');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-disposition'), /attachment/);
  const texto = await csv.text();
  assert.match(texto, /"María José","Gómez Peña","1075234567","34","3001234567","Las Granjas","Comuna 2","Sí"/);
});

test('valida cada campo', async () => {
  const malos = [
    { nombre: '' },
    { nombre: 'Juan123' },
    { apellido: '' },
    { cedula: '12ab' },
    { cedula: '123' },
    { edad: 17 },
    { edad: 'treinta' },
    { telefono: '12' },
    { barrio: '' },
    { comuna: '  ' },
    { firma: '' },
    { firma: 'data:image/png;base64,PHN2Zz4=' }, // no es un PNG
    { firma: 'data:image/svg+xml;base64,PHN2Zz4=' },
    { autorizacion: false },
  ];
  for (const [i, extra] of malos.entries()) {
    const r = await registrar(persona({ cedula: String(20000000 + i), ...extra }));
    assert.equal(r.estado, 400, JSON.stringify(extra));
  }
});

test('evita inyección de fórmulas en el CSV', async () => {
  const r = await registrar(persona({ cedula: '99999999', barrio: '=HYPERLINK("http://x")' }));
  assert.equal(r.estado, 201);
  const texto = await (await admin('/api/registros.csv')).text();
  assert.match(texto, /"'=HYPERLINK\(""http:\/\/x""\)"/);
});

test('bloquea tras muchos intentos fallidos de contraseña', async () => {
  let ultimo;
  for (let i = 0; i < 11; i++) ultimo = await admin('/api/registros', `mala${i}`);
  assert.equal(ultimo.status, 429);
  assert.equal((await admin('/api/registros')).status, 429);
});
