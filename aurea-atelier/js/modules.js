/* Módulos del sistema. Cada vista recibe el contenedor y pinta su contenido. */
const TALLAS = ['S', 'M', 'L', 'XL'];
const CATEGORIAS = ['Camisa industrial', 'Camisa de salir', 'Pantalón', 'Gorra', 'Tapabocas', 'Overol', 'Dotación médica', 'Chaqueta', 'Otro'];

/* ---------------- Cálculos financieros ---------------- */
const Fin = {
  cli(id) { return DB.find('clientes', id)?.nombre || 'Consumidor final'; },
  totals(doc) {
    const subtotal = doc.items.reduce((s, i) => s + i.cant * i.precio, 0);
    const desc = Math.round(subtotal * (doc.descuento || 0) / 100);
    const base = subtotal - desc;
    const iva = Math.round(base * (doc.ivaPct ?? 19) / 100);
    return { subtotal, desc, base, iva, total: base + iva };
  },
  pagado(f) { return (f.abonos || []).reduce((s, a) => s + a.valor, 0); },
  saldo(f) { return f.anulada ? 0 : Math.max(0, this.totals(f).total - this.pagado(f)); },
  estado(f) {
    if (f.anulada) return ['Anulada', 'mute'];
    const s = this.saldo(f);
    if (s <= 0) return ['Pagada', 'ok'];
    if (daysBetween(f.vence, todayISO()) > 0) return ['Vencida', 'bad'];
    return [this.pagado(f) > 0 ? 'Abonada' : 'Pendiente', 'warn'];
  },
  cartera() {
    return DB.data.facturas.filter(f => this.saldo(f) > 0).map(f => ({ ...f, saldoV: this.saldo(f), diasVencida: daysBetween(f.vence, todayISO()) }));
  },
  ventasMes(offset = 0) {
    const d = new Date(); d.setMonth(d.getMonth() - offset);
    const key = d.toISOString().slice(0, 7);
    return DB.data.facturas.filter(f => !f.anulada && f.fecha.startsWith(key)).reduce((s, f) => s + this.totals(f).total, 0);
  },
  stock(p) { return TALLAS.reduce((s, t) => s + (Number(p[t]) || 0), 0); },
  precioPara(p, cant, cliente) {
    const mayor = cant >= (p.minMayor || 12) || ['Mayorista', 'Empresa'].includes(cliente?.tipo);
    return mayor ? p.precioMayor : p.precioDetal;
  },
  recaudoHoy() {
    const h = todayISO();
    return DB.data.facturas.flatMap(f => f.abonos || []).filter(a => a.fecha === h).reduce((s, a) => s + a.valor, 0);
  }
};

function pageHead(eyebrow, title, actions = '') {
  return `<div class="page-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1></div><div class="actions">${actions}</div></div>`;
}
const prodIcon = (cat) => cat === 'Gorra' ? 'cap' : cat === 'Pantalón' ? 'pants' : cat === 'Tapabocas' ? 'mask' : 'shirt';
const swatch = (color) => {
  const map = { 'azul oscuro': '#22304a', 'naranja': '#c46a2b', 'blanco hueso': '#d9d0bd', 'beige': '#b9a27c', 'índigo': '#2c3a66', 'caqui': '#8c7a52', 'negro': '#1d1b19', 'azul': '#3a5a8c', 'azul rey': '#2a49a0', 'verde quirúrgico': '#3f7d6c' };
  return map[(color || '').toLowerCase()] || '#5a4c38';
};

/* ---------------- Panel ---------------- */
Views.panel = (v) => {
  const c = DB.data;
  const hoy = todayISO();
  const ventasHoy = c.facturas.filter(f => f.fecha === hoy && !f.anulada).reduce((s, f) => s + Fin.totals(f).total, 0);
  const mes = Fin.ventasMes(0), mesAnt = Fin.ventasMes(1);
  const cart = Fin.cartera();
  const porCobrar = cart.reduce((s, f) => s + f.saldoV, 0);
  const vencida = cart.filter(f => f.diasVencida > 0).reduce((s, f) => s + f.saldoV, 0);
  const metros = c.telas.reduce((s, t) => s + t.metros, 0);
  const valorTelas = c.telas.reduce((s, t) => s + t.metros * t.costoMetro, 0);
  const enProd = c.produccion.filter(o => o.estado !== 'Listo');
  const stockBajo = c.productos.filter(p => Fin.stock(p) < p.stockMin);
  const telasBajas = c.telas.filter(t => t.metros < t.minimo);
  const sinResp = c.mensajes.filter(m => !m.respondido);
  const agendaHoy = c.agenda.filter(a => a.fecha === hoy).sort((a, b) => a.hora.localeCompare(b.hora));
  const delta = mesAnt ? Math.round((mes - mesAnt) / mesAnt * 100) : 0;
  const greet = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  v.innerHTML = pageHead(new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }), `${greet}, ${State.user.nombre.split(' ')[0]}`,
    `<button class="btn" data-go2="cotizaciones">${icon('cotizaciones')} Nueva cotización</button><button class="btn primary" data-go2="pos">${icon('pos')} Vender en salón</button>`) +
  `<div class="grid g-4">
    <div class="card kpi"><span class="eyebrow">Ventas de hoy</span><span class="kpi-value">${money(ventasHoy)}</span><span class="kpi-foot">Recaudo del día ${money(Fin.recaudoHoy())}</span></div>
    <div class="card kpi"><span class="eyebrow">Ventas del mes</span><span class="kpi-value">${money(mes)}</span><span class="kpi-foot"><span class="${delta >= 0 ? 'trend-up' : 'trend-down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta)}%</span> frente al mes anterior</span></div>
    <div class="card kpi"><span class="eyebrow">Cartera por cobrar</span><span class="kpi-value">${money(porCobrar)}</span><span class="kpi-foot"><span class="trend-down">${money(vencida)}</span> vencida · ${cart.length} facturas</span></div>
    <div class="card kpi"><span class="eyebrow">Telas en bodega</span><span class="kpi-value num">${metros.toLocaleString('es-CO')} m</span><span class="kpi-foot">Valor ${money(valorTelas)} · ${telasBajas.length} por reponer</span></div>
  </div>
  <div class="grid g-21 mt">
    <div class="card"><h3>Ventas por mes <span class="eyebrow">Últimos 12 meses · COP con IVA</span></h3><div class="chart" id="chart-ventas"></div></div>
    <div class="card"><h3>Agenda de hoy <span class="eyebrow">${agendaHoy.length} pendientes</span></h3><div class="list">${agendaHoy.map(a => `<div class="list-item"><span class="pill gold num">${a.hora}</span><div class="grow">${esc(a.titulo)}<small>${esc(a.tipo)}</small></div></div>`).join('') || '<p class="muted">Sin citas hoy.</p>'}</div></div>
  </div>
  <div class="grid g-3 mt">
    <div class="card"><h3>En el taller <span class="eyebrow">${enProd.length} órdenes</span></h3><div class="list">${enProd.slice(0, 5).map(o => { const p = DB.find('productos', o.productoId); const dl = daysBetween(hoy, o.entrega); return `<div class="list-item"><div class="grow">${esc(o.num)} · ${esc(p?.nombre)}<small>${o.cantidad} und · ${esc(o.estado)} · entrega ${dl <= 0 ? '<b style="color:var(--bad)">hoy</b>' : 'en ' + dl + ' días'}</small><div class="progress mt" style="margin-top:6px"><span style="width:${o.avance}%"></span></div></div></div>`; }).join('')}</div></div>
    <div class="card"><h3>Alertas <span class="eyebrow">Reponer</span></h3><div class="list">
      ${telasBajas.map(t => `<div class="list-item">${pill('Tela', 'bad')}<div class="grow">${esc(t.nombre)} ${esc(t.color)}<small>${t.metros} m · mínimo ${t.minimo} m</small></div></div>`).join('')}
      ${stockBajo.slice(0, 4).map(p => `<div class="list-item">${pill('Stock', 'warn')}<div class="grow">${esc(p.nombre)}<small>${Fin.stock(p)} und · mínimo ${p.stockMin}</small></div></div>`).join('')}
      ${c.insumos.filter(i => i.cantidad < i.minimo).map(i => `<div class="list-item">${pill('Insumo', 'warn')}<div class="grow">${esc(i.nombre)}<small>${i.cantidad} ${esc(i.unidad)}</small></div></div>`).join('')}
    </div></div>
    <div class="card"><h3>Mensajes sin responder <span class="eyebrow">${sinResp.length}</span></h3><div class="list">${sinResp.slice(0, 5).map(m => `<div class="list-item">${pill(m.canal, 'gold')}<div class="grow">${esc(m.de)}<small>${esc(m.texto.slice(0, 60))}…</small></div></div>`).join('') || '<p class="muted">Todo respondido.</p>'}</div>
      <button class="btn sm mt" data-go2="mensajes">Responder ahora</button></div>
  </div>
  <div class="grid g-2 mt">
    <div class="card"><h3>Lo más vendido <span class="eyebrow">Unidades · histórico</span></h3><div id="top-prod"></div></div>
    <div class="card"><h3>Cartera por edad <span class="eyebrow">Saldo pendiente</span></h3><div id="aging"></div></div>
  </div>`;
  $$('[data-go2]', v).forEach(b => b.onclick = () => go(b.dataset.go2));

  // Ventas 12 meses (una serie, barras, tooltip por barra)
  const months = [...Array(12)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (11 - i)); return d; });
  const vals = months.map(d => { const k = d.toISOString().slice(0, 7); return c.facturas.filter(f => !f.anulada && f.fecha.startsWith(k)).reduce((s, f) => s + Fin.totals(f).total, 0); });
  barChart($('#chart-ventas', v), months.map(d => d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')), vals);

  const units = {};
  c.facturas.filter(f => !f.anulada).forEach(f => f.items.forEach(i => units[i.productoId] = (units[i.productoId] || 0) + i.cant));
  const top = Object.entries(units).map(([id, u]) => [DB.find('productos', id)?.nombre || '—', u]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  hbars($('#top-prod', v), top, x => x.toLocaleString('es-CO') + ' und');

  const buckets = [['Al día', 0], ['1–30 días', 0], ['31–60 días', 0], ['Más de 60', 0]];
  cart.forEach(f => { const d = f.diasVencida; buckets[d <= 0 ? 0 : d <= 30 ? 1 : d <= 60 ? 2 : 3][1] += f.saldoV; });
  hbars($('#aging', v), buckets, x => State.privado ? '•••' : moneyTxt(x));
};

function barChart(el, labels, values) {
  const W = 640, H = 240, L = 56, B = 26, T = 12, R = 8;
  const max = Math.max(...values, 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const ticks = [0, top / 4, top / 2, top * 3 / 4, top];
  const bw = (W - L - R) / values.length;
  const y = v => T + (H - T - B) * (1 - v / top);
  const short = n => n >= 1e6 ? (n / 1e6).toFixed(n % 1e6 ? 1 : 0) + ' M' : n >= 1e3 ? Math.round(n / 1e3) + ' mil' : n;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas por mes">
    ${ticks.map(t => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-label" x="${L - 8}" y="${y(t) + 4}" text-anchor="end">${State.privado ? '' : short(t)}</text>`).join('')}
    ${values.map((v, i) => { const x = L + i * bw + bw * 0.2, w = bw * 0.6, h = Math.max(0, H - B - y(v)); const r = Math.min(4, h);
      return `<rect class="hit" data-i="${i}" x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>
      <path class="bar ${i === values.length - 1 ? '' : 'dim'}" d="M${x},${H - B} V${H - B - h + r} Q${x},${H - B - h} ${x + r},${H - B - h} H${x + w - r} Q${x + w},${H - B - h} ${x + w},${H - B - h + r} V${H - B} Z"/>
      <text class="axis-label" x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`; }).join('')}
  </svg><div class="tooltip" hidden></div>`;
  const tip = $('.tooltip', el);
  $$('.hit', el).forEach(h => {
    h.onmouseenter = () => { const i = +h.dataset.i; tip.hidden = false; tip.innerHTML = `<b>${labels[i]}</b> · ${State.privado ? '•••' : moneyTxt(values[i])}`; };
    h.onmousemove = (e) => { const r = el.getBoundingClientRect(); tip.style.left = Math.min(e.clientX - r.left + 12, r.width - 160) + 'px'; tip.style.top = (e.clientY - r.top - 34) + 'px'; };
    h.onmouseleave = () => tip.hidden = true;
  });
}
function hbars(el, rows, fmt) {
  const max = Math.max(...rows.map(r => r[1]), 1);
  el.innerHTML = rows.map(([l, val]) => `<div class="hbar" title="${esc(l)}: ${esc(fmt(val))}"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l)}</span><div class="track"><div class="fill" style="width:${val / max * 100}%"></div></div><span class="v num">${esc(fmt(val))}</span></div>`).join('');
}

/* ---------------- Salón de ventas (POS) ---------------- */
const Cart = { items: [], clienteId: '', medio: 'Efectivo', descuento: 0, cat: 'Todas', q: '' };
Views.pos = (v) => {
  const prods = DB.data.productos.filter(p => (Cart.cat === 'Todas' || p.categoria === Cart.cat) && (!Cart.q || (p.nombre + p.sku).toLowerCase().includes(Cart.q.toLowerCase())));
  const cli = DB.find('clientes', Cart.clienteId);
  Cart.items.forEach(i => { const p = DB.find('productos', i.productoId); i.precio = Fin.precioPara(p, i.cant, cli); });
  const doc = { items: Cart.items, descuento: Cart.descuento, ivaPct: DB.data.config.ivaPct };
  const t = Fin.totals(doc);
  v.innerHTML = pageHead('Venta al detal y por mayor', 'Salón de ventas') + `<div class="pos">
    <div>
      <div class="toolbar"><input type="search" id="pos-q" placeholder="Buscar prenda o código…" value="${esc(Cart.q)}"><div class="seg">${['Todas', ...new Set(DB.data.productos.map(p => p.categoria))].map(c => `<button data-cat="${esc(c)}" class="${Cart.cat === c ? 'on' : ''}">${esc(c)}</button>`).join('')}</div></div>
      <div class="pos-grid">${prods.map(p => `<button class="prod-tile" data-add="${p.id}">${(p.foto || p.imagen) ? `<div class="prod-swatch photo"><img src="${esc(p.foto || p.imagen)}" alt="" loading="lazy"></div>` : `<div class="prod-swatch" style="background:linear-gradient(135deg, ${swatch(p.color)}, color-mix(in srgb, ${swatch(p.color)} 55%, #000))"><span style="color:#f3e6c8">${icon(prodIcon(p.categoria))}</span></div>`}<span class="name">${esc(p.nombre)}</span><span class="muted" style="font-size:12px">${esc(p.sku)} · ${Fin.stock(p)} en stock</span><span class="price">${money(p.precioDetal)}</span><span class="muted" style="font-size:12px">Mayor ${money(p.precioMayor)} desde ${p.minMayor} und</span></button>`).join('')}</div>
    </div>
    <aside class="card cart"><h3>Venta actual</h3>
      <label class="field">Cliente<select id="pos-cli"><option value="">Consumidor final</option>${DB.data.clientes.map(c => `<option value="${c.id}" ${c.id === Cart.clienteId ? 'selected' : ''}>${esc(c.nombre)} · ${esc(c.tipo)}</option>`).join('')}</select></label>
      <div>${Cart.items.map((i, idx) => `<div class="cart-line"><div>${esc(i.desc)}<small> · Talla ${esc(i.talla)}</small><br><small>${money(i.precio)} c/u ${i.precio < DB.find('productos', i.productoId).precioDetal ? pill('Precio mayor', 'gold') : ''}</small></div><div class="right"><b>${money(i.cant * i.precio)}</b><br><span class="qty"><button data-dec="${idx}" aria-label="Menos">−</button><span class="num">${i.cant}</span><button data-inc="${idx}" aria-label="Más">+</button></span></div></div>`).join('') || '<p class="muted">Toque una prenda para agregarla.</p>'}</div>
      <div class="form-grid"><label class="field">Descuento %<input id="pos-desc" type="number" min="0" max="50" value="${Cart.descuento}"></label>
      <label class="field">Medio de pago<select id="pos-medio">${['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Crédito (cartera)'].map(m => `<option ${m === Cart.medio ? 'selected' : ''}>${m}</option>`).join('')}</select></label></div>
      <div class="totals"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div><span>Descuento</span><span>− ${money(t.desc)}</span></div><div><span>IVA ${DB.data.config.ivaPct}%</span><span>${money(t.iva)}</span></div><div class="grand"><span>Total</span><span>${money(t.total)}</span></div></div>
      <div class="flex"><button class="btn ghost" id="pos-clear">Vaciar</button><button class="btn" id="pos-cot">Guardar como cotización</button><button class="btn primary" id="pos-pay" style="flex:1;justify-content:center">${icon('check')} Cobrar y facturar</button></div>
    </aside></div>`;
  $('#pos-q', v).oninput = e => { Cart.q = e.target.value; render(); setTimeout(() => { const n = $('#pos-q'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }); };
  $$('[data-cat]', v).forEach(b => b.onclick = () => { Cart.cat = b.dataset.cat; render(); });
  $$('[data-add]', v).forEach(b => b.onclick = () => pickSize(DB.find('productos', b.dataset.add)));
  $$('[data-inc]', v).forEach(b => b.onclick = () => { Cart.items[b.dataset.inc].cant++; render(); });
  $$('[data-dec]', v).forEach(b => b.onclick = () => { const i = Cart.items[b.dataset.dec]; i.cant--; if (i.cant <= 0) Cart.items.splice(b.dataset.dec, 1); render(); });
  $('#pos-cli', v).onchange = e => { Cart.clienteId = e.target.value; Cart.descuento = DB.find('clientes', Cart.clienteId)?.descuento || 0; render(); };
  $('#pos-desc', v).onchange = e => { Cart.descuento = Math.min(50, Math.max(0, +e.target.value)); render(); };
  $('#pos-medio', v).onchange = e => Cart.medio = e.target.value;
  $('#pos-clear', v).onclick = () => { Cart.items = []; render(); };
  $('#pos-cot', v).onclick = () => {
    if (!Cart.items.length) return toast('Agregue prendas primero.', true);
    const q = { id: uid('q'), num: DB.next('consecCot', 'COT'), fecha: todayISO(), clienteId: Cart.clienteId, items: structuredClone(Cart.items), descuento: Cart.descuento, ivaPct: DB.data.config.ivaPct, estado: 'Borrador', vence: addDays(15), notas: '' };
    DB.upsert('cotizaciones', q); audit('Creó cotización ' + q.num); Cart.items = []; toast('Cotización ' + q.num + ' guardada'); go('cotizaciones');
  };
  $('#pos-pay', v).onclick = () => {
    if (!Cart.items.length) return toast('Agregue prendas primero.', true);
    const credito = Cart.medio.startsWith('Crédito');
    if (credito && !Cart.clienteId) return toast('Para vender a crédito seleccione un cliente.', true);
    const f = crearFactura({ clienteId: Cart.clienteId, items: structuredClone(Cart.items), descuento: Cart.descuento, forma: credito ? 'Crédito' : 'Contado', plazo: credito ? 30 : 0, medio: Cart.medio });
    Cart.items = []; Cart.descuento = 0; render(); verDocumento(f, 'factura');
  };
};
const addDays = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
function pickSize(p) {
  const tallas = TALLAS.filter(t => Number(p[t]) > 0);
  modal({
    title: p.nombre, body: `<p class="muted">Elija la talla y cantidad. El precio mayorista se aplica desde ${p.minMayor} unidades o para clientes mayoristas.</p>
    <div class="form-grid"><label class="field">Talla<select id="ps-t">${(tallas.length ? tallas : TALLAS).map(t => `<option value="${t}">${t} · ${p[t] || 0} disponibles</option>`).join('')}</select></label><label class="field">Cantidad<input id="ps-c" type="number" min="1" value="1"></label></div>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ps-ok">Agregar</button>`,
    onMount: (el, close) => $('#ps-ok', el).onclick = () => {
      const talla = $('#ps-t', el).value, cant = Math.max(1, +$('#ps-c', el).value);
      const ex = Cart.items.find(i => i.productoId === p.id && i.talla === talla);
      if (ex) ex.cant += cant; else Cart.items.push({ productoId: p.id, desc: p.nombre, talla, cant, precio: p.precioDetal });
      if (cant > (p[talla] || 0)) toast(`Atención: solo hay ${p[talla] || 0} en talla ${talla}. Se puede programar producción.`, true);
      close(); render();
    }
  });
}

function crearFactura({ clienteId, items, descuento, forma, plazo, medio, cotId }) {
  const f = { id: uid('f'), num: DB.next('consecFactura', 'FE'), fecha: todayISO(), clienteId, items, descuento, ivaPct: DB.data.config.ivaPct, forma, plazo, vence: addDays(plazo), abonos: [], anulada: false, vendedor: State.user.usuario, cotId };
  if (forma === 'Contado') f.abonos.push({ fecha: todayISO(), valor: Fin.totals(f).total, medio: medio || 'Efectivo' });
  items.forEach(i => { const p = DB.find('productos', i.productoId); if (p) { p[i.talla] = Math.max(0, (p[i.talla] || 0) - i.cant); DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: 'Salida', item: p.nombre + ' T' + i.talla, cantidad: i.cant, ref: f.num }); } });
  DB.upsert('facturas', f); audit(`Facturó ${f.num} por ${moneyTxt(Fin.totals(f).total)}`);
  toast('Factura ' + f.num + ' creada');
  return f;
}

