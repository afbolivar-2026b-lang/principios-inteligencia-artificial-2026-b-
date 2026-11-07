/* Probador 3D (prenda y tela) y documentos de lujo para cotizaciones y facturas. */

/* ---------------- Telas: ficha técnica ---------------- */
const FABRICS = {
  Drill: { nombre: 'Drill 100% algodón', comp: '100% algodón', gramaje: '270 g/m²', tejido: 'Sarga 3/1', props: ['Resistente a la abrasión', 'Respirable', 'Ideal para dotación industrial'], cuidado: 'Lavar a 40 °C. No usar blanqueador.', weave: 'twill', period: 8, rough: 0.86 },
  Oxford: { nombre: 'Oxford premium', comp: '100% algodón peinado', gramaje: '135 g/m²', tejido: 'Panamá 2×1 (cesta)', props: ['Tacto suave', 'Textura de doble tono', 'Camisa de vestir'], cuidado: 'Lavar a 30 °C. Planchar tibio.', weave: 'oxford', period: 8, rough: 0.72 },
  Lino: { nombre: 'Lino importado', comp: '100% lino', gramaje: '160 g/m²', tejido: 'Tafetán con hilos irregulares', props: ['Muy fresco', 'Caída natural', 'Ideal para clima cálido'], cuidado: 'Lavar a mano o ciclo delicado.', weave: 'linen', period: 8, rough: 0.9 },
  Jean: { nombre: 'Denim 14 oz', comp: '100% algodón índigo', gramaje: '475 g/m²', tejido: 'Sarga 3/1 índigo', props: ['Muy durable', 'Se aclara con el uso', 'Pantalón industrial'], cuidado: 'Lavar al revés con agua fría.', weave: 'denim', period: 8, rough: 0.88 },
  Gabardina: { nombre: 'Gabardina stretch', comp: '97% algodón, 3% elastano', gramaje: '240 g/m²', tejido: 'Sarga 2/1', props: ['Elasticidad cómoda', 'Poco arrugado', 'Pantalón de trabajo'], cuidado: 'Lavar a 30 °C. No secar a máquina.', weave: 'twill', period: 4, rough: 0.8 },
  Algodón: { nombre: 'Twill de algodón', comp: '100% algodón', gramaje: '220 g/m²', tejido: 'Sarga 2/1', props: ['Firme y liviano', 'Recibe bien el bordado', 'Gorras y camisetas'], cuidado: 'Lavar a mano. Secar a la sombra.', weave: 'twill', period: 4, rough: 0.82 },
  Antifluido: { nombre: 'Antifluido repelente', comp: '100% poliéster con acabado repelente', gramaje: '150 g/m²', tejido: 'Tafetán compacto', props: ['Repele fluidos', 'Secado rápido', 'Uso médico y de alimentos'], cuidado: 'Lavar a 40 °C. Sin suavizante.', weave: 'plain', period: 4, rough: 0.48 }
};
const TELA_POR_PRODUCTO = { p1: 'Drill', p2: 'Drill', p3: 'Oxford', p4: 'Lino', p5: 'Jean', p6: 'Gabardina', p7: 'Algodón', p8: 'Antifluido', p9: 'Drill', p10: 'Antifluido' };
const TELA_POR_CATEGORIA = { 'Camisa industrial': 'Drill', 'Camisa de salir': 'Oxford', 'Pantalón': 'Gabardina', 'Gorra': 'Algodón', 'Tapabocas': 'Antifluido', 'Overol': 'Drill', 'Dotación médica': 'Antifluido', 'Chaqueta': 'Drill' };
const telaDe = (p) => p.tela || TELA_POR_PRODUCTO[p.id] || TELA_POR_CATEGORIA[p.categoria] || 'Drill';

const prevMigrate = window.AUREA_MIGRATE;
window.AUREA_MIGRATE = function (data, withSeed) {
  prevMigrate && prevMigrate(data, withSeed);
  const c = data.config;
  const def = { banco: 'Bancolombia', tipoCuenta: 'Ahorros', cuenta: '000-000000-00', titular: c.empresa, anticipoPct: 50, entregaDias: 15, firmaNombre: 'Dirección general', firmaCargo: c.empresa, instagram: '@aurea.atelier',
    condiciones: 'Los precios incluyen confección, marquilla y empaque individual. El bordado del logo se incluye cuando aparece en la descripción. Tallas especiales (XXL en adelante) tienen un recargo del 10%.' };
  for (const k in def) if (c[k] === undefined) c[k] = def[k];
  data.productos.forEach(p => { if (!p.tela) p.tela = telaDe(p); if (p.telaFoto === undefined && /^p([1-9]|10)$/.test(p.id)) p.telaFoto = `img/telas/${p.id}.jpg`; });
};

