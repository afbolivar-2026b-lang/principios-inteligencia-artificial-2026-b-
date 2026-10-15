// ===== MI CITA: ver, confirmar, cambiar o cancelar con el enlace secreto =====
const caja = document.getElementById('cita');
const token = new URLSearchParams(location.search).get('t') || '';
const TOKEN_VALIDO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

const vista = { reserva: null, modo: 'ver', fecha: null, hora: null, error: '', aviso: '', ocupado: false };

const ETIQUETA_ESTADO = {
  pendiente: ['Pendiente de confirmar', 'estado-pendiente'], confirmada: ['Confirmada', 'estado-confirmada'],
  llego: ['En el salón', 'estado-confirmada'], en_curso: ['En curso', 'estado-confirmada'],
  terminada: ['Terminada', 'estado-confirmada'], no_asistio: ['No asistió', 'estado-cancelada'],
  cancelada: ['Cancelada', 'estado-cancelada'],
};

function misCitasHTML() {
  const mis = leerLocal(CLAVE_MIS_CITAS, []);
  if (!mis.length) {
    return `<h1>Mis citas</h1><p>No encontramos citas guardadas en este celular. Abre el enlace que recibiste al reservar
      o <a class="enlace" href="index.html#reservar">haz una reserva</a>.</p>`;
  }
  return `<h1>Mis citas</h1><p>Citas reservadas desde este celular.</p>
    <ul class="lista-mis-citas">${mis.map((c) => {
      const f = fechaHoraColombia(c.inicio);
      return `<li><a href="cita.html?t=${encodeURIComponent(c.token)}">
        <strong>${capitalizar(fechaLegible(f.fecha, { weekday: 'long', day: 'numeric', month: 'long' }))} · ${horaLegible(f.hora)}</strong>
        <span>${c.servicios.map(escaparHTML).join(' + ')} con ${escaparHTML(c.profesional)} · Código ${escaparHTML(c.codigo)}</span></a></li>`;
    }).join('')}</ul>`;
}

function minutosCita() {
  const r = vista.reserva;
  return Math.round((new Date(r.fin) - new Date(r.inicio)) / 60000);
}

function selectorNuevaFechaHTML() {
  const r = vista.reserva;
  const p = profesionalPorIdSeguro(r.profesional_id);
  if (!p) return '<p class="error-general">No pudimos cargar la agenda. Escríbenos por WhatsApp para cambiarla.</p>';
  const min = minutosCita();
  const original = fechaHoraColombia(r.inicio);
  const propia = [original.minutos, original.minutos + min];
  const hoy = deTextoFecha(ahoraColombia().fecha);
  const dias = Array.from({ length: 21 }, (_, i) => aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i + 1)));
  const libres = (f) => horariosLibres(p, f, min, f === original.fecha ? propia : null);
  return `
    <h2>Elige la nueva fecha</h2>
    <p>Agenda de ${escaparHTML(p.nombre)} · tu cita dura ${duracionTexto(min)}</p>
    <div class="dias-agenda">${dias.map((f) => {
      const n = libres(f).length;
      const d = deTextoFecha(f);
      return `<button type="button" class="dia-agenda" data-fecha="${f}" aria-pressed="${vista.fecha === f}" ${n ? '' : 'disabled'}>
        <small>${capitalizar(d.toLocaleDateString('es-CO', { weekday: 'short' }))}</small><strong>${d.getDate()}</strong>
        <em>${FESTIVOS.has(f) ? 'Festivo' : !trabajaEseDia(p, f) ? 'Descansa' : n ? n + ' cupos' : 'Lleno'}</em></button>`;
    }).join('')}</div>
    ${vista.fecha ? `<div class="grid-horas">${libres(vista.fecha).map((h) => `
      <button type="button" class="hora" data-hora="${h}" aria-pressed="${vista.hora === h}">${horaLegible(h)}
        <small>hasta ${horaLegible(minutosAHora(horaEnMinutos(h) + min))}</small></button>`).join('')}</div>` : ''}
    <div class="acciones-cita">
      <button type="button" class="btn" data-accion="guardar-cambio" ${vista.hora ? '' : 'disabled'}>Guardar nueva fecha</button>
      <button type="button" class="btn btn-borde" data-accion="volver">No cambiar</button>
    </div>`;
}