/* ---------------- Documento imprimible ---------------- */
function docHTML(d, kind) {
  const c = DB.data.config, cli = DB.find('clientes', d.clienteId), t = Fin.totals(d);
  const title = kind === 'factura' ? 'Factura de venta' : 'Cotización';
  return `<div class="doc" id="doc-print">
    <div class="doc-head">${logoLockup(52).replace('logo-lockup', 'logo-lockup')}<div><div class="doc-title">${title}</div><div class="right"><b>${esc(d.num)}</b><br>Fecha ${fmtDate(d.fecha)}<br>${kind === 'factura' ? 'Vence ' + fmtDate(d.vence) : 'Válida hasta ' + fmtDate(d.vence)}</div></div></div>
    <div class="doc-meta"><div><b>${esc(c.empresa)}</b><br>NIT ${esc(c.nit)}<br>${esc(c.direccion)}, ${esc(c.ciudad)}<br>${esc(c.tel)} · ${esc(c.email)}</div>
    <div><b>Cliente</b><br>${esc(cli?.nombre || 'Consumidor final')}<br>${cli ? 'Doc. ' + esc(cli.doc) + '<br>' + esc(cli.ciudad) + ' · ' + esc(cli.tel) : ''}${kind === 'factura' ? '<br>Forma de pago: ' + esc(d.forma) + (d.plazo ? ' a ' + d.plazo + ' días' : '') : ''}</div></div>
    <table><thead><tr><th>Descripción</th><th>Talla</th><th class="num">Cant.</th><th class="num">Valor unit.</th><th class="num">Total</th></tr></thead>
    <tbody>${d.items.map(i => `<tr><td>${esc(i.desc)}</td><td>${esc(i.talla)}</td><td class="num">${i.cant}</td><td class="num">${moneyTxt(i.precio)}</td><td class="num">${moneyTxt(i.cant * i.precio)}</td></tr>`).join('')}</tbody></table>
    <div class="doc-total"><div><span>Subtotal</span><span>${moneyTxt(t.subtotal)}</span></div>${t.desc ? `<div><span>Descuento ${d.descuento}%</span><span>− ${moneyTxt(t.desc)}</span></div>` : ''}<div><span>IVA ${d.ivaPct}%</span><span>${moneyTxt(t.iva)}</span></div><div class="grand"><span>Total</span><span>${moneyTxt(t.total)}</span></div>
    ${kind === 'factura' ? `<div><span>Pagado</span><span>${moneyTxt(Fin.pagado(d))}</span></div><div><b>Saldo</b><b>${moneyTxt(Fin.saldo(d))}</b></div>` : ''}</div>
    ${d.notas ? `<p><b>Notas:</b> ${esc(d.notas)}</p>` : ''}
    <div class="foot">${kind === 'factura' ? esc(c.resolucion) + '. ' : 'Precios en pesos colombianos. Tiempo de confección según cantidad. '}Gracias por vestir con ${esc(c.empresa)}.</div></div>`;
}
function verDocumento(d, kind) {
  const cli = DB.find('clientes', d.clienteId);
  const t = Fin.totals(d);
  const msg = kind === 'factura'
    ? `Hola ${cli?.nombre || ''}, le compartimos la factura ${d.num} de ${DB.data.config.empresa} por ${moneyTxt(t.total)}. Saldo: ${moneyTxt(Fin.saldo(d))}. ¡Gracias por su compra!`
    : `Hola ${cli?.nombre || ''}, le compartimos la cotización ${d.num} de ${DB.data.config.empresa} por ${moneyTxt(t.total)}, válida hasta ${fmtDate(d.vence)}. Quedamos atentos.`;
  modal({
    title: (kind === 'factura' ? 'Factura ' : 'Cotización ') + d.num, wide: true, body: docHTML(d, kind),
    foot: `${cli?.tel ? `<a class="btn" href="${waLink(cli.tel, msg)}" target="_blank" rel="noopener">${icon('send')} Enviar por WhatsApp</a>` : ''}
      <button class="btn" id="doc-copy">Copiar mensaje</button>
      ${inFrame ? '' : `<button class="btn primary" id="doc-print-btn">${icon('print')} Imprimir / PDF</button>`}`,
    onMount: (el) => {
      $('#doc-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(msg); toast('Mensaje copiado'); } catch { toast(msg); } };
      const pb = $('#doc-print-btn', el); if (pb) pb.onclick = () => window.print();
    }
  });
}

/* ---------------- Editor de cotización / factura ---------------- */
function docEditor(kind, base) {
  const d = base ? structuredClone(base) : { items: [], descuento: 0, clienteId: '', forma: 'Contado', plazo: 0, notas: '', ivaPct: DB.data.config.ivaPct };
  const draw = (el) => {
    const t = Fin.totals(d);
    $('#de-lines', el).innerHTML = d.items.map((i, idx) => `<tr>
      <td><select data-f="productoId" data-i="${idx}">${DB.data.productos.map(p => `<option value="${p.id}" ${p.id === i.productoId ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></td>
      <td><select data-f="talla" data-i="${idx}">${TALLAS.map(x => `<option ${x === i.talla ? 'selected' : ''}>${x}</option>`).join('')}</select></td>
      <td><input data-f="cant" data-i="${idx}" type="number" min="1" value="${i.cant}" style="width:80px"></td>
      <td><input data-f="precio" data-i="${idx}" type="number" min="0" value="${i.precio}" style="width:120px"></td>
      <td class="num">${moneyTxt(i.cant * i.precio)}</td><td><button class="icon-btn" data-del="${idx}" aria-label="Quitar">${icon('trash')}</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Agregue una línea.</td></tr>';
    $('#de-tot', el).innerHTML = `Subtotal ${moneyTxt(t.subtotal)} · Descuento ${moneyTxt(t.desc)} · IVA ${moneyTxt(t.iva)} · <b class="gold" style="font-family:var(--display);font-size:22px">Total ${moneyTxt(t.total)}</b>`;
    $$('[data-f]', el).forEach(n => n.onchange = () => {
      const it = d.items[n.dataset.i]; const f = n.dataset.f;
      it[f] = ['cant', 'precio'].includes(f) ? +n.value : n.value;
      const p = DB.find('productos', it.productoId);
      if (f === 'productoId') it.desc = p.nombre;
      if (f !== 'precio') it.precio = Fin.precioPara(p, it.cant, DB.find('clientes', d.clienteId));
      draw(el);
    });
    $$('[data-del]', el).forEach(b => b.onclick = () => { d.items.splice(b.dataset.del, 1); draw(el); });
  };
  modal({
    title: (base ? 'Editar ' : 'Nueva ') + (kind === 'factura' ? 'factura' : 'cotización'), wide: true,
    body: `<div class="form-grid">
      <label class="field">Cliente<select id="de-cli"><option value="">Consumidor final</option>${DB.data.clientes.map(c => `<option value="${c.id}" ${c.id === d.clienteId ? 'selected' : ''}>${esc(c.nombre)} · ${esc(c.tipo)}</option>`).join('')}</select></label>
      <label class="field">Descuento %<input id="de-desc" type="number" min="0" max="50" value="${d.descuento}"></label>
      ${kind === 'factura' ? `<label class="field">Forma de pago<select id="de-forma"><option ${d.forma === 'Contado' ? 'selected' : ''}>Contado</option><option ${d.forma === 'Crédito' ? 'selected' : ''}>Crédito</option></select></label><label class="field">Plazo (días)<select id="de-plazo">${[0, 15, 30, 45, 60, 90].map(x => `<option ${x == d.plazo ? 'selected' : ''}>${x}</option>`).join('')}</select></label>` : `<label class="field">Válida (días)<input id="de-val" type="number" value="15"></label><label class="field">Estado<select id="de-est">${['Borrador', 'Enviada', 'Aprobada', 'Rechazada'].map(x => `<option ${x === d.estado ? 'selected' : ''}>${x}</option>`).join('')}</select></label>`}
      <label class="field full">Notas (bordado, colores, tiempos)<textarea id="de-notas" rows="2">${esc(d.notas || '')}</textarea></label></div>
      <div class="table-wrap"><table><thead><tr><th>Prenda</th><th>Talla</th><th>Cant.</th><th>Precio</th><th class="num">Total</th><th></th></tr></thead><tbody id="de-lines"></tbody></table></div>
      <div class="flex"><button class="btn sm" id="de-add">${icon('plus')} Agregar línea</button><div style="margin-left:auto" id="de-tot"></div></div>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="de-save">${icon('check')} Guardar</button>`,
    onMount: (el, close) => {
      draw(el);
      $('#de-add', el).onclick = () => { const p = DB.data.productos[0]; d.items.push({ productoId: p.id, desc: p.nombre, talla: 'M', cant: 1, precio: Fin.precioPara(p, 1, DB.find('clientes', d.clienteId)) }); draw(el); };
      $('#de-cli', el).onchange = e => { d.clienteId = e.target.value; const c = DB.find('clientes', d.clienteId); d.descuento = c?.descuento || 0; $('#de-desc', el).value = d.descuento; d.items.forEach(i => i.precio = Fin.precioPara(DB.find('productos', i.productoId), i.cant, c)); draw(el); };
      $('#de-desc', el).onchange = e => { d.descuento = +e.target.value; draw(el); };
      $('#de-save', el).onclick = () => {
        if (!d.items.length) return toast('Agregue al menos una línea.', true);
        d.notas = $('#de-notas', el).value;
        if (kind === 'factura') {
          const forma = $('#de-forma', el).value, plazo = +$('#de-plazo', el).value;
          if (base) { Object.assign(base, d, { forma, plazo, vence: addDays(plazo) }); DB.save(); audit('Editó factura ' + base.num); close(); render(); }
          else { if (forma === 'Crédito' && !d.clienteId) return toast('Seleccione el cliente para crédito.', true); const f = crearFactura({ ...d, forma, plazo }); close(); render(); verDocumento(f, 'factura'); }
        } else {
          d.estado = $('#de-est', el).value; d.vence = d.vence && base ? d.vence : addDays(+$('#de-val', el).value || 15);
          if (!base) { d.id = uid('q'); d.num = DB.next('consecCot', 'COT'); d.fecha = todayISO(); }
          DB.upsert('cotizaciones', d); audit((base ? 'Editó' : 'Creó') + ' cotización ' + d.num); close(); render(); toast('Cotización ' + d.num + ' guardada');
        }
      };
    }
  });
}

/* ---------------- Cotizaciones ---------------- */
Views.cotizaciones = (v) => {
  const rows = DB.data.cotizaciones;
  const kind = { Borrador: 'mute', Enviada: 'warn', Aprobada: 'ok', Rechazada: 'bad', Facturada: 'gold' };
  const cols = [
    { k: 'num', label: 'Número' }, { k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha), sortv: r => r.fecha },
    { k: 'cli', label: 'Cliente', text: r => Fin.cli(r.clienteId) },
    { k: 'tot', label: 'Total', num: true, html: r => money(Fin.totals(r).total), sortv: r => Fin.totals(r).total, csv: r => Fin.totals(r).total },
    { k: 'estado', label: 'Estado', html: r => pill(r.estado, kind[r.estado]), text: r => r.estado },
    { k: 'vence', label: 'Vigencia', text: r => fmtDate(r.vence), sortv: r => r.vence }
  ];
  const sum = s => rows.filter(r => r.estado === s).reduce((a, r) => a + Fin.totals(r).total, 0);
  v.innerHTML = pageHead('Comercial', 'Cotizaciones', `<button class="btn primary" id="new-q">${icon('plus')} Nueva cotización</button>`) +
    `<div class="grid g-4" style="margin-bottom:16px">${['Borrador', 'Enviada', 'Aprobada', 'Rechazada'].map(s => `<div class="card kpi"><span class="eyebrow">${s}s</span><span class="kpi-value">${money(sum(s))}</span><span class="kpi-foot">${rows.filter(r => r.estado === s).length} cotizaciones</span></div>`).join('')}</div>` +
    dataTable({ id: 'cot', rows, cols, actions: r => `<button class="btn sm" data-view="${r.id}">Ver</button><button class="btn sm" data-edit="${r.id}">${icon('edit')}</button>${r.estado !== 'Facturada' ? `<button class="btn sm primary" data-fact="${r.id}">Facturar</button>` : ''}<button class="btn sm" data-op="${r.id}">Producir</button>` });
  dataTable.wire(v, 'cot', cols, rows);
  $('#new-q', v).onclick = () => docEditor('cotizacion');
  $$('[data-view]', v).forEach(b => b.onclick = () => verDocumento(DB.find('cotizaciones', b.dataset.view), 'cotizacion'));
  $$('[data-edit]', v).forEach(b => b.onclick = () => docEditor('cotizacion', DB.find('cotizaciones', b.dataset.edit)));
  $$('[data-fact]', v).forEach(b => b.onclick = () => {
    const q = DB.find('cotizaciones', b.dataset.fact);
    ask(`¿Convertir ${q.num} en factura a crédito de 30 días? Se descontará el inventario.`, () => {
      const f = crearFactura({ clienteId: q.clienteId, items: structuredClone(q.items), descuento: q.descuento, forma: q.clienteId ? 'Crédito' : 'Contado', plazo: q.clienteId ? 30 : 0, cotId: q.id, notas: q.notas });
      q.estado = 'Facturada'; DB.save(); render(); verDocumento(f, 'factura');
    }, 'Facturar');
  });
  $$('[data-op]', v).forEach(b => b.onclick = () => {
    const q = DB.find('cotizaciones', b.dataset.op);
    q.items.forEach(i => DB.upsert('produccion', { id: uid('o'), num: DB.next('consecOP', 'OP'), productoId: i.productoId, cantidad: i.cant, telaId: DB.data.telas[0]?.id, estado: 'Corte', responsable: '', entrega: addDays(10), clienteId: q.clienteId, avance: 0 }));
    audit('Generó órdenes de producción desde ' + q.num); toast('Órdenes de producción creadas'); go('produccion');
  });
};

/* ---------------- Facturas ---------------- */
Views.facturas = (v) => {
  const rows = DB.data.facturas;
  const cols = [
    { k: 'num', label: 'Factura' }, { k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha), sortv: r => r.fecha },
    { k: 'cli', label: 'Cliente', text: r => Fin.cli(r.clienteId) }, { k: 'forma', label: 'Pago', text: r => r.forma + (r.plazo ? ` ${r.plazo} d` : '') },
    { k: 'tot', label: 'Total', num: true, html: r => money(Fin.totals(r).total), sortv: r => Fin.totals(r).total, csv: r => Fin.totals(r).total },
    { k: 'saldo', label: 'Saldo', num: true, html: r => money(Fin.saldo(r)), sortv: r => Fin.saldo(r), csv: r => Fin.saldo(r) },
    { k: 'est', label: 'Estado', html: r => { const [s, k] = Fin.estado(r); return pill(s, k); }, text: r => Fin.estado(r)[0] }
  ];
  const mes = Fin.ventasMes(0);
  const ivaMes = rows.filter(f => !f.anulada && f.fecha.startsWith(todayISO().slice(0, 7))).reduce((s, f) => s + Fin.totals(f).iva, 0);
  v.innerHTML = pageHead('Comercial', 'Facturas', `<button class="btn primary" id="new-f">${icon('plus')} Nueva factura</button>`) +
    `<div class="grid g-3" style="margin-bottom:16px"><div class="card kpi"><span class="eyebrow">Facturado este mes</span><span class="kpi-value">${money(mes)}</span></div><div class="card kpi"><span class="eyebrow">IVA generado del mes</span><span class="kpi-value">${money(ivaMes)}</span></div><div class="card kpi"><span class="eyebrow">Facturas emitidas</span><span class="kpi-value num">${rows.length}</span><span class="kpi-foot">Próxima: FE-${DB.data.config.consecFactura}</span></div></div>` +
    dataTable({ id: 'fac', rows, cols, actions: r => `<button class="btn sm" data-view="${r.id}">Ver</button>${Fin.saldo(r) > 0 ? `<button class="btn sm primary" data-abono="${r.id}">Abonar</button>` : ''}${!r.anulada && State.user.rol === 'admin' ? `<button class="btn sm danger" data-anular="${r.id}">Anular</button>` : ''}` });
  dataTable.wire(v, 'fac', cols, rows);
  $('#new-f', v).onclick = () => docEditor('factura');
  $$('[data-view]', v).forEach(b => b.onclick = () => verDocumento(DB.find('facturas', b.dataset.view), 'factura'));
  $$('[data-abono]', v).forEach(b => b.onclick = () => abonar(DB.find('facturas', b.dataset.abono)));
  $$('[data-anular]', v).forEach(b => b.onclick = () => { const f = DB.find('facturas', b.dataset.anular); ask(`¿Anular la factura ${f.num}? Las prendas vuelven al inventario.`, () => { f.anulada = true; f.items.forEach(i => { const p = DB.find('productos', i.productoId); if (p) p[i.talla] = (p[i.talla] || 0) + i.cant; }); DB.save(); audit('Anuló factura ' + f.num); render(); }, 'Anular'); });
};
function abonar(f) {
  modal({
    title: 'Registrar abono · ' + f.num,
    body: `<p>Cliente: <b>${esc(Fin.cli(f.clienteId))}</b> · Saldo actual <b class="gold">${moneyTxt(Fin.saldo(f))}</b></p>
      <div class="form-grid"><label class="field">Valor<input id="ab-v" type="number" value="${Fin.saldo(f)}"></label><label class="field">Medio<select id="ab-m">${['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Cheque'].map(m => `<option>${m}</option>`).join('')}</select></label></div>
      ${(f.abonos || []).length ? `<div class="list">${f.abonos.map(a => `<div class="list-item"><div class="grow">${fmtDate(a.fecha)} · ${esc(a.medio)}</div><b>${moneyTxt(a.valor)}</b></div>`).join('')}</div>` : ''}`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ab-ok">Registrar abono</button>`,
    onMount: (el, close) => $('#ab-ok', el).onclick = () => {
      const val = Math.min(+$('#ab-v', el).value, Fin.saldo(f));
      if (!(val > 0)) return toast('Ingrese un valor mayor a cero.', true);
      f.abonos.push({ fecha: todayISO(), valor: val, medio: $('#ab-m', el).value }); DB.save();
      audit(`Abono de ${moneyTxt(val)} a ${f.num}`); close(); render(); toast('Abono registrado. Nuevo saldo ' + moneyTxt(Fin.saldo(f)));
    }
  });
}

/* ---------------- Cartera ---------------- */
Views.cartera = (v) => {
  const rows = Fin.cartera();
  const total = rows.reduce((s, f) => s + f.saldoV, 0);
  const venc = rows.filter(f => f.diasVencida > 0);
  const porCli = {};
  rows.forEach(f => porCli[f.clienteId] = (porCli[f.clienteId] || 0) + f.saldoV);
  const cols = [
    { k: 'num', label: 'Factura' }, { k: 'cli', label: 'Cliente', text: r => Fin.cli(r.clienteId) },
    { k: 'fecha', label: 'Emitida', text: r => fmtDate(r.fecha), sortv: r => r.fecha }, { k: 'vence', label: 'Vence', text: r => fmtDate(r.vence), sortv: r => r.vence },
    { k: 'dias', label: 'Días', num: true, html: r => r.diasVencida > 0 ? `<b style="color:var(--bad)">${r.diasVencida} vencida</b>` : `<span class="muted">faltan ${-r.diasVencida}</span>`, sortv: r => r.diasVencida, csv: r => r.diasVencida },
    { k: 'saldoV', label: 'Saldo', num: true, html: r => money(r.saldoV), csv: r => r.saldoV }
  ];
  v.innerHTML = pageHead('Cuentas por cobrar', 'Cartera') + `<div class="grid g-3" style="margin-bottom:16px">
    <div class="card kpi"><span class="eyebrow">Total por cobrar</span><span class="kpi-value">${money(total)}</span><span class="kpi-foot">${rows.length} facturas abiertas</span></div>
    <div class="card kpi"><span class="eyebrow">Vencida</span><span class="kpi-value" style="color:var(--bad)">${money(venc.reduce((s, f) => s + f.saldoV, 0))}</span><span class="kpi-foot">${venc.length} facturas</span></div>
    <div class="card kpi"><span class="eyebrow">Clientes que deben</span><span class="kpi-value num">${Object.keys(porCli).length}</span><span class="kpi-foot">Mayor deudor: ${esc(Fin.cli(Object.entries(porCli).sort((a, b) => b[1] - a[1])[0]?.[0]))}</span></div></div>
    <div class="grid g-21"><div>${dataTable({ id: 'car', rows, cols, empty: 'Nadie debe. Excelente.', actions: r => { const c = DB.find('clientes', r.clienteId); const msg = `Hola ${c?.nombre || ''}, le recordamos amablemente que la factura ${r.num} de ${DB.data.config.empresa} tiene un saldo de ${moneyTxt(r.saldoV)}${r.diasVencida > 0 ? `, vencido hace ${r.diasVencida} días` : `, con vencimiento el ${fmtDate(r.vence)}`}. Quedamos atentos. ¡Gracias!`; return `${c?.tel ? `<a class="btn sm" href="${waLink(c.tel, msg)}" target="_blank" rel="noopener">${icon('send')} Recordar</a>` : ''}<button class="btn sm primary" data-abono="${r.id}">Abonar</button>`; } })}</div>
    <div class="card"><h3>Saldo por cliente</h3><div id="car-cli"></div><div class="sep mt"></div><p class="muted" style="font-size:13px">El botón <b>Recordar</b> abre WhatsApp con un mensaje de cobro cordial ya escrito.</p></div></div>`;
  dataTable.wire(v, 'car', cols, rows);
  hbars($('#car-cli', v), Object.entries(porCli).map(([id, s]) => [Fin.cli(id), s]).sort((a, b) => b[1] - a[1]), x => State.privado ? '•••' : moneyTxt(x));
  $$('[data-abono]', v).forEach(b => b.onclick = () => abonar(DB.find('facturas', b.dataset.abono)));
};

/* ---------------- Clientes ---------------- */
const F_CLIENTE = [
  { k: 'nombre', label: 'Nombre o razón social', req: true, full: true }, { k: 'tipo', label: 'Tipo', type: 'select', options: ['Detal', 'Mayorista', 'Empresa'] },
  { k: 'doc', label: 'Cédula / NIT' }, { k: 'tel', label: 'Celular / WhatsApp' }, { k: 'email', label: 'Correo', type: 'email' }, { k: 'ciudad', label: 'Ciudad', def: 'Neiva' },
  { k: 'cupo', label: 'Cupo de crédito', type: 'number', def: 0 }, { k: 'descuento', label: 'Descuento fijo %', type: 'number', def: 0 }, { k: 'notas', label: 'Notas, medidas y preferencias', type: 'textarea', full: true }
];
Views.clientes = (v) => {
  const rows = DB.data.clientes;
  const compras = id => DB.data.facturas.filter(f => f.clienteId === id && !f.anulada).reduce((s, f) => s + Fin.totals(f).total, 0);
  const deuda = id => Fin.cartera().filter(f => f.clienteId === id).reduce((s, f) => s + f.saldoV, 0);
  const cols = [
    { k: 'nombre', label: 'Cliente' }, { k: 'tipo', label: 'Tipo', html: r => pill(r.tipo, r.tipo === 'Detal' ? 'mute' : 'gold'), text: r => r.tipo },
    { k: 'tel', label: 'Celular' }, { k: 'ciudad', label: 'Ciudad' },
    { k: 'compras', label: 'Compras', num: true, html: r => money(compras(r.id)), sortv: r => compras(r.id), csv: r => compras(r.id) },
    { k: 'deuda', label: 'Debe', num: true, html: r => { const d = deuda(r.id); return d ? `<span style="color:var(--warn)">${money(d)}</span>` : '<span class="muted">—</span>'; }, sortv: r => deuda(r.id), csv: r => deuda(r.id) },
    { k: 'cupo', label: 'Cupo libre', num: true, html: r => r.cupo ? money(r.cupo - deuda(r.id)) : '<span class="muted">Contado</span>', sortv: r => r.cupo - deuda(r.id), csv: r => r.cupo - deuda(r.id) }
  ];
  v.innerHTML = pageHead('Comercial', 'Clientes', `<button class="btn primary" id="new-c">${icon('plus')} Nuevo cliente</button>`) +
    dataTable({ id: 'cli', rows, cols, actions: r => `<button class="btn sm" data-hist="${r.id}">Historial</button><button class="btn sm" data-edit="${r.id}">${icon('edit')}</button>${r.tel ? `<a class="btn sm" href="${waLink(r.tel, 'Hola ' + r.nombre + ', le saluda ' + DB.data.config.empresa + '.')}" target="_blank" rel="noopener">${icon('send')}</a>` : ''}` });
  dataTable.wire(v, 'cli', cols, rows);
  $('#new-c', v).onclick = () => editRecord({ col: 'clientes', title: 'Cliente', fields: F_CLIENTE, prefix: 'c' });
  $$('[data-edit]', v).forEach(b => b.onclick = () => editRecord({ col: 'clientes', title: 'Cliente', fields: F_CLIENTE, obj: DB.find('clientes', b.dataset.edit) }));
  $$('[data-hist]', v).forEach(b => b.onclick = () => {
    const c = DB.find('clientes', b.dataset.hist);
    const fs = DB.data.facturas.filter(f => f.clienteId === c.id), qs = DB.data.cotizaciones.filter(q => q.clienteId === c.id);
    modal({ title: c.nombre, wide: true, body: `<div class="grid g-3"><div class="card kpi"><span class="eyebrow">Compras</span><span class="kpi-value">${money(compras(c.id))}</span></div><div class="card kpi"><span class="eyebrow">Debe</span><span class="kpi-value">${money(deuda(c.id))}</span></div><div class="card kpi"><span class="eyebrow">Descuento</span><span class="kpi-value">${c.descuento}%</span></div></div>
      <p class="muted">${esc(c.notas || 'Sin notas.')}</p><h3>Facturas</h3><div class="list">${fs.map(f => `<div class="list-item"><div class="grow">${f.num} · ${fmtDate(f.fecha)}</div>${pill(...Fin.estado(f))}<b>${moneyTxt(Fin.totals(f).total)}</b></div>`).join('') || '<p class="muted">Sin facturas.</p>'}</div>
      <h3>Cotizaciones</h3><div class="list">${qs.map(q => `<div class="list-item"><div class="grow">${q.num} · ${fmtDate(q.fecha)}</div>${pill(q.estado, 'mute')}<b>${moneyTxt(Fin.totals(q).total)}</b></div>`).join('') || '<p class="muted">Sin cotizaciones.</p>'}</div>` });
  });
};

/* ---------------- Catálogo ---------------- */
const F_PRODUCTO = [
  { k: 'nombre', label: 'Nombre de la prenda', req: true, full: true }, { k: 'sku', label: 'Código (SKU)', req: true }, { k: 'categoria', label: 'Categoría', type: 'select', options: CATEGORIAS },
  { k: 'color', label: 'Color' }, { k: 'metrosPorUnidad', label: 'Metros de tela por prenda', type: 'number', def: 1.5 },
  { k: 'costo', label: 'Costo de fabricación', type: 'number' }, { k: 'precioDetal', label: 'Precio al detal', type: 'number', req: true },
  { k: 'precioMayor', label: 'Precio por mayor', type: 'number' }, { k: 'minMayor', label: 'Mínimo para precio mayor', type: 'number', def: 12 },
  { k: 'S', label: 'Stock talla S', type: 'number', def: 0 }, { k: 'M', label: 'Stock talla M', type: 'number', def: 0 }, { k: 'L', label: 'Stock talla L', type: 'number', def: 0 }, { k: 'XL', label: 'Stock talla XL', type: 'number', def: 0 },
  { k: 'stockMin', label: 'Stock mínimo (alerta)', type: 'number', def: 10 }
];
Views.productos = (v) => {
  const rows = DB.data.productos;
  const margen = p => p.precioDetal ? Math.round((p.precioDetal - p.costo) / p.precioDetal * 100) : 0;
  const cols = [
    { k: 'sku', label: 'Código' }, { k: 'nombre', label: 'Prenda' }, { k: 'categoria', label: 'Categoría' },
    { k: 'tallas', label: 'S · M · L · XL', html: r => `<span class="num">${TALLAS.map(t => r[t] || 0).join(' · ')}</span>`, text: r => TALLAS.map(t => r[t] || 0).join('/') },
    { k: 'stock', label: 'Total', num: true, html: r => Fin.stock(r) < r.stockMin ? `<b style="color:var(--warn)">${Fin.stock(r)}</b>` : Fin.stock(r), sortv: r => Fin.stock(r), csv: r => Fin.stock(r) },
    { k: 'precioDetal', label: 'Detal', num: true, html: r => money(r.precioDetal) }, { k: 'precioMayor', label: 'Mayor', num: true, html: r => money(r.precioMayor) },
    { k: 'margen', label: 'Margen', num: true, html: r => margen(r) + '%', sortv: margen, csv: margen }
  ];
  v.innerHTML = pageHead('Taller', 'Catálogo de prendas', `<button class="btn primary" id="new-p">${icon('plus')} Nueva prenda</button>`) +
    dataTable({ id: 'prod', rows, cols, actions: r => `<button class="btn sm" data-edit="${r.id}">${icon('edit')}</button><button class="btn sm" data-del="${r.id}">${icon('trash')}</button>` });
  dataTable.wire(v, 'prod', cols, rows);
  $('#new-p', v).onclick = () => editRecord({ col: 'productos', title: 'Prenda', fields: F_PRODUCTO, prefix: 'p' });
  $$('[data-edit]', v).forEach(b => b.onclick = () => editRecord({ col: 'productos', title: 'Prenda', fields: F_PRODUCTO, obj: DB.find('productos', b.dataset.edit) }));
  $$('[data-del]', v).forEach(b => b.onclick = () => ask('¿Eliminar esta prenda del catálogo?', () => { DB.remove('productos', b.dataset.del); audit('Eliminó prenda'); render(); }, 'Eliminar'));
};

/* ---------------- Inventario: telas e insumos ---------------- */
const F_TELA = [
  { k: 'nombre', label: 'Nombre de la tela', req: true }, { k: 'codigo', label: 'Código', req: true },
  { k: 'tipo', label: 'Tipo', type: 'select', options: ['Drill', 'Oxford', 'Antifluido', 'Lino', 'Jean', 'Gabardina', 'Algodón', 'Dacron', 'Lycra', 'Otro'] }, { k: 'color', label: 'Color' },
  { k: 'metros', label: 'Metros disponibles', type: 'number', req: true }, { k: 'costoMetro', label: 'Costo por metro', type: 'number' },
  { k: 'minimo', label: 'Mínimo (alerta)', type: 'number', def: 50 }, { k: 'ubicacion', label: 'Ubicación en bodega' },
  { k: 'proveedorId', label: 'Proveedor', type: 'select', options: () => [] }
];
const F_INSUMO = [{ k: 'nombre', label: 'Insumo', req: true, full: true }, { k: 'unidad', label: 'Unidad' }, { k: 'cantidad', label: 'Cantidad', type: 'number' }, { k: 'costo', label: 'Costo por unidad', type: 'number' }, { k: 'minimo', label: 'Mínimo', type: 'number' }];
let invTab = 'telas';
Views.inventario = (v) => {
  const telaFields = F_TELA.map(f => f.k === 'proveedorId' ? { ...f, options: DB.data.proveedores.map(p => [p.id, p.nombre]) } : f);
  const telas = DB.data.telas, ins = DB.data.insumos;
  const valorTelas = telas.reduce((s, t) => s + t.metros * t.costoMetro, 0);
  const valorProd = DB.data.productos.reduce((s, p) => s + Fin.stock(p) * p.costo, 0);
  const valorIns = ins.reduce((s, i) => s + i.cantidad * i.costo, 0);
  const tCols = [
    { k: 'codigo', label: 'Código' }, { k: 'nombre', label: 'Tela' }, { k: 'tipo', label: 'Tipo' }, { k: 'color', label: 'Color', html: r => `<span class="flex"><span class="dot" style="background:${swatch(r.color)}"></span>${esc(r.color)}</span>`, text: r => r.color },
    { k: 'metros', label: 'Metros', num: true, html: r => r.metros < r.minimo ? `<b style="color:var(--bad)">${r.metros} m</b>` : r.metros + ' m' },
    { k: 'rinde', label: 'Rinde aprox.', num: true, html: r => `~${Math.floor(r.metros / 1.5)} camisas`, sortv: r => r.metros },
    { k: 'costoMetro', label: '$/metro', num: true, html: r => money(r.costoMetro) }, { k: 'valor', label: 'Valor', num: true, html: r => money(r.metros * r.costoMetro), sortv: r => r.metros * r.costoMetro, csv: r => r.metros * r.costoMetro },
    { k: 'ubicacion', label: 'Ubicación' }
  ];
  const iCols = [{ k: 'nombre', label: 'Insumo' }, { k: 'unidad', label: 'Unidad' }, { k: 'cantidad', label: 'Cantidad', num: true, html: r => r.cantidad < r.minimo ? `<b style="color:var(--warn)">${r.cantidad}</b>` : r.cantidad }, { k: 'costo', label: 'Costo', num: true, html: r => money(r.costo) }, { k: 'minimo', label: 'Mínimo', num: true }];
  const mCols = [{ k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha) }, { k: 'tipo', label: 'Tipo', html: r => pill(r.tipo, r.tipo === 'Entrada' ? 'ok' : r.tipo === 'Salida' ? 'warn' : 'mute'), text: r => r.tipo }, { k: 'item', label: 'Ítem' }, { k: 'cantidad', label: 'Cantidad', num: true }, { k: 'ref', label: 'Referencia' }];
  v.innerHTML = pageHead('Taller', 'Inventario y telas', `<button class="btn" id="mov">${icon('inventario')} Entrada / salida</button><button class="btn primary" id="new-t">${icon('plus')} ${invTab === 'insumos' ? 'Nuevo insumo' : 'Nueva tela'}</button>`) +
    `<div class="grid g-3" style="margin-bottom:16px"><div class="card kpi"><span class="eyebrow">Valor en telas</span><span class="kpi-value">${money(valorTelas)}</span><span class="kpi-foot">${telas.reduce((s, t) => s + t.metros, 0)} metros en ${telas.length} referencias</span></div><div class="card kpi"><span class="eyebrow">Prendas terminadas</span><span class="kpi-value">${money(valorProd)}</span><span class="kpi-foot">${DB.data.productos.reduce((s, p) => s + Fin.stock(p), 0)} unidades a costo</span></div><div class="card kpi"><span class="eyebrow">Insumos</span><span class="kpi-value">${money(valorIns)}</span><span class="kpi-foot">Botones, hilos, reflectivos, cremalleras</span></div></div>
    <div class="tabs">${[['telas', 'Telas'], ['insumos', 'Insumos'], ['mov', 'Movimientos']].map(([k, l]) => `<button data-tab="${k}" class="${invTab === k ? 'on' : ''}">${l}</button>`).join('')}</div>` +
    (invTab === 'telas' ? dataTable({ id: 'tel', rows: telas, cols: tCols, actions: r => `<button class="btn sm" data-edit="${r.id}">${icon('edit')}</button>` })
      : invTab === 'insumos' ? dataTable({ id: 'ins', rows: ins, cols: iCols, actions: r => `<button class="btn sm" data-edit-i="${r.id}">${icon('edit')}</button>` })
      : dataTable({ id: 'mov', rows: DB.data.movimientos, cols: mCols, empty: 'Los movimientos aparecen al vender, comprar tela o producir.' }));
  if (invTab === 'telas') dataTable.wire(v, 'tel', tCols, telas); else if (invTab === 'insumos') dataTable.wire(v, 'ins', iCols, ins); else dataTable.wire(v, 'mov', mCols, DB.data.movimientos);
  $$('[data-tab]', v).forEach(b => b.onclick = () => { invTab = b.dataset.tab; render(); });
  $('#new-t', v).onclick = () => invTab === 'insumos' ? editRecord({ col: 'insumos', title: 'Insumo', fields: F_INSUMO, prefix: 'i' }) : editRecord({ col: 'telas', title: 'Tela', fields: telaFields, prefix: 't' });
  $$('[data-edit]', v).forEach(b => b.onclick = () => editRecord({ col: 'telas', title: 'Tela', fields: telaFields, obj: DB.find('telas', b.dataset.edit) }));
  $$('[data-edit-i]', v).forEach(b => b.onclick = () => editRecord({ col: 'insumos', title: 'Insumo', fields: F_INSUMO, obj: DB.find('insumos', b.dataset.editI) }));
  $('#mov', v).onclick = () => modal({
    title: 'Movimiento de inventario', body: `<div class="form-grid"><label class="field">Tipo<select id="mv-t"><option>Entrada</option><option>Salida</option><option>Ajuste</option></select></label>
      <label class="field">Ítem<select id="mv-i">${telas.map(t => `<option value="t:${t.id}">Tela · ${esc(t.nombre)} ${esc(t.color)}</option>`).join('')}${ins.map(i => `<option value="i:${i.id}">Insumo · ${esc(i.nombre)}</option>`).join('')}</select></label>
      <label class="field">Cantidad (metros o unidades)<input id="mv-c" type="number" value="10"></label><label class="field">Referencia / motivo<input id="mv-r" placeholder="Ej. OP-118, devolución, conteo"></label></div>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="mv-ok">Registrar</button>`,
    onMount: (el, close) => $('#mv-ok', el).onclick = () => {
      const [k, id] = $('#mv-i', el).value.split(':'); const t = $('#mv-t', el).value; const c = +$('#mv-c', el).value;
      const it = DB.find(k === 't' ? 'telas' : 'insumos', id); const field = k === 't' ? 'metros' : 'cantidad';
      it[field] = t === 'Entrada' ? it[field] + c : t === 'Salida' ? Math.max(0, it[field] - c) : c;
      DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: t, item: it.nombre + (it.color ? ' ' + it.color : ''), cantidad: c, ref: $('#mv-r', el).value });
      DB.save(); audit(`${t} de inventario: ${it.nombre} (${c})`); close(); render(); toast('Inventario actualizado');
    }
  });
};

