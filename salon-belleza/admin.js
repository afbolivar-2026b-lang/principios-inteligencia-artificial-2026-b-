// ===== PANEL DEL SALÓN (Neiva Belleza) =====
// Todo lo que se ve aquí sale de la base de datos real. Las reglas de seguridad (RLS)
// deciden qué puede ver y cambiar cada rol: dueña, recepción o estilista.

const $ = (id) => document.getElementById(id);
const esc = escaparHTML;
const sesion = { usuario: null, perfil: null };
const ROLES = { duena: 'Dueña', recepcion: 'Recepción', estilista: 'Estilista' };
const ESTADOS = {
  pendiente: ['Pendiente', 'estado-pendiente'], confirmada: ['Confirmada', 'estado-confirmada'],
  llego: ['Llegó', 'estado-llego'], en_curso: ['En curso', 'estado-en-curso'], terminada: ['Terminada', 'estado-confirmada'],
  no_asistio: ['No asistió', 'estado-cancelada'], cancelada: ['Cancelada', 'estado-cancelada'],
};
const METODOS = { efectivo: 'Efectivo', nequi: 'Nequi', daviplata: 'Daviplata', tarjeta: 'Tarjeta', transferencia: 'Transferencia', bono: 'Bono / tarjeta regalo' };
const CATEGORIAS_GASTO = { arriendo: 'Arriendo', servicios: 'Servicios públicos', insumos: 'Insumos', nomina: 'Nómina', publicidad: 'Publicidad', mantenimiento: 'Mantenimiento', otros: 'Otros' };
const PLANTILLAS_BASE = {
  recordatorio: 'Hola {nombre}, te recordamos tu cita en {salon} el {fecha} a las {hora} con {profesional}. Si necesitas cambiarla: {enlace}',
  agradecimiento: '¡Gracias por visitarnos, {nombre}! Nos ayudaría mucho tu opinión: {resena}',
  reactivar: 'Hola {nombre}, ¡te extrañamos en {salon}! Esta semana tienes 10% de descuento en tu próxima cita. Reserva aquí: {reservar}',
  espera: 'Hola {nombre}, se liberó un cupo el {fecha} en {salon}. ¿Lo quieres? Responde este mensaje y te lo reservamos.',
  cumpleanos: '¡Feliz cumpleaños, {nombre}! 🎂 En {salon} te regalamos 15% de descuento este mes.',
};
let PLANTILLAS = { ...PLANTILLAS_BASE };

// ===== Utilidades =====
const urlBase = () => location.origin + location.pathname.replace(/[^/]*$/, '');
const esAdmin = () => ['duena', 'recepcion'].includes(sesion.perfil?.rol);
const esDuena = () => sesion.perfil?.rol === 'duena';
const hoyCol = () => ahoraColombia().fecha;
const sumarDias = (fecha, n) => { const d = deTextoFecha(fecha); d.setDate(d.getDate() + n); return aTextoFecha(d); };
const inicioDiaISO = (fecha) => aISOColombia(fecha, '0:00');
const nombreProfesional = (id) => (PROFESIONALES.find((p) => p.id === id) || {}).nombre || '—';
const horaDe = (iso) => horaLegible(fechaHoraColombia(iso).hora);
const fechaLarga = (fecha) => capitalizar(fechaLegible(fecha, { weekday: 'long', day: 'numeric', month: 'long' }));
const pill = (estado) => { const [t, c] = ESTADOS[estado] || [estado, '']; return `<span class="estado ${c}">${t}</span>`; };

function telefonoWA(tel) {
  const d = String(tel || '').replace(/\D/g, '');
  return d.length === 10 && d.startsWith('3') ? '57' + d : d;
}
function rellenar(plantilla, datos) {
  return plantilla.replace(/\{(\w+)\}/g, (_, k) => (datos[k] !== undefined ? datos[k] : ''));
}
function enlaceWA(tel, texto) { return `https://wa.me/${telefonoWA(tel)}?text=${encodeURIComponent(texto)}`; }

function toast(texto, error = false) {
  const t = $('toast');
  t.textContent = texto;
  t.className = 'toast' + (error ? ' error' : '');
  t.hidden = false;
  clearTimeout(toast.temporizador);
  toast.temporizador = setTimeout(() => { t.hidden = true; }, 3800);
}

async function intentar(fn, exito) {
  try {
    const r = await fn();
    if (exito) toast(exito);
    return r;
  } catch (e) {
    if (String(e.message).includes('JWT') || String(e.message).includes('HTTP_401')) { await salir(); return null; }
    toast(e instanceof TypeError ? 'Sin conexión. Revisa el internet e inténtalo de nuevo.' : mensajeError(e), true);
    throw e;
  }
}

function descargarCSV(nombre, filas) {
  const csv = filas.map((f) => f.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Ventana (modal) reutilizable
const modal = $('modal');
function abrirModal(titulo, cuerpo, pie = '') {
  $('modal-contenido').innerHTML = `
    <header class="modal-cabecera"><h2 id="modal-titulo">${titulo}</h2>
      <button type="button" class="cerrar-modal" data-cerrar-modal aria-label="Cerrar">✕</button></header>
    <div class="modal-cuerpo">${cuerpo}</div>
    ${pie ? `<footer class="modal-pie">${pie}</footer>` : ''}`;
  if (!modal.open) modal.showModal();
  return $('modal-contenido');
}
function cerrarModal() { if (modal.open) modal.close(); }
modal.addEventListener('click', (e) => {
  if (e.target === modal || e.target.closest('[data-cerrar-modal]')) cerrarModal();
});

// Sonido corto para avisar reservas nuevas
function sonar() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + i * 0.18 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      o.start(ctx.currentTime + i * 0.18); o.stop(ctx.currentTime + i * 0.18 + 0.2);
    });
  } catch (e) { /* sin audio */ }
}

// ===== INGRESO =====
let modoAcceso = 'login';
function mostrarPantalla(id) {
  ['pantalla-login', 'pantalla-pendiente', 'app'].forEach((p) => { $(p).hidden = p !== id; });
}
function pintarAcceso() {
  const titulos = { login: 'Ingresar', registro: 'Crear cuenta del equipo', recuperar: 'Recuperar contraseña' };
  $('titulo-acceso').textContent = titulos[modoAcceso];
  $('campo-nombre').hidden = modoAcceso !== 'registro';
  $('campo-clave').hidden = modoAcceso === 'recuperar';
  $('acceso-clave').autocomplete = modoAcceso === 'registro' ? 'new-password' : 'current-password';
  $('boton-acceso').textContent = { login: 'Entrar', registro: 'Crear cuenta', recuperar: 'Enviar enlace' }[modoAcceso];
  document.querySelectorAll('[data-modo]').forEach((b) => { b.hidden = b.dataset.modo === modoAcceso || (modoAcceso !== 'login' && b.dataset.modo !== 'login'); });
  $('error-acceso').hidden = true;
}
document.querySelector('.enlaces-acceso').addEventListener('click', (e) => {
  const b = e.target.closest('[data-modo]');
  if (!b) return;
  modoAcceso = b.dataset.modo;
  $('aviso-acceso').hidden = true;
  pintarAcceso();
});
$('form-acceso').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = $('acceso-email').value.trim();
  const clave = $('acceso-clave').value;
  const error = $('error-acceso');
  const aviso = $('aviso-acceso');
  error.hidden = true; aviso.hidden = true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = 'Escribe un correo válido.'; error.hidden = false; return; }
  if (modoAcceso !== 'recuperar' && clave.length < 8) { error.textContent = 'La contraseña debe tener al menos 8 caracteres.'; error.hidden = false; return; }
  $('boton-acceso').disabled = true;
  try {
    if (modoAcceso === 'login') {
      await iniciarSesion(email, clave);
      await entrar();
    } else if (modoAcceso === 'registro') {
      const r = await registrarse(email, clave, $('acceso-nombre').value.trim());
      if (r.access_token) await entrar();
      else { aviso.textContent = 'Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa.'; aviso.hidden = false; modoAcceso = 'login'; pintarAcceso(); }
    } else {
      await recuperarClave(email);
      aviso.textContent = 'Si el correo está registrado, te llegará un enlace para crear una contraseña nueva.'; aviso.hidden = false;
    }
  } catch (err) {
    error.textContent = err instanceof TypeError ? 'Sin conexión con el servidor.' : mensajeError(err);
    error.hidden = false;
  } finally {
    $('boton-acceso').disabled = false;
  }
});
document.addEventListener('click', (e) => { if (e.target.closest('[data-salir]')) salir(); });

async function salir() {
  clearInterval(vigilante);
  await cerrarSesion();
  sesion.perfil = null; sesion.usuario = null;
  modoAcceso = 'login'; pintarAcceso();
  mostrarPantalla('pantalla-login');
}

async function entrar() {
  sesion.usuario = usuarioActual();
  if (!sesion.usuario) { mostrarPantalla('pantalla-login'); return; }
  try {
    const [perfil] = await db.leer('perfiles', `select=*&user_id=eq.${sesion.usuario.sub}`);
    if (!perfil) { mostrarPantalla('pantalla-pendiente'); return; }
    sesion.perfil = perfil;
    await cargarCatalogo().catch(() => {});
    const [plantillas] = await db.leer('config', 'select=valor&clave=eq.plantillas').catch(() => []);
    if (plantillas) PLANTILLAS = { ...PLANTILLAS_BASE, ...plantillas.valor };
  } catch (e) {
    if (e instanceof TypeError) { toast('Sin conexión con el servidor.', true); }
    await salir();
    return;
  }
  const nombre = sesion.perfil.nombre || sesion.usuario.email || '';
  $('usuaria-nombre').textContent = nombre;
  $('usuaria-rol').textContent = ROLES[sesion.perfil.rol];
  $('usuaria-iniciales').textContent = nombre.split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase();
  mostrarPantalla('app');
  pintarMenu();
  irA(location.hash.slice(1) || 'inicio');
  iniciarVigilante();
  if (sesion.tipoEnlace === 'recovery') pedirClaveNueva();
}

function pedirClaveNueva() {
  abrirModal('Crea tu contraseña nueva', `
    <div class="campo"><label for="clave-nueva">Contraseña nueva (mínimo 8 caracteres)</label>
      <input id="clave-nueva" type="password" autocomplete="new-password" minlength="8"></div>`,
  '<button class="btn" id="guardar-clave">Guardar contraseña</button>');
  $('guardar-clave').onclick = async () => {
    const c = $('clave-nueva').value;
    if (c.length < 8) { toast('Mínimo 8 caracteres.', true); return; }
    await intentar(() => cambiarClave(c), 'Contraseña actualizada.');
    cerrarModal();
  };
}

// ===== MENÚ Y NAVEGACIÓN =====
const ICONOS_MENU = {
  inicio: '<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>',
  agenda: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  clientas: '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c.8-3.5 3.2-5 6-5s5.2 1.5 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M16 15c2.5 0 4.3 1.3 5 4"/>',
  caja: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  inventario: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
  espera: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  reportes: '<path d="M5 20V12M10 20V6M15 20v-9M20 20V4"/>',
  gastos: '<path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2M9 13h6"/>',
  equipo: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  catalogo: '<path d="M12 3l1.8 4.6L18 9l-4.2 1.4L12 15l-1.8-4.6L6 9l4.2-1.4z"/>',
  config: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  historial: '<path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6"/><path d="M4 4v4.6h4.6M12 8v4l3 2"/>',
};
const SECCIONES = [
  { id: 'inicio', nombre: 'Inicio', roles: ['duena', 'recepcion', 'estilista'] },
  { id: 'agenda', nombre: 'Agenda', roles: ['duena', 'recepcion', 'estilista'] },
  { id: 'clientas', nombre: 'Clientas', roles: ['duena', 'recepcion'] },
  { id: 'caja', nombre: 'Caja', roles: ['duena', 'recepcion'] },
  { id: 'inventario', nombre: 'Inventario', roles: ['duena', 'recepcion'] },
  { id: 'espera', nombre: 'Lista de espera', roles: ['duena', 'recepcion'] },
  { id: 'reportes', nombre: 'Reportes', roles: ['duena'] },
  { id: 'gastos', nombre: 'Gastos', roles: ['duena'] },
  { id: 'equipo', nombre: 'Equipo y comisiones', roles: ['duena', 'estilista'] },
  { id: 'catalogo', nombre: 'Servicios y precios', roles: ['duena'] },
  { id: 'config', nombre: 'Configuración', roles: ['duena'] },
  { id: 'historial', nombre: 'Historial de cambios', roles: ['duena'] },
];
const seccionesPermitidas = () => SECCIONES.filter((s) => s.roles.includes(sesion.perfil.rol));

function pintarMenu(actual) {
  $('menu-admin').innerHTML = seccionesPermitidas().map((s) => `
    <a href="#${s.id}" ${s.id === actual ? 'aria-current="page"' : ''}>
      <svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS_MENU[s.id]}</svg>${s.nombre}
      ${s.id === 'inicio' && pendientesSolicitudes ? `<span class="insignia">${pendientesSolicitudes}</span>` : ''}</a>`).join('');
}
let pendientesSolicitudes = 0;
let seccionActual = 'inicio';

async function irA(id) {
  const s = seccionesPermitidas().find((x) => x.id === id) || seccionesPermitidas()[0];
  seccionActual = s.id;
  if (location.hash.slice(1) !== s.id) history.replaceState(null, '', '#' + s.id);
  pintarMenu(s.id);
  const vista = $('vista');
  vista.innerHTML = '<p class="cargando">Cargando…</p>';
  try {
    await VISTAS[s.id](vista);
  } catch (e) {
    if (!vista.querySelector('.cabecera-vista')) {
      vista.innerHTML = `<p class="error-general">No se pudo cargar esta sección. ${e instanceof TypeError ? 'Revisa la conexión.' : esc(mensajeError(e))}</p>`;
    }
    console.error(e);
  }
}
window.addEventListener('hashchange', () => { if (sesion.perfil) irA(location.hash.slice(1)); });
function refrescar() { if (sesion.perfil) irA(seccionActual); }

// Revisa cada minuto si entraron reservas nuevas desde la página
let vigilante = null;
let ultimaRevision = new Date().toISOString();
function iniciarVigilante() {
  clearInterval(vigilante);
  if (!esAdmin()) return;
  vigilante = setInterval(async () => {
    try {
      const nuevas = await db.leer('reservas', `select=id,origen&creada=gt.${encodeURIComponent(ultimaRevision)}&origen=neq.salon`);
      ultimaRevision = new Date().toISOString();
      if (nuevas.length) {
        sonar();
        toast(`${nuevas.length === 1 ? 'Entró una reserva nueva' : `Entraron ${nuevas.length} reservas nuevas`} desde la página.`);
        if (['inicio', 'agenda'].includes(seccionActual)) refrescar();
      }
    } catch (e) { /* se reintenta en el próximo minuto */ }
  }, 60000);
}

// ======================================================
// ===== VISTAS =========================================
// ======================================================
const VISTAS = {};
const ORIGENES = { web: 'Página web', salon: 'En el salón', instagram: 'Instagram', google: 'Google', whatsapp: 'WhatsApp', facebook: 'Facebook', tiktok: 'TikTok', referido: 'Recomendación', agenda: 'Agenda' };

// Reservas de un rango, con los datos de la clienta
async function leerReservas(desde, hasta, extra = '') {
  return db.leer('reservas', `select=*,clientas(id,nombre,telefono,alergias,etiquetas,notas)&inicio=gte.${encodeURIComponent(inicioDiaISO(desde))}&inicio=lt.${encodeURIComponent(inicioDiaISO(sumarDias(hasta, 1)))}&order=inicio${extra}`);
}

