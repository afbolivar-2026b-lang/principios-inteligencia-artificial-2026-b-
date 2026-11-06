/*!
 * App de campaña — © Opita Digital. Todos los derechos reservados.
 * Prohibida su copia, distribución o modificación sin autorización escrita.
 */
'use strict';

// Cliente de la app de campaña. Todo el contenido del usuario se inserta con
// textContent para evitar inyección de HTML. Sin librerías externas.

const raiz = document.getElementById('raiz');
const tooltip = document.getElementById('tooltip');
const SVG = 'http://www.w3.org/2000/svg';
const fmt = new Intl.NumberFormat('es-CO');
let temporizador = null;
let config = { nombre: 'Campaña', eslogan: 'Tu barrio también decide.', tema: 'elegante', urlPublica: '', totalRegistros: 0, marca: { empresa: 'Opita Digital', logo: '/marca/opita-digital.svg' } };
let sesionAdmin = false;
let shellActual = null;
const observadores = [];

// ---------- Utilidades ----------
async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    credentials: 'same-origin',
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(datos.error || 'Error de conexión');
    err.estado = res.status;
    err.campo = datos.campo || null;
    throw err;
  }
  return datos;
}

function el(etiqueta, props = {}, ...hijos) {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(props)) {
    if (k in n) n[k] = v;
    else n.setAttribute(k, v);
  }
  for (const h of hijos) if (h != null) n.append(h);
  return n;
}

function svg(etiqueta, attrs = {}, ...hijos) {
  const n = document.createElementNS(SVG, etiqueta);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  for (const h of hijos) if (h != null) n.append(h);
  return n;
}

function icono(id, clase = 'icono') {
  return svg('svg', { class: clase, 'aria-hidden': 'true' }, svg('use', { href: `#${id}` }));
}

function plantilla(id) {
  return document.getElementById(id).content.cloneNode(true);
}

const plural = (n, uno, varios) => `${fmt.format(n)} ${n === 1 ? uno : varios}`;

function hace(fecha) {
  const s = Math.round((Date.now() - new Date(fecha)) / 1000);
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'ayer' : `hace ${d} días`;
}

function iniciales(nombre, apellido) {
  return `${(nombre || '?')[0]}${(apellido || '')[0] || ''}`.toUpperCase();
}

function ponerNombre(contenedor) {
  for (const n of contenedor.querySelectorAll('[data-nombre]')) n.textContent = config.nombre;
  for (const n of contenedor.querySelectorAll('[data-credito]')) pintarCredito(n);
}

function aplicarTema(tema) {
  document.documentElement.setAttribute('data-tema', tema || 'elegante');
  try { localStorage.setItem('tema', tema); } catch { /* sin almacenamiento */ }
}

