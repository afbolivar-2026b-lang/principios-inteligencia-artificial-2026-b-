const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../salon-belleza/index.html');
const mostrar = (p) => p.evaluate(() => document.querySelectorAll('.aparecer').forEach(e => e.classList.add('visible')));
(async () => {
  const b = await chromium.launch();
  // Escritorio: opiniones, reserva y pie
  let p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => m.type() === 'error' && errores.push(m.text()));
  await p.goto(url); await p.waitForTimeout(1200); await mostrar(p); await p.waitForTimeout(800);
  const y = await p.$eval('#opiniones', e => e.offsetTop);
  const h = await p.evaluate(() => document.body.scrollHeight);
  await p.evaluate(() => document.querySelector('.whatsapp-flotante').style.position = 'absolute');
  await p.screenshot({ path: 'etapa3-opiniones-reserva.png', fullPage: true, clip: { x: 0, y, width: 1280, height: h - y } });
  // Validación del formulario
  await p.click('#form-reserva button[type=submit]'); await p.waitForTimeout(300);
  const f = await p.$('#form-reserva'); await f.screenshot({ path: 'etapa3-validacion.png' });
  console.log('Errores JS:', errores.length ? errores : 'ninguno');
  await p.close();
  // Celular con menú abierto
  p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto(url); await p.waitForTimeout(1200);
  await p.click('.menu-toggle'); await p.waitForTimeout(500);
  await p.screenshot({ path: 'etapa3-celular-menu.png' });
  await b.close();
})();
