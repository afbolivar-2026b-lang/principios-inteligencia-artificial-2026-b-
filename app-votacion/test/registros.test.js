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

let telefonos = 3001000000;
function persona(extra = {}) {
  telefonos += 1;
  return {
    nombre: 'María José',
    apellido: 'Gómez Peña',
    cedula: '1.075.234.567',
    edad: 34,
    telefono: String(telefonos),
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
  assert.match(lista[0].telefono, /^300\d{7}$/);
  assert.equal(lista[0].firma, FIRMA);

  const csv = await admin('/api/registros.csv');
  assert.equal(csv.status, 200);
  assert.match(csv.headers.get('content-disposition'), /attachment/);
  const texto = await csv.text();
  assert.match(texto, /"María José","Gómez Peña","1075234567","34","300\d{7}","Las Granjas","Comuna 2","Sí"/);
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
  assert.match(texto, /"'=hyperlink\(""http:\/\/x""\)"/i);
});

test('bloquea tras muchos intentos fallidos de contraseña', async () => {
  let ultimo;
  for (let i = 0; i < 11; i++) ultimo = await admin('/api/registros', `mala${i}`);
  assert.equal(ultimo.status, 429);
  assert.equal((await admin('/api/registros')).status, 429);
});

test('el bloqueo por intentos también aplica al inicio de sesión', async () => {
  const s = await fetch(`${base}/api/sesion`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clave: CLAVE }),
  });
  // La prueba anterior dejó esta IP bloqueada: ni la contraseña correcta entra.
  assert.equal(s.status, 429);
});

test('sesión con cookie, estadísticas del panel y eliminación', async () => {
  const otro = crearServidor({ claveAdmin: CLAVE });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  const post = (body) => fetch(`${url}/api/registros`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  try {
    assert.equal((await post(persona({ cedula: '11111111', comuna: '5', barrio: 'Centro', edad: 20 }))).status, 201);
    assert.equal((await post(persona({ cedula: '22222222', comuna: 'comuna 5', barrio: 'centro', edad: 40 }))).status, 201);
    assert.equal((await post(persona({ cedula: '33333333', comuna: 'Comuna 2', barrio: 'Las Granjas', edad: 70 }))).status, 201);

    // Inicio de sesión con contraseña -> cookie de sesión
    const mala = await fetch(`${url}/api/sesion`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: 'x' }),
    });
    assert.equal(mala.status, 401);
    const ok = await fetch(`${url}/api/sesion`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave: CLAVE }),
    });
    assert.equal(ok.status, 200);
    const cookie = ok.headers.getSetCookie().find((c) => c.startsWith('sesion=')).split(';')[0];
    assert.match(ok.headers.getSetCookie().join(), /HttpOnly; SameSite=Strict/);
    const conSesion = { headers: { Cookie: cookie } };

    assert.equal((await fetch(`${url}/api/panel`)).status, 401);
    const p = await (await fetch(`${url}/api/panel`, conSesion)).json();
    assert.equal(p.total, 3);
    assert.equal(p.hoy, 3);
    assert.equal(p.semana, 3);
    assert.equal(p.edadPromedio, 43);
    assert.deepEqual(p.comunas, [{ nombre: 'Comuna 5', total: 2 }, { nombre: 'Comuna 2', total: 1 }]);
    assert.equal(p.barrios[0].total, 2);
    assert.equal(p.barrios[0].comuna, 'Comuna 5');
    assert.equal(p.porDia.length, 30);
    assert.equal(p.porDia.at(-1).acumulado, 3);
    assert.equal(p.porSemana.reduce((s, d) => s + d.total, 0), 3);
    assert.equal(p.porHora.reduce((s, d) => s + d.total, 0), 3);
    assert.deepEqual(p.opciones.comunas, ['Comuna 2', 'Comuna 5']);

    // Filtros: comuna y rango de edad
    const f1 = await (await fetch(`${url}/api/panel?comuna=${encodeURIComponent('Comuna 5')}`, conSesion)).json();
    assert.equal(f1.total, 2);
    assert.equal(f1.totalGeneral, 3);
    const f2 = await (await fetch(`${url}/api/panel?edad=${encodeURIComponent('66+')}&periodo=7`, conSesion)).json();
    assert.equal(f2.total, 1);
    assert.equal(f2.porDia.length, 7);
    const f3 = await (await fetch(`${url}/api/panel?periodo=todo`, conSesion)).json();
    assert.equal(f3.porDia.length, 7, 'el periodo "todo" muestra al menos una semana');
    assert.equal(p.edades.find((e) => e.rango === '66+').total, 1);
    assert.equal(p.recientes[0].cedula, undefined, 'el resumen no expone cédulas');
    assert.equal(p.recientes[0].firma, undefined);

    // Eliminar un registro (derecho de supresión)
    const lista = await (await fetch(`${url}/api/registros`, conSesion)).json();
    const sinSesion = await fetch(`${url}/api/registros/${lista[0].id}`, { method: 'DELETE' });
    assert.equal(sinSesion.status, 401);
    const borrado = await fetch(`${url}/api/registros/${lista[0].id}`, { method: 'DELETE', ...conSesion });
    assert.equal(borrado.status, 200);
    assert.equal((await (await fetch(`${url}/api/panel`, conSesion)).json()).total, 2);

    // Cerrar sesión invalida la cookie
    await fetch(`${url}/api/sesion`, { method: 'DELETE', ...conSesion });
    assert.equal((await fetch(`${url}/api/panel`, conSesion)).status, 401);

    // La configuración pública no expone datos personales
    const cfg = await (await fetch(`${url}/api/config`)).json();
    assert.deepEqual(Object.keys(cfg).sort(), ['candidato', 'eslogan', 'foto', 'marca', 'nombre', 'tema', 'totalRegistros', 'urlPublica']);
    assert.equal(cfg.marca.empresa, 'Opita Digital');
  } finally {
    otro.close();
  }
});