// ---------- Firma de Opita Digital (créditos + marca de agua) ----------
function enlacesContacto(m) {
  const out = [];
  if (m.whatsapp) out.push({ tipo: 'WhatsApp', texto: m.telefono || `+${m.whatsapp}`, href: `https://wa.me/${m.whatsapp}` });
  else if (m.telefono) out.push({ tipo: 'Teléfono', texto: m.telefono, href: `tel:${m.telefono.replace(/\s/g, '')}` });
  if (m.correo) out.push({ tipo: 'Correo', texto: m.correo, href: `mailto:${m.correo}` });
  if (m.web) out.push({ tipo: 'Web', texto: m.web.replace(/^https?:\/\//, ''), href: m.web });
  if (m.instagram) out.push({ tipo: 'Instagram', texto: `@${m.instagram}`, href: `https://instagram.com/${m.instagram}` });
  if (m.facebook) out.push({ tipo: 'Facebook', texto: m.facebook, href: `https://facebook.com/${m.facebook}` });
  return out;
}

function pintarCredito(nodo) {
  const m = config.marca || {};
  const firma = el(m.web ? 'a' : 'span', { className: 'credito-firma', ...(m.web ? { href: m.web, target: '_blank', rel: 'noopener' } : {}) },
    el('img', { src: m.logo || '/marca/opita-digital.svg', alt: '' }),
    el('span', {}, 'Desarrollado por ', el('strong', { textContent: m.empresa || 'Opita Digital' })));
  const contactos = enlacesContacto(m).map((c) =>
    el('a', { className: 'credito-contacto', href: c.href, target: '_blank', rel: 'noopener', textContent: c.texto, title: c.tipo }));
  nodo.replaceChildren(firma, ...contactos);
  nodo.dataset.firmado = '1';
}

// La marca de agua y los créditos se restauran si alguien los quita de la página.
function protegerMarca() {
  const revisar = () => {
    let agua = document.querySelector('.marca-agua');
    if (!agua) {
      agua = el('div', { className: 'marca-agua', 'aria-hidden': 'true' });
      document.body.prepend(agua);
    }
    const estilo = getComputedStyle(agua);
    if (estilo.display === 'none' || estilo.visibility === 'hidden' || Number(estilo.opacity) < 0.02) {
      agua.style.cssText = 'display:block;visibility:visible;opacity:.05';
    }
    for (const n of document.querySelectorAll('[data-credito]')) {
      if (!n.querySelector('.credito-firma')) pintarCredito(n);
    }
  };
  new MutationObserver(revisar).observe(document.body, { childList: true, subtree: true });
  setInterval(revisar, 4000);
}

// Separa el eslogan para resaltar su última palabra.
function partesEslogan(texto) {
  const m = String(texto).trim().match(/^(.*?)(\S+?)([.!¡?¿…]*)$/u);
  return m ? { inicio: m[1], resaltado: m[2], fin: m[3] } : { inicio: texto, resaltado: '', fin: '' };
}

function urlPublica() {
  return config.urlPublica ? `${config.urlPublica}/` : `${location.origin}/`;
}

function mostrarTooltip(x, y, titulo, detalle) {
  tooltip.replaceChildren(el('strong', { textContent: titulo }), detalle);
  tooltip.hidden = false;
  const ancho = tooltip.offsetWidth;
  const xx = Math.min(Math.max(x, ancho / 2 + 8), window.innerWidth - ancho / 2 - 8);
  tooltip.style.left = `${xx}px`;
  tooltip.style.top = `${y}px`;
}
function ocultarTooltip() { tooltip.hidden = true; }

function animarAncho(nodo, pct) {
  requestAnimationFrame(() => requestAnimationFrame(() => { nodo.style.width = `${pct}%`; }));
}

// Redibuja un gráfico cuando cambia el ancho de su contenedor.
function alRedimensionar(nodo, dibujar) {
  let ancho = 0;
  const ro = new ResizeObserver(([e]) => {
    const w = Math.round(e.contentRect.width);
    if (w && w !== ancho) { ancho = w; dibujar(w); }
  });
  ro.observe(nodo);
  observadores.push(ro);
}

function limpiarVista() {
  clearInterval(temporizador);
  ocultarTooltip();
  while (observadores.length) observadores.pop().disconnect();
}

// ---------- Gráficos ----------

// Ruta de una barra con las esquinas superiores redondeadas y la base recta.
function rutaBarra(x, y, w, h, r) {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

function topeBonito(max) {
  if (max <= 4) return 4;
  const paso = Math.pow(10, Math.floor(Math.log10(max)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * paso >= max) return m * paso;
  return 10 * paso;
}

/**
 * Columnas verticales de una sola serie.
 * datos: [{ etiqueta, etiquetaCorta, valor }]
 */
function graficoColumnas(contenedor, datos, { alto = 220, unidad = ['registro', 'registros'],
  cadaEtiqueta = 1, mostrarValores = false } = {}) {
  if (!datos.some((d) => d.valor > 0)) {
    contenedor.replaceChildren(el('div', { className: 'grafico-vacio', textContent: 'Todavía no hay datos para mostrar.' }));
    return;
  }
  alRedimensionar(contenedor, (ancho) => {
    const m = { arriba: mostrarValores ? 22 : 12, der: 4, abajo: 26, izq: 30 };
    const w = ancho - m.izq - m.der;
    const h = alto - m.arriba - m.abajo;
    const tope = topeBonito(Math.max(...datos.map((d) => d.valor)));
    const y = (v) => m.arriba + h - (v / tope) * h;
    const banda = w / datos.length;
    const hueco = Math.max(2, Math.min(banda * 0.28, 14));
    const anchoBarra = Math.max(2, banda - hueco);

    const raizSvg = svg('svg', { viewBox: `0 0 ${ancho} ${alto}`, height: alto, role: 'img' });
    const titulo = svg('title');
    titulo.textContent = `Gráfico de ${datos.length} columnas`;
    raizSvg.append(titulo);

    for (const t of [0, tope / 2, tope]) {
      const yy = Math.round(y(t)) + 0.5;
      if (t > 0) raizSvg.append(svg('line', { class: 'rejilla', x1: m.izq, x2: ancho - m.der, y1: yy, y2: yy }));
      const txt = svg('text', { class: 'eje', x: m.izq - 8, y: yy + 4, 'text-anchor': 'end' });
      txt.textContent = fmt.format(t);
      raizSvg.append(txt);
    }

    const marcas = [];
    datos.forEach((d, i) => {
      const x = m.izq + i * banda + hueco / 2;
      const marca = svg('path', { class: 'marca-barra', d: rutaBarra(x, y(d.valor), anchoBarra, y(0) - y(d.valor), 4) });
      marcas.push(marca);
      raizSvg.append(marca);
      if (mostrarValores && d.valor > 0) {
        const v = svg('text', { class: 'valor', x: x + anchoBarra / 2, y: y(d.valor) - 6, 'text-anchor': 'middle' });
        v.textContent = fmt.format(d.valor);
        raizSvg.append(v);
      }
      if (i % cadaEtiqueta === 0 || i === datos.length - 1) {
        const t = svg('text', { class: 'eje', x: x + anchoBarra / 2, y: alto - 6, 'text-anchor': 'middle' });
        t.textContent = d.etiquetaCorta ?? d.etiqueta;
        raizSvg.append(t);
      }
    });
    raizSvg.append(svg('line', { class: 'base', x1: m.izq, x2: ancho - m.der, y1: y(0) + 0.5, y2: y(0) + 0.5 }));

    // Zonas de hover más grandes que la marca (toda la columna).
    datos.forEach((d, i) => {
      const zona = svg('rect', { class: 'zona', x: m.izq + i * banda, y: m.arriba, width: banda, height: h });
      const activar = () => {
        contenedor.classList.add('enfocado');
        marcas.forEach((mk, j) => mk.classList.toggle('activa', j === i));
        const caja = zona.getBoundingClientRect();
        const tope = d.valor > 0 ? marcas[i].getBoundingClientRect().top : caja.bottom;
        mostrarTooltip(caja.left + caja.width / 2, tope, d.etiqueta, plural(d.valor, unidad[0], unidad[1]));
      };
      zona.addEventListener('pointerenter', activar);
      zona.addEventListener('pointerdown', activar);
      raizSvg.append(zona);
    });
    raizSvg.addEventListener('pointerleave', () => {
      contenedor.classList.remove('enfocado');
      ocultarTooltip();
    });

    contenedor.replaceChildren(raizSvg);
  });
}

/** Barras horizontales con etiqueta y valor directos. */
function barrasHorizontales(contenedor, datos, { unidad = ['persona', 'personas'], porcentaje = false,
  marcarMia = null, marcarGanadora = false, vacio = 'Todavía no hay datos para mostrar.' } = {}) {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (!datos.length || (!total && !porcentaje)) {
    contenedor.replaceChildren(el('div', { className: 'grafico-vacio', textContent: vacio }));
    return;
  }
  const max = Math.max(...datos.map((d) => d.valor), 1);
  contenedor.replaceChildren(...datos.map((d, i) => {
    const pct = total ? Math.round((d.valor / total) * 100) : 0;
    const relleno = el('div', { className: 'barra-relleno' });
    const clases = ['barra'];
    if (marcarMia === i) clases.push('mia');
    if (marcarGanadora && d.valor === max && d.valor > 0) clases.push('ganadora');
    const fila = el('div', { className: clases.join(' ') },
      el('div', { className: 'barra-cab' },
        el('span', { className: 'barra-nombre', textContent: d.etiqueta, title: d.etiqueta }),
        el('span', {
          className: 'barra-valor',
          textContent: porcentaje ? `${pct}% · ${plural(d.valor, unidad[0], unidad[1])}` : fmt.format(d.valor),
        })),
      el('div', { className: 'barra-pista' }, relleno));
    animarAncho(relleno, porcentaje ? pct : (d.valor / max) * 100);
    return fila;
  }));
}

// ==========================================================================
// PARTE PÚBLICA
// ==========================================================================
function montarPublico() {
  if (shellActual === 'publico') return;
  raiz.replaceChildren(plantilla('tpl-publico'));
  ponerNombre(raiz);
  shellActual = 'publico';
}

function marcarNav(selector, ruta) {
  for (const a of document.querySelectorAll(`${selector} a`)) {
    const destino = a.getAttribute('href');
    const activo = destino === ruta ||
      (destino === '#/encuestas' && ruta.startsWith('#/encuesta/'));
    a.classList.toggle('activo', activo);
    if (activo) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
}

function vistaRegistro() {
  const vista = document.getElementById('vista');
  vista.replaceChildren(plantilla('tpl-registro'));
  window.scrollTo(0, 0);
  document.getElementById('contador').textContent = fmt.format(config.totalRegistros || 0);
  const pe = partesEslogan(config.eslogan);
  document.getElementById('cartel-titulo').replaceChildren(pe.inicio, el('em', { textContent: pe.resaltado }), pe.fin);
  ponerNombre(vista);
  api('/api/config').then((c) => {
    config = c;
    const n = document.getElementById('contador');
    if (n) n.textContent = fmt.format(c.totalRegistros);
  }).catch(() => {});

  // ---- Campos con error (por ejemplo, cédula o teléfono repetidos) ----
  function limpiarErrores() {
    for (const n of vista.querySelectorAll('[aria-invalid="true"]')) n.removeAttribute('aria-invalid');
    for (const n of vista.querySelectorAll('.ayuda-error')) n.remove();
    document.getElementById('r-firma').classList.remove('invalida');
  }
  function marcarCampo(campo, mensaje) {
    const nodo = document.getElementById(`r-${campo}`);
    if (!nodo) return;
    if (campo === 'firma') {
      nodo.classList.add('invalida');
      nodo.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    nodo.setAttribute('aria-invalid', 'true');
    if (mensaje && nodo.closest('.campo')) {
      const ayuda = el('p', { className: 'ayuda-error', id: `ayuda-${campo}`, textContent: mensaje });
      nodo.closest('.campo').append(ayuda);
      nodo.setAttribute('aria-describedby', ayuda.id);
    }
    nodo.focus();
  }
  document.getElementById('form-registro').addEventListener('input', (ev) => {
    if (ev.target.getAttribute('aria-invalid') === 'true') {
      ev.target.removeAttribute('aria-invalid');
      ev.target.closest('.campo')?.querySelector('.ayuda-error')?.remove();
    }
  });

  // ---- Sugerencias de barrio: reutilizar el nombre ya registrado ----
  const inputBarrio = document.getElementById('r-barrio');
  const inputComuna = document.getElementById('r-comuna');
  const lista = document.getElementById('sugerencias-barrio');
  let barriosConocidos = [];
  let opciones = [];
  let activa = -1;
  api('/api/barrios').then((b) => { barriosConocidos = b; }).catch(() => {});
  const clave = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  function cerrarSugerencias() {
    lista.hidden = true;
    inputBarrio.setAttribute('aria-expanded', 'false');
    activa = -1;
  }
  function elegirBarrio(b) {
    inputBarrio.value = b.nombre;
    inputComuna.value = b.comuna;
    inputComuna.removeAttribute('aria-invalid');
    cerrarSugerencias();
    inputComuna.focus();
  }
  function resaltar(texto, q) {
    const i = clave(texto).indexOf(q);
    if (i < 0 || !q) return [texto];
    return [texto.slice(0, i), el('mark', { textContent: texto.slice(i, i + q.length) }), texto.slice(i + q.length)];
  }
  function mostrarSugerencias() {
    const q = clave(inputBarrio.value);
    opciones = q ? barriosConocidos.filter((b) => clave(b.nombre).includes(q))
      .sort((a, b) => clave(a.nombre).indexOf(q) - clave(b.nombre).indexOf(q)).slice(0, 6) : [];
    if (!opciones.length || (opciones.length === 1 && clave(opciones[0].nombre) === q && inputComuna.value)) {
      cerrarSugerencias();
      return;
    }
    activa = -1;
    lista.replaceChildren(
      el('li', { className: 'sugerencias-titulo', textContent: 'Barrios ya registrados', 'aria-hidden': 'true' }),
      ...opciones.map((b, i) => {
        const li = el('li', { role: 'option', id: `sug-${i}` }, el('span', {}, ...resaltar(b.nombre, q)), el('small', { textContent: b.comuna }));
        li.addEventListener('pointerdown', (ev) => { ev.preventDefault(); elegirBarrio(b); });
        return li;
      }));
    lista.hidden = false;
    inputBarrio.setAttribute('aria-expanded', 'true');
  }
  function moverActiva(paso) {
    const items = lista.querySelectorAll('[role="option"]');
    if (!items.length) return;
    activa = (activa + paso + items.length) % items.length;
    items.forEach((li, i) => li.setAttribute('aria-selected', String(i === activa)));
    inputBarrio.setAttribute('aria-activedescendant', items[activa].id);
  }
  inputBarrio.addEventListener('input', mostrarSugerencias);
  inputBarrio.addEventListener('focus', mostrarSugerencias);
  inputBarrio.addEventListener('blur', () => setTimeout(cerrarSugerencias, 120));
  inputBarrio.addEventListener('keydown', (ev) => {
    if (lista.hidden) return;
    if (ev.key === 'ArrowDown') { ev.preventDefault(); moverActiva(1); }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); moverActiva(-1); }
    else if (ev.key === 'Enter' && activa >= 0) { ev.preventDefault(); elegirBarrio(opciones[activa]); }
    else if (ev.key === 'Escape') cerrarSugerencias();
  });

  const canvas = document.getElementById('firma');
  const guia = document.getElementById('firma-guia');
  const ctx = canvas.getContext('2d');
  let firmado = false;
  let dibujando = false;
  let ultimo = null;

  function limpiar() {
    ctx.fillStyle = '#FFFDF8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    firmado = false;
    guia.hidden = false;
  }
  limpiar();
  canvas.addEventListener('pointerdown', () => document.getElementById('r-firma').classList.remove('invalida'));
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1A1713';

  function punto(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) * (canvas.width / r.width),
      y: (ev.clientY - r.top) * (canvas.height / r.height),
      t: performance.now(),
    };
  }
  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);
    dibujando = true;
    ultimo = punto(ev);
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dibujando) return;
    const p = punto(ev);
    // Trazo más fino cuando la mano va rápido, como una pluma real.
    const vel = Math.hypot(p.x - ultimo.x, p.y - ultimo.y) / Math.max(p.t - ultimo.t, 1);
    ctx.lineWidth = Math.max(1.6, Math.min(3.6, 3.8 - vel * 1.2));
    ctx.beginPath();
    ctx.moveTo(ultimo.x, ultimo.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimo = p;
    if (!firmado) { firmado = true; guia.hidden = true; }
  });
  const terminar = () => { dibujando = false; };
  canvas.addEventListener('pointerup', terminar);
  canvas.addEventListener('pointercancel', terminar);
  document.getElementById('borrar-firma').addEventListener('click', limpiar);

  document.getElementById('form-registro').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-registro');
    const boton = ev.target.querySelector('button[type="submit"]');
    error.textContent = '';
    limpiarErrores();
    const valor = (id) => document.getElementById(id).value;
    const vacio = ['nombre', 'apellido', 'cedula', 'edad', 'telefono', 'barrio', 'comuna']
      .find((c) => !valor(`r-${c}`).trim());
    if (vacio) {
      const etiqueta = document.querySelector(`label[for="r-${vacio}"]`).textContent;
      error.textContent = `Falta llenar: ${etiqueta}.`;
      marcarCampo(vacio);
      return;
    }
    if (!firmado) { error.textContent = 'Falta la firma.'; marcarCampo('firma'); return; }
    if (!document.getElementById('r-autorizacion').checked) {
      error.textContent = 'Debes autorizar el tratamiento de datos para registrarte.';
      return;
    }
    boton.disabled = true;
    try {
      const r = await api('/api/registros', {
        method: 'POST',
        body: JSON.stringify({
          nombre: valor('r-nombre'),
          apellido: valor('r-apellido'),
          cedula: valor('r-cedula'),
          edad: Number(valor('r-edad')),
          telefono: valor('r-telefono'),
          barrio: valor('r-barrio'),
          comuna: valor('r-comuna'),
          firma: canvas.toDataURL('image/png'),
          autorizacion: true,
        }),
      });
      config.totalRegistros += 1;
      const vista = document.getElementById('vista');
      vista.replaceChildren(plantilla('tpl-registro-ok'));
      window.scrollTo(0, 0);
      document.getElementById('gracias').textContent = `Gracias, ${r.nombre}. Ya eres parte.`;
      document.getElementById('otro-registro').addEventListener('click', vistaRegistro);
    } catch (e) {
      if (e.campo && e.campo !== 'autorizacion') {
        marcarCampo(e.campo, e.message);
        error.textContent = 'Revisa el campo marcado en rojo.';
      } else {
        error.textContent = e.message;
      }
      boton.disabled = false;
    }
  });
}

