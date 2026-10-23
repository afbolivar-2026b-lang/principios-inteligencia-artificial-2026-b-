/* Dashboard de ventas: indicadores, filtros por año, mes y vendedor, y 12 gráficas. */

ICONS.dashboard = '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>';
NAV.find(g => g[0] === 'Análisis')[1].unshift(['dashboard', 'Dashboard de ventas']);

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const CANALES = ['Salón', 'WhatsApp', 'Visita a empresas', 'Instagram'];
const METODOS = ['Transferencia', 'Efectivo', 'Nequi', 'Crédito 30 días', 'Tarjeta'];
const TIPOS = ['Detal', 'Mayorista', 'Empresa'];

/* Las facturas nuevas guardan el canal de venta para el dashboard. */
const baseCrearFactura = crearFactura;
crearFactura = function (o) {
  const f = baseCrearFactura(o);
  f.canal = o.canal || (o.cotId ? 'Visita a empresas' : 'Salón');
  DB.save();
  return f;
};

/* ---------------- Historial de ejemplo ---------------- */
function generarHistorial() {
  let seed = 20261;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = (pairs) => { let r = rnd(), a = 0; for (const [v, w] of pairs) { a += w; if (r <= a) return v; } return pairs[pairs.length - 1][0]; };
  const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const vend = [['Daniela Vargas', .24], ['Marcela Ruiz', .2], ['Andrés Polanco', .17], ['Camila Trujillo', .15], ['Julián Perdomo', .12], ['Administradora', .12]];
  const canal = [['Salón', .38], ['WhatsApp', .27], ['Visita a empresas', .23], ['Instagram', .12]];
  const metodo = [['Transferencia', .32], ['Efectivo', .24], ['Nequi', .18], ['Crédito 30 días', .16], ['Tarjeta', .10]];
  const tipoPor = { 'Salón': [['Detal', .7], ['Mayorista', .3]], 'WhatsApp': [['Mayorista', .5], ['Detal', .4], ['Empresa', .1]], 'Visita a empresas': [['Empresa', .85], ['Mayorista', .15]], 'Instagram': [['Detal', .8], ['Mayorista', .2]] };
  const prodPor = { Detal: ['p3', 'p4', 'p5', 'p7', 'p3', 'p6'], Mayorista: ['p3', 'p4', 'p1', 'p5', 'p6', 'p7'], Empresa: ['p1', 'p2', 'p5', 'p6', 'p8', 'p9', 'p10', 'p7', 'p1', 'p2'] };
  const und = { Detal: [1, 3], Mayorista: [6, 30], Empresa: [12, 80] };
  const pool = { Detal: 240, Mayorista: 32, Empresa: 18 };
  // Picos de dotación: la ley laboral colombiana obliga a entregarla el 30 de abril, el 31 de agosto y el 20 de diciembre.
  const season = [1.15, 1.05, 0.85, 1.35, 0.95, 0.9, 0.95, 1.4, 0.9, 1.0, 1.05, 1.5];
  const hoy = new Date(), ventas = [], cot = {};
  for (let y = hoy.getFullYear() - 1; y <= hoy.getFullYear(); y++) for (let m = 0; m < 12; m++) {
    if (y === hoy.getFullYear() && m > hoy.getMonth()) break;
    const lastDay = (y === hoy.getFullYear() && m === hoy.getMonth()) ? hoy.getDate() : new Date(y, m + 1, 0).getDate();
    const n = Math.round(30 * season[m] * (y === hoy.getFullYear() ? 1.12 : 1) * (0.9 + rnd() * 0.2) * lastDay / new Date(y, m + 1, 0).getDate());
    let comerciales = 0;
    for (let i = 0; i < n; i++) {
      const c = pick(canal), tipo = pick(tipoPor[c]), pid = prodPor[tipo][int(0, prodPor[tipo].length - 1)];
      const p = DB.find('productos', pid) || DB.data.productos[0];
      const u = int(...und[tipo]), precio = tipo === 'Detal' ? p.precioDetal : p.precioMayor;
      const r = rnd(), sat = rnd() < 0.7 ? (r < .55 ? 5 : r < .87 ? 4 : r < .96 ? 3 : r < .99 ? 2 : 1) : null;
      if (tipo !== 'Detal') comerciales++;
      ventas.push({
        id: 'h' + ventas.length, tx: 'h' + ventas.length, fecha: `${y}-${String(m + 1).padStart(2, '0')}-${String(int(1, lastDay)).padStart(2, '0')}`,
        vendedor: pick(vend), canal: c, metodo: tipo === 'Detal' ? pick(metodo.filter(x => x[0] !== 'Crédito 30 días').map(([a, w]) => [a, w / .84])) : pick(metodo),
        tipo, categoria: p.categoria, productoId: p.id, und: u, monto: Math.round(u * precio * 1.19), costo: u * p.costo,
        cliente: tipo[0] + int(1, pool[tipo]), satisf: sat, reclamo: rnd() < 0.035, ciclo: tipo === 'Detal' ? int(0, 1) : tipo === 'Mayorista' ? int(3, 7) : int(8, 18)
      });
    }
    cot[`${y}-${String(m + 1).padStart(2, '0')}`] = { env: Math.round(comerciales * (1.7 + rnd() * 0.6)), apr: comerciales };
  }
  const prevY = String(hoy.getFullYear() - 1), porMes = {};
  ventas.filter(v => v.fecha.startsWith(prevY)).forEach(v => porMes[v.fecha.slice(5, 7)] = (porMes[v.fecha.slice(5, 7)] || 0) + v.monto);
  const meta = Math.round(Object.values(porMes).reduce((a, b) => a + b, 0) / 12 * 1.05 / 1e6) * 1e6;
  return { ventas, cot, meta, generado: todayISO() };
}