test('no agrega información repetida', async () => {
  const otro = crearServidor({ claveAdmin: CLAVE });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  const post = async (body) => {
    const res = await fetch(`${url}/api/registros`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    return { estado: res.status, datos: await res.json() };
  };
  try {
    const base = { ...persona(), cedula: '44444444', telefono: '3105550000', nombre: 'carlos andrés', apellido: 'DE LA OSSA', barrio: 'las granjas', comuna: 'comuna 2' };
    assert.equal((await post(base)).estado, 201);

    // Misma cédula (con puntos) -> rechazada, indicando el campo
    const c = await post({ ...base, cedula: '44.444.444', telefono: '3105550001' });
    assert.equal(c.estado, 409);
    assert.equal(c.datos.campo, 'cedula');

    // Mismo teléfono (con +57 y espacios) -> rechazado
    const t = await post({ ...base, cedula: '55555555', telefono: '+57 310 555 0000' });
    assert.equal(t.estado, 409);
    assert.equal(t.datos.campo, 'telefono');

    // Barrio escrito distinto se une con el existente
    assert.equal((await post({ ...base, cedula: '66666666', telefono: '3105550002', barrio: 'LAS GRANJAS', comuna: '2' })).estado, 201);
    assert.equal((await post({ ...base, cedula: '77777777', telefono: '3105550003', barrio: 'Lás  Granjas', comuna: 'Comuna 2' })).estado, 201);

    // Los errores de validación también indican el campo
    assert.equal((await post({ ...base, cedula: '88888888', telefono: '3105550004', edad: 10 })).datos.campo, 'edad');

    const lista = await (await fetch(`${url}/api/registros`, { headers: { Authorization: `Bearer ${CLAVE}` } })).json();
    assert.equal(lista.length, 3);
    assert.deepEqual([...new Set(lista.map((r) => r.barrio))], ['Las Granjas']);
    assert.deepEqual([...new Set(lista.map((r) => r.comuna))], ['Comuna 2']);
    assert.equal(lista.at(-1).nombre, 'Carlos Andrés');
    assert.equal(lista.at(-1).apellido, 'De la Ossa');

    // Sugerencias públicas de barrios: sin datos personales
    const barrios = await (await fetch(`${url}/api/barrios`)).json();
    assert.deepEqual(barrios, [{ nombre: 'Las Granjas', comuna: 'Comuna 2' }]);
  } finally {
    otro.close();
  }
});

test('ajustes: diseño, nombre, eslogan y enlace público', async () => {
  const otro = crearServidor({ claveAdmin: CLAVE, nombreCampana: 'Inicial' });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  const put = (body, headers = { Authorization: `Bearer ${CLAVE}` }) => fetch(`${url}/api/ajustes`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  try {
    const cfg = await (await fetch(`${url}/api/config`)).json();
    assert.equal(cfg.nombre, 'Inicial');
    assert.equal(cfg.tema, 'elegante');

    assert.equal((await put({ tema: 'oscuro' }, {})).status, 401, 'sin sesión no se puede cambiar');
    assert.equal((await put({ tema: 'rosado' })).status, 400);
    assert.equal((await put({ urlPublica: 'javascript:alert(1)' })).status, 400);
    assert.equal((await put({ nombre: '' })).status, 400);

    const ok = await (await put({ tema: 'limpio', nombre: ' Neiva  Primero ', eslogan: 'Juntos sí podemos.', urlPublica: 'https://neivaprimero.co/registro/' })).json();
    assert.deepEqual(ok, { nombre: 'Neiva Primero', eslogan: 'Juntos sí podemos.', tema: 'limpio', urlPublica: 'https://neivaprimero.co/registro', candidato: '', foto: '' });

    // Foto del candidato: solo imágenes reales
    const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    assert.equal((await put({ foto: 'data:image/svg+xml;base64,PHN2Zz4=' })).status, 400);
    assert.equal((await put({ foto: 'data:image/jpeg;base64,PHN2Zz4=' })).status, 400);
    const conFoto = await (await put({ foto: PNG, candidato: 'Ana Gómez' })).json();
    assert.equal(conFoto.foto, PNG);
    assert.equal(conFoto.candidato, 'Ana Gómez');
    const despues = await (await fetch(`${url}/api/config`)).json();
    assert.equal(despues.tema, 'limpio');
    assert.equal((await put({ urlPublica: '' })).status, 200);
  } finally {
    otro.close();
  }
});

test('descargas: Excel con tablero y reporte PDF (solo el equipo)', async () => {
  const otro = crearServidor({ claveAdmin: CLAVE, nombreCampana: 'Campaña Ñ' });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  const ADMIN = { headers: { Authorization: `Bearer ${CLAVE}` } };
  try {
    await fetch(`${url}/api/registros`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(persona({ cedula: '12121212', nombre: 'Óscar', comuna: '3' })),
    });
    assert.equal((await fetch(`${url}/api/tablero.xlsx`)).status, 401);
    assert.equal((await fetch(`${url}/api/reporte.pdf`)).status, 401);

    const x = await fetch(`${url}/api/tablero.xlsx?comuna=${encodeURIComponent('Comuna 3')}`, ADMIN);
    assert.equal(x.status, 200);
    assert.match(x.headers.get('content-type'), /spreadsheetml/);
    assert.match(x.headers.get('content-disposition'), /tablero-campana-n-.*\.xlsx/);
    const zip = Buffer.from(await x.arrayBuffer());
    assert.equal(zip.subarray(0, 4).toString('hex'), '504b0304', 'es un archivo ZIP/XLSX');
    const nombres = zip.toString('latin1');
    for (const parte of ['xl/workbook.xml', 'xl/worksheets/sheet1.xml', 'xl/charts/chart8.xml', 'xl/tables/table1.xml']) {
      assert.ok(nombres.includes(parte), `contiene ${parte}`);
    }

    const p = await fetch(`${url}/api/reporte.pdf?periodo=todo`, ADMIN);
    assert.equal(p.status, 200);
    assert.equal(p.headers.get('content-type'), 'application/pdf');
    const pdf = Buffer.from(await p.arrayBuffer());
    assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
    assert.ok(pdf.toString('latin1').includes('/Author (Opita Digital)'));
    assert.ok(pdf.toString('latin1').trimEnd().endsWith('%%EOF'));
  } finally {
    otro.close();
  }
});
