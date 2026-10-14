// Recorre el flujo de reserva como lo haría una clienta y captura cada paso.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1500 } });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(() => { window.open = (url) => { window.__whatsapp = url; }; });
  await page.goto('file://' + path.resolve(__dirname, '../salon-belleza/index.html'));
  await page.waitForTimeout(1200);
  const seccion = await page.$('#reservar');
  const foto = async (nombre) => { await page.waitForTimeout(500); await seccion.screenshot({ path: path.resolve(__dirname, nombre) }); };

  await page.click('[data-diseno="golden-pearl"]');       // elige diseño del catálogo
  await page.click('[data-ir="0"]'); await foto('etapa5-paso1-servicio.png');
  await page.click('#btn-siguiente');
  await page.click('[data-profesional="sofia"]'); await foto('etapa5-paso2-profesional.png');
  await page.click('#btn-siguiente');
  await page.click('[data-mes="1"]');                       // mes siguiente
  await page.click('.dia:not([disabled]) >> nth=3');
  await page.click('.hora:not([disabled]) >> nth=1'); await foto('etapa5-paso3-fecha.png');
  await page.click('#btn-siguiente');
  await page.click('[data-producto="serum-rosa"]');
  await page.click('[data-producto="esmalte-nude"]'); await foto('etapa5-paso4-productos.png');
  await page.click('#btn-siguiente');
  await page.click('#btn-siguiente');                       // intenta confirmar vacío -> errores
  await page.fill('#nombre', 'María Pérez');
  await page.fill('#telefono', '310 555 1234'); await foto('etapa5-paso5-confirmar.png');
  await page.click('#btn-siguiente'); await foto('etapa5-exito.png');
  console.log('WhatsApp:', decodeURIComponent(await page.evaluate(() => window.__whatsapp)));
  console.log('Guardadas:', await page.evaluate(() => localStorage.getItem('neivaBelleza.reservas').length), 'caracteres');
  console.log('Errores JS:', errores.length ? errores : 'ninguno');
  await browser.close();
})();
