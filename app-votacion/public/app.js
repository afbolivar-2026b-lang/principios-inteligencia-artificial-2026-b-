'use strict';

// Cliente de la app de votación. Todo el contenido del usuario se inserta con
// textContent para evitar inyección de HTML.

const app = document.getElementById('app');
let temporizador = null;

const CLAVES = 'clavesAdmin';
function leerClaves() {
  try { return JSON.parse(localStorage.getItem(CLAVES)) || {}; } catch { return {}; }
}
function guardarClave(id, clave) {
  try {
    const c = leerClaves();
    c[id] = clave;
    localStorage.setItem(CLAVES, JSON.stringify(c));
  } catch { /* almacenamiento no disponible */ }
}

async function api(ruta, opciones = {}) {
  const res = await fetch(ruta, {
    ...opciones,
    headers: { 'Content-Type': 'application/json', ...(opciones.headers || {}) },
    credentials: 'same-origin',
  });
  const datos = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(datos.error || 'Error de conexión');
  return datos;
}

function el(etiqueta, props = {}, ...hijos) {
  const n = document.createElement(etiqueta);
  Object.assign(n, props);
  for (const h of hijos) n.append(h);
  return n;
}

function plantilla(id) {
  return document.getElementById(id).content.cloneNode(true);
}

function votosTexto(n) {
  return `${n} ${n === 1 ? 'voto' : 'votos'}`;
}

// ---------- Inicio ----------
function vistaInicio() {
  app.replaceChildren(plantilla('tpl-inicio'));
  const lista = document.getElementById('lista-opciones');

  function agregarOpcion(valor = '') {
    if (lista.children.length >= 10) return;
    const input = el('input', {
      maxLength: 100,
      value: valor,
      placeholder: `Opción ${lista.children.length + 1}`,
    });
    input.setAttribute('aria-label', 'Opción');
    const quitar = el('button', { type: 'button', className: 'icono', textContent: '✕' });
    quitar.setAttribute('aria-label', 'Quitar opción');
    const fila = el('div', { className: 'fila-opcion' }, input, quitar);
    quitar.addEventListener('click', () => {
      if (lista.children.length > 2) fila.remove();
    });
    lista.append(fila);
  }
  agregarOpcion();
  agregarOpcion();
  document.getElementById('agregar-opcion').addEventListener('click', () => agregarOpcion());

  document.getElementById('form-crear').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-crear');
    const boton = ev.target.querySelector('button[type="submit"]');
    error.textContent = '';
    boton.disabled = true;
    try {
      const { encuesta, claveAdmin } = await api('/api/encuestas', {
        method: 'POST',
        body: JSON.stringify({
          pregunta: document.getElementById('pregunta').value,
          opciones: [...lista.querySelectorAll('input')].map((i) => i.value),
        }),
      });
      guardarClave(encuesta.id, claveAdmin);
      location.hash = `#/encuesta/${encuesta.id}`;
    } catch (e) {
      error.textContent = e.message;
    } finally {
      boton.disabled = false;
    }
  });

  cargarLista();
}

async function cargarLista() {
  const ul = document.getElementById('lista-encuestas');
  try {
    const encuestas = await api('/api/encuestas');
    if (!encuestas.length) {
      ul.replaceChildren(el('li', { className: 'vacio', textContent: 'Aún no hay encuestas. ¡Crea la primera!' }));
      return;
    }
    ul.replaceChildren(...encuestas.map((e) =>
      el('li', {},
        el('a', { href: `#/encuesta/${encodeURIComponent(e.id)}` },
          el('span', { textContent: e.pregunta }),
          el('span', {
            className: 'etiqueta',
            textContent: `${votosTexto(e.totalVotos)}${e.cerrada ? ' · cerrada' : ''}`,
          })))));
  } catch (e) {
    ul.replaceChildren(el('li', { className: 'vacio', textContent: e.message }));
  }
}

