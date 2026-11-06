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
    headers: { 'Content-Type': 'application/json' },
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

// ---------- Enrutador ----------
function enrutar() {
  clearInterval(temporizador);
  const m = location.hash.match(/^#\/encuesta\/([A-Za-z0-9_-]+)$/);
  if (m) vistaEncuesta(m[1]);
  else vistaInicio();
}

window.addEventListener('hashchange', enrutar);
enrutar();