/* ---------------- Producción ---------------- */
const ETAPAS = ['Corte', 'Confección', 'Bordado', 'Terminación', 'Listo'];
Views.produccion = (v) => {
  const ops = DB.data.produccion;
  v.innerHTML = pageHead('Taller', 'Producción', `<button class="btn primary" id="new-op">${icon('plus')} Nueva orden</button>`) +
    `<p class="muted" style="margin-top:-10px">Cada orden avanza por etapas. Al pasar a <b>Listo</b> las prendas entran al inventario y al crearla se descuenta la tela usada.</p>
    <div class="kanban">${ETAPAS.map(e => { const list = ops.filter(o => o.estado === e); return `<div class="col"><div class="col-head"><span class="eyebrow">${e}</span><span class="pill mute">${list.length}</span></div>
      ${list.map(o => { const p = DB.find('productos', o.productoId); const t = DB.find('telas', o.telaId); const dl = daysBetween(todayISO(), o.entrega); return `<div class="ticket"><div class="flex" style="justify-content:space-between"><b>${esc(o.num)}</b>${dl < 0 && e !== 'Listo' ? pill('Atrasada', 'bad') : dl <= 2 && e !== 'Listo' ? pill(dl <= 0 ? 'Hoy' : 'En ' + dl + ' d', 'warn') : ''}</div>
        <span class="t-title">${o.cantidad} × ${esc(p?.nombre)}</span><small>${esc(Fin.cli(o.clienteId))}</small><small>Tela: ${esc(t ? t.nombre + ' ' + t.color : '—')} · ${esc(o.responsable || 'Sin asignar')}</small><small>Entrega ${fmtDate(o.entrega)}</small>
        <div class="progress"><span style="width:${o.avance}%"></span></div>
        <div class="flex">${e !== 'Corte' ? `<button class="btn sm ghost" data-back="${o.id}">◀</button>` : ''}${e !== 'Listo' ? `<button class="btn sm" data-next="${o.id}">Avanzar ▶</button>` : `<span class="pill ok">Entregable</span>`}</div></div>`; }).join('')}</div>`; }).join('')}</div>`;
  const move = (id, dir) => {
    const o = DB.find('produccion', id); const i = ETAPAS.indexOf(o.estado) + dir; if (i < 0 || i >= ETAPAS.length) return;
    o.estado = ETAPAS[i]; o.avance = [15, 45, 65, 85, 100][i];
    if (o.estado === 'Listo' && dir > 0) { const p = DB.find('productos', o.productoId); if (p) { p.M = (p.M || 0) + o.cantidad; DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: 'Entrada', item: p.nombre + ' (producción)', cantidad: o.cantidad, ref: o.num }); } toast(`${o.num} terminada: ${o.cantidad} prendas al inventario`); }
    DB.save(); audit(`${o.num} pasó a ${o.estado}`); render();
  };
  $$('[data-next]', v).forEach(b => b.onclick = () => move(b.dataset.next, 1));
  $$('[data-back]', v).forEach(b => b.onclick = () => move(b.dataset.back, -1));
  $('#new-op', v).onclick = () => {
    const fields = [
      { k: 'productoId', label: 'Prenda', type: 'select', options: DB.data.productos.map(p => [p.id, p.nombre]), full: true },
      { k: 'cantidad', label: 'Cantidad', type: 'number', def: 24 }, { k: 'telaId', label: 'Tela', type: 'select', options: DB.data.telas.map(t => [t.id, `${t.nombre} ${t.color} (${t.metros} m)`]) },
      { k: 'clienteId', label: 'Cliente (opcional)', type: 'select', options: [['', 'Para inventario'], ...DB.data.clientes.map(c => [c.id, c.nombre])] },
      { k: 'responsable', label: 'Responsable', type: 'select', options: DB.data.empleados.map(e => e.nombre) }, { k: 'entrega', label: 'Fecha de entrega', type: 'date', def: addDays(10) }
    ];
    modal({
      title: 'Nueva orden de producción', body: formFields(fields) + '<p class="muted" id="op-calc"></p>',
      foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="op-ok">Crear orden</button>`,
      onMount: (el, close) => {
        const calc = () => { const p = DB.find('productos', $('[name=productoId]', el).value); const t = DB.find('telas', $('[name=telaId]', el).value); const m = +(p.metrosPorUnidad * +$('[name=cantidad]', el).value).toFixed(1); $('#op-calc', el).innerHTML = `Consumo estimado: <b>${m} m</b> de tela · costo tela ${moneyTxt(m * t.costoMetro)}${m > t.metros ? ' · <b style="color:var(--bad)">No alcanza la tela disponible</b>' : ''}`; };
        $$('select,input', el).forEach(n => n.addEventListener('change', calc)); calc();
        $('#op-ok', el).onclick = () => {
          const d = readForm(el, fields); const p = DB.find('productos', d.productoId); const t = DB.find('telas', d.telaId);
          const m = +(p.metrosPorUnidad * d.cantidad).toFixed(1); t.metros = Math.max(0, +(t.metros - m).toFixed(1));
          DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: 'Salida', item: `${t.nombre} ${t.color}`, cantidad: m, ref: 'Producción' });
          const o = { id: uid('o'), num: DB.next('consecOP', 'OP'), ...d, estado: 'Corte', avance: 15 };
          DB.upsert('produccion', o); audit('Creó ' + o.num); close(); render(); toast(`${o.num} creada · se descontaron ${m} m de tela`);
        };
      }
    });
  };
};

/* ---------------- Compras de tela ---------------- */
Views.compras = (v) => {
  const rows = DB.data.compras;
  const cols = [
    { k: 'num', label: 'Orden' }, { k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha), sortv: r => r.fecha },
    { k: 'prov', label: 'Proveedor', text: r => DB.find('proveedores', r.proveedorId)?.nombre || '—' },
    { k: 'tela', label: 'Tela', text: r => { const t = DB.find('telas', r.telaId); return t ? t.nombre + ' ' + t.color : '—'; } },
    { k: 'metros', label: 'Metros', num: true }, { k: 'total', label: 'Total', num: true, html: r => money(r.metros * r.costoMetro), sortv: r => r.metros * r.costoMetro, csv: r => r.metros * r.costoMetro },
    { k: 'pagado', label: 'Pago', html: r => r.pagado ? pill('Pagada', 'ok') : pill('Por pagar', 'warn'), text: r => r.pagado ? 'Pagada' : 'Por pagar' }
  ];
  const porPagar = rows.filter(r => !r.pagado).reduce((s, r) => s + r.metros * r.costoMetro, 0);
  v.innerHTML = pageHead('Taller', 'Compras de tela', `<button class="btn primary" id="new-oc">${icon('plus')} Registrar compra</button>`) +
    `<div class="grid g-3" style="margin-bottom:16px"><div class="card kpi"><span class="eyebrow">Comprado este mes</span><span class="kpi-value">${money(rows.filter(r => r.fecha.startsWith(todayISO().slice(0, 7))).reduce((s, r) => s + r.metros * r.costoMetro, 0))}</span></div><div class="card kpi"><span class="eyebrow">Cuentas por pagar</span><span class="kpi-value" style="color:var(--warn)">${money(porPagar)}</span></div><div class="card kpi"><span class="eyebrow">Metros comprados</span><span class="kpi-value num">${rows.reduce((s, r) => s + r.metros, 0)} m</span></div></div>` +
    dataTable({ id: 'oc', rows, cols, actions: r => r.pagado ? '' : `<button class="btn sm primary" data-pay="${r.id}">Marcar pagada</button>` });
  dataTable.wire(v, 'oc', cols, rows);
  $$('[data-pay]', v).forEach(b => b.onclick = () => { DB.find('compras', b.dataset.pay).pagado = true; DB.save(); audit('Pagó compra'); render(); });
  $('#new-oc', v).onclick = () => {
    const fields = [{ k: 'proveedorId', label: 'Proveedor', type: 'select', options: DB.data.proveedores.map(p => [p.id, p.nombre]) }, { k: 'telaId', label: 'Tela', type: 'select', options: DB.data.telas.map(t => [t.id, t.nombre + ' ' + t.color]) }, { k: 'metros', label: 'Metros', type: 'number', req: true }, { k: 'costoMetro', label: 'Costo por metro', type: 'number', req: true }, { k: 'pagado', label: 'Pago', type: 'select', options: [['true', 'Pagada'], ['false', 'A crédito']] }];
    modal({
      title: 'Registrar compra de tela', body: formFields(fields), foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="oc-ok">Guardar y sumar al inventario</button>`,
      onMount: (el, close) => $('#oc-ok', el).onclick = () => {
        try {
          const d = readForm(el, fields); d.pagado = d.pagado === 'true';
          const t = DB.find('telas', d.telaId); t.metros += d.metros; t.costoMetro = d.costoMetro;
          DB.upsert('compras', { id: uid('cp'), num: DB.next('consecOC', 'OC'), fecha: todayISO(), ...d });
          DB.data.movimientos.unshift({ id: uid('mv'), fecha: todayISO(), tipo: 'Entrada', item: t.nombre + ' ' + t.color, cantidad: d.metros, ref: 'Compra' });
          DB.save(); audit(`Compró ${d.metros} m de ${t.nombre}`); close(); render(); toast(`${d.metros} m sumados al inventario`);
        } catch (e) { toast(e.message, true); }
      }
    });
  };
};

