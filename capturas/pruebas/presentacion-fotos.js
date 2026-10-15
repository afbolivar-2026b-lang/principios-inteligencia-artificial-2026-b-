// Fotos paso a paso de la página para la presentación al cliente.
// Cada foto marca con un recuadro el botón que se toca en ese paso.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const { instalarSimulador } = require('./simulador');
const BASE = 'file://' + path.resolve(__dirname, '../../salon-belleza/');
const DIR = path.resolve(__dirname, '../presentacion');
const hace = (d) => new Date(Date.now() - d * 86400e3).toISOString();
const EJEMPLO_RESENAS = [
  { nombre: 'Clienta de ejemplo', servicio: 'Manicura semipermanente', estrellas: 5, texto: 'Así se ve una opinión publicada: la escribe la clienta después de su cita.', creada: hace(3) },
  { nombre: 'Clienta de ejemplo', servicio: 'Coloración profesional', estrellas: 4, texto: 'Las estrellas y el servicio salen solos de su cita.', creada: hace(9) },
  { nombre: 'Clienta de ejemplo', servicio: 'Limpieza profunda', estrellas: 5, texto: '', creada: hace(15) },
];
const EJEMPLO_GALERIA = [
  { foto: 'img/chrome-rosa.jpg', foto_antes: 'img/minimal-milk.jpg', titulo: 'Ejemplo de antes y después', categoria: 'unas' },
  { foto: 'img/french-perlado.jpg', titulo: 'French perlado', categoria: 'unas' },
  { foto: 'img/golden-pearl.jpg', titulo: 'Golden pearl', categoria: 'unas' },
  { foto: 'img/almond-nude.jpg', titulo: 'Almond nude', categoria: 'unas' },
];