// ----- INICIO -----
VISTAS.inicio = async (vista) => {
  const hoy = hoyCol();
  const consultas = [leerReservas(hoy, hoy)];
  if (esAdmin()) {
    consultas.push(
      db.leer('ventas', `select=total,metodo_pago&anulada=eq.false&fecha=gte.${encodeURIComponent(inicioDiaISO(hoy))}`),
      db.leer('reservas', `select=id&estado=eq.pendiente&inicio=gte.${encodeURIComponent(new Date().toISOString())}`),
      db.leer('lista_espera', `select=*&avisada=eq.false&fecha=gte.${hoy}&order=fecha`),
      db.leer('clientas', 'select=id,nombre,telefono,cumpleanos&cumpleanos=not.is.null'),
    );
  }
  if (esDuena()) consultas.push(db.leer('solicitudes_acceso', 'select=*&aprobada=eq.false&order=creada'));
  const [citas, ventas = [], pendientes = [], espera = [], cumples = [], solicitudes = []] = await Promise.all(consultas);
  pendientesSolicitudes = solicitudes.length;
  pintarMenu('inicio');
  const activas = citas.filter((c) => !['cancelada'].includes(c.estado));
  const ingresos = ventas.reduce((t, v) => t + v.total, 0);
  const stockBajo = PRODUCTOS.filter((p) => p.stock <= (p.stockMinimo ?? 5));
  const proximosCumples = cumples.filter((c) => {
    const [, m, d] = c.cumpleanos.split('-').map(Number);
    for (let i = 0; i < 7; i++) {
      const f = deTextoFecha(sumarDias(hoy, i));
      if (f.getMonth() + 1 === m && f.getDate() === d) return (c.enDias = i, true);
    }
    return false;
  });

  vista.innerHTML = `
    <header class="cabecera-vista">
      <div><h1>Hola, ${esc((sesion.perfil.nombre || '').split(' ')[0] || ROLES[sesion.perfil.rol])}</h1>
        <p>${fechaLarga(hoy)}</p></div>
      <div class="acciones-vista">
        ${esAdmin() ? `<input class="buscador" id="buscar-global" type="search" placeholder="Buscar clienta, celular o código de reserva" aria-label="Buscar">
        <button class="btn btn-pequeno" data-nueva-cita>+ Nueva cita</button>` : ''}
      </div>
    </header>
    <section class="kpis">
      <article class="kpi"><small>Citas de hoy</small><strong>${activas.length}</strong>
        <span class="detalle">${activas.filter((c) => c.estado === 'terminada').length} terminadas · ${activas.filter((c) => ['pendiente', 'confirmada'].includes(c.estado)).length} por atender</span></article>
      ${esAdmin() ? `
      <article class="kpi"><small>Ventas de hoy</small><strong>${formatoCOP(ingresos)}</strong>
        <span class="detalle">${ventas.length} venta${ventas.length === 1 ? '' : 's'} registrada${ventas.length === 1 ? '' : 's'}</span></article>
      <article class="kpi"><small>Por confirmar</small><strong>${pendientes.length}</strong>
        <span class="detalle ${pendientes.length ? 'alerta' : 'positivo'}">${pendientes.length ? 'citas futuras sin confirmar' : 'Todas confirmadas'}</span></article>
      <article class="kpi"><small>Stock bajo</small><strong>${stockBajo.length}</strong>
        <span class="detalle ${stockBajo.length ? 'alerta' : 'positivo'}">${stockBajo.length ? stockBajo.map((p) => esc(p.nombre)).slice(0, 2).join(', ') : 'Inventario al día'}</span></article>` : ''}
    </section>
    ${solicitudes.length ? `<section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Solicitudes de acceso</h2><small>Personas del equipo que crearon su cuenta</small></div></div>
      ${tablaSolicitudes(solicitudes)}</section>` : ''}
    <div class="grid-2">
      <section class="tarjeta-admin">
        <div class="tarjeta-cabecera"><div><h2>Citas de hoy</h2><small>${activas.length ? 'Toca una cita para ver el detalle' : ''}</small></div>
          <a class="enlace" href="#agenda">Ver agenda →</a></div>
        ${activas.length ? `<ul class="lista-citas">${activas.map(filaCita).join('')}</ul>` : '<p class="vacio">No hay citas para hoy.</p>'}
      </section>
      <div>
        ${esAdmin() ? `
        <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Lista de espera</h2><small>Próximos días</small></div><a class="enlace" href="#espera">Ver todo →</a></div>
          ${espera.length ? `<ul class="lista-citas">${espera.slice(0, 5).map((e) => `<li><span class="hora-cita">${fechaLegible(e.fecha)}</span>
            <div><strong>${esc(e.nombre)}</strong><small>${esc(e.telefono)}</small></div>
            <a class="boton-mini" target="_blank" rel="noopener" href="${enlaceWA(e.telefono, rellenar(PLANTILLAS.espera, { nombre: e.nombre.split(' ')[0], fecha: fechaLegible(e.fecha, { weekday: 'long', day: 'numeric', month: 'long' }), salon: SALON.nombre }))}">WhatsApp</a></li>`).join('')}</ul>` : '<p class="vacio">Nadie en espera.</p>'}
        </section>
        <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Cumpleaños esta semana</h2></div></div>
          ${proximosCumples.length ? `<ul class="lista-citas">${proximosCumples.sort((a, b) => a.enDias - b.enDias).map((c) => `<li><span class="hora-cita">${c.enDias === 0 ? 'Hoy' : fechaLegible(sumarDias(hoy, c.enDias))}</span>
            <div><strong>${esc(c.nombre)}</strong><small>${esc(c.telefono)}</small></div>
            <a class="boton-mini" target="_blank" rel="noopener" href="${enlaceWA(c.telefono, rellenar(PLANTILLAS.cumpleanos, { nombre: c.nombre.split(' ')[0], salon: SALON.nombre }))}">🎂 Felicitar</a></li>`).join('')}</ul>` : '<p class="vacio">Ningún cumpleaños esta semana.</p>'}
        </section>` : `
        <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Mi horario</h2></div></div>
          ${(() => { const p = PROFESIONALES.find((x) => x.id === sesion.perfil.profesional_id); return p ? `<p>${diasDeTrabajo(p)} · ${horaLegible(p.horario[0])} – ${horaLegible(p.horario[1])}</p>
          <div class="fila-botones" style="margin-top:.8rem"><button class="btn btn-pequeno btn-borde" data-bloquear>Bloquear un horario</button></div>` : '<p class="vacio">Tu cuenta no está asociada a una profesional.</p>'; })()}
        </section>`}
      </div>
    </div>`;

  vista.querySelectorAll('[data-cita]').forEach((b) => b.addEventListener('click', () => detalleCita(citas.find((c) => c.id === b.dataset.cita))));
  vista.querySelector('[data-nueva-cita]')?.addEventListener('click', () => nuevaCita({ fecha: hoy }));
  vista.querySelector('[data-bloquear]')?.addEventListener('click', () => bloquearHorario({ fecha: hoy }));
  activarSolicitudes(vista);
  const buscador = $('buscar-global');
  if (buscador) buscador.addEventListener('keydown', (e) => { if (e.key === 'Enter' && buscador.value.trim()) busquedaGlobal(buscador.value.trim()); });
};

function filaCita(c) {
  const cl = c.clientas || {};
  return `<li><span class="hora-cita">${horaDe(c.inicio)}</span>
    <button class="fila" data-cita="${c.id}" type="button"><div>
      <strong>${esc(cl.nombre || '')}${cl.alergias ? ' <span class="alerta-alergia" title="Alergias">⚠</span>' : ''} · ${c.servicios.map((s) => esc(s.nombre)).join(' + ')}</strong>
      <small>${horaDe(c.inicio)} – ${horaDe(c.fin)} · ${esc(nombreProfesional(c.profesional_id))}${c.origen !== 'salon' ? ' · llegó por ' + esc(ORIGENES[c.origen] || c.origen) : ''}</small></div></button>
    ${pill(c.estado)}</li>`;
}

async function busquedaGlobal(q) {
  const limpio = q.replace(/[%*,()]/g, '');
  const digitos = limpio.replace(/\D/g, '');
  const [clientas, reservas] = await Promise.all([
    db.leer('clientas', `select=*&or=(nombre.ilike.*${encodeURIComponent(limpio)}*${digitos.length >= 3 ? `,telefono.ilike.*${digitos}*` : ''})&limit=10`),
    limpio.length === 6 ? db.leer('reservas', `select=*,clientas(id,nombre,telefono,alergias,etiquetas,notas)&codigo=eq.${encodeURIComponent(limpio.toUpperCase())}`) : Promise.resolve([]),
  ]);
  abrirModal(`Resultados para "${esc(q)}"`, `
    ${reservas.map((r) => `<button class="mini-cita" data-res="${r.id}">Reserva ${esc(r.codigo)} · ${esc(r.clientas.nombre)} · ${fechaLegible(fechaHoraColombia(r.inicio).fecha)} ${horaDe(r.inicio)}</button>`).join('')}
    ${clientas.length ? `<table class="tabla"><tbody>${clientas.map((c) => `<tr class="clicable" data-cl="${c.id}"><td><strong>${esc(c.nombre)}</strong><small>${esc(c.telefono)}</small></td></tr>`).join('')}</tbody></table>` : (reservas.length ? '' : '<p class="vacio">Sin resultados.</p>')}`);
  const cont = $('modal-contenido');
  cont.querySelectorAll('[data-res]').forEach((b) => b.onclick = () => detalleCita(reservas.find((r) => r.id === b.dataset.res)));
  cont.querySelectorAll('[data-cl]').forEach((f) => f.onclick = () => fichaClienta(f.dataset.cl));
}