/* ---------------- Proveedores ---------------- */
const F_PROV = [{ k: 'nombre', label: 'Proveedor', req: true, full: true }, { k: 'nit', label: 'NIT' }, { k: 'tel', label: 'Teléfono' }, { k: 'contacto', label: 'Contacto' }, { k: 'ciudad', label: 'Ciudad' }, { k: 'material', label: 'Qué nos vende', full: true }];
Views.proveedores = (v) => {
  const rows = DB.data.proveedores;
  const cols = [{ k: 'nombre', label: 'Proveedor' }, { k: 'material', label: 'Materiales' }, { k: 'contacto', label: 'Contacto' }, { k: 'tel', label: 'Teléfono' }, { k: 'ciudad', label: 'Ciudad' },
    { k: 'compras', label: 'Compras', num: true, html: r => money(DB.data.compras.filter(c => c.proveedorId === r.id).reduce((s, c) => s + c.metros * c.costoMetro, 0)) }];
  v.innerHTML = pageHead('Taller', 'Proveedores', `<button class="btn primary" id="new-pv">${icon('plus')} Nuevo proveedor</button>`) + dataTable({ id: 'pv', rows, cols, actions: r => `<button class="btn sm" data-edit="${r.id}">${icon('edit')}</button>` });
  dataTable.wire(v, 'pv', cols, rows);
  $('#new-pv', v).onclick = () => editRecord({ col: 'proveedores', title: 'Proveedor', fields: F_PROV, prefix: 'pv' });
  $$('[data-edit]', v).forEach(b => b.onclick = () => editRecord({ col: 'proveedores', title: 'Proveedor', fields: F_PROV, obj: DB.find('proveedores', b.dataset.edit) }));
};