async function vistaEncuestasPublicas() {
  const vista = document.getElementById('vista');
  vista.replaceChildren(plantilla('tpl-encuestas-publicas'));
  const ul = document.getElementById('lista-encuestas');
  try {
    const encuestas = await api('/api/encuestas');
    if (!encuestas.length) {
      ul.replaceChildren(el('li', { className: 'vacio', textContent: 'No hay encuestas publicadas por ahora.' }));
      return;
    }
    ul.replaceChildren(...encuestas.map((e) => el('li', {},
      el('a', { href: `#/encuesta/${encodeURIComponent(e.id)}` },
        el('span', { className: 'le-titulo', textContent: e.pregunta }),
        el('span', { className: 'le-meta', textContent: e.cerrada ? 'Cerrada' : plural(e.totalVotos, 'voto', 'votos') })))));
  } catch (e) {
    ul.replaceChildren(el('li', { className: 'vacio', textContent: e.message }));
  }
}

async function vistaEncuesta(id) {
  const vista = document.getElementById('vista');
  vista.replaceChildren(plantilla('tpl-encuesta'));
  window.scrollTo(0, 0);

  const botonCopiar = document.getElementById('copiar');
  botonCopiar.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      botonCopiar.textContent = 'Enlace copiado';
    } catch {
      botonCopiar.textContent = location.href;
    }
  });

  document.getElementById('form-votar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-votar');
    const elegido = ev.target.querySelector('input[name="opcion"]:checked');
    if (!elegido) { error.textContent = 'Elige una opción.'; return; }
    try {
      pintar(await api(`/api/encuestas/${encodeURIComponent(id)}/votar`, {
        method: 'POST', body: JSON.stringify({ opcion: Number(elegido.value) }),
      }));
    } catch (e) {
      error.textContent = e.message;
    }
  });

  let opcionesPintadas = false;
  let ultimaHuella = '';

  function pintar(e) {
    document.title = `${e.pregunta} · ${config.nombre}`;
    document.getElementById('titulo').textContent = e.pregunta;
    document.getElementById('estado-encuesta').textContent = e.cerrada ? 'Encuesta cerrada' : 'Encuesta abierta';
    document.getElementById('meta').textContent = plural(e.totalVotos, 'voto', 'votos');

    const puedeVotar = !e.cerrada && e.miVoto === null;
    document.getElementById('form-votar').hidden = !puedeVotar;
    if (puedeVotar && !opcionesPintadas) {
      document.getElementById('opciones-voto').replaceChildren(...e.opciones.map((o, i) =>
        el('label', { className: 'opcion' },
          el('input', { type: 'radio', name: 'opcion', value: String(i) }),
          el('span', { textContent: o.texto }))));
      opcionesPintadas = true;
    }
    const res = document.getElementById('resultados');
    res.hidden = puedeVotar;
    const huella = JSON.stringify([e.opciones.map((o) => o.votos), e.miVoto, e.cerrada]);
    if (!puedeVotar && huella !== ultimaHuella) {
      ultimaHuella = huella;
      barrasHorizontales(res, e.opciones.map((o) => ({ etiqueta: o.texto, valor: o.votos })), {
        unidad: ['voto', 'votos'], porcentaje: true, marcarMia: e.miVoto, marcarGanadora: e.cerrada,
      });
    }
  }

  async function refrescar() {
    try {
      pintar(await api(`/api/encuestas/${encodeURIComponent(id)}`));
    } catch (e) {
      vista.replaceChildren(el('section', { className: 'pagina-angosta' },
        el('a', { href: '#/encuestas', className: 'volver', textContent: '← Todas las encuestas' }),
        el('h1', { className: 'titulo-pagina', textContent: e.message })));
      clearInterval(temporizador);
    }
  }
  await refrescar();
  temporizador = setInterval(refrescar, 4000);
}

// ==========================================================================
// PANEL DEL EQUIPO
// ==========================================================================
function vistaLogin() {
  raiz.replaceChildren(plantilla('tpl-login'));
  shellActual = 'login';
  ponerNombre(raiz);
  const clave = document.getElementById('clave');
  clave.focus();
  document.getElementById('form-login').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-login');
    const boton = ev.target.querySelector('button[type="submit"]');
    error.textContent = '';
    boton.disabled = true;
    try {
      await api('/api/sesion', { method: 'POST', body: JSON.stringify({ clave: clave.value }) });
      sesionAdmin = true;
      enrutar();
    } catch (e) {
      error.textContent = e.message;
      boton.disabled = false;
      clave.select();
    }
  });
}

function montarPanel() {
  if (shellActual === 'panel') return;
  raiz.replaceChildren(plantilla('tpl-panel'));
  ponerNombre(raiz);
  shellActual = 'panel';
  document.getElementById('salir').addEventListener('click', async () => {
    await api('/api/sesion', { method: 'DELETE' }).catch(() => {});
    sesionAdmin = false;
    location.hash = '#/panel';
    enrutar();
  });
}

// Si la sesión venció, vuelve a pedir la contraseña.
function manejarErrorPanel(e, contenedor) {
  if (e.estado === 401) {
    sesionAdmin = false;
    vistaLogin();
    return;
  }
  contenedor.replaceChildren(el('div', { className: 'grafico-vacio', textContent: e.message }));
}

let filtroPanel = { periodo: '30', comuna: '', edad: '' };

function pintarFotoCandidato(nodo) {
  if (config.foto) nodo.replaceChildren(el('img', { src: config.foto, alt: '' }));
  else nodo.replaceChildren(iniciales(...(config.candidato || config.nombre).split(' ')));
}

