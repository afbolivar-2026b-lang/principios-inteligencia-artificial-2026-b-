// Tanda 1: reservas reales (con el simulador de Supabase)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const { instalarSimulador, sumarDias, fechaCol } = require('./simulador');
const SITIO = 'file://' + path.resolve(__dirname, '../../salon-belleza/');
const foto = (n) => path.resolve(__dirname, '..', n);
const errores = [];
const ok = (cond, texto) => console.log((cond ? '✔ ' : '✘ ') + texto) || (!cond && errores.push(texto));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1500 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push('JS: ' + e.message));
  const sim = instalarSimulador(page);
  await page.goto(SITIO + '/index.html');
  await page.waitForFunction(() => ESTADO_CONEXION.cargado);
  ok(await page.evaluate(() => ESTADO_CONEXION.conectado), 'catálogo cargado desde la base de datos');
  const seccion = await page.$('#reservar');
  await page.$eval('#reservar', (e) => e.scrollIntoView());

  // Paso 1: combinar servicios
  await page.click('[data-servicio="corte"]');
  await page.click('[data-servicio="mani-semi"]');
  await page.click('[data-largo="corto"]');
  await page.click('#btn-siguiente');
  ok(await page.isVisible('text=Ninguna profesional hace todos esos servicios'), 'corte + manicura avisa que nadie hace ambos');
  await page.click('[data-ir="0"]');
  await page.click('[data-servicio="mani-semi"]'); // quitar
  await page.click('[data-servicio="hidratante"]');
  await page.evaluate(() => { estado.largo = null; pintarReserva(); });
  ok(await page.isDisabled('#btn-siguiente'), 'sin elegir largo no deja continuar');
  await page.click('[data-largo="largo"]');
  const resumen1 = await page.textContent('.resumen-seleccion');
  ok(resumen1.includes('2 h 30 min') && resumen1.includes('165.000'), 'corte + hidratante largo = 2 h 30 min y $165.000 → ' + resumen1.trim());
  await seccion.screenshot({ path: foto('tanda1-paso1-servicios.png') });

  // Paso 2
  await page.click('#btn-siguiente');
  const pros = await page.$$eval('.tarjeta-profesional h4', (x) => x.map((e) => e.textContent));
  ok(pros.join() === 'Valentina Ríos,Andrés Cárdenas,Mariana López,Sin preferencia', 'solo profesionales de cabello: ' + pros.join(', '));
  await page.click('[data-profesional="andres"]');
  await seccion.screenshot({ path: foto('tanda1-paso2-profesional.png') });

  // Paso 3: primer cupo + lista de espera
  await page.click('#btn-siguiente');
  await page.click('[data-accion="primer-cupo"]');
  const elegido = await page.evaluate(() => [estado.fecha, estado.hora]);
  ok(elegido[0] && elegido[1], 'primer cupo encontrado: ' + elegido.join(' '));
  await page.click('[data-accion="espera"]');
  await seccion.screenshot({ path: foto('tanda1-paso3-fecha.png') });

  // Paso 4 y 5
  await page.click('#btn-siguiente');
  await page.click('[data-producto="shampoo"]');
  await page.click('#btn-siguiente');
  await page.fill('#nombre', 'María Pérez');
  await page.fill('#telefono', '310 555 1234');
  await page.fill('#nota', 'Alérgica al látex');
  await seccion.screenshot({ path: foto('tanda1-paso5-confirmar.png') });
  await page.click('#btn-siguiente');
  await page.waitForSelector('.exito');
  const llamada = sim.llamadas.find((l) => l.ruta === 'rpc/crear_reserva').cuerpo;
  ok(JSON.stringify(llamada.p_servicios) === '["corte","hidratante"]' && llamada.p_largo === 'largo' && llamada.p_profesional === 'andres',
    'se envió a la base de datos: ' + JSON.stringify({ s: llamada.p_servicios, largo: llamada.p_largo, pro: llamada.p_profesional, inicio: llamada.p_inicio }));
  ok(llamada.p_inicio.endsWith('-05:00'), 'la hora va en horario de Colombia');
  await seccion.screenshot({ path: foto('tanda1-exito.png') });
  ok(await page.evaluate(() => !!localStorage.getItem('neivaBelleza.misCitas')), 'la cita quedó en "Mis citas" del celular');

  // Recordar datos y repetir última cita
  await page.click('[data-accion="nueva"]');
  ok(await page.isVisible('text=Repetir mi última cita'), 'aparece "Repetir mi última cita"');

  // Error: el horario se ocupó justo antes de confirmar
  const p2 = await ctx.newPage();
  instalarSimulador(p2, { ocupado: true });
  await p2.goto(SITIO + '/index.html');
  await p2.waitForFunction(() => ESTADO_CONEXION.cargado);
  await p2.click('[data-accion="repetir"]');
  await p2.click('[data-accion="primer-cupo"]');
  await p2.click('#btn-siguiente'); await p2.click('#btn-siguiente');
  ok((await p2.inputValue('#nombre')) === 'María Pérez', 'recordó el nombre de la clienta');
  await p2.click('#btn-siguiente');
  await p2.waitForSelector('.error-general');
  ok((await p2.evaluate(() => estado.paso)) === 2 && (await p2.textContent('.error-general')).includes('acaba de ocupar'), 'horario ocupado → vuelve a fecha y hora con aviso');

  // Sin conexión → enviar por WhatsApp
  const p3 = await ctx.newPage();
  const sim3 = instalarSimulador(p3);
  await p3.goto(SITIO + '/index.html');
  await p3.waitForFunction(() => ESTADO_CONEXION.cargado);
  await p3.click('[data-accion="repetir"]'); await p3.click('[data-accion="primer-cupo"]');
  await p3.click('#btn-siguiente'); await p3.click('#btn-siguiente');
  await p3.unroute('https://zhnwkyjoyixriasoxirf.supabase.co/**');
  await p3.route('https://zhnwkyjoyixriasoxirf.supabase.co/**', (r) => r.abort('internetdisconnected'));
  await p3.click('#btn-siguiente');
  await p3.waitForSelector('text=Enviar por WhatsApp');
  ok(true, 'sin conexión → ofrece enviar la solicitud por WhatsApp');
  void sim3;

  // Mi cita
  const manana = sumarDias(fechaCol(new Date()), 5);
  const p4 = await ctx.newPage();
  instalarSimulador(p4, { reservaGuardada: {
    codigo: 'K7M2QX', token: '6f1c2b0e-3d4a-4b8e-9c1f-2a7d5e8b9c10', estado: 'pendiente', nombre: 'María',
    inicio: new Date(`${manana}T14:00:00-05:00`).toISOString(), fin: new Date(`${manana}T15:00:00-05:00`).toISOString(),
    servicios: [{ nombre: 'Corte & estilizado' }], productos: [{ nombre: 'Shampoo nutritivo' }],
    total: 87000, profesional_id: 'andres', profesional: 'Andrés Cárdenas' } });
  await p4.goto(SITIO + '/cita.html?t=6f1c2b0e-3d4a-4b8e-9c1f-2a7d5e8b9c10');
  await p4.waitForSelector('.tarjeta-cita');
  await p4.screenshot({ path: foto('tanda1-mi-cita.png'), fullPage: true });
  await p4.click('[data-accion="confirmar"]');
  await p4.waitForSelector('.ok-aviso');
  ok((await p4.textContent('.tarjeta-cita .estado')).includes('Confirmada'), 'Mi cita: confirmar asistencia');
  await p4.click('[data-accion="cambiar"]');
  await p4.waitForSelector('.dia-agenda');
  await p4.click('.dia-agenda:not([disabled]) >> nth=2');
  await p4.click('[data-hora] >> nth=0');
  await p4.screenshot({ path: foto('tanda1-mi-cita-cambiar.png'), fullPage: true });
  await p4.click('[data-accion="guardar-cambio"]');
  await p4.waitForSelector('text=cambiamos tu cita');
  ok((await p4.textContent('.ok-aviso')).includes('cambiamos tu cita'), 'Mi cita: reprogramar');
  await p4.click('[data-accion="cancelar"]');
  await p4.click('[data-accion="si-cancelar"]');
  await p4.waitForSelector('text=quedó cancelada');
  ok((await p4.textContent('.tarjeta-cita .estado')).includes('Cancelada'), 'Mi cita: cancelar');

  // Celular
  const movil = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
  instalarSimulador(movil);
  await movil.goto(SITIO + '/index.html#reservar');
  await movil.waitForFunction(() => ESTADO_CONEXION.cargado);
  await movil.click('[data-servicio="color"]'); await movil.click('[data-largo="medio"]');
  await movil.$eval('.selector-largo', (e) => e.scrollIntoView({ block: 'center' }));
  await movil.waitForTimeout(300);
  await movil.screenshot({ path: foto('tanda1-celular.png') });
  ok(!(await movil.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'sin desborde horizontal en celular');

  console.log(errores.length ? '\nFALLAS:\n' + errores.join('\n') : '\nTodo bien');
  await browser.close();
})();