/* ---------------- Secretaría: agenda y tareas ---------------- */
Views.secretaria = (v) => {
  const ag = [...DB.data.agenda].sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const days = [...Array(7)].map((_, i) => addDays(i));
  const tipoK = { Cita: 'gold', Entrega: 'ok', Llamada: 'mute', Prueba: 'warn', Reunión: 'gold' };
  v.innerHTML = pageHead('Oficina', 'Secretaría', `<button class="btn" id="new-k">${icon('plus')} Tarea</button><button class="btn primary" id="new-a">${icon('plus')} Agendar</button>`) +
    `<div class="grid g-21"><div class="card"><h3>Próximos 7 días <span class="eyebrow">Citas, pruebas, entregas y llamadas</span></h3>
      ${days.map(d => { const items = ag.filter(a => a.fecha === d); return `<div style="margin-bottom:10px"><div class="eyebrow" style="margin:10px 0 4px">${new Date(d + 'T12:00').toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}</div>${items.map(a => `<div class="list-item"><span class="pill gold num">${a.hora}</span><div class="grow" style="${a.hecho ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(a.titulo)}<small>${a.clienteId ? esc(Fin.cli(a.clienteId)) : ''}</small></div>${pill(a.tipo, tipoK[a.tipo] || 'mute')}<button class="btn sm" data-done-a="${a.id}">${a.hecho ? 'Reabrir' : 'Hecho'}</button></div>`).join('') || '<div class="muted" style="font-size:13px">Libre</div>'}</div>`; }).join('')}
    </div>
    <div class="card"><h3>Tareas <span class="eyebrow">${DB.data.tareas.filter(t => !t.hecho).length} pendientes</span></h3><div class="list">${DB.data.tareas.map(t => `<label class="list-item" style="cursor:pointer"><input type="checkbox" data-done-k="${t.id}" ${t.hecho ? 'checked' : ''} style="width:auto"><div class="grow" style="${t.hecho ? 'text-decoration:line-through;opacity:.6' : ''}">${esc(t.titulo)}<small>${esc(t.asignado)}</small></div>${pill(t.prioridad, t.prioridad === 'Alta' ? 'bad' : t.prioridad === 'Media' ? 'warn' : 'mute')}</label>`).join('')}</div>
      <div class="sep mt"></div><h3 class="mt">Accesos rápidos</h3><div class="flex"><button class="btn sm" data-go2="cotizaciones">Cotizar</button><button class="btn sm" data-go2="cartera">Cobrar cartera</button><button class="btn sm" data-go2="mensajes">Responder mensajes</button><button class="btn sm" data-go2="clientes">Nuevo cliente</button></div></div></div>`;
  $$('[data-go2]', v).forEach(b => b.onclick = () => go(b.dataset.go2));
  $$('[data-done-a]', v).forEach(b => b.onclick = () => { const a = DB.find('agenda', b.dataset.doneA); a.hecho = !a.hecho; DB.save(); render(); });
  $$('[data-done-k]', v).forEach(b => b.onchange = () => { const t = DB.find('tareas', b.dataset.doneK); t.hecho = b.checked; DB.save(); render(); });
  $('#new-a', v).onclick = () => editRecord({ col: 'agenda', title: 'Cita', prefix: 'a', fields: [{ k: 'titulo', label: 'Asunto', req: true, full: true }, { k: 'fecha', label: 'Fecha', type: 'date', def: todayISO() }, { k: 'hora', label: 'Hora', type: 'time', def: '10:00' }, { k: 'tipo', label: 'Tipo', type: 'select', options: ['Cita', 'Prueba', 'Entrega', 'Llamada', 'Reunión'] }, { k: 'clienteId', label: 'Cliente', type: 'select', options: [['', '—'], ...DB.data.clientes.map(c => [c.id, c.nombre])] }] });
  $('#new-k', v).onclick = () => editRecord({ col: 'tareas', title: 'Tarea', prefix: 'k', fields: [{ k: 'titulo', label: 'Tarea', req: true, full: true }, { k: 'prioridad', label: 'Prioridad', type: 'select', options: ['Alta', 'Media', 'Baja'] }, { k: 'asignado', label: 'Responsable', type: 'select', options: ['Secretaria', 'Administración', 'Taller', 'Ventas'] }] });
};

