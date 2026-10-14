// Prueba la sección "Nuestro equipo" y la agenda de cada profesional.
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const path = require('path');
const url = 'file://' + path.resolve(__dirname, '../salon-belleza/index.html');
const ruta = (n) => path.resolve(__dirname, n);

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  const errores = [];
  page.on('pageerror', (e) => errores.push(e.message));
  await page.addInitScript(() => { window.open = () => {}; });
  await page.goto(url); await page.waitForTimeout(1200);

  await page.addStyleTag({ content: '.navbar{position:relative}' });
  await (await page.$('#equipo')).screenshot({ path: ruta('etapa7-equipo.png') });
  await page.addStyleTag({ content: '.navbar{position:sticky}' });

  // Agenda de Andrés (peluquero)
  await page.click('[data-agenda="andres"]'); await page.waitForTimeout(400);
  await page.click('[data-agenda-servicio="color"]');
  await page.click('.dia-agenda:not([disabled]) >> nth=1');
  await page.click('[data-agenda-hora] >> nth=1'); await page.waitForTimeout(300);
  await (await page.$('#agenda')).screenshot({ path: ruta('etapa7-agenda.png') });
  const elegido = await page.$eval('.agenda-pie', (e) => e.innerText.replace(/\s+/g, ' '));
  await page.click('[data-agenda-reservar]'); await page.waitForTimeout(600);
  console.log('Agenda →', elegido);
  console.log('Paso actual tras reservar:', await page.$eval('.paso-boton.activo', (e) => e.innerText.trim()));
  console.log('Barra:', await page.$eval('#resumen-lineas', (e) => e.textContent));

  // Volver a "Fecha y hora" para ver la línea de tiempo dentro de la reserva
  await page.click('[data-ir="2"]'); await page.waitForTimeout(500);
  await (await page.$('#reservar')).screenshot({ path: ruta('etapa7-reserva-fecha.png') });

  // Reserva desde cero: el paso 2 filtra por servicio y muestra horario + próximo cupo
  await page.click('[data-ir="0"]'); await page.click('[data-servicio="corte"]'); await page.click('#btn-siguiente');
  await page.waitForTimeout(400);
  await (await page.$('#reservar')).screenshot({ path: ruta('etapa7-reserva-profesional.png') });
  console.log('Profesionales para corte:', await page.$$eval('.tarjeta-profesional h4', (x) => x.map((e) => e.textContent).join(', ')));

  // Comprobar que una hora reservada deja de estar libre
  const antes = await page.evaluate(() => horariosLibres(profesionalPorIdSeguro('andres'), estadoPrueba = proximosDias(14).find((f) => horariosLibres(profesionalPorIdSeguro('andres'), f, 60).length), 60));
  const fechaP = await page.evaluate(() => estadoPrueba);
  await page.evaluate(([f, h]) => {
    localStorage.setItem('neivaBelleza.reservas', JSON.stringify([{ id: 't', nombre: 'Test', telefono: '3000000000', servicio: { nombre: 'Corte', precio: 1, minutos: 60 },
      profesional: 'Andrés Cárdenas', profesionalId: 'andres', fecha: f, hora: h, productos: [], total: 1, estado: 'Pendiente' }]));
  }, [fechaP, antes[0]]);
  const despues = await page.evaluate((f) => horariosLibres(profesionalPorIdSeguro('andres'), f, 60), fechaP);
  console.log(`Bloqueo por reserva real: ${antes[0]} libre antes=${antes.includes(antes[0])}, después=${despues.includes(antes[0])}`);
  console.log('Errores JS:', errores.length ? errores : 'ninguno');

  // Celular
  const movil = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await movil.goto(url); await movil.waitForTimeout(1000);
  await movil.click('[data-agenda="valentina"]'); await movil.waitForTimeout(300);
  await movil.click('[data-agenda-hora] >> nth=0'); await movil.waitForTimeout(300);
  await movil.screenshot({ path: ruta('etapa7-agenda-celular.png') });
  console.log('desborde en celular:', await movil.evaluate(() => document.documentElement.scrollWidth > innerWidth));
  await browser.close();
})();
