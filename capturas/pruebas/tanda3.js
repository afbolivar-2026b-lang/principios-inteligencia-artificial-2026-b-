// Tanda 3: página pública completa (con el simulador de Supabase)
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const { instalarSimulador, sumarDias, fechaCol } = require('./simulador');
const SITIO = 'file://' + path.resolve(__dirname, '../../salon-belleza/');
const foto = (n) => path.resolve(__dirname, '..', n);
const errores = [];
const ok = (cond, texto) => console.log((cond ? '✔ ' : '✘ ') + texto) || (!cond && errores.push(texto));
const hace = (dias) => new Date(Date.now() - dias * 86400e3).toISOString();
// Datos de PRUEBA para ver cómo se ven (no son opiniones reales)
const RESENAS = [
  { nombre: 'Prueba A.', servicio: 'Manicura semipermanente', estrellas: 5, texto: 'Texto de prueba para ver el diseño de una opinión publicada.', creada: hace(3) },
  { nombre: 'Prueba B.', servicio: 'Coloración profesional', estrellas: 4, texto: 'Otra opinión de prueba, con cuatro estrellas.', creada: hace(10) },
  { nombre: 'Prueba C.', servicio: 'Limpieza profunda', estrellas: 5, texto: '', creada: hace(20) },
];
const GALERIA = [
  { foto: 'img/chrome-rosa.jpg', foto_antes: 'img/minimal-milk.jpg', titulo: 'Prueba antes y después', categoria: 'unas' },
  { foto: 'img/french-perlado.jpg', titulo: 'French perlado', categoria: 'unas' },
  { foto: 'img/golden-pearl.jpg', titulo: 'Golden pearl', categoria: 'unas' },
  { foto: 'img/almond-nude.jpg', titulo: 'Almond nude', categoria: 'unas' },
];

async function pagina(browser, opciones = {}, viewport = { width: 1280, height: 900 }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errores.push('JS: ' + e.message));
  const sim = instalarSimulador(page, opciones);
  return { page, sim };
}
// Captura una sección completa sin que el menú fijo la tape
const seccion = async (page, id, nombre) => {
  const caja = await page.$eval('#' + id, (e) => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height }; });
  await page.screenshot({ path: foto(nombre), fullPage: true, clip: caja });
};