/* ---------------- Mensajes y contestación ---------------- */
let msgSel = null;
function sugerir(m) {
  const t = m.texto.toLowerCase();
  const p = DB.data.plantillas.map(p => ({ p, score: p.clave.split(',').filter(k => t.includes(k.trim().toLowerCase())).length })).sort((a, b) => b.score - a.score)[0];
  const base = p && p.score ? p.p.texto : 'Hola {nombre}, gracias por escribir a ' + DB.data.config.empresa + '. En un momento le atendemos.';
  return base.replace('{nombre}', m.de.startsWith('@') ? '' : m.de.split(' ')[0]).replace(/\s+,/, ',');
}
Views.mensajes = (v) => {
  const ms = DB.data.mensajes;
  if (!msgSel || !DB.find('mensajes', msgSel)) msgSel = ms.find(m => !m.respondido)?.id || ms[0]?.id;
  const m = DB.find('mensajes', msgSel);
  v.innerHTML = pageHead('Oficina', 'Mensajes y contestación', `<button class="btn" id="tpl">Plantillas de respuesta</button><button class="btn primary" id="new-m">${icon('plus')} Registrar mensaje</button>`) +
    `<div class="inbox"><div class="thread-list">${ms.map(x => `<button class="thread ${x.id === msgSel ? 'on' : ''}" data-m="${x.id}"><div class="flex" style="justify-content:space-between"><b>${esc(x.de)}</b>${x.respondido ? pill('Respondido', 'ok') : pill('Nuevo', 'warn')}</div><small>${esc(x.canal)} · ${esc(x.fecha)}</small><span style="font-size:13.5px">${esc(x.texto.slice(0, 70))}${x.texto.length > 70 ? '…' : ''}</span></button>`).join('')}</div>
    <div class="card">${m ? `<h3>${esc(m.de)} <span class="eyebrow">${esc(m.canal)}</span></h3><div class="convo"><div class="bubble">${esc(m.texto)}<small>${esc(m.fecha)}</small></div>${m.hilo.map(h => `<div class="bubble me">${esc(h.texto)}<small>${esc(h.fecha)}</small></div>`).join('')}</div>
      <div class="sep mt"></div><label class="field mt">Respuesta sugerida (puede editarla)<textarea id="rsp" rows="4">${esc(sugerir(m))}</textarea></label>
      <div class="flex mt"><button class="btn primary" id="rsp-ok">${icon('check')} Guardar respuesta</button>${m.tel ? `<a class="btn" id="rsp-wa" href="${waLink(m.tel, sugerir(m))}" target="_blank" rel="noopener">${icon('send')} Abrir en WhatsApp</a>` : ''}<button class="btn ghost" id="rsp-copy">Copiar</button><button class="btn ghost" id="rsp-cli">Crear cliente</button></div>` : '<p class="muted">No hay mensajes.</p>'}</div></div>`;
  $$('[data-m]', v).forEach(b => b.onclick = () => { msgSel = b.dataset.m; render(); });
  if (m) {
    const ta = $('#rsp', v);
    ta.oninput = () => { const wa = $('#rsp-wa', v); if (wa) wa.href = waLink(m.tel, ta.value); };
    $('#rsp-ok', v).onclick = () => { m.hilo.push({ me: true, texto: ta.value, fecha: todayISO() + ' ' + new Date().toTimeString().slice(0, 5) }); m.respondido = true; DB.save(); audit('Respondió mensaje de ' + m.de); render(); toast('Respuesta registrada'); };
    $('#rsp-copy', v).onclick = async () => { try { await navigator.clipboard.writeText(ta.value); toast('Copiado'); } catch { ta.select(); } };
    $('#rsp-cli', v).onclick = () => editRecord({ col: 'clientes', title: 'Cliente', fields: F_CLIENTE, prefix: 'c', obj: null, after: () => go('clientes') });
  }
  $('#new-m', v).onclick = () => editRecord({ col: 'mensajes', title: 'Mensaje', prefix: 'm', fields: [{ k: 'de', label: 'De', req: true }, { k: 'canal', label: 'Canal', type: 'select', options: ['WhatsApp', 'Instagram', 'Facebook', 'Correo', 'Llamada'] }, { k: 'tel', label: 'Celular' }, { k: 'texto', label: 'Mensaje', type: 'textarea', full: true, req: true }], after: (r) => { r.fecha = todayISO() + ' ' + new Date().toTimeString().slice(0, 5); r.hilo = []; r.respondido = false; DB.save(); msgSel = r.id; render(); } });
  $('#tpl', v).onclick = () => modal({ title: 'Plantillas de respuesta', wide: true, body: `<p class="muted">Cuando un mensaje contiene una palabra clave, el sistema propone esa respuesta. Use {nombre} para el nombre del cliente.</p>${DB.data.plantillas.map(p => `<div class="card" style="padding:14px"><b>${esc(p.titulo)}</b><div class="muted" style="font-size:12.5px">Palabras clave: ${esc(p.clave)}</div><p style="margin:6px 0 0">${esc(p.texto)}</p></div>`).join('')}` });
};