// ---------- Encuesta ----------
async function vistaEncuesta(id) {
  app.replaceChildren(plantilla('tpl-encuesta'));
  const clave = leerClaves()[id];

  document.getElementById('copiar').addEventListener('click', async (ev) => {
    try {
      await navigator.clipboard.writeText(location.href);
      ev.target.textContent = '¡Enlace copiado!';
    } catch {
      ev.target.textContent = location.href;
    }
  });

  const botonCerrar = document.getElementById('cerrar');
  botonCerrar.addEventListener('click', async () => {
    if (!confirm('¿Cerrar la votación? Nadie más podrá votar.')) return;
    try {
      pintar(await api(`/api/encuestas/${encodeURIComponent(id)}/cerrar`, {
        method: 'POST',
        body: JSON.stringify({ claveAdmin: clave }),
      }));
    } catch (e) {
      alert(e.message);
    }
  });

  document.getElementById('form-votar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-votar');
    const elegido = ev.target.querySelector('input[name="opcion"]:checked');
    if (!elegido) {
      error.textContent = 'Elige una opción.';
      return;
    }
    try {
      pintar(await api(`/api/encuestas/${encodeURIComponent(id)}/votar`, {
        method: 'POST',
        body: JSON.stringify({ opcion: Number(elegido.value) }),
      }));
    } catch (e) {
      error.textContent = e.message;
    }
  });

  let opcionesPintadas = false;

  function pintar(e) {
    document.title = `${e.pregunta} · Votaciones`;
    document.getElementById('titulo').textContent = e.pregunta;
    document.getElementById('meta').textContent =
      `${votosTexto(e.totalVotos)} · ${e.cerrada ? 'Votación cerrada' : 'Votación abierta'}`;

    const aviso = document.getElementById('aviso-admin');
    aviso.hidden = !clave || e.cerrada;
    aviso.textContent = 'Eres quien creó esta encuesta. Comparte el enlace para que otros voten.';
    botonCerrar.hidden = !clave || e.cerrada;

    const puedeVotar = !e.cerrada && e.miVoto === null;
    const form = document.getElementById('form-votar');
    form.hidden = !puedeVotar;
    if (puedeVotar && !opcionesPintadas) {
      document.getElementById('opciones-voto').replaceChildren(...e.opciones.map((o, i) =>
        el('label', {},
          el('input', { type: 'radio', name: 'opcion', value: String(i) }),
          el('span', { textContent: o.texto }))));
      opcionesPintadas = true;
    }

    const res = document.getElementById('resultados');
    res.hidden = puedeVotar;
    if (!puedeVotar) {
      const max = Math.max(...e.opciones.map((o) => o.votos));
      res.replaceChildren(...e.opciones.map((o, i) => {
        const pct = e.totalVotos ? Math.round((o.votos / e.totalVotos) * 100) : 0;
        const relleno = el('div', { className: 'relleno' });
        const fila = el('div', { className: 'resultado' + (e.miVoto === i ? ' mio' : '') },
          el('div', { className: 'cabecera' },
            el('span', { textContent: (e.cerrada && o.votos === max && max > 0 ? '🏆 ' : '') + o.texto }),
            el('span', { className: 'etiqueta', textContent: `${pct}% · ${votosTexto(o.votos)}` })),
          el('div', { className: 'pista' }, relleno));
        requestAnimationFrame(() => { relleno.style.width = `${pct}%`; });
        return fila;
      }));
    }
  }

  async function refrescar() {
    try {
      pintar(await api(`/api/encuestas/${encodeURIComponent(id)}`));
    } catch (e) {
      app.replaceChildren(el('section', { className: 'tarjeta' },
        el('a', { href: '#/', className: 'volver', textContent: '← Volver' }),
        el('p', { textContent: e.message })));
      clearInterval(temporizador);
    }
  }

  await refrescar();
  temporizador = setInterval(refrescar, 3000);
}

