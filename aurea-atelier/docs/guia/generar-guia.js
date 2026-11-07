/* Genera la guía completa del sistema en PDF (A4 vertical) con capturas y la explicación de cada función.
   Uso: node docs/guia/generar-guia.js  (requiere Playwright y pdfunite de poppler-utils) */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const DIR = __dirname;
const CAPS = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'brochure', 'funciones.json'), 'utf8'));
const GUIA = require('./guia-datos.js');
const TOTAL = Object.values(CAPS).reduce((s, l) => s + l.length, 0);
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Las fotos se pasan a JPEG en una carpeta temporal para que el PDF pese poco y se pueda enviar por correo.
const TMP = path.join(DIR, '_img');
fs.mkdirSync(path.join(TMP, 'pasos'), { recursive: true });
const jpg = (rel) => {
  const src = path.join(DIR, '..', 'capturas', rel + '.png'), dst = path.join(TMP, rel + '.jpg');
  if (!fs.existsSync(dst)) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-i', src, '-q:v', '4', dst]);
  return '_img/' + rel + '.jpg';
};
const img = (n) => jpg(n);

// Cada función de la lista del sistema debe tener su explicación en la guía.
const faltan = [];
for (const [g, list] of Object.entries(CAPS)) {
  const cap = GUIA.find(c => c.grupo === g);
  if (!cap) { faltan.push(`Grupo sin capítulo: ${g}`); continue; }
  list.forEach(f => { if (!cap.fx[f]) faltan.push(`${g} → ${f}`); });
}
GUIA.forEach(c => { if (!CAPS[c.grupo]) faltan.push(`Capítulo sin grupo: ${c.grupo}`); });
if (faltan.length) { console.error('Faltan explicaciones:\n' + faltan.join('\n')); process.exit(1); }

const LOGO = (size, id) => `<svg width="${size}" height="${size}" viewBox="0 0 64 64" aria-hidden="true">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dca6"/><stop offset=".55" stop-color="#c9a45c"/><stop offset="1" stop-color="#8f6a2b"/></linearGradient></defs>
  <circle cx="32" cy="32" r="30" fill="none" stroke="url(#${id})" stroke-width="1.2"/>
  <circle cx="32" cy="32" r="26.5" fill="none" stroke="url(#${id})" stroke-width=".6" stroke-dasharray="1.6 2.4"/>
  <path d="M32 12 L18 50M32 12 L46 50" stroke="url(#${id})" stroke-width="3.2" stroke-linecap="round"/>
  <path d="M22.5 37 H41.5" stroke="url(#${id})" stroke-width="1.4" stroke-dasharray="2.4 2" stroke-linecap="round"/>
  <circle cx="32" cy="12" r="2.6" fill="url(#${id})"/>
  <g fill="url(#${id})"><circle cx="30.6" cy="27.4" r=".9"/><circle cx="33.4" cy="27.4" r=".9"/><circle cx="30.6" cy="30.2" r=".9"/><circle cx="33.4" cy="30.2" r=".9"/></g></svg>`;

const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Jost:wght@300;400;500;600&display=swap">';
const BASE = `* { box-sizing: border-box; } body { margin: 0; font-family: "Jost", "Avenir Next", system-ui, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
h1, h2, h3 { font-family: "Cormorant Garamond", Georgia, serif; font-weight: 600; margin: 0; }`;

/* ---------- Portada (sin márgenes) ---------- */
const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
const cover = `<!doctype html><html lang="es"><head><meta charset="utf-8">${FONTS}<style>${BASE}
@page { size: A4; margin: 0; }
.c { width: 210mm; height: 297mm; position: relative; overflow: hidden; color: #efe7d8; display: flex; flex-direction: column; justify-content: space-between; padding: 26mm 22mm;
  background: radial-gradient(700px 520px at 50% 34%, rgba(201,164,92,.2), transparent 65%), repeating-linear-gradient(45deg, rgba(201,164,92,.06) 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, rgba(201,164,92,.05) 0 1px, transparent 1px 14px), #110e0b; }
.top { display: flex; justify-content: space-between; letter-spacing: .3em; text-transform: uppercase; font-size: 8.5pt; color: #a39782; }
.mid { text-align: center; display: grid; justify-items: center; gap: 6mm; }
.n { font-family: "Cormorant Garamond", serif; font-size: 44pt; letter-spacing: .34em; margin-left: .34em; font-weight: 600; }
.s { letter-spacing: .5em; text-transform: uppercase; font-size: 9pt; color: #a39782; }
.rule { width: 50mm; border-top: 1px dashed rgba(201,164,92,.7); margin: 4mm 0; }
h1 { font-size: 40pt; font-weight: 500; line-height: 1.05; }
h1 em { color: #c9a45c; }
.sub { font-size: 12pt; color: #cfc4b0; max-width: 130mm; line-height: 1.6; }
.stats { display: flex; justify-content: center; gap: 12mm; }
.stats div { text-align: center; } .stats b { display: block; font-family: "Cormorant Garamond", serif; font-size: 30pt; color: #e3c98f; font-weight: 600; } .stats span { font-size: 8.5pt; letter-spacing: .2em; text-transform: uppercase; color: #a39782; }
.bot { display: flex; justify-content: space-between; font-size: 9pt; color: #a39782; border-top: 1px solid #2e281f; padding-top: 5mm; }
</style></head><body><section class="c">
<div class="top"><span>Aurea Atelier</span><span>Documento para el cliente</span></div>
<div class="mid">${LOGO(170, 'cg')}<div class="n">AUREA</div><div class="s">Atelier · Confección</div><div class="rule"></div>
<h1>Guía completa<br><em>del sistema</em></h1><p class="sub">Cada módulo y cada función explicados paso a paso, con imágenes reales de la plataforma.</p>
<div class="stats"><div><b>${GUIA.length}</b><span>capítulos</span></div><div><b>${TOTAL}</b><span>funciones</span></div><div><b>4</b><span>roles</span></div></div></div>
<div class="bot"><span>Neiva, Huila</span><span>${fecha}</span></div></section></body></html>`;

