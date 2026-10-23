/* Catálogo visual, finanzas del hogar y herramientas extra de inventario. */

/* ---------------- Datos nuevos y migración ---------------- */
window.AUREA_MIGRATE = function (data, withSeed = true) {
  const d = (off) => { const x = new Date(); x.setDate(x.getDate() + off); return x.toISOString().slice(0, 10); };
  const mes = new Date().toISOString().slice(0, 7);
  // Fechas dentro del mes actual para que el resumen del hogar tenga movimientos.
  const dm = (off) => { const x = new Date(); x.setDate(Math.max(1, x.getDate() + off)); return x.toISOString().slice(0, 10); };
  const seed = {
    hogarGastos: [
      { id: 'hg1', fecha: dm(-20), categoria: 'Mercado', desc: 'Mercado del mes', valor: 980000, medio: 'Tarjeta', quien: 'Mamá' },
      { id: 'hg2', fecha: dm(-18), categoria: 'Servicios', desc: 'Luz, agua y gas de la casa', valor: 420000, medio: 'Transferencia', quien: 'Mamá' },
      { id: 'hg3', fecha: dm(-15), categoria: 'Educación', desc: 'Pensión colegio', valor: 650000, medio: 'Transferencia', quien: 'Mamá' },
      { id: 'hg4', fecha: dm(-11), categoria: 'Salud', desc: 'Medicamentos y cita', valor: 185000, medio: 'Efectivo', quien: 'Mamá' },
      { id: 'hg5', fecha: dm(-8), categoria: 'Transporte', desc: 'Gasolina carro', valor: 260000, medio: 'Efectivo', quien: 'Esposo' },
      { id: 'hg6', fecha: dm(-5), categoria: 'Mercado', desc: 'Plaza y fruta', valor: 145000, medio: 'Efectivo', quien: 'Mamá' },
      { id: 'hg7', fecha: dm(-3), categoria: 'Internet y celular', desc: 'Plan hogar y celulares', valor: 210000, medio: 'Transferencia', quien: 'Mamá' },
      { id: 'hg8', fecha: dm(-1), categoria: 'Recreación', desc: 'Salida familiar', valor: 190000, medio: 'Tarjeta', quien: 'Familia' }
    ],
    hogarIngresos: [
      { id: 'hi1', fecha: dm(-25), fuente: 'Retiro de utilidades de la empresa', valor: 3500000 },
      { id: 'hi2', fecha: dm(-15), fuente: 'Arriendo apartamento', valor: 1100000 }
    ],
    hogarFijos: [
      { id: 'hf1', nombre: 'Arriendo / cuota de la casa', categoria: 'Vivienda', valor: 1500000, dia: 5, pagado: mes },
      { id: 'hf2', nombre: 'Pensión colegio', categoria: 'Educación', valor: 650000, dia: 10, pagado: mes },
      { id: 'hf3', nombre: 'Servicios públicos', categoria: 'Servicios', valor: 420000, dia: 15, pagado: mes },
      { id: 'hf4', nombre: 'Plan celular e internet', categoria: 'Internet y celular', valor: 210000, dia: 20, pagado: mes },
      { id: 'hf5', nombre: 'Medicina prepagada', categoria: 'Salud', valor: 380000, dia: 28, pagado: '' },
      { id: 'hf6', nombre: 'Seguro del carro', categoria: 'Transporte', valor: 240000, dia: 30, pagado: '' }
    ],
    hogarMetas: [
      { id: 'hm1', nombre: 'Fondo de emergencia', objetivo: 10000000, ahorrado: 6200000 },
      { id: 'hm2', nombre: 'Nueva bordadora industrial', objetivo: 18000000, ahorrado: 7400000 },
      { id: 'hm3', nombre: 'Vacaciones de diciembre', objetivo: 4500000, ahorrado: 1900000 }
    ]
  };
  for (const k of Object.keys(seed)) if (!Array.isArray(data[k])) data[k] = withSeed ? seed[k] : [];
  data.config.presupuestoHogar ||= { Vivienda: 1500000, Mercado: 1300000, Servicios: 450000, Educación: 700000, Salud: 400000, Transporte: 500000, 'Internet y celular': 220000, Recreación: 300000, Ropa: 200000, Otros: 250000 };
  // Fotos de estudio incluidas para las prendas de ejemplo; las prendas nuevas usan su ilustración o la foto que se suba.
  data.productos.forEach(p => { if (p.imagen === undefined && /^p([1-9]|10)$/.test(p.id)) p.imagen = `img/productos/${p.id}.jpg`; });
  data.productos.forEach((p, i) => { if (p.coleccion === undefined) p.coleccion = ['Dotación 2026', 'Dotación 2026', 'Ejecutiva', 'Resort', 'Dotación 2026', 'Dotación 2026', 'Marca propia', 'Bioseguridad', 'Dotación 2026', 'Bioseguridad'][i] || 'General'; });
};

const CAT_HOGAR = ['Vivienda', 'Mercado', 'Servicios', 'Educación', 'Salud', 'Transporte', 'Internet y celular', 'Recreación', 'Ropa', 'Otros'];

