/* Probador con maniquí: al tocar una prenda el maniquí aparece con ella puesta, en foto real de estudio. */

/* ---------------- Estado del conjunto ---------------- */
const MQ_SLOT = { top: 'Arriba', bottom: 'Abajo', full: 'Enterizo', head: 'Cabeza', face: 'Rostro' };
const MQ = { outfit: { top: 'p1', bottom: 'p5' }, cant: 1 };
try { const s = JSON.parse(store.get('aurea_mq') || 'null'); if (s && s.outfit) { MQ.outfit = s.outfit; MQ.cant = s.cant || 1; } } catch { /* estado guardado dañado: se usa el conjunto inicial */ }
/* Las vitrinas abiertas escuchan los cambios para quedar iguales al probador. */
const MQ_LISTEN = new Set();
const mqSave = () => { store.set('aurea_mq', JSON.stringify({ outfit: MQ.outfit, cant: MQ.cant })); MQ_LISTEN.forEach(f => f()); };
const MQ_SUGERIDOS = [
  ['Dotación industrial', { top: 'p1', bottom: 'p5', head: 'p7' }],
  ['Alta visibilidad', { top: 'p2', bottom: 'p6', head: 'p7', face: 'p8' }],
  ['Ejecutivo', { top: 'p3', bottom: 'p6' }],
  ['Clima cálido', { top: 'p4', bottom: 'p5' }],
  ['Overol completo', { full: 'p9', head: 'p7' }],
  ['Salud y alimentos', { top: 'p10', bottom: 'p5', face: 'p8' }]
];

/* Parte del cuerpo que ocupa cada prenda. */
function mqKind(p) {
  const c = p.categoria;
  if (c === 'Gorra') return { slot: 'head' };
  if (c === 'Tapabocas') return { slot: 'face' };
  if (c === 'Pantalón') return { slot: 'bottom' };
  if (c === 'Overol') return { slot: 'full' };
  return { slot: 'top' };
}
function mqPoner(outfit, p) {
  const k = mqKind(p), o = { ...outfit };
  if (o[k.slot] === p.id) { delete o[k.slot]; return o; }
  if (k.slot === 'full') { delete o.top; delete o.bottom; }
  if (k.slot === 'top' || k.slot === 'bottom') delete o.full;
  o[k.slot] = p.id;
  return o;
}
const mqItems = (outfit) => ['full', 'top', 'bottom', 'head', 'face'].map(s => outfit[s] && DB.find('productos', outfit[s])).filter(Boolean);
const mqPrecio = (outfit) => mqItems(outfit).reduce((s, p) => s + p.precioDetal, 0);

/* ---------------- Fotos del maniquí vestido ---------------- */
// Una foto por conjunto (prendas en el orden arriba-abajo-gorra-tapabocas); "-b" es la misma vista de espaldas.
const MQ_FOTOS = new Set(['p1-p5', 'p1-p6', 'p2-p5', 'p2-p6', 'p3-p5', 'p3-p6', 'p4-p5', 'p4-p6', 'p10-p5', 'p10-p6', 'p9',
  'p1-p5-p7', 'p1-p6-p7', 'p2-p5-p7', 'p2-p6-p7', 'p9-p7', 'p1-p5-p8', 'p2-p6-p8', 'p10-p5-p8', 'p10-p6-p8', 'p1-p5-p7-p8', 'p2-p6-p7-p8']);
const MQ_ESPALDA = new Set(['p1-p5', 'p1-p6', 'p2-p5', 'p2-p6', 'p3-p5', 'p3-p6', 'p4-p5', 'p4-p6', 'p10-p5', 'p10-p6', 'p9']);
const MQ_MUESTRA = { top: 'p3', bottom: 'p5' };
const mqSrc = (k) => `img/maniqui/${k}.jpg`;
/* Elige la foto que corresponde al conjunto; completa con una prenda de muestra si falta arriba o abajo. */
function mqFoto(outfit) {
  const o = outfit || {}, muestra = [];
  if (!['full', 'top', 'bottom', 'head', 'face'].some(s => o[s])) return { front: mqSrc('vacio'), back: null, muestra, faltan: [] };
  let base;
  if (o.full) base = [o.full];
  else {
    // Solo gorra o tapabocas: se muestran con la dotación industrial, que tiene foto con cada accesorio.
    const m = !o.top && !o.bottom ? { top: 'p1', bottom: 'p5' } : MQ_MUESTRA;
    const top = o.top || m.top, bottom = o.bottom || m.bottom;
    if (!o.top) muestra.push(top);
    if (!o.bottom) muestra.push(bottom);
    base = [top, bottom];
  }
  const key = base.join('-'), acc = [o.head, o.face].filter(Boolean);
  if (!MQ_FOTOS.has(key)) return { front: null, back: null, muestra, faltan: [] };
  const opciones = [[...base, ...acc], ...acc.map(a => [...base, a]), base];
  const elegida = opciones.find(c => MQ_FOTOS.has(c.join('-')));
  return { front: mqSrc(elegida.join('-')), back: MQ_ESPALDA.has(key) ? mqSrc(key + '-b') : null, muestra, faltan: acc.filter(a => !elegida.includes(a)) };
}
const MQ_VISTAS = { completo: [1, 50, 50], torso: [1.8, 50, 28], piernas: [1.6, 50, 86], cabeza: [2.6, 50, 3] };