async function vistaPanelInicio() {
  const vista = document.getElementById('vista-panel');
  vista.replaceChildren(plantilla('tpl-panel-inicio'));
  ponerNombre(vista);
  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('fecha-hoy').textContent = hoy;
  document.getElementById('cand-nombre').textContent = config.candidato || config.eslogan;
  pintarFotoCandidato(document.getElementById('cand-foto'));

  const fComuna = document.getElementById('f-comuna');
  const fEdad = document.getElementById('f-edad');
  const limpiar = document.getElementById('f-limpiar');
  let opcionesCargadas = false;

  // Descargas con los filtros puestos
  function actualizarDescargas() {
    const q = new URLSearchParams(filtroPanel).toString();
    document.getElementById('bajar-excel').href = `/api/tablero.xlsx?${q}`;
    document.getElementById('bajar-pdf').href = `/api/reporte.pdf?${q}`;
  }

  // Compartir el registro con QR, enlace o WhatsApp sin salir del tablero
  const url = urlPublica();
  const qrCanvas = document.getElementById('qr-tablero');
  const qr = matrizQR(url);
  const ctxQR = qrCanvas.getContext('2d');
  ctxQR.fillStyle = '#FFFFFF';
  ctxQR.fillRect(0, 0, 320, 320);
  dibujarQR(ctxQR, qr, 10, 10, 300);
  document.getElementById('enlace-tablero').value = url;
  document.getElementById('whatsapp-tablero').href =
    `https://wa.me/?text=${encodeURIComponent(`¡Súmate a ${config.nombre}! Regístrate aquí: ${url}`)}`;
  const copiarT = document.getElementById('copiar-tablero');
  copiarT.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); copiarT.textContent = 'Copiado'; } catch { document.getElementById('enlace-tablero').select(); }
  });
  document.getElementById('bajar-qr-tablero').addEventListener('click', () => descargarCanvas(qrCanvas, nombreArchivo('qr')));

  function marcarFiltros() {
    actualizarDescargas();
    for (const b of vista.querySelectorAll('[data-periodo]')) {
      const activo = b.dataset.periodo === filtroPanel.periodo;
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-checked', String(activo));
    }
    fComuna.value = filtroPanel.comuna;
    fEdad.value = filtroPanel.edad;
    limpiar.hidden = !filtroPanel.comuna && !filtroPanel.edad && filtroPanel.periodo === '30';
  }

  async function cargar() {
    marcarFiltros();
    const q = new URLSearchParams(filtroPanel);
    let d;
    try {
      d = await api(`/api/panel?${q}`);
    } catch (e) {
      manejarErrorPanel(e, vista);
      return;
    }
    if (!opcionesCargadas) {
      fComuna.append(...d.opciones.comunas.map((c) => el('option', { value: c, textContent: c })));
      fEdad.append(...d.opciones.edades.map((r) => el('option', { value: r, textContent: `${r} años` })));
      opcionesCargadas = true;
      marcarFiltros();
    }
    while (observadores.length) observadores.pop().disconnect();
    pintarTablero(d);
  }

  for (const b of vista.querySelectorAll('[data-periodo]')) {
    b.addEventListener('click', () => { filtroPanel.periodo = b.dataset.periodo; cargar(); });
  }
  fComuna.addEventListener('change', () => { filtroPanel.comuna = fComuna.value; cargar(); });
  fEdad.addEventListener('change', () => { filtroPanel.edad = fEdad.value; cargar(); });
  limpiar.addEventListener('click', () => { filtroPanel = { periodo: '30', comuna: '', edad: '' }; cargar(); });

  await cargar();
}

function pintarTablero(d) {
  const txt = (id, v) => { document.getElementById(id).textContent = v; };
  const filtrado = d.filtro.comuna || d.filtro.edad;
  txt('k-total', fmt.format(d.total));
  txt('k-total-nota', filtrado
    ? `de ${fmt.format(d.totalGeneral)} en total`
    : (d.total ? `${plural(d.enPeriodo, 'nueva', 'nuevas')} en el periodo` : 'Comparte el formulario para empezar'));
  txt('k-hoy', fmt.format(d.hoy));
  txt('k-semana', fmt.format(d.semana));
  txt('k-edad', d.edadPromedio ?? '—');
  txt('k-comunas', fmt.format(d.totalComunas));
  txt('k-barrios', fmt.format(d.totalBarrios));
  txt('k-votos', fmt.format(d.encuestas.votos));
  txt('k-votos-nota', `${plural(d.encuestas.activas, 'encuesta abierta', 'encuestas abiertas')}`);
  const notaCrec = document.getElementById('k-crecimiento-nota');
  if (d.semanaAnterior > 0) {
    const cambio = Math.round(((d.semana - d.semanaAnterior) / d.semanaAnterior) * 100);
    txt('k-crecimiento', `${cambio > 0 ? '+' : ''}${cambio}%`);
    const clase = cambio > 0 ? 'sube' : cambio < 0 ? 'baja' : 'igual';
    notaCrec.replaceChildren(el('span', { className: `delta ${clase}`, textContent: cambio > 0 ? '▲ sube' : cambio < 0 ? '▼ baja' : '= igual' }), 'vs. semana anterior');
  } else {
    txt('k-crecimiento', '—');
    notaCrec.textContent = d.semana ? 'primera semana con datos' : 'sin datos aún';
  }

  const etiquetaPeriodo = { 7: 'Últimos 7 días', 30: 'Últimos 30 días', 90: 'Últimos 90 días', todo: 'Desde el inicio' };
  txt('sub-dias', etiquetaPeriodo[d.filtro.periodo] || '');
  const formatoDia = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  const cada = Math.max(1, Math.ceil(d.porDia.length / 7));
  const dias = d.porDia.map((p) => {
    const f = new Date(`${p.fecha}T12:00:00Z`);
    return { etiqueta: formatoDia.format(f), etiquetaCorta: String(f.getUTCDate()), valor: p.total, acumulado: p.acumulado };
  });
  graficoColumnas(document.getElementById('g-dias'), dias, { cadaEtiqueta: cada });
  graficoArea(document.getElementById('g-acumulado'), dias.map((x) => ({ ...x, valor: x.acumulado })), { cadaEtiqueta: cada });
  graficoColumnas(document.getElementById('g-semana'), d.porSemana.map((x) => ({ etiqueta: x.dia, etiquetaCorta: x.dia, valor: x.total })),
    { mostrarValores: true });
  graficoDona(document.getElementById('g-hora'), [
    { etiqueta: 'Mañana', detalle: '6 a. m. – 12 m.', valor: d.porHora[1].total },
    { etiqueta: 'Tarde', detalle: '12 m. – 6 p. m.', valor: d.porHora[2].total },
    { etiqueta: 'Noche', detalle: '6 p. m. – 12 a. m.', valor: d.porHora[3].total },
    { etiqueta: 'Madrugada', detalle: '12 a. m. – 6 a. m.', valor: d.porHora[0].total },
  ]);

  const comunas = d.comunas.length > 7
    ? [...d.comunas.slice(0, 6), { nombre: 'Otras', total: d.comunas.slice(6).reduce((s, c) => s + c.total, 0) }]
    : d.comunas;
  barrasHorizontales(document.getElementById('g-comunas'), comunas.map((c) => ({ etiqueta: c.nombre, valor: c.total })),
    { vacio: 'Sin registros con estos filtros.' });
  graficoColumnas(document.getElementById('g-edades'), d.edades.map((e) => ({ etiqueta: `${e.rango} años`, etiquetaCorta: e.rango, valor: e.total })),
    { unidad: ['persona', 'personas'], mostrarValores: true });

  const ol = document.getElementById('l-barrios');
  if (!d.barrios.length) {
    ol.replaceChildren(el('li', { className: 'vacio', textContent: 'Sin barrios con estos filtros.' }));
  } else {
    const max = d.barrios[0].total;
    ol.replaceChildren(...d.barrios.map((b) => {
      const relleno = el('span', { className: 'rk-relleno' });
      animarAncho(relleno, (b.total / max) * 100);
      return el('li', {},
        el('span', { className: 'rk-nombre', title: b.nombre }, b.nombre, el('small', { textContent: b.comuna })),
        el('span', { className: 'rk-total', textContent: fmt.format(b.total) }),
        el('span', { className: 'rk-pista' }, relleno));
    }));
  }

  const ul = document.getElementById('l-recientes');
  ul.replaceChildren(...(d.recientes.length
    ? d.recientes.map((r) => el('li', {},
      el('span', { className: 'avatar', textContent: iniciales(r.nombre, r.apellido), 'aria-hidden': 'true' }),
      el('div', {},
        el('div', { className: 'rc-nombre', textContent: `${r.nombre} ${r.apellido}` }),
        el('div', { className: 'rc-lugar', textContent: `${r.barrio} · ${r.comuna}` })),
      el('span', { className: 'rc-hora', textContent: hace(r.fecha) })))
    : [el('li', { className: 'vacio', textContent: 'Los registros nuevos aparecerán aquí.' })]));

  const cont = document.getElementById('l-encuesta');
  const destacada = d.encuestas.lista.find((e) => !e.cerrada) || d.encuestas.lista[0];
  if (!destacada) {
    cont.replaceChildren(el('div', { className: 'grafico-vacio' },
      'No hay encuestas todavía. ', el('a', { href: '#/panel/encuestas', className: 'enlace', textContent: 'Crear la primera' })));
  } else {
    const barras = el('div', { className: 'barras' });
    barrasHorizontales(barras, destacada.opciones.map((o) => ({ etiqueta: o.texto, valor: o.votos })),
      { unidad: ['voto', 'votos'], porcentaje: true, marcarGanadora: destacada.cerrada });
    cont.replaceChildren(
      el('span', { className: `etiqueta-estado ${destacada.cerrada ? 'cerrada' : 'abierta'}`, textContent: destacada.cerrada ? 'Cerrada' : 'Abierta' }),
      el('h3', { textContent: destacada.pregunta }),
      barras,
      el('p', { className: 'meta', textContent: plural(destacada.totalVotos, 'voto', 'votos') }));
  }
}