/* ---------------- Ilustraciones de prendas ---------------- */
function garmentSVG(p, size = 120) {
  const c = swatch(p.color);
  const line = 'rgba(0,0,0,.35)', st = 'rgba(255,255,255,.38)';
  const refl = /reflect/i.test(p.nombre) ? `<g fill="#e9e4d2" opacity=".9"><rect x="36" y="70" width="48" height="5"/><rect x="36" y="80" width="48" height="5"/></g>` : '';
  let body;
  switch (p.categoria) {
    case 'Pantalón':
      body = `<path d="M40 14H80L87 106H66L60 46L54 106H33Z" fill="${c}" stroke="${line}"/><path d="M40 22H80" stroke="${st}" stroke-dasharray="2 2"/><path d="M60 22V46" stroke="${st}" stroke-dasharray="2 2"/><path d="M44 26Q50 34 56 26M64 26Q70 34 76 26" fill="none" stroke="${st}"/>`; break;
    case 'Gorra':
      body = `<path d="M26 72Q26 34 60 32Q94 34 94 72Z" fill="${c}" stroke="${line}"/><path d="M20 72Q60 64 106 78Q100 88 60 82Q30 82 20 72Z" fill="${c}" stroke="${line}"/><path d="M60 33V72M43 38Q40 55 41 72M77 38Q80 55 79 72" fill="none" stroke="${st}" stroke-dasharray="2 2"/><circle cx="60" cy="32" r="3" fill="${c}" stroke="${line}"/><path d="M50 52h20v10H50z" fill="none" stroke="#e3c98f" stroke-width="1.2"/>`; break;
    case 'Tapabocas':
      body = `<path d="M26 46Q60 34 94 46V70Q60 92 26 70Z" fill="${c}" stroke="${line}"/><path d="M28 54Q60 44 92 54M28 62Q60 54 92 62" fill="none" stroke="${st}"/><path d="M26 48Q10 50 12 60Q14 70 26 68M94 48Q110 50 108 60Q106 70 94 68" fill="none" stroke="${line}" stroke-width="2"/>`; break;
    case 'Overol':
      body = `<path d="M38 18L50 14Q60 20 70 14L82 18L98 30L90 44L82 40L84 108H64L60 70L56 108H36L38 40L30 44L22 30Z" fill="${c}" stroke="${line}"/><path d="M60 20V70" stroke="${st}" stroke-dasharray="2 2"/>${refl.replace(/y="70"/, 'y="52"').replace(/y="80"/, 'y="88"')}<rect x="44" y="30" width="10" height="9" fill="none" stroke="${st}"/>`; break;
    default:
      body = `<path d="M38 22L50 16Q60 24 70 16L82 22L102 36L94 52L84 47V104H36V47L26 52L18 36Z" fill="${c}" stroke="${line}"/><path d="M50 16L60 30L70 16" fill="none" stroke="${line}"/><path d="M60 30V104" stroke="${st}" stroke-dasharray="2 3"/>${[40, 54, 68, 82, 96].map(y => `<circle cx="60" cy="${y}" r="1.4" fill="${st}"/>`).join('')}${p.categoria === 'Camisa industrial' || p.categoria === 'Dotación médica' ? `<rect x="42" y="38" width="12" height="11" fill="none" stroke="${st}"/>` : ''}${refl}`;
  }
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
}
const prodArt = (p, size) => (p.foto || p.imagen) ? `<img src="${esc(p.foto || p.imagen)}" alt="${esc(p.nombre)}" loading="lazy">` : garmentSVG(p, size);

function prodBadges(p) {
  const units = {};
  DB.data.facturas.filter(f => !f.anulada).forEach(f => f.items.forEach(i => units[i.productoId] = (units[i.productoId] || 0) + i.cant));
  const top = Object.entries(units).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  const s = Fin.stock(p), b = [];
  if (top.includes(p.id)) b.push(['Más vendido', 'gold']);
  if (s === 0) b.push(['Agotado', 'bad']); else if (s < p.stockMin) b.push(['Últimas unidades', 'warn']);
  return b;
}