/* ---------------- Texturas de tejido generadas ---------------- */
function hexRGB(h) { const n = parseInt(h.replace('#', ''), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function weaveCanvases(tipo, hex, S = 256) {
  const f = FABRICS[tipo] || FABRICS.Drill, p = f.period;
  const [r, g, b] = hexRGB(hex);
  const H = new Float32Array(S * S), col = document.createElement('canvas'), nor = document.createElement('canvas');
  col.width = col.height = nor.width = nor.height = S;
  const cx = col.getContext('2d'), nx = nor.getContext('2d');
  const ci = cx.createImageData(S, S), ni = nx.createImageData(S, S);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const slub = Array.from({ length: S / 4 }, () => 0.75 + rnd() * 0.5);
  const TAU = Math.PI * 2;
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let h, k = 1;
    if (f.weave === 'twill' || f.weave === 'denim') {
      h = Math.pow(0.5 + 0.5 * Math.sin(TAU * (x + y) / p), 1.4) * 0.8 + 0.2 * (0.5 + 0.5 * Math.sin(TAU * y / (p / 2)));
      if (f.weave === 'denim') k = 0.55 + 0.6 * h;
    } else if (f.weave === 'oxford') {
      const cell = (Math.floor(x / (p / 2)) + Math.floor(y / (p / 2))) % 2;
      h = cell ? 0.55 + 0.45 * Math.sin(Math.PI * (x % (p / 2)) / (p / 2)) : 0.55 + 0.45 * Math.sin(Math.PI * (y % (p / 2)) / (p / 2));
      k = cell ? 1.08 : 0.9;
    } else {
      const s = f.weave === 'linen' ? slub[y >> 2] : 1;
      h = 0.5 + 0.25 * s * (Math.sin(TAU * x / p) + Math.sin(TAU * y / p));
      if (f.weave === 'linen') k = 0.9 + 0.2 * (s - 0.75);
    }
    h += (rnd() - 0.5) * 0.08;
    H[y * S + x] = h;
    const shade = (0.72 + 0.38 * h) * k, i = (y * S + x) * 4;
    if (f.weave === 'denim') { const w = Math.max(0, 0.42 - h) * 0.75; ci.data[i] = (r * shade) * (1 - w) + 205 * w; ci.data[i + 1] = (g * shade) * (1 - w) + 210 * w; ci.data[i + 2] = (b * shade) * (1 - w) + 220 * w; }
    else { ci.data[i] = r * shade; ci.data[i + 1] = g * shade; ci.data[i + 2] = b * shade; }
    ci.data[i + 3] = 255;
  }
  const at = (x, y) => H[((y + S) % S) * S + ((x + S) % S)];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 2.2, dy = (at(x, y + 1) - at(x, y - 1)) * 2.2;
    const len = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    ni.data[i] = (-dx / len * 0.5 + 0.5) * 255; ni.data[i + 1] = (dy / len * 0.5 + 0.5) * 255; ni.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
  }
  cx.putImageData(ci, 0, 0); nx.putImageData(ni, 0, 0);
  return { col, nor, rough: f.rough };
}

/* Textura a partir de una foto macro real de la tela; con tinte se recolorea conservando la luz y el tejido. */
function photoFabric(img, tintHex, S = 512) {
  const col = document.createElement('canvas'), nor = document.createElement('canvas');
  col.width = col.height = nor.width = nor.height = S;
  const cx = col.getContext('2d'); cx.drawImage(img, 0, 0, S, S);
  const im = cx.getImageData(0, 0, S, S), d = im.data, L = new Float32Array(S * S);
  let avg = 0;
  for (let i = 0; i < S * S; i++) { L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255; avg += L[i]; }
  avg /= S * S;
  if (tintHex) {
    const [r, g, b] = hexRGB(tintHex);
    for (let i = 0; i < S * S; i++) { const k = Math.min(1.8, L[i] / Math.max(0.05, avg)); d[i * 4] = Math.min(255, r * k); d[i * 4 + 1] = Math.min(255, g * k); d[i * 4 + 2] = Math.min(255, b * k); }
    cx.putImageData(im, 0, 0);
  }
  const nx = nor.getContext('2d'), ni = nx.createImageData(S, S);
  const at = (x, y) => L[Math.min(S - 1, Math.max(0, y)) * S + Math.min(S - 1, Math.max(0, x))];
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (at(x + 1, y) - at(x - 1, y)) * 3.2, dy = (at(x, y + 1) - at(x, y - 1)) * 3.2;
    const len = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
    ni.data[i] = (-dx / len * 0.5 + 0.5) * 255; ni.data[i + 1] = (dy / len * 0.5 + 0.5) * 255; ni.data[i + 2] = (1 / len * 0.5 + 0.5) * 255; ni.data[i + 3] = 255;
  }
  nx.putImageData(ni, 0, 0);
  return { col, nor };
}