/** Línea con área de una sola serie, con guía al pasar el mouse. */
function graficoArea(contenedor, datos, { alto = 220, unidad = ['persona', 'personas'], cadaEtiqueta = 1 } = {}) {
  if (!datos.some((d) => d.valor > 0)) {
    contenedor.replaceChildren(el('div', { className: 'grafico-vacio', textContent: 'Todavía no hay datos para mostrar.' }));
    return;
  }
  alRedimensionar(contenedor, (ancho) => {
    const m = { arriba: 14, der: 10, abajo: 26, izq: 38 };
    const w = ancho - m.izq - m.der;
    const h = alto - m.arriba - m.abajo;
    const tope = topeBonito(Math.max(...datos.map((d) => d.valor)));
    const x = (i) => m.izq + (datos.length === 1 ? w / 2 : (i / (datos.length - 1)) * w);
    const y = (v) => m.arriba + h - (v / tope) * h;
    const raizSvg = svg('svg', { viewBox: `0 0 ${ancho} ${alto}`, height: alto, role: 'img' });
    const titulo = svg('title');
    titulo.textContent = 'Crecimiento acumulado';
    raizSvg.append(titulo);
    for (const t of [0, tope / 2, tope]) {
      const yy = Math.round(y(t)) + 0.5;
      if (t > 0) raizSvg.append(svg('line', { class: 'rejilla', x1: m.izq, x2: ancho - m.der, y1: yy, y2: yy }));
      const tx = svg('text', { class: 'eje', x: m.izq - 8, y: yy + 4, 'text-anchor': 'end' });
      tx.textContent = fmt.format(t);
      raizSvg.append(tx);
    }
    const puntos = datos.map((d, i) => `${x(i).toFixed(1)},${y(d.valor).toFixed(1)}`);
    raizSvg.append(svg('path', { class: 'area', d: `M${x(0)},${y(0)}L${puntos.join('L')}L${x(datos.length - 1)},${y(0)}Z` }));
    raizSvg.append(svg('path', { class: 'linea', d: `M${puntos.join('L')}` }));
    raizSvg.append(svg('line', { class: 'base', x1: m.izq, x2: ancho - m.der, y1: y(0) + 0.5, y2: y(0) + 0.5 }));
    datos.forEach((d, i) => {
      if (i % cadaEtiqueta === 0 || i === datos.length - 1) {
        const t = svg('text', { class: 'eje', x: x(i), y: alto - 6, 'text-anchor': 'middle' });
        t.textContent = d.etiquetaCorta ?? d.etiqueta;
        raizSvg.append(t);
      }
    });
    // Etiqueta directa del último valor
    const ult = datos.at(-1);
    const v = svg('text', { class: 'valor', x: x(datos.length - 1) - 4, y: y(ult.valor) - 10, 'text-anchor': 'end' });
    v.textContent = fmt.format(ult.valor);
    raizSvg.append(v);

    const guia = svg('line', { class: 'guia', y1: m.arriba, y2: y(0), visibility: 'hidden' });
    const punto = svg('circle', { class: 'punto', r: 5, visibility: 'hidden' });
    raizSvg.append(guia, punto);
    const zona = svg('rect', { class: 'zona', x: m.izq, y: m.arriba, width: w, height: h });
    const mover = (ev) => {
      const caja = raizSvg.getBoundingClientRect();
      const px = ((ev.clientX - caja.left) / caja.width) * ancho;
      const i = Math.max(0, Math.min(datos.length - 1, Math.round(((px - m.izq) / w) * (datos.length - 1))));
      const xx = x(i);
      guia.setAttribute('x1', xx); guia.setAttribute('x2', xx); guia.setAttribute('visibility', 'visible');
      punto.setAttribute('cx', xx); punto.setAttribute('cy', y(datos[i].valor)); punto.setAttribute('visibility', 'visible');
      const escala = caja.width / ancho;
      mostrarTooltip(caja.left + xx * escala, caja.top + y(datos[i].valor) * escala, datos[i].etiqueta, plural(datos[i].valor, unidad[0], unidad[1]));
    };
    zona.addEventListener('pointermove', mover);
    zona.addEventListener('pointerdown', mover);
    zona.addEventListener('pointerleave', () => {
      guia.setAttribute('visibility', 'hidden'); punto.setAttribute('visibility', 'hidden'); ocultarTooltip();
    });
    raizSvg.append(zona);
    contenedor.replaceChildren(raizSvg);
  });
}

/** Dona de hasta 4 partes con leyenda y porcentajes directos. */
function graficoDona(contenedor, datos, { unidad = ['registro', 'registros'] } = {}) {
  const total = datos.reduce((s, d) => s + d.valor, 0);
  if (!total) {
    contenedor.replaceChildren(el('div', { className: 'grafico-vacio', textContent: 'Todavía no hay datos para mostrar.' }));
    return;
  }
  const R = 80; const r = 52; const c = 90;
  const raizSvg = svg('svg', { viewBox: '0 0 180 180', role: 'img' });
  const titulo = svg('title');
  titulo.textContent = 'Distribución por franja del día';
  raizSvg.append(titulo);
  let ang = -Math.PI / 2;
  const segmentos = [];
  datos.forEach((d, i) => {
    if (!d.valor) { segmentos.push(null); return; }
    const a = (d.valor / total) * Math.PI * 2;
    const fin = ang + a;
    const grande = a > Math.PI ? 1 : 0;
    const p = (rad, ra) => `${(c + ra * Math.cos(rad)).toFixed(2)},${(c + ra * Math.sin(rad)).toFixed(2)}`;
    const ruta = a >= Math.PI * 2 - 1e-6
      ? `M${c},${c - R}A${R},${R} 0 1 1 ${c - 0.01},${c - R}L${c - 0.01},${c - r}A${r},${r} 0 1 0 ${c},${c - r}Z`
      : `M${p(ang, R)}A${R},${R} 0 ${grande} 1 ${p(fin, R)}L${p(fin, r)}A${r},${r} 0 ${grande} 0 ${p(ang, r)}Z`;
    const seg = svg('path', { class: `segmento s${i + 1}`, d: ruta });
    const activar = () => {
      contenedor.querySelector('.dona').classList.add('enfocado');
      segmentos.forEach((sg) => sg && sg.classList.toggle('activa', sg === seg));
      const caja = seg.getBoundingClientRect();
      mostrarTooltip(caja.left + caja.width / 2, caja.top, `${d.etiqueta} · ${Math.round((d.valor / total) * 100)}%`, plural(d.valor, unidad[0], unidad[1]));
    };
    seg.addEventListener('pointerenter', activar);
    seg.addEventListener('pointerdown', activar);
    segmentos.push(seg);
    raizSvg.append(seg);
    ang = fin;
  });
  const n = svg('text', { class: 'centro-num', x: c, y: c + 6, 'text-anchor': 'middle' });
  n.textContent = fmt.format(total);
  const t = svg('text', { class: 'centro-txt', x: c, y: c + 24, 'text-anchor': 'middle' });
  t.textContent = unidad[1];
  raizSvg.append(n, t);
  raizSvg.addEventListener('pointerleave', () => {
    contenedor.querySelector('.dona').classList.remove('enfocado');
    ocultarTooltip();
  });
  const leyenda = el('ul', { className: 'leyenda' }, ...datos.map((d, i) => el('li', {},
    el('i', { className: `serie-${i + 1}` }),
    el('span', {}, d.etiqueta, el('small', { textContent: d.detalle || '' })),
    el('b', { textContent: `${Math.round((d.valor / total) * 100)}%` }))));
  contenedor.replaceChildren(el('div', { className: 'dona' }, raizSvg, leyenda));
}