/* ---------------- Catálogo visual ---------------- */
const Cat = { cat: 'Todas', q: '', cliente: false, pedido: [], orden: 'nombre' };
Views.catalogo = (v) => {
  let list = DB.data.productos.filter(p => (Cat.cat === 'Todas' || p.categoria === Cat.cat) && (!Cat.q || (p.nombre + p.sku + p.color + (p.coleccion || '')).toLowerCase().includes(Cat.q.toLowerCase())));
  list = [...list].sort((a, b) => Cat.orden === 'precio' ? a.precioDetal - b.precioDetal : Cat.orden === 'stock' ? Fin.stock(b) - Fin.stock(a) : a.nombre.localeCompare(b.nombre));
  const cols = [...new Set(DB.data.productos.map(p => p.coleccion || 'General'))];
  const nPed = Cat.pedido.reduce((s, i) => s + i.cant, 0);
  v.innerHTML = pageHead('Colección ' + new Date().getFullYear(), 'Catálogo',
    `<button class="btn ${Cat.cliente ? 'primary' : ''}" id="cat-cli">${icon('eye')} ${Cat.cliente ? 'Vista para cliente activa' : 'Vista para cliente'}</button>
     <button class="btn" id="cat-lista">${icon('facturas')} Lista de precios</button>
     <button class="btn" id="cat-ped">${icon('pos')} Pedido <span class="badge">${nPed}</span></button>`) +
    `<div class="toolbar"><input type="search" id="cat-q" placeholder="Buscar por prenda, color o colección…" value="${esc(Cat.q)}">
      <div class="seg">${['Todas', ...new Set(DB.data.productos.map(p => p.categoria))].map(c => `<button data-cat="${esc(c)}" class="${Cat.cat === c ? 'on' : ''}">${esc(c)}</button>`).join('')}</div>
      <select id="cat-ord" aria-label="Ordenar"><option value="nombre" ${Cat.orden === 'nombre' ? 'selected' : ''}>Ordenar por nombre</option><option value="precio" ${Cat.orden === 'precio' ? 'selected' : ''}>Por precio</option><option value="stock" ${Cat.orden === 'stock' ? 'selected' : ''}>Por disponibilidad</option></select></div>
    ${cols.map(col => { const items = list.filter(p => (p.coleccion || 'General') === col); return items.length ? `<div class="eyebrow" style="margin:22px 0 10px">${esc(col)} · ${items.length} referencias</div><div class="cat-grid">${items.map(p => `
      <button class="cat-card" data-p="${p.id}"><div class="cat-art" style="--sw:${swatch(p.color)}">${prodArt(p, 150)}<div class="cat-badges">${prodBadges(p).map(([t, k]) => pill(t, k)).join('')}</div></div>
        <div class="cat-info"><span class="eyebrow">${esc(p.categoria)} · ${esc(p.sku)}</span><span class="cat-name">${esc(p.nombre)}</span>
        <span class="muted" style="font-size:13px">${esc(p.color)} · Tallas ${TALLAS.filter(t => (p[t] || 0) > 0).join(', ') || 'sobre pedido'}</span>
        <div class="cat-prices"><span class="price">${money(p.precioDetal)}</span><span class="muted" style="font-size:12.5px">Por mayor ${money(p.precioMayor)} · desde ${p.minMayor} und</span></div></div></button>`).join('')}</div>` : ''; }).join('')}`;
  $('#cat-q', v).oninput = e => { Cat.q = e.target.value; render(); setTimeout(() => { const n = $('#cat-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); };
  $$('[data-cat]', v).forEach(b => b.onclick = () => { Cat.cat = b.dataset.cat; render(); });
  $('#cat-ord', v).onchange = e => { Cat.orden = e.target.value; render(); };
  $('#cat-cli', v).onclick = () => { Cat.cliente = !Cat.cliente; render(); toast(Cat.cliente ? 'Vista para cliente: se ocultan costos, márgenes y stock exacto' : 'Vista interna'); };
  $$('[data-p]', v).forEach(b => b.onclick = () => fichaProducto(DB.find('productos', b.dataset.p)));
  $('#cat-lista', v).onclick = listaPrecios;
  $('#cat-ped', v).onclick = verPedido;
};

function fichaProducto(p) {
  const kardex = DB.data.movimientos.filter(m => m.item.startsWith(p.nombre)).slice(0, 8);
  const margen = p.precioDetal ? Math.round((p.precioDetal - p.costo) / p.precioDetal * 100) : 0;
  const interno = !Cat.cliente;
  const msg = `${p.nombre} (${p.color})\nDetal: ${moneyTxt(p.precioDetal)}\nPor mayor: ${moneyTxt(p.precioMayor)} desde ${p.minMayor} unidades\nTallas: S, M, L, XL y sobre medida.\n${DB.data.config.empresa} · ${DB.data.config.tel}`;
  modal({
    title: p.nombre, wide: true,
    body: `<div class="ficha"><div class="cat-art big" style="--sw:${swatch(p.color)}">${prodArt(p, 260)}</div>
      <div class="grid" style="align-content:start;gap:14px"><div class="eyebrow">${esc(p.categoria)} · ${esc(p.coleccion || '')} · ${esc(p.sku)}</div>
        <div class="flex">${prodBadges(p).map(([t, k]) => pill(t, k)).join('')}</div>
        <div><span class="kpi-value gold">${money(p.precioDetal)}</span><div class="muted">Precio por mayor ${money(p.precioMayor)} desde ${p.minMayor} unidades</div></div>
        <div><div class="eyebrow" style="margin-bottom:6px">Disponibilidad por talla</div><div class="flex">${TALLAS.map(t => `<span class="talla ${(p[t] || 0) > 0 ? '' : 'off'}"><b>${t}</b><small>${interno ? (p[t] || 0) + ' und' : (p[t] || 0) > 0 ? 'Disponible' : 'Sobre pedido'}</small></span>`).join('')}</div></div>
        <div class="flex"><label class="field" style="width:110px">Talla<select id="fp-t">${TALLAS.map(t => `<option>${t}</option>`).join('')}</select></label><label class="field" style="width:110px">Cantidad<input id="fp-c" type="number" min="1" value="${p.minMayor}"></label><button class="btn primary" id="fp-add" style="align-self:end">${icon('plus')} Agregar al pedido</button></div>
        ${interno ? `<div class="grid g-3"><div class="mini"><span class="eyebrow">Costo</span><b>${money(p.costo)}</b></div><div class="mini"><span class="eyebrow">Margen</span><b>${margen}%</b></div><div class="mini"><span class="eyebrow">Tela por prenda</span><b>${p.metrosPorUnidad || 0} m</b></div></div>
        <div><div class="eyebrow" style="margin-bottom:4px">Kardex · últimos movimientos</div>${kardex.map(m => `<div class="list-item" style="padding:6px 0"><span class="grow">${fmtDate(m.fecha)} · ${esc(m.ref || '')}</span>${pill(m.tipo, m.tipo === 'Entrada' ? 'ok' : 'warn')}<b class="num">${m.cantidad}</b></div>`).join('') || '<p class="muted" style="margin:0">Sin movimientos registrados todavía.</p>'}</div>` : ''}
      </div></div>`,
    foot: `${interno ? `<label class="btn" for="fp-foto">${icon('camera')} ${p.foto ? 'Cambiar foto' : 'Subir foto'}</label><input id="fp-foto" type="file" accept="image/*" hidden>${p.foto ? '<button class="btn ghost" id="fp-nofoto">Quitar foto</button>' : ''}` : ''}
      <button class="btn" id="fp-copy">Copiar ficha para WhatsApp</button>`,
    onMount: (el, close) => {
      $('#fp-add', el).onclick = () => {
        const talla = $('#fp-t', el).value, cant = Math.max(1, +$('#fp-c', el).value);
        const ex = Cat.pedido.find(i => i.productoId === p.id && i.talla === talla);
        if (ex) ex.cant += cant; else Cat.pedido.push({ productoId: p.id, desc: p.nombre, talla, cant, precio: p.precioDetal });
        close(); render(); toast(`${cant} × ${p.nombre} (${talla}) en el pedido`);
      };
      $('#fp-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(msg); toast('Ficha copiada'); } catch { toast(msg); } };
      const f = $('#fp-foto', el);
      if (f) f.onchange = () => fotoProducto(f.files[0], p, () => { close(); render(); fichaProducto(p); });
      const nf = $('#fp-nofoto', el); if (nf) nf.onclick = () => { delete p.foto; DB.save(); close(); render(); };
    }
  });
}

/* La foto se reduce a 520 px para que quepa en el almacenamiento local. */
function fotoProducto(file, p, done) {
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, 520 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      p.foto = c.toDataURL('image/jpeg', 0.72);
      if (!DB.save()) { delete p.foto; return toast('No hay espacio para más fotos en este equipo.', true); }
      audit('Subió foto de ' + p.nombre); toast('Foto guardada'); done();
    };
    img.onerror = () => toast('No se pudo leer la imagen.', true);
    img.src = r.result;
  };
  r.readAsDataURL(file);
}

function listaPrecios() {
  const ps = DB.data.productos;
  const txt = `LISTA DE PRECIOS · ${DB.data.config.empresa}\n${fmtDate(todayISO())}\n\n` + ps.map(p => `${p.nombre} (${p.sku})\n  Detal ${moneyTxt(p.precioDetal)} · Mayor ${moneyTxt(p.precioMayor)} desde ${p.minMayor} und`).join('\n') + `\n\nPrecios + IVA. Confección sobre medida y bordado de logo.`;
  modal({
    title: 'Lista de precios', wide: true,
    body: `<div class="table-wrap"><table><thead><tr><th>Código</th><th>Prenda</th><th>Categoría</th><th class="num">Detal</th><th class="num">Por mayor</th><th class="num">Mínimo</th></tr></thead><tbody>${ps.map(p => `<tr><td>${esc(p.sku)}</td><td>${esc(p.nombre)}</td><td>${esc(p.categoria)}</td><td class="num">${moneyTxt(p.precioDetal)}</td><td class="num">${moneyTxt(p.precioMayor)}</td><td class="num">${p.minMayor} und</td></tr>`).join('')}</tbody></table></div>`,
    foot: `<button class="btn" id="lp-copy">Copiar para WhatsApp</button><button class="btn primary" id="lp-csv">${icon('download')} Exportar Excel</button>`,
    onMount: (el) => {
      $('#lp-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(txt); toast('Lista copiada'); } catch { toast('No se pudo copiar', true); } };
      $('#lp-csv', el).onclick = () => exportCSV('lista-precios', [{ k: 'sku', label: 'Código' }, { k: 'nombre', label: 'Prenda' }, { k: 'categoria', label: 'Categoría' }, { k: 'precioDetal', label: 'Detal' }, { k: 'precioMayor', label: 'Mayor' }, { k: 'minMayor', label: 'Mínimo mayor' }], ps);
    }
  });
}

function verPedido() {
  const cliSel = { id: '' };
  const draw = (el) => {
    const cli = DB.find('clientes', cliSel.id);
    Cat.pedido.forEach(i => i.precio = Fin.precioPara(DB.find('productos', i.productoId), i.cant, cli));
    const t = Fin.totals({ items: Cat.pedido, descuento: cli?.descuento || 0, ivaPct: DB.data.config.ivaPct });
    $('#pd-body', el).innerHTML = Cat.pedido.length ? Cat.pedido.map((i, k) => `<div class="cart-line"><div>${esc(i.desc)} · Talla ${esc(i.talla)}<br><small>${i.cant} × ${moneyTxt(i.precio)}</small></div><div class="right"><b>${moneyTxt(i.cant * i.precio)}</b><br><button class="btn sm ghost" data-rm="${k}">Quitar</button></div></div>`).join('') + `<div class="totals mt"><div><span>Subtotal</span><span>${moneyTxt(t.subtotal)}</span></div><div><span>Descuento</span><span>− ${moneyTxt(t.desc)}</span></div><div><span>IVA</span><span>${moneyTxt(t.iva)}</span></div><div class="grand"><span>Total</span><span>${moneyTxt(t.total)}</span></div></div>` : '<p class="muted">El pedido está vacío. Abra una prenda del catálogo y agréguela.</p>';
    $$('[data-rm]', el).forEach(b => b.onclick = () => { Cat.pedido.splice(+b.dataset.rm, 1); draw(el); render(); });
  };
  modal({
    title: 'Pedido desde el catálogo',
    body: `<label class="field">Cliente<select id="pd-cli"><option value="">Consumidor final</option>${DB.data.clientes.map(c => `<option value="${c.id}">${esc(c.nombre)} · ${esc(c.tipo)}</option>`).join('')}</select></label><div id="pd-body"></div>`,
    foot: `<button class="btn ghost" id="pd-clear">Vaciar</button><button class="btn" id="pd-pos">Llevar al salón de ventas</button><button class="btn primary" id="pd-cot">Crear cotización</button>`,
    onMount: (el, close) => {
      draw(el);
      $('#pd-cli', el).onchange = e => { cliSel.id = e.target.value; draw(el); };
      $('#pd-clear', el).onclick = () => { Cat.pedido = []; close(); render(); };
      $('#pd-pos', el).onclick = () => { if (!Cat.pedido.length) return toast('El pedido está vacío.', true); Cart.items.push(...structuredClone(Cat.pedido)); Cart.clienteId = cliSel.id; Cat.pedido = []; close(); go('pos'); };
      $('#pd-cot', el).onclick = () => {
        if (!Cat.pedido.length) return toast('El pedido está vacío.', true);
        const cli = DB.find('clientes', cliSel.id);
        const q = { id: uid('q'), num: DB.next('consecCot', 'COT'), fecha: todayISO(), clienteId: cliSel.id, items: structuredClone(Cat.pedido), descuento: cli?.descuento || 0, ivaPct: DB.data.config.ivaPct, estado: 'Borrador', vence: addDays(15), notas: 'Pedido armado desde el catálogo.' };
        DB.upsert('cotizaciones', q); audit('Cotización desde catálogo ' + q.num); Cat.pedido = []; close(); toast('Cotización ' + q.num + ' creada'); go('cotizaciones'); verDocumento(q, 'cotizacion');
      };
    }
  });
}

/* ---------------- Herramientas de inventario en Productos ---------------- */
const baseProductos = Views.productos;
Views.productos = (v) => {
  baseProductos(v);
  const actions = $('.page-head .actions', v);
  actions.insertAdjacentHTML('afterbegin', `<button class="btn" id="inv-reponer">${icon('produccion')} Reponer stock</button><button class="btn" id="inv-conteo">${icon('check')} Conteo físico</button><button class="btn" id="inv-precios">${icon('gastos')} Ajustar precios</button><button class="btn" id="inv-etq">${icon('print')} Etiquetas</button>`);
  $('#inv-reponer', v).onclick = reponerStock;
  $('#inv-conteo', v).onclick = conteoFisico;
  $('#inv-precios', v).onclick = ajustarPrecios;
  $('#inv-etq', v).onclick = etiquetas;
};

function reponerStock() {
  const bajos = DB.data.productos.filter(p => Fin.stock(p) < p.stockMin).map(p => ({ p, falta: p.stockMin * 2 - Fin.stock(p) }));
  modal({
    title: 'Reponer stock', wide: true,
    body: bajos.length ? `<p class="muted">Prendas por debajo del mínimo. Se sugiere producir hasta el doble del mínimo; puede cambiar la cantidad.</p><div class="table-wrap"><table><thead><tr><th>Prenda</th><th class="num">Stock</th><th class="num">Mínimo</th><th>Producir</th><th>Tela</th><th class="num">Metros</th></tr></thead><tbody>${bajos.map(({ p, falta }, i) => { const tela = DB.data.telas.find(t => t.color.toLowerCase() === (p.color || '').toLowerCase()) || DB.data.telas[0]; return `<tr><td>${esc(p.nombre)}</td><td class="num">${Fin.stock(p)}</td><td class="num">${p.stockMin}</td><td><input type="number" data-rp="${i}" value="${falta}" style="width:90px"></td><td><select data-rt="${i}">${DB.data.telas.map(t => `<option value="${t.id}" ${t.id === tela?.id ? 'selected' : ''}>${esc(t.nombre)} ${esc(t.color)} (${t.metros} m)</option>`).join('')}</select></td><td class="num">${(falta * (p.metrosPorUnidad || 1)).toFixed(1)} m</td></tr>`; }).join('')}</tbody></table></div>` : '<p>Todo el catálogo está por encima del mínimo.</p>',
    foot: bajos.length ? `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="rp-ok">Crear órdenes de producción</button>` : '',
    onMount: (el, close) => { const ok = $('#rp-ok', el); if (ok) ok.onclick = () => {
      bajos.forEach(({ p }, i) => { const cant = +$(`[data-rp="${i}"]`, el).value; if (cant > 0) { const telaId = $(`[data-rt="${i}"]`, el).value; const t = DB.find('telas', telaId); const m = +(cant * (p.metrosPorUnidad || 1)).toFixed(1); t.metros = Math.max(0, +(t.metros - m).toFixed(1)); DB.upsert('produccion', { id: uid('o'), num: DB.next('consecOP', 'OP'), productoId: p.id, cantidad: cant, telaId, estado: 'Corte', responsable: '', entrega: addDays(8), clienteId: '', avance: 15 }); DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: 'Salida', item: `${t.nombre} ${t.color}`, cantidad: m, ref: 'Reposición' }); } });
      DB.save(); audit('Creó órdenes de reposición'); close(); toast('Órdenes creadas'); go('produccion');
    }; }
  });
}

function conteoFisico() {
  const ps = DB.data.productos;
  modal({
    title: 'Conteo físico de inventario', wide: true,
    body: `<p class="muted">Escriba lo que contó en la bodega. El sistema muestra las diferencias y, al confirmar, ajusta el inventario y deja el registro.</p><div class="table-wrap"><table><thead><tr><th>Prenda</th>${TALLAS.map(t => `<th>${t}</th>`).join('')}<th class="num">Diferencia</th></tr></thead><tbody>${ps.map(p => `<tr><td>${esc(p.nombre)}</td>${TALLAS.map(t => `<td><input type="number" min="0" data-cf="${p.id}:${t}" value="${p[t] || 0}" style="width:72px"></td>`).join('')}<td class="num" data-dif="${p.id}">0</td></tr>`).join('')}</tbody></table></div>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="cf-ok">Ajustar inventario</button>`,
    onMount: (el, close) => {
      const calc = () => ps.forEach(p => { const d = TALLAS.reduce((s, t) => s + (+$(`[data-cf="${p.id}:${t}"]`, el).value - (p[t] || 0)), 0); const c = $(`[data-dif="${p.id}"]`, el); c.textContent = d > 0 ? '+' + d : d; c.style.color = d ? (d > 0 ? 'var(--ok)' : 'var(--bad)') : ''; });
      $$('[data-cf]', el).forEach(n => n.oninput = calc);
      $('#cf-ok', el).onclick = () => {
        let cambios = 0;
        ps.forEach(p => TALLAS.forEach(t => { const nv = +$(`[data-cf="${p.id}:${t}"]`, el).value; if (nv !== (p[t] || 0)) { DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: 'Ajuste', item: `${p.nombre} T${t}`, cantidad: nv - (p[t] || 0), ref: 'Conteo físico' }); p[t] = nv; cambios++; } }));
        DB.save(); audit(`Conteo físico: ${cambios} ajustes`); close(); render(); toast(cambios ? `${cambios} ajustes registrados` : 'El conteo coincide con el sistema');
      };
    }
  });
}