/* ---------------- Carga de three.js ---------------- */
function loadThree() {
  if (window.THREE) return Promise.resolve(window.THREE);
  return new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s.onload = () => res(window.THREE);
    s.onerror = () => rej(new Error('No se pudo cargar el visor 3D. Revise la conexión a internet.'));
    document.head.appendChild(s);
  });
}
function loadImage(src) {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('No se pudo abrir la foto.')); i.src = src; });
}

/* Relieve a partir de la foto: lo que se separa del fondo se infla hacia el frente. */
function depthFromPhoto(img, N = 129) {
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d'); x.drawImage(img, 0, 0, N, N);
  const d = x.getImageData(0, 0, N, N).data;
  const corner = (cx, cy) => { let s = [0, 0, 0]; for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) { const k = ((cy + j) * N + cx + i) * 4; s[0] += d[k]; s[1] += d[k + 1]; s[2] += d[k + 2]; } return s.map(v => v / 36); };
  const bgs = [corner(0, 0), corner(N - 6, 0), corner(0, N - 6), corner(N - 6, N - 6)];
  const bg = [0, 1, 2].map(k => bgs.reduce((a, s) => a + s[k], 0) / 4);
  let m = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) {
    const diff = (Math.abs(d[i * 4] - bg[0]) + Math.abs(d[i * 4 + 1] - bg[1]) + Math.abs(d[i * 4 + 2] - bg[2])) / 3 / 255;
    const t = Math.min(1, Math.max(0, (diff - 0.05) / 0.12)); m[i] = t * t * (3 - 2 * t);
  }
  const blur = (src, r) => { const o = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const X = xx + k; if (X >= 0 && X < N) { s += src[y * N + X]; n++; } } o[y * N + xx] = s / n; } const o2 = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const Y = y + k; if (Y >= 0 && Y < N) { s += o[Y * N + xx]; n++; } } o2[y * N + xx] = s / n; } return o2; };
  m = blur(blur(m, 4), 3);
  for (let y = 0; y < N; y++) for (let xx = 0; xx < N; xx++) { const u = xx / (N - 1) - 0.5, v = y / (N - 1) - 0.5; m[y * N + xx] = m[y * N + xx] * 0.94 + Math.max(0, 1 - (u * u + v * v) * 4) * 0.06; }
  return m;
}
function edgeAlpha(S = 128) {
  const c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d'), im = x.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let xx = 0; xx < S; xx++) {
    const e = Math.min(xx, y, S - 1 - xx, S - 1 - y) / S; const a = Math.min(1, e / 0.16) * 255, i = (y * S + xx) * 4;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = a; im.data[i + 3] = 255;
  }
  x.putImageData(im, 0, 0); return c;
}

