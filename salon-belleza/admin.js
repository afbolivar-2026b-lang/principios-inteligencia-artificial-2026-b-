// ===== PANEL DEL SALÓN =====
// Las citas, ingresos y servicios más pedidos son DATOS DE EJEMPLO.
// Las "Reservas desde la página web" son reales: las guarda index.html en este navegador.

const hoy = new Date();
const hoyTexto = aTextoFecha(hoy);

const CITAS_EJEMPLO = [
  { hora: '9:30', clienta: 'Camila Rodríguez', servicio: 'Hidratación facial', minutos: 60, precio: 110000, profesional: 'Laura Gómez', estado: 'Confirmada' },
  { hora: '10:45', clienta: 'Valentina Torres', servicio: 'Manicura semipermanente', minutos: 60, precio: 45000, profesional: 'Sofía Martínez', estado: 'Confirmada' },
  { hora: '12:00', clienta: 'Isabella Martínez', servicio: 'Masaje relajante', minutos: 90, precio: 120000, profesional: 'Laura Gómez', estado: 'En curso' },
  { hora: '14:30', clienta: 'Sofía Castillo', servicio: 'Corte & estilizado', minutos: 60, precio: 45000, profesional: 'Mariana López', estado: 'Pendiente' },
  { hora: '16:00', clienta: 'Daniela Peña', servicio: 'Manicura Chrome Rosa', minutos: 60, precio: 65000, profesional: 'Camila Reyes', estado: 'Confirmada' },
];

// Ingresos de los 7 días anteriores a hoy (ejemplo)
const INGRESOS_EJEMPLO = [1420000, 1180000, 1650000, 1310000, 1905000, 2050000, 1845600];

const TOP_SERVICIOS = [
  { nombre: 'Manicura semipermanente', reservas: 42 },
  { nombre: 'Diseños de uñas (catálogo)', reservas: 36 },
  { nombre: 'Limpieza facial profunda', reservas: 28 },
  { nombre: 'Coloración profesional', reservas: 19 },
  { nombre: 'Maquillaje social', reservas: 14 },
];

// --- Reservas web guardadas por la página ---
function leerReservas() {
  try { return JSON.parse(localStorage.getItem(CLAVE_RESERVAS) || '[]'); } catch (e) { return []; }
}
function guardarReservas(lista) {
  try { localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(lista)); } catch (e) { /* sin almacenamiento */ }
}