/* ---------------- Personal y destajo ---------------- */
Views.empleados = (v) => {
  const es = DB.data.empleados;
  const mesK = todayISO().slice(0, 7);
  const prendasMes = id => DB.data.destajo.filter(d => d.empleadoId === id && d.fecha.startsWith(mesK)).reduce((s, d) => s + d.prendas, 0);
  const pagoMes = e => e.modo === 'Destajo' ? prendasMes(e.id) * e.tarifa : e.salario;
  const cols = [{ k: 'nombre', label: 'Nombre' }, { k: 'cargo', label: 'Cargo' }, { k: 'modo', label: 'Pago', html: r => pill(r.modo, r.modo === 'Destajo' ? 'gold' : 'mute'), text: r => r.modo },
    { k: 'prendas', label: 'Prendas mes', num: true, html: r => r.modo === 'Destajo' ? prendasMes(r.id) : '—', sortv: r => prendasMes(r.id) },
    { k: 'pago', label: 'A pagar este mes', num: true, html: r => money(pagoMes(r)), sortv: pagoMes, csv: pagoMes }, { k: 'tel', label: 'Celular' }];
  const F = [{ k: 'nombre', label: 'Nombre', req: true }, { k: 'cargo', label: 'Cargo' }, { k: 'tel', label: 'Celular' }, { k: 'modo', label: 'Modalidad', type: 'select', options: ['Salario', 'Destajo'] }, { k: 'salario', label: 'Salario mensual', type: 'number' }, { k: 'tarifa', label: 'Tarifa por prenda (destajo)', type: 'number' }, { k: 'ingreso', label: 'Fecha de ingreso', type: 'date' }];
  v.innerHTML = pageHead('Oficina', 'Personal y destajo', `<button class="btn" id="dj">${icon('produccion')} Registrar prendas (destajo)</button><button class="btn primary" id="new-e">${icon('plus')} Nuevo empleado</button>`) +
    `<div class="grid g-3" style="margin-bottom:16px"><div class="card kpi"><span class="eyebrow">Nómina estimada del mes</span><span class="kpi-value">${money(es.reduce((s, e) => s + pagoMes(e), 0))}</span></div><div class="card kpi"><span class="eyebrow">Prendas a destajo este mes</span><span class="kpi-value num">${DB.data.destajo.filter(d => d.fecha.startsWith(mesK)).reduce((s, d) => s + d.prendas, 0)}</span></div><div class="card kpi"><span class="eyebrow">Personas</span><span class="kpi-value num">${es.length}</span></div></div>` +
    dataTable({ id: 'emp', rows: es, cols, actions: r => `<button class="btn sm" data-edit="${r.id}">${icon('edit')}</button>` });
  dataTable.wire(v, 'emp', cols, es);
  $('#new-e', v).onclick = () => editRecord({ col: 'empleados', title: 'Empleado', fields: F, prefix: 'e' });
  $$('[data-edit]', v).forEach(b => b.onclick = () => editRecord({ col: 'empleados', title: 'Empleado', fields: F, obj: DB.find('empleados', b.dataset.edit) }));
  $('#dj', v).onclick = () => editRecord({ col: 'destajo', title: 'Registro de destajo', prefix: 'dj', fields: [{ k: 'empleadoId', label: 'Persona', type: 'select', options: es.filter(e => e.modo === 'Destajo').map(e => [e.id, e.nombre]) }, { k: 'fecha', label: 'Fecha', type: 'date', def: todayISO() }, { k: 'prendas', label: 'Prendas terminadas', type: 'number', req: true }, { k: 'ref', label: 'Orden de producción' }] });
};