/* ---------------- Visor ---------------- */
function viewer3D(p, startTab = 'prenda') {
  const tipo = telaDe(p), fab = FABRICS[tipo];
  const telas = DB.data.telas.filter(t => t.tipo === tipo || (tipo === 'Algodón' && t.tipo === 'Algodón'));
  const opciones = [{ id: '', color: p.color, metros: null }, ...telas.filter(t => t.color.toLowerCase() !== (p.color || '').toLowerCase()).map(t => ({ id: t.id, color: t.color, metros: t.metros, ubicacion: t.ubicacion }))];
  const prop = telas.find(t => t.color.toLowerCase() === (p.color || '').toLowerCase());
  const src = p.foto || p.imagen;
  let tab = src ? startTab : 'tela', colorSel = p.color, auto = true, zoom = 0;
  modal({
    title: 'Probador 3D · ' + p.nombre, wide: true,
    body: `<div class="v3d">
      <div class="v3d-stage"><div class="tabs v3d-tabs">${src ? '<button data-t="prenda">Prenda en 3D</button>' : ''}<button data-t="tela">Tela en 3D</button>${src ? '<button data-t="lupa">Lupa</button>' : ''}</div>
        <div class="v3d-canvas" id="v3d-canvas"><div class="v3d-load">Preparando el visor 3D…</div></div>
        <div class="v3d-ctrl"><button class="btn sm" id="v3d-auto">Pausar giro</button><button class="btn sm" id="v3d-out" aria-label="Alejar">−</button><button class="btn sm" id="v3d-in" aria-label="Acercar">+</button><button class="btn sm ghost" id="v3d-reset">Restablecer</button><span class="muted" id="v3d-hint">Arrastre para girar</span></div></div>
      <div class="v3d-info"><div class="eyebrow">${esc(p.categoria)} · ${esc(p.sku)}</div><h3 style="font-size:28px;margin:0">${esc(p.nombre)}</h3>
        <div><span class="kpi-value gold">${money(p.precioDetal)}</span><div class="muted">Por mayor ${money(p.precioMayor)} desde ${p.minMayor} unidades</div></div>
        <div class="mini v3d-tela">${p.telaFoto ? `<img src="${esc(p.telaFoto)}" alt="Tela de la prenda">` : ''}<div><span class="eyebrow">Tela</span><b>${esc(fab.nombre)}</b><span class="muted" style="font-size:13px">${esc(fab.comp)} · ${esc(fab.gramaje)} · ${esc(fab.tejido)}</span></div></div>
        <ul class="v3d-props">${fab.props.map(x => `<li>${esc(x)}</li>`).join('')}<li>${esc(fab.cuidado)}</li></ul>
        <div><div class="eyebrow" style="margin-bottom:6px">Colores de esta tela en bodega</div><div class="flex" id="v3d-colors">${opciones.map(o => `<button class="v3d-chip ${o.color === colorSel ? 'on' : ''}" data-c="${esc(o.color)}" title="${esc(o.color)}"><span style="background:${swatch(o.color)}"></span>${esc(o.color)}</button>`).join('')}</div>
          <p class="muted" id="v3d-stock" style="font-size:13px;margin:6px 0 0">${prop ? `${prop.metros} m disponibles · ${esc(prop.ubicacion)}` : 'Color de la prenda'}</p></div>
      </div></div>`,
    foot: `<button class="btn" id="v3d-ficha">Ver ficha</button><button class="btn primary" id="v3d-cot">${icon('cotizaciones')} Cotizar esta prenda</button>`,
    onMount: async (el, close) => {
      const box = $('#v3d-canvas', el);
      $('#v3d-cot', el).onclick = () => { close(); cotizarPrenda(p); };
      $('#v3d-ficha', el).onclick = () => { close(); fichaProducto(p); };
      let THREE, renderer, scene, camera, mesh, key, rim, raf, clock0 = performance.now(), drag = null, rotX = 0, rotY = 0, tRotX = 0, tRotY = 0, lastDrag = 0, mode = null;
      const setTabs = () => $$('[data-t]', el).forEach(b => b.classList.toggle('on', b.dataset.t === tab));
      const stop = () => { cancelAnimationFrame(raf); if (renderer) { renderer.dispose(); renderer.domElement.remove(); renderer = null; } };
      const fallback = (msg) => {
        stop(); box.innerHTML = src ? `<div class="v3d-tilt"><img src="${esc(src)}" alt=""></div><p class="muted v3d-msg">${esc(msg)}</p>` : `<p class="muted v3d-msg">${esc(msg)}</p>`;
        const t = $('.v3d-tilt', box); if (t) box.onpointermove = e => { const r = box.getBoundingClientRect(); const u = (e.clientX - r.left) / r.width - 0.5, v = (e.clientY - r.top) / r.height - 0.5; t.style.transform = `perspective(900px) rotateY(${u * 24}deg) rotateX(${-v * 16}deg)`; };
      };
      const lupa = () => {
        stop(); mode = 'lupa';
        box.innerHTML = `<div class="v3d-lupa" style="background-image:url('${esc(src)}')"><div class="lens" hidden></div></div>`;
        $('#v3d-hint', el).textContent = 'Pase el dedo o el mouse para ver la tela de cerca';
        const z = $('.v3d-lupa', box), lens = $('.lens', box);
        z.onpointermove = e => { const r = z.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top; lens.hidden = false; lens.style.left = x + 'px'; lens.style.top = y + 'px'; lens.style.backgroundImage = `url('${src}')`; lens.style.backgroundSize = `${r.width * 3}px ${r.height * 3}px`; lens.style.backgroundPosition = `${-x * 3 + 80}px ${-y * 3 + 80}px`; };
        z.onpointerleave = () => lens.hidden = true;
      };
      const build = async () => {
        setTabs();
        if (tab === 'lupa') return lupa();
        $('#v3d-hint', el).textContent = 'Arrastre para girar · use + y − para acercar';
        try { THREE = await loadThree(); } catch (e) { return fallback(e.message); }
        stop();
        try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { return fallback('Este equipo no permite gráficos 3D; se muestra la vista con relieve.'); }
        box.innerHTML = ''; box.appendChild(renderer.domElement);
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        renderer.outputEncoding = THREE.sRGBEncoding; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
        scene.add(new THREE.HemisphereLight(0xfff4e0, 0x1a1510, 0.55));
        key = new THREE.DirectionalLight(0xfff1d6, 1.25); key.position.set(-2, 2.5, 4); scene.add(key);
        rim = new THREE.DirectionalLight(0xe3c98f, 1.1); rim.position.set(3, 1.5, -3); scene.add(rim);
        const fill = new THREE.PointLight(0xc9a45c, 0.5, 12); fill.position.set(2.5, -1.5, 3); scene.add(fill);
        if (tab === 'prenda') {
          mode = 'prenda';
          const img = await loadImage(src);
          const N = 129, dep = depthFromPhoto(img, N);
          const geo = new THREE.PlaneGeometry(3, 3, N - 1, N - 1), pos = geo.attributes.position;
          for (let i = 0; i < pos.count; i++) pos.setZ(i, dep[i] * 0.55);
          geo.computeVertexNormals();
          const tex = new THREE.Texture(img); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 8; tex.needsUpdate = true;
          const alpha = new THREE.CanvasTexture(edgeAlpha());
          mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 0.012, roughness: fab.rough, metalness: 0, alphaMap: alpha, transparent: true, side: THREE.DoubleSide }));
          scene.add(mesh); camera.position.set(0, 0, 6.2 - zoom);
        } else {
          mode = 'tela';
          // Foto real de la tela: la del color elegido si otra prenda la tiene, o la propia recoloreada.
          const same = DB.data.productos.find(q => q.telaFoto && telaDe(q) === tipo && q.color === colorSel);
          const fotoTela = same?.telaFoto || p.telaFoto;
          let w;
          if (fotoTela) { w = photoFabric(await loadImage(fotoTela), same ? null : swatch(colorSel)); w.rough = fab.rough; }
          else w = weaveCanvases(tipo, swatch(colorSel));
          const map = new THREE.CanvasTexture(w.col), nmap = new THREE.CanvasTexture(w.nor);
          [map, nmap].forEach(t => { t.wrapS = t.wrapT = fotoTela ? THREE.MirroredRepeatWrapping : THREE.RepeatWrapping; t.repeat.set(fotoTela ? 1.3 : 2.6, fotoTela ? 0.95 : 1.9); t.anisotropy = 8; });
          map.encoding = THREE.sRGBEncoding;
          const geo = new THREE.PlaneGeometry(2.7, 1.95, 150, 110);
          geo.userData.base = Float32Array.from(geo.attributes.position.array);
          mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, normalMap: nmap, normalScale: new THREE.Vector2(fotoTela ? 1.4 : 2.2, fotoTela ? 1.4 : 2.2), roughness: w.rough, metalness: 0, side: THREE.DoubleSide }));
          mesh.rotation.x = -0.55; mesh.rotation.z = 0.12; renderer.toneMappingExposure = 0.95; scene.add(mesh); camera.position.set(0, 0, 5.4 - zoom);
        }
        const resize = () => { const r = box.getBoundingClientRect(); renderer.setSize(r.width, r.height, false); renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%'; camera.aspect = r.width / r.height; camera.updateProjectionMatrix(); };
        resize();
        const loop = () => {
          if (!renderer || !renderer.domElement.isConnected) return stop();
          // AUREA_V3D.t permite fijar el tiempo para grabar cuadros exactos (video de presentación).
          const fixed = window.AUREA_V3D && window.AUREA_V3D.t != null;
          const t = fixed ? window.AUREA_V3D.t : (performance.now() - clock0) / 1000;
          if (fixed && t === loop.lastT) { raf = requestAnimationFrame(loop); return; }
          loop.lastT = t;
          if (auto && (fixed || performance.now() - lastDrag > 1800)) { tRotY = Math.sin(t * 0.55) * (mode === 'prenda' ? 0.55 : 0.3); tRotX = Math.sin(t * 0.35) * 0.08; }
          if (fixed) { rotX = tRotX; rotY = tRotY; } else { rotX += (tRotX - rotX) * 0.08; rotY += (tRotY - rotY) * 0.08; }
          mesh.rotation.y = rotY; mesh.rotation.x = (mode === 'tela' ? -0.55 : 0) + rotX;
          if (mode === 'tela') {
            const a = mesh.geometry.attributes.position, base = mesh.geometry.userData.base;
            for (let i = 0; i < a.count; i++) { const x = base[i * 3], y = base[i * 3 + 1]; a.setZ(i, Math.sin(x * 1.6 + t * 1.1) * 0.12 + Math.sin(y * 2.3 + x * 0.6 + t * 0.8) * 0.07 + Math.exp(-Math.pow(x - 0.4 * Math.sin(t * 0.3), 2) * 3) * 0.18); }
            a.needsUpdate = true; mesh.geometry.computeVertexNormals();
          }
          renderer.render(scene, camera); raf = requestAnimationFrame(loop);
        };
        loop();
      };
      const cv = box;
      cv.addEventListener('pointerdown', e => { if (mode === 'lupa') return; drag = { x: e.clientX, y: e.clientY, ry: tRotY, rx: tRotX }; cv.setPointerCapture?.(e.pointerId); });
      cv.addEventListener('pointermove', e => {
        if (mode !== 'lupa' && key) { const r = cv.getBoundingClientRect(); key.position.x = ((e.clientX - r.left) / r.width - 0.5) * 8; key.position.y = (0.5 - (e.clientY - r.top) / r.height) * 6; }
        if (!drag) return; lastDrag = performance.now();
        tRotY = Math.max(-0.95, Math.min(0.95, drag.ry + (e.clientX - drag.x) * 0.01)); tRotX = Math.max(-0.4, Math.min(0.4, drag.rx + (e.clientY - drag.y) * 0.006));
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => cv.addEventListener(ev, () => drag = null));
      const setZoom = (dz) => { zoom = Math.max(-1.5, Math.min(mode === 'tela' ? 3.8 : 3.4, zoom + dz)); if (camera) camera.position.z = (mode === 'tela' ? 5.4 : 6.2) - zoom; };
      cv.addEventListener('wheel', e => { if (mode === 'lupa') return; e.preventDefault(); setZoom(-e.deltaY * 0.003); }, { passive: false });
      $('#v3d-in', el).onclick = () => setZoom(0.6);
      $('#v3d-out', el).onclick = () => setZoom(-0.6);
      $('#v3d-reset', el).onclick = () => { zoom = 0; tRotX = tRotY = 0; setZoom(0); };
      $('#v3d-auto', el).onclick = (e) => { auto = !auto; e.target.textContent = auto ? 'Pausar giro' : 'Girar solo'; if (!auto) { tRotX = tRotY = 0; } };
      $$('[data-t]', el).forEach(b => b.onclick = () => { tab = b.dataset.t; zoom = 0; build(); });
      $$('[data-c]', el).forEach(b => b.onclick = () => {
        colorSel = b.dataset.c; $$('[data-c]', el).forEach(x => x.classList.toggle('on', x === b));
        const t = DB.data.telas.find(x => x.color === colorSel && (x.tipo === tipo));
        $('#v3d-stock', el).textContent = t ? `${t.metros} m disponibles · ${t.ubicacion}` : 'Color de la prenda';
        if (tab !== 'tela') tab = 'tela'; build();
      });
      build();
    }
  });
}