function pintar() {
  if (!TOKEN_VALIDO) { caja.innerHTML = misCitasHTML(); return; }
  const r = vista.reserva;
  if (!r) {
    caja.innerHTML = vista.error
      ? `<h1>Mi cita</h1><p class="error-general">${escaparHTML(vista.error)}</p>${misCitasHTML().replace('<h1>Mis citas</h1>', '<h2>Mis citas</h2>')}`
      : '<p class="cargando">Buscando tu cita…</p>';
    return;
  }
  const ini = fechaHoraColombia(r.inicio);
  const fin = fechaHoraColombia(r.fin);
  const [texto, clase] = ETIQUETA_ESTADO[r.estado] || [r.estado, ''];
  const activa = ['pendiente', 'confirmada'].includes(r.estado);
  const titulo = `Cita en ${SALON.nombre}: ${r.servicios.map((s) => s.nombre).join(' + ')}`;
  const detalles = `Con ${r.profesional}. Código ${r.codigo}. ${location.href}`;

  let acciones = '';
  if (vista.modo === 'cambiar') {
    acciones = selectorNuevaFechaHTML();
  } else if (vista.modo === 'cancelar') {
    acciones = `<div class="confirmar-cancelar">
      <p><b>¿Seguro que quieres cancelar tu cita?</b> El horario quedará libre para otra persona.</p>
      <div class="acciones-cita">
        <button type="button" class="btn btn-peligro" data-accion="si-cancelar">Sí, cancelar mi cita</button>
        <button type="button" class="btn btn-borde" data-accion="volver">No, mantenerla</button>
      </div></div>`;
  } else if (activa) {
    acciones = `<div class="acciones-cita">
      ${r.estado === 'pendiente' ? '<button type="button" class="btn" data-accion="confirmar">✓ Confirmo que voy</button>' : ''}
      ${r.puede_cambiar ? `<button type="button" class="btn btn-borde" data-accion="cambiar">Cambiar fecha u hora</button>
        <button type="button" class="btn btn-borde" data-accion="cancelar">Cancelar cita</button>` : ''}
      <a class="btn btn-borde" href="${enlaceGoogleCalendar(titulo, r.inicio, r.fin, detalles)}" target="_blank" rel="noopener">Google Calendar</a>
      <button type="button" class="btn btn-borde" data-accion="ics">Calendario del celular</button>
    </div>
    ${r.puede_cambiar ? '' : `<p class="nota-enlace">Faltan menos de 24 horas: para cambiarla o cancelarla
      <a class="enlace" href="https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent('Hola, necesito cambiar mi cita. Código ' + r.codigo)}" target="_blank" rel="noopener">escríbenos por WhatsApp</a>.</p>`}`;
  }

  caja.innerHTML = `
    <p class="sobretitulo">Mi cita · código ${escaparHTML(r.codigo)}</p>
    <h1>Hola, ${escaparHTML(r.nombre)}</h1>
    ${vista.aviso ? `<p class="ok-aviso" role="status">${escaparHTML(vista.aviso)}</p>` : ''}
    ${vista.error ? `<p class="error-general" role="alert">${escaparHTML(vista.error)}</p>` : ''}
    <div class="tarjeta-cita">
      <span class="estado ${clase}">${texto}</span>
      <h2>${capitalizar(fechaLegible(ini.fecha, { weekday: 'long', day: 'numeric', month: 'long' }))}</h2>
      <p class="hora-grande">${horaLegible(ini.hora)} – ${horaLegible(fin.hora)}</p>
      <div class="fila-resumen"><span>Servicios</span><span>${r.servicios.map((s) => escaparHTML(s.nombre)).join('<br>')}</span></div>
      <div class="fila-resumen"><span>Profesional</span><span>${escaparHTML(r.profesional)}</span></div>
      ${r.productos.length ? `<div class="fila-resumen"><span>Productos</span><span>${r.productos.map((p) => escaparHTML(p.nombre)).join('<br>')}</span></div>` : ''}
      <div class="fila-resumen"><span>Lugar</span><span>${escaparHTML(SALON.direccion)}</span></div>
      <div class="fila-resumen total"><span>Total</span><span>${formatoCOP(r.total)} COP</span></div>
    </div>
    ${acciones}`;
}

async function accion(fn) {
  vista.error = ''; vista.aviso = '';
  try { await fn(); } catch (e) { vista.error = e instanceof TypeError ? 'No hay conexión. Inténtalo de nuevo.' : mensajeError(e); }
  pintar();
}

caja.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if (d.fecha) { vista.fecha = d.fecha; vista.hora = null; pintar(); return; }
  if (d.hora) { vista.hora = d.hora; pintar(); return; }
  switch (d.accion) {
    case 'confirmar':
      accion(async () => { vista.reserva = await db.rpc('confirmar_asistencia', { p_token: token }); vista.aviso = '¡Gracias! Tu asistencia quedó confirmada.'; });
      break;
    case 'cambiar': vista.modo = 'cambiar'; vista.fecha = null; vista.hora = null; pintar(); break;
    case 'cancelar': vista.modo = 'cancelar'; pintar(); break;
    case 'volver': vista.modo = 'ver'; pintar(); break;
    case 'si-cancelar':
      accion(async () => {
        vista.reserva = await db.rpc('cancelar_reserva', { p_token: token });
        vista.modo = 'ver'; vista.aviso = 'Tu cita quedó cancelada. Esperamos verte pronto.';
      });
      break;
    case 'guardar-cambio':
      accion(async () => {
        vista.reserva = await db.rpc('reprogramar_reserva', { p_token: token, p_inicio: aISOColombia(vista.fecha, vista.hora) });
        vista.modo = 'ver'; vista.aviso = 'Listo, cambiamos tu cita. Si la tenías en el calendario, actualízala.';
        await cargarOcupados().catch(() => {});
      });
      break;
    case 'ics': {
      const r = vista.reserva;
      descargarICS(`Cita en ${SALON.nombre}`, r.inicio, r.fin, `Con ${r.profesional}. Código ${r.codigo}.`);
      break;
    }
    default:
  }
});

(async () => {
  if (!TOKEN_VALIDO) { pintar(); return; }
  try {
    const [r] = await Promise.all([
      db.rpc('ver_reserva', { p_token: token }),
      cargarCatalogo().then(cargarOcupados).catch(() => {}),
    ]);
    if (!r) vista.error = 'No encontramos esa cita. Revisa que el enlace esté completo.';
    vista.reserva = r;
  } catch (e) {
    vista.error = e instanceof TypeError ? 'No hay conexión con el sistema de reservas. Inténtalo más tarde.' : mensajeError(e);
  }
  pintar();
})();