/* Une el historial de ejemplo con las facturas reales del sistema, una fila por prenda vendida. */
function datosVentas() {
  if (DB.data.config.demo && !DB.data.ventasHist) { DB.data.ventasHist = generarHistorial(); DB.save(); }
  const H = DB.data.ventasHist || { ventas: [], cot: {}, meta: 0 };
  const reales = [];
  DB.data.facturas.filter(f => !f.anulada).forEach(f => {
    const cli = DB.find('clientes', f.clienteId), t = Fin.totals(f), k = t.subtotal ? t.total / t.subtotal : 1;
    const vendedor = DB.data.users.find(u => u.usuario === f.vendedor)?.nombre || 'Administradora';
    const metodo = f.forma === 'Crédito' ? 'Crédito 30 días' : (f.abonos?.[0]?.medio || 'Efectivo');
    f.items.forEach((i, n) => {
      const p = DB.find('productos', i.productoId);
      reales.push({ id: f.id + n, tx: f.id, fecha: f.fecha, vendedor, canal: f.canal || (f.cotId ? 'Visita a empresas' : (cli?.tipo === 'Empresa' ? 'Visita a empresas' : 'Salón')), metodo: METODOS.includes(metodo) ? metodo : 'Transferencia',
        tipo: cli?.tipo || 'Detal', categoria: p?.categoria || 'Otro', productoId: i.productoId, und: i.cant, monto: Math.round(i.cant * i.precio * k), costo: i.cant * (p?.costo || 0),
        cliente: f.clienteId || 'CF-' + f.id, satisf: null, reclamo: false, ciclo: f.cotId ? 10 : 0 });
    });
  });
  const cot = { ...H.cot };
  DB.data.cotizaciones.forEach(q => { const k = q.fecha.slice(0, 7); cot[k] = cot[k] || { env: 0, apr: 0 }; if (q.estado !== 'Borrador') cot[k].env++; if (['Aprobada', 'Facturada'].includes(q.estado)) cot[k].apr++; });
  return { ventas: [...H.ventas, ...reales], cot, meta: DB.data.config.metaMensual || H.meta || 30000000 };
}