// ----- DETALLE DE UNA CITA -----
function detalleCita(c) {
  if (!c) return;
  const cl = c.clientas || {};
  const ini = fechaHoraColombia(c.inicio);
  const enlace = `${urlBase()}cita.html?t=${c.token}`;
  const recordatorio = rellenar(PLANTILLAS.recordatorio, {
    nombre: (cl.nombre || '').split(' ')[0], salon: SALON.nombre, fecha: fechaLegible(ini.fecha, { weekday: 'long', day: 'numeric', month: 'long' }),
    hora: horaDe(c.inicio), profesional: nombreProfesional(c.profesional_id), enlace,
  });
  const gracias = rellenar(PLANTILLAS.agradecimiento, { nombre: (cl.nombre || '').split(' ')[0], salon: SALON.nombre, resena: `${enlace}#resena` });
  const puedeEditar = esAdmin() || c.profesional_id === sesion.perfil.profesional_id;
  const botonesEstado = puedeEditar && !['cancelada'].includes(c.estado) ? `
    <div class="fila-botones">
      ${['llego', 'en_curso', 'terminada', 'no_asistio'].map((e) => `<button class="boton-mini ${e === 'terminada' ? 'ok' : ''}" data-estado="${e}" ${c.estado === e ? 'disabled' : ''}>${ESTADOS[e][0]}</button>`).join('')}
      ${c.estado === 'pendiente' ? '<button class="boton-mini" data-estado="confirmada">Confirmada</button>' : ''}
      ${esAdmin() ? '<button class="boton-mini peligro" data-estado="cancelada">Cancelar cita</button>' : ''}
    </div>` : '';
  abrirModal(`${esc(cl.nombre || 'Cita')} ${pill(c.estado)}`, `
    ${cl.alergias ? `<p class="error-general">⚠ Alergias: ${esc(cl.alergias)}</p>` : ''}
    <div class="dato"><span>Fecha</span><span>${fechaLarga(ini.fecha)} · ${horaDe(c.inicio)} – ${horaDe(c.fin)}</span></div>
    <div class="dato"><span>Servicios</span><span>${c.servicios.map((s) => `${esc(s.nombre)} · ${formatoCOP(s.precio)}`).join('<br>')}${c.largo ? `<br><small>Cabello ${esc(c.largo)}</small>` : ''}</span></div>
    ${c.productos.length ? `<div class="dato"><span>Productos</span><span>${c.productos.map((p) => `${esc(p.nombre)} ×${p.cantidad || 1}`).join('<br>')}</span></div>` : ''}
    <div class="dato"><span>Profesional</span><span>${esc(nombreProfesional(c.profesional_id))}</span></div>
    <div class="dato"><span>Celular</span><span>${esc(cl.telefono || '')}</span></div>
    <div class="dato"><span>Total</span><span><b>${formatoCOP(c.total)} COP</b></span></div>
    <div class="dato"><span>Código · origen</span><span>${esc(c.codigo)} · ${esc(ORIGENES[c.origen] || c.origen)}</span></div>
    ${c.notas ? `<div class="dato"><span>Notas de la clienta</span><span>${esc(c.notas)}</span></div>` : ''}
    ${cl.notas ? `<div class="dato"><span>Notas internas</span><span>${esc(cl.notas)}</span></div>` : ''}
    <h3 style="margin:1rem 0 .5rem;font-size:1.2rem">Cambiar estado</h3>
    ${botonesEstado || '<p class="vacio">Esta cita ya no se puede cambiar.</p>'}
    ${esAdmin() && !['cancelada', 'terminada'].includes(c.estado) ? `
      <h3 style="margin:1rem 0 .5rem;font-size:1.2rem">Mover cita</h3>
      <div class="form-grid">
        <div class="campo"><label for="mover-fecha">Fecha</label><input type="date" id="mover-fecha" value="${ini.fecha}"></div>
        <div class="campo"><label for="mover-hora">Hora</label><input type="time" id="mover-hora" step="900" value="${ini.hora.padStart(5, '0')}"></div>
        <div class="campo ancho"><label for="mover-pro">Profesional</label><select id="mover-pro">${PROFESIONALES.map((p) => `<option value="${p.id}" ${p.id === c.profesional_id ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn-pequeno btn-borde" data-mover>Mover</button>` : ''}`,
  `${cl.telefono ? `<a class="btn btn-pequeno btn-borde" target="_blank" rel="noopener" href="${enlaceWA(cl.telefono, c.estado === 'terminada' ? gracias : recordatorio)}">${c.estado === 'terminada' ? 'Pedir reseña por WhatsApp' : 'Recordatorio por WhatsApp'}</a>` : ''}
   ${esAdmin() && cl.id ? `<button class="btn btn-pequeno btn-borde" data-ficha>Ficha de la clienta</button>` : ''}
   ${esAdmin() && !['cancelada', 'no_asistio'].includes(c.estado) ? '<button class="btn btn-pequeno" data-cobrar>Cobrar</button>' : ''}`);
  const cont = $('modal-contenido');
  cont.querySelectorAll('[data-estado]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.actualizar('reservas', `id=eq.${c.id}`, { estado: b.dataset.estado }), `Cita marcada como "${ESTADOS[b.dataset.estado][0]}".`);
    cerrarModal(); refrescar();
  });
  const mover = cont.querySelector('[data-mover]');
  if (mover) mover.onclick = async () => {
    const f = $('mover-fecha').value; const h = $('mover-hora').value;
    if (!f || !h) return;
    await intentar(() => db.rpc('mover_cita', { p_id: c.id, p_inicio: aISOColombia(f, h), p_profesional: $('mover-pro').value }), 'Cita movida.');
    cerrarModal(); refrescar();
  };
  const ficha = cont.querySelector('[data-ficha]');
  if (ficha) ficha.onclick = () => fichaClienta(cl.id);
  const cobrar = cont.querySelector('[data-cobrar]');
  if (cobrar) cobrar.onclick = () => { ventaDesdeCita = c; cerrarModal(); location.hash = '#caja'; if (seccionActual === 'caja') refrescar(); };
}

// ----- NUEVA CITA (desde el panel) -----
function opcionesServicios() {
  return CATEGORIAS.map((c) => `<optgroup label="${esc(c.nombre)}">${c.servicios.map((s) => `<option value="${s.id}">${esc(s.nombre)} · ${formatoCOP(s.precio)} · ${s.minutos} min</option>`).join('')}</optgroup>`).join('')
    + `<optgroup label="Diseños de uñas">${DISENOS.map((d) => `<option value="diseno:${d.id}">Manicura ${esc(d.nombre)} · ${formatoCOP(d.precio)}</option>`).join('')}</optgroup>`;
}
function nuevaCita({ fecha = hoyCol(), hora = '', profesional = '' } = {}) {
  abrirModal('Nueva cita', `
    <div class="form-grid">
      <div class="campo"><label for="nc-nombre">Nombre de la clienta</label><input id="nc-nombre" maxlength="60" autocomplete="off"></div>
      <div class="campo"><label for="nc-tel">Celular</label><input id="nc-tel" type="tel" maxlength="20" autocomplete="off"></div>
      <div class="campo ancho"><label for="nc-servicios">Servicios (Ctrl/⌘ para elegir varios)</label>
        <select id="nc-servicios" multiple size="6">${opcionesServicios()}</select></div>
      <div class="campo"><label for="nc-largo">Largo del cabello</label><select id="nc-largo"><option value="">No aplica</option><option value="corto">Corto</option><option value="medio">Medio</option><option value="largo">Largo</option></select></div>
      <div class="campo"><label for="nc-pro">Profesional</label><select id="nc-pro">${PROFESIONALES.map((p) => `<option value="${p.id}" ${p.id === profesional ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="campo"><label for="nc-fecha">Fecha</label><input id="nc-fecha" type="date" value="${fecha}"></div>
      <div class="campo"><label for="nc-hora">Hora</label><input id="nc-hora" type="time" step="900" value="${hora ? hora.padStart(5, '0') : ''}"></div>
      <div class="campo"><label for="nc-estado">Estado</label><select id="nc-estado"><option value="confirmada">Confirmada</option><option value="llego">Llegó (atender ya)</option><option value="pendiente">Pendiente</option></select></div>
      <div class="campo ancho"><label for="nc-notas">Notas</label><input id="nc-notas" maxlength="300"></div>
    </div>`, '<button class="btn" data-guardar>Guardar cita</button>');
  $('modal-contenido').querySelector('[data-guardar]').onclick = async () => {
    const servicios = [...$('nc-servicios').selectedOptions].map((o) => o.value);
    if (!servicios.length || !$('nc-hora').value) { toast('Elige al menos un servicio y la hora.', true); return; }
    await intentar(() => db.rpc('crear_cita_salon', {
      p_nombre: $('nc-nombre').value, p_telefono: $('nc-tel').value, p_servicios: servicios,
      p_profesional: $('nc-pro').value, p_inicio: aISOColombia($('nc-fecha').value, $('nc-hora').value),
      p_largo: $('nc-largo').value || null, p_notas: $('nc-notas').value, p_estado: $('nc-estado').value,
    }), 'Cita creada.');
    cerrarModal(); refrescar();
  };
}

// ----- BLOQUEAR HORARIO (almuerzo, vacaciones, incapacidad…) -----
function bloquearHorario({ fecha = hoyCol(), profesional = '' } = {}) {
  const propia = sesion.perfil.rol === 'estilista';
  abrirModal('Bloquear horario', `
    <div class="form-grid">
      <div class="campo ancho"><label for="bl-pro">Profesional</label><select id="bl-pro" ${propia ? 'disabled' : ''}>
        ${propia ? '' : '<option value="">Todo el salón</option>'}
        ${PROFESIONALES.filter((p) => !propia || p.id === sesion.perfil.profesional_id).map((p) => `<option value="${p.id}" ${p.id === (profesional || sesion.perfil.profesional_id) ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="campo"><label for="bl-desde">Desde (fecha)</label><input type="date" id="bl-desde" value="${fecha}"></div>
      <div class="campo"><label for="bl-hdesde">Hora</label><input type="time" id="bl-hdesde" step="900" value="12:00"></div>
      <div class="campo"><label for="bl-hasta">Hasta (fecha)</label><input type="date" id="bl-hasta" value="${fecha}"></div>
      <div class="campo"><label for="bl-hhasta">Hora</label><input type="time" id="bl-hhasta" step="900" value="13:00"></div>
      <div class="campo ancho"><label for="bl-motivo">Motivo</label><select id="bl-motivo">
        ${['Almuerzo', 'Diligencia', 'Vacaciones', 'Incapacidad', 'Capacitación', 'Mantenimiento del salón'].map((m) => `<option>${m}</option>`).join('')}</select></div>
    </div>
    <p class="nota-enlace">Las clientas no podrán reservar en ese horario. Para vacaciones elige varios días.</p>`,
  '<button class="btn" data-guardar>Bloquear</button>');
  $('modal-contenido').querySelector('[data-guardar]').onclick = async () => {
    const inicio = aISOColombia($('bl-desde').value, $('bl-hdesde').value);
    const fin = aISOColombia($('bl-hasta').value, $('bl-hhasta').value);
    if (new Date(fin) <= new Date(inicio)) { toast('La hora final debe ser después de la inicial.', true); return; }
    await intentar(() => db.insertar('bloqueos', { profesional_id: propia ? sesion.perfil.profesional_id : ($('bl-pro').value || null), inicio, fin, motivo: $('bl-motivo').value }), 'Horario bloqueado.');
    cerrarModal(); refrescar();
  };
}

// ----- AGENDA (día con columnas por profesional, o semana) -----
const agendaVista = { fecha: null, modo: 'dia', profesional: 'todas' };
const MIN_INICIO = 8 * 60, MIN_FIN = 20 * 60, PX_MIN = 1.4;

VISTAS.agenda = async (vista) => {
  agendaVista.fecha = agendaVista.fecha || hoyCol();
  const propia = sesion.perfil.rol === 'estilista';
  if (propia) agendaVista.profesional = sesion.perfil.profesional_id;
  const f = agendaVista.fecha;
  const lunes = sumarDias(f, -((deTextoFecha(f).getDay() + 6) % 7));
  const desde = agendaVista.modo === 'dia' ? f : lunes;
  const hasta = agendaVista.modo === 'dia' ? f : sumarDias(lunes, 6);
  const [citas, bloqueos] = await Promise.all([
    leerReservas(desde, hasta, '&estado=neq.cancelada'),
    db.leer('bloqueos', `select=*&inicio=lt.${encodeURIComponent(inicioDiaISO(sumarDias(hasta, 1)))}&fin=gt.${encodeURIComponent(inicioDiaISO(desde))}`),
  ]);
  const pros = PROFESIONALES.filter((p) => agendaVista.profesional === 'todas' || p.id === agendaVista.profesional);

  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Agenda</h1><p>${propia ? 'Tus citas' : 'Arrastra una cita para moverla · toca un espacio vacío para crear una'}</p></div>
      <div class="acciones-vista">
        ${esAdmin() ? '<button class="btn btn-pequeno" data-nueva-cita>+ Nueva cita</button>' : ''}
        <button class="btn btn-pequeno btn-borde" data-bloquear>Bloquear horario</button>
      </div></header>
    <div class="barra-agenda">
      <button class="boton-mini" data-mover-dias="-1" aria-label="Anterior">‹</button>
      <button class="boton-mini" data-hoy>Hoy</button>
      <button class="boton-mini" data-mover-dias="1" aria-label="Siguiente">›</button>
      <span class="fecha-agenda">${agendaVista.modo === 'dia' ? fechaLarga(f) : `Semana del ${fechaLegible(lunes, { day: 'numeric', month: 'short' })}`}</span>
      <input type="date" class="selector" id="agenda-fecha" value="${f}" aria-label="Ir a fecha">
      <select class="selector" id="agenda-modo" aria-label="Vista"><option value="dia" ${agendaVista.modo === 'dia' ? 'selected' : ''}>Día</option><option value="semana" ${agendaVista.modo === 'semana' ? 'selected' : ''}>Semana</option></select>
      ${propia ? '' : `<select class="selector" id="agenda-pro" aria-label="Profesional"><option value="todas">Todo el equipo</option>${PROFESIONALES.map((p) => `<option value="${p.id}" ${p.id === agendaVista.profesional ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select>`}
    </div>
    ${FESTIVOS.has(f) && agendaVista.modo === 'dia' ? '<p class="aviso-paso">Hoy es festivo: el salón aparece cerrado para reservas en línea.</p>' : ''}
    ${agendaVista.modo === 'dia' ? agendaDiaHTML(f, pros, citas, bloqueos) : agendaSemanaHTML(lunes, pros, citas)}
    <div class="leyenda-agenda"><span class="l-pendiente">Pendiente</span><span class="l-confirmada">Confirmada</span><span class="l-llego">En el salón</span><span class="l-terminada">Terminada</span><span class="l-bloqueo">Bloqueado</span></div>`;

  // Controles
  vista.querySelectorAll('[data-mover-dias]').forEach((b) => b.onclick = () => { agendaVista.fecha = sumarDias(f, Number(b.dataset.moverDias) * (agendaVista.modo === 'dia' ? 1 : 7)); refrescar(); });
  vista.querySelector('[data-hoy]').onclick = () => { agendaVista.fecha = hoyCol(); refrescar(); };
  $('agenda-fecha').onchange = (e) => { if (e.target.value) { agendaVista.fecha = e.target.value; refrescar(); } };
  $('agenda-modo').onchange = (e) => { agendaVista.modo = e.target.value; refrescar(); };
  const selPro = $('agenda-pro');
  if (selPro) selPro.onchange = (e) => { agendaVista.profesional = e.target.value; refrescar(); };
  vista.querySelector('[data-nueva-cita]')?.addEventListener('click', () => nuevaCita({ fecha: f }));
  vista.querySelector('[data-bloquear]').onclick = () => bloquearHorario({ fecha: f });
  vista.querySelectorAll('[data-cita]').forEach((b) => b.addEventListener('click', () => detalleCita(citas.find((c) => c.id === b.dataset.cita))));
  vista.querySelectorAll('[data-hueco]').forEach((b) => b.addEventListener('click', () => {
    const [pro, hora] = b.dataset.hueco.split('|');
    nuevaCita({ fecha: f, hora, profesional: pro });
  }));
  vista.querySelectorAll('[data-bloqueo]').forEach((b) => b.addEventListener('click', () => {
    const bl = bloqueos.find((x) => x.id === b.dataset.bloqueo);
    abrirModal('Horario bloqueado', `<div class="dato"><span>Motivo</span><span>${esc(bl.motivo)}</span></div>
      <div class="dato"><span>Desde</span><span>${fechaLegible(fechaHoraColombia(bl.inicio).fecha)} ${horaDe(bl.inicio)}</span></div>
      <div class="dato"><span>Hasta</span><span>${fechaLegible(fechaHoraColombia(bl.fin).fecha)} ${horaDe(bl.fin)}</span></div>`,
    esAdmin() || bl.profesional_id === sesion.perfil.profesional_id ? '<button class="btn btn-pequeno btn-borde" data-quitar-bloqueo>Quitar bloqueo</button>' : '');
    const q = $('modal-contenido').querySelector('[data-quitar-bloqueo]');
    if (q) q.onclick = async () => { await intentar(() => db.borrar('bloqueos', `id=eq.${bl.id}`), 'Bloqueo quitado.'); cerrarModal(); refrescar(); };
  }));
  if (esAdmin() && agendaVista.modo === 'dia') activarArrastre(vista, f, citas);
};

function agendaDiaHTML(fecha, pros, citas, bloqueos) {
  const alto = (MIN_FIN - MIN_INICIO) * PX_MIN;
  const y = (min) => (min - MIN_INICIO) * PX_MIN;
  const ahora = ahoraColombia();
  const horas = [];
  for (let m = MIN_INICIO; m <= MIN_FIN; m += 60) horas.push(`<span style="top:${y(m)}px">${horaLegible(minutosAHora(m)).replace(':00', '')}</span>`);
  const columnas = pros.map((p) => {
    const trabaja = trabajaEseDia(p, fecha) && !FESTIVOS.has(fecha);
    const [ent, sal] = p.horario.map(horaEnMinutos);
    let fuera = '';
    if (!trabaja) fuera = `<div class="fuera" style="top:0;height:${alto}px"></div>`;
    else {
      if (ent > MIN_INICIO) fuera += `<div class="fuera" style="top:0;height:${y(ent)}px"></div>`;
      if (sal < MIN_FIN) fuera += `<div class="fuera" style="top:${y(sal)}px;height:${alto - y(sal)}px"></div>`;
    }
    let lineas = '';
    for (let m = MIN_INICIO; m < MIN_FIN; m += 30) lineas += `<div class="franja-hora ${m % 60 ? 'media' : ''}" style="top:${y(m)}px"></div>`;
    let huecos = '';
    if (trabaja && esAdmin()) for (let m = ent; m < sal; m += 30) huecos += `<button class="hueco" style="top:${y(m)}px;height:${30 * PX_MIN}px" data-hueco="${p.id}|${minutosAHora(m)}" aria-label="Nueva cita con ${esc(p.nombre)} a las ${horaLegible(minutosAHora(m))}"></button>`;
    const bloques = citas.filter((c) => c.profesional_id === p.id && fechaHoraColombia(c.inicio).fecha === fecha).map((c) => {
      const a = fechaHoraColombia(c.inicio).minutos; const b = fechaHoraColombia(c.fin).minutos;
      const cl = c.clientas || {};
      return `<button class="cita-bloque ${c.estado}" data-cita="${c.id}" draggable="${esAdmin() && !['terminada'].includes(c.estado)}" style="top:${y(a)}px;height:${Math.max(26, (b - a) * PX_MIN - 2)}px">
        <strong>${horaLegible(minutosAHora(a))} · ${esc(cl.nombre || '')}${cl.alergias ? ' <span class="alergia" title="Alergias">⚠</span>' : ''}</strong>
        <span>${c.servicios.map((s) => esc(s.nombre)).join(' + ')}</span></button>`;
    }).join('');
    const bls = bloqueos.filter((b) => !b.profesional_id || b.profesional_id === p.id).map((b) => {
      const a = fechaHoraColombia(b.inicio); const z = fechaHoraColombia(b.fin);
      const desde = a.fecha < fecha ? MIN_INICIO : Math.max(MIN_INICIO, a.minutos);
      const hasta = z.fecha > fecha ? MIN_FIN : Math.min(MIN_FIN, z.minutos);
      if (a.fecha > fecha || z.fecha < fecha || hasta <= desde) return '';
      return `<button class="cita-bloque bloqueo" data-bloqueo="${b.id}" style="top:${y(desde)}px;height:${(hasta - desde) * PX_MIN - 2}px"><strong>${esc(b.motivo || 'Bloqueado')}</strong></button>`;
    }).join('');
    const lineaAhora = fecha === ahora.fecha && ahora.minutos > MIN_INICIO && ahora.minutos < MIN_FIN ? `<div class="linea-ahora" style="top:${y(ahora.minutos)}px"></div>` : '';
    return { cab: `<div class="col-cabecera"><span class="retrato-mini" style="width:30px;height:30px;font-size:.8rem;background:linear-gradient(145deg,${p.tono[0]},${p.tono[1]})">${esc(p.nombre.split(' ').map((x) => x[0]).join(''))}</span><div>${esc(p.nombre)}<small>${trabaja ? `${horaLegible(p.horario[0])} – ${horaLegible(p.horario[1])}` : 'No trabaja hoy'}</small></div></div>`,
      cuerpo: `<div class="columna" data-columna="${p.id}" style="height:${alto}px">${fuera}${lineas}${huecos}${bls}${bloques}${lineaAhora}</div>` };
  });
  return `<div class="agenda-scroll"><div class="agenda-grid" style="grid-template-columns:56px repeat(${pros.length}, minmax(170px, 1fr))">
    <div class="esquina"></div>${columnas.map((c) => c.cab).join('')}
    <div class="col-horas" style="height:${alto}px;position:sticky;left:0">${horas.join('')}</div>${columnas.map((c) => c.cuerpo).join('')}
  </div></div>`;
}

function agendaSemanaHTML(lunes, pros, citas) {
  const ids = new Set(pros.map((p) => p.id));
  return `<div class="semana-grid">${Array.from({ length: 7 }, (_, i) => {
    const f = sumarDias(lunes, i);
    const delDia = citas.filter((c) => ids.has(c.profesional_id) && fechaHoraColombia(c.inicio).fecha === f);
    return `<div class="dia-semana-col ${f === hoyCol() ? 'hoy' : ''}"><h3>${capitalizar(fechaLegible(f, { weekday: 'short', day: 'numeric' }))}<span>${delDia.length}</span></h3>
      ${FESTIVOS.has(f) ? '<small>Festivo</small>' : ''}
      ${delDia.map((c) => `<button class="mini-cita" data-cita="${c.id}">${horaDe(c.inicio)} · ${esc((c.clientas || {}).nombre || '')}<br><small>${esc(nombreProfesional(c.profesional_id).split(' ')[0])} · ${ESTADOS[c.estado][0]}</small></button>`).join('')}
    </div>`;
  }).join('')}</div>`;
}

// Arrastrar y soltar para mover citas (el servidor valida el nuevo horario)
function activarArrastre(vista, fecha, citas) {
  let arrastrada = null;
  vista.querySelectorAll('.cita-bloque[draggable="true"]').forEach((b) => {
    b.addEventListener('dragstart', (e) => { arrastrada = citas.find((c) => c.id === b.dataset.cita); b.classList.add('arrastrando'); e.dataTransfer.effectAllowed = 'move'; });
    b.addEventListener('dragend', () => { b.classList.remove('arrastrando'); arrastrada = null; });
  });
  vista.querySelectorAll('[data-columna]').forEach((col) => {
    col.addEventListener('dragover', (e) => { if (arrastrada) { e.preventDefault(); } });
    col.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!arrastrada) return;
      const r = col.getBoundingClientRect();
      const minutos = Math.round((MIN_INICIO + (e.clientY - r.top) / PX_MIN) / 15) * 15;
      const c = arrastrada; arrastrada = null;
      try {
        await intentar(() => db.rpc('mover_cita', { p_id: c.id, p_inicio: aISOColombia(fecha, minutosAHora(minutos)), p_profesional: col.dataset.columna }),
          `Cita movida a las ${horaLegible(minutosAHora(minutos))}.`);
      } catch (err) { /* el aviso ya se mostró */ }
      refrescar();
    });
  });
}

// ----- CLIENTAS -----
const ETIQUETAS = ['VIP', 'Frecuente', 'Nueva', 'Inactiva'];
VISTAS.clientas = async (vista) => {
  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Clientas</h1><p>Busca por nombre o celular. Toca una clienta para ver su ficha.</p></div>
      <div class="acciones-vista">
        <button class="btn btn-pequeno btn-borde" data-inactivas>Para reactivar (+60 días)</button>
        <button class="btn btn-pequeno btn-borde" data-exportar>Exportar a Excel</button>
      </div></header>
    <div class="barra-agenda"><input class="buscador" id="buscar-clienta" type="search" placeholder="Buscar por nombre o celular" aria-label="Buscar clienta"></div>
    <section class="tarjeta-admin"><div class="tabla-scroll" id="tabla-clientas"><p class="cargando">Cargando…</p></div></section>`;
  const pintarLista = async (q = '') => {
    const limpio = q.replace(/[%*,()]/g, '');
    const digitos = limpio.replace(/\D/g, '');
    const filtro = limpio ? `&or=(nombre.ilike.*${encodeURIComponent(limpio)}*${digitos.length >= 3 ? `,telefono.ilike.*${digitos}*` : ''})` : '';
    const lista = await db.leer('clientas', `select=*${filtro}&order=creada.desc&limit=60`);
    $('tabla-clientas').innerHTML = lista.length ? `<table class="tabla"><thead><tr><th>Clienta</th><th>Celular</th><th>Cumpleaños</th><th class="num">Sellos</th><th class="num">Puntos</th><th>Promos</th></tr></thead>
      <tbody>${lista.map((c) => `<tr class="clicable" data-cl="${c.id}" tabindex="0">
        <td><strong>${esc(c.nombre)}${c.alergias ? ' <span class="alerta-alergia" title="Alergias">⚠</span>' : ''}</strong>${c.etiquetas.map((e) => `<span class="etiqueta ${e === 'VIP' ? 'vip' : ''}">${esc(e)}</span>`).join('')}</td>
        <td>${esc(c.telefono)}</td><td>${c.cumpleanos ? fechaLegible(c.cumpleanos, { day: 'numeric', month: 'short' }) : '—'}</td>
        <td class="num">${c.sellos}</td><td class="num">${c.puntos}</td><td>${c.acepta_promos ? 'Sí' : 'No'}</td></tr>`).join('')}</tbody></table>`
      : '<p class="vacio">No hay clientas con ese nombre o celular.</p>';
    $('tabla-clientas').querySelectorAll('[data-cl]').forEach((f) => {
      f.onclick = () => fichaClienta(f.dataset.cl);
      f.onkeydown = (e) => { if (e.key === 'Enter') fichaClienta(f.dataset.cl); };
    });
  };
  let espera;
  $('buscar-clienta').addEventListener('input', (e) => { clearTimeout(espera); espera = setTimeout(() => pintarLista(e.target.value.trim()), 300); });
  vista.querySelector('[data-exportar]').onclick = async () => {
    const todas = await intentar(() => db.leer('clientas', 'select=nombre,telefono,email,cumpleanos,sellos,puntos,acepta_promos,etiquetas,creada&order=nombre'));
    descargarCSV(`clientas-${hoyCol()}.csv`, [['Nombre', 'Celular', 'Correo', 'Cumpleaños', 'Sellos', 'Puntos', 'Acepta promociones', 'Etiquetas', 'Registrada'],
      ...todas.map((c) => [c.nombre, c.telefono, c.email, c.cumpleanos, c.sellos, c.puntos, c.acepta_promos ? 'Sí' : 'No', c.etiquetas.join(', '), c.creada.slice(0, 10)])]);
  };
  vista.querySelector('[data-inactivas]').onclick = async () => {
    const hace60 = sumarDias(hoyCol(), -60);
    const [visitas, clientas] = await Promise.all([
      db.leer('reservas', 'select=clienta_id,inicio&estado=eq.terminada&order=inicio.desc&limit=2000'),
      db.leer('clientas', 'select=id,nombre,telefono,acepta_promos'),
    ]);
    const ultima = {};
    visitas.forEach((v) => { if (!ultima[v.clienta_id]) ultima[v.clienta_id] = fechaHoraColombia(v.inicio).fecha; });
    const inactivas = clientas.filter((c) => ultima[c.id] && ultima[c.id] < hace60).sort((a, b) => ultima[a.id].localeCompare(ultima[b.id]));
    abrirModal('Clientas para reactivar', inactivas.length ? `<p class="nota-enlace">No vienen hace más de 60 días. Escríbeles solo si aceptaron promociones.</p>
      <table class="tabla"><thead><tr><th>Clienta</th><th>Última visita</th><th></th></tr></thead><tbody>${inactivas.map((c) => `<tr>
        <td><strong>${esc(c.nombre)}</strong><small>${esc(c.telefono)}</small></td><td>${fechaLegible(ultima[c.id])}</td>
        <td>${c.acepta_promos ? `<a class="boton-mini" target="_blank" rel="noopener" href="${enlaceWA(c.telefono, rellenar(PLANTILLAS.reactivar, { nombre: c.nombre.split(' ')[0], salon: SALON.nombre, reservar: urlBase() + 'index.html#reservar' }))}">WhatsApp</a>` : '<small>Sin permiso</small>'}</td></tr>`).join('')}</tbody></table>`
      : '<p class="vacio">Todas tus clientas han venido en los últimos 60 días.</p>');
  };
  await pintarLista();
};

async function fichaClienta(id) {
  const [[c], citas, fichas] = await Promise.all([
    db.leer('clientas', `select=*&id=eq.${id}`),
    db.leer('reservas', `select=*&clienta_id=eq.${id}&order=inicio.desc&limit=30`),
    db.leer('fichas', `select=*&clienta_id=eq.${id}&order=fecha.desc`),
  ]);
  if (!c) return;
  const config = await db.leer('config', 'select=valor&clave=eq.fidelidad').catch(() => []);
  const meta = (config[0] && config[0].valor.sellosParaPremio) || 10;
  const gastado = citas.filter((r) => r.estado === 'terminada').reduce((t, r) => t + r.total, 0);
  abrirModal(esc(c.nombre), `
    <div class="kpis" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi"><small>Visitas</small><strong>${citas.filter((r) => r.estado === 'terminada').length}</strong></div>
      <div class="kpi"><small>Ha gastado</small><strong style="font-size:1.3rem">${formatoCOP(gastado)}</strong></div>
      <div class="kpi"><small>Sellos</small><strong>${c.sellos}/${meta}</strong><span class="detalle">${c.puntos} puntos</span></div>
    </div>
    ${c.sellos >= meta ? `<p class="ok-aviso">🎁 Ya completó ${meta} sellos: tiene un servicio de regalo. <button class="boton-mini ok" data-canjear>Canjear premio</button></p>` : ''}
    <div class="form-grid">
      <div class="campo"><label for="fc-nombre">Nombre</label><input id="fc-nombre" value="${esc(c.nombre)}" maxlength="60"></div>
      <div class="campo"><label for="fc-tel">Celular</label><input id="fc-tel" value="${esc(c.telefono)}" disabled></div>
      <div class="campo"><label for="fc-email">Correo</label><input id="fc-email" type="email" value="${esc(c.email || '')}"></div>
      <div class="campo"><label for="fc-cumple">Cumpleaños</label><input id="fc-cumple" type="date" value="${c.cumpleanos || ''}"></div>
      <div class="campo ancho"><label for="fc-alergias">Alergias (se muestran en rojo a la estilista)</label><input id="fc-alergias" value="${esc(c.alergias)}" maxlength="200"></div>
      <div class="campo ancho"><label for="fc-notas">Notas internas</label><textarea id="fc-notas" rows="2" maxlength="500">${esc(c.notas)}</textarea></div>
      <div class="campo"><label for="fc-favorita">Profesional favorita</label><select id="fc-favorita"><option value="">—</option>${PROFESIONALES.map((p) => `<option value="${p.id}" ${p.id === c.profesional_favorita ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="campo"><span class="etiqueta-campo">Etiquetas</span><div class="fila-botones">${ETIQUETAS.map((e) => `<label class="check"><input type="checkbox" data-etiqueta="${e}" ${c.etiquetas.includes(e) ? 'checked' : ''}> ${e}</label>`).join('')}</div></div>
      <label class="check ancho"><input type="checkbox" id="fc-promos" ${c.acepta_promos ? 'checked' : ''}> Acepta recibir promociones por WhatsApp</label>
    </div>
    <p class="nota-enlace">Código para recomendar: <b>${esc(c.codigo_referido || '')}</b></p>
    <h3 style="margin:1.2rem 0 .4rem;font-size:1.3rem">Ficha técnica</h3>
    ${fichas.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Servicio</th><th>Fórmula</th><th>Notas</th></tr></thead><tbody>${fichas.map((f) => `<tr>
      <td>${fechaLegible(f.fecha)}<small>${esc(nombreProfesional(f.profesional_id))}</small></td><td>${esc(f.servicio)}</td><td>${esc(f.formula)}</td><td>${esc(f.notas)}</td></tr>`).join('')}</tbody></table>` : '<p class="vacio">Sin registros todavía.</p>'}
    <div class="form-grid" style="margin-top:.6rem">
      <div class="campo"><label for="ft-servicio">Servicio</label><input id="ft-servicio" placeholder="Ej: Balayage"></div>
      <div class="campo"><label for="ft-pro">Profesional</label><select id="ft-pro">${PROFESIONALES.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select></div>
      <div class="campo ancho"><label for="ft-formula">Fórmula / tono / marca</label><input id="ft-formula" placeholder="Ej: 7.1 + 20 vol, Igora, 35 min"></div>
      <div class="campo ancho"><label for="ft-notas">Notas</label><input id="ft-notas"></div>
    </div>
    <button class="btn btn-pequeno btn-borde" data-agregar-ficha>Agregar a la ficha</button>
    <h3 style="margin:1.2rem 0 .4rem;font-size:1.3rem">Historial de citas</h3>
    ${citas.length ? `<table class="tabla"><tbody>${citas.map((r) => `<tr><td>${fechaLegible(fechaHoraColombia(r.inicio).fecha)} ${horaDe(r.inicio)}</td>
      <td>${r.servicios.map((s) => esc(s.nombre)).join(' + ')}<small>${esc(nombreProfesional(r.profesional_id))}</small></td><td class="num">${formatoCOP(r.total)}</td><td>${pill(r.estado)}</td></tr>`).join('')}</tbody></table>` : '<p class="vacio">Sin citas.</p>'}`,
  `<a class="btn btn-pequeno btn-borde" target="_blank" rel="noopener" href="https://wa.me/${telefonoWA(c.telefono)}">WhatsApp</a>
   <button class="btn btn-pequeno" data-guardar>Guardar cambios</button>`);
  const cont = $('modal-contenido');
  cont.querySelector('[data-guardar]').onclick = async () => {
    await intentar(() => db.actualizar('clientas', `id=eq.${id}`, {
      nombre: $('fc-nombre').value.trim(), email: $('fc-email').value.trim() || null, cumpleanos: $('fc-cumple').value || null,
      alergias: $('fc-alergias').value.trim(), notas: $('fc-notas').value.trim(), profesional_favorita: $('fc-favorita').value || null,
      etiquetas: [...cont.querySelectorAll('[data-etiqueta]:checked')].map((x) => x.dataset.etiqueta), acepta_promos: $('fc-promos').checked,
    }), 'Ficha guardada.');
  };
  cont.querySelector('[data-agregar-ficha]').onclick = async () => {
    if (!$('ft-servicio').value.trim() && !$('ft-formula').value.trim()) { toast('Escribe el servicio o la fórmula.', true); return; }
    await intentar(() => db.insertar('fichas', { clienta_id: id, servicio: $('ft-servicio').value.trim(), profesional_id: $('ft-pro').value, formula: $('ft-formula').value.trim(), notas: $('ft-notas').value.trim() }), 'Agregado a la ficha técnica.');
    fichaClienta(id);
  };
  const canjear = cont.querySelector('[data-canjear]');
  if (canjear) canjear.onclick = async () => {
    await intentar(() => db.actualizar('clientas', `id=eq.${id}`, { sellos: c.sellos - meta }), 'Premio canjeado. ¡Disfrútalo!');
    fichaClienta(id);
  };
}

// ----- CAJA -----
let ventaDesdeCita = null;
const venta = { lineas: [], metodo: 'efectivo', clienta: null, profesional: '', reserva: null };
VISTAS.caja = async (vista) => {
  const hoy = hoyCol();
  const [[turno], ventas] = await Promise.all([
    db.leer('caja_turnos', 'select=*&cerrada=is.null&order=abierta.desc&limit=1'),
    db.leer('ventas', `select=*&fecha=gte.${encodeURIComponent(inicioDiaISO(hoy))}&order=fecha.desc`),
  ]);
  if (ventaDesdeCita) {
    const c = ventaDesdeCita; ventaDesdeCita = null;
    Object.assign(venta, {
      lineas: [...c.servicios.map((s) => ({ tipo: 'servicio', id: s.id, nombre: s.nombre, precio: s.precio, cantidad: 1 })),
        ...c.productos.map((p) => ({ tipo: 'producto', id: p.id, nombre: p.nombre, precio: p.precio, cantidad: p.cantidad || 1 }))],
      clienta: c.clientas ? { id: c.clientas.id, nombre: c.clientas.nombre } : null, profesional: c.profesional_id, reserva: c,
    });
  }
  const validas = ventas.filter((v) => !v.anulada);
  const porMetodo = {};
  validas.forEach((v) => { porMetodo[v.metodo_pago] = (porMetodo[v.metodo_pago] || 0) + v.total; });
  const efectivoEsperado = turno ? turno.base_inicial + validas.filter((v) => v.turno_id === turno.id && v.metodo_pago === 'efectivo').reduce((t, v) => t + v.total, 0) : 0;

  if (!turno) {
    vista.innerHTML = `<header class="cabecera-vista"><div><h1>Caja</h1><p>${fechaLarga(hoy)}</p></div></header>
      <section class="tarjeta-admin" style="max-width:480px"><h2 style="font-size:1.5rem;margin-bottom:.6rem">Abrir caja</h2>
        <div class="campo"><label for="base">Base en efectivo para dar vueltas</label><input id="base" type="number" min="0" step="1000" value="100000"></div>
        <button class="btn" data-abrir>Abrir caja</button></section>`;
    vista.querySelector('[data-abrir]').onclick = async () => {
      await intentar(() => db.insertar('caja_turnos', { base_inicial: Number($('base').value) || 0 }), 'Caja abierta.');
      refrescar();
    };
    return;
  }

  const subtotal = venta.lineas.reduce((t, l) => t + l.precio * l.cantidad, 0);
  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Caja</h1><p>Abierta desde ${horaDe(turno.abierta)} · base ${formatoCOP(turno.base_inicial)}</p></div>
      <div class="acciones-vista"><button class="btn btn-pequeno btn-borde" data-cerrar-caja>Cerrar caja</button></div></header>
    <div class="grid-2">
      <section class="tarjeta-admin">
        <div class="tarjeta-cabecera"><div><h2>Nueva venta</h2>${venta.reserva ? `<small>Cobro de la cita ${esc(venta.reserva.codigo)}</small>` : ''}</div></div>
        <div class="form-grid">
          <div class="campo"><label for="v-servicio">Agregar servicio</label><select id="v-servicio"><option value="">Elegir…</option>${opcionesServicios()}</select></div>
          <div class="campo"><label for="v-producto">Agregar producto</label><select id="v-producto"><option value="">Elegir…</option>${PRODUCTOS.map((p) => `<option value="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>${esc(p.nombre)} · ${formatoCOP(p.precio)} (${p.stock} disp.)</option>`).join('')}</select></div>
          <div class="campo"><label for="v-tel">Celular de la clienta (opcional)</label><input id="v-tel" type="tel" value="${venta.clienta ? '' : ''}" placeholder="${venta.clienta ? esc(venta.clienta.nombre) : 'Para sumarle puntos'}"></div>
          <div class="campo"><label for="v-pro">Atendió</label><select id="v-pro"><option value="">—</option>${PROFESIONALES.map((p) => `<option value="${p.id}" ${p.id === venta.profesional ? 'selected' : ''}>${esc(p.nombre)}</option>`).join('')}</select></div>
        </div>
        ${venta.lineas.length ? `<ul class="lineas-venta">${venta.lineas.map((l, i) => `<li><span>${esc(l.nombre)}</span>
          <input type="number" min="1" value="${l.cantidad}" data-cantidad="${i}" aria-label="Cantidad">
          <span class="num">${formatoCOP(l.precio * l.cantidad)}</span><button class="boton-mini peligro" data-quitar-linea="${i}" aria-label="Quitar">✕</button></li>`).join('')}</ul>` : '<p class="vacio">Agrega servicios o productos.</p>'}
        <div class="form-grid" style="margin-top:.6rem">
          <div class="campo"><label for="v-desc">Descuento ($)</label><input id="v-desc" type="number" min="0" step="1000" value="0"></div>
          <div class="campo"><label for="v-propina">Propina ($)</label><input id="v-propina" type="number" min="0" step="1000" value="0"></div>
        </div>
        <div class="metodos" role="group" aria-label="Método de pago">${Object.entries(METODOS).map(([k, v]) => `<button class="chip" data-metodo="${k}" aria-pressed="${venta.metodo === k}">${v}</button>`).join('')}</div>
        <div class="campo" id="campo-bono" ${venta.metodo === 'bono' ? '' : 'hidden'} style="margin-top:.6rem"><label for="v-bono">Código de la tarjeta de regalo</label><input id="v-bono" maxlength="12" style="text-transform:uppercase"></div>
        <div class="totales-venta"><div><span>Subtotal</span><span>${formatoCOP(subtotal)}</span></div><div class="total"><span>Total</span><span id="v-total">${formatoCOP(subtotal)}</span></div></div>
        <div class="fila-botones" style="margin-top:.8rem"><button class="btn" data-registrar ${venta.lineas.length ? '' : 'disabled'}>Registrar venta</button>
          <button class="btn btn-borde" data-limpiar>Limpiar</button></div>
        ${INTEGRACIONES.wompiPublicKey ? '' : '<p class="nota-enlace"><span class="pendiente-conectar">Cobro con tarjeta en línea: pendiente de conectar</span> · se activa al poner la llave de Wompi en Configuración.</p>'}
      </section>
      <section class="tarjeta-admin">
        <div class="tarjeta-cabecera"><div><h2>Ventas de hoy</h2><small>${validas.length} ventas · ${formatoCOP(validas.reduce((t, v) => t + v.total, 0))}</small></div></div>
        <ul class="barras-h">${Object.entries(porMetodo).map(([k, v]) => `<li><span class="nombre">${METODOS[k]}</span><span class="valor">${formatoCOP(v)}</span></li>`).join('') || ''}</ul>
        <p class="dato"><span>Efectivo esperado en caja</span><span><b>${formatoCOP(efectivoEsperado)}</b></span></p>
        ${ventas.length ? `<table class="tabla"><tbody>${ventas.map((v) => `<tr style="${v.anulada ? 'opacity:.5;text-decoration:line-through' : ''}">
          <td>${horaDe(v.fecha)}<small>${METODOS[v.metodo_pago]}</small></td><td>${v.items.map((i) => esc(i.nombre)).join(', ')}<small>${esc(nombreProfesional(v.profesional_id))}</small></td>
          <td class="num">${formatoCOP(v.total)}</td><td>${v.anulada ? 'Anulada' : `<button class="boton-mini peligro" data-anular="${v.id}">Anular</button>`}</td></tr>`).join('')}</tbody></table>` : '<p class="vacio">Sin ventas hoy.</p>'}
      </section>
    </div>`;

  const actualizarTotal = () => {
    const t = Math.max(0, subtotal - (Number($('v-desc').value) || 0)) + (Number($('v-propina').value) || 0);
    $('v-total').textContent = formatoCOP(t);
    return t;
  };
  $('v-desc').oninput = actualizarTotal; $('v-propina').oninput = actualizarTotal;
  $('v-servicio').onchange = (e) => {
    const s = servicioPorId(e.target.value);
    if (s) venta.lineas.push({ tipo: 'servicio', id: s.id, nombre: s.nombre, precio: s.precio, cantidad: 1 });
    refrescar();
  };
  $('v-producto').onchange = (e) => {
    const p = PRODUCTOS.find((x) => x.id === e.target.value);
    if (p) venta.lineas.push({ tipo: 'producto', id: p.id, nombre: p.nombre, precio: p.precio, cantidad: 1 });
    refrescar();
  };
  $('v-pro').onchange = (e) => { venta.profesional = e.target.value; };
  vista.querySelectorAll('[data-cantidad]').forEach((i) => i.onchange = () => { venta.lineas[i.dataset.cantidad].cantidad = Math.max(1, Number(i.value) || 1); refrescar(); });
  vista.querySelectorAll('[data-quitar-linea]').forEach((b) => b.onclick = () => { venta.lineas.splice(Number(b.dataset.quitarLinea), 1); refrescar(); });
  vista.querySelectorAll('[data-metodo]').forEach((b) => b.onclick = () => {
    venta.metodo = b.dataset.metodo;
    vista.querySelectorAll('[data-metodo]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    $('campo-bono').hidden = venta.metodo !== 'bono';
  });
  vista.querySelector('[data-limpiar]').onclick = () => { Object.assign(venta, { lineas: [], clienta: null, profesional: '', reserva: null }); refrescar(); };
  vista.querySelector('[data-registrar]').onclick = async () => {
    let clientaId = venta.clienta ? venta.clienta.id : null;
    const tel = $('v-tel').value.replace(/\D/g, '');
    if (!clientaId && tel.length >= 7) {
      const [cl] = await db.leer('clientas', `select=id&telefono=eq.${tel}`).catch(() => []);
      clientaId = cl ? cl.id : null;
    }
    const descuento = Number($('v-desc').value) || 0;
    const propina = Number($('v-propina').value) || 0;
    if (venta.metodo === 'bono') {
      const codigo = $('v-bono').value.trim();
      if (!codigo) { toast('Escribe el código de la tarjeta de regalo.', true); $('v-bono').focus(); return; }
      // Primero se descuenta el saldo de la tarjeta; si no alcanza, no se registra la venta
      const ok = await intentar(() => db.rpc('usar_tarjeta', { p_codigo: codigo, p_valor: Math.max(0, subtotal - descuento) + propina })).catch(() => null);
      if (!ok) return;
      toast(`Saldo restante en la tarjeta: ${formatoCOP(ok.saldo)}`);
    }
    await intentar(() => db.insertar('ventas', {
      turno_id: turno.id, reserva_id: venta.reserva ? venta.reserva.id : null, clienta_id: clientaId,
      profesional_id: $('v-pro').value || null, items: venta.lineas, subtotal, descuento, propina,
      total: Math.max(0, subtotal - descuento) + propina, metodo_pago: venta.metodo,
    }), 'Venta registrada.');
    if (venta.reserva && venta.reserva.estado !== 'terminada') {
      await db.actualizar('reservas', `id=eq.${venta.reserva.id}`, { estado: 'terminada' }).catch(() => {});
    }
    Object.assign(venta, { lineas: [], clienta: null, profesional: '', reserva: null });
    await cargarCatalogo().catch(() => {});
    refrescar();
  };
  vista.querySelectorAll('[data-anular]').forEach((b) => b.onclick = () => {
    abrirModal('Anular venta', '<p>La venta quedará anulada y los productos vuelven al inventario. ¿Continuar?</p>',
      '<button class="btn btn-borde" data-cerrar-modal>No</button><button class="btn btn-peligro" data-si>Sí, anular</button>');
    $('modal-contenido').querySelector('[data-si]').onclick = async () => {
      await intentar(() => db.actualizar('ventas', `id=eq.${b.dataset.anular}`, { anulada: true }), 'Venta anulada.');
      cerrarModal(); refrescar();
    };
  });
  vista.querySelector('[data-cerrar-caja]').onclick = () => {
    abrirModal('Cerrar caja', `
      <div class="dato"><span>Base inicial</span><span>${formatoCOP(turno.base_inicial)}</span></div>
      ${Object.entries(porMetodo).map(([k, v]) => `<div class="dato"><span>${METODOS[k]}</span><span>${formatoCOP(v)}</span></div>`).join('')}
      <div class="dato"><span><b>Efectivo esperado</b></span><span><b>${formatoCOP(efectivoEsperado)}</b></span></div>
      <div class="campo" style="margin-top:.8rem"><label for="contado">Efectivo contado</label><input id="contado" type="number" min="0" step="1000"></div>
      <p id="diferencia" class="nota-enlace"></p>
      <div class="campo"><label for="notas-cierre">Notas</label><input id="notas-cierre"></div>`,
    '<button class="btn" data-confirmar-cierre>Cerrar caja</button>');
    $('contado').oninput = () => {
      const d = (Number($('contado').value) || 0) - efectivoEsperado;
      $('diferencia').textContent = d === 0 ? 'La caja cuadra.' : d > 0 ? `Sobran ${formatoCOP(d)}.` : `Faltan ${formatoCOP(-d)}.`;
    };
    $('modal-contenido').querySelector('[data-confirmar-cierre]').onclick = async () => {
      await intentar(() => db.actualizar('caja_turnos', `id=eq.${turno.id}`, { cerrada: new Date().toISOString(), efectivo_contado: Number($('contado').value) || 0, notas: $('notas-cierre').value, cerrada_por: sesion.usuario.sub }), 'Caja cerrada.');
      cerrarModal(); refrescar();
    };
  };
};

// ----- INVENTARIO Y PROVEEDORES -----
VISTAS.inventario = async (vista) => {
  await cargarCatalogo().catch(() => {});
  const [movs, proveedores, todos] = await Promise.all([
    db.leer('inventario_movimientos', 'select=*&order=fecha.desc&limit=40'),
    db.leer('proveedores', 'select=*&order=nombre'),
    db.leer('productos', 'select=*&order=orden'),
  ]);
  const nombre = (id) => (todos.find((p) => p.id === id) || {}).nombre || id;
  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Inventario</h1><p>Las ventas descuentan el stock solas. Registra aquí las compras y lo que se usa en los servicios.</p></div></header>
    <section class="tarjeta-admin"><div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Producto</th><th class="num">Stock</th><th class="num">Mínimo</th><th class="num">Precio</th><th>Estado</th><th></th></tr></thead>
      <tbody>${todos.map((p) => `<tr><td><strong>${esc(p.nombre)}</strong><small>${esc(p.detalle)}</small></td>
        <td class="num">${p.stock}</td><td class="num">${p.stock_minimo}</td><td class="num">${formatoCOP(p.precio)}</td>
        <td>${p.stock <= 0 ? '<span class="estado estado-cancelada">Agotado</span>' : p.stock <= p.stock_minimo ? '<span class="estado estado-en-curso">Stock bajo</span>' : '<span class="estado estado-confirmada">En stock</span>'}</td>
        <td><div class="fila-botones"><button class="boton-mini" data-entrada="${p.id}">+ Entrada</button><button class="boton-mini" data-ajuste="${p.id}">Uso / ajuste</button></div></td></tr>`).join('')}</tbody></table></div></section>
    <div class="grid-2">
      <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Movimientos recientes</h2></div></div>
        ${movs.length ? `<table class="tabla"><tbody>${movs.map((m) => `<tr><td>${fechaLegible(fechaHoraColombia(m.fecha).fecha)}<small>${esc(m.motivo)}</small></td>
          <td>${esc(nombre(m.producto_id))}<small>${esc(m.nota)}</small></td><td class="num" style="color:${m.cantidad > 0 ? 'var(--estado-ok)' : 'var(--peligro)'}">${m.cantidad > 0 ? '+' : ''}${m.cantidad}</td></tr>`).join('')}</tbody></table>` : '<p class="vacio">Sin movimientos.</p>'}
      </section>
      <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Proveedores</h2></div></div>
        ${proveedores.length ? `<table class="tabla"><tbody>${proveedores.map((p) => `<tr><td><strong>${esc(p.nombre)}</strong><small>${esc(p.contacto)}</small></td>
          <td>${esc(p.telefono)}</td><td>${p.telefono ? `<a class="boton-mini" target="_blank" rel="noopener" href="https://wa.me/${telefonoWA(p.telefono)}">Pedir</a>` : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="vacio">Sin proveedores.</p>'}
        <div class="form-grid" style="margin-top:.6rem">
          <div class="campo"><label for="pv-nombre">Nombre</label><input id="pv-nombre"></div>
          <div class="campo"><label for="pv-tel">Celular</label><input id="pv-tel" type="tel"></div>
          <div class="campo ancho"><label for="pv-contacto">Qué vende / contacto</label><input id="pv-contacto"></div>
        </div>
        <button class="btn btn-pequeno btn-borde" data-nuevo-proveedor>Agregar proveedor</button>
      </section>
    </div>`;
  const movimiento = (id, tipo) => {
    const p = todos.find((x) => x.id === id);
    abrirModal(`${tipo === 'compra' ? 'Entrada' : 'Uso o ajuste'}: ${esc(p.nombre)}`, `
      <div class="form-grid">
        <div class="campo"><label for="mv-cant">${tipo === 'compra' ? 'Unidades que llegaron' : 'Unidades (negativo si salen)'}</label><input id="mv-cant" type="number" value="${tipo === 'compra' ? 10 : -1}"></div>
        ${tipo === 'compra' ? `<div class="campo"><label for="mv-costo">Costo por unidad</label><input id="mv-costo" type="number" min="0" step="100"></div>
        <div class="campo ancho"><label for="mv-prov">Proveedor</label><select id="mv-prov"><option value="">—</option>${proveedores.map((v) => `<option value="${v.id}">${esc(v.nombre)}</option>`).join('')}</select></div>`
        : `<div class="campo"><label for="mv-motivo">Motivo</label><select id="mv-motivo"><option value="uso">Usado en servicios</option><option value="ajuste">Ajuste de conteo</option></select></div>`}
        <div class="campo ancho"><label for="mv-nota">Nota</label><input id="mv-nota"></div>
      </div>`, '<button class="btn" data-guardar>Guardar</button>');
    $('modal-contenido').querySelector('[data-guardar]').onclick = async () => {
      const cantidad = Number($('mv-cant').value);
      if (!cantidad) { toast('Escribe una cantidad distinta de cero.', true); return; }
      await intentar(() => db.insertar('inventario_movimientos', {
        producto_id: id, cantidad, motivo: tipo === 'compra' ? 'compra' : $('mv-motivo').value, nota: $('mv-nota').value,
        costo_unitario: tipo === 'compra' ? Number($('mv-costo').value) || null : null,
        proveedor_id: tipo === 'compra' ? $('mv-prov').value || null : null,
      }), 'Inventario actualizado.');
      cerrarModal(); refrescar();
    };
  };
  vista.querySelectorAll('[data-entrada]').forEach((b) => b.onclick = () => movimiento(b.dataset.entrada, 'compra'));
  vista.querySelectorAll('[data-ajuste]').forEach((b) => b.onclick = () => movimiento(b.dataset.ajuste, 'ajuste'));
  vista.querySelector('[data-nuevo-proveedor]').onclick = async () => {
    if (!$('pv-nombre').value.trim()) { toast('Escribe el nombre del proveedor.', true); return; }
    await intentar(() => db.insertar('proveedores', { nombre: $('pv-nombre').value.trim(), telefono: $('pv-tel').value.trim(), contacto: $('pv-contacto').value.trim() }), 'Proveedor agregado.');
    refrescar();
  };
};

// ----- LISTA DE ESPERA -----
VISTAS.espera = async (vista) => {
  const lista = await db.leer('lista_espera', `select=*&fecha=gte.${hoyCol()}&order=fecha,creada`);
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Lista de espera</h1><p>Clientas que quieren un cupo si alguien cancela.</p></div></header>
    <section class="tarjeta-admin">${lista.length ? `<div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Día</th><th>Clienta</th><th>Servicio</th><th>Profesional</th><th></th></tr></thead>
      <tbody>${lista.map((e) => `<tr style="${e.avisada ? 'opacity:.55' : ''}"><td>${fechaLarga(e.fecha)}</td>
        <td><strong>${esc(e.nombre)}</strong><small>${esc(e.telefono)}</small></td>
        <td>${esc((buscarServicio(e.servicio_id || '') || {}).nombre || 'Cualquiera')}</td><td>${e.profesional_id ? esc(nombreProfesional(e.profesional_id)) : 'Cualquiera'}</td>
        <td><div class="fila-botones"><a class="boton-mini" target="_blank" rel="noopener" href="${enlaceWA(e.telefono, rellenar(PLANTILLAS.espera, { nombre: e.nombre.split(' ')[0], fecha: fechaLegible(e.fecha, { weekday: 'long', day: 'numeric', month: 'long' }), salon: SALON.nombre }))}">Avisar</a>
          ${e.avisada ? '<small>Avisada</small>' : `<button class="boton-mini ok" data-avisada="${e.id}">Marcar avisada</button>`}</div></td></tr>`).join('')}</tbody></table></div>` : '<p class="vacio">Nadie en lista de espera.</p>'}</section>`;
  vista.querySelectorAll('[data-avisada]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.actualizar('lista_espera', `id=eq.${b.dataset.avisada}`, { avisada: true }), 'Marcada como avisada.');
    refrescar();
  });
};

// ----- REPORTES -----
const rangoReporte = { desde: null, hasta: null };
function minutosDisponibles(p, desde, hasta) {
  let total = 0;
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    if (trabajaEseDia(p, f) && !FESTIVOS.has(f)) total += horaEnMinutos(p.horario[1]) - horaEnMinutos(p.horario[0]);
  }
  return total;
}
function barrasH(items, valor, etiqueta, formato = (v) => v) {
  const max = Math.max(1, ...items.map(valor));
  return items.length ? `<ul class="barras-h">${items.map((x) => `<li><span class="nombre">${esc(etiqueta(x))}</span><span class="valor">${formato(valor(x))}</span>
    <span class="pista" aria-hidden="true"><span class="relleno" style="width:${(valor(x) / max) * 100}%"></span></span></li>`).join('')}</ul>` : '<p class="vacio">Sin datos en este periodo.</p>';
}
function graficaBarras(datos, desde, hasta) {
  const dias = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push({ fecha: f, valor: (datos.find((d) => d.dia === f) || {}).total || 0 });
  const ancho = 640, alto = 220, izq = 56, der = 8, arriba = 10, abajo = 26;
  const max = Math.max(100000, ...dias.map((d) => d.valor));
  const paso = max > 2e6 ? 1e6 : max > 5e5 ? 250000 : 100000;
  const tope = Math.ceil(max / paso) * paso;
  const y = (v) => arriba + (1 - v / tope) * (alto - arriba - abajo);
  const bw = (ancho - izq - der) / dias.length;
  let guias = '';
  for (let v = 0; v <= tope; v += paso) {
    guias += `<line class="linea-guia" x1="${izq}" x2="${ancho - der}" y1="${y(v)}" y2="${y(v)}"/><text class="eje" x="${izq - 6}" y="${y(v) + 4}" text-anchor="end">${v >= 1e6 ? '$' + (v / 1e6).toLocaleString('es-CO') + ' M' : '$' + (v / 1000) + ' mil'}</text>`;
  }
  const cada = Math.ceil(dias.length / 10);
  const barras = dias.map((d, i) => `<rect class="barra" tabindex="0" x="${izq + i * bw + Math.min(2, bw * 0.15)}" y="${y(d.valor)}" width="${Math.max(2, bw - Math.min(4, bw * 0.3))}" height="${Math.max(0, alto - abajo - y(d.valor))}" rx="${Math.min(4, bw / 4)}" data-i="${i}" aria-label="${fechaLegible(d.fecha)}: ${formatoCOP(d.valor)}"/>`
    + (i % cada === 0 ? `<text class="eje" x="${izq + i * bw + bw / 2}" y="${alto - 8}" text-anchor="middle">${deTextoFecha(d.fecha).getDate()}</text>` : '')).join('');
  return { svg: `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Ingresos por día">${guias}${barras}</svg>`, dias };
}

VISTAS.reportes = async (vista) => {
  const hoy = hoyCol();
  if (!rangoReporte.desde) { rangoReporte.desde = hoy.slice(0, 8) + '01'; rangoReporte.hasta = hoy; }
  const { desde, hasta } = rangoReporte;
  const r = await db.rpc('reporte', { p_desde: desde, p_hasta: hasta });
  const utilidad = r.ingresos_total - r.gastos_total;
  const asistencia = r.citas_total ? Math.round((r.no_asistio / Math.max(1, r.citas_total - r.canceladas)) * 100) : 0;
  const g = graficaBarras(r.ingresos_dia, desde, hasta);
  const pros = r.por_profesional.map((p) => {
    const pr = PROFESIONALES.find((x) => x.id === p.id);
    const disp = pr ? minutosDisponibles(pr, desde, hasta) : 0;
    return { ...p, ocupacion: disp ? Math.round((p.minutos_reservados / disp) * 100) : 0 };
  });
  const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const maxCalor = Math.max(1, ...r.horas_pico.map((h) => h.n));
  const calor = [1, 2, 3, 4, 5, 6].map((d) => `<span class="etq-fila">${DIAS[d]}</span>${Array.from({ length: 11 }, (_, i) => {
    const n = (r.horas_pico.find((h) => h.dia === d && h.hora === i + 8) || {}).n || 0;
    const a = n / maxCalor;
    return `<span style="background:rgba(181,84,90,${(0.08 + a * 0.82).toFixed(2)});color:${a > 0.55 ? '#fff' : 'var(--cacao)'}" title="${DIAS[d]} ${i + 8}:00 · ${n} citas">${n || ''}</span>`;
  }).join('')}`).join('');

  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Reportes</h1><p>${fechaLegible(desde, { day: 'numeric', month: 'long' })} – ${fechaLegible(hasta, { day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
      <div class="acciones-vista">
        <select class="selector" id="rango" aria-label="Periodo"><option value="">Periodo…</option><option value="mes">Este mes</option><option value="anterior">Mes pasado</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="anio">Este año</option></select>
        <input type="date" class="selector" id="r-desde" value="${desde}" aria-label="Desde"><input type="date" class="selector" id="r-hasta" value="${hasta}" aria-label="Hasta">
        <button class="btn btn-pequeno btn-borde" data-exportar>Exportar</button>
      </div></header>
    <section class="kpis">
      <article class="kpi"><small>Ingresos</small><strong>${formatoCOP(r.ingresos_total)}</strong><span class="detalle">Ticket promedio ${formatoCOP(r.ticket_promedio)}</span></article>
      <article class="kpi"><small>Gastos</small><strong>${formatoCOP(r.gastos_total)}</strong><span class="detalle ${utilidad >= 0 ? 'positivo' : 'alerta'}">Utilidad ${formatoCOP(utilidad)}</span></article>
      <article class="kpi"><small>Citas</small><strong>${r.citas_total}</strong><span class="detalle">${r.citas_terminadas} terminadas · ${r.canceladas} canceladas</span></article>
      <article class="kpi"><small>Inasistencia</small><strong>${asistencia}%</strong><span class="detalle ${asistencia > 10 ? 'alerta' : 'positivo'}">${r.no_asistio} cita${r.no_asistio === 1 ? "" : "s"} perdida${r.no_asistio === 1 ? "" : "s"}</span></article>
      <article class="kpi"><small>Clientas</small><strong>${r.clientas_nuevas}</strong><span class="detalle">nuevas · ${r.clientas_recurrentes} volvieron</span></article>
    </section>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Ingresos por día</h2><small>Ventas registradas en caja</small></div></div>
      <div class="grafica" id="grafica-ingresos">${g.svg}</div>
      <details class="tabla-datos"><summary>Ver como tabla</summary><table class="tabla">${g.dias.filter((d) => d.valor).map((d) => `<tr><td>${fechaLegible(d.fecha)}</td><td class="num">${formatoCOP(d.valor)}</td></tr>`).join('') || '<tr><td>Sin ventas</td></tr>'}</table></details>
    </section>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Por profesional</h2><small>Ocupación = tiempo reservado ÷ tiempo de su jornada en el periodo</small></div></div>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Profesional</th><th class="num">Ventas</th><th class="num">Citas terminadas</th><th class="num">Ocupación</th></tr></thead>
      <tbody>${pros.map((p) => `<tr><td><strong>${esc(p.nombre)}</strong></td><td class="num">${formatoCOP(p.ventas)}</td><td class="num">${p.citas}</td>
        <td class="num">${p.ocupacion}%</td></tr>`).join('')}</tbody></table></div></section>
    <div class="grid-2">
      <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Servicios más pedidos</h2><small>Valor menos 40% de comisión = margen aproximado</small></div></div>
        ${barrasH(r.servicios_top.slice(0, 8), (s) => s.veces, (s) => s.nombre, (v) => `${v} veces`)}
        ${r.servicios_top.length ? `<details class="tabla-datos"><summary>Rentabilidad por servicio</summary><table class="tabla"><thead><tr><th>Servicio</th><th class="num">Vendido</th><th class="num">Margen aprox.</th></tr></thead>
          ${r.servicios_top.map((s) => `<tr><td>${esc(s.nombre)}</td><td class="num">${formatoCOP(s.valor)}</td><td class="num">${formatoCOP(Math.round(s.valor * 0.6))}</td></tr>`).join('')}</table></details>` : ''}
      </section>
      <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Medios de pago</h2></div></div>
        ${barrasH(Object.entries(r.por_metodo), (x) => x[1], (x) => METODOS[x[0]] || x[0], formatoCOP)}
      </section>
      <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>¿De dónde llegan las reservas?</h2></div></div>
        ${barrasH(Object.entries(r.origen), (x) => x[1], (x) => ORIGENES[x[0]] || x[0], (v) => `${v} citas`)}
      </section>
      <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Gastos por categoría</h2></div></div>
        ${barrasH(Object.entries(r.gastos_categoria), (x) => x[1], (x) => CATEGORIAS_GASTO[x[0]] || x[0], formatoCOP)}
      </section>
    </div>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Horas pico</h2><small>Número de citas por día y hora</small></div></div>
      <div class="mapa-calor"><span></span>${Array.from({ length: 11 }, (_, i) => `<span class="etq-fila" style="text-align:center">${i + 8}</span>`).join('')}${calor}</div>
    </section>`;

  const aplicar = (d, h) => { rangoReporte.desde = d; rangoReporte.hasta = h; refrescar(); };
  $('rango').onchange = (e) => {
    const v = e.target.value;
    if (v === 'mes') aplicar(hoy.slice(0, 8) + '01', hoy);
    else if (v === 'anterior') { const fin = sumarDias(hoy.slice(0, 8) + '01', -1); aplicar(fin.slice(0, 8) + '01', fin); }
    else if (v === '7' || v === '30') aplicar(sumarDias(hoy, -Number(v) + 1), hoy);
    else if (v === 'anio') aplicar(hoy.slice(0, 4) + '-01-01', hoy);
  };
  $('r-desde').onchange = (e) => { if (e.target.value && e.target.value <= hasta) aplicar(e.target.value, hasta); };
  $('r-hasta').onchange = (e) => { if (e.target.value && e.target.value >= desde) aplicar(desde, e.target.value); };
  vista.querySelector('[data-exportar]').onclick = () => descargarCSV(`reporte-${desde}-a-${hasta}.csv`, [
    ['Indicador', 'Valor'], ['Ingresos', r.ingresos_total], ['Gastos', r.gastos_total], ['Utilidad', utilidad], ['Ticket promedio', r.ticket_promedio],
    ['Citas', r.citas_total], ['Terminadas', r.citas_terminadas], ['No asistió', r.no_asistio], ['Canceladas', r.canceladas],
    ['Clientas nuevas', r.clientas_nuevas], ['Clientas que volvieron', r.clientas_recurrentes], [],
    ['Profesional', 'Ventas', 'Citas', 'Ocupación %'], ...pros.map((p) => [p.nombre, p.ventas, p.citas, p.ocupacion]), [],
    ['Día', 'Ingresos'], ...g.dias.map((d) => [d.fecha, d.valor]),
  ]);
  // Tooltip de la gráfica
  const tip = $('tooltip');
  vista.querySelectorAll('#grafica-ingresos .barra').forEach((b) => {
    const mostrar = () => {
      const d = g.dias[b.dataset.i]; const rc = b.getBoundingClientRect();
      tip.innerHTML = `<strong>${formatoCOP(d.valor)}</strong>${capitalizar(fechaLegible(d.fecha, { weekday: 'long', day: 'numeric', month: 'short' }))}`;
      tip.style.left = rc.left + rc.width / 2 + 'px'; tip.style.top = rc.top + 'px'; tip.hidden = false;
    };
    b.addEventListener('mouseenter', mostrar); b.addEventListener('focus', mostrar);
    b.addEventListener('mouseleave', () => { tip.hidden = true; }); b.addEventListener('blur', () => { tip.hidden = true; });
  });
};

// ----- GASTOS -----
VISTAS.gastos = async (vista) => {
  const hoy = hoyCol();
  const mes = hoy.slice(0, 8) + '01';
  const lista = await db.leer('gastos', `select=*&fecha=gte.${mes}&order=fecha.desc`);
  const total = lista.reduce((t, g) => t + g.valor, 0);
  const porCat = {};
  lista.forEach((g) => { porCat[g.categoria] = (porCat[g.categoria] || 0) + g.valor; });
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Gastos</h1><p>Este mes: <b>${formatoCOP(total)}</b></p></div></header>
    <div class="grid-2">
      <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.6rem">Registrar gasto</h2>
        <div class="form-grid">
          <div class="campo"><label for="g-fecha">Fecha</label><input id="g-fecha" type="date" value="${hoy}"></div>
          <div class="campo"><label for="g-cat">Categoría</label><select id="g-cat">${Object.entries(CATEGORIAS_GASTO).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="campo"><label for="g-valor">Valor</label><input id="g-valor" type="number" min="1" step="1000"></div>
          <div class="campo"><label for="g-metodo">Pagado con</label><select id="g-metodo">${Object.entries(METODOS).filter(([k]) => k !== 'bono').map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></div>
          <div class="campo ancho"><label for="g-desc">Descripción</label><input id="g-desc" maxlength="120"></div>
        </div>
        <button class="btn" data-guardar>Guardar gasto</button></section>
      <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.6rem">Por categoría</h2>
        ${barrasH(Object.entries(porCat), (x) => x[1], (x) => CATEGORIAS_GASTO[x[0]], formatoCOP)}</section>
    </div>
    <section class="tarjeta-admin">${lista.length ? `<table class="tabla"><thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="num">Valor</th><th></th></tr></thead>
      <tbody>${lista.map((g) => `<tr><td>${fechaLegible(g.fecha)}</td><td>${CATEGORIAS_GASTO[g.categoria]}</td><td>${esc(g.descripcion)}<small>${METODOS[g.metodo_pago] || ''}</small></td>
        <td class="num">${formatoCOP(g.valor)}</td><td><button class="boton-mini peligro" data-borrar="${g.id}">Borrar</button></td></tr>`).join('')}</tbody></table>` : '<p class="vacio">Sin gastos este mes.</p>'}</section>`;
  vista.querySelector('[data-guardar]').onclick = async () => {
    const valor = Number($('g-valor').value);
    if (!valor) { toast('Escribe el valor.', true); return; }
    await intentar(() => db.insertar('gastos', { fecha: $('g-fecha').value, categoria: $('g-cat').value, valor, metodo_pago: $('g-metodo').value, descripcion: $('g-desc').value.trim() }), 'Gasto guardado.');
    refrescar();
  };
  vista.querySelectorAll('[data-borrar]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.borrar('gastos', `id=eq.${b.dataset.borrar}`), 'Gasto borrado.');
    refrescar();
  });
};

// ----- EQUIPO, COMISIONES Y ACCESOS -----
function tablaSolicitudes(solicitudes) {
  return `<table class="tabla tabla-apilable"><tbody>${solicitudes.map((s) => `<tr><td><strong>${esc(s.nombre || '(sin nombre)')}</strong><small>${esc(s.email)}</small></td>
    <td><select class="selector" data-rol="${s.user_id}" aria-label="Rol"><option value="estilista">Estilista</option><option value="recepcion">Recepción</option><option value="duena">Dueña</option></select></td>
    <td><select class="selector" data-pro="${s.user_id}" aria-label="Profesional"><option value="">— Profesional —</option>${PROFESIONALES.map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`).join('')}</select></td>
    <td><button class="boton-mini ok" data-aprobar="${s.user_id}">Aprobar</button></td></tr>`).join('')}</tbody></table>`;
}
function activarSolicitudes(vista) {
  vista.querySelectorAll('[data-aprobar]').forEach((b) => b.onclick = async () => {
    const id = b.dataset.aprobar;
    const rol = vista.querySelector(`[data-rol="${id}"]`).value;
    const pro = vista.querySelector(`[data-pro="${id}"]`).value || null;
    if (rol === 'estilista' && !pro) { toast('Elige a qué profesional corresponde la cuenta.', true); return; }
    await intentar(() => db.rpc('aprobar_acceso', { p_user: id, p_rol: rol, p_profesional: pro }), 'Acceso aprobado.');
    refrescar();
  });
}

VISTAS.equipo = async (vista) => {
  const hoy = hoyCol();
  const mes = hoy.slice(0, 8) + '01';
  const duena = esDuena();
  const [comisiones, bloqueos, solicitudes, perfiles] = await Promise.all([
    db.rpc('comisiones', { p_desde: mes, p_hasta: hoy }),
    db.leer('bloqueos', `select=*&fin=gte.${encodeURIComponent(new Date().toISOString())}&order=inicio`),
    duena ? db.leer('solicitudes_acceso', 'select=*&aprobada=eq.false&order=creada') : [],
    duena ? db.leer('perfiles', 'select=*') : [],
  ]);
  const todos = duena ? await db.leer('profesionales', 'select=*&order=orden') : [];
  const DIAS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>${duena ? 'Equipo y comisiones' : 'Mi horario y comisiones'}</h1><p>Comisiones de este mes (${fechaLegible(mes, { day: 'numeric', month: 'short' })} – hoy)</p></div>
      <div class="acciones-vista"><button class="btn btn-pequeno btn-borde" data-bloquear>Bloquear horario</button></div></header>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Comisiones</h2><small>Servicios × % de servicio + productos × % de producto + propinas</small></div></div>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Profesional</th><th class="num">Servicios</th><th class="num">Productos</th><th class="num">Propinas</th><th class="num">A pagar</th></tr></thead>
      <tbody>${comisiones.map((c) => `<tr><td><strong>${esc(c.nombre)}</strong><small>${Math.round(c.comision_servicio * 100)}% servicios · ${Math.round(c.comision_producto * 100)}% productos</small></td>
        <td class="num">${formatoCOP(c.servicios)}</td><td class="num">${formatoCOP(c.productos)}</td><td class="num">${formatoCOP(c.propinas)}</td>
        <td class="num"><b>${formatoCOP(Math.round(c.servicios * c.comision_servicio + c.productos * c.comision_producto + c.propinas))}</b></td></tr>`).join('')}</tbody></table></div></section>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Horarios bloqueados</h2><small>Almuerzos, vacaciones e incapacidades próximas</small></div></div>
      ${bloqueos.length ? `<table class="tabla"><tbody>${bloqueos.map((b) => `<tr><td><strong>${b.profesional_id ? esc(nombreProfesional(b.profesional_id)) : 'Todo el salón'}</strong><small>${esc(b.motivo)}</small></td>
        <td>${fechaLegible(fechaHoraColombia(b.inicio).fecha)} ${horaDe(b.inicio)} → ${fechaLegible(fechaHoraColombia(b.fin).fecha)} ${horaDe(b.fin)}</td>
        <td><button class="boton-mini peligro" data-quitar-bloqueo="${b.id}">Quitar</button></td></tr>`).join('')}</tbody></table>` : '<p class="vacio">No hay horarios bloqueados.</p>'}</section>
    ${duena ? `
    ${solicitudes.length ? `<section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Solicitudes de acceso</h2></div></div>${tablaSolicitudes(solicitudes)}</section>` : ''}
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Profesionales</h2><small>Cambia días, horario, nivel y comisiones. Guarda cada fila.</small></div>
      <button class="boton-mini" data-nueva-pro>+ Agregar profesional</button></div>
      <div class="tabla-scroll"><table class="tabla"><thead><tr><th>Nombre y rol</th><th>Días</th><th>Entrada</th><th>Salida</th><th>Nivel</th><th>% serv.</th><th>% prod.</th><th>Activa</th><th></th></tr></thead>
      <tbody>${todos.map((p) => `<tr data-fila-pro="${p.id}">
        <td><input data-c="nombre" value="${esc(p.nombre)}" aria-label="Nombre"><input data-c="rol" value="${esc(p.rol)}" aria-label="Rol" style="margin-top:.3rem"></td>
        <td><div class="fila-botones">${[1, 2, 3, 4, 5, 6, 0].map((d) => `<label class="check" style="margin:0"><input type="checkbox" data-dia="${d}" ${p.dias.includes(d) ? 'checked' : ''}>${DIAS[d]}</label>`).join('')}</div></td>
        <td><input type="time" data-c="hora_inicio" value="${p.hora_inicio.slice(0, 5)}" aria-label="Entrada"></td>
        <td><input type="time" data-c="hora_fin" value="${p.hora_fin.slice(0, 5)}" aria-label="Salida"></td>
        <td><select data-c="nivel" aria-label="Nivel"><option value="junior" ${p.nivel === 'junior' ? 'selected' : ''}>Junior</option><option value="senior" ${p.nivel === 'senior' ? 'selected' : ''}>Senior</option></select></td>
        <td><input type="number" data-c="comision_servicio" value="${Math.round(p.comision_servicio * 100)}" min="0" max="100" aria-label="% servicios"></td>
        <td><input type="number" data-c="comision_producto" value="${Math.round(p.comision_producto * 100)}" min="0" max="100" aria-label="% productos"></td>
        <td><input type="checkbox" data-c="activo" ${p.activo ? 'checked' : ''} aria-label="Activa"></td>
        <td><button class="boton-mini ok" data-guardar-pro="${p.id}">Guardar</button></td></tr>`).join('')}</tbody></table></div></section>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Cuentas del equipo</h2></div></div>
      <table class="tabla"><tbody>${perfiles.map((p) => `<tr><td><strong>${esc(p.nombre || '—')}</strong></td><td>${ROLES[p.rol]}</td><td>${p.profesional_id ? esc(nombreProfesional(p.profesional_id)) : ''}</td></tr>`).join('')}</tbody></table>
      <p class="nota-enlace">Para sumar a alguien: que entre al panel, elija "Soy nueva en el equipo: crear cuenta" y luego apruébala aquí.</p></section>` : ''}`;

  vista.querySelector('[data-bloquear]').onclick = () => bloquearHorario({ fecha: hoy });
  vista.querySelectorAll('[data-quitar-bloqueo]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.borrar('bloqueos', `id=eq.${b.dataset.quitarBloqueo}`), 'Bloqueo quitado.');
    refrescar();
  });
  activarSolicitudes(vista);
  vista.querySelectorAll('[data-guardar-pro]').forEach((b) => b.onclick = async () => {
    const fila = vista.querySelector(`[data-fila-pro="${b.dataset.guardarPro}"]`);
    const v = (c) => fila.querySelector(`[data-c="${c}"]`);
    const dias = [...fila.querySelectorAll('[data-dia]:checked')].map((x) => Number(x.dataset.dia));
    await intentar(() => db.actualizar('profesionales', `id=eq.${b.dataset.guardarPro}`, {
      nombre: v('nombre').value.trim(), rol: v('rol').value.trim(), dias, hora_inicio: v('hora_inicio').value, hora_fin: v('hora_fin').value,
      nivel: v('nivel').value, comision_servicio: Number(v('comision_servicio').value) / 100, comision_producto: Number(v('comision_producto').value) / 100,
      activo: v('activo').checked,
    }), 'Profesional actualizada.');
    await cargarCatalogo().catch(() => {});
  });
  const nueva = vista.querySelector('[data-nueva-pro]');
  if (nueva) nueva.onclick = () => {
    abrirModal('Agregar profesional', `<div class="form-grid">
      <div class="campo"><label for="np-nombre">Nombre</label><input id="np-nombre"></div>
      <div class="campo"><label for="np-rol">Rol</label><input id="np-rol" placeholder="Estilista, Peluquero, Manicurista…"></div>
      <div class="campo ancho"><label for="np-esp">Especialidad</label><input id="np-esp"></div>
      <div class="campo ancho"><span class="etiqueta-campo">Servicios que hace</span><div class="fila-botones">${CATEGORIAS.map((c) => `<label class="check"><input type="checkbox" data-cat="${c.id}"> ${esc(c.nombre)}</label>`).join('')}</div></div>
    </div>`, '<button class="btn" data-guardar>Agregar</button>');
    $('modal-contenido').querySelector('[data-guardar]').onclick = async () => {
      const nombre = $('np-nombre').value.trim();
      const cats = [...$('modal-contenido').querySelectorAll('[data-cat]:checked')].map((x) => x.dataset.cat);
      if (!nombre || !cats.length) { toast('Escribe el nombre y elige al menos un tipo de servicio.', true); return; }
      const id = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 5);
      await intentar(() => db.insertar('profesionales', { id, nombre, rol: $('np-rol').value.trim() || 'Estilista', especialidad: $('np-esp').value.trim(), categorias: cats, resenas: 0, orden: 99 }), 'Profesional agregada.');
      await cargarCatalogo().catch(() => {});
      cerrarModal(); refrescar();
    };
  };
};

// ----- SERVICIOS Y PRECIOS -----
VISTAS.catalogo = async (vista) => {
  const [servicios, disenos, productos] = await Promise.all([
    db.leer('servicios', 'select=*&order=categoria_id,orden'), db.leer('disenos', 'select=*&order=orden'), db.leer('productos', 'select=*&order=orden'),
  ]);
  const celdaFoto = (x) => `<td><label class="foto-catalogo" title="Cambiar foto"><img src="${esc(x.foto || '')}" alt="">
    <input type="file" accept="image/jpeg,image/png,image/webp" data-foto-de hidden><span>Cambiar</span></label></td>`;
  const fila = (tabla, x, campos) => `<tr data-tabla="${tabla}" data-id="${esc(x.id)}">${tabla === 'servicios' ? '' : celdaFoto(x)}${campos.map(([c, tipo, extra]) => `<td>${tipo === 'check'
    ? `<input type="checkbox" data-c="${c}" ${x[c] ? 'checked' : ''} aria-label="${c}">`
    : tipo === 'area' ? `<textarea data-c="${c}" rows="2" aria-label="${c}" style="width:100%;min-width:180px;font:inherit;font-size:.8rem;border:1px solid var(--linea);border-radius:8px;padding:.3rem">${esc(x[c] || '')}</textarea>`
      : `<input ${tipo === 'num' ? 'type="number" min="0"' : ''} data-c="${c}" value="${esc(x[c] ?? '')}" aria-label="${c}" ${extra || ''}>`}</td>`).join('')}
    <td><button class="boton-mini ok" data-guardar-fila>Guardar</button></td></tr>`;
  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Servicios y precios</h1><p>Los cambios se ven en la página al instante. "Precio antes" muestra una promoción tachada.</p></div></header>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Servicios</h2></div></div><div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Servicio</th><th>Precio</th><th>Precio antes</th><th>Minutos</th><th>Limpieza</th><th>Cuidados después</th><th>Activo</th><th></th></tr></thead>
      <tbody>${servicios.map((s) => fila('servicios', s, [['nombre', 'txt'], ['precio', 'num'], ['precio_antes', 'num'], ['minutos', 'num'], ['limpieza_min', 'num'], ['cuidados', 'area'], ['activo', 'check']])).join('')}</tbody></table></div></section>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Diseños de uñas</h2></div></div><div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Foto</th><th>Diseño</th><th>Descripción</th><th>Precio</th><th>Activo</th><th></th></tr></thead>
      <tbody>${disenos.map((d) => fila('disenos', d, [['nombre', 'txt'], ['detalle', 'txt'], ['precio', 'num'], ['activo', 'check']])).join('')}</tbody></table></div></section>
    <section class="tarjeta-admin"><div class="tarjeta-cabecera"><div><h2>Productos de la tienda</h2></div></div><div class="tabla-scroll"><table class="tabla">
      <thead><tr><th>Foto</th><th>Producto</th><th>Precio</th><th>Stock mínimo</th><th>Modo de uso</th><th>Activo</th><th></th></tr></thead>
      <tbody>${productos.map((p) => fila('productos', p, [['nombre', 'txt'], ['precio', 'num'], ['stock_minimo', 'num'], ['modo_uso', 'area'], ['activo', 'check']])).join('')}</tbody></table></div></section>`;
  // Fotos reales de productos y diseños: se suben al almacenamiento y se guardan en el catálogo
  vista.querySelectorAll('[data-foto-de]').forEach((input) => input.onchange = async () => {
    const archivo = input.files[0];
    if (!archivo) return;
    if (archivo.size > 5 * 1024 * 1024) { toast('La foto debe pesar menos de 5 MB.', true); return; }
    const tr = input.closest('tr');
    try {
      const ruta = await intentar(() => subirArchivo('galeria', archivo));
      const url = `${SUPABASE.url}/storage/v1/object/public/galeria/${ruta}`;
      await intentar(() => db.actualizar(tr.dataset.tabla, `id=eq.${encodeURIComponent(tr.dataset.id)}`, { foto: url }), 'Foto actualizada en la página.');
      tr.querySelector('.foto-catalogo img').src = url;
      await cargarCatalogo().catch(() => {});
    } catch (e) { /* el aviso ya se mostró */ }
  });
  vista.querySelectorAll('[data-guardar-fila]').forEach((b) => b.onclick = async () => {
    const tr = b.closest('tr');
    const cambios = {};
    tr.querySelectorAll('[data-c]').forEach((el) => {
      const c = el.dataset.c;
      cambios[c] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (el.value === '' ? null : Number(el.value)) : el.value.trim();
    });
    await intentar(() => db.actualizar(tr.dataset.tabla, `id=eq.${encodeURIComponent(tr.dataset.id)}`, cambios), 'Guardado.');
    await cargarCatalogo().catch(() => {});
  });
};

// ----- CONFIGURACIÓN -----
VISTAS.config = async (vista) => {
  const filas = await db.leer('config', 'select=*');
  const valor = (k, d) => (filas.find((f) => f.clave === k) || {}).valor ?? d;
  const salon = valor('salon', SALON);
  const integ = { ...INTEGRACIONES, ...valor('integraciones', {}) };
  const plantillas = { ...PLANTILLAS_BASE, ...valor('plantillas', {}) };
  const fidelidad = valor('fidelidad', { sellosParaPremio: 10 });
  const festivos = await db.leer('festivos', `select=*&fecha=gte.${hoyCol()}&order=fecha`);
  const estadoInteg = (v) => v ? '<span class="conectado">Conectado</span>' : '<span class="pendiente-conectar">Pendiente de conectar</span>';
  const campo = (id, etiqueta, v, extra = '') => `<div class="campo"><label for="${id}">${etiqueta}</label><input id="${id}" value="${esc(v ?? '')}" ${extra}></div>`;
  vista.innerHTML = `
    <header class="cabecera-vista"><div><h1>Configuración</h1><p>Datos del salón, conexiones con otros servicios y mensajes.</p></div></header>
    <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.6rem">Datos del salón</h2>
      <div class="form-grid">
        ${campo('s-nombre', 'Nombre', salon.nombre)}${campo('s-direccion', 'Dirección', salon.direccion)}
        ${campo('s-whatsapp', 'WhatsApp (con 57, sin +)', salon.whatsapp, 'inputmode="numeric"')}${campo('s-whatsapp-v', 'WhatsApp como se muestra', salon.whatsappVisible)}
        ${campo('s-email', 'Correo', salon.email)}${campo('s-instagram', 'Instagram', salon.instagram)}
        ${campo('s-horario', 'Horario (texto)', salon.horario)}${campo('s-lat', 'Ubicación: latitud,longitud', `${salon.lat ?? ''},${salon.lng ?? ''}`)}
      </div><button class="btn btn-pequeno" data-guardar-salon>Guardar datos</button></section>
    <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.3rem">Conexiones</h2>
      <p class="nota-enlace">Pega aquí las llaves cuando abras cada cuenta. Mientras estén vacías, la función queda "pendiente de conectar" y la página no la muestra.</p>
      <div class="form-grid">
        <div class="campo"><label for="i-wompi">Wompi · llave pública (pagos con Nequi, PSE y tarjeta) ${estadoInteg(integ.wompiPublicKey)}</label><input id="i-wompi" value="${esc(integ.wompiPublicKey)}" placeholder="pub_prod_..."></div>
        <div class="campo"><label for="i-ga">Google Analytics · ID de medición ${estadoInteg(integ.googleAnalyticsId)}</label><input id="i-ga" value="${esc(integ.googleAnalyticsId)}" placeholder="G-XXXXXXX"></div>
        <div class="campo"><label for="i-meta">Píxel de Meta (Facebook/Instagram) ${estadoInteg(integ.metaPixelId)}</label><input id="i-meta" value="${esc(integ.metaPixelId)}" placeholder="1234567890"></div>
        <div class="campo"><label for="i-resena">Enlace para dejar reseña en Google ${estadoInteg(integ.googleReviewUrl)}</label><input id="i-resena" value="${esc(integ.googleReviewUrl)}" placeholder="https://g.page/r/..."></div>
        <label class="check ancho"><input type="checkbox" id="i-wa" ${integ.whatsappApiActiva ? 'checked' : ''}> Tengo WhatsApp Business API para recordatorios automáticos ${estadoInteg(integ.whatsappApiActiva)}</label>
      </div><button class="btn btn-pequeno" data-guardar-integ>Guardar conexiones</button></section>
    <div class="grid-2">
      <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.6rem">Mensajes de WhatsApp</h2>
        <p class="nota-enlace">Palabras entre llaves se reemplazan solas: {nombre}, {fecha}, {hora}, {profesional}, {salon}, {enlace}.</p>
        ${Object.entries({ recordatorio: 'Recordatorio de cita', agradecimiento: 'Agradecimiento y reseña', reactivar: 'Reactivar clientas', espera: 'Lista de espera', cumpleanos: 'Cumpleaños' }).map(([k, t]) => `
          <div class="campo"><label for="p-${k}">${t}</label><textarea id="p-${k}" rows="2">${esc(plantillas[k])}</textarea></div>`).join('')}
        <button class="btn btn-pequeno" data-guardar-plantillas>Guardar mensajes</button></section>
      <div>
        <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.6rem">Tarjeta de sellos</h2>
          <div class="campo"><label for="f-sellos">Sellos para un servicio gratis</label><input id="f-sellos" type="number" min="3" max="30" value="${fidelidad.sellosParaPremio}"></div>
          <button class="btn btn-pequeno" data-guardar-fidelidad>Guardar</button></section>
        <section class="tarjeta-admin"><h2 style="font-size:1.4rem;margin-bottom:.6rem">Festivos y días cerrados</h2>
          <div class="fila-botones" style="margin-bottom:.6rem"><input type="date" class="selector" id="fe-fecha" aria-label="Fecha"><input class="selector" id="fe-nombre" placeholder="Motivo" aria-label="Motivo"><button class="boton-mini ok" data-agregar-festivo>Agregar</button></div>
          <table class="tabla"><tbody>${festivos.slice(0, 12).map((f) => `<tr><td>${fechaLegible(f.fecha, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td><td>${esc(f.nombre || 'Festivo')}</td>
            <td><button class="boton-mini peligro" data-quitar-festivo="${f.fecha}">Quitar</button></td></tr>`).join('')}</tbody></table></section>
      </div>
    </div>`;
  const guardar = (clave, v, publica = true) => intentar(() => db.insertar('config', { clave, valor: v, publica }).catch(() => db.actualizar('config', `clave=eq.${clave}`, { valor: v })), 'Guardado.');
  vista.querySelector('[data-guardar-salon]').onclick = async () => {
    const [lat, lng] = $('s-lat').value.split(',').map((x) => Number(x.trim()));
    await intentar(() => db.actualizar('config', 'clave=eq.salon', { valor: {
      nombre: $('s-nombre').value.trim(), direccion: $('s-direccion').value.trim(), whatsapp: $('s-whatsapp').value.replace(/\D/g, ''),
      whatsappVisible: $('s-whatsapp-v').value.trim(), email: $('s-email').value.trim(), instagram: $('s-instagram').value.trim(),
      horario: $('s-horario').value.trim(), lat: lat || null, lng: lng || null } }), 'Datos del salón guardados.');
    await cargarCatalogo().catch(() => {});
  };
  vista.querySelector('[data-guardar-integ]').onclick = async () => {
    await intentar(() => db.actualizar('config', 'clave=eq.integraciones', { valor: {
      wompiPublicKey: $('i-wompi').value.trim(), googleAnalyticsId: $('i-ga').value.trim(), metaPixelId: $('i-meta').value.trim(),
      googleReviewUrl: $('i-resena').value.trim(), whatsappApiActiva: $('i-wa').checked } }), 'Conexiones guardadas.');
    await cargarCatalogo().catch(() => {}); refrescar();
  };
  vista.querySelector('[data-guardar-plantillas]').onclick = async () => {
    const v = {}; Object.keys(PLANTILLAS_BASE).forEach((k) => { v[k] = $('p-' + k).value; });
    PLANTILLAS = { ...PLANTILLAS_BASE, ...v };
    await guardar('plantillas', v, false);
  };
  vista.querySelector('[data-guardar-fidelidad]').onclick = () => intentar(() => db.actualizar('config', 'clave=eq.fidelidad', { valor: { ...fidelidad, sellosParaPremio: Number($('f-sellos').value) || 10 } }), 'Guardado.');
  vista.querySelector('[data-agregar-festivo]').onclick = async () => {
    if (!$('fe-fecha').value) return;
    await intentar(() => db.insertar('festivos', { fecha: $('fe-fecha').value, nombre: $('fe-nombre').value.trim() || 'Cerrado' }), 'Día cerrado agregado.');
    refrescar();
  };
  vista.querySelectorAll('[data-quitar-festivo]').forEach((b) => b.onclick = async () => {
    await intentar(() => db.borrar('festivos', `fecha=eq.${b.dataset.quitarFestivo}`), 'Quitado.');
    refrescar();
  });
};

// ----- HISTORIAL DE CAMBIOS -----
VISTAS.historial = async (vista) => {
  const [filas, perfiles] = await Promise.all([db.leer('auditoria', 'select=*&order=fecha.desc&limit=100'), db.leer('perfiles', 'select=user_id,nombre')]);
  const quien = (u) => (u ? (perfiles.find((p) => p.user_id === u) || {}).nombre || 'Equipo' : 'Clienta (página web)');
  const ACCIONES = { crear: 'Reservó en la página', crear_panel: 'Creó una cita', cancelar_clienta: 'La clienta canceló', reprogramar_clienta: 'La clienta reprogramó', confirmar_clienta: 'La clienta confirmó', cambio_panel: 'Cambió una cita', aprobar: 'Aprobó un acceso' };
  const detalle = (f) => {
    const d = f.detalle || {};
    if (f.accion === 'cambio_panel') {
      const partes = [];
      if (d.estado && d.estado[0] !== d.estado[1]) partes.push(`estado: ${(ESTADOS[d.estado[0]] || [d.estado[0]])[0]} → ${(ESTADOS[d.estado[1]] || [d.estado[1]])[0]}`);
      if (d.inicio && d.inicio[0] !== d.inicio[1]) partes.push(`hora: ${horaDe(d.inicio[0])} → ${fechaLegible(fechaHoraColombia(d.inicio[1]).fecha)} ${horaDe(d.inicio[1])}`);
      if (d.profesional && d.profesional[0] !== d.profesional[1]) partes.push(`profesional: ${nombreProfesional(d.profesional[0])} → ${nombreProfesional(d.profesional[1])}`);
      return partes.join(' · ');
    }
    if (f.accion === 'reprogramar_clienta') return `${fechaLegible(fechaHoraColombia(d.antes).fecha)} ${horaDe(d.antes)} → ${fechaLegible(fechaHoraColombia(d.despues).fecha)} ${horaDe(d.despues)}`;
    if (f.accion === 'aprobar') return ROLES[d.rol] || '';
    if (d.origen) return 'llegó por ' + (ORIGENES[d.origen] || d.origen);
    return '';
  };
  vista.innerHTML = `<header class="cabecera-vista"><div><h1>Historial de cambios</h1><p>Quién creó, movió o canceló cada cita (últimos 100 movimientos).</p></div></header>
    <section class="tarjeta-admin">${filas.length ? `<div class="tabla-scroll"><table class="tabla"><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Detalle</th></tr></thead>
      <tbody>${filas.map((f) => `<tr><td>${fechaLegible(fechaHoraColombia(f.fecha).fecha)} ${horaDe(f.fecha)}</td><td>${esc(quien(f.usuario))}</td>
        <td>${esc(ACCIONES[f.accion] || f.accion)}</td><td>${esc(detalle(f))}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vacio">Sin movimientos todavía.</p>'}</section>`;
};

// ===== ARRANQUE =====
(async () => {
  const tipo = sesionDesdeEnlace();
  if (tipo) sesion.tipoEnlace = tipo;
  pintarAcceso();
  if (leerSesion()) await entrar();
  else mostrarPantalla('pantalla-login');
})();