async function vistaPanelRegistros() {
  const vista = document.getElementById('vista-panel');
  vista.replaceChildren(plantilla('tpl-panel-registros'));
  const tbody = document.getElementById('filas');
  const buscar = document.getElementById('buscar');
  const filtro = document.getElementById('filtro-comuna');
  let todos = [];

  function pintar() {
    const q = buscar.value.trim().toLocaleLowerCase('es');
    const c = filtro.value;
    const lista = todos.filter((r) => (!c || r.comuna === c) && (!q ||
      [r.nombre, r.apellido, r.cedula, r.barrio, r.comuna, r.telefono].join(' ').toLocaleLowerCase('es').includes(q)));
    document.getElementById('resumen').textContent = (q || c)
      ? `${plural(lista.length, 'resultado', 'resultados')} de ${fmt.format(todos.length)}`
      : plural(todos.length, 'persona registrada', 'personas registradas');
    if (!lista.length) {
      tbody.replaceChildren(el('tr', {}, el('td', {
        colSpan: 9, className: 'vacio',
        textContent: todos.length ? 'Ningún registro coincide con la búsqueda.' : 'Todavía no hay registros. Comparte el formulario público.',
      })));
      return;
    }
    tbody.replaceChildren(...lista.map((r) => {
      const borrar = el('button', {
        type: 'button', className: 'icono-boton', title: 'Eliminar registro',
        'aria-label': `Eliminar registro de ${r.nombre} ${r.apellido}`,
      }, icono('i-papelera', ''));
      borrar.addEventListener('click', async () => {
        if (!confirm(`¿Eliminar el registro de ${r.nombre} ${r.apellido} (C.C. ${r.cedula})? No se puede deshacer.`)) return;
        try {
          await api(`/api/registros/${r.id}`, { method: 'DELETE' });
          todos = todos.filter((x) => x.id !== r.id);
          pintar();
        } catch (e) { alert(e.message); }
      });
      return el('tr', {},
        el('td', { className: 'fuerte', textContent: `${r.nombre} ${r.apellido}` }),
        el('td', { className: 'mono', textContent: fmt.format(Number(r.cedula)) }),
        el('td', { className: 'num', textContent: String(r.edad) }),
        el('td', { className: 'mono', textContent: r.telefono }),
        el('td', { textContent: r.barrio }),
        el('td', { textContent: r.comuna }),
        el('td', {}, el('img', { src: r.firma, alt: `Firma de ${r.nombre} ${r.apellido}`, loading: 'lazy' })),
        el('td', { className: 'mono', textContent: new Date(r.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) }),
        el('td', {}, borrar));
    }));
  }

  try {
    todos = await api('/api/registros');
  } catch (e) {
    manejarErrorPanel(e, vista);
    return;
  }
  const comunas = [...new Set(todos.map((r) => r.comuna))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true }));
  filtro.append(...comunas.map((c) => el('option', { value: c, textContent: c })));
  buscar.addEventListener('input', pintar);
  filtro.addEventListener('change', pintar);
  pintar();

  document.getElementById('exportar').addEventListener('click', async () => {
    const res = await fetch('/api/registros.csv', { credentials: 'same-origin' });
    if (!res.ok) { alert('No se pudo descargar el archivo.'); return; }
    const url = URL.createObjectURL(await res.blob());
    const fecha = new Date().toISOString().slice(0, 10);
    const a = el('a', { href: url, download: `registros-campana-${fecha}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
}

async function vistaPanelEncuestas() {
  const vista = document.getElementById('vista-panel');
  vista.replaceChildren(plantilla('tpl-panel-encuestas'));
  const lista = document.getElementById('lista-opciones');

  function agregarOpcion() {
    if (lista.children.length >= 10) return;
    const input = el('input', { maxLength: 100, placeholder: `Opción ${lista.children.length + 1}`, 'aria-label': 'Opción' });
    const quitar = el('button', { type: 'button', className: 'icono-boton', 'aria-label': 'Quitar opción' }, icono('i-papelera', ''));
    const fila = el('div', { className: 'fila-opcion' }, input, quitar);
    quitar.addEventListener('click', () => { if (lista.children.length > 2) fila.remove(); });
    lista.append(fila);
  }
  agregarOpcion();
  agregarOpcion();
  document.getElementById('agregar-opcion').addEventListener('click', agregarOpcion);

  document.getElementById('form-crear').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-crear');
    const boton = ev.target.querySelector('button[type="submit"]');
    error.textContent = '';
    boton.disabled = true;
    try {
      await api('/api/encuestas', {
        method: 'POST',
        body: JSON.stringify({
          pregunta: document.getElementById('pregunta').value,
          opciones: [...lista.querySelectorAll('input')].map((i) => i.value),
        }),
      });
      vistaPanelEncuestas();
    } catch (e) {
      if (e.estado === 401) { manejarErrorPanel(e, vista); return; }
      error.textContent = e.message;
      boton.disabled = false;
    }
  });

  const cont = document.getElementById('admin-encuestas');
  let encuestas;
  try {
    encuestas = await api('/api/encuestas');
  } catch (e) {
    manejarErrorPanel(e, cont);
    return;
  }
  if (!encuestas.length) {
    cont.replaceChildren(el('div', { className: 'grafico-vacio', textContent: 'Las encuestas que publiques aparecerán aquí con sus resultados en vivo.' }));
    return;
  }
  cont.replaceChildren(...encuestas.map((e) => {
    const barras = el('div', { className: 'barras' });
    barrasHorizontales(barras, e.opciones.map((o) => ({ etiqueta: o.texto, valor: o.votos })),
      { unidad: ['voto', 'votos'], porcentaje: true, marcarGanadora: e.cerrada });
    const enlace = `${location.origin}/#/encuesta/${encodeURIComponent(e.id)}`;
    const copiar = el('button', { type: 'button', className: 'boton boton-borde boton-mini', textContent: 'Copiar enlace' });
    copiar.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(enlace); copiar.textContent = 'Copiado'; } catch { prompt('Enlace de la encuesta:', enlace); }
    });
    const acciones = el('div', { className: 'acciones sin-margen' }, copiar);
    if (!e.cerrada) {
      const cerrar = el('button', { type: 'button', className: 'boton boton-peligro boton-mini', textContent: 'Cerrar votación' });
      cerrar.addEventListener('click', async () => {
        if (!confirm('¿Cerrar la votación? Nadie más podrá votar.')) return;
        try {
          await api(`/api/encuestas/${encodeURIComponent(e.id)}/cerrar`, { method: 'POST', body: '{}' });
          vistaPanelEncuestas();
        } catch (err) { alert(err.message); }
      });
      acciones.append(cerrar);
    }
    return el('article', { className: 'bloque tarjeta-encuesta' },
      el('header', { className: 'bloque-cab' },
        el('h2', { textContent: e.pregunta }),
        el('span', { className: `etiqueta-estado ${e.cerrada ? 'cerrada' : 'abierta'}`, textContent: e.cerrada ? 'Cerrada' : 'Abierta' })),
      barras,
      el('div', { className: 'te-pie' },
        el('span', { className: 'meta', textContent: `${plural(e.totalVotos, 'voto', 'votos')} · creada ${hace(e.creada)}` }),
        acciones));
  }));
}


// ==========================================================================
// COMPARTIR: anuncio con QR
// ==========================================================================
const FORMATOS = { post: [1080, 1350], historia: [1080, 1920], cuadrado: [1080, 1080] };

function colorTema(nombre) {
  return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
}
const esTransparente = (c) => !c || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c);

function matrizQR(texto) {
  const qr = qrcode(0, 'M');
  qr.addData(texto);
  qr.make();
  return qr;
}

function dibujarQR(ctx, qr, x, y, tam, colorOscuro = '#111111') {
  const n = qr.getModuleCount();
  const celda = tam / n;
  ctx.fillStyle = colorOscuro;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(Math.floor(x + c * celda), Math.floor(y + r * celda), Math.ceil(celda), Math.ceil(celda));
    }
  }
}