function ajustarPrecios() {
  modal({
    title: 'Ajustar precios en bloque',
    body: `<p class="muted">Útil cuando sube la tela. Se aplica a la categoría elegida y se redondea a la centena.</p><div class="form-grid"><label class="field">Categoría<select id="ap-c"><option>Todas</option>${[...new Set(DB.data.productos.map(p => p.categoria))].map(c => `<option>${esc(c)}</option>`).join('')}</select></label><label class="field">Porcentaje (use negativo para bajar)<input id="ap-p" type="number" value="5"></label><label class="field">Aplicar a<select id="ap-a"><option value="ambos">Detal y mayor</option><option value="precioDetal">Solo detal</option><option value="precioMayor">Solo mayor</option></select></label></div><p id="ap-prev" class="muted"></p>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ap-ok">Aplicar</button>`,
    onMount: (el, close) => {
      const sel = () => DB.data.productos.filter(p => $('#ap-c', el).value === 'Todas' || p.categoria === $('#ap-c', el).value);
      const prev = () => { $('#ap-prev', el).textContent = `Se actualizarán ${sel().length} prendas.`; };
      $$('select,input', el).forEach(n => n.oninput = prev); prev();
      $('#ap-ok', el).onclick = () => {
        const k = 1 + (+$('#ap-p', el).value) / 100, a = $('#ap-a', el).value;
        sel().forEach(p => (a === 'ambos' ? ['precioDetal', 'precioMayor'] : [a]).forEach(f => p[f] = Math.round(p[f] * k / 100) * 100));
        DB.save(); audit(`Ajustó precios ${$('#ap-p', el).value}% (${$('#ap-c', el).value})`); close(); render(); toast('Precios actualizados');
      };
    }
  });
}

