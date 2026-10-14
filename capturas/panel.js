// Hace una reserva en la página, abre el panel y lo captura.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const base = 'file://' + path.resolve(__dirname, '../salon-belleza/');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 1000 } });
  const page = await ctx.newPage();
  const errores = []; let alertas = 0;
  page.on('pageerror', (e) => errores.push(e.message));
  page.on('dialog', async (d) => { alertas++; await d.dismiss(); });
  await page.addInitScript(() => { window.open = () => {}; });

  // 1) Reserva real desde la página
  await page.goto(base + '/index.html'); await page.waitForTimeout(800);
  await page.click('[data-diseno="french-perlado"]');
  await page.click('[data-profesional="camila"]'); await page.click('#btn-siguiente');
  await page.click('[data-mes="1"]');
  await page.click('.dia:not([disabled]) >> nth=0'); await page.click('.hora:not([disabled]) >> nth=0');
  await page.click('#btn-siguiente'); await page.click('[data-producto="aceite-cuticula"]'); await page.click('#btn-siguiente');
  await page.fill('#nombre', 'Andrea Bolívar'); await page.fill('#telefono', '3105551234');
  await page.fill('#nota', 'Quiero las perlas solo en el anular');
  await page.click('#btn-siguiente'); await page.waitForTimeout(300);

  // 2) Una reserva para hoy (aparece en "Citas de hoy")
  await page.evaluate(() => {
    const hoy = new Date(); const t = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    const l = JSON.parse(localStorage.getItem('neivaBelleza.reservas'));
    l.push({ id: 'hoy1', nombre: 'Juliana Ramírez', telefono: '3001112233', nota: '', servicio: { nombre: 'Maquillaje social', precio: 120000, minutos: 60 },
      profesional: 'Daniela Ortiz', fecha: t, hora: '17:00', productos: [], total: 120000, estado: 'Pendiente' });
    localStorage.setItem('neivaBelleza.reservas', JSON.stringify(l));
  });

  // 3) Prueba de seguridad: una reserva con HTML malicioso no debe ejecutarse
  await page.goto(base + '/admin.html');
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('neivaBelleza.reservas'));
    l.push({ id: 'x"><img src=x onerror=alert(1)>', nombre: '<img src=x onerror=alert(1)>', telefono: '<b>1</b>', nota: '<script>alert(2)</script>',
      servicio: { nombre: '<svg onload=alert(3)>', precio: 1, minutos: 60 }, profesional: '<i>x</i>', fecha: '2026-12-01', hora: '9:00', productos: [], total: '<b>9</b>', estado: '<b>Hack</b>' });
    localStorage.setItem('neivaBelleza.reservas', JSON.stringify(l));
  });
  await page.reload(); await page.waitForTimeout(800);
  console.log('alertas ejecutadas (debe ser 0):', alertas, '| imgs inyectadas:', await page.$$eval('#tabla-reservas img', (x) => x.length));
  await page.evaluate(() => {
    const l = JSON.parse(localStorage.getItem('neivaBelleza.reservas')).filter((r) => !r.id.startsWith('x'));
    localStorage.setItem('neivaBelleza.reservas', JSON.stringify(l));
  });

  // 4) Panel
  await page.goto(base + '/admin.html'); await page.waitForTimeout(1200);
  await page.screenshot({ path: path.resolve(__dirname, 'etapa6-panel.png'), fullPage: true });
  await page.$eval('#graficas', (e) => e.scrollIntoView({ block: 'center' })); await page.waitForTimeout(400);
  const zona = await page.$('rect[data-i="5"]'); await zona.hover(); await page.waitForTimeout(300);
  const caja = await page.$eval('#graficas', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y - 50, width: r.width, height: r.height + 50 }; });
  console.log('tooltip visible:', await page.$eval('#tooltip', (t) => !t.hidden && t.textContent));
  await page.screenshot({ path: path.resolve(__dirname, 'etapa6-grafica-hover.png'), clip: caja });
  await page.click('button.confirmar >> nth=0'); await page.waitForTimeout(300);
  await (await page.$('#reservas-web')).screenshot({ path: path.resolve(__dirname, 'etapa6-reservas-web.png') });
  console.log('Errores JS:', errores.length ? errores : 'ninguno');

  const movil = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await movil.goto(base + '/admin.html'); await movil.waitForTimeout(1000);
  await movil.screenshot({ path: path.resolve(__dirname, 'etapa6-panel-celular.png'), fullPage: false });
  console.log('desborde en celular:', await movil.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await browser.close();
})();