let n = 0;
async function marcar(page, sel) {
  await page.evaluate((s) => {
    document.querySelectorAll('.marca-guia').forEach((e) => e.classList.remove('marca-guia'));
    if (!document.getElementById('estilo-guia')) {
      const st = document.createElement('style'); st.id = 'estilo-guia';
      st.textContent = '.marca-guia{outline:4px solid #e0457b!important;outline-offset:4px!important;box-shadow:0 0 0 12px rgba(224,69,123,.18)!important;border-radius:10px}';
      document.head.appendChild(st);
    }
    if (s) { const e = document.querySelector(s); if (e) e.classList.add('marca-guia'); }
  }, sel || null);
}
async function ver(page, sel, offset = 90) {
  await page.evaluate(([s, o]) => { const e = document.querySelector(s); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - o); }, [sel, offset]);
  await page.waitForTimeout(250);
}
async function foto(page, nombre, marca) {
  await marcar(page, marca);
  await page.waitForTimeout(120);
  n++;
  await page.screenshot({ path: path.join(DIR, `${String(n).padStart(2, '0')}-${nombre}.png`) });
  await marcar(page, null);
}
async function nueva(browser, opciones = {}, viewport = { width: 1280, height: 820 }) {
  const ctx = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('JS:', e.message));
  const sim = instalarSimulador(page, { resenas: EJEMPLO_RESENAS, galeria: EJEMPLO_GALERIA, ...opciones });
  return { page, sim };
}
async function cargar(page, archivo = 'index.html') {
  await page.goto(BASE + '/' + archivo);
  if (archivo === 'index.html') await page.waitForFunction(() => ESTADO_CONEXION.cargado);
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch();
  let { page, sim } = await nueva(browser);
  await cargar(page);

  // --- Portada y menú
  await foto(page, 'portada', '.hero-botones .btn');
  await foto(page, 'menu', '.nav-links');
  await ver(page, '#servicios', 70); await foto(page, 'servicios');

  // --- Reservar un servicio (5 pasos)
  await ver(page, '#reservar', 70); await foto(page, 'reserva-paso1', '[data-servicio="corte"]');
  await page.click('[data-servicio="corte"]');
  await page.click('[data-servicio="hidratante"]');
  await page.click('[data-largo="medio"]');
  await ver(page, '#reservar', 70); await foto(page, 'reserva-paso1-elegido', '.barra-resumen');
  await page.click('#btn-siguiente');
  await ver(page, '#reservar', 70); await foto(page, 'reserva-paso2', '[data-profesional="valentina"]');
  await page.click('[data-profesional="valentina"]');
  await page.click('#btn-siguiente');
  await ver(page, '#paso-contenido', 70); await foto(page, 'reserva-paso3', '[data-accion="primer-cupo"]');
  const dia = await page.$$eval('[data-fecha]:not([disabled])', (b) => b[2] && b[2].dataset.fecha);
  await page.click(`[data-fecha="${dia}"]`);
  await page.click('[data-hora]');
  await ver(page, '#paso-contenido', 70); await foto(page, 'reserva-paso3-hora', '[data-hora][aria-pressed="true"]');
  await page.click('[data-accion="espera"]');
  await ver(page, '.form-espera', 300); await foto(page, 'lista-espera', '.form-espera');
  await page.click('#btn-siguiente');
  await page.click('[data-producto="shampoo"]');
  await ver(page, '#paso-contenido', 70); await foto(page, 'reserva-paso4', '[data-producto="shampoo"]');
  await page.click('#btn-siguiente');
  await page.fill('#nombre', 'María Pérez');
  await page.fill('#telefono', '3001234567');
  await page.fill('#nota', 'Quiero un tono miel');
  await page.fill('#cupon', 'BIENVENIDA');
  await page.click('[data-accion="cupon"]');
  await page.waitForSelector('.cupon-ok');
  await ver(page, '#paso-contenido', 70); await foto(page, 'reserva-paso5', '.bloque-cupon');
  await page.click('#btn-siguiente');
  await page.waitForSelector('.exito');
  await ver(page, '.exito', 90); await foto(page, 'reserva-lista', '.acciones-exito');

  // --- Desde el equipo: agenda de una profesional
  ({ page } = await nueva(browser)); await cargar(page);
  await ver(page, '#equipo', 70); await foto(page, 'equipo', '[data-agenda="sofia"]');
  await page.click('[data-agenda="sofia"]');
  await page.waitForSelector('#agenda[open]');
  await page.click('[data-agenda-servicio="mani-semi"]');
  const d2 = await page.$$eval('[data-agenda-fecha]:not([disabled])', (b) => b[1].dataset.agendaFecha);
  await page.click(`[data-agenda-fecha="${d2}"]`);
  await page.click('[data-agenda-hora]');
  await foto(page, 'agenda-profesional', '[data-agenda-reservar]');
  await page.click('[data-agenda-reservar]');
  await page.waitForTimeout(400);
  await ver(page, '#reservar', 70); await foto(page, 'agenda-a-reserva', '.barra-resumen');

  // --- Catálogo de diseños
  ({ page } = await nueva(browser)); await cargar(page);
  await ver(page, '#disenos', 70); await foto(page, 'catalogo', '[data-filtro="Chrome"]');
  await page.click('[data-filtro="Chrome"]');
  await ver(page, '#disenos', 70); await foto(page, 'catalogo-filtro', '[data-diseno="chrome-rosa"]');
  await page.click('[data-diseno="chrome-rosa"]');
  await page.waitForTimeout(400);
  await ver(page, '#reservar', 70); await foto(page, 'catalogo-a-reserva', '.barra-resumen');

  // --- Novias
  await ver(page, '#novias', 70); await foto(page, 'novias', '#reservar-prueba-novia');

  // --- Tienda
  await ver(page, '#tienda', 70); await foto(page, 'tienda', '[data-agregar="serum-rosa"]');
  await page.click('[data-agregar="serum-rosa"]');
  await page.waitForSelector('#carrito[open]');
  await page.click('#carrito [data-mas="serum-rosa"]');
  await page.click('#carrito [data-entrega="domicilio"]');
  await page.fill('#pedido-nombre', 'María Pérez');
  await page.fill('#pedido-tel', '3001234567');
  await page.fill('#pedido-dir', 'Calle 10 # 5-20, barrio Altico');
  await foto(page, 'carrito', '#carrito button[type=submit]');
  await page.click('#carrito button[type=submit]');
  await page.waitForSelector('#carrito .exito');
  await foto(page, 'pedido-listo', '#carrito .exito');
  await page.click('#carrito .exito [data-cerrar]');

  // --- Regalos
  await page.click('[data-valor="200000"]');
  await page.fill('#regalo-de', 'Andrea');
  await page.fill('#regalo-para', 'Mi mamá');
  await page.fill('#regalo-tel', '3001234567');
  await page.fill('#regalo-mensaje', '¡Feliz día!');
  await ver(page, '#regalos', 70); await foto(page, 'regalo', '#form-regalo button[type=submit]');
  await page.click('#form-regalo button[type=submit]');
  await page.waitForSelector('#regalo-listo:not([hidden])');
  await page.click('.consultar-saldo summary');
  await page.fill('#saldo-codigo', '7F3A9C2B1E');
  await page.click('#form-saldo button');
  await page.waitForFunction(() => document.querySelector('#saldo-resultado').textContent.includes('Saldo'));
  await ver(page, '#regalos', 70); await foto(page, 'regalo-listo', '#regalo-listo');

  // --- Galería, opiniones, consejos, preguntas, ubicación
  await ver(page, '#trabajos', 70); await foto(page, 'galeria', '.foto-galeria');
  await page.click('.foto-galeria');
  await page.waitForSelector('#visor[open] .comparador');
  await page.$eval('#visor input[type=range]', (r) => { r.value = 35; r.dispatchEvent(new Event('input')); });
  await foto(page, 'antes-despues', '.comparador');
  await page.keyboard.press('Escape');
  await ver(page, '#opiniones', 70); await foto(page, 'opiniones');
  await page.click('.consejo summary');
  await ver(page, '#consejos', 70); await foto(page, 'consejos', '.consejo details');
  await page.click('#faq details:nth-child(2) summary');
  await ver(page, '#preguntas', 70); await foto(page, 'preguntas', '#faq details:nth-child(2)');
  await ver(page, '#ubicacion', 70); await foto(page, 'ubicacion', '#como-llegar');
  await ver(page, '#contacto', 300); await foto(page, 'contacto', '#whatsapp-flotante');
  await page.click('#boton-idioma');
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
  await foto(page, 'ingles', '#boton-idioma');

  // --- Mi cita
  const futura = new Date(Date.now() + 5 * 86400e3); futura.setUTCHours(15, 0, 0, 0);
  const cita = { codigo: 'K7M2QX', token: '6f1c2b0e-3d4a-4b8e-9c1f-2a7d5e8b9c10', profesional_id: 'valentina', profesional: 'Valentina Ríos',
    inicio: futura.toISOString(), fin: new Date(futura.getTime() + 3 * 3600e3).toISOString(),
    servicios: [{ id: 'corte', nombre: 'Corte & estilizado', precio: 50000 }, { id: 'hidratante', nombre: 'Tratamiento hidratante', precio: 100000 }],
    productos: [], total: 150000, estado: 'pendiente', nombre: 'María' };
  ({ page } = await nueva(browser, { reservaGuardada: cita }, { width: 1000, height: 900 }));
  await cargar(page, 'cita.html?t=' + cita.token);
  await page.waitForSelector('.tarjeta-cita');
  await foto(page, 'mi-cita', '.acciones-cita');
  await page.click('[data-accion="cambiar"]');
  const d3 = await page.$$eval('[data-fecha]:not([disabled])', (b) => b[2].dataset.fecha);
  await page.click(`[data-fecha="${d3}"]`); await page.click('[data-hora]');
  await ver(page, '.dias-agenda', 120); await foto(page, 'mi-cita-cambiar', '[data-accion="guardar-cambio"]');
  await page.click('[data-accion="volver"]'); await page.click('[data-accion="cancelar"]');
  await ver(page, '.confirmar-cancelar', 250); await foto(page, 'mi-cita-cancelar', '.confirmar-cancelar');
  const terminada = { ...cita, estado: 'terminada', inicio: new Date(Date.now() - 2 * 86400e3).toISOString(), fin: new Date(Date.now() - 2 * 86400e3 + 3600e3).toISOString() };
  ({ page } = await nueva(browser, { reservaGuardada: terminada }, { width: 1000, height: 1000 }));
  await cargar(page, 'cita.html?t=' + cita.token);
  await page.waitForSelector('#resena');
  await page.click('[data-estrellas="5"]');
  await page.fill('#resena-texto', 'Me encantó el resultado.');
  await ver(page, '#resena', 150); await foto(page, 'resena', '.estrellas-elegir');

  // --- Celular
  ({ page } = await nueva(browser, {}, { width: 390, height: 844 })); await cargar(page);
  await foto(page, 'celular-portada');
  await page.click('.menu-toggle'); await page.waitForTimeout(400);
  await foto(page, 'celular-menu', '.navbar nav');
  await page.click('.menu-toggle');
  await ver(page, '#reservar', 70); await foto(page, 'celular-reserva');

  await browser.close();
  console.log('fotos:', n);
})();