function rectRedondeado(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function partirLineas(ctx, texto, ancho) {
  const palabras = texto.split(/\s+/);
  const lineas = [];
  let actual = '';
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p;
    if (ctx.measureText(prueba).width > ancho && actual) { lineas.push(actual); actual = p; } else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

function cargarImagen(src) {
  return new Promise((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

function zigzag(ctx, y, ancho, alto, c1, c2) {
  ctx.fillStyle = c2;
  ctx.fillRect(0, y, ancho, alto);
  ctx.fillStyle = c1;
  const paso = alto * 2;
  ctx.beginPath();
  for (let x = -paso; x < ancho + paso; x += paso) {
    ctx.moveTo(x, y + alto);
    ctx.lineTo(x + paso / 2, y);
    ctx.lineTo(x + paso, y + alto);
  }
  ctx.fill();
}

async function dibujarAfiche(canvas, formato, url) {
  const [W, H] = FORMATOS[formato];
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await Promise.all([
    document.fonts.load('800 100px Bricolage'), document.fonts.load('500 20px "Plex Mono"'),
    document.fonts.load('400 100px Fraunces'), document.fonts.load('italic 400 100px Fraunces'),
    document.fonts.load('500 30px "Public Sans"'), document.fonts.load('700 30px "Public Sans"'),
  ]).catch(() => {});
  const tema = document.documentElement.getAttribute('data-tema');
  const c = {
    fondo: colorTema('--cartel'), texto: colorTema('--sobre-cartel'), resaltado: colorTema('--resaltado'),
    sobreResaltado: colorTema('--sobre-resaltado'), boton: colorTema('--boton'), sobreBoton: colorTema('--sobre-boton'),
    acento: colorTema('--acento'), cinta1: colorTema('--cinta-1'), cinta2: colorTema('--cinta-2'),
  };
  const display = tema === 'limpio' ? '"Public Sans"' : tema === 'elegante' ? 'Fraunces' : 'Bricolage';
  const pesoTitulo = tema === 'elegante' ? 400 : 800;
  const M = 84;

  // Fondo y textura según el diseño
  ctx.fillStyle = c.fondo;
  ctx.fillRect(0, 0, W, H);
  if (tema === 'oscuro') {
    const g1 = ctx.createRadialGradient(W * 0.1, 0, 0, W * 0.1, 0, W * 0.9);
    g1.addColorStop(0, 'rgba(61,245,166,.30)'); g1.addColorStop(1, 'rgba(61,245,166,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
    const g2 = ctx.createRadialGradient(W, H, 0, W, H, W * 0.9);
    g2.addColorStop(0, 'rgba(124,92,255,.30)'); g2.addColorStop(1, 'rgba(124,92,255,0)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, W, H);
  } else if (tema === 'popular') {
    ctx.save(); ctx.globalAlpha = 0.12; ctx.strokeStyle = c.texto; ctx.lineWidth = 2;
    for (let x = -H; x < W; x += 18) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
    ctx.restore();
  } else if (tema === 'limpio') {
    ctx.fillStyle = c.acento; ctx.fillRect(0, 0, W, 14);
  } else if (tema === 'elegante') {
    const g = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W);
    g.addColorStop(0, 'rgba(201,164,92,.28)'); g.addColorStop(1, 'rgba(201,164,92,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // Montañas del Huila al pie
    const base = H - 150;
    ctx.fillStyle = 'rgba(201,164,92,.10)';
    const cresta = [[0, 60], [90, 30], [170, 45], [260, 0], [330, 20], [420, -30], [490, -48], [560, -32], [630, 10], [740, -12], [840, 28], [940, -4], [1020, 30], [1080, 18]];
    ctx.beginPath(); ctx.moveTo(0, H);
    for (const [px, py] of cresta) ctx.lineTo(px, base + py);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(201,164,92,.6)'; ctx.lineWidth = 2; ctx.beginPath();
    cresta.forEach(([px, py], k) => (k ? ctx.lineTo(px, base + py) : ctx.moveTo(px, base + py))); ctx.stroke();
    ctx.fillStyle = 'rgba(244,239,230,.85)'; ctx.beginPath();
    ctx.moveTo(452, base - 40); ctx.lineTo(490, base - 48); ctx.lineTo(528, base - 38); ctx.lineTo(505, base - 30); ctx.lineTo(488, base - 38); ctx.lineTo(470, base - 28); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#13243A'; ctx.beginPath(); ctx.moveTo(0, H);
    for (const [px, py] of [[0, 90], [140, 62], [260, 84], [400, 50], [540, 80], [680, 44], [820, 78], [960, 56], [1080, 82]]) ctx.lineTo(px, base + py);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }
  if (tema === 'opita') {
    zigzag(ctx, 0, W, 26, c.cinta1, c.cinta2);
    zigzag(ctx, H - 26, W, 26, c.cinta1, c.cinta2);
  }

  // Marca de agua de Opita Digital en todo el anuncio
  ctx.save();
  ctx.globalAlpha = tema === 'limpio' ? 0.02 : 0.025;
  ctx.fillStyle = c.texto;
  ctx.font = '700 26px "Public Sans"';
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.42);
  for (let yy = -H; yy < H; yy += 150) {
    for (let xx = -W * 1.2; xx < W * 1.2; xx += 380) ctx.fillText('OPITA DIGITAL', xx + ((yy / 150) % 2 ? 190 : 0), yy);
  }
  ctx.restore();

  // Sobretítulo
  let y = M + (tema === 'opita' ? 40 : 20);
  ctx.fillStyle = c.texto;
  ctx.font = '500 26px "Plex Mono"';
  ctx.globalAlpha = 0.85;
  ctx.fillText(`REGISTRO CIUDADANO · ${config.nombre.toUpperCase()}`.slice(0, 52), M, y);
  ctx.globalAlpha = 1;

  // Eslogan grande con la última palabra resaltada
  const alto = formato === 'cuadrado' ? 96 : formato === 'historia' ? 150 : 112;
  ctx.font = `${pesoTitulo} ${alto}px ${display}`;
  const palabras = config.eslogan.trim().split(/\s+/);
  const ultima = palabras.length - 1;
  const lineas = partirLineas(ctx, config.eslogan.trim(), W - M * 2);
  y += alto * 1.05 + 20;
  let idx = 0;
  for (const linea of lineas) {
    let x = M;
    for (const palabra of linea.split(' ')) {
      const w = ctx.measureText(palabra).width;
      if (idx === ultima) {
        const pe = partesEslogan(palabra);
        const wr = ctx.measureText(pe.resaltado).width;
        if (tema === 'elegante') {
          ctx.font = `italic 400 ${alto}px Fraunces`;
          const wi = ctx.measureText(pe.resaltado).width;
          ctx.fillStyle = '#C9A45C';
          ctx.fillText(pe.resaltado, x, y);
          ctx.font = `${pesoTitulo} ${alto}px ${display}`;
          ctx.fillStyle = c.texto;
          ctx.fillText(pe.fin, x + wi + 4, y);
          x += wi + ctx.measureText(pe.fin).width + ctx.measureText(' ').width;
          idx += 1;
          continue;
        }
        if (!esTransparente(c.resaltado)) {
          ctx.fillStyle = c.resaltado;
          rectRedondeado(ctx, x - 12, y - alto * 0.8, wr + 24, alto * 0.98, 14);
          ctx.fill();
          ctx.fillStyle = c.sobreResaltado;
        } else {
          ctx.fillStyle = c.acento;
          ctx.fillRect(x, y + alto * 0.08, wr, alto * 0.1);
          ctx.fillStyle = c.acento;
        }
        ctx.fillText(pe.resaltado, x, y);
        ctx.fillStyle = c.texto;
        ctx.fillText(pe.fin, x + wr + 14, y);
      } else {
        ctx.fillStyle = c.texto;
        ctx.fillText(palabra, x, y);
      }
      x += w + ctx.measureText(' ').width;
      idx += 1;
    }
    y += alto * 0.98;
  }

  // Texto de invitación
  y += 16;
  ctx.font = `500 ${formato === 'cuadrado' ? 28 : 32}px "Public Sans"`;
  ctx.fillStyle = c.texto;
  ctx.globalAlpha = 0.92;
  for (const l of partirLineas(ctx, 'Regístrate gratis en un minuto: escanea el código o entra al enlace.', W - M * 2)) {
    ctx.fillText(l, M, y); y += formato === 'cuadrado' ? 40 : 46;
  }
  ctx.globalAlpha = 1;

  // Tarjeta con el QR
  const pie = (tema === 'opita' ? 26 : 0) + 96;
  const espacio = H - y - pie;
  const extra = 112;
  const tamQR = Math.max(300, Math.min(formato === 'historia' ? 600 : 460, espacio - extra - 30));
  const tarjetaW = tamQR + 56;
  const tarjetaH = tamQR + extra;
  const tx = formato === 'historia' ? (W - tarjetaW) / 2 : M;
  const ty = y + Math.max(20, (espacio - tarjetaH) / 2);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
  ctx.fillStyle = '#FFFFFF';
  rectRedondeado(ctx, tx, ty, tarjetaW, tarjetaH, 28);
  ctx.fill();
  ctx.restore();
  dibujarQR(ctx, matrizQR(url), tx + 28, ty + 28, tamQR, '#111111');
  ctx.fillStyle = '#111111';
  ctx.font = `700 ${Math.round(Math.min(30, (tarjetaW - 56) / 13))}px "Public Sans"`;
  ctx.textAlign = 'center';
  ctx.fillText('ESCANEA Y REGÍSTRATE', tx + tarjetaW / 2, ty + tamQR + 66);
  ctx.font = '500 21px "Plex Mono"';
  ctx.fillStyle = '#555555';
  const corto = url.replace(/^https?:\/\//, '').replace(/\/$/, '');
  ctx.fillText(corto.length > 34 ? `${corto.slice(0, 33)}…` : corto, tx + tarjetaW / 2, ty + tamQR + 96);
  ctx.textAlign = 'left';

  // Botón dibujado al lado del QR (post y cuadrado)
  if (formato !== 'historia') {
    const bx = tx + tarjetaW + 48;
    const bw = W - bx - M;
    if (bw > 220) {
      ctx.font = `${pesoTitulo} 64px ${display}`;
      ctx.fillStyle = c.texto;
      let by = ty + 70;
      for (const l of partirLineas(ctx, 'Súmate hoy', bw)) { ctx.fillText(l, bx, by); by += 68; }
      ctx.font = '500 30px "Public Sans"';
      ctx.globalAlpha = 0.9;
      for (const l of partirLineas(ctx, 'Recibe primero las noticias y reuniones de tu barrio y tu comuna.', bw)) { by += 6; ctx.fillText(l, bx, by + 30); by += 38; }
      ctx.globalAlpha = 1;
      const botonY = ty + tarjetaH - 96;
      ctx.fillStyle = tema === 'elegante' ? '#C9A45C' : c.boton;
      rectRedondeado(ctx, bx, botonY, Math.min(bw, 330), 90, 18);
      ctx.fill();
      ctx.fillStyle = tema === 'elegante' ? '#0E1B2C' : c.sobreBoton;
      ctx.font = '700 34px "Public Sans"';
      ctx.fillText('Regístrate →', bx + 34, botonY + 57);
    }
  }

  // Pie con la firma de Opita Digital
  const logo = await cargarImagen((config.marca && config.marca.logo) || '/marca/opita-digital.svg');
  const py = H - (tema === 'opita' ? 26 : 0) - 40;
  ctx.globalAlpha = 0.6;
  if (logo) ctx.drawImage(logo, M, py - 26, 30, 30);
  ctx.fillStyle = c.texto;
  ctx.font = '500 19px "Public Sans"';
  const textoCredito = `Desarrollado por ${(config.marca && config.marca.empresa) || 'Opita Digital'}`;
  ctx.fillText(textoCredito, M + (logo ? 40 : 0), py - 4);
  const contacto = enlacesContacto(config.marca || {}).slice(0, 2).map((x) => x.texto).join('  ·  ');
  if (contacto) {
    ctx.font = '500 17px "Public Sans"';
    ctx.textAlign = 'right';
    ctx.fillText(contacto, W - M, py - 4);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;
}

function descargarCanvas(canvas, nombre) {
  const a = el('a', { href: canvas.toDataURL('image/png'), download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
}

function nombreArchivo(base) {
  const slug = config.nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base}-${slug || 'campana'}.png`;
}

async function vistaPanelCompartir() {
  const vista = document.getElementById('vista-panel');
  vista.replaceChildren(plantilla('tpl-panel-compartir'));
  const url = urlPublica();
  const canvas = document.getElementById('afiche');
  let formato = 'post';

  document.getElementById('enlace-publico').value = url;
  if (/^https?:\/\/(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url)) {
    document.getElementById('aviso-enlace').textContent =
      'Este enlace solo funciona en este computador. Cuando publique la app en internet, ponga el dominio en Ajustes y el QR se actualiza solo.';
  }

  const texto = document.getElementById('texto-mensaje');
  texto.value = `¡Súmate a ${config.nombre}! ${config.eslogan} Regístrate en un minuto aquí: ${url}`;
  const whatsapp = document.getElementById('compartir-whatsapp');
  const actualizarWhatsapp = () => { whatsapp.href = `https://wa.me/?text=${encodeURIComponent(texto.value)}`; };
  actualizarWhatsapp();
  texto.addEventListener('input', actualizarWhatsapp);

  const copiar = document.getElementById('copiar-enlace');
  copiar.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); copiar.textContent = 'Copiado'; } catch { document.getElementById('enlace-publico').select(); }
  });

  for (const b of vista.querySelectorAll('.formato')) {
    b.addEventListener('click', async () => {
      formato = b.dataset.formato;
      for (const o of vista.querySelectorAll('.formato')) {
        o.classList.toggle('activo', o === b);
        o.setAttribute('aria-checked', String(o === b));
      }
      await dibujarAfiche(canvas, formato, url);
    });
  }

  document.getElementById('descargar-afiche').addEventListener('click', () => descargarCanvas(canvas, nombreArchivo(`anuncio-${formato}`)));

  document.getElementById('descargar-qr').addEventListener('click', () => {
    const qr = matrizQR(url);
    const n = qr.getModuleCount();
    const tam = 1000;
    const borde = Math.round((tam / n) * 4);
    const c = el('canvas');
    c.width = tam + borde * 2;
    c.height = tam + borde * 2 + 90;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, c.width, c.height);
    dibujarQR(ctx, qr, borde, borde, tam);
    ctx.fillStyle = '#555555';
    ctx.font = '500 30px "Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(url.replace(/^https?:\/\//, '').replace(/\/$/, ''), c.width / 2, tam + borde + 50);
    ctx.font = '500 20px "Public Sans"';
    ctx.fillStyle = '#999999';
    ctx.fillText(`Desarrollado por ${(config.marca && config.marca.empresa) || 'Opita Digital'}`, c.width / 2, tam + borde + 84);
    descargarCanvas(c, nombreArchivo('qr'));
  });

  document.getElementById('imprimir-afiche').addEventListener('click', () => {
    const img = el('img', { id: 'impresion', src: canvas.toDataURL('image/png'), alt: '' });
    document.body.append(img);
    document.body.classList.add('imprimiendo');
    const limpiar = () => { document.body.classList.remove('imprimiendo'); img.remove(); window.removeEventListener('afterprint', limpiar); };
    window.addEventListener('afterprint', limpiar);
    img.onload = () => window.print();
  });

  const nativo = document.getElementById('compartir-nativo');
  if (navigator.share) {
    nativo.hidden = false;
    nativo.addEventListener('click', async () => {
      try {
        const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png'));
        const archivo = new File([blob], nombreArchivo('anuncio'), { type: 'image/png' });
        const datos = { title: config.nombre, text: texto.value };
        if (navigator.canShare && navigator.canShare({ files: [archivo] })) datos.files = [archivo];
        else datos.url = url;
        await navigator.share(datos);
      } catch { /* el usuario canceló */ }
    });
  }

  await dibujarAfiche(canvas, formato, url);
}

// ==========================================================================
// AJUSTES
// ==========================================================================
function vistaPanelAjustes() {
  const vista = document.getElementById('vista-panel');
  vista.replaceChildren(plantilla('tpl-panel-ajustes'));
  const form = document.getElementById('form-ajustes');
  document.getElementById('a-nombre').value = config.nombre;
  document.getElementById('a-eslogan').value = config.eslogan;
  document.getElementById('a-urlPublica').value = config.urlPublica || '';
  document.getElementById('a-candidato').value = config.candidato || '';
  const vistaFoto = document.getElementById('a-foto-vista');
  const quitarFoto = document.getElementById('a-foto-quitar');
  const pintarFoto = () => { pintarFotoCandidato(vistaFoto); quitarFoto.hidden = !config.foto; };
  pintarFoto();
  async function guardarFoto(foto) {
    try {
      config = { ...config, ...(await api('/api/ajustes', { method: 'PUT', body: JSON.stringify({ foto }) })) };
      pintarFoto();
      guardado.hidden = false;
      setTimeout(() => { guardado.hidden = true; }, 2500);
    } catch (e) {
      if (e.estado === 401) { manejarErrorPanel(e, vista); return; }
      error.textContent = e.message;
    }
  }
  document.getElementById('a-foto').addEventListener('change', async (ev) => {
    const archivo = ev.target.files[0];
    if (!archivo) return;
    error.textContent = '';
    try {
      // Se recorta en cuadrado y se reduce a 480 px para que pese poco.
      const img = await createImageBitmap(archivo);
      const lado = Math.min(img.width, img.height);
      const c = el('canvas');
      c.width = 480; c.height = 480;
      c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 480, 480);
      await guardarFoto(c.toDataURL('image/jpeg', 0.86));
    } catch {
      error.textContent = 'No se pudo leer la imagen. Pruebe con un archivo JPG o PNG.';
    }
    ev.target.value = '';
  });
  quitarFoto.addEventListener('click', () => guardarFoto(''));
  const guardado = document.getElementById('guardado');
  const error = document.getElementById('error-ajustes');

  for (const r of form.querySelectorAll('input[name="tema"]')) {
    r.checked = r.value === config.tema;
    r.addEventListener('change', async () => {
      aplicarTema(r.value);
      try {
        config = { ...config, ...(await api('/api/ajustes', { method: 'PUT', body: JSON.stringify({ tema: r.value }) })) };
        guardado.hidden = false;
        setTimeout(() => { guardado.hidden = true; }, 2500);
      } catch (e) {
        if (e.estado === 401) { manejarErrorPanel(e, vista); return; }
        error.textContent = e.message;
      }
    });
  }

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    error.textContent = '';
    for (const n of form.querySelectorAll('[aria-invalid="true"]')) n.removeAttribute('aria-invalid');
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const nuevos = await api('/api/ajustes', {
        method: 'PUT',
        body: JSON.stringify({
          nombre: document.getElementById('a-nombre').value,
          eslogan: document.getElementById('a-eslogan').value,
          urlPublica: document.getElementById('a-urlPublica').value,
          candidato: document.getElementById('a-candidato').value,
        }),
      });
      config = { ...config, ...nuevos };
      document.getElementById('a-urlPublica').value = config.urlPublica;
      ponerNombre(raiz);
      guardado.hidden = false;
      setTimeout(() => { guardado.hidden = true; }, 2500);
    } catch (e) {
      if (e.estado === 401) { manejarErrorPanel(e, vista); return; }
      error.textContent = e.message;
      if (e.campo) document.getElementById(`a-${e.campo}`)?.setAttribute('aria-invalid', 'true');
    } finally {
      boton.disabled = false;
    }
  });

  // Ficha de Opita Digital
  const m = config.marca || {};
  const contactos = enlacesContacto(m);
  document.getElementById('autor').replaceChildren(
    el('div', { className: 'autor-cab' },
      el('img', { src: m.logo || '/marca/opita-digital.svg', alt: `Logo de ${m.empresa || 'Opita Digital'}` }),
      el('div', {}, el('strong', { textContent: m.empresa || 'Opita Digital' }), el('span', { className: 'meta', textContent: m.lema || '' }))),
    contactos.length
      ? el('ul', {}, ...contactos.map((c) => el('li', {}, el('span', { textContent: c.tipo }),
        el('a', { href: c.href, target: '_blank', rel: 'noopener', className: 'enlace', textContent: c.texto }))))
      : el('p', { className: 'meta', textContent: 'Los datos de contacto de Opita Digital se configuran en el archivo marca.js.' }),
    el('p', { className: 'meta', textContent: '© Opita Digital. Todos los derechos reservados. Esta aplicación lleva su firma y marca de agua.' }));
}

