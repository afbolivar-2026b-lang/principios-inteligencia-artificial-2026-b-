// Toma capturas de la página del salón: node capturar.js <nombre> [ancho] [completa]
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');

(async () => {
  const [nombre = 'captura', ancho = '1280', completa = 'si'] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Number(ancho), height: 800 } });
  await page.goto('file://' + path.resolve(__dirname, '../salon-belleza/index.html'));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.resolve(__dirname, nombre + '.png'), fullPage: completa === 'si' });
  await browser.close();
})();