// ---------- Registro de la campaña ----------
function vistaRegistro() {
  app.replaceChildren(plantilla('tpl-registro'));
  window.scrollTo(0, 0);
  const canvas = document.getElementById('firma');
  const guia = document.getElementById('firma-guia');
  const ctx = canvas.getContext('2d');
  let firmado = false;
  let dibujando = false;

  function limpiar() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    firmado = false;
    guia.hidden = false;
  }
  limpiar();
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#111827';

  function punto(ev) {
    const r = canvas.getBoundingClientRect();
    return [
      (ev.clientX - r.left) * (canvas.width / r.width),
      (ev.clientY - r.top) * (canvas.height / r.height),
    ];
  }
  canvas.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    canvas.setPointerCapture(ev.pointerId);
    dibujando = true;
    const [x, y] = punto(ev);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!dibujando) return;
    const [x, y] = punto(ev);
    ctx.lineTo(x, y);
    ctx.stroke();
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
    const valor = (id) => document.getElementById(id).value;
    if (!firmado) { error.textContent = 'La firma es obligatoria.'; return; }
    if (!document.getElementById('r-autorizacion').checked) {
      error.textContent = 'Debe autorizar el tratamiento de datos personales.';
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
      app.replaceChildren(plantilla('tpl-registro-ok'));
      window.scrollTo(0, 0);
      document.getElementById('gracias').textContent =
        `Gracias, ${r.nombre}. Sus datos quedaron guardados.`;
      document.getElementById('otro-registro').addEventListener('click', vistaRegistro);
    } catch (e) {
      error.textContent = e.message;
      boton.disabled = false;
    }
  });
}

// ---------- Panel de administración ----------
let claveSesion = null; // solo en memoria: se pierde al recargar la página

function vistaAdmin() {
  app.replaceChildren(plantilla('tpl-admin'));
  const formLogin = document.getElementById('form-login');
  const panel = document.getElementById('panel');
  let todos = [];

  const auth = () => ({ Authorization: `Bearer ${claveSesion}` });

  function pintarFilas() {
    const q = document.getElementById('buscar').value.trim().toLowerCase();
    const lista = q
      ? todos.filter((r) => [r.nombre, r.apellido, r.cedula, r.barrio, r.comuna, r.telefono]
        .join(' ').toLowerCase().includes(q))
      : todos;
    document.getElementById('resumen').textContent =
      `${todos.length} ${todos.length === 1 ? 'persona registrada' : 'personas registradas'}` +
      (q ? ` · ${lista.length} coinciden con la búsqueda` : '');
    document.getElementById('filas').replaceChildren(...lista.map((r) => {
      const img = el('img', { src: r.firma, alt: `Firma de ${r.nombre} ${r.apellido}` });
      return el('tr', {},
        el('td', { textContent: `${r.nombre} ${r.apellido}` }),
        el('td', { textContent: r.cedula }),
        el('td', { textContent: String(r.edad) }),
        el('td', { textContent: r.telefono }),
        el('td', { textContent: r.barrio }),
        el('td', { textContent: r.comuna }),
        el('td', {}, img),
        el('td', { textContent: new Date(r.fecha).toLocaleString('es-CO') }));
    }));
  }

  async function cargar() {
    todos = await api('/api/registros', { headers: auth() });
    formLogin.hidden = true;
    panel.hidden = false;
    pintarFilas();
  }

  formLogin.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const error = document.getElementById('error-login');
    error.textContent = '';
    claveSesion = document.getElementById('clave').value;
    try {
      await cargar();
    } catch (e) {
      claveSesion = null;
      error.textContent = e.message;
    }
  });

  document.getElementById('buscar').addEventListener('input', pintarFilas);
  document.getElementById('salir').addEventListener('click', () => {
    claveSesion = null;
    vistaAdmin();
  });
  document.getElementById('exportar').addEventListener('click', async () => {
    const res = await fetch('/api/registros.csv', { headers: auth(), credentials: 'same-origin' });
    if (!res.ok) { alert('No se pudo descargar'); return; }
    const url = URL.createObjectURL(await res.blob());
    const a = el('a', { href: url, download: 'registros-campana.csv' });
    document.body.append(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  if (claveSesion) cargar().catch(() => { claveSesion = null; });
}

// ---------- Enrutador ----------
function enrutar() {
  clearInterval(temporizador);
  const h = location.hash || '#/registro';
  app.classList.toggle('ancho', h === '#/admin');
  for (const a of document.querySelectorAll('.menu a')) {
    const destino = a.getAttribute('href');
    a.classList.toggle('activo',
      destino === h || (destino === '#/' && h.startsWith('#/encuesta/')));
  }
  const m = h.match(/^#\/encuesta\/([A-Za-z0-9_-]+)$/);
  if (m) vistaEncuesta(m[1]);
  else if (h === '#/registro') vistaRegistro();
  else if (h === '#/admin') vistaAdmin();
  else vistaInicio();
}

window.addEventListener('hashchange', enrutar);
enrutar();