(async () => {
  const browser = await chromium.launch();
  const { page, sim } = await pagina(browser, { resenas: RESENAS, galeria: GALERIA });
  await page.goto(SITIO + '/index.html');
  await page.waitForFunction(() => ESTADO_CONEXION.cargado);
  await page.waitForTimeout(400);

  // Datos para Google
  const ld = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => JSON.parse(x.textContent)['@type']));
  ok(ld.join() === 'BeautySalon,FAQPage', 'datos estructurados para Google: ' + ld.join(', '));
  ok(await page.$('link[rel=manifest]') !== null, 'la página se puede instalar (manifest)');

  // Galería con antes y después
  ok((await page.$$('.foto-galeria')).length === 4, 'galería muestra las fotos de la base de datos');
  await seccion(page, 'trabajos', 'tanda3-galeria.png');
  await page.click('.foto-galeria');
  await page.waitForSelector('#visor[open] .comparador');
  await page.$eval('#visor input[type=range]', (r) => { r.value = 30; r.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(200);
  await page.screenshot({ path: foto('tanda3-antes-despues.png') });
  await page.keyboard.press('Escape');

  await seccion(page, 'novias', 'tanda3-novias.png');
  await page.click('#reservar-prueba-novia');
  ok(await page.evaluate(() => estado.servicios.join() === 'maq-novia' && estado.paso === 1), '"Reservar prueba de maquillaje" lleva a la reserva con el servicio elegido');

  // Tienda y carrito
  await seccion(page, 'tienda', 'tanda3-tienda.png');
  await page.click('[data-agregar="shampoo"]');
  await page.waitForSelector('#carrito[open]');
  await page.click('#carrito [data-mas="shampoo"]');
  await page.click('#carrito [data-cerrar]');
  await page.click('[data-agregar="esmalte-rose"]');
  ok(await page.textContent('#contador-bolsa') === '3', 'el ícono del carrito muestra 3 productos');
  await page.click('#carrito [data-entrega="domicilio"]');
  await page.fill('#pedido-nombre', 'Lucía Ramírez');
  await page.fill('#pedido-tel', '310 555 1234');
  await page.click('#carrito button[type=submit]');
  ok(await page.isVisible('#carrito .campo.invalido'), 'domicilio sin dirección pide la dirección');
  await page.fill('#pedido-dir', 'Calle 10 # 5-20, barrio Altico');
  await page.screenshot({ path: foto('tanda3-carrito.png') });
  await page.click('#carrito button[type=submit]');
  await page.waitForSelector('#carrito .exito');
  ok(sim.pedido && sim.pedido.p_items.length === 2 && sim.pedido.p_entrega === 'domicilio', 'pedido enviado: 2 productos, domicilio');
  ok((await page.textContent('#carrito .exito')).includes('92.000'), 'total del pedido $92.000 (2 shampoo + 1 esmalte)');
  await page.screenshot({ path: foto('tanda3-pedido-listo.png') });
  await page.click('#carrito .exito [data-cerrar]');
  ok(await page.isHidden('#contador-bolsa'), 'el carrito queda vacío después del pedido');

  // Tarjeta de regalo
  await page.click('[data-valor="200000"]');
  await page.fill('#regalo-de', 'Andrea');
  await page.fill('#regalo-para', 'Mi mamá');
  await page.fill('#regalo-tel', '3001234567');
  await page.fill('#regalo-mensaje', 'Feliz día');
  await seccion(page, 'regalos', 'tanda3-regalo.png');
  await page.click('#form-regalo button[type=submit]');
  await page.waitForSelector('#regalo-listo:not([hidden])');
  ok(sim.tarjeta.p_valor === 200000, 'tarjeta de regalo pedida por $200.000');
  await page.click('.consultar-saldo summary');
  await page.fill('#saldo-codigo', '7F3A9C2B1E');
  await page.click('#form-saldo button');
  await page.waitForFunction(() => document.querySelector('#saldo-resultado').textContent.includes('Saldo'));
  ok(true, 'consultar saldo: ' + await page.textContent('#saldo-resultado'));
  await seccion(page, 'regalos', 'tanda3-regalo-listo.png');

  await seccion(page, 'opiniones', 'tanda3-opiniones.png');
  ok((await page.textContent('#resumen-opiniones')).includes('4,7 de 5'), 'promedio de opiniones: ' + await page.textContent('#resumen-opiniones'));
  await page.click('#faq details:nth-child(2) summary');
  await seccion(page, 'preguntas', 'tanda3-preguntas.png');
  await seccion(page, 'consejos', 'tanda3-consejos.png');
  await seccion(page, 'ubicacion', 'tanda3-ubicacion.png');
  await page.$eval('#contacto', (e) => e.scrollIntoView());
  await (await page.$('#contacto')).screenshot({ path: foto('tanda3-pie.png') });

  // Reserva con cupón
  await page.evaluate(() => {
    const p = PROFESIONALES.find((x) => x.id === 'sofia');
    let f = ahoraColombia().fecha; let h = [];
    for (let i = 1; i < 30 && !h.length; i++) { const d = deTextoFecha(ahoraColombia().fecha); d.setDate(d.getDate() + i); f = aTextoFecha(d); h = horariosLibres(p, f, 60); }
    Object.assign(estado, { servicios: ['mani-semi'], profesional: 'sofia', fecha: f, hora: h[0], enviada: null });
    irAPaso(4);
  }).catch(async () => {
    await page.evaluate(() => {
      const p = PROFESIONALES.find((x) => x.id === 'sofia');
      let f; let h = [];
      for (let i = 1; i < 30 && !h.length; i++) { const d = deTextoFecha(ahoraColombia().fecha); d.setDate(d.getDate() + i); f = aTextoFecha(d); h = horariosLibres(p, f, 60); }
      Object.assign(estado, { servicios: ['mani-semi'], profesional: 'sofia', fecha: f, hora: h[0], enviada: null });
      irAPaso(4);
    });
  });
  await page.fill('#nombre', 'Lucía Ramírez');
  await page.fill('#telefono', '3105551234');
  await page.fill('#cupon', 'FALSO');
  await page.click('[data-accion="cupon"]');
  await page.waitForSelector('.bloque-cupon .error');
  ok((await page.textContent('.bloque-cupon .error')).includes('no es válido'), 'cupón falso: "no es válido"');
  await page.fill('#cupon', 'bienvenida');
  await page.press('#cupon', 'Enter');
  await page.waitForSelector('.cupon-ok');
  ok(await page.inputValue('#nombre') === 'Lucía Ramírez', 'aplicar el cupón no borra lo escrito');
  ok((await page.textContent('.tarjeta-resumen')).includes('40.500'), 'manicura $45.000 − 10% = $40.500');
  await seccion(page, 'reservar', 'tanda3-cupon.png');
  await page.click('#btn-siguiente');
  await page.waitForSelector('.exito');
  ok((await page.textContent('.exito')).includes('40.500') && sim.llamadas.some((l) => l.ruta === 'rpc/aplicar_cupon'), 'la reserva queda con el descuento');

  // Inglés
  await page.click('#boton-idioma');
  await page.$eval('.hero', (e) => e.scrollIntoView());
  ok(await page.textContent('h1') === 'Book your moment of calm' && await page.evaluate(() => document.documentElement.lang) === 'en', 'botón EN traduce la página');
  await page.screenshot({ path: foto('tanda3-ingles.png') });
  await page.click('#boton-idioma');
  ok((await page.textContent('h1')).startsWith('Reserva tu'), 'botón ES vuelve al español');

  // Reseña desde "Mi cita"
  const terminada = { codigo: 'K7M2QX', token: '6f1c2b0e-3d4a-4b8e-9c1f-2a7d5e8b9c10', profesional_id: 'sofia', profesional: 'Sofía Martínez',
    inicio: new Date(Date.now() - 2 * 86400e3).toISOString(), fin: new Date(Date.now() - 2 * 86400e3 + 3600e3).toISOString(),
    servicios: [{ id: 'mani-semi', nombre: 'Manicura semipermanente', precio: 45000 }], productos: [], total: 45000, estado: 'terminada', nombre: 'Lucía' };
  const c = await pagina(browser, { reservaGuardada: terminada }, { width: 900, height: 1100 });
  await c.page.goto(SITIO + '/cita.html?t=' + terminada.token + '#resena');
  await c.page.waitForSelector('#resena');
  await c.page.fill('#resena-texto', 'Me encantó, muy puntuales.');
  await c.page.click('[data-estrellas="5"]');
  ok(await c.page.inputValue('#resena-texto') === 'Me encantó, muy puntuales.', 'elegir estrellas no borra el comentario');
  await c.page.screenshot({ path: foto('tanda3-resena.png') });
  await c.page.click('#resena button[type=submit]');
  await c.page.waitForFunction(() => document.querySelector('#resena h2').textContent.includes('Gracias'));
  ok(c.sim.resena && c.sim.resena.p_estrellas === 5, 'reseña enviada con 5 estrellas');

  // Celular
  const m = await pagina(browser, { resenas: [], galeria: [] }, { width: 390, height: 844 });
  await m.page.goto(SITIO + '/index.html');
  await m.page.waitForFunction(() => ESTADO_CONEXION.cargado);
  await m.page.waitForTimeout(300);
  const ancho = await m.page.evaluate(() => document.documentElement.scrollWidth);
  ok(ancho <= 390, 'celular sin scroll horizontal (' + ancho + 'px)');
  ok((await m.page.textContent('#grid-opiniones')).includes('Aún no hay opiniones'), 'sin opiniones reales muestra el aviso, no inventa');
  ok((await m.page.$$('.foto-galeria')).length === 8, 'sin fotos subidas, la galería usa las del catálogo');
  for (const id of ['tienda', 'regalos']) { await m.page.$eval('#' + id, (e) => e.scrollIntoView()); await m.page.screenshot({ path: foto(`tanda3-celular-${id}.png`) }); }

  console.log(errores.length ? '\nERRORES:\n' + errores.join('\n') : '\nTodo bien');
  await browser.close();
  process.exit(errores.length ? 1 : 0);
})();