/* Monta el maniquí en una caja; devuelve un control para vestirlo, girarlo, acercarlo y tomarle foto. */
function mqStage(box, { outfit = MQ.outfit, onChange } = {}) {
  const ctl = { outfit: { ...outfit }, auto: true };
  let lado = 'frente', z = [...MQ_VISTAS.completo], cur = null, loaded = Promise.resolve(), drag = null;
  box.classList.add('mq-photo');
  box.innerHTML = `<div class="mq-turn"><div class="mq-zoom"><img class="mq-img" alt=""><img class="mq-img" alt=""></div></div>
    <div class="mq-sweep"></div><div class="mq-lado"></div><div class="mq-tags"></div><div class="mq-hint">${icon('rotr')} Deslice para darle la vuelta</div>`;
  const imgs = $$('.mq-img', box), zoomEl = $('.mq-zoom', box), turnEl = $('.mq-turn', box);
  let front = 0;
  const applyZoom = () => { zoomEl.style.transform = `scale(${z[0]})`; zoomEl.style.transformOrigin = `${z[1]}% ${z[2]}%`; box.classList.toggle('zoomed', z[0] > 1.01); };
  const show = (src, vestir) => {
    if (!src || src === cur) return loaded;
    cur = src;
    const next = imgs[1 - front], prev = imgs[front];
    loaded = new Promise(res => {
      next.onload = () => {
        next.classList.add('on'); prev.classList.remove('on'); front = 1 - front;
        if (vestir) { box.classList.remove('vistiendo'); void box.offsetWidth; box.classList.add('vistiendo'); }
        res();
      };
      next.onerror = () => res();
    });
    next.src = src;
    return loaded;
  };
  const paint = (vestir) => {
    const f = mqFoto(ctl.outfit);
    if (lado === 'espalda' && !f.back) lado = 'frente';
    box.classList.toggle('sin-foto', !f.front);
    if (!f.front) {
      cur = null; imgs.forEach(i => i.classList.remove('on'));
      $('.mq-tags', box).innerHTML = `<div class="mq-fallback">${mqItems(ctl.outfit).map(p => prodArt(p, 120)).join('')}</div>`;
    } else {
      const tags = [...f.muestra.map(id => { const p = DB.find('productos', id); return p ? `<span class="mq-tag">${esc(p.nombre)} de muestra</span>` : ''; }),
        ...f.faltan.map(id => { const p = DB.find('productos', id); return p ? `<span class="mq-tag add"><span class="mq-th xs">${prodArt(p, 24)}</span>También lleva ${esc(p.nombre.toLowerCase())}</span>` : ''; })].join('');
      $('.mq-tags', box).innerHTML = tags;
    }
    $('.mq-lado', box).textContent = f.front ? (lado === 'espalda' ? 'De espaldas' : 'De frente') : '';
    box.classList.toggle('con-espalda', !!f.back);
    return show(lado === 'espalda' ? f.back : f.front, vestir);
  };
  const turn = () => {
    const f = mqFoto(ctl.outfit);
    if (!f.back) { box.classList.add('nudge'); setTimeout(() => box.classList.remove('nudge'), 500); return; }
    turnEl.classList.add('out');
    setTimeout(() => { lado = lado === 'frente' ? 'espalda' : 'frente'; paint(false).then(() => { turnEl.classList.remove('out'); turnEl.classList.add('in'); requestAnimationFrame(() => requestAnimationFrame(() => turnEl.classList.remove('in'))); }); }, 230);
  };
  ctl.set = (o) => { ctl.outfit = { ...o }; return paint(true); };
  ctl.put = (p) => {
    ctl.outfit = mqPoner(ctl.outfit, p);
    const k = mqKind(p);
    if (ctl.outfit[k.slot] === p.id) ctl.view(k.slot === 'head' || k.slot === 'face' ? 'cabeza' : 'completo');
    onChange && onChange(ctl.outfit);
    return paint(true);
  };
  ctl.view = (v) => { if (MQ_VISTAS[v]) { z = [...MQ_VISTAS[v]]; applyZoom(); } };
  ctl.zoom = (f) => { z[0] = Math.max(1, Math.min(4, z[0] * f)); applyZoom(); };
  ctl.spin = () => turn();
  ctl.isAlive = () => box.isConnected;
  ctl.waitIdle = () => loaded;
  ctl.refresh = () => {};
  /* Foto del conjunto, siempre de frente y de cuerpo entero, para la cotización o para enviar. */
  ctl.snapshot = (w = 600, h = 800) => {
    const src = mqFoto(ctl.outfit).front, img = imgs.find(i => i.src.endsWith(src || '#')) || imgs[front];
    if (!src || !img.complete || !img.naturalWidth) return null;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    x.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
    return c.toDataURL('image/jpeg', 0.84);
  };
  // Gestos: deslizar de lado da la vuelta; con zoom, arrastrar mueve la vista; la rueda acerca.
  box.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, ox: z[1], oy: z[2] }; box.setPointerCapture?.(e.pointerId); });
  box.addEventListener('pointermove', e => {
    if (!drag || z[0] <= 1.01) return;
    const r = box.getBoundingClientRect();
    z[1] = Math.max(0, Math.min(100, drag.ox - (e.clientX - drag.x) / r.width * 100 / (z[0] - 1)));
    z[2] = Math.max(0, Math.min(100, drag.oy - (e.clientY - drag.y) / r.height * 100 / (z[0] - 1)));
    applyZoom();
  });
  box.addEventListener('pointerup', e => { if (drag && z[0] <= 1.01 && Math.abs(e.clientX - drag.x) > 40) turn(); drag = null; });
  box.addEventListener('pointercancel', () => drag = null);
  box.addEventListener('wheel', e => { e.preventDefault(); ctl.zoom(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  applyZoom(); paint(false);
  mqStage.last = ctl;
  return ctl;
}

/* ---------------- Interfaz del probador ---------------- */
function mqCtrlHTML() {
  return `<div class="mq-ctrl">
    <div class="seg mq-vistas">${[['completo', 'Completo'], ['torso', 'Torso'], ['piernas', 'Piernas'], ['cabeza', 'Cabeza']].map(([k, l]) => `<button data-mqv="${k}" class="${k === 'completo' ? 'on' : ''}">${l}</button>`).join('')}</div>
    <span class="mq-ctrl-r"><button class="btn sm" data-mqrot aria-label="Darle la vuelta al maniquí">${icon('rotr')} Girar</button>
    <button class="icon-btn" data-mqz="1.25" aria-label="Acercar" title="Acercar">${icon('plus')}</button><button class="icon-btn" data-mqz="0.8" aria-label="Alejar" title="Alejar">${icon('minus')}</button></span>
  </div>`;
}
function mqWireCtrl(el, ctl) {
  $$('[data-mqv]', el).forEach(b => b.onclick = () => { ctl.view(b.dataset.mqv); $$('[data-mqv]', el).forEach(x => x.classList.toggle('on', x === b)); });
  $$('[data-mqrot]', el).forEach(b => b.onclick = () => ctl.spin());
  $$('[data-mqz]', el).forEach(b => b.onclick = () => ctl.zoom(+b.dataset.mqz));
}
const mqTelaTxt = (p) => `${telaDe(p)} · ${p.color}`;

/* Probador completo: maniquí, prendas para tocar, lo que tiene puesto y acciones de venta. */
function mqPanel(host, { onClose } = {}) {
  const prods = DB.data.productos;
  const grupos = [['top', 'Camisas y chaquetas'], ['bottom', 'Pantalones'], ['full', 'Overoles'], ['head', 'Gorras'], ['face', 'Tapabocas']];
  host.innerHTML = `<div class="mq">
    <div class="mq-stage"><div class="mq-box" id="mq-box"></div>${mqCtrlHTML()}</div>
    <div class="mq-side">
      <div><div class="eyebrow">Toque una prenda y el maniquí se la pone</div><p class="muted" style="margin:4px 0 0;font-size:13.5px">Tóquela otra vez para quitársela. Deslice la foto o toque Girar para verlo de espaldas.</p></div>
      ${grupos.map(([s, l]) => { const it = prods.filter(p => mqKind(p).slot === s); return it.length ? `<div><div class="eyebrow mq-gl">${l}</div><div class="mq-grid">${it.map(p => `<button class="mq-item" data-mqp="${p.id}" title="${esc(p.nombre)}"><span class="mq-th">${prodArt(p, 70)}</span><span class="mq-nm">${esc(p.nombre)}</span><span class="mq-ok">${icon('check')}</span></button>`).join('')}</div></div>` : ''; }).join('')}
      <div><div class="eyebrow mq-gl">Conjuntos sugeridos</div><div class="flex">${MQ_SUGERIDOS.map(([n], i) => `<button class="v3d-chip" data-mqs="${i}">${esc(n)}</button>`).join('')}</div></div>
      <div class="card mq-puesto" id="mq-puesto"></div>
    </div></div>`;
  const ctl = mqStage($('#mq-box', host), { onChange: () => paint() });
  mqWireCtrl(host, ctl);
  const paint = () => {
    MQ.outfit = ctl.outfit; mqSave();
    $$('[data-mqp]', host).forEach(b => b.classList.toggle('on', Object.values(ctl.outfit).includes(b.dataset.mqp)));
    const it = mqItems(ctl.outfit), cant = MQ.cant || 1;
    $('#mq-puesto', host).innerHTML = `<h3 style="margin-bottom:10px">Puesto en el maniquí</h3>
      ${it.map(p => `<div class="mq-line"><span class="mq-th sm">${prodArt(p, 40)}</span><div class="grow"><b>${esc(p.nombre)}</b><small class="muted">${esc(MQ_SLOT[mqKind(p).slot])} · ${esc(mqTelaTxt(p))} · ${money(p.precioDetal)}</small></div><button class="icon-btn" data-mqx="${p.id}" aria-label="Quitar ${esc(p.nombre)}">${icon('x')}</button></div>`).join('') || '<p class="muted">El maniquí está sin ropa. Toque una prenda.</p>'}
      ${it.length ? `<div class="mq-tot"><label class="field" style="width:120px">Conjuntos<input id="mq-cant" type="number" min="1" value="${cant}"></label><div class="right"><span class="eyebrow">Valor del conjunto</span><div class="kpi-value gold" style="font-size:28px">${money(it.reduce((s, p) => s + Fin.precioPara(p, cant, null), 0) * cant)}</div><small class="muted">${cant > 1 ? cant + ' conjuntos · precio por mayor desde el mínimo' : 'Precio al detal'}</small></div></div>
      <div class="flex mq-acts"><button class="btn primary" id="mq-cot">${icon('cotizaciones')} Cotizar conjunto con foto</button><button class="btn" id="mq-ped">${icon('pos')} Agregar al pedido</button><button class="btn" id="mq-pos">${icon('pos')} Vender en salón</button><button class="btn ghost" id="mq-foto">${icon('camera')} Guardar foto</button></div>` : ''}`;
    $$('[data-mqx]', host).forEach(b => b.onclick = () => ctl.put(DB.find('productos', b.dataset.mqx)));
    const ci = $('#mq-cant', host); if (ci) ci.onchange = () => { MQ.cant = Math.max(1, Math.round(+ci.value || 1)); paint(); };
    const lineas = () => it.map(p => ({ productoId: p.id, desc: p.nombre, talla: 'M', cant, precio: Fin.precioPara(p, cant, null) }));
    const b1 = $('#mq-cot', host); if (b1) b1.onclick = () => {
      const foto = ctl.snapshot(480, 640); onClose && onClose();
      docEditor('cotizacion', { items: lineas(), descuento: 0, clienteId: '', estado: 'Borrador', ivaPct: DB.data.config.ivaPct, notas: 'Conjunto armado en el probador con maniquí: ' + it.map(p => p.nombre).join(' + ') + '.', maniqui: foto });
    };
    const b2 = $('#mq-ped', host); if (b2) b2.onclick = () => { lineas().forEach(l => { const ex = Cat.pedido.find(i => i.productoId === l.productoId && i.talla === l.talla); if (ex) ex.cant += l.cant; else Cat.pedido.push({ ...l, precio: DB.find('productos', l.productoId).precioDetal }); }); toast('Conjunto agregado al pedido del catálogo'); };
    const b3 = $('#mq-pos', host); if (b3) b3.onclick = () => { lineas().forEach(l => { const ex = Cart.items.find(i => i.productoId === l.productoId && i.talla === l.talla); if (ex) ex.cant += l.cant; else Cart.items.push({ ...l }); }); onClose && onClose(); go('pos'); toast('Conjunto en la venta actual'); };
    const b4 = $('#mq-foto', host); if (b4) b4.onclick = () => { const u = ctl.snapshot(720, 960); if (!u) return toast('Este conjunto todavía no tiene foto en el maniquí.', true); const a = document.createElement('a'); a.href = u; a.download = 'conjunto-maniqui.jpg'; a.click(); toast('Foto del conjunto descargada'); };
  };
  $$('[data-mqp]', host).forEach(b => b.onclick = () => { ctl.put(DB.find('productos', b.dataset.mqp)); paint(); });
  $$('[data-mqs]', host).forEach(b => b.onclick = () => { const o = MQ_SUGERIDOS[b.dataset.mqs][1]; const ok = {}; for (const [s, id] of Object.entries(o)) if (DB.find('productos', id)) ok[s] = id; ctl.set(ok); ctl.view('completo'); $$('[data-mqv]', host).forEach(x => x.classList.toggle('on', x.dataset.mqv === 'completo')); paint(); });
  paint();
  return ctl;
}

/* Abrir el probador en una ventana, opcionalmente con una prenda ya puesta. */
function abrirManiqui(p) {
  if (p && !Object.values(MQ.outfit).includes(p.id)) { MQ.outfit = mqPoner(MQ.outfit, p); mqSave(); }
  modal({
    title: 'Probador con maniquí', wide: true, body: '<div id="mq-modal"></div>',
    onMount: (el, close) => { el.querySelector('.modal').classList.add('mq-modal'); const ctl = mqPanel($('#mq-modal', el), { onClose: close }); if (p && ['head', 'face'].includes(mqKind(p).slot)) ctl.view('cabeza'); }
  });
}

/* Vitrina compacta para incrustar en otras pantallas. */
function mqVitrina(host, { titulo = 'Probador con maniquí', texto = '', outfit } = {}) {
  host.innerHTML = `<div class="card mq-vit"><div class="mq-vit-stage"><div class="mq-box" data-mqbox></div>${mqCtrlHTML()}</div>
    <div class="mq-vit-info"><div class="eyebrow">${esc(titulo)}</div><div data-mqinfo></div>${texto ? `<p class="muted" style="font-size:13.5px;margin:0">${texto}</p>` : ''}<div class="flex"><button class="btn primary" data-mqopen>${icon('maniqui')} Abrir probador completo</button></div></div></div>`;
  const ctl = mqStage($('[data-mqbox]', host), { outfit: outfit || MQ.outfit, onChange: () => { if (!outfit) { MQ.outfit = ctl.outfit; mqSave(); } info(); } });
  mqWireCtrl(host, ctl);
  const info = () => {
    const it = mqItems(ctl.outfit);
    $('[data-mqinfo]', host).innerHTML = `${it.map(p => `<div class="mq-line"><span class="mq-th sm">${prodArt(p, 36)}</span><div class="grow"><b>${esc(p.nombre)}</b><small class="muted">${esc(mqTelaTxt(p))} · ${money(p.precioDetal)}</small></div><button class="icon-btn" data-mqx="${p.id}" aria-label="Quitar">${icon('x')}</button></div>`).join('') || '<p class="muted" style="margin:0">Sin prendas puestas.</p>'}
      ${it.length ? `<div class="mq-tot sm"><span class="muted">Conjunto</span><b class="gold">${money(mqPrecio(ctl.outfit))}</b></div>` : ''}`;
    $$('[data-mqx]', host).forEach(b => b.onclick = () => ctl.put(DB.find('productos', b.dataset.mqx)));
  };
  $('[data-mqopen]', host).onclick = () => { MQ.outfit = ctl.outfit; mqSave(); abrirManiqui(); };
  info();
  ctl.refresh = info;
  if (!outfit) {
    const f = () => { if (!ctl.isAlive()) return MQ_LISTEN.delete(f); if (JSON.stringify(ctl.outfit) !== JSON.stringify(MQ.outfit)) ctl.set(MQ.outfit); info(); mqSyncPuts(); };
    MQ_LISTEN.add(f);
  }
  return ctl;
}
const mqSyncPuts = () => $$('[data-mqput]').forEach(x => { const s = x.querySelector('span'); if (!s) return; const on = Object.values(MQ.outfit).includes(x.dataset.mqput); x.classList.toggle('on', on); s.textContent = on ? 'Puesta' : 'Ponérsela'; });

/* La cotización muestra la foto del conjunto puesto en el maniquí. */
const mqBaseDoc = docHTML;
docHTML = function (d, kind) {
  const h = mqBaseDoc(d, kind);
  if (!d.maniqui || !/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(d.maniqui)) return h;
  return h.replace('<div class="lx-bottom">', `<div class="lx-look"><img src="${d.maniqui}" alt="Conjunto puesto en el maniquí"><div><div class="lx-eye">Así se verá su conjunto</div><p>Foto del conjunto puesto en nuestro maniquí de vitrina, con las prendas de esta cotización.</p></div></div><div class="lx-bottom">`);
};

/* ---------------- Página propia ---------------- */
ICONS.maniqui = '<circle cx="12" cy="3.6" r="1.8"/><path d="M8.5 7.5h7l-.8 4 .8 3.5h-7l.8-3.5z"/><path d="M12 15v5M8.5 21h7"/>';
ICONS.rotr = '<path d="M21 12a9 9 0 11-9-9 9.5 9.5 0 016.5 2.7L21 8"/><path d="M21 3v5h-5"/>';
ICONS.minus = ICONS.minus || '<path d="M5 12h14"/>';
NAV.find(g => g[0] === 'Comercial')[1].splice(1, 0, ['maniqui', 'Probador con maniquí']);
['secretaria', 'vendedor', 'produccion'].forEach(r => { const m = ROLES[r].modulos; if (m !== '*' && !m.includes('maniqui')) m.push('maniqui'); });

Views.maniqui = (v) => {
  v.innerHTML = pageHead('Vitrina de estudio', 'Probador con maniquí', `<button class="btn" id="mq-go-cat">${icon('catalogo')} Ir al catálogo</button>`) + '<div id="mq-page"></div>';
  $('#mq-go-cat', v).onclick = () => go('catalogo');
  mqPanel($('#mq-page', v));
};

/* ---------------- El maniquí en las demás pantallas ---------------- */
/* Catálogo: vitrina arriba y botón «Ponérsela» en cada prenda. */
const mqBaseCatalogo = Views.catalogo;
Views.catalogo = (v) => {
  mqBaseCatalogo(v);
  $('.page-head', v).insertAdjacentHTML('afterend', '<div id="mq-cat" class="mq-cat"></div>');
  const ctl = mqVitrina($('#mq-cat', v), { titulo: 'Vitrina con maniquí', texto: 'Toque <b>Ponérsela</b> en cualquier prenda del catálogo y el maniquí aparece con ella puesta.' });
  $$('.cat-card', v).forEach(card => {
    const p = DB.find('productos', card.dataset.p); if (!p) return;
    const w = document.createElement('div'); w.className = 'cat-wrap'; card.replaceWith(w); w.appendChild(card);
    w.insertAdjacentHTML('beforeend', `<button class="mq-put" data-mqput="${p.id}">${icon('maniqui')} <span></span></button>`);
  });
  mqSyncPuts();
  $$('[data-mqput]', v).forEach(b => b.onclick = () => {
    ctl.put(DB.find('productos', b.dataset.mqput));
    $('#mq-cat', v).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
};

/* Ficha, visor 3D y elección de talla en el salón: acceso directo al maniquí. */
const mqBaseFicha = fichaProducto;
fichaProducto = function (p) {
  mqBaseFicha(p);
  const ov = $$('.overlay').pop(); if (!ov) return;
  const foot = $('.modal-foot', ov);
  foot.insertAdjacentHTML('afterbegin', `<button class="btn primary" data-mqf>${icon('maniqui')} Ponérsela al maniquí</button>`);
  $('[data-mqf]', foot).onclick = () => { ov.remove(); abrirManiqui(p); };
  const art = $('.cat-art.big', ov);
  if (art) { art.insertAdjacentHTML('beforeend', `<button class="v3d-badge mq-badge" data-mqf2>${icon('maniqui')} En maniquí</button>`); $('[data-mqf2]', art).onclick = () => { ov.remove(); abrirManiqui(p); }; }
};
const mqBasePick = pickSize;
pickSize = function (p) {
  mqBasePick(p);
  const ov = $$('.overlay').pop(); if (!ov) return;
  const foot = $('.modal-foot', ov);
  $('[data-3d]', foot)?.insertAdjacentHTML('afterend', `<button class="btn ghost" data-mqf>${icon('maniqui')} En maniquí</button>`);
  $('[data-mqf]', foot).onclick = () => { ov.remove(); abrirManiqui(p); };
};
const mqBaseViewer = viewer3D;
viewer3D = function (p, startTab) {
  mqBaseViewer(p, startTab);
  const ov = $$('.overlay').pop(); if (!ov) return;
  const foot = $('.modal-foot', ov);
  foot.insertAdjacentHTML('afterbegin', `<button class="btn" data-mqf>${icon('maniqui')} Ver puesta en maniquí</button>`);
  $('[data-mqf]', foot).onclick = () => { ov.remove(); abrirManiqui(p); };
};

/* Salón de ventas: el maniquí aparece con lo que el cliente va a llevar. */
const mqBasePos = Views.pos;
Views.pos = (v) => {
  mqBasePos(v);
  const cart = $('.cart', v); if (!cart) return;
  let outfit = {};
  Cart.items.forEach(i => { const p = DB.find('productos', i.productoId); if (p && !Object.values(outfit).includes(p.id)) outfit = mqPoner(outfit, p); });
  cart.insertAdjacentHTML('afterbegin', `<div class="mq-mini"><div class="mq-box" data-mqbox></div><div class="mq-mini-cap"><span class="eyebrow">${Cart.items.length ? 'Así se le ve al cliente' : 'Agregue prendas y el maniquí se las pone'}</span><button class="btn sm" data-mqopen>${icon('maniqui')} Probador</button></div></div>`);
  mqStage($('[data-mqbox]', cart), { outfit });
  $('[data-mqopen]', cart).onclick = () => { if (Object.keys(outfit).length) { MQ.outfit = outfit; mqSave(); } abrirManiqui(); };
  $$('.prod-tile', v).forEach(t => {
    const p = DB.find('productos', t.dataset.add); if (!p) return;
    const w = document.createElement('div'); w.className = 'cat-wrap'; t.replaceWith(w); w.appendChild(t);
    w.insertAdjacentHTML('beforeend', `<button class="mq-put sm" data-mqput="${p.id}" title="Ver en maniquí" aria-label="Ver ${esc(p.nombre)} en el maniquí">${icon('maniqui')}</button>`);
  });
  $$('[data-mqput]', v).forEach(b => b.onclick = () => abrirManiqui(DB.find('productos', b.dataset.mqput)));
};

/* Inventario de telas: cada tela de la bodega puesta en la prenda que se confecciona con ella. */
const MQ_INV = {};
const mqPrendaDeTela = (t) => DB.data.productos.find(q => telaDe(q) === t.tipo && (q.color || '').toLowerCase() === (t.color || '').toLowerCase()) || DB.data.productos.find(q => telaDe(q) === t.tipo);
const mqBaseInv = Views.inventario;
Views.inventario = (v) => {
  mqBaseInv(v);
  if (invTab !== 'telas') return;
  const telas = DB.data.telas.filter(t => mqPrendaDeTela(t));
  if (!telas.length) return;
  $('.tabs', v).insertAdjacentHTML('afterend', '<div id="mq-inv"></div>');
  const host = $('#mq-inv', v);
  let tela = telas.find(t => t.id === MQ_INV.tela) || telas[0];
  const outfitDe = () => { const p = mqPrendaDeTela(tela), o = mqPoner({}, p), s = mqKind(p).slot; if (s === 'top') o.bottom = 'p5'; if (s === 'bottom') o.top = 'p3'; return o; };
  host.innerHTML = `<div class="card mq-vit mq-inv"><div class="mq-vit-stage"><div class="mq-box" data-mqbox></div>${mqCtrlHTML()}</div>
    <div class="mq-vit-info"><div class="eyebrow">Probador de telas</div><h3 style="margin:0">Así se ve cada tela de la bodega puesta</h3>
      <div><div class="eyebrow mq-gl">Toque una tela</div><div class="mq-telas">${telas.map(t => { const f = DB.data.productos.find(q => q.telaFoto && telaDe(q) === t.tipo && q.color === t.color); return `<button class="mq-tela ${t.id === tela.id ? 'on' : ''}" data-mqtel="${t.id}"><span class="mq-tsw" style="background:${swatch(t.color)}${f ? `;background-image:url('${esc(f.telaFoto)}')` : ''}"></span><span><b>${esc(t.nombre)}</b><small class="muted">${esc(t.color)} · ${t.metros} m · ${esc(t.ubicacion)}</small></span></button>`; }).join('')}</div></div>
      <div data-mqinfo class="muted" style="font-size:13px"></div>
      <div class="flex"><button class="btn primary" data-mqopen>${icon('maniqui')} Abrir en el probador</button></div></div></div>`;
  const ctl = mqStage($('[data-mqbox]', host), { outfit: outfitDe() });
  mqWireCtrl(host, ctl);
  const info = () => { const p = mqPrendaDeTela(tela); $('[data-mqinfo]', host).innerHTML = `<b>${esc(p.nombre)}</b> en ${esc(tela.nombre)} ${esc(tela.color)}: con ${tela.metros} m salen unas ${Math.floor(tela.metros / (p.metrosPorUnidad || 1.5))} prendas.`; };
  $$('[data-mqtel]', host).forEach(b => b.onclick = () => { tela = DB.find('telas', b.dataset.mqtel); MQ_INV.tela = tela.id; $$('[data-mqtel]', host).forEach(x => x.classList.toggle('on', x === b)); ctl.set(outfitDe()); info(); });
  $('[data-mqopen]', host).onclick = () => { MQ.outfit = outfitDe(); mqSave(); abrirManiqui(); };
  info();
  $$('tbody tr', v).forEach(tr => {
    const b = $('[data-edit]', tr), t = b && DB.find('telas', b.dataset.edit);
    if (!t || !mqPrendaDeTela(t)) return;
    b.insertAdjacentHTML('beforebegin', `<button class="btn sm" data-mqrow="${t.id}" title="Ver puesta en maniquí" aria-label="Ver puesta en maniquí">${icon('maniqui')}</button>`);
  });
  $$('[data-mqrow]', v).forEach(b => b.onclick = () => abrirManiqui(mqPrendaDeTela(DB.find('telas', b.dataset.mqrow))));
};

/* Productos y precios: botón por prenda. */
const mqBaseProd = Views.productos;
Views.productos = (v) => {
  mqBaseProd(v);
  $$('[data-edit]', v).forEach(b => {
    if (!DB.find('productos', b.dataset.edit)) return;
    b.insertAdjacentHTML('beforebegin', `<button class="btn sm" data-mqrow="${b.dataset.edit}" title="Ver en maniquí" aria-label="Ver en maniquí">${icon('maniqui')}</button>`);
  });
  $$('[data-mqrow]', v).forEach(b => b.onclick = () => abrirManiqui(DB.find('productos', b.dataset.mqrow)));
};

/* Panel de inicio: vitrina con el conjunto más vendido. */
const mqBasePanel = Views.panel;
Views.panel = (v) => {
  mqBasePanel(v);
  const head = $('.page-head', v);
  if (!head) return;
  const units = {};
  DB.data.facturas.filter(f => !f.anulada).forEach(f => f.items.forEach(i => units[i.productoId] = (units[i.productoId] || 0) + i.cant));
  let outfit = {};
  Object.entries(units).sort((a, b) => b[1] - a[1]).forEach(([id]) => {
    const p = DB.find('productos', id); if (!p) return;
    const s = mqKind(p).slot;
    if (!outfit[s] && !(s !== 'full' && ['top', 'bottom'].includes(s) && outfit.full) && !(s === 'full' && (outfit.top || outfit.bottom))) outfit[s] = id;
  });
  if (!mqFoto(outfit).front) outfit = { top: 'p1', bottom: 'p5', head: 'p7' };
  ($('.grid.g-4', v) || head).insertAdjacentHTML('afterend', '<div id="mq-panel" class="mq-cat mq-after"></div>');
  mqVitrina($('#mq-panel', v), { titulo: 'Vitrina · lo más vendido', texto: 'El maniquí lleva las prendas que más se venden. Toque una para quitarla o abra el probador para armar otro conjunto.', outfit });
};

Object.assign(FUNCIONES, {
  'Probador con maniquí': ['Maniquí con foto real de estudio que se viste al tocar una prenda', 'Tocar otra vez la prenda para quitársela', 'Camisas, chaquetas, pantalones, overoles, gorras y tapabocas puestos en el maniquí', 'Ropa con su tela, color, pliegues y costuras reales', 'Ver el conjunto de frente y de espaldas', 'Darle la vuelta al maniquí deslizando el dedo', 'Acercar al torso, las piernas o la cabeza', 'Prenda de muestra para completar la foto cuando falta una parte', 'Conjuntos sugeridos con un toque', 'Valor del conjunto al detal y por mayor', 'Cotizar el conjunto con la foto del maniquí', 'Agregar el conjunto al pedido o a la venta del salón', 'Descargar la foto del conjunto para enviar al cliente', 'Vitrina con maniquí en el panel, el catálogo y el salón de ventas', 'Probador de telas en el inventario', 'Botón «Ver en maniquí» en productos, ficha y visor 3D']
});
