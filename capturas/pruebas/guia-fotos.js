// Fotos actuales de la página para la guía en PDF
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const { instalarSimulador } = require('./simulador');
const SITIO = 'file://' + path.resolve(__dirname, '../../salon-belleza/index.html');
const foto = (n) => path.resolve(__dirname, '..', n);
const seccion = async (page, id, nombre) => {
  const caja = await page.$eval('#' + id, (e) => { const r = e.getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: Math.min(r.height, 1400) }; });
  await page.screenshot({ path: foto(nombre), fullPage: true, clip: caja });
};
(async () => {
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 1280, height: 820 }, reducedMotion: 'reduce' })).newPage();
  instalarSimulador(p, {});
  await p.goto(SITIO);
  await p.waitForFunction(() => ESTADO_CONEXION.cargado);
  await p.waitForTimeout(500);
  await p.screenshot({ path: foto('guia-portada.png') });
  for (const id of ['servicios', 'equipo', 'disenos']) await seccion(p, id, `guia-${id}.png`);
  await p.click('[data-agenda], .tarjeta-profesional button, [data-ver-agenda]').catch(() => {});
  await p.waitForTimeout(300);
  if (await p.isVisible('#agenda[open]')) await p.screenshot({ path: foto('guia-agenda-profesional.png') });
  const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })).newPage();
  instalarSimulador(m, {});
  await m.goto(SITIO);
  await m.waitForFunction(() => ESTADO_CONEXION.cargado);
  await m.waitForTimeout(400);
  await m.screenshot({ path: foto('guia-celular-portada.png') });
  await b.close();
})();