const ESTADOS = ['Confirmada', 'Pendiente', 'En curso', 'Cancelada'];
const estadoValido = (estado) => (ESTADOS.includes(estado) ? estado : 'Pendiente');
const claseEstado = (estado) => 'estado estado-' + estadoValido(estado).toLowerCase().replace(/\s+/g, '-');
const iniciales = (nombre) => nombre.trim().split(/\s+/).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
const formatoMillones = (v) => '$' + (v / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' M';

// Iconos de los indicadores
const ICONOS_KPI = {
  dinero: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 9v.01M18 15v.01"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9s1-6.5 3.5-9z"/>',
  caja: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
};

function pintarTodo() {
  const reservas = leerReservas();
  const webHoy = reservas.filter((r) => r.fecha === hoyTexto && r.estado !== 'Cancelada');

  // ===== Citas de hoy (ejemplo + reservas web de hoy) =====
  const citasHoy = [
    ...CITAS_EJEMPLO,
    ...webHoy.map((r) => ({
      hora: r.hora, clienta: r.nombre, servicio: r.servicio.nombre, minutos: r.servicio.minutos,
      precio: Number(r.total) || 0, profesional: r.profesional, estado: r.estado, web: true,
    })),
  ].sort((a, b) => horaEnMinutos(a.hora) - horaEnMinutos(b.hora));

  document.getElementById('lista-citas').innerHTML = citasHoy.map((c) => `
    <li>
      <span class="hora-cita">${horaLegible(c.hora)}</span>
      <span class="avatar-cita" aria-hidden="true">${escaparHTML(iniciales(c.clienta))}</span>
      <div>
        <strong>${escaparHTML(c.servicio)} · ${escaparHTML(c.clienta)}</strong>
        <small>${c.minutos} min · ${escaparHTML(c.profesional)}${c.web ? ' · reservada en la web' : ''}</small>
      </div>
      <span class="${claseEstado(c.estado)}">${estadoValido(c.estado)}</span>
    </li>`).join('');

  // ===== Indicadores =====
  const ingresosHoy = citasHoy.reduce((s, c) => s + c.precio, 0);
  const confirmadas = citasHoy.filter((c) => c.estado === 'Confirmada').length;
  const pendientesWeb = reservas.filter((r) => r.estado === 'Pendiente').length;
  const stockBajo = PRODUCTOS.filter((p) => p.stock <= 5);
  const kpis = [
    { icono: 'dinero', titulo: 'Ingresos de hoy', valor: formatoCOP(ingresosHoy), detalle: `${citasHoy.length} citas agendadas`, clase: '' },
    { icono: 'calendario', titulo: 'Citas de hoy', valor: citasHoy.length, detalle: `${confirmadas} confirmadas · ${citasHoy.length - confirmadas} por atender`, clase: '' },
    { icono: 'web', titulo: 'Reservas web', valor: reservas.length, detalle: pendientesWeb ? `${pendientesWeb} pendientes por confirmar` : 'Todas revisadas', clase: pendientesWeb ? 'alerta' : 'positivo' },
    { icono: 'caja', titulo: 'Alertas de inventario', valor: stockBajo.length, detalle: 'productos con stock bajo', clase: stockBajo.length ? 'alerta' : 'positivo' },
  ];
  document.getElementById('kpis').innerHTML = kpis.map((k) => `
    <article class="kpi">
      <div class="kpi-icono"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONOS_KPI[k.icono]}</svg></div>
      <small>${k.titulo}</small>
      <strong>${k.valor}</strong>
      <span class="detalle ${k.clase}">${k.detalle}</span>
    </article>`).join('');

  // ===== Tabla de reservas web =====
  const cuerpo = document.getElementById('tabla-reservas');
  if (!reservas.length) {
    cuerpo.innerHTML = `<tr><td colspan="7" class="lista-vacia">Aún no hay reservas. Haz una de prueba desde
      <a class="enlace" href="index.html#reservar">la página</a> y vuelve aquí.</td></tr>`;
  } else {
    const ordenadas = [...reservas].sort((a, b) => (a.fecha + a.hora.padStart(5, '0')).localeCompare(b.fecha + b.hora.padStart(5, '0')));
    cuerpo.innerHTML = ordenadas.map((r) => {
      const telefono = r.telefono.replace(/\D/g, '');
      const telefonoWa = telefono.length === 10 ? '57' + telefono : telefono;
      return `<tr>
        <td><strong>${fechaLegible(r.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</strong><small>${horaLegible(r.hora)}</small></td>
        <td><strong>${escaparHTML(r.nombre)}</strong><small>${escaparHTML(r.telefono)}</small></td>
        <td><strong>${escaparHTML(r.servicio.nombre)}</strong><small>${(r.productos || []).length ? r.productos.length + ' producto(s) agregados' : 'Sin productos'}${r.nota ? ' · 📝 ' + escaparHTML(r.nota) : ''}</small></td>
        <td>${escaparHTML(r.profesional)}</td>
        <td class="total">${formatoCOP(Number(r.total) || 0)}</td>
        <td><span class="${claseEstado(r.estado)}">${estadoValido(r.estado)}</span></td>
        <td><div class="acciones">
          ${r.estado === 'Pendiente' ? `<button class="boton-mini confirmar" data-id="${escaparHTML(r.id)}" data-estado="Confirmada">Confirmar</button>` : ''}
          ${r.estado !== 'Cancelada' ? `<button class="boton-mini" data-id="${escaparHTML(r.id)}" data-estado="Cancelada">Cancelar</button>` : ''}
          <a class="boton-mini" href="https://wa.me/${telefonoWa}" target="_blank" rel="noopener">WhatsApp</a>
        </div></td>
      </tr>`;
    }).join('');
  }
}

// Confirmar o cancelar una reserva web
document.getElementById('tabla-reservas').addEventListener('click', (evento) => {
  const boton = evento.target.closest('button[data-id]');
  if (!boton) return;
  const reservas = leerReservas();
  const reserva = reservas.find((r) => r.id === boton.dataset.id);
  if (!reserva) return;
  reserva.estado = boton.dataset.estado;
  guardarReservas(reservas);
  pintarTodo();
});

// Si se hace una reserva en otra pestaña, el panel se actualiza solo
window.addEventListener('storage', (e) => { if (e.key === CLAVE_RESERVAS) pintarTodo(); });

// ===== Inventario =====
document.getElementById('lista-inventario').innerHTML = [...PRODUCTOS]
  .sort((a, b) => a.stock - b.stock)
  .slice(0, 4)
  .map((p) => `
    <li>
      <img src="${p.foto}" alt="">
      <div><strong>${p.nombre}</strong><small>${p.stock} unidades · ${formatoCOP(p.precio)}</small></div>
      <span class="estado ${p.stock <= 5 ? 'estado-en-curso' : 'estado-confirmada'}">${p.stock <= 5 ? 'Stock bajo' : 'En stock'}</span>
    </li>`).join('');

// ===== Servicios más pedidos (barras) =====
const maxReservas = Math.max(...TOP_SERVICIOS.map((s) => s.reservas));
document.getElementById('top-servicios').innerHTML = TOP_SERVICIOS.map((s) => `
  <li>
    <span class="nombre">${s.nombre}</span>
    <span class="valor">${s.reservas} reservas</span>
    <span class="pista" aria-hidden="true"><span class="relleno" style="width:${(s.reservas / maxReservas) * 100}%"></span></span>
  </li>`).join('');

// ===== Gráfica de ingresos (SVG con tooltip) =====
function pintarGrafica() {
  const dias = INGRESOS_EJEMPLO.map((valor, i) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (INGRESOS_EJEMPLO.length - i));
    return { valor, fecha, etiqueta: fecha.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }) };
  });
  const total = dias.reduce((s, d) => s + d.valor, 0);
  document.getElementById('total-semana').textContent = formatoCOP(total);

  const ancho = 560, alto = 220, izq = 52, der = 12, arriba = 12, abajo = 28;
  const maximo = Math.ceil(Math.max(...dias.map((d) => d.valor)) / 500000) * 500000;
  const x = (i) => izq + (i * (ancho - izq - der)) / (dias.length - 1);
  const y = (v) => arriba + (1 - v / maximo) * (alto - arriba - abajo);
  const paso = (ancho - izq - der) / (dias.length - 1);

  let guias = '';
  for (let v = 0; v <= maximo; v += 500000) {
    guias += `<line class="linea-guia" x1="${izq}" x2="${ancho - der}" y1="${y(v)}" y2="${y(v)}"/>
              <text class="eje" x="${izq - 8}" y="${y(v) + 4}" text-anchor="end">${v === 0 ? '$0' : formatoMillones(v)}</text>`;
  }
  const puntos = dias.map((d, i) => `${x(i)},${y(d.valor)}`).join(' ');
  const etiquetas = dias.map((d, i) => `<text class="eje" x="${x(i)}" y="${alto - 8}" text-anchor="middle">${d.etiqueta}</text>`).join('');
  const zonas = dias.map((d, i) => `<rect x="${x(i) - paso / 2}" y="0" width="${paso}" height="${alto - abajo}" fill="transparent"
      tabindex="0" data-i="${i}" aria-label="${d.fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}: ${formatoCOP(d.valor)} COP"/>`).join('');

  const contenedor = document.getElementById('grafica-ingresos');
  contenedor.innerHTML = `<svg viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="Ingresos diarios de los últimos 7 días, total ${formatoCOP(total)} COP">
    ${guias}
    <polygon class="area" points="${x(0)},${y(0)} ${puntos} ${x(dias.length - 1)},${y(0)}"/>
    <polyline class="trazo" points="${puntos}"/>
    <line class="cruz" id="cruz" y1="${arriba}" y2="${alto - abajo}" visibility="hidden"/>
    <circle class="punto" id="punto-activo" r="5" visibility="hidden"/>
    ${etiquetas}
    ${zonas}
  </svg>`;

  // Tabla equivalente (accesibilidad)
  document.getElementById('tabla-ingresos').innerHTML =
    '<tr><th>Día</th><th>Ingresos</th></tr>' +
    dias.map((d) => `<tr><td>${d.fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}</td><td>${formatoCOP(d.valor)}</td></tr>`).join('');

  const svg = contenedor.querySelector('svg');
  const cruz = svg.querySelector('#cruz');
  const punto = svg.querySelector('#punto-activo');
  const tooltip = document.getElementById('tooltip');

  function mostrar(i) {
    const d = dias[i];
    cruz.setAttribute('x1', x(i)); cruz.setAttribute('x2', x(i)); cruz.setAttribute('visibility', 'visible');
    punto.setAttribute('cx', x(i)); punto.setAttribute('cy', y(d.valor)); punto.setAttribute('visibility', 'visible');
    const caja = svg.getBoundingClientRect();
    const escala = caja.width / ancho;
    tooltip.innerHTML = `<strong>${formatoCOP(d.valor)} COP</strong>${d.fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })}`;
    tooltip.style.left = caja.left + x(i) * escala + 'px';
    tooltip.style.top = caja.top + y(d.valor) * escala + 'px';
    tooltip.hidden = false;
  }
  function ocultar() {
    cruz.setAttribute('visibility', 'hidden');
    punto.setAttribute('visibility', 'hidden');
    tooltip.hidden = true;
  }
  svg.querySelectorAll('rect[data-i]').forEach((zona) => {
    zona.addEventListener('mouseenter', () => mostrar(Number(zona.dataset.i)));
    zona.addEventListener('focus', () => mostrar(Number(zona.dataset.i)));
    zona.addEventListener('mouseleave', ocultar);
    zona.addEventListener('blur', ocultar);
  });
  window.addEventListener('scroll', ocultar, { passive: true });
}

// ===== Fecha en la cabecera =====
const fechaLarga = hoy.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
document.getElementById('fecha-hoy').textContent = fechaLarga;
document.getElementById('citas-fecha').textContent = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);

pintarTodo();
pintarGrafica();
