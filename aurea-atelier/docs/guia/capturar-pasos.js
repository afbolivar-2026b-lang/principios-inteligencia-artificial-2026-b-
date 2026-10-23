/* Recorre el sistema haciendo cada paso de la guía y toma una foto por paso, con un aro dorado
   sobre lo que hay que tocar. Uso: node docs/guia/capturar-pasos.js (con la app en http://localhost:8765).
   Las fotos quedan en docs/capturas/pasos/cNN-pM.png, en el mismo orden de guia-datos.js. */
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }
const OUT = path.join(__dirname, '..', 'capturas', 'pasos');
fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://localhost:8765/';
const W = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  let cap = 0, n = 0;
  const shot = async () => { n++; await W(250); await p.screenshot({ path: path.join(OUT, `c${String(cap).padStart(2, '0')}-p${n}.png`) }); await p.evaluate(() => document.querySelectorAll('.hl-ring').forEach(e => e.remove())); };
  // Acepta CSS normal o "css >> nth=K"; sin índice marca el último elemento visible (el del diálogo abierto).
  const hl = (selector) => p.evaluate(([sel, idx]) => {
    const els = [...document.querySelectorAll(sel)].filter(e => e.offsetParent || e.getClientRects().length); const e = idx == null ? els[els.length - 1] : els[idx]; if (!e) throw new Error('No encontré ' + sel);
    e.scrollIntoView({ block: 'nearest' });
    const r = e.getBoundingClientRect(), d = document.createElement('div'); d.className = 'hl-ring';
    Object.assign(d.style, { position: 'fixed', left: r.left - 7 + 'px', top: r.top - 7 + 'px', width: r.width + 14 + 'px', height: r.height + 14 + 'px', border: '3px solid #f1dca6', borderRadius: '12px', boxShadow: '0 0 0 5px rgba(201,164,92,.35), 0 0 34px rgba(227,201,143,.75)', zIndex: 99999, pointerEvents: 'none' });
    document.body.appendChild(d);
  }, selector.includes(' >> nth=') ? [selector.split(' >> nth=')[0], +selector.split(' >> nth=')[1]] : [selector, null]);
  const clean = () => p.evaluate(() => { document.querySelectorAll('.overlay,.lock-screen').forEach(o => o.remove()); State.locked = false; });
  const go = async (r) => { await clean(); await p.evaluate(r => go(r), r); await W(250); };
  const chapter = async (fn) => { cap++; n = 0; await clean(); await fn(); };

  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }); await p.reload(); await p.waitForSelector('#login-form');
  await p.addStyleTag({ content: '.overlay{backdrop-filter:none!important}' });

  // 1 · Primeros pasos y seguridad
  await chapter(async () => {
    await p.fill('#lg-user', 'admin'); await p.fill('#lg-pass', 'Aurea2026*'); await hl('#login-form button'); await shot();
    await p.click('#login-form button'); await p.waitForSelector('.shell'); await p.addStyleTag({ content: '.overlay{backdrop-filter:none!important}' });
    await go('usuarios'); await p.click('[data-pw]'); await hl('#pw1'); await shot();
    await go('usuarios'); await p.click('#new-u'); await p.fill('#nu-n', 'Daniela Vargas'); await p.fill('#nu-u', 'daniela'); await p.selectOption('#nu-r', 'secretaria'); await p.fill('#nu-p', 'Taller2026'); await hl('#nu-ok'); await shot();
    await go('panel'); await hl('#btn-lock'); await shot();
    await p.click('#btn-private'); await hl('#btn-private'); await shot(); await p.click('#btn-private');
  });
  // 2 · Panel principal
  await chapter(async () => {
    await go('panel'); await hl('.kpi-value >> nth=0'); await p.evaluate(() => document.querySelectorAll('.hl-ring').forEach(e => e.remove())); await hl('.grid.g-4'); await shot();
    await hl('.grid.g-21 .card:last-child'); await shot();
    await p.evaluate(() => document.querySelector('.content').scrollTo(0, 560)); await hl('.grid.g-3 .card:nth-child(2)'); await shot();
    await p.evaluate(() => document.querySelector('.content').scrollTo(0, 0)); await hl('.page-head .actions'); await shot();
  });
  // 3 · Salón de ventas
  await chapter(async () => {
    await go('pos'); await p.fill('#pos-q', 'camisa'); await p.dispatchEvent('#pos-q', 'input'); await W(300); await hl('#pos-q'); await shot();
    await p.fill('#pos-q', ''); await p.dispatchEvent('#pos-q', 'input'); await W(200); await p.click('[data-add="p3"]'); await p.fill('#ps-c', '8'); await hl('#ps-ok'); await shot();
    await p.click('#ps-ok'); await W(200); await p.selectOption('#pos-cli', 'c2'); await W(300); await hl('#pos-cli'); await shot();
    await p.selectOption('#pos-medio', 'Transferencia'); await hl('#pos-pay'); await shot();
    await p.click('#pos-pay'); await W(500); await hl('.overlay .modal-foot a.btn'); await shot();
  });
  // 4 · Catálogo visual
  await chapter(async () => {
    await go('catalogo'); await p.click('[data-cat="Camisa de salir"]'); await W(200); await hl('[data-cat="Camisa de salir"]'); await shot();
    await p.click('[data-cat="Todas"]'); await W(200); await p.click('[data-p="p4"]'); await W(300); await hl('.overlay .talla >> nth=0'); await p.evaluate(() => document.querySelectorAll('.hl-ring').forEach(e => e.remove())); await hl('.overlay .ficha .flex:has(.talla)'); await shot();
    await clean(); await p.click('#cat-cli'); await W(300); await hl('#cat-cli'); await shot(); await p.click('#cat-cli'); await W(200);
    await p.click('[data-p="p1"]'); await W(300); await p.selectOption('#fp-t', 'L'); await hl('#fp-add'); await shot();
    await hl('.overlay label[for="fp-foto"]'); await shot();
  });
  // 5 · Probador 3D
  await chapter(async () => {
    await go('catalogo'); await p.click('[data-p="p2"]'); await W(300); await hl('.overlay [data-3d2]'); await shot();
    await p.evaluate(() => { window.AUREA_V3D = { t: 2.2 }; }); await p.click('.overlay [data-3d2]'); await p.waitForSelector('#v3d-canvas canvas'); await W(2500); await hl('#v3d-canvas'); await shot();
    await p.click('[data-t="tela"]'); await p.waitForSelector('#v3d-canvas canvas'); await p.evaluate(() => window.AUREA_V3D.t = 3.1); await W(2500); await hl('[data-t="tela"]'); await shot();
    await p.click('[data-c="Azul oscuro"]'); await p.waitForSelector('#v3d-canvas canvas'); await p.evaluate(() => window.AUREA_V3D.t = 4.3); await W(2500); await hl('#v3d-colors'); await shot();
    await p.click('[data-t="lupa"]'); await W(400); const z = await p.$('.v3d-lupa'); const zb = await z.boundingBox(); await p.mouse.move(zb.x + zb.width * .5, zb.y + zb.height * .42); await W(200); await hl('[data-t="lupa"]'); await shot();
    await hl('#v3d-cot'); await shot();
    await p.evaluate(() => { window.AUREA_V3D = null; });
  });
  // 6 · Cotizaciones
  await chapter(async () => {
    await go('cotizaciones'); await p.click('#new-q'); await p.selectOption('#de-cli', 'c3'); await hl('#de-cli'); await shot();
    await p.click('#de-add'); await p.click('#de-add'); await p.selectOption('[data-f="productoId"][data-i="1"]', 'p9'); await p.fill('[data-f="cant"][data-i="0"]', '60'); await p.dispatchEvent('[data-f="cant"][data-i="0"]', 'change'); await p.fill('[data-f="cant"][data-i="1"]', '20'); await p.dispatchEvent('[data-f="cant"][data-i="1"]', 'change'); await W(200); await hl('#de-lines'); await shot();
    await p.fill('#de-notas', 'Bordado del logo en pecho izquierdo, hilo dorado. Entrega en 15 días hábiles.'); await hl('#de-notas'); await shot();
    await p.click('#de-save'); await W(500); await hl('.overlay .lx-band'); await shot();
    await go('cotizaciones'); await hl('[data-fact] >> nth=0'); await shot();
  });
  // 7 · La cotización con su sello
  await chapter(async () => {
    await go('config'); await p.evaluate(() => document.getElementById('cfg-docs').scrollIntoView({ block: 'center' })); await hl('#cfg-docs'); await shot();
    await go('catalogo'); await p.click('[data-p="p9"]'); await W(300); await hl('.overlay [data-cotp]'); await shot();
    await p.evaluate(() => verDocumento(DB.data.cotizaciones.find(q => q.num === 'COT-301'), 'cotizacion')); await W(400); await hl('.overlay .modal-foot a.btn'); await shot();
  });
  // 8 · Facturas
  await chapter(async () => {
    await go('facturas'); await p.click('#new-f'); await W(200); await hl('#de-forma'); await shot();
    await go('facturas'); await p.click('[data-abono] >> nth=0'); await W(200); await hl('#ab-v'); await shot();
    await go('facturas'); await p.click('[data-view] >> nth=0'); await W(300); await hl('.overlay .modal-foot a.btn'); await shot();
    await go('facturas'); await p.click('[data-anular] >> nth=0'); await W(200); await hl('#ask-yes'); await shot();
  });
  // 9 · Cartera
  await chapter(async () => {
    await go('cartera'); await p.click('[data-table="car"] th[data-sort="dias"]'); await p.click('[data-table="car"] th[data-sort="dias"]'); await W(200); await hl('[data-table="car"] th[data-sort="dias"]'); await shot();
    await hl('[data-table="car"] tbody tr:first-child a.btn'); await shot();
    await p.click('[data-table="car"] tbody tr:first-child [data-abono]'); await W(200); await hl('#ab-ok'); await shot();
  });
  // 10 · Clientes
  await chapter(async () => {
    await go('clientes'); await p.click('#new-c'); await p.fill('#f-nombre', 'Colegio Nuestra Señora'); await p.selectOption('#f-tipo', 'Empresa'); await p.fill('#f-tel', '3112224455'); await hl('#f-tipo'); await shot();
    await p.fill('#f-cupo', '15000000'); await p.fill('#f-descuento', '8'); await hl('#f-cupo'); await shot();
    await go('clientes'); await p.click('[data-hist] >> nth=0'); await W(300); await hl('.overlay .modal-body .grid.g-3'); await shot();
  });
  // 11 · Productos, telas e insumos
  await chapter(async () => {
    await go('productos'); await p.click('#new-p'); await p.fill('#f-nombre', 'Polo bordada piqué'); await p.fill('#f-sku', 'PL-PIQ-11'); await p.fill('#f-precioDetal', '58000'); await hl('#f-precioDetal'); await shot();
    await go('inventario'); await p.click('#new-t'); await p.fill('#f-nombre', 'Piqué de algodón'); await p.fill('#f-codigo', 'TL-PIQ-BL'); await p.fill('#f-metros', '150'); await hl('#f-metros'); await shot();
    await go('inventario'); await p.click('#mov'); await p.fill('#mv-r', 'Devolución de taller'); await hl('#mv-ok'); await shot();
    await go('inventario'); await hl('[data-table="tel"] tbody tr:nth-child(2) td:nth-child(5)'); await shot();
  });
  // 12 · Reposición, conteo y etiquetas
  await chapter(async () => {
    await p.evaluate(() => { const x = DB.find('productos', 'p2'); x.M = 4; x.L = 3; const y = DB.find('productos', 'p9'); y.M = 2; DB.save(); });
    await go('productos'); await p.click('#inv-reponer'); await W(200); await hl('#rp-ok'); await shot();
    await go('productos'); await p.click('#inv-conteo'); await p.fill('[data-cf="p1:M"]', '30'); await p.dispatchEvent('[data-cf="p1:M"]', 'input'); await W(150); await hl('[data-dif="p1"]'); await shot();
    await go('productos'); await p.click('#inv-precios'); await p.fill('#ap-p', '6'); await hl('#ap-ok'); await shot();
    await go('productos'); await p.click('#inv-etq'); await W(300); await hl('.overlay .etq >> nth=0'); await shot();
  });
  // 13 · Producción
  await chapter(async () => {
    await go('produccion'); await p.click('#new-op'); await p.fill('[name=cantidad]', '40'); await p.dispatchEvent('[name=cantidad]', 'change'); await hl('.overlay [name=productoId]'); await shot();
    await hl('#op-calc'); await shot();
    await go('produccion'); await hl('[data-next] >> nth=0'); await shot();
    await hl('.kanban .col:last-child'); await shot();
  });
  // 14 · Compras y proveedores
  await chapter(async () => {
    await go('compras'); await p.click('#new-oc'); await p.fill('[name=metros]', '200'); await p.fill('[name=costoMetro]', '14800'); await hl('.overlay [name=telaId]'); await shot();
    await p.selectOption('[name=pagado]', 'false'); await hl('.overlay [name=pagado]'); await shot();
    await go('compras'); await hl('[data-pay] >> nth=0'); await shot();
  });
  // 15 · Secretaría y mensajes
  await chapter(async () => {
    await go('secretaria'); await p.click('#new-a'); await p.fill('#f-titulo', 'Prueba de uniformes · Colegio Santa Librada'); await p.selectOption('#f-tipo', 'Prueba'); await hl('#f-tipo'); await shot();
    await go('secretaria'); await hl('[data-done-k] >> nth=0'); await shot();
    await go('mensajes'); await p.click('[data-m="m3"]'); await W(200); await hl('[data-m="m3"]'); await shot();
    await hl('#rsp'); await shot();
  });
  // 16 · Personal, gastos y caja
  await chapter(async () => {
    await go('empleados'); await p.click('#new-e'); await p.fill('#f-nombre', 'Gloria Patricia Muñoz'); await p.selectOption('#f-modo', 'Destajo'); await p.fill('#f-tarifa', '3500'); await hl('#f-modo'); await shot();
    await go('empleados'); await p.click('#dj'); await p.fill('#f-prendas', '36'); await hl('#f-prendas'); await shot();
    await go('gastos'); await p.click('#new-g'); await p.fill('#f-desc', 'Repuestos máquina plana'); await p.fill('#f-valor', '120000'); await hl('#f-categoria'); await shot();
    await go('gastos'); await p.click('#cierre'); await W(200); await hl('#ci-v'); await shot();
  });
  // 17 · Finanzas del hogar
  await chapter(async () => {
    await p.evaluate(() => { hogarTab = 'presupuesto'; }); await go('hogar'); await hl('[data-pres="Mercado"]'); await shot();
    await p.evaluate(() => { hogarTab = 'gastos'; }); await go('hogar'); await p.click('#hg-new'); await p.fill('#f-desc', 'Mercado de la semana'); await p.fill('#f-valor', '320000'); await hl('#f-categoria'); await shot();
    await p.evaluate(() => { hogarTab = 'fijos'; }); await go('hogar'); await hl('[data-pagar] >> nth=0'); await shot();
    await p.evaluate(() => { hogarTab = 'resumen'; }); await go('hogar'); await p.click('#hg-retiro'); await W(200); await hl('#rt-ok'); await shot();
    await p.evaluate(() => { hogarTab = 'ahorro'; }); await go('hogar'); await p.fill('[data-ab-meta="hm2"]', '500000'); await hl('[data-meta="hm2"]'); await shot();
    await p.evaluate(() => { hogarTab = 'resumen'; });
  });
  // 18 · Dashboard de ventas
  await chapter(async () => {
    await go('dashboard'); await hl('[data-go="dashboard"]'); await shot();
    await p.click('[data-mes="3"]'); await p.click('[data-mes="7"]'); await W(300); await hl('[data-mes="7"]'); await shot();
    await p.click('[data-vend="Daniela Vargas"]'); await W(300); await hl('[data-vend="Daniela Vargas"]'); await shot();
    await p.click('#dash-clear'); await W(300); await p.evaluate(() => document.getElementById('c-monto').scrollIntoView({ block: 'center' })); await W(200);
    const pt = await p.$('#c-monto [data-tip]:nth-of-type(8) circle'); const bb = await pt.boundingBox(); await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await W(300); await hl('#c-monto'); await shot();
    await p.mouse.move(5, 5); await p.evaluate(() => document.querySelector('.content').scrollTo(0, 0)); await p.click('#dash-meta'); await W(200); await hl('#mt-v'); await shot();
  });
  // 19 · Reportes y configuración
  await chapter(async () => {
    await go('config'); await hl('#f-empresa'); await shot();
    await p.evaluate(() => document.getElementById('cfg-docs').scrollIntoView({ block: 'center' })); await hl('#cfg-docs-save'); await shot();
    await go('config'); await p.click('#clear-demo'); await W(200); await hl('#ask-yes'); await shot();
    await clean(); await p.fill('#bk-p', 'MiRespaldo2026'); await p.click('#bk-exp'); await W(1500); await hl('#bk-txt'); await shot();
  });
  console.log('fotos tomadas en', OUT, 'errores', JSON.stringify(errs));
  await b.close();
})().catch(e => { console.error('FALLÓ:', e.message); process.exit(1); });