/* ---------------- Gráficas en SVG ---------------- */
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)'];
function niceScale(min, max, n = 4) {
  if (max === min) max = min + 1;
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw);
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks };
}
const shortCOP = n => { const a = Math.abs(n); return (n < 0 ? '−' : '') + (a >= 1e6 ? (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' M' : a >= 1e3 ? Math.round(a / 1e3) + ' mil' : Math.round(a)); };
function wireTips(el) {
  const tip = document.createElement('div'); tip.className = 'tooltip'; tip.hidden = true; el.appendChild(tip);
  el.addEventListener('pointerover', e => { const t = e.target.closest('[data-tip]'); if (!t) return; tip.hidden = false; tip.innerHTML = t.dataset.tip; });
  el.addEventListener('pointermove', e => { if (tip.hidden) return; const r = el.getBoundingClientRect(); tip.style.left = Math.min(e.clientX - r.left + 12, r.width - tip.offsetWidth - 4) + 'px'; tip.style.top = (e.clientY - r.top - 38) + 'px'; });
  el.addEventListener('pointerout', e => { if (!e.relatedTarget || !el.contains(e.relatedTarget.closest?.('[data-tip]'))) tip.hidden = true; });
}
function axisY(sc, y, L, W, R, fmt) {
  return sc.ticks.map(t => `<line class="grid-line" x1="${L}" x2="${W - R}" y1="${y(t)}" y2="${y(t)}"/><text class="axis-label" x="${L - 5}" y="${y(t) + 3.5}" text-anchor="end">${State.privado && fmt === shortCOP ? '' : fmt(t)}</text>`).join('');
}
/* Barras verticales. signed: barras que bajan de cero en otro color. ref: línea de referencia (meta). */
function vbars(el, labels, vals, o = {}) {
  const W = 360, H = 220, L = 44, R = 8, T = 18, B = 22, fmt = o.fmt || (v => v), tf = o.tipFmt || fmt;
  const sc = niceScale(Math.min(0, ...vals), Math.max(o.ref || 0, ...vals, 0) || 1);
  const y = v => T + (H - T - B) * (1 - (v - sc.lo) / (sc.hi - sc.lo)), bw = (W - L - R) / vals.length, y0 = y(0);
  const imax = vals.indexOf(Math.max(...vals));
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${axisY(sc, y, L, W, R, o.axisFmt || fmt)}
    ${vals.map((v, i) => { const x = L + i * bw + bw * .18, w = bw * .64, top = Math.min(y(v), y0), h = Math.max(1, Math.abs(y(v) - y0)), r = Math.min(4, h);
      const dim = o.sel && o.sel.size && !o.sel.has(i), neg = v < 0;
      const d = neg ? `M${x},${top} H${x + w} V${top + h - r} Q${x + w},${top + h} ${x + w - r},${top + h} H${x + r} Q${x},${top + h} ${x},${top + h - r} Z` : `M${x},${top + h} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${top + h} Z`;
      const lab = (i === imax || i === vals.length - 1) && !State.privado ? `<text class="val-label" x="${x + w / 2}" y="${neg ? top + h + 13 : top - 5}" text-anchor="middle">${fmt(v)}</text>` : '';
      return `<g data-tip="<b>${labels[i]}</b> · ${esc(State.privado && o.money ? '•••' : tf(v))}"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/><path d="${d}" style="fill:${neg ? 'var(--s3)' : (o.color || 'var(--s1)')};opacity:${dim ? .3 : 1}"/>${lab}</g>
      <text class="axis-label" x="${x + w / 2}" y="${H - 6}" text-anchor="middle">${labels[i]}</text>`; }).join('')}
    ${o.ref ? `<line x1="${L}" x2="${W - R}" y1="${y(o.ref)}" y2="${y(o.ref)}" class="ref-line"/><text class="axis-label" x="${W - R}" y="${y(o.ref) - 5}" text-anchor="end">${esc(o.refLabel || '')}</text>` : ''}
    ${sc.lo < 0 ? `<line x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}" class="zero-line"/>` : ''}</svg>`;
  wireTips(el);
}
function lineArea(el, labels, vals, o = {}) {
  const W = 360, H = 220, L = 44, R = 14, T = 20, B = 22, fmt = o.fmt || (v => v);
  const sc = niceScale(0, Math.max(...vals, 0) * 1.08 || 1);
  const step = (W - L - R) / (vals.length - 1 || 1), x = i => L + i * step, y = v => T + (H - T - B) * (1 - (v - sc.lo) / (sc.hi - sc.lo));
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const imax = vals.indexOf(Math.max(...vals)), last = vals.length - 1;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${axisY(sc, y, L, W, R, o.axisFmt || fmt)}
    <defs><linearGradient id="${o.id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:${o.color || 'var(--s1)'};stop-opacity:.35"/><stop offset="1" style="stop-color:${o.color || 'var(--s1)'};stop-opacity:0"/></linearGradient></defs>
    ${o.area !== false ? `<polygon points="${x(0)},${y(sc.lo)} ${pts} ${x(last)},${y(sc.lo)}" fill="url(#${o.id}-g)"/>` : ''}
    <polyline points="${pts}" fill="none" style="stroke:${o.color || 'var(--s1)'}" stroke-width="2" stroke-linejoin="round"/>
    ${vals.map((v, i) => `<g data-tip="<b>${labels[i]}</b> · ${esc(State.privado && o.money ? '•••' : fmt(v))}"><rect x="${x(i) - step / 2}" y="${T}" width="${step}" height="${H - T - B}" fill="transparent"/><circle cx="${x(i)}" cy="${y(v)}" r="${i === last || i === imax ? 4.5 : 3}" style="fill:${o.color || 'var(--s1)'};stroke:var(--panel)" stroke-width="2"/>${(i === imax || i === last) && !(State.privado && o.money) ? `<text class="val-label" x="${x(i)}" y="${y(v) - 10}" text-anchor="middle">${fmt(v)}</text>` : ''}</g>
    <text class="axis-label" x="${x(i)}" y="${H - 8}" text-anchor="middle">${labels[i]}</text>`).join('')}</svg>`;
  wireTips(el);
}
function donut(el, items, o = {}) {
  const total = items.reduce((s, [, v]) => s + v, 0) || 1, R = 78, r = 50, C = 100;
  let a0 = -Math.PI / 2;
  const arcs = items.map(([l, v], i) => {
    const a1 = a0 + v / total * Math.PI * 2, large = a1 - a0 > Math.PI ? 1 : 0;
    const p = (a, rr) => `${C + rr * Math.cos(a)},${C + rr * Math.sin(a)}`;
    const d = `M${p(a0, R)} A${R},${R} 0 ${large} 1 ${p(a1, R)} L${p(a1, r)} A${r},${r} 0 ${large} 0 ${p(a0, r)} Z`;
    const mid = (a0 + a1) / 2, pct = v / total * 100; a0 = a1;
    return `<g data-tip="<b>${esc(l)}</b> · ${pct.toFixed(1).replace('.', ',')}%${o.money && !State.privado ? ' · ' + moneyTxt(v) : ''}"><path d="${d}" style="fill:${SERIES[i % SERIES.length]};stroke:var(--panel)" stroke-width="2"/>${pct >= 7 ? `<text x="${C + (R + r) / 2 * Math.cos(mid)}" y="${C + (R + r) / 2 * Math.sin(mid) + 4}" text-anchor="middle" class="donut-label">${Math.round(pct)}%</text>` : ''}</g>`;
  }).join('');
  el.innerHTML = `<div class="donut-wrap"><svg viewBox="0 0 200 200" role="img" aria-label="${esc(o.label || '')}">${arcs}<text x="${C}" y="${C - 2}" text-anchor="middle" class="donut-total">${State.privado && o.money ? '•••' : (o.center || '')}</text><text x="${C}" y="${C + 16}" text-anchor="middle" class="axis-label">${esc(o.centerLabel || '')}</text></svg>
    <ul class="legend">${items.map(([l, v], i) => `<li><span class="key" style="background:${SERIES[i % SERIES.length]}"></span><span>${esc(l)}</span><b class="num">${(v / total * 100).toFixed(1).replace('.', ',')}%</b></li>`).join('')}</ul></div>`;
  wireTips(el);
}
function grouped(el, labels, series, o = {}) {
  const W = 360, H = 220, L = 30, R = 8, T = 16, B = 22;
  const all = series.flatMap(s => s[1]), sc = niceScale(0, Math.max(...all, 1));
  const y = v => T + (H - T - B) * (1 - v / sc.hi), bw = (W - L - R) / labels.length, gw = bw * .72 / series.length;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.label || '')}">${axisY(sc, y, L, W, R, v => v)}
    ${labels.map((lab, i) => `<g data-tip="<b>${lab}</b> · ${series.map(s => `${esc(s[0])}: ${s[1][i]}`).join(' · ')}"><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent"/>${series.map((s, k) => { const v = s[1][i], x = L + i * bw + bw * .14 + k * (gw + 2), h = Math.max(1, y(0) - y(v)), rr = Math.min(3, h);
      return `<path d="M${x},${y(0)} V${y(v) + rr} Q${x},${y(v)} ${x + rr},${y(v)} H${x + gw - rr} Q${x + gw},${y(v)} ${x + gw},${y(v) + rr} V${y(0)} Z" style="fill:${s[2]};opacity:${o.sel && o.sel.size && !o.sel.has(i) ? .3 : 1}"/>`; }).join('')}</g>
      <text class="axis-label" x="${L + i * bw + bw / 2}" y="${H - 8}" text-anchor="middle">${lab}</text>`).join('')}</svg>
    <ul class="legend inline">${series.map(s => `<li><span class="key" style="background:${s[2]}"></span>${esc(s[0])}</li>`).join('')}</ul>`;
  wireTips(el);
}

/* ---------------- Vista ---------------- */
const Dash = { year: new Date().getFullYear(), meses: new Set(), vendedores: new Set() };
Views.dashboard = (v) => {
  const D = datosVentas();
  const years = [...new Set(D.ventas.map(x => +x.fecha.slice(0, 4)))].sort();
  if (!years.includes(Dash.year) && years.length) Dash.year = years[years.length - 1];
  const vendedores = [...new Set(D.ventas.map(x => x.vendedor))].sort();
  const Y = String(Dash.year), PY = String(Dash.year - 1);
  const byVend = x => !Dash.vendedores.size || Dash.vendedores.has(x.vendedor);
  const byMes = x => !Dash.meses.size || Dash.meses.has(+x.fecha.slice(5, 7) - 1);
  const anio = D.ventas.filter(x => x.fecha.startsWith(Y) && byVend(x));
  const sel = anio.filter(byMes);
  const prev = D.ventas.filter(x => x.fecha.startsWith(PY) && byVend(x) && byMes(x));
  const hoy = new Date(), mesActual = hoy.getFullYear() === Dash.year ? hoy.getMonth() : 11;
  const mesesConDatos = [...new Set(sel.map(x => +x.fecha.slice(5, 7) - 1))];
  const sum = (a, k) => a.reduce((s, x) => s + x[k], 0);
  const txs = a => new Set(a.map(x => x.tx)).size, unicos = a => new Set(a.map(x => x.cliente)).size;
  // Crecimiento contra los mismos meses del año anterior; el mes en curso se compara en proporción a los días corridos.
  const frac = hoy.getFullYear() === Dash.year ? hoy.getDate() / new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate() : 1;
  const prevComparable = prev.filter(x => mesesConDatos.includes(+x.fecha.slice(5, 7) - 1)).reduce((s, x) => s + x.monto * ((+x.fecha.slice(5, 7) - 1) === mesActual && hoy.getFullYear() === Dash.year ? frac : 1), 0);
  const monto = sum(sel, 'monto');
  const crec = prevComparable ? (monto - prevComparable) / prevComparable * 100 : 0;
  const cotKeys = mesesConDatos.map(m => `${Y}-${String(m + 1).padStart(2, '0')}`);
  const env = cotKeys.reduce((s, k) => s + (D.cot[k]?.env || 0), 0), apr = cotKeys.reduce((s, k) => s + (D.cot[k]?.apr || 0), 0);
  const sats = sel.filter(x => x.satisf), sat = sats.length ? sats.reduce((s, x) => s + x.satisf, 0) / sats.length / 5 * 100 : 0;
  const reclamos = txs(sel) ? sel.filter(x => x.reclamo).length / txs(sel) * 100 : 0;
  const nMeses = mesesConDatos.length || 1, metaPeriodo = D.meta * (nMeses - (mesesConDatos.includes(mesActual) && hoy.getFullYear() === Dash.year ? 1 - frac : 0)) * (Dash.vendedores.size ? Dash.vendedores.size / vendedores.length : 1);
  const cumpl = metaPeriodo ? monto / metaPeriodo * 100 : 0;
  const ciclo = sel.length ? sum(sel, 'ciclo') / sel.length : 0;
  const frec = unicos(sel) ? txs(sel) / unicos(sel) : 0;
  const pct = n => n.toFixed(1).replace('.', ',') + '%';
  const porMes = (arr, f) => MESES.map((_, m) => f(arr.filter(x => +x.fecha.slice(5, 7) - 1 === m)));
  const mesesVisibles = Dash.year === hoy.getFullYear() ? hoy.getMonth() + 1 : 12;
  const L = MESES.slice(0, mesesVisibles), cut = a => a.slice(0, mesesVisibles);
  const selIdx = Dash.meses;
  const group = (arr, k) => { const o = {}; arr.forEach(x => o[x[k]] = (o[x[k]] || 0) + x.monto); return o; };
  const best = Object.entries(group(sel, 'vendedor')).sort((a, b) => b[1] - a[1])[0];

  const KPI = [
    ['Monto de ventas', money(monto), `${txs(sel)} ventas · IVA incluido`, 'gastos'],
    ['Tasa de conversión', pct(env ? apr / env * 100 : 0), `${apr} de ${env} cotizaciones aprobadas`, 'cotizaciones'],
    ['Crecimiento de ventas', `<span class="${crec >= 0 ? 'trend-up' : 'trend-down'}">${crec >= 0 ? '▲' : '▼'} ${pct(Math.abs(crec))}</span>`, `frente a ${PY} en los mismos meses`, 'reportes'],
    ['Índice de satisfacción', pct(sat), `${sats.length} encuestas respondidas`, 'mensajes'],
    ['Índice de reclamos', pct(reclamos), `${sel.filter(x => x.reclamo).length} reclamos registrados`, 'auditoria'],
    ['Cumplimiento de meta', pct(cumpl), `Meta ${State.privado ? '•••' : shortCOP(metaPeriodo)} en el período`, 'funciones'],
    ['Tiempo de ciclo', `${ciclo.toFixed(1).replace('.', ',')} días`, 'Del pedido a la entrega', 'produccion'],
    ['Frecuencia de compra', frec.toFixed(1).replace('.', ','), `compras por cliente · ${unicos(sel)} clientes`, 'clientes']
  ];
  v.innerHTML = `<div class="page-head"><div class="flex" style="gap:16px">${logoSVG(54)}<div><div class="eyebrow">Análisis comercial · ${Y}${Dash.meses.size ? ' · ' + [...Dash.meses].sort((a, b) => a - b).map(m => MESES[m]).join(', ') : ''}</div><h1>Dashboard de ventas</h1></div></div>
      <div class="actions"><button class="btn" id="dash-meta">${icon('funciones')} Meta mensual</button><button class="btn" id="dash-csv">${icon('download')} Exportar Excel</button></div></div>
    ${DB.data.config.demo ? '<p class="muted" style="margin:-10px 0 14px;font-size:13px">Incluye un historial de ventas de ejemplo de dos años para la demostración, más las facturas registradas en el sistema.</p>' : ''}
    <div class="slicers card">
      <div><div class="eyebrow">Año</div><div class="seg">${years.map(y => `<button data-year="${y}" class="${y === Dash.year ? 'on' : ''}">${y}</button>`).join('')}</div></div>
      <div><div class="eyebrow">Mes</div><div class="chips">${MESES.map((m, i) => `<button data-mes="${i}" class="${Dash.meses.has(i) ? 'on' : ''}" ${i >= mesesVisibles ? 'disabled' : ''}>${m}</button>`).join('')}</div></div>
      <div style="flex:1;min-width:260px"><div class="eyebrow">Vendedor</div><div class="chips">${vendedores.map(n => `<button data-vend="${esc(n)}" class="${Dash.vendedores.has(n) ? 'on' : ''}">${esc(n)}</button>`).join('')}</div></div>
      ${(Dash.meses.size || Dash.vendedores.size) ? '<button class="btn sm ghost" id="dash-clear" style="align-self:end">Quitar filtros</button>' : ''}
    </div>
    <div class="kpi-strip">${KPI.map(([t, val, f, ic]) => `<div class="card kpi dash-kpi"><div class="flex" style="justify-content:space-between;flex-wrap:nowrap"><span class="eyebrow">${t}</span><span class="kpi-ic">${icon(ic)}</span></div><span class="kpi-value">${val}</span><span class="kpi-foot">${f}</span></div>`).join('')}</div>
    <div class="dash-grid">
      <div class="card"><h3>Prendas vendidas por mes <span class="eyebrow">Unidades</span></h3><div class="chart" id="c-und"></div></div>
      <div class="card"><h3>Ventas por categoría <span class="eyebrow">COP</span></h3><div id="c-cat"></div></div>
      <div class="card"><h3>Ventas por canal <span class="eyebrow">% del monto</span></h3><div class="chart" id="c-canal"></div></div>
      <div class="card"><h3>Ventas por tipo de cliente <span class="eyebrow">COP</span></h3><div class="chart" id="c-tipo"></div></div>
      <div class="card"><h3>Monto de ventas por mes <span class="eyebrow">COP</span></h3><div class="chart" id="c-monto"></div></div>
      <div class="card"><h3>Ventas por vendedor <span class="eyebrow">COP</span></h3><div id="c-vend"></div></div>
      <div class="card"><h3>Ventas por método de pago <span class="eyebrow">% del monto</span></h3><div class="chart" id="c-metodo"></div></div>
      <div class="card"><h3>Clientes por mes <span class="eyebrow">Totales y únicos</span></h3><div class="chart" id="c-cli"></div></div>
      <div class="card"><h3>Costo de ventas por mes <span class="eyebrow">COP</span></h3><div class="chart" id="c-costo"></div></div>
      <div class="card"><h3>Tasa de conversión <span class="eyebrow">Cotizaciones aprobadas</span></h3><div class="chart" id="c-conv"></div></div>
      <div class="card"><h3>Crecimiento de ventas <span class="eyebrow">vs. ${PY}</span></h3><div class="chart" id="c-crec"></div></div>
      <div class="card"><h3>Cumplimiento de meta <span class="eyebrow">% por mes</span></h3><div class="chart" id="c-meta"></div></div>
    </div>
    <div class="grid g-21 mt">
      <div class="card"><h3>Resumen mensual <span class="eyebrow">${Y}</span></h3><div class="table-wrap" style="border:0"><table><thead><tr><th>Mes</th><th class="num">Ventas</th><th class="num">Prendas</th><th class="num">Costo</th><th class="num">Margen</th><th class="num">Clientes</th><th class="num">Meta</th></tr></thead><tbody>
        ${L.map((m, i) => { const a = anio.filter(x => +x.fecha.slice(5, 7) - 1 === i), mo = sum(a, 'monto'), co = sum(a, 'costo'), base = mo / 1.19; return `<tr style="${selIdx.size && !selIdx.has(i) ? 'opacity:.45' : ''}"><td>${m}</td><td class="num">${money(mo)}</td><td class="num">${sum(a, 'und').toLocaleString('es-CO')}</td><td class="num">${money(co)}</td><td class="num">${base ? Math.round((base - co) / base * 100) : 0}%</td><td class="num">${unicos(a)}</td><td class="num">${pct(D.meta ? mo / D.meta * 100 : 0)}</td></tr>`; }).join('')}
      </tbody></table></div></div>
      <div class="card dash-best"><h3>Mejor vendedor <span class="eyebrow">Del período</span></h3>${best ? `<div class="flex"><div class="avatar big">${esc(best[0].split(' ').map(w => w[0]).join('').slice(0, 2))}</div><div><b style="font-size:18px">${esc(best[0])}</b><div class="kpi-value gold" style="font-size:28px">${money(best[1])}</div><div class="muted">${Math.round(best[1] / (monto || 1) * 100)}% del total vendido</div></div></div>` : '<p class="muted">Sin ventas en el período.</p>'}
        <div class="sep mt"></div><p class="muted" style="font-size:13px;margin-top:10px">Los picos de abril, agosto y diciembre coinciden con las fechas legales de entrega de dotación en Colombia: 30 de abril, 31 de agosto y 20 de diciembre.</p></div>
    </div>`;

  vbars($('#c-und', v), L, cut(porMes(anio, a => sum(a, 'und'))), { fmt: n => Math.round(n).toLocaleString('es-CO'), sel: selIdx, label: 'Prendas vendidas por mes' });
  hbars($('#c-cat', v), Object.entries(group(sel, 'categoria')).sort((a, b) => b[1] - a[1]), x => State.privado ? '•••' : shortCOP(x));
  const gc = group(sel, 'canal'), gm = group(sel, 'metodo');
  donut($('#c-canal', v), CANALES.map(c => [c, gc[c] || 0]).filter(x => x[1] > 0), { money: true, center: shortCOP(monto), centerLabel: 'Total', label: 'Ventas por canal' });
  const gt = group(sel, 'tipo');
  vbars($('#c-tipo', v), TIPOS, TIPOS.map(t => gt[t] || 0), { fmt: shortCOP, money: true, tipFmt: moneyTxt, label: 'Ventas por tipo de cliente' });
  lineArea($('#c-monto', v), L, cut(porMes(anio, a => sum(a, 'monto'))), { fmt: shortCOP, money: true, id: 'lm', label: 'Monto de ventas por mes' });
  hbars($('#c-vend', v), Object.entries(group(sel, 'vendedor')).sort((a, b) => b[1] - a[1]), x => State.privado ? '•••' : shortCOP(x));
  donut($('#c-metodo', v), METODOS.map(c => [c, gm[c] || 0]).filter(x => x[1] > 0), { money: true, center: String(txs(sel)), centerLabel: 'Ventas', label: 'Ventas por método de pago' });
  grouped($('#c-cli', v), L, [['Compras', cut(porMes(anio, txs)), 'var(--s1)'], ['Clientes únicos', cut(porMes(anio, unicos)), 'var(--s2)']], { sel: selIdx, label: 'Clientes por mes' });
  vbars($('#c-costo', v), L, cut(porMes(anio, a => sum(a, 'costo'))), { fmt: shortCOP, money: true, tipFmt: moneyTxt, color: 'var(--muted)', sel: selIdx, label: 'Costo de ventas por mes' });
  lineArea($('#c-conv', v), L, L.map((_, i) => { const c = D.cot[`${Y}-${String(i + 1).padStart(2, '0')}`]; return c?.env ? +(c.apr / c.env * 100).toFixed(1) : 0; }), { fmt: n => Math.round(n) + '%', color: 'var(--s2)', id: 'lc', label: 'Tasa de conversión' });
  const prevAll = D.ventas.filter(x => x.fecha.startsWith(PY) && byVend(x));
  vbars($('#c-crec', v), L, L.map((_, i) => { const a = sum(anio.filter(x => +x.fecha.slice(5, 7) - 1 === i), 'monto'), b = sum(prevAll.filter(x => +x.fecha.slice(5, 7) - 1 === i), 'monto') * (i === mesActual && hoy.getFullYear() === Dash.year ? frac : 1); return b ? Math.round((a - b) / b * 100) : 0; }), { fmt: n => (n > 0 ? '+' : '') + n + '%', sel: selIdx, label: 'Crecimiento de ventas' });
  vbars($('#c-meta', v), L, cut(porMes(anio, a => D.meta ? Math.round(sum(a, 'monto') / (D.meta * (Dash.vendedores.size ? Dash.vendedores.size / vendedores.length : 1)) * 100) : 0)), { fmt: n => n + '%', ref: 100, refLabel: 'Meta 100%', sel: selIdx, color: 'var(--s4)', label: 'Cumplimiento de meta' });

  $$('[data-year]', v).forEach(b => b.onclick = () => { Dash.year = +b.dataset.year; Dash.meses.clear(); render(); });
  $$('[data-mes]', v).forEach(b => b.onclick = () => { const m = +b.dataset.mes; Dash.meses.has(m) ? Dash.meses.delete(m) : Dash.meses.add(m); render(); });
  $$('[data-vend]', v).forEach(b => b.onclick = () => { const n = b.dataset.vend; Dash.vendedores.has(n) ? Dash.vendedores.delete(n) : Dash.vendedores.add(n); render(); });
  const cl = $('#dash-clear', v); if (cl) cl.onclick = () => { Dash.meses.clear(); Dash.vendedores.clear(); render(); };
  $('#dash-csv', v).onclick = () => exportCSV('ventas-' + Y, [{ k: 'fecha', label: 'Fecha' }, { k: 'vendedor', label: 'Vendedor' }, { k: 'canal', label: 'Canal' }, { k: 'metodo', label: 'Método de pago' }, { k: 'tipo', label: 'Tipo de cliente' }, { k: 'categoria', label: 'Categoría' }, { k: 'und', label: 'Unidades' }, { k: 'monto', label: 'Monto' }, { k: 'costo', label: 'Costo' }], sel);
  $('#dash-meta', v).onclick = () => modal({
    title: 'Meta mensual de ventas', body: `<p class="muted">El cumplimiento se calcula contra este valor por mes (con IVA).</p><label class="field">Meta mensual<input id="mt-v" type="number" value="${D.meta}"></label>`,
    foot: `<button class="btn ghost" data-close>Cancelar</button><button class="btn primary" id="mt-ok">Guardar</button>`,
    onMount: (el, close) => $('#mt-ok', el).onclick = () => { DB.data.config.metaMensual = +$('#mt-v', el).value; DB.save(); audit('Cambió la meta mensual'); close(); render(); }
  });
};

Object.assign(FUNCIONES, {
  'Dashboard de ventas': ['Monto de ventas del período', 'Tasa de conversión de cotizaciones', 'Crecimiento frente al año anterior', 'Índice de satisfacción de clientes', 'Índice de reclamos', 'Cumplimiento de la meta de ventas', 'Tiempo de ciclo del pedido a la entrega', 'Frecuencia de compra por cliente', 'Filtro por año', 'Filtro por uno o varios meses', 'Filtro por vendedor', 'Prendas vendidas por mes', 'Ventas por categoría', 'Ventas por canal', 'Ventas por tipo de cliente', 'Monto de ventas por mes', 'Ventas por vendedor', 'Ventas por método de pago', 'Clientes totales y únicos por mes', 'Costo de ventas por mes', 'Tasa de conversión por mes', 'Crecimiento de ventas por mes', 'Cumplimiento de meta por mes', 'Resumen mensual con margen', 'Mejor vendedor del período', 'Meta mensual editable', 'Exportar las ventas filtradas a Excel']
});
