// Tanda 2: panel del salón (con el simulador de Supabase)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const { instalarSimuladorPanel } = require('./simulador-panel');
const SITIO = 'file://' + path.resolve(__dirname, '../../salon-belleza/');
const foto = (n) => path.resolve(__dirname, '..', n);
const errores = [];
const ok = (cond, texto) => console.log((cond ? '✔ ' : '✘ ') + texto) || (!cond && errores.push(texto));
const SECCIONES = ['inicio', 'agenda', 'clientas', 'caja', 'inventario', 'espera', 'pedidos', 'regalos', 'resenas', 'galeria', 'reportes', 'gastos', 'equipo', 'catalogo', 'cupones', 'config', 'historial'];

async function nuevaPagina(browser, opciones = {}, viewport = { width: 1366, height: 900 }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce', acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push('JS: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  const sim = instalarSimuladorPanel(page, opciones);
  return { page, sim };
}
async function ingresar(page) {
  await page.goto(SITIO + '/admin.html');
  await page.fill('#acceso-email', 'anfebolivar@gmail.com');
  await page.fill('#acceso-clave', 'clave-segura-123');
  await page.click('#boton-acceso');
  await page.waitForSelector('#app:not([hidden]) .cabecera-vista');
}
async function ir(page, id) {
  await page.evaluate((s) => { location.hash = s; }, id);
  await page.waitForFunction((s) => document.querySelector('#menu-admin [aria-current="page"]')?.getAttribute('href') === '#' + s && !document.querySelector('#vista .cargando'), id);
  await page.waitForTimeout(150);
}