function cotizarPrenda(p, talla = 'M') {
  const cant = p.minMayor || 12;
  docEditor('cotizacion', { items: [{ productoId: p.id, desc: p.nombre, talla, cant, precio: Fin.precioPara(p, cant, null) }], descuento: 0, clienteId: '', estado: 'Borrador', ivaPct: DB.data.config.ivaPct, notas: '' });
}

/* Botones del probador en la ficha del catálogo y al elegir talla en el salón. */
const baseFicha = fichaProducto;
fichaProducto = function (p) {
  baseFicha(p);
  const ov = $$('.overlay').pop(); if (!ov) return;
  const foot = $('.modal-foot', ov);
  foot.insertAdjacentHTML('afterbegin', `<button class="btn" data-3d>${icon('catalogo')} Ver en 3D</button><button class="btn" data-cotp>${icon('cotizaciones')} Cotizar esta prenda</button>`);
  $('[data-3d]', foot).onclick = () => { ov.remove(); viewer3D(p); };
  $('[data-cotp]', foot).onclick = () => { ov.remove(); cotizarPrenda(p, $('#fp-t', ov)?.value || 'M'); };
  const art = $('.cat-art.big', ov);
  if (art) { art.insertAdjacentHTML('beforeend', `<button class="v3d-badge" data-3d2>${icon('catalogo')} Ver en 3D</button>`); $('[data-3d2]', art).onclick = () => { ov.remove(); viewer3D(p); }; }
};
const basePick = pickSize;
pickSize = function (p) {
  basePick(p);
  const ov = $$('.overlay').pop(); if (!ov) return;
  const foot = $('.modal-foot', ov);
  foot.insertAdjacentHTML('afterbegin', `<button class="btn ghost" data-3d style="margin-right:auto">${icon('catalogo')} Ver en 3D</button>`);
  $('[data-3d]', foot).onclick = () => { ov.remove(); viewer3D(p); };
};