/* ---------- Cuerpo ---------- */
let num = 0;
const caps = GUIA.map((c, i) => {
  const list = CAPS[c.grupo];
  const [hero, ...resto] = c.imgs;
  const items = list.map(f => { num++; return `<div class="fx"><span class="fn">${num}</span><div><b>${esc(f)}</b><p>${esc(c.fx[f])}</p></div></div>`; }).join('');
  return `<section class="cap">
    <header class="ch"><div class="chn">Capítulo ${String(i + 1).padStart(2, '0')}</div><h2>${esc(c.titulo)}</h2><p>${esc(c.intro)}</p></header>
    <figure class="hero"><img src="${img(hero[0])}" alt=""><figcaption>${esc(hero[1])}</figcaption></figure>
    <div class="steps"><h3>Cómo se usa</h3><ol>${c.pasos.map(p => `<li>${esc(p)}</li>`).join('')}</ol></div>
    <div class="fxh"><h3>Paso a paso con fotos</h3><span>El aro dorado marca dónde tocar</span></div>
    <div class="pasos">${c.pasos.map((p, k) => `<figure class="paso"><img src="${jpg(`pasos/c${String(i + 1).padStart(2, '0')}-p${k + 1}`)}" alt=""><figcaption><span class="pn">Paso ${k + 1}</span>${esc(p)}</figcaption></figure>`).join('')}</div>
    ${resto.length ? `<div class="gal ${resto.length === 1 ? 'one' : ''}">${resto.map(([n, t]) => `<figure><img src="${img(n)}" alt=""><figcaption>${esc(t)}</figcaption></figure>`).join('')}</div>` : ''}
    <div class="fxh"><h3>Funciones de este módulo</h3><span>${list.length} funciones</span></div>
    <div class="fxs">${items}</div>
  </section>`;
}).join('');

const roles = [
  ['Administradora', 'Todo el sistema: ventas, finanzas, finanzas del hogar, dashboard, usuarios, auditoría y configuración. Es la única que anula facturas.'],
  ['Secretaria', 'Panel, salón de ventas, catálogo, cotizaciones, facturas, cartera, clientes, secretaría, mensajes, productos, inventario y producción.'],
  ['Vendedor de salón', 'Panel, salón de ventas, catálogo, cotizaciones, clientes, productos y mensajes.'],
  ['Jefe de taller', 'Panel, producción, inventario y telas, compras, catálogo, productos y personal.']
];
const faq = [
  ['¿Dónde queda guardada la información?', 'Hoy se guarda en el navegador del equipo donde se usa. Por eso es importante crear un respaldo cifrado cada semana. Para que la dueña y la secretaria vean lo mismo desde varios celulares y computadores, el siguiente paso es conectar el sistema a una base de datos segura en internet.'],
  ['¿La factura es factura electrónica de la DIAN?', 'No. El sistema genera la factura comercial con consecutivo y resolución configurables, pero no la transmite a la DIAN. Para facturación electrónica validada hay que integrarlo con un proveedor tecnológico autorizado por la DIAN.'],
  ['¿Las fotos de las prendas son de la empresa?', 'Las fotos de ejemplo fueron creadas para la demostración. Desde la ficha de cada prenda se sube la foto real tomada con el celular y reemplaza la de ejemplo.'],
  ['¿Los números del dashboard son reales?', 'En la demostración el dashboard incluye un historial de ventas de ejemplo de dos años para que se vean las gráficas. Al tocar Empezar en limpio, muestra solo las ventas reales registradas.'],
  ['¿Funciona sin internet?', 'Sí, una vez abierto. El probador 3D necesita conexión la primera vez que se usa; si no hay, muestra la foto con relieve.'],
  ['¿Se puede cambiar el nombre y los datos de la empresa?', 'Sí. En Configuración se cambian el nombre, el NIT, la dirección, el teléfono, el IVA, los datos bancarios y las condiciones; aparecen en todos los documentos.']
];

