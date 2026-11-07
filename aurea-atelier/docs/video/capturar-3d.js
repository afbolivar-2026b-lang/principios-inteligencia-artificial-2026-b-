/* Captura cuadro a cuadro del probador 3D para el video. Uso: node capturar-3d.js CARPETA_SALIDA (con la app en http://localhost:8765). */
const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await p.goto('http://localhost:8765/'); await p.waitForSelector('#login-form');
  await p.fill('#lg-user', 'admin'); await p.fill('#lg-pass', 'Aurea2026*'); await p.click('#login-form button'); await p.waitForSelector('.shell');
  await p.addStyleTag({ content: '.overlay{backdrop-filter:none!important}' }); await p.evaluate(() => { window.AUREA_V3D = { t: 0 }; viewer3D(DB.find('productos', 'p2')); });
  await p.waitForSelector('#v3d-canvas canvas'); await p.waitForTimeout(1500);
  const frame = async (name, i, t) => {
    await p.evaluate(t => { window.AUREA_V3D.t = t; return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, t);
    await p.screenshot({ path: `${OUT}/${name}-${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 });
  };
  const N = 165; // 5,5 s a 30 cuadros por segundo
  for (let i = 0; i < N; i++) await frame('prenda', i, 1.2 + i / 30 * 1.6);
  await p.click('[data-t="tela"]'); await p.waitForFunction(() => document.querySelector('#v3d-canvas canvas')); await p.waitForTimeout(1500);
  for (let i = 0; i < N; i++) await frame('tela', i, 2 + i / 30);
  await p.click('[data-t="lupa"]'); await p.waitForTimeout(500);
  const z = await p.$('.v3d-lupa'); const zb = await z.boundingBox();
  for (let i = 0; i < 120; i++) { const u = i / 119; await p.mouse.move(zb.x + zb.width * (0.3 + 0.4 * u), zb.y + zb.height * (0.25 + 0.45 * u + 0.05 * Math.sin(u * 6))); await p.screenshot({ path: `${OUT}/lupa-${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
  await b.close(); console.log('ok');
})();