/* ---------------- Documento de lujo ---------------- */
docHTML = function (d, kind) {
  const c = DB.data.config, cli = DB.find('clientes', d.clienteId), t = Fin.totals(d), isF = kind === 'factura';
  const [first, ...rest] = c.empresa.split(' ');
  const vendedor = DB.data.users.find(u => u.usuario === d.vendedor)?.nombre || State.user?.nombre || '';
  const lines = d.items.map(i => {
    const p = DB.find('productos', i.productoId), f = p ? FABRICS[telaDe(p)] : null;
    return `<tr><td><div class="lx-item"><div class="lx-thumb">${p ? prodArt(p, 46) : ''}</div><div><b>${esc(i.desc)}</b><small>Talla ${esc(i.talla)}${f ? ' · ' + esc(f.nombre) : ''}${p ? ' · ' + esc(p.color) : ''}</small></div></div></td><td class="num">${i.cant}</td><td class="num">${moneyTxt(i.precio)}</td><td class="num"><b>${moneyTxt(i.cant * i.precio)}</b></td></tr>`;
  }).join('');
  const diasVal = Math.max(0, daysBetween(d.fecha, d.vence));
  return `<div class="lx" id="doc-print">
    <div class="lx-wm">${logoSVG(420)}</div>
    <header class="lx-band"><div class="lx-brand">${logoSVG(70)}<div><div class="lx-name">${esc(first.toUpperCase())}</div><div class="lx-sub">${esc(rest.join(' '))}${rest.length ? ' · ' : ''}${esc(c.eslogan)}</div></div></div>
      <div class="lx-title"><div class="lx-kind">${isF ? 'Factura de venta' : 'Cotización'}</div><div class="lx-num">${esc(d.num)}</div><div class="lx-dates">Emitida ${fmtDate(d.fecha)}<br>${isF ? 'Vence ' + fmtDate(d.vence) : 'Válida hasta ' + fmtDate(d.vence)}</div></div></header>
    <div class="lx-rule"></div>
    <section class="lx-body">
      <div class="lx-parties">
        <div><div class="lx-eye">${isF ? 'Facturado a' : 'Preparada para'}</div><b>${esc(cli?.nombre || 'Consumidor final')}</b>${cli ? `<span>${cli.tipo === 'Empresa' ? 'NIT' : 'Doc.'} ${esc(cli.doc)}</span><span>${esc(cli.ciudad)} · ${esc(cli.tel)}</span>${cli.email ? `<span>${esc(cli.email)}</span>` : ''}` : ''}</div>
        <div><div class="lx-eye">Emitida por</div><b>${esc(c.empresa)}</b><span>NIT ${esc(c.nit)}</span><span>${esc(c.direccion)}, ${esc(c.ciudad)}</span><span>Atendió: ${esc(vendedor)}</span></div>
        <div class="lx-sum"><div class="lx-eye">${isF ? 'Saldo por pagar' : 'Valor total'}</div><div class="lx-big">${moneyTxt(isF ? Fin.saldo(d) : t.total)}</div><span>${d.items.reduce((s, i) => s + i.cant, 0)} prendas · IVA incluido</span></div>
      </div>
      <table class="lx-table"><thead><tr><th>Prenda</th><th class="num">Cant.</th><th class="num">Valor unitario</th><th class="num">Total</th></tr></thead><tbody>${lines}</tbody></table>
      <div class="lx-bottom">
        <div class="lx-terms">
          ${d.notas ? `<div class="lx-eye">Notas</div><p>${esc(d.notas)}</p>` : ''}
          ${isF ? `<div class="lx-eye">Facturación</div><p>${esc(c.resolucion)}. Forma de pago: ${esc(d.forma)}${d.plazo ? ' a ' + d.plazo + ' días' : ''}.</p>`
            : `<div class="lx-eye">Condiciones comerciales</div><ul><li>Validez de la oferta: ${diasVal} días.</li><li>Anticipo del ${esc(c.anticipoPct)}% para iniciar la confección; saldo contra entrega.</li><li>Entrega en ${esc(c.entregaDias)} días hábiles después del anticipo.</li><li>${esc(c.condiciones)}</li></ul>`}
          <div class="lx-eye">Datos para el pago</div><p>${esc(c.banco)} · Cuenta de ${esc(String(c.tipoCuenta).toLowerCase())} ${esc(c.cuenta)}<br>Titular: ${esc(c.titular)} · NIT ${esc(c.nit)}</p>
        </div>
        <div class="lx-totals"><div><span>Subtotal</span><span>${moneyTxt(t.subtotal)}</span></div>${t.desc ? `<div><span>Descuento ${d.descuento}%</span><span>− ${moneyTxt(t.desc)}</span></div>` : ''}<div><span>Base</span><span>${moneyTxt(t.base)}</span></div><div><span>IVA ${d.ivaPct}%</span><span>${moneyTxt(t.iva)}</span></div>
          <div class="lx-grand"><span>Total</span><span>${moneyTxt(t.total)}</span></div>
          ${isF ? `<div><span>Pagado</span><span>${moneyTxt(Fin.pagado(d))}</span></div><div><b>Saldo</b><b>${moneyTxt(Fin.saldo(d))}</b></div>` : `<div><span>Anticipo ${esc(c.anticipoPct)}%</span><span>${moneyTxt(Math.round(t.total * c.anticipoPct / 100))}</span></div>`}</div>
      </div>
      ${isF ? '' : `<div class="lx-sign"><div><div class="lx-line"></div><b>${esc(c.firmaNombre)}</b><span>${esc(c.firmaCargo)}</span></div><div><div class="lx-line"></div><b>Aceptación del cliente</b><span>Nombre, firma y fecha</span></div></div>`}
    </section>
    <footer class="lx-foot"><span>${esc(c.direccion)} · ${esc(c.ciudad)}</span><span>${esc(c.tel)}</span><span>${esc(c.email)}</span><span>${esc(c.instagram || '')}</span></footer>
  </div>`;
};