/* ---------------- Gastos y caja ---------------- */
Views.gastos = (v) => {
  const gs = DB.data.gastos, hoy = todayISO(), mesK = hoy.slice(0, 7);
  const ingresosHoy = Fin.recaudoHoy(), gastosHoy = gs.filter(g => g.fecha === hoy).reduce((s, g) => s + g.valor, 0);
  const efectivoHoy = DB.data.facturas.flatMap(f => f.abonos || []).filter(a => a.fecha === hoy && a.medio === 'Efectivo').reduce((s, a) => s + a.valor, 0) - gs.filter(g => g.fecha === hoy && g.medio === 'Efectivo').reduce((s, g) => s + g.valor, 0);
  const ingMes = DB.data.facturas.flatMap(f => f.abonos || []).filter(a => a.fecha.startsWith(mesK)).reduce((s, a) => s + a.valor, 0);
  const gasMes = gs.filter(g => g.fecha.startsWith(mesK)).reduce((s, g) => s + g.valor, 0) + DB.data.compras.filter(c => c.pagado && c.fecha.startsWith(mesK)).reduce((s, c) => s + c.metros * c.costoMetro, 0);
  const cols = [{ k: 'fecha', label: 'Fecha', text: r => fmtDate(r.fecha), sortv: r => r.fecha }, { k: 'categoria', label: 'Categoría' }, { k: 'desc', label: 'Descripción' }, { k: 'medio', label: 'Medio' }, { k: 'valor', label: 'Valor', num: true, html: r => money(r.valor) }];
  const F = [{ k: 'fecha', label: 'Fecha', type: 'date', def: hoy }, { k: 'categoria', label: 'Categoría', type: 'select', options: ['Arriendo', 'Servicios', 'Nómina', 'Mantenimiento', 'Transporte', 'Publicidad', 'Impuestos', 'Insumos', 'Otros'] }, { k: 'desc', label: 'Descripción', req: true, full: true }, { k: 'valor', label: 'Valor', type: 'number', req: true }, { k: 'medio', label: 'Medio', type: 'select', options: ['Efectivo', 'Transferencia', 'Tarjeta', 'Nequi'] }];
  v.innerHTML = pageHead('Oficina', 'Gastos y caja', `<button class="btn" id="cierre">${icon('cartera')} Cierre de caja</button><button class="btn primary" id="new-g">${icon('plus')} Registrar gasto</button>`) +
    `<div class="grid g-4" style="margin-bottom:16px"><div class="card kpi"><span class="eyebrow">Entró hoy</span><span class="kpi-value" style="color:var(--ok)">${money(ingresosHoy)}</span></div><div class="card kpi"><span class="eyebrow">Salió hoy</span><span class="kpi-value" style="color:var(--bad)">${money(gastosHoy)}</span></div><div class="card kpi"><span class="eyebrow">Efectivo esperado en caja</span><span class="kpi-value">${money(DB.data.caja.base + efectivoHoy)}</span><span class="kpi-foot">Base ${money(DB.data.caja.base)}</span></div><div class="card kpi"><span class="eyebrow">Utilidad de caja del mes</span><span class="kpi-value">${money(ingMes - gasMes)}</span><span class="kpi-foot">Recaudo ${money(ingMes)} − gastos y compras ${money(gasMes)}</span></div></div>` +
    dataTable({ id: 'gas', rows: gs, cols, actions: r => `<button class="btn sm" data-del="${r.id}">${icon('trash')}</button>` }) +
    (DB.data.caja.cierres.length ? `<div class="card mt"><h3>Cierres de caja</h3><div class="list">${DB.data.caja.cierres.map(c => `<div class="list-item"><div class="grow">${fmtDate(c.fecha)} · ${esc(c.usuario)}<small>Esperado ${moneyTxt(c.esperado)} · Contado ${moneyTxt(c.contado)}</small></div>${pill(c.dif === 0 ? 'Cuadrada' : (c.dif > 0 ? 'Sobra ' : 'Falta ') + moneyTxt(Math.abs(c.dif)), c.dif === 0 ? 'ok' : 'bad')}</div>`).join('')}</div></div>` : '');
  dataTable.wire(v, 'gas', cols, gs);
  $('#new-g', v).onclick = () => editRecord({ col: 'gastos', title: 'Gasto', fields: F, prefix: 'g' });
  $$('[data-del]', v).forEach(b => b.onclick = () => ask('¿Eliminar este gasto?', () => { DB.remove('gastos', b.dataset.del); audit('Eliminó gasto'); render(); }, 'Eliminar'));
  $('#cierre', v).onclick = () => {
    const esperado = DB.data.caja.base + efectivoHoy;
    modal({ title: 'Cierre de caja', body: `<p>Efectivo esperado: <b class="gold">${moneyTxt(esperado)}</b></p><label class="field">Efectivo contado<input id="ci-v" type="number" value="${esperado}"></label>`, foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="ci-ok">Cerrar caja</button>`,
      onMount: (el, close) => $('#ci-ok', el).onclick = () => { const contado = +$('#ci-v', el).value; DB.data.caja.cierres.unshift({ fecha: hoy, usuario: State.user.nombre, esperado, contado, dif: contado - esperado }); DB.save(); audit('Cierre de caja'); close(); render(); toast('Caja cerrada'); } });
  };
};

/* ---------------- Reportes ---------------- */
Views.reportes = (v) => {
  const fs = DB.data.facturas.filter(f => !f.anulada);
  const year = todayISO().slice(0, 4);
  const fy = fs.filter(f => f.fecha.startsWith(year));
  const ventas = fy.reduce((s, f) => s + Fin.totals(f).base, 0);
  const costo = fy.reduce((s, f) => s + f.items.reduce((a, i) => a + i.cant * (DB.find('productos', i.productoId)?.costo || 0), 0), 0);
  const gastos = DB.data.gastos.filter(g => g.fecha.startsWith(year)).reduce((s, g) => s + g.valor, 0);
  const porCat = {}, porCli = {}, porTipo = {};
  fs.forEach(f => { const c = DB.find('clientes', f.clienteId); porCli[Fin.cli(f.clienteId)] = (porCli[Fin.cli(f.clienteId)] || 0) + Fin.totals(f).total; porTipo[c?.tipo || 'Detal'] = (porTipo[c?.tipo || 'Detal'] || 0) + Fin.totals(f).total; f.items.forEach(i => { const cat = DB.find('productos', i.productoId)?.categoria || 'Otro'; porCat[cat] = (porCat[cat] || 0) + i.cant * i.precio; }); });
  const fmt = x => State.privado ? '•••' : moneyTxt(x);
  v.innerHTML = pageHead('Análisis', 'Reportes', `<button class="btn" id="csv-ventas">${icon('download')} Ventas a Excel</button>`) +
    `<div class="grid g-4"><div class="card kpi"><span class="eyebrow">Ventas netas ${year}</span><span class="kpi-value">${money(ventas)}</span><span class="kpi-foot">Sin IVA</span></div><div class="card kpi"><span class="eyebrow">Costo de prendas</span><span class="kpi-value">${money(costo)}</span></div><div class="card kpi"><span class="eyebrow">Gastos operativos</span><span class="kpi-value">${money(gastos)}</span></div><div class="card kpi"><span class="eyebrow">Utilidad estimada</span><span class="kpi-value" style="color:var(--ok)">${money(ventas - costo - gastos)}</span><span class="kpi-foot">Margen ${ventas ? Math.round((ventas - costo - gastos) / ventas * 100) : 0}%</span></div></div>
    <div class="grid g-2 mt"><div class="card"><h3>Ventas por categoría</h3><div id="r-cat"></div></div><div class="card"><h3>Mejores clientes</h3><div id="r-cli"></div></div>
    <div class="card"><h3>Detal vs. mayor vs. empresas</h3><div id="r-tipo"></div></div><div class="card"><h3>Ventas por mes</h3><div class="chart" id="r-mes"></div></div></div>`;
  hbars($('#r-cat', v), Object.entries(porCat).sort((a, b) => b[1] - a[1]), fmt);
  hbars($('#r-cli', v), Object.entries(porCli).sort((a, b) => b[1] - a[1]).slice(0, 7), fmt);
  hbars($('#r-tipo', v), Object.entries(porTipo).sort((a, b) => b[1] - a[1]), fmt);
  const months = [...Array(6)].map((_, i) => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i)); return d; });
  barChart($('#r-mes', v), months.map(d => d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')), months.map(d => fs.filter(f => f.fecha.startsWith(d.toISOString().slice(0, 7))).reduce((s, f) => s + Fin.totals(f).total, 0)));
  $('#csv-ventas', v).onclick = () => exportCSV('ventas', [{ k: 'num', label: 'Factura' }, { k: 'fecha', label: 'Fecha' }, { k: 'c', label: 'Cliente', text: r => Fin.cli(r.clienteId) }, { k: 'b', label: 'Base', csv: r => Fin.totals(r).base }, { k: 'i', label: 'IVA', csv: r => Fin.totals(r).iva }, { k: 't', label: 'Total', csv: r => Fin.totals(r).total }, { k: 's', label: 'Saldo', csv: r => Fin.saldo(r) }], fs);
};

/* ---------------- Usuarios y roles ---------------- */
Views.usuarios = (v) => {
  const us = DB.data.users;
  v.innerHTML = pageHead('Sistema', 'Usuarios y roles', `<button class="btn primary" id="new-u">${icon('plus')} Nuevo usuario</button>`) +
    `<div class="grid g-21"><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th></th></tr></thead><tbody>${us.map(u => `<tr><td>${esc(u.nombre)}</td><td>${esc(u.usuario)}</td><td>${pill(ROLES[u.rol].nombre, 'gold')}</td><td>${u.activo ? pill('Activo', 'ok') : pill('Inactivo', 'mute')} ${u.debeCambiar ? pill('Cambiar clave', 'warn') : ''}</td><td><div class="row-actions"><button class="btn sm" data-pw="${u.id}">Cambiar clave</button>${u.id !== State.user.id ? `<button class="btn sm" data-tog="${u.id}">${u.activo ? 'Desactivar' : 'Activar'}</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
    <div class="card"><h3>Qué puede ver cada rol</h3>${Object.values(ROLES).map(r => `<p><b>${r.nombre}</b><br><span class="muted" style="font-size:13px">${r.modulos === '*' ? 'Todo el sistema, incluida la configuración, usuarios, auditoría y anulación de facturas.' : r.modulos.map(m => NAV.flatMap(g => g[1]).find(x => x[0] === m)?.[1]).join(', ')}</span></p>`).join('')}</div></div>`;
  if (State.user.rol !== 'admin') return;
  $('#new-u', v).onclick = () => modal({
    title: 'Nuevo usuario', body: `<div class="form-grid"><label class="field">Nombre<input id="nu-n"></label><label class="field">Usuario<input id="nu-u" autocomplete="off"></label><label class="field">Rol<select id="nu-r">${Object.entries(ROLES).map(([k, r]) => `<option value="${k}">${r.nombre}</option>`).join('')}</select></label><label class="field">Contraseña<input id="nu-p" type="password" autocomplete="new-password"></label></div><p class="muted">Mínimo 8 caracteres con mayúscula, minúscula y número.</p>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="nu-ok">Crear</button>`,
    onMount: (el, close) => $('#nu-ok', el).onclick = async () => {
      const n = $('#nu-n', el).value.trim(), u = $('#nu-u', el).value.trim(), p = $('#nu-p', el).value;
      if (!n || !u) return toast('Complete nombre y usuario.', true);
      if (us.some(x => x.usuario === u)) return toast('Ese usuario ya existe.', true);
      if (!Auth.strong(p)) return toast('La contraseña es débil.', true);
      const user = { id: uid('u'), nombre: n, usuario: u, rol: $('#nu-r', el).value, activo: true };
      await Auth.setPassword(user, p); us.push(user); DB.save(); audit('Creó usuario ' + u); close(); render();
    }
  });
  $$('[data-pw]', v).forEach(b => b.onclick = () => { const u = DB.data.users.find(x => x.id === b.dataset.pw); modal({ title: 'Cambiar contraseña · ' + u.usuario, body: `<label class="field">Nueva contraseña<input id="pw1" type="password" autocomplete="new-password"></label><label class="field">Repetir<input id="pw2" type="password" autocomplete="new-password"></label>`, foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="pw-ok">Guardar</button>`,
    onMount: (el, close) => $('#pw-ok', el).onclick = async () => { const a = $('#pw1', el).value; if (a !== $('#pw2', el).value) return toast('No coinciden.', true); if (!Auth.strong(a)) return toast('Mínimo 8 caracteres con mayúscula, minúscula y número.', true); await Auth.setPassword(u, a); audit('Cambió clave de ' + u.usuario); close(); render(); toast('Contraseña actualizada'); } }); });
  $$('[data-tog]', v).forEach(b => b.onclick = () => { const u = DB.data.users.find(x => x.id === b.dataset.tog); u.activo = !u.activo; DB.save(); audit((u.activo ? 'Activó ' : 'Desactivó ') + u.usuario); render(); });
};

/* ---------------- Auditoría ---------------- */
Views.auditoria = (v) => {
  const rows = DB.data.auditoria;
  const cols = [{ k: 'fecha', label: 'Fecha y hora', text: r => new Date(r.fecha).toLocaleString('es-CO') }, { k: 'usuario', label: 'Usuario' }, { k: 'accion', label: 'Acción', html: r => r.accion.includes('fallido') ? `<span style="color:var(--bad)">${esc(r.accion)}</span>` : esc(r.accion), text: r => r.accion }];
  v.innerHTML = pageHead('Sistema', 'Auditoría') + '<p class="muted" style="margin-top:-10px">Registro de quién hizo qué y cuándo: ingresos, intentos fallidos, facturas, abonos, anulaciones y cambios.</p>' + dataTable({ id: 'aud', rows, cols });
  dataTable.wire(v, 'aud', cols, rows);
};

/* ---------------- Configuración y respaldo ---------------- */
Views.config = (v) => {
  const c = DB.data.config;
  const F = [{ k: 'empresa', label: 'Nombre de la empresa', req: true }, { k: 'eslogan', label: 'Eslogan' }, { k: 'nit', label: 'NIT' }, { k: 'tel', label: 'Teléfono' }, { k: 'email', label: 'Correo' }, { k: 'direccion', label: 'Dirección' }, { k: 'ciudad', label: 'Ciudad' }, { k: 'ivaPct', label: 'IVA %', type: 'number' }, { k: 'bloqueoMin', label: 'Bloqueo automático (minutos)', type: 'number' }, { k: 'resolucion', label: 'Resolución de facturación', full: true }];
  v.innerHTML = pageHead('Sistema', 'Configuración') + `<div class="grid g-2"><div class="card"><h3>Datos de la empresa</h3>${formFields(F, c)}<button class="btn primary mt" id="cfg-save">${icon('check')} Guardar</button></div>
    <div class="grid" style="align-content:start"><div class="card"><h3>Respaldo cifrado</h3><p class="muted">Guarda toda la información en un archivo protegido con contraseña (AES-256). Sin la contraseña nadie puede leerlo.</p>
      <label class="field">Contraseña del respaldo<input id="bk-p" type="password" autocomplete="new-password"></label>
      <div class="flex mt"><button class="btn" id="bk-exp">${icon('download')} Crear respaldo</button><button class="btn" id="bk-imp">Restaurar respaldo</button></div>
      <textarea id="bk-txt" rows="4" class="mt" placeholder="Aquí aparece el respaldo cifrado; también puede pegar uno para restaurarlo." aria-label="Respaldo cifrado"></textarea></div>
    <div class="card"><h3>Datos de ejemplo</h3><p class="muted">${c.demo ? 'El sistema tiene datos de ejemplo para la demostración.' : 'El sistema está sin datos de ejemplo.'}</p><div class="flex"><button class="btn danger" id="clear-demo">Empezar en limpio</button><button class="btn" id="load-demo">Cargar ejemplo</button></div></div></div></div>`;
  $('#cfg-save', v).onclick = () => { try { Object.assign(c, readForm(v, F)); DB.save(); audit('Actualizó configuración'); render(); toast('Configuración guardada'); } catch (e) { toast(e.message, true); } };
  $('#bk-exp', v).onclick = async () => { const p = $('#bk-p', v).value; if (p.length < 6) return toast('Use una contraseña de al menos 6 caracteres.', true); const enc = await Crypto.encrypt(JSON.stringify(DB.data), p); $('#bk-txt', v).value = enc; audit('Creó respaldo cifrado'); if (!inFrame) downloadText(`respaldo-aurea-${todayISO()}.aurea`, enc); else toast('Respaldo generado: cópielo y guárdelo en un lugar seguro'); };
  $('#bk-imp', v).onclick = async () => { try { const data = JSON.parse(await Crypto.decrypt($('#bk-txt', v).value, $('#bk-p', v).value)); ask('¿Reemplazar toda la información actual por el respaldo?', () => { DB.data = data; DB.save(); audit('Restauró respaldo'); render(); toast('Respaldo restaurado'); }, 'Restaurar'); } catch { toast('No se pudo abrir: contraseña incorrecta o respaldo dañado.', true); } };
  $('#clear-demo', v).onclick = () => ask('Se borrarán clientes, facturas, inventario y demás datos de ejemplo. Los usuarios se conservan.', async () => { await DB.reset(false); audit('Borró datos de ejemplo'); render(); toast('Sistema en limpio'); }, 'Borrar todo');
  $('#load-demo', v).onclick = () => ask('Se cargarán los datos de ejemplo y se reemplazará la información actual.', async () => { await DB.reset(true); DB.data.config.demo = true; DB.save(); render(); toast('Ejemplo cargado'); }, 'Cargar');
};

/* ---------------- Funciones del sistema ---------------- */
const FUNCIONES = {
  'Seguridad y privacidad': ['Ingreso con usuario y contraseña', 'Contraseñas cifradas con PBKDF2-SHA256 (120.000 iteraciones)', 'Bloqueo tras 5 intentos fallidos', 'Bloqueo automático por inactividad', 'Botón de bloqueo inmediato de pantalla', 'Modo privado que oculta todos los valores', 'Roles: administradora, secretaria, vendedor, jefe de taller', 'Menú filtrado según el rol', 'Solo la administradora anula facturas', 'Política de contraseñas seguras', 'Aviso para cambiar claves iniciales', 'Activar y desactivar usuarios', 'Registro de auditoría de cada acción', 'Registro de intentos de ingreso fallidos', 'Respaldo cifrado AES-256 con contraseña', 'Restauración de respaldo', 'Página oculta de buscadores (noindex)', 'Sesión que se cierra al cerrar el navegador'],
  'Panel principal': ['Ventas de hoy', 'Recaudo del día', 'Ventas del mes y comparación con el mes anterior', 'Cartera por cobrar y vencida', 'Metros de tela y valor en bodega', 'Gráfica de ventas de 12 meses', 'Agenda del día', 'Órdenes en el taller con avance', 'Alertas de tela, stock e insumos', 'Mensajes sin responder', 'Lo más vendido', 'Cartera por edad (al día, 30, 60, +60)', 'Saludo según la hora', 'Búsqueda global'],
  'Salón de ventas': ['Catálogo visual por categoría', 'Búsqueda de prendas por nombre o código', 'Selección de talla y cantidad', 'Precio mayorista automático por cantidad', 'Precio mayorista automático por tipo de cliente', 'Descuento fijo del cliente', 'Descuento manual', 'Cálculo de IVA', 'Efectivo, transferencia, Nequi, Daviplata, tarjeta', 'Venta a crédito con cartera', 'Aviso de falta de stock', 'Guardar venta como cotización', 'Factura inmediata al cobrar', 'Descuento automático del inventario por talla'],
  'Cotizaciones': ['Crear y editar cotizaciones', 'Consecutivo automático', 'Estados: borrador, enviada, aprobada, rechazada, facturada', 'Vigencia en días', 'Notas de bordado y colores', 'Documento elegante con logo', 'Enviar por WhatsApp con mensaje listo', 'Convertir en factura con un clic', 'Generar órdenes de producción desde la cotización', 'Totales por estado'],
  'Facturas': ['Facturación de contado y a crédito', 'Plazos de 15, 30, 45, 60 y 90 días', 'Consecutivo y resolución configurables', 'Abonos parciales', 'Historial de pagos', 'Anulación con devolución al inventario', 'IVA generado del mes', 'Imprimir o guardar en PDF', 'Envío por WhatsApp', 'Exportar a Excel'],
  'Cartera': ['Cuentas por cobrar', 'Días de vencimiento', 'Saldo por cliente', 'Recordatorio de cobro por WhatsApp', 'Registro de abonos desde la cartera', 'Cupo de crédito disponible por cliente', 'Alerta en el menú de facturas vencidas'],
  'Clientes': ['Ficha de cliente detal, mayorista y empresa', 'Cédula o NIT, celular, correo, ciudad', 'Cupo de crédito', 'Descuento fijo', 'Notas, medidas y preferencias', 'Historial de compras y cotizaciones', 'Total comprado y deuda', 'Contacto directo por WhatsApp'],
  'Catálogo e inventario': ['Prendas con código y categoría', 'Stock por talla S, M, L, XL', 'Costo, precio detal y precio mayor', 'Margen de ganancia', 'Stock mínimo con alerta', 'Telas por tipo, color y ubicación', 'Metros disponibles y valor en bodega', 'Rendimiento aproximado de cada tela', 'Insumos: botones, hilos, reflectivos, cremalleras', 'Entradas, salidas y ajustes', 'Historial de movimientos', 'Valor del inventario terminado'],
  'Producción': ['Órdenes de producción con consecutivo', 'Tablero por etapas: corte, confección, bordado, terminación, listo', 'Cálculo de metros de tela por orden', 'Descuento automático de la tela', 'Aviso si la tela no alcanza', 'Responsable por orden', 'Fecha de entrega con alertas de atraso', 'Barra de avance', 'Entrada automática al inventario al terminar'],
  'Compras y proveedores': ['Registro de compras de tela', 'Suma automática al inventario', 'Actualización del costo por metro', 'Compras a crédito y cuentas por pagar', 'Directorio de proveedores', 'Total comprado por proveedor'],
  'Secretaría y mensajes': ['Agenda de 7 días', 'Citas, pruebas, entregas, llamadas y reuniones', 'Tareas con prioridad y responsable', 'Bandeja de WhatsApp, Instagram, correo y llamadas', 'Respuesta sugerida automática por palabras clave', 'Plantillas de respuesta editables', 'Responder abriendo WhatsApp', 'Crear cliente desde un mensaje', 'Accesos rápidos'],
  'Personal, gastos y caja': ['Empleados por salario o destajo', 'Registro de prendas por persona', 'Pago de destajo calculado', 'Nómina estimada del mes', 'Gastos por categoría', 'Ingresos y salidas del día', 'Efectivo esperado en caja', 'Cierre de caja con faltantes y sobrantes', 'Utilidad de caja del mes'],
  'Reportes y sistema': ['Ventas netas del año', 'Costo de prendas vendidas', 'Utilidad y margen', 'Ventas por categoría', 'Mejores clientes', 'Detal vs. mayor vs. empresas', 'Exportar ventas a Excel', 'Tablas con búsqueda y orden', 'Exportar cualquier tabla', 'Tema oscuro y claro', 'Funciona en celular, tableta y computador', 'Nombre y datos de la empresa editables', 'Empezar en limpio o cargar ejemplo']
};
Views.funciones = (v) => {
  const total = Object.values(FUNCIONES).reduce((s, l) => s + l.length, 0);
  let n = 0;
  v.innerHTML = pageHead('Todo lo que incluye', `${total} funciones`) + `<div class="feat-cols">${Object.entries(FUNCIONES).map(([g, list]) => `<div class="card feat-block"><h3>${esc(g)} <span class="eyebrow">${list.length}</span></h3><ol start="${n + 1}">${list.map(x => { n++; return `<li>${esc(x)}</li>`; }).join('')}</ol></div>`).join('')}</div>`;
};