(async () => {
  const browser = await chromium.launch();
  const { page, sim } = await nuevaPagina(browser);

  // Ingreso con clave mala
  await page.goto(SITIO + '/admin.html');
  await page.waitForSelector('#pantalla-login:not([hidden])');
  await page.screenshot({ path: foto('tanda2-ingreso.png') });
  await page.fill('#acceso-email', 'anfebolivar@gmail.com');
  await page.fill('#acceso-clave', 'mala-clave');
  await page.click('#boton-acceso');
  await page.waitForSelector('#error-acceso:not([hidden])');
  ok((await page.textContent('#error-acceso')).includes('incorrectos'), 'clave mala muestra "Correo o contraseña incorrectos"');

  await ingresar(page);
  const menu = await page.$$eval('#menu-admin a', (a) => a.map((x) => x.getAttribute('href').slice(1)));
  ok(menu.length === SECCIONES.length, `la dueña ve las ${SECCIONES.length} secciones: ` + menu.join(', '));

  for (const s of SECCIONES) {
    await ir(page, s);
    const err = await page.$('#vista > .error-general');
    ok(!err, `sección ${s} carga sin error` + (err ? ': ' + await err.textContent() : ''));
    await page.screenshot({ path: foto(`tanda2-${s}.png`), fullPage: true });
  }
  ok(!sim.errores.length, 'sin tablas sin simular ' + sim.errores.join(','));
  const llamada = (t) => sim.llamadas.some((x) => x.includes(t));
  const toast = async (texto) => { await page.waitForFunction((t) => document.querySelector('#toast')?.textContent.includes(t), texto, { timeout: 4000 }).catch(() => {}); return (await page.textContent('#toast')).includes(texto); };

  // Aprobar a una persona nueva del equipo
  await ir(page, 'inicio');
  await page.selectOption('[data-rol="u-nueva"], select[data-rol]', 'estilista').catch(() => {});
  const selPro = await page.$('select[data-pro]');
  if (selPro) await selPro.selectOption('laura');
  await page.click('[data-aprobar]');
  ok(await toast('Acceso aprobado'), 'aprobar acceso de Karen');
  ok(sim.DB.perfiles.some((x) => x.user_id === 'u-nueva'), 'Karen ya tiene perfil');

  // Detalle de una cita y cambio de estado
  await ir(page, 'agenda');
  const andres = sim.DB.reservas.find((r) => r.profesional_id === 'andres' && r.estado === 'confirmada');
  await page.click(`.cita-bloque[data-cita="${andres.id}"]`);
  await page.waitForSelector('#modal[open]');
  await page.screenshot({ path: foto('tanda2-detalle-cita.png') });
  await page.click('#modal [data-estado="llego"]');
  ok(await toast('Llegó') && andres.estado === 'llego', 'marcar cita como "Llegó"');

  // Arrastrar una cita a otra hora
  await ir(page, 'agenda');
  const paola = sim.DB.reservas.find((r) => r.profesional_id === 'camila');
  const antes = paola.inicio;
  const col = await page.$('[data-columna="camila"]');
  const caja = await col.boundingBox();
  await page.dragAndDrop(`.cita-bloque[data-cita="${paola.id}"]`, '[data-columna="camila"]', { targetPosition: { x: 40, y: caja.height * 0.45 } });
  await page.waitForTimeout(400);
  ok(llamada('rpc/mover_cita') && paola.inicio !== antes, 'arrastrar cita llama a mover_cita (nueva hora ' + new Date(paola.inicio).toISOString() + ')');

  // Nueva cita tocando un espacio libre
  await page.click('[data-hueco^="sofia|15:00"]');
  await page.waitForSelector('#modal[open] #nc-nombre');
  await page.fill('#nc-nombre', 'Mónica Salazar');
  await page.fill('#nc-tel', '3201234567');
  await page.selectOption('#nc-servicios', ['mani-semi']);
  await page.screenshot({ path: foto('tanda2-nueva-cita.png') });
  await page.click('#modal [data-guardar]');
  ok(await toast('Cita creada') && sim.DB.reservas.some((r) => r.codigo === 'NUEVA1' && r.profesional_id === 'sofia'), 'crear cita desde la agenda');

  // Ficha de clienta
  await ir(page, 'clientas');
  await page.click('tr[data-cl], tr.clicable');
  await page.waitForSelector('#modal[open]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: foto('tanda2-ficha-clienta.png') });
  await page.keyboard.press('Escape');

  // Venta en caja
  await ir(page, 'caja');
  const nVentas = sim.DB.ventas.length;
  await page.selectOption('#v-servicio', 'corte');
  await page.waitForTimeout(200);
  await page.selectOption('#v-producto', 'shampoo');
  await page.waitForTimeout(200);
  await page.fill('#v-propina', '5000');
  await page.dispatchEvent('#v-propina', 'input');
  await page.click('[data-metodo="nequi"]');
  ok((await page.textContent('#v-total')).includes('82.000'), 'total = corte 45.000 + shampoo 32.000 + propina 5.000');
  await page.screenshot({ path: foto('tanda2-caja-venta.png') });
  await page.click('[data-registrar]');
  await page.waitForTimeout(400);
  const v = sim.DB.ventas[sim.DB.ventas.length - 1];
  ok(sim.DB.ventas.length === nVentas + 1 && v.total === 82000 && v.metodo_pago === 'nequi', 'venta registrada por Nequi');

  // Cobrar con tarjeta de regalo
  await ir(page, 'caja');
  await page.selectOption('#v-servicio', 'mani-clasica');
  await page.waitForTimeout(200);
  await page.click('[data-metodo="bono"]');
  ok(await page.isVisible('#v-bono'), 'al elegir "Bono" pide el código de la tarjeta');
  await page.fill('#v-bono', 'a1b2c3d4e5');
  await page.click('[data-registrar]');
  await page.waitForTimeout(400);
  ok(sim.DB.tarjetas_regalo.find((t) => t.codigo === 'A1B2C3D4E5').saldo === 70000, 'la tarjeta de regalo queda con $70.000 de saldo');

  // Etapa 3 en el panel
  await ir(page, 'pedidos');
  await page.screenshot({ path: foto('tanda3-panel-pedidos.png') });
  await page.click('[data-estado-pedido="entregado"]');
  await page.waitForTimeout(300);
  ok(sim.DB.pedidos[0].estado === 'entregado', 'pedido marcado como entregado');
  await ir(page, 'regalos');
  await page.click('[data-activar="7F3A9C2B1E"]');
  await page.waitForTimeout(300);
  ok(sim.DB.tarjetas_regalo[0].estado === 'activa', 'tarjeta de regalo activada al pagarla');
  await page.screenshot({ path: foto('tanda3-panel-regalos.png') });
  await ir(page, 'resenas');
  await page.click('[data-publicar]');
  await page.waitForTimeout(300);
  ok(sim.DB.resenas.every((r) => r.aprobada), 'reseña publicada desde el panel');
  await ir(page, 'resenas');
  await page.screenshot({ path: foto('tanda3-panel-resenas.png') });
  await ir(page, 'cupones');
  await page.fill('#cu-codigo', 'mayo15');
  await page.fill('#cu-desc', '15% en todos los servicios');
  await page.fill('#cu-valor', '15');
  await page.fill('#cu-usos', '50');
  await page.click('[data-crear-cupon]');
  await page.waitForTimeout(300);
  ok(sim.DB.cupones.some((c) => c.codigo === 'MAYO15' && c.usos_max === 50), 'cupón MAYO15 creado');
  await ir(page, 'cupones');
  await page.screenshot({ path: foto('tanda3-panel-cupones.png') });
  await ir(page, 'galeria');
  await page.setInputFiles('#ga-foto', path.resolve(__dirname, '../../salon-belleza/img/chrome-rosa.jpg'));
  await page.setInputFiles('#ga-antes', path.resolve(__dirname, '../../salon-belleza/img/minimal-milk.jpg'));
  await page.fill('#ga-titulo', 'Chrome rosa');
  await page.click('[data-subir]');
  await page.waitForFunction(() => document.querySelector('.galeria-panel figure'));
  ok(sim.DB.galeria.length === 1 && sim.DB.galeria[0].foto_antes && sim.llamadas.filter((l) => l.includes('/storage/v1/object/galeria/')).length === 2, 'foto y foto de antes subidas a la galería');
  await page.screenshot({ path: foto('tanda3-panel-galeria.png') });

  // Tooltip de la gráfica
  await ir(page, 'reportes');
  await page.hover('#grafica-ingresos .barra:nth-of-type(3)').catch(() => {});
  const barras = await page.$$('#grafica-ingresos .barra');
  const alta = barras[barras.length - 2];
  await alta.hover();
  ok(await page.isVisible('#tooltip'), 'la gráfica muestra el valor al pasar el mouse');
  await page.screenshot({ path: foto('tanda2-grafica.png'), clip: { x: 230, y: 180, width: 1110, height: 480 } });

  // Celular
  const cel = await nuevaPagina(browser, {}, { width: 390, height: 844 });
  await ingresar(cel.page);
  await cel.page.screenshot({ path: foto('tanda2-celular-inicio.png'), fullPage: true });
  const anchoInicio = await cel.page.evaluate(() => document.documentElement.scrollWidth);
  ok(anchoInicio <= 390, 'inicio en celular sin scroll horizontal (' + anchoInicio + 'px)');
  await ir(cel.page, 'agenda');
  await cel.page.screenshot({ path: foto('tanda2-celular-agenda.png') });
  const ancho = await cel.page.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, 'en celular no hay scroll horizontal de la página (' + ancho + 'px)');

  // Estilista: solo ve lo suyo
  const est = await nuevaPagina(browser, { usuario: 'u-sofia', email: 'sofia@correo.com' });
  await ingresar(est.page);
  const menuEst = await est.page.$$eval('#menu-admin a', (a) => a.map((x) => x.getAttribute('href').slice(1)));
  ok(menuEst.join() === 'inicio,agenda,galeria,equipo', 'la estilista solo ve Inicio, Agenda, Galería y su horario: ' + menuEst.join(', '));
  await est.page.screenshot({ path: foto('tanda2-estilista.png') });

  // Cuenta sin aprobar
  const pen = await nuevaPagina(browser, { usuario: 'u-pendiente', email: 'nueva@correo.com' });
  await pen.page.goto(SITIO + '/admin.html');
  await pen.page.fill('#acceso-email', 'nueva@correo.com');
  await pen.page.fill('#acceso-clave', 'clave-segura-123');
  await pen.page.click('#boton-acceso');
  await pen.page.waitForSelector('#pantalla-pendiente:not([hidden])');
  ok(true, 'cuenta sin aprobar ve "Tu cuenta espera aprobación"');
  const reales = errores.filter((e) => !e.includes('400 (Bad Request)'));
  errores.length = 0; errores.push(...reales);
  console.log(errores.length ? '\nERRORES:\n' + errores.join('\n') : '\nTodo bien');
  await browser.close();
  process.exit(errores.length ? 1 : 0);
})();