function etiquetas() {
  const ps = DB.data.productos;
  modal({
    title: 'Etiquetas de precio', wide: true,
    body: `<p class="muted">Etiquetas para colgar en las prendas del salón.</p><div class="etq-grid">${ps.map(p => `<div class="etq">${logoSVG(26)}<div><div class="etq-n">${esc(p.nombre)}</div><div class="etq-s">${esc(p.sku)} · ${esc(p.color)}</div><div class="etq-p">${moneyTxt(p.precioDetal)}</div><div class="etq-s">Mayor ${moneyTxt(p.precioMayor)} × ${p.minMayor}+</div><div class="barcode">${barcodeSVG(p.sku)}</div></div></div>`).join('')}</div>`,
    foot: inFrame ? '' : `<button class="btn primary" id="etq-print">${icon('print')} Imprimir</button>`,
    onMount: (el) => { const b = $('#etq-print', el); if (b) b.onclick = () => window.print(); }
  });
}
/* Código de barras decorativo derivado del SKU (identifica visualmente, no es un estándar EAN). */
function barcodeSVG(code) {
  let x = 0; const bars = [];
  [...code].forEach(ch => { const n = ch.charCodeAt(0); for (let i = 0; i < 4; i++) { const w = ((n >> i) & 1) + 1; if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="22"/>`); x += w + 1; } });
  return `<svg viewBox="0 0 ${x} 22" preserveAspectRatio="none" width="100%" height="22" fill="#221b10">${bars.join('')}</svg>`;
}

/* ---------------- Finanzas del hogar ---------------- */
let hogarTab = 'resumen';
Views.hogar = (v) => {
  const D = DB.data, mesK = todayISO().slice(0, 7);
  const gastosMes = D.hogarGastos.filter(g => g.fecha.startsWith(mesK));
  const totalG = gastosMes.reduce((s, g) => s + g.valor, 0);
  const totalI = D.hogarIngresos.filter(i => i.fecha.startsWith(mesK)).reduce((s, i) => s + i.valor, 0);
  const pres = D.config.presupuestoHogar;
  const totalP = Object.values(pres).reduce((s, x) => s + x, 0);
  const porCat = {}; gastosMes.forEach(g => porCat[g.categoria] = (porCat[g.categoria] || 0) + g.valor);
  const fijosPend = D.hogarFijos.filter(f => f.pagado !== mesK).sort((a, b) => a.dia - b.dia);
  const hoyDia = new Date().getDate();
  // Empresa del mes: recaudo menos gastos y compras pagadas
  const recaudo = D.facturas.flatMap(f => f.abonos || []).filter(a => a.fecha.startsWith(mesK)).reduce((s, a) => s + a.valor, 0);
  const egresosEmp = D.gastos.filter(g => g.fecha.startsWith(mesK)).reduce((s, g) => s + g.valor, 0) + D.compras.filter(c => c.pagado && c.fecha.startsWith(mesK)).reduce((s, c) => s + c.metros * c.costoMetro, 0);
  const fmt = x => State.privado ? '•••' : moneyTxt(x);
  const tabs = [['resumen', 'Resumen'], ['gastos', 'Gastos de la casa'], ['presupuesto', 'Presupuesto'], ['fijos', 'Pagos fijos'], ['ahorro', 'Metas de ahorro'], ['ingresos', 'Ingresos']];
  let body = '';
  if (hogarTab === 'resumen') {
    body = `<div class="grid g-4"><div class="card kpi"><span class="eyebrow">Ingresos del hogar</span><span class="kpi-value" style="color:var(--ok)">${money(totalI)}</span><span class="kpi-foot">Este mes</span></div>
      <div class="card kpi"><span class="eyebrow">Gastos de la casa</span><span class="kpi-value">${money(totalG)}</span><span class="kpi-foot">${gastosMes.length} movimientos</span></div>
      <div class="card kpi"><span class="eyebrow">Disponible</span><span class="kpi-value" style="color:${totalI - totalG >= 0 ? 'var(--ok)' : 'var(--bad)'}">${money(totalI - totalG)}</span><span class="kpi-foot">Ingresos − gastos</span></div>
      <div class="card kpi"><span class="eyebrow">Presupuesto usado</span><span class="kpi-value num">${totalP ? Math.round(totalG / totalP * 100) : 0}%</span><span class="kpi-foot">de ${money(totalP)}</span><div class="progress"><span style="width:${Math.min(100, totalP ? totalG / totalP * 100 : 0)}%"></span></div></div></div>
      <div class="grid g-21 mt"><div class="card"><h3>Empresa y hogar, por separado <span class="eyebrow">Este mes</span></h3>
        <div class="grid g-2"><div class="mini"><span class="eyebrow">Empresa · entró</span><b>${money(recaudo)}</b></div><div class="mini"><span class="eyebrow">Empresa · salió</span><b>${money(egresosEmp)}</b></div><div class="mini"><span class="eyebrow">Utilidad de caja empresa</span><b class="gold">${money(recaudo - egresosEmp)}</b></div><div class="mini"><span class="eyebrow">Gasto de la casa</span><b>${money(totalG)}</b></div></div>
        <p class="muted mt" style="font-size:13.5px">Para no mezclar las cuentas, la plata pasa de la empresa a la casa como <b>retiro de utilidades</b>: queda como gasto en la empresa y como ingreso en el hogar.</p>
        <button class="btn primary" id="hg-retiro">${icon('hogar')} Retirar de la empresa para la casa</button></div>
        <div class="card"><h3>Próximos pagos <span class="eyebrow">${fijosPend.length} pendientes</span></h3><div class="list">${fijosPend.map(f => `<div class="list-item"><span class="pill ${f.dia < hoyDia ? 'bad' : f.dia - hoyDia <= 5 ? 'warn' : 'mute'} num">Día ${f.dia}</span><div class="grow">${esc(f.nombre)}<small>${esc(f.categoria)}</small></div><b>${money(f.valor)}</b><button class="btn sm" data-pagar="${f.id}">Pagar</button></div>`).join('') || '<p class="muted">Todo pagado este mes.</p>'}</div></div></div>
      <div class="grid g-2 mt"><div class="card"><h3>¿En qué se va la plata de la casa?</h3><div id="hg-cat"></div></div><div class="card"><h3>Metas de ahorro</h3>${D.hogarMetas.map(m => `<div style="margin-bottom:12px"><div class="flex" style="justify-content:space-between"><span>${esc(m.nombre)}</span><span class="muted num">${fmt(m.ahorrado)} de ${fmt(m.objetivo)}</span></div><div class="progress" style="height:8px;margin-top:6px"><span style="width:${Math.min(100, m.ahorrado / m.objetivo * 100)}%"></span></div></div>`).join('')}</div></div>`;
  } else if (hogarTab === 'gastos') {
    const cols = [{ k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha), sortv: r => r.fecha }, { k: 'categoria', label: 'Categoría' }, { k: 'desc', label: 'Descripción' }, { k: 'quien', label: 'Quién' }, { k: 'medio', label: 'Medio' }, { k: 'valor', label: 'Valor', num: true, html: r => money(r.valor) }];
    body = dataTable({ id: 'hgg', rows: D.hogarGastos, cols, actions: r => `<button class="btn sm" data-del="${r.id}">${icon('trash')}</button>` });
    setTimeout(() => dataTable.wire(v, 'hgg', cols, D.hogarGastos));
  } else if (hogarTab === 'presupuesto') {
    body = `<div class="card"><h3>Presupuesto mensual de la casa <span class="eyebrow">Toque un valor para cambiarlo</span></h3>${CAT_HOGAR.map(c => { const g = porCat[c] || 0, p = pres[c] || 0, pct = p ? g / p * 100 : (g ? 100 : 0); return `<div class="pres-row"><span>${c}</span><div class="progress" style="height:10px"><span style="width:${Math.min(100, pct)}%;background:${pct > 100 ? 'var(--bad)' : pct > 85 ? 'var(--warn)' : 'var(--gold)'}"></span></div><span class="num muted">${fmt(g)}</span><input type="number" data-pres="${esc(c)}" value="${p}" aria-label="Presupuesto ${esc(c)}"><span class="num" style="color:${pct > 100 ? 'var(--bad)' : 'var(--muted)'}">${Math.round(pct)}%</span></div>`; }).join('')}</div>`;
  } else if (hogarTab === 'fijos') {
    const cols = [{ k: 'nombre', label: 'Pago' }, { k: 'categoria', label: 'Categoría' }, { k: 'dia', label: 'Día del mes', num: true }, { k: 'valor', label: 'Valor', num: true, html: r => money(r.valor) }, { k: 'est', label: 'Este mes', html: r => r.pagado === mesK ? pill('Pagado', 'ok') : pill(r.dia < hoyDia ? 'Vencido' : 'Pendiente', r.dia < hoyDia ? 'bad' : 'warn'), text: r => r.pagado === mesK ? 'Pagado' : 'Pendiente' }];
    body = dataTable({ id: 'hgf', rows: D.hogarFijos, cols, actions: r => r.pagado === mesK ? '' : `<button class="btn sm primary" data-pagar="${r.id}">Pagar</button>` });
    setTimeout(() => dataTable.wire(v, 'hgf', cols, D.hogarFijos));
  } else if (hogarTab === 'ahorro') {
    body = `<div class="grid g-3">${D.hogarMetas.map(m => `<div class="card"><h3>${esc(m.nombre)}</h3><span class="kpi-value">${money(m.ahorrado)}</span><div class="muted">de ${money(m.objetivo)} · faltan ${money(Math.max(0, m.objetivo - m.ahorrado))}</div><div class="progress mt" style="height:8px"><span style="width:${Math.min(100, m.ahorrado / m.objetivo * 100)}%"></span></div><div class="flex mt"><input type="number" data-ab-meta="${m.id}" placeholder="Valor" style="flex:1"><button class="btn sm primary" data-meta="${m.id}">Ahorrar</button></div></div>`).join('')}</div>`;
  } else {
    const cols = [{ k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha), sortv: r => r.fecha }, { k: 'fuente', label: 'Fuente' }, { k: 'valor', label: 'Valor', num: true, html: r => money(r.valor) }];
    body = dataTable({ id: 'hgi', rows: D.hogarIngresos, cols });
    setTimeout(() => dataTable.wire(v, 'hgi', cols, D.hogarIngresos));
  }
  const btn = { gastos: 'Registrar gasto de la casa', fijos: 'Nuevo pago fijo', ahorro: 'Nueva meta', ingresos: 'Registrar ingreso' }[hogarTab] || 'Registrar gasto de la casa';
  v.innerHTML = pageHead('Solo visible para la administradora', 'Finanzas del hogar', `<button class="btn primary" id="hg-new">${icon('plus')} ${btn}</button>`) +
    `<div class="tabs">${tabs.map(([k, l]) => `<button data-htab="${k}" class="${hogarTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` + body;
  $$('[data-htab]', v).forEach(b => b.onclick = () => { hogarTab = b.dataset.htab; render(); });
  if ($('#hg-cat', v)) hbars($('#hg-cat', v), Object.entries(porCat).sort((a, b) => b[1] - a[1]), fmt);
  $$('[data-pagar]', v).forEach(b => b.onclick = () => { const f = DB.find('hogarFijos', b.dataset.pagar); f.pagado = mesK; DB.data.hogarGastos.unshift({ id: uid('hg'), fecha: todayISO(), categoria: f.categoria, desc: f.nombre, valor: f.valor, medio: 'Transferencia', quien: State.user.nombre }); DB.save(); audit('Pagó ' + f.nombre); render(); toast(f.nombre + ' pagado'); });
  $$('[data-del]', v).forEach(b => b.onclick = () => ask('¿Eliminar este gasto de la casa?', () => { DB.remove('hogarGastos', b.dataset.del); render(); }, 'Eliminar'));
  $$('[data-pres]', v).forEach(n => n.onchange = () => { pres[n.dataset.pres] = +n.value; DB.save(); render(); });
  $$('[data-meta]', v).forEach(b => b.onclick = () => { const m = DB.find('hogarMetas', b.dataset.meta); const val = +$(`[data-ab-meta="${m.id}"]`, v).value; if (!(val > 0)) return toast('Escriba un valor.', true); m.ahorrado += val; DB.save(); render(); toast(`Ahorro registrado en ${m.nombre}`); });
  const r = $('#hg-retiro', v);
  if (r) r.onclick = () => modal({
    title: 'Retiro de utilidades para la casa', body: `<p class="muted">Utilidad de caja de la empresa este mes: <b class="gold">${moneyTxt(recaudo - egresosEmp)}</b></p><label class="field">Valor a retirar<input id="rt-v" type="number" value="${Math.max(0, Math.round((recaudo - egresosEmp) * 0.3 / 1000) * 1000)}"></label>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="rt-ok">Registrar retiro</button>`,
    onMount: (el, close) => $('#rt-ok', el).onclick = () => { const val = +$('#rt-v', el).value; if (!(val > 0)) return toast('Escriba un valor.', true); D.gastos.unshift({ id: uid('g'), fecha: todayISO(), categoria: 'Retiro de socios', desc: 'Retiro de utilidades para el hogar', valor: val, medio: 'Transferencia' }); D.hogarIngresos.unshift({ id: uid('hi'), fecha: todayISO(), fuente: 'Retiro de utilidades de la empresa', valor: val }); DB.save(); audit('Retiro de utilidades ' + moneyTxt(val)); close(); render(); toast('Retiro registrado en empresa y hogar'); }
  });
  $('#hg-new', v).onclick = () => {
    if (hogarTab === 'fijos') return editRecord({ col: 'hogarFijos', title: 'Pago fijo', prefix: 'hf', fields: [{ k: 'nombre', label: 'Pago', req: true, full: true }, { k: 'categoria', label: 'Categoría', type: 'select', options: CAT_HOGAR }, { k: 'valor', label: 'Valor', type: 'number', req: true }, { k: 'dia', label: 'Día del mes', type: 'number', def: 1 }] });
    if (hogarTab === 'ahorro') return editRecord({ col: 'hogarMetas', title: 'Meta de ahorro', prefix: 'hm', fields: [{ k: 'nombre', label: 'Meta', req: true, full: true }, { k: 'objetivo', label: 'Valor objetivo', type: 'number', req: true }, { k: 'ahorrado', label: 'Ya ahorrado', type: 'number', def: 0 }] });
    if (hogarTab === 'ingresos') return editRecord({ col: 'hogarIngresos', title: 'Ingreso del hogar', prefix: 'hi', fields: [{ k: 'fecha', label: 'Fecha', type: 'date', def: todayISO() }, { k: 'fuente', label: 'Fuente', req: true }, { k: 'valor', label: 'Valor', type: 'number', req: true }] });
    editRecord({ col: 'hogarGastos', title: 'Gasto de la casa', prefix: 'hg', fields: [{ k: 'fecha', label: 'Fecha', type: 'date', def: todayISO() }, { k: 'categoria', label: 'Categoría', type: 'select', options: CAT_HOGAR }, { k: 'desc', label: 'Descripción', req: true, full: true }, { k: 'valor', label: 'Valor', type: 'number', req: true }, { k: 'medio', label: 'Medio', type: 'select', options: ['Efectivo', 'Transferencia', 'Tarjeta', 'Nequi'] }, { k: 'quien', label: 'Quién gastó', def: State.user.nombre }] });
  };
};

/* ---------------- Lista de funciones ampliada ---------------- */
Object.assign(FUNCIONES, {
  'Catálogo visual': ['Catálogo por colecciones', 'Ilustración de cada prenda en su color', 'Fotos reales de las prendas desde el celular', 'Reducción automática del tamaño de la foto', 'Sellos de más vendido, últimas unidades y agotado', 'Filtro por categoría', 'Búsqueda por prenda, color o colección', 'Orden por nombre, precio o disponibilidad', 'Ficha de prenda con tallas disponibles', 'Vista para cliente que oculta costos y stock', 'Pedido armado desde el catálogo', 'Pedido convertido en cotización', 'Pedido enviado al salón de ventas', 'Ficha lista para enviar por WhatsApp', 'Lista de precios detal y mayor', 'Lista de precios exportable a Excel'],
  'Inventario avanzado': ['Kardex de cada prenda', 'Sugerencia de reposición por stock mínimo', 'Órdenes de producción de reposición en bloque', 'Conteo físico con diferencias por talla', 'Ajuste automático tras el conteo', 'Ajuste de precios por porcentaje y categoría', 'Etiquetas de precio con logo y código', 'Costo y margen en la ficha de la prenda', 'Metros de tela por prenda'],
  'Finanzas del hogar': ['Módulo privado solo para la administradora', 'Gastos de la casa por categoría', 'Quién hizo cada gasto', 'Ingresos del hogar', 'Disponible del mes', 'Presupuesto mensual por categoría', 'Alerta visual al pasarse del presupuesto', 'Pagos fijos con día de vencimiento', 'Pago fijo registrado con un toque', 'Avisos de pagos vencidos y próximos', 'Metas de ahorro con avance', 'Abonos a las metas de ahorro', 'Comparativo empresa y hogar del mes', 'Retiro de utilidades de la empresa a la casa', 'Cuentas de la casa y la empresa sin mezclarse', 'Gráfica de en qué se va la plata de la casa']
});
