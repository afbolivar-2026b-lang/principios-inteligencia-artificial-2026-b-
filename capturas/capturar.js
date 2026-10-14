// Toma capturas de la página del salón.
// Uso: node capturar.js <salida.png> [ancho=1280] [desde=selector|top] [hasta=selector|fin] [pagina=index.html]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');

(async () => {
  const [salida, ancho = '1280', desde = 'top', hasta = 'fin', pagina = 'index.html'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Number(ancho), height: 860 }, deviceScaleFactor: Number(ancho) < 600 ? 2 : 1 });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errores.push(m.text()));
  await page.goto('file://' + path.resolve(__dirname, '../salon-belleza', pagina));
  await page.waitForTimeout(1500);
  const altoTotal = await page.evaluate(() => document.documentElement.scrollHeight);
  const y = desde === 'top' ? 0 : await page.$eval(desde, (e) => e.getBoundingClientRect().top + scrollY);
  const yFin = hasta === 'fin' ? altoTotal : await page.$eval(hasta, (e) => e.getBoundingClientRect().bottom + scrollY);
  await page.screenshot({ path: path.resolve(__dirname, salida), fullPage: true, clip: { x: 0, y, width: Number(ancho), height: yFin - y } });
  console.log(salida, 'errores:', errores.length ? errores : 'ninguno');
  await browser.close();
})();
