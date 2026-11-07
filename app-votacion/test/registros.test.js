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

test('versión de la app Android', async () => {
  const otro = crearServidor({ claveAdmin: CLAVE });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  try {
    const v = await (await fetch(`${url}/api/app/version`)).json();
    assert.equal(typeof v.disponible, 'boolean');
    if (v.disponible) {
      assert.ok(v.versionCode >= 1);
      const apk = await fetch(`${url}${v.apk}`);
      assert.equal(apk.headers.get('content-type'), 'application/vnd.android.package-archive');
    }
  } finally {
    otro.close();
  }
});

test('perfiles: correo y contraseña, puesto, roles y permisos', async () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const archivoUsuarios = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'usuarios-')), 'usuarios.json');
  const otro = crearServidor({ claveAdmin: CLAVE, archivoUsuarios });
  await new Promise((r) => otro.listen(0, r));
  const url = `http://127.0.0.1:${otro.address().port}`;
  const json = { 'Content-Type': 'application/json' };
  const MAESTRA = { ...json, Authorization: `Bearer ${CLAVE}` };
  const entrar = async (correo, clave) => {
    const r = await fetch(`${url}/api/sesion`, { method: 'POST', headers: json, body: JSON.stringify({ correo, clave }) });
    const cookie = (r.headers.getSetCookie().find((c) => c.startsWith('sesion=')) || '').split(';')[0];
    return { estado: r.status, datos: await r.json(), h: { ...json, Cookie: cookie } };
  };
  try {
    // El director (clave maestra) crea perfiles
    const sinPermiso = await fetch(`${url}/api/usuarios`);
    assert.equal(sinPermiso.status, 401);
    const crear = (body) => fetch(`${url}/api/usuarios`, { method: 'POST', headers: MAESTRA, body: JSON.stringify(body) });
    const r1 = await crear({ nombre: 'Laura Perdomo', correo: 'Laura@Campana.co', clave: 'clave-segura-1', puesto: 'Coordinadora Comuna 4', rol: 'coordinador' });
    assert.equal(r1.status, 201);
    const laura = await r1.json();
    assert.equal(laura.correo, 'laura@campana.co');
    assert.equal(laura.claveHash, undefined, 'la contraseña nunca se devuelve');
    assert.deepEqual(laura.permisos, ['tablero', 'registros', 'exportar', 'encuestas', 'compartir']);
    assert.equal((await crear({ nombre: 'Otra', correo: 'laura@campana.co', clave: 'clave-segura-2' })).status, 409, 'correo repetido');
    assert.equal((await crear({ nombre: 'Corta', correo: 'c@c.co', clave: '123' })).status, 400, 'contraseña corta');
    assert.equal((await crear({ nombre: 'Mal', correo: 'm@c.co', clave: 'clave-segura-3', rol: 'personalizado', permisos: ['volar'] })).status, 400);
    const r2 = await crear({ nombre: 'Jefe Equipo', correo: 'jefe@campana.co', clave: 'clave-jefe-99', rol: 'personalizado', permisos: ['tablero', 'usuarios'] });
    const jefe = await r2.json();

    // En el archivo solo queda la huella de la contraseña
    const guardado = fs.readFileSync(archivoUsuarios, 'utf8');
    assert.ok(!guardado.includes('clave-segura-1'));
    assert.match(guardado, /scrypt\$/);

    // Laura entra con su correo y solo hace lo que su rol permite
    assert.equal((await entrar('laura@campana.co', 'mala-clave')).estado, 401);
    const l = await entrar('LAURA@campana.co', 'clave-segura-1');
    assert.equal(l.estado, 200);
    assert.equal(l.datos.usuario.puesto, 'Coordinadora Comuna 4');
    const sesion = await (await fetch(`${url}/api/sesion`, { headers: l.h })).json();
    assert.equal(sesion.usuario.nombre, 'Laura Perdomo');
    assert.equal((await fetch(`${url}/api/panel`, { headers: l.h })).status, 200);
    assert.equal((await fetch(`${url}/api/registros`, { headers: l.h })).status, 200);
    const prohibido = await fetch(`${url}/api/ajustes`, { method: 'PUT', headers: l.h, body: JSON.stringify({ tema: 'oscuro' }) });
    assert.equal(prohibido.status, 403);
    assert.match((await prohibido.json()).error, /no tiene permiso para cambiar ajustes/);
    assert.equal((await fetch(`${url}/api/usuarios`, { headers: l.h })).status, 403);
    assert.equal((await fetch(`${url}/api/registros/00000000-0000-4000-8000-000000000000`, { method: 'DELETE', headers: l.h })).status, 403);

    // Cambio de permisos: se aplica de inmediato a la sesión abierta
    await fetch(`${url}/api/usuarios/${laura.id}`, { method: 'PUT', headers: MAESTRA, body: JSON.stringify({ rol: 'observador' }) });
    assert.equal((await fetch(`${url}/api/registros`, { headers: l.h })).status, 403);

    // Laura cambia su propia contraseña
    assert.equal((await fetch(`${url}/api/mi-clave`, { method: 'PUT', headers: l.h, body: JSON.stringify({ actual: 'no-es', nueva: 'nueva-clave-1' }) })).status, 400);
    assert.equal((await fetch(`${url}/api/mi-clave`, { method: 'PUT', headers: l.h, body: JSON.stringify({ actual: 'clave-segura-1', nueva: 'nueva-clave-1' }) })).status, 200);
    assert.equal((await entrar('laura@campana.co', 'nueva-clave-1')).estado, 200);

    // Olvidé mi contraseña: misma respuesta exista o no el correo; el director ve la solicitud
    const olvide = (correo) => fetch(`${url}/api/olvide`, { method: 'POST', headers: json, body: JSON.stringify({ correo }) });
    assert.equal((await olvide('laura@campana.co')).status, 200);
    assert.deepEqual(await (await olvide('nadie@campana.co')).json(), { ok: true });
    let lauraLista = (await (await fetch(`${url}/api/usuarios`, { headers: MAESTRA })).json()).usuarios.find((u) => u.id === laura.id);
    assert.ok(lauraLista.solicitudClave, 'el director ve que Laura pidió una contraseña nueva');
    await fetch(`${url}/api/usuarios/${laura.id}`, { method: 'PUT', headers: MAESTRA, body: JSON.stringify({ clave: 'asignada-por-director' }) });
    lauraLista = (await (await fetch(`${url}/api/usuarios`, { headers: MAESTRA })).json()).usuarios.find((u) => u.id === laura.id);
    assert.equal(lauraLista.solicitudClave, null, 'la solicitud se cierra al asignar la contraseña');
    assert.equal((await entrar('laura@campana.co', 'asignada-por-director')).estado, 200);
    for (let k = 0; k < 4; k++) await olvide('x@y.co');
    assert.equal((await olvide('x@y.co')).status, 429, 'límite de solicitudes por IP');

    // Desactivar el perfil cierra su sesión
    await fetch(`${url}/api/usuarios/${laura.id}`, { method: 'PUT', headers: MAESTRA, body: JSON.stringify({ activo: false }) });
    assert.equal((await fetch(`${url}/api/panel`, { headers: l.h })).status, 401);
    assert.equal((await entrar('laura@campana.co', 'asignada-por-director')).estado, 401);

    // Un administrador de usuarios no se puede dejar por fuera a sí mismo
    const j = await entrar('jefe@campana.co', 'clave-jefe-99');
    const quitarse = await fetch(`${url}/api/usuarios/${jefe.id}`, { method: 'PUT', headers: j.h, body: JSON.stringify({ rol: 'personalizado', permisos: ['tablero'] }) });
    assert.equal(quitarse.status, 400);
    assert.equal((await fetch(`${url}/api/usuarios/${jefe.id}`, { method: 'DELETE', headers: j.h })).status, 400);
    assert.equal((await fetch(`${url}/api/usuarios/${laura.id}`, { method: 'DELETE', headers: j.h })).status, 200);
    const lista = await (await fetch(`${url}/api/usuarios`, { headers: MAESTRA })).json();
    assert.deepEqual(lista.usuarios.map((u) => u.correo), ['jefe@campana.co']);
    assert.ok(lista.permisos.length === 8 && lista.roles.director);
    assert.ok(lista.usuarios[0].ultimoAcceso, 'se registra el último acceso');
  } finally {
    otro.close();
  }
});