verDocumento = function (d, kind) {
  const cli = DB.find('clientes', d.clienteId), t = Fin.totals(d);
  const msg = kind === 'factura'
    ? `Hola ${cli?.nombre || ''}, le compartimos la factura ${d.num} de ${DB.data.config.empresa} por ${moneyTxt(t.total)}. Saldo: ${moneyTxt(Fin.saldo(d))}. ¡Gracias por su compra!`
    : `Hola ${cli?.nombre || ''}, le compartimos la cotización ${d.num} de ${DB.data.config.empresa} por ${moneyTxt(t.total)}, válida hasta ${fmtDate(d.vence)}. Quedamos atentos.`;
  modal({
    title: (kind === 'factura' ? 'Factura ' : 'Cotización ') + d.num, wide: true, body: docHTML(d, kind),
    foot: `${cli?.tel ? `<a class="btn" href="${waLink(cli.tel, msg)}" target="_blank" rel="noopener">${icon('send')} Enviar por WhatsApp</a>` : ''}
      <button class="btn" id="doc-copy">Copiar mensaje</button>
      ${inFrame ? '' : `<button class="btn primary" id="doc-print-btn">${icon('print')} Imprimir / Guardar PDF</button>`}`,
    onMount: (el) => {
      $('#doc-copy', el).onclick = async () => { try { await navigator.clipboard.writeText(msg); toast('Mensaje copiado'); } catch { toast(msg); } };
      const pb = $('#doc-print-btn', el);
      if (pb) pb.onclick = () => { document.body.classList.add('printing'); window.print(); setTimeout(() => document.body.classList.remove('printing'), 500); };
    }
  });
};

