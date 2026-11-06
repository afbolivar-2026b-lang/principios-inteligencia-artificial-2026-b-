'use strict';

// Cliente de la app de campaña. Todo el contenido del usuario se inserta con
// textContent para evitar inyección de HTML. Sin librerías externas.

const raiz = document.getElementById('raiz');
const tooltip = document.getElementById('tooltip');
const SVG = 'http://www.w3.org/2000/svg';
const fmt = new Intl.NumberFormat('es-CO');
let temporizador = null;
let config = { nombre: 'Campaña', totalRegistros: 0 };
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

async function vistaPanelInicio() {
  const vista = document.getElementById('vista-panel');
  vista.replaceChildren(plantilla('tpl-panel-inicio'));
  const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.getElementById('fecha-hoy').textContent = hoy;

  let d;
  try {
    d = await api('/api/panel');
  } catch (e) {
    manejarErrorPanel(e, vista);
    return;
  }

  const txt = (id, v) => { document.getElementById(id).textContent = v; };
  txt('k-total', fmt.format(d.total));
  txt('k-total-nota', d.total
    ? `en ${plural(d.totalComunas, 'comuna', 'comunas')} y ${plural(d.totalBarrios, 'barrio', 'barrios')}`
    : 'Comparte el formulario para empezar');
  txt('k-hoy', fmt.format(d.hoy));
  txt('k-semana', fmt.format(d.semana));
  txt('k-edad', d.edadPromedio ?? '—');

  const nota = document.getElementById('k-semana-nota');
  if (d.semanaAnterior > 0) {
    const cambio = Math.round(((d.semana - d.semanaAnterior) / d.semanaAnterior) * 100);
    const clase = cambio > 0 ? 'sube' : cambio < 0 ? 'baja' : 'igual';
    const signo = cambio > 0 ? '▲ +' : cambio < 0 ? '▼ ' : '';
    nota.replaceChildren(el('span', { className: `delta ${clase}`, textContent: `${signo}${cambio}%` }), 'vs. semana anterior');
  } else {
    nota.textContent = d.semana ? 'primera semana con datos' : 'sin registros esta semana';
  }

  txt('k-comunas', fmt.format(d.totalComunas));
  txt('k-barrios', fmt.format(d.totalBarrios));
  txt('k-encuestas', fmt.format(d.encuestas.activas));
  txt('k-votos', fmt.format(d.encuestas.votos));

  const formatoDia = new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
  graficoColumnas(document.getElementById('g-dias'), d.porDia.map((p) => {
    const f = new Date(`${p.fecha}T12:00:00Z`);
    return { etiqueta: formatoDia.format(f), etiquetaCorta: String(f.getUTCDate()), valor: p.total };
  }), { cadaEtiqueta: 5 });

  const comunas = d.comunas.length > 8
    ? [...d.comunas.slice(0, 7), { nombre: 'Otras', total: d.comunas.slice(7).reduce((s, c) => s + c.total, 0) }]
    : d.comunas;
  barrasHorizontales(document.getElementById('g-comunas'),
    comunas.map((c) => ({ etiqueta: c.nombre, valor: c.total })), { vacio: 'Aún no hay comunas registradas.' });

  graficoColumnas(document.getElementById('g-edades'),
    d.edades.map((e) => ({ etiqueta: `${e.rango} años`, etiquetaCorta: e.rango, valor: e.total })),
    { alto: 300, unidad: ['persona', 'personas'], mostrarValores: true });

  const ol = document.getElementById('l-barrios');
  if (!d.barrios.length) {
    ol.replaceChildren(el('li', { className: 'vacio', textContent: 'Aún no hay barrios registrados.' }));
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

  const cont = document.getElementById('l-encuestas');
  if (!d.encuestas.lista.length) {
    cont.replaceChildren(el('div', { className: 'grafico-vacio' },
      'No hay encuestas todavía. ', el('a', { href: '#/panel/encuestas', className: 'enlace', textContent: 'Crear la primera' })));
  } else {
    cont.replaceChildren(...d.encuestas.lista.map((e) => {
      const lider = e.opciones.reduce((a, b) => (b.votos > a.votos ? b : a));
      return el('a', { href: `#/encuesta/${encodeURIComponent(e.id)}`, className: 'mini', target: '_blank', rel: 'noopener' },
        el('span', { className: `etiqueta-estado ${e.cerrada ? 'cerrada' : 'abierta'}`, textContent: e.cerrada ? 'Cerrada' : 'Abierta' }),
        el('h3', { textContent: e.pregunta }),
        el('p', { className: 'mini-lider' }, e.totalVotos
          ? el('span', {}, e.cerrada ? 'Ganó ' : 'Va ganando ', el('strong', { textContent: lider.texto }), ` · ${plural(e.totalVotos, 'voto', 'votos')}`)
          : 'Sin votos todavía'));
    }));
  }
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
  enrutar();
})();