// ==========================================================================
// ENRUTADOR
// ==========================================================================
async function enrutar() {
  limpiarVista();
  const h = location.hash || '#/';

  if (h.startsWith('#/panel')) {
    document.title = `Panel · ${config.nombre}`;
    if (!sesionAdmin) {
      try { sesionAdmin = (await api('/api/sesion')).admin; } catch { sesionAdmin = false; }
    }
    if (!sesionAdmin) { vistaLogin(); return; }
    montarPanel();
    marcarNav('.nav-panel', h);
    if (h === '#/panel/registros') vistaPanelRegistros();
    else if (h === '#/panel/encuestas') vistaPanelEncuestas();
    else if (h === '#/panel/compartir') vistaPanelCompartir();
    else if (h === '#/panel/ajustes') vistaPanelAjustes();
    else vistaPanelInicio();
    window.scrollTo(0, 0);
    return;
  }

  montarPublico();
  marcarNav('.nav-publica', h);
  document.title = config.nombre;
  const m = h.match(/^#\/encuesta\/([A-Za-z0-9_-]+)$/);
  if (m) vistaEncuesta(m[1]);
  else if (h === '#/encuestas') vistaEncuestasPublicas();
  else vistaRegistro();
}

window.addEventListener('hashchange', enrutar);
window.addEventListener('scroll', ocultarTooltip, { passive: true });

(async () => {
  try { config = await api('/api/config'); } catch { /* usa valores por defecto */ }
  aplicarTema(config.tema);
  enrutar();
  protegerMarca();
})();