/* ---------------- Configuración de cotizaciones ---------------- */
const F_DOCS = [
  { k: 'banco', label: 'Banco' }, { k: 'tipoCuenta', label: 'Tipo de cuenta', type: 'select', options: ['Ahorros', 'Corriente'] }, { k: 'cuenta', label: 'Número de cuenta' }, { k: 'titular', label: 'Titular' },
  { k: 'anticipoPct', label: 'Anticipo %', type: 'number' }, { k: 'entregaDias', label: 'Días de entrega', type: 'number' },
  { k: 'firmaNombre', label: 'Firma: nombre' }, { k: 'firmaCargo', label: 'Firma: cargo' }, { k: 'instagram', label: 'Instagram o página web' },
  { k: 'condiciones', label: 'Condiciones comerciales', type: 'textarea', full: true }
];
const baseConfig = Views.config;
Views.config = (v) => {
  baseConfig(v);
  const c = DB.data.config;
  v.insertAdjacentHTML('beforeend', `<div class="card mt"><h3>Cotizaciones y facturas <span class="eyebrow">Aparece en cada documento con el logo</span></h3><div id="cfg-docs">${formFields(F_DOCS, c)}</div><div class="flex mt"><button class="btn primary" id="cfg-docs-save">${icon('check')} Guardar</button><button class="btn" id="cfg-docs-prev">Ver cotización de muestra</button></div></div>`);
  $('#cfg-docs-save', v).onclick = () => { try { Object.assign(c, readForm($('#cfg-docs', v), F_DOCS)); DB.save(); audit('Actualizó datos de cotizaciones'); toast('Datos de cotización guardados'); } catch (e) { toast(e.message, true); } };
  $('#cfg-docs-prev', v).onclick = () => { const q = DB.data.cotizaciones[0]; if (q) verDocumento(q, 'cotizacion'); else toast('Cree una cotización primero.', true); };
};

/* Acceso rápido a cotizar desde el catálogo. */
const baseCatalogo = Views.catalogo;
Views.catalogo = (v) => {
  baseCatalogo(v);
  const a = $('.page-head .actions', v);
  a.insertAdjacentHTML('afterbegin', `<button class="btn" id="cat-newq">${icon('cotizaciones')} Nueva cotización</button>`);
  $('#cat-newq', v).onclick = () => docEditor('cotizacion');
};

Object.assign(FUNCIONES, {
  'Probador 3D': ['Vista 3D de cada prenda con relieve', 'Girar la prenda arrastrando con el dedo o el mouse', 'Giro automático de exhibición', 'Acercar y alejar la prenda', 'Luz que sigue el movimiento del dedo', 'Tela en 3D con el tejido real de cada tipo', 'Tela en movimiento para ver la caída', 'Cambiar la tela a los colores que hay en bodega', 'Metros disponibles y ubicación del color elegido', 'Ficha técnica: composición, gramaje, tejido y cuidado', 'Lupa para ver de cerca la costura y la tela', 'Vista con relieve en equipos sin 3D'],
  'Cotización de lujo': ['Membrete negro y dorado con el logo', 'Foto de cada prenda dentro de la cotización', 'Tela y color de cada línea', 'Valor total y anticipo calculados', 'Condiciones comerciales editables', 'Datos bancarios para el pago', 'Firma de la empresa y aceptación del cliente', 'Cotizar una prenda desde el catálogo o el probador 3D', 'Factura con el mismo membrete de lujo']
});