const body = `<!doctype html><html lang="es"><head><meta charset="utf-8">${FONTS}<style>${BASE}
@page { size: A4; margin: 16mm 16mm 18mm; }
body { color: #221b12; font-size: 10pt; line-height: 1.5; }
.eye { text-transform: uppercase; letter-spacing: .24em; font-size: 7.5pt; color: #8a7a5c; font-weight: 600; }
.toc h2, .intro h2 { font-size: 28pt; margin: 2mm 0 5mm; }
.toc ol { list-style: none; padding: 0; margin: 0; columns: 2; column-gap: 10mm; }
.toc li { break-inside: avoid; display: flex; gap: 4mm; align-items: baseline; padding: 2.4mm 0; border-bottom: 1px solid #ece3d1; }
.toc li span { font-family: "Cormorant Garamond", serif; color: #9a7530; font-size: 14pt; font-weight: 600; width: 9mm; }
.toc li b { flex: 1; font-weight: 500; } .toc li i { font-style: normal; color: #8a7a5c; font-size: 8.5pt; }
.box { border: 1px solid #e5d8bd; border-radius: 3mm; padding: 5mm 6mm; background: #faf5ea; margin-top: 6mm; break-inside: avoid; }
.box h3 { font-size: 16pt; margin-bottom: 2mm; }
.roles { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm; margin-top: 3mm; }
.roles div { border-left: 2px solid #c9a45c; padding-left: 3mm; } .roles b { display: block; }
.roles p { margin: 1mm 0 0; color: #5c5040; font-size: 9pt; }
.cap { break-before: page; }
.ch { background: #14110d; color: #efe7d8; border-radius: 3mm; padding: 7mm 8mm; position: relative; overflow: hidden;
  background-image: repeating-linear-gradient(45deg, rgba(201,164,92,.07) 0 1px, transparent 1px 12px), radial-gradient(400px 160px at 0% 0%, rgba(201,164,92,.25), transparent 70%); }
.chn { text-transform: uppercase; letter-spacing: .3em; font-size: 7.5pt; color: #c9a45c; font-weight: 600; }
.ch h2 { font-size: 30pt; font-weight: 500; margin: 1.5mm 0 3mm; }
.ch p { margin: 0; color: #d9cfbd; font-size: 10.5pt; line-height: 1.6; }
figure { margin: 0; break-inside: avoid; }
figure { text-align: center; }
figure img { max-width: 100%; max-height: 118mm; width: auto; display: inline-block; border-radius: 2.5mm; border: 1px solid #d9ccb3; }
.gal figure img { max-height: 92mm; }
figcaption { text-align: left; }
figcaption { font-size: 8pt; color: #8a7a5c; margin-top: 1.5mm; letter-spacing: .04em; }
.hero { margin-top: 6mm; }
.steps { margin-top: 6mm; border: 1px solid #e5d8bd; border-radius: 3mm; padding: 5mm 6mm; background: #faf5ea; break-inside: avoid; }
.steps h3, .fxh h3 { font-size: 17pt; margin-bottom: 2mm; }
.steps ol { margin: 0; padding-left: 6mm; display: grid; gap: 1.5mm; }
.steps li::marker { color: #9a7530; font-weight: 700; }
.pasos { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm 6mm; margin-top: 4mm; }
.paso { break-inside: avoid; text-align: left; }
.paso img { max-height: none; width: 100%; }
.paso figcaption { font-size: 9.2pt; color: #2e261a; letter-spacing: 0; line-height: 1.45; margin-top: 2mm; }
.paso .pn { display: inline-block; background: #14110d; color: #e3c98f; font-size: 7.5pt; letter-spacing: .18em; text-transform: uppercase; padding: .6mm 2.2mm; border-radius: 99px; margin-right: 2mm; font-weight: 600; }
.gal { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; margin-top: 6mm; }
.gal.one { grid-template-columns: 1fr; }
.fxh { display: flex; justify-content: space-between; align-items: baseline; margin-top: 7mm; border-bottom: 2px solid #c9a45c; padding-bottom: 1.5mm; break-after: avoid; }
.fxh span { font-size: 8.5pt; color: #8a7a5c; letter-spacing: .1em; text-transform: uppercase; }
.fxs { display: grid; grid-template-columns: 1fr 1fr; gap: 0 7mm; }
.fx { display: flex; gap: 3mm; padding: 2.6mm 0; border-bottom: 1px solid #ece3d1; break-inside: avoid; }
.fn { flex: none; width: 7.5mm; height: 7.5mm; border-radius: 50%; border: 1px solid #c9a45c; color: #9a7530; font-size: 7.5pt; font-weight: 600; display: grid; place-items: center; margin-top: .5mm; }
.fx b { font-weight: 600; font-size: 9.5pt; } .fx p { margin: .6mm 0 0; color: #5c5040; font-size: 8.8pt; line-height: 1.45; }
.faq .q { break-inside: avoid; padding: 3.5mm 0; border-bottom: 1px solid #ece3d1; } .faq .q b { font-size: 11pt; } .faq .q p { margin: 1mm 0 0; color: #4a4033; }
.end { break-before: page; text-align: center; padding-top: 30mm; display: grid; justify-items: center; gap: 5mm; }
.end h2 { font-size: 30pt; font-weight: 500; } .end h2 em { color: #9a7530; }
.end .box { text-align: left; width: 140mm; }
</style></head><body>
<section class="toc"><div class="eye">Contenido</div><h2>Índice de la guía</h2>
  <ol>${GUIA.map((c, i) => `<li><span>${String(i + 1).padStart(2, '0')}</span><b>${esc(c.titulo)}</b><i>${CAPS[c.grupo].length} funciones</i></li>`).join('')}<li><span>—</span><b>Preguntas frecuentes</b><i></i></li></ol>
  <div class="box"><h3>Cómo leer esta guía</h3>Cada capítulo corresponde a un módulo del sistema. Empieza con una explicación corta, una imagen real de la pantalla y los pasos para usarlo, cada uno con su foto: el aro dorado marca dónde hay que tocar. Después vienen todas sus funciones numeradas, una por una, con lo que hace cada una. En total son ${TOTAL} funciones.</div>
  <div class="box"><h3>Quién ve qué</h3>Cada persona entra con su usuario y el menú le muestra solo lo que su rol permite.<div class="roles">${roles.map(([r, d]) => `<div><b>${r}</b><p>${d}</p></div>`).join('')}</div></div>
</section>
${caps}
<section class="cap faq"><header class="ch"><div class="chn">Antes de empezar</div><h2>Preguntas frecuentes</h2><p>Respuestas claras a lo que más se pregunta antes de usar el sistema con datos reales.</p></header>
  ${faq.map(([q, a]) => `<div class="q"><b>${esc(q)}</b><p>${esc(a)}</p></div>`).join('')}</section>
<section class="end">${LOGO(90, 'eg')}<div class="eye">Aurea Atelier</div><h2>Listo para empezar a<br><em>vestir el negocio.</em></h2>
  <div class="box"><h3>Primeros pasos</h3>1. Entrar con el usuario de la administradora y cambiar las contraseñas de demostración.<br>2. Poner el nombre, NIT, dirección y datos bancarios de la empresa en Configuración.<br>3. Tocar Empezar en limpio para borrar los datos de ejemplo.<br>4. Cargar clientes, telas y prendas, y subir las fotos reales.<br>5. Crear los usuarios de la secretaria, los vendedores y el jefe de taller.<br>6. Crear un respaldo cifrado cada semana.</div></section>
</body></html>`;

(async () => {
  const coverF = path.join(DIR, 'portada.html'), bodyF = path.join(DIR, 'guia.html');
  fs.writeFileSync(coverF, cover); fs.writeFileSync(bodyF, body);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + coverF, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  const c1 = path.join(DIR, '_portada.pdf'), c2 = path.join(DIR, '_cuerpo.pdf');
  await p.pdf({ path: c1, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await p.goto('file://' + bodyF, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: c2, format: 'A4', printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate: '<div style="width:100%;font-family:Helvetica,Arial,sans-serif;font-size:7px;letter-spacing:1.5px;color:#8a7a5c;padding:0 16mm;display:flex;justify-content:space-between"><span>AUREA ATELIER · GUÍA COMPLETA DEL SISTEMA</span><span>PÁGINA <span class="pageNumber"></span> DE <span class="totalPages"></span></span></div>' });
  await b.close();
  const out = path.join(DIR, '..', 'Aurea-Atelier-Guia-Completa.pdf');
  execFileSync('pdfunite', [c1, c2, out]);
  fs.unlinkSync(c1); fs.unlinkSync(c2); fs.rmSync(TMP, { recursive: true, force: true });
  console.log('PDF:', out, 'funciones explicadas:', num);
})();
