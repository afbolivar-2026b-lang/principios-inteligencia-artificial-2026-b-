// ===== DATOS DEL SALÓN =====
// Los datos reales viven en la base de datos (Supabase) y se editan desde el panel.
// Lo que hay aquí es el RESPALDO: se muestra si la base de datos no responde.
// La página y el panel cargan los datos reales con cargarCatalogo().

const SALON = {
  nombre: 'Neiva Belleza',
  whatsapp: '573001234567', // código de país + número, sin espacios ni "+"
  whatsappVisible: '+57 300 123 4567',
  direccion: 'Carrera 5 # 12-34, Neiva, Huila',
  email: 'hola@neivabelleza.co',
  instagram: '@neivabelleza',
  horario: 'Lunes a sábado: 9:00 a.m. – 7:00 p.m.',
  lat: 2.9273,
  lng: -75.2819,
};

// Íconos de línea (trazos SVG) para cada categoría
const ICONOS = {
  cabello: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
  unas: '<path d="M9 10h6v10a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2V10z"/><path d="M10 10V4h4v6"/><path d="M11 4V2h2v2"/>',
  maquillaje: '<path d="M9 22V12h6v10"/><path d="M9 12l1-6h4l1 6"/><path d="M12 6V2"/>',
  spa: '<path d="M12 21c-4.5-2.5-7-6-7-10 3 0 5.5 1.5 7 4 1.5-2.5 4-4 7-4 0 4-2.5 7.5-7 10z"/><path d="M12 15c-1-3-1-7 0-11 1 4 1 8 0 11z"/>',
};

const CATEGORIAS = [
  {
    id: 'cabello', nombre: 'Cabello', duracion: '60 – 120 min',
    servicios: [
      { id: 'corte', nombre: 'Corte & estilizado', detalle: 'Corte personalizado, brushing y acabado', precio: 45000, minutos: 60, ajustesLargo: { medio: { precio: 5000, minutos: 0 }, largo: { precio: 10000, minutos: 15 } } },
      { id: 'color', nombre: 'Coloración profesional', detalle: 'Balayage, mechas o color global', precio: 160000, minutos: 120, limpieza: 15, ajustesLargo: { medio: { precio: 30000, minutos: 30 }, largo: { precio: 60000, minutos: 60 } } },
      { id: 'hidratante', nombre: 'Tratamiento hidratante', detalle: 'Nutrición profunda, brillo y suavidad', precio: 90000, minutos: 60, ajustesLargo: { medio: { precio: 10000, minutos: 0 }, largo: { precio: 20000, minutos: 15 } } },
    ],
  },
  {
    id: 'unas', nombre: 'Uñas', duracion: '45 – 60 min',
    servicios: [
      { id: 'mani-clasica', nombre: 'Manicura clásica', detalle: 'Cuidado y esmaltado tradicional', precio: 30000, minutos: 45 },
      { id: 'mani-semi', nombre: 'Manicura semipermanente', detalle: 'Duración hasta 3 semanas', precio: 45000, minutos: 60 },
      { id: 'pedi-spa', nombre: 'Pedicura spa', detalle: 'Exfoliación, hidratación y esmaltado', precio: 60000, minutos: 60 },
    ],
  },
  {
    id: 'maquillaje', nombre: 'Maquillaje', duracion: '30 – 120 min',
    servicios: [
      { id: 'maq-social', nombre: 'Maquillaje social', detalle: 'Look natural o glamoroso para evento', precio: 120000, minutos: 60 },
      { id: 'maq-novia', nombre: 'Maquillaje de novia', detalle: 'Incluye prueba y fijación prolongada', precio: 280000, minutos: 120 },
      { id: 'cejas', nombre: 'Cejas: perfilado & tinte', detalle: 'Diseño y tono natural', precio: 35000, minutos: 30 },
    ],
  },
  {
    id: 'spa', nombre: 'Spa facial', duracion: '60 – 90 min',
    servicios: [
      { id: 'limpieza', nombre: 'Limpieza profunda', detalle: 'Extracción, exfoliación y mascarilla', precio: 90000, minutos: 60, limpieza: 10 },
      { id: 'hidra-facial', nombre: 'Hidratación facial', detalle: 'Ácido hialurónico y luminosidad', precio: 110000, minutos: 60, limpieza: 10 },
      { id: 'masaje', nombre: 'Masaje relajante', detalle: 'Aromaterapia y piedras calientes', precio: 120000, minutos: 90, limpieza: 10 },
    ],
  },
];

// Diseños de uñas del catálogo (cambia "foto" por fotos reales de tus trabajos)
const DISENOS = [
  { id: 'minimal-milk', foto: 'img/minimal-milk.jpg', nombre: 'Minimal Milk', categoria: 'Minimal', detalle: 'Acabado natural, brillo saludable', precio: 45000 },
  { id: 'floral-nude', foto: 'img/floral-nude.jpg', nombre: 'Floral Nude', categoria: 'Minimal', detalle: 'Flores pintadas a mano sobre base nude', precio: 55000 },
  { id: 'french-clasico', foto: 'img/french-clasico.jpg', nombre: 'French Clásico', categoria: 'French', detalle: 'Tip francés tradicional, elegante', precio: 52000 },
  { id: 'french-perlado', foto: 'img/french-perlado.jpg', nombre: 'French Perlado', categoria: 'French', detalle: 'French con detalles de perla, romántico', precio: 58000 },
  { id: 'chrome-espejo', foto: 'img/chrome-espejo.jpg', nombre: 'Chrome Espejo', categoria: 'Chrome', detalle: 'Efecto espejo cromado, futurista', precio: 65000 },
  { id: 'chrome-rosa', foto: 'img/chrome-rosa.jpg', nombre: 'Chrome Rosa', categoria: 'Chrome', detalle: 'Rosa dorado con acabado metálico', precio: 65000 },
  { id: 'almond-nude', foto: 'img/almond-nude.jpg', nombre: 'Almond Nude', categoria: 'Almond', detalle: 'Almendra nude lisa, look natural premium', precio: 48000 },
  { id: 'golden-pearl', foto: 'img/golden-pearl.jpg', nombre: 'Golden Pearlescent', categoria: 'Almond', detalle: 'Perlado dorado con brillo delicado', precio: 62000 },
];

// Equipo del salón.
// dias: días que trabaja (0 = domingo, 1 = lunes … 6 = sábado) · horario: entrada y salida
const PROFESIONALES = [
  { id: 'sofia', nombre: 'Sofía Martínez', rol: 'Manicurista', especialidad: 'Uñas en gel & nail art', categorias: ['unas'], rating: 4.9, resenas: 124, tono: ['#e8c3b5', '#c98f88'], dias: [2, 3, 4, 5, 6], horario: ['9:00', '18:00'] },
  { id: 'camila', nombre: 'Camila Reyes', rol: 'Manicurista', especialidad: 'Manicura de lujo & diseño', categorias: ['unas'], rating: 4.9, resenas: 210, tono: ['#d9b49a', '#a8735c'], dias: [1, 2, 3, 4, 5], horario: ['10:00', '19:00'] },
  { id: 'valentina', nombre: 'Valentina Ríos', rol: 'Estilista', especialidad: 'Colorimetría & balayage', categorias: ['cabello'], rating: 4.8, resenas: 98, tono: ['#f0d2c4', '#d39a93'], dias: [1, 2, 3, 4, 5, 6], horario: ['9:00', '17:00'] },
  { id: 'andres', nombre: 'Andrés Cárdenas', rol: 'Peluquero', especialidad: 'Cortes, barbería & peinados', categorias: ['cabello'], rating: 4.9, resenas: 156, tono: ['#d8c3b8', '#7d5c52'], dias: [1, 2, 3, 4, 5, 6], horario: ['11:00', '19:00'] },
  { id: 'mariana', nombre: 'Mariana López', rol: 'Estilista', especialidad: 'Cortes & peinados de evento', categorias: ['cabello', 'maquillaje'], rating: 4.8, resenas: 132, tono: ['#f3ddd2', '#c4877c'], dias: [1, 2, 3, 5, 6], horario: ['9:00', '18:00'] },
  { id: 'daniela', nombre: 'Daniela Ortiz', rol: 'Maquilladora', especialidad: 'Maquillaje & cejas', categorias: ['maquillaje'], rating: 4.7, resenas: 76, tono: ['#efd9cc', '#b8946a'], dias: [3, 4, 5, 6], horario: ['10:00', '19:00'] },
  { id: 'laura', nombre: 'Laura Gómez', rol: 'Esteticista', especialidad: 'Spa facial & masajes', categorias: ['spa'], rating: 4.8, resenas: 88, tono: ['#e9d6d0', '#9d7b84'], dias: [1, 2, 4, 5, 6], horario: ['9:00', '18:00'] },
];

const PRODUCTOS = [
  { id: 'serum-rosa', foto: 'img/p-serum-rosa.jpg', nombre: 'Sérum de Rosa', detalle: 'Hidratante con pétalos de rosa · 30 ml', precio: 98000, stock: 5 },
  { id: 'aceite-facial', foto: 'img/p-aceite-facial.jpg', nombre: 'Aceite facial nutritivo', detalle: 'Jojoba y rosa mosqueta · 15 ml', precio: 76000, stock: 8 },
  { id: 'esmalte-nude', foto: 'img/p-esmalte-nude.jpg', nombre: 'Esmalte Nude · Tono 04', detalle: 'Larga duración, libre de 10 tóxicos · 10 ml', precio: 28000, stock: 14 },
  { id: 'aceite-cuticula', foto: 'img/p-aceite-cuticula.jpg', nombre: 'Aceite de cutícula', detalle: 'Argán y vitamina E · 15 ml', precio: 22000, stock: 3 },
  { id: 'shampoo', foto: 'img/p-shampoo.jpg', nombre: 'Shampoo nutritivo', detalle: 'Sin sulfatos, con aceite de argán · 250 ml', precio: 32000, stock: 20 },
  { id: 'esmalte-rose', foto: 'img/p-esmalte-rose.jpg', nombre: 'Esmalte Rosé Ivory', detalle: 'Brillo intenso, secado rápido · 12 ml', precio: 28000, stock: 11 },
];

// Claves de lo que se recuerda en el navegador de la clienta
const CLAVE_MIS_DATOS = 'neivaBelleza.misDatos';
const CLAVE_BORRADOR = 'neivaBelleza.borrador';
const CLAVE_ULTIMA = 'neivaBelleza.ultimaReserva';
const CLAVE_MIS_CITAS = 'neivaBelleza.misCitas';
function leerLocal(clave, porDefecto) { try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) : porDefecto; } catch (e) { return porDefecto; } }
function guardarLocal(clave, valor) { try { valor === null ? localStorage.removeItem(clave) : localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* sin almacenamiento */ } }

// Ícono de línea a partir de los trazos de ICONOS
function iconoSVG(nombre, clase = 'icono-linea') {
  return `<svg class="${clase}" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[nombre] || ''}</svg>`;
}

// Formato de precio colombiano: 45000 -> "$45.000"
const formatoCOP = (valor) => '$' + valor.toLocaleString('es-CO');

// Busca un servicio por id en todas las categorías
function buscarServicio(id) {
  for (const categoria of CATEGORIAS) {
    const servicio = categoria.servicios.find((s) => s.id === id);
    if (servicio) return { ...servicio, categoria: categoria.id };
  }
  return null;
}

// ===== UTILIDADES COMPARTIDAS (página y panel) =====
// Evita que texto escrito por una persona se interprete como HTML
function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}
function primerDiaDelMes(fecha) { return new Date(fecha.getFullYear(), fecha.getMonth(), 1); }
function aTextoFecha(fecha) {
  const dos = (n) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
}
function deTextoFecha(texto) {
  const [a, m, d] = texto.split('-').map(Number);
  return new Date(a, m - 1, d);
}
function fechaLegible(texto, opciones = { weekday: 'short', day: 'numeric', month: 'short' }) {
  return deTextoFecha(texto).toLocaleDateString('es-CO', opciones);
}
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);
function horaEnMinutos(hora) { const [h, m] = hora.split(':').map(Number); return h * 60 + m; }
function horaLegible(hora) {
  const [h, m] = hora.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}

// ===== DISPONIBILIDAD DEL EQUIPO =====
const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const INTERVALO_CITAS = 30; // cada cuántos minutos puede empezar una cita

function minutosAHora(minutos) { return `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`; }
function profesionalPorIdSeguro(id) { return PROFESIONALES.find((p) => p.id === id); }
function profesionalesPara(categoria) { return PROFESIONALES.filter((p) => p.categorias.includes(categoria)); }
function serviciosDe(profesional) {
  return CATEGORIAS.filter((c) => profesional.categorias.includes(c.id))
    .flatMap((c) => c.servicios.map((s) => ({ ...s, categoria: c.id })));
}
function trabajaEseDia(profesional, fechaTexto) { return profesional.dias.includes(deTextoFecha(fechaTexto).getDay()); }
function profesionalesParaTodas(categorias) { return PROFESIONALES.filter((p) => categorias.every((c) => p.categorias.includes(c))); }

// "Mar a Sáb" o "Lun, Mar, Jue…"
function diasDeTrabajo(profesional) {
  const corto = (d) => NOMBRES_DIAS[d].slice(0, 3).replace(/^./, (c) => c.toUpperCase());
  const dias = [...profesional.dias].sort();
  const seguidos = dias.every((d, i) => i === 0 || d === dias[i - 1] + 1);
  return seguidos && dias.length > 2 ? `${corto(dias[0])} a ${corto(dias[dias.length - 1])}` : dias.map(corto).join(', ');
}

// ===== DISPONIBILIDAD REAL =====
// OCUPADOS["profesional|AAAA-MM-DD"] = [[inicioMin, finMin], ...]  ("*" = todo el salón)
const OCUPADOS = {};
const FESTIVOS = new Set(['2026-01-01','2026-01-12','2026-03-23','2026-04-02','2026-04-03','2026-05-01','2026-05-18',
  '2026-06-08','2026-06-15','2026-06-29','2026-07-20','2026-08-07','2026-08-17','2026-10-12','2026-11-02','2026-11-16',
  '2026-12-08','2026-12-25','2027-01-01','2027-01-11','2027-03-22','2027-03-25','2027-03-26','2027-05-01','2027-05-10',
  '2027-05-31','2027-06-07','2027-07-05','2027-07-20','2027-08-07','2027-08-16','2027-10-18','2027-11-01','2027-11-15',
  '2027-12-08','2027-12-25']);
const ESTADO_CONEXION = { conectado: false, cargado: false };

// "Ahora" en Colombia, sin importar la zona horaria del celular
function ahoraColombia() {
  const c = fechaHoraColombia(new Date().toISOString());
  return { fecha: c.fecha, minutos: c.minutos };
}

function bloquesOcupados(profesional, fechaTexto) {
  return [...(OCUPADOS[profesional.id + '|' + fechaTexto] || []), ...(OCUPADOS['*|' + fechaTexto] || [])]
    .sort((a, b) => a[0] - b[0]);
}

function registrarOcupado(profesionalId, inicioISO, finISO) {
  const a = fechaHoraColombia(inicioISO);
  const b = fechaHoraColombia(finISO);
  // Un bloqueo de varios días (vacaciones) se reparte día por día
  let fecha = a.fecha;
  while (fecha <= b.fecha) {
    const desde = fecha === a.fecha ? a.minutos : 0;
    const hasta = fecha === b.fecha ? b.minutos : 24 * 60;
    const clave = (profesionalId || '*') + '|' + fecha;
    if (hasta > desde) (OCUPADOS[clave] = OCUPADOS[clave] || []).push([desde, hasta]);
    const d = deTextoFecha(fecha); d.setDate(d.getDate() + 1); fecha = aTextoFecha(d);
  }
}

async function cargarOcupados() {
  const hoy = ahoraColombia().fecha;
  const hasta = aTextoFecha(new Date(deTextoFecha(hoy).getTime() + 92 * 864e5));
  const filas = await db.rpc('horarios_ocupados', { p_desde: hoy, p_hasta: hasta });
  Object.keys(OCUPADOS).forEach((k) => delete OCUPADOS[k]);
  filas.forEach((f) => registrarOcupado(f.profesional_id, f.inicio, f.fin));
}

const horaCorta = (t) => { const [h, m] = String(t).split(':'); return `${Number(h)}:${m}`; };

// Trae servicios, equipo, productos, festivos y datos del salón desde la base de datos
async function cargarCatalogo() {
  const [cats, servs, disenos, profs, prods, fest, config] = await Promise.all([
    db.leer('categorias', 'select=*&order=orden'),
    db.leer('servicios', 'select=*&activo=eq.true&order=orden'),
    db.leer('disenos', 'select=*&activo=eq.true&order=orden'),
    db.leer('profesionales', 'select=*&activo=eq.true&order=orden'),
    db.leer('productos', 'select=*&activo=eq.true&order=orden'),
    db.leer('festivos', 'select=fecha'),
    db.leer('config', 'select=clave,valor&publica=eq.true'),
  ]);
  CATEGORIAS.splice(0, CATEGORIAS.length, ...cats.map((c) => ({
    id: c.id, nombre: c.nombre, duracion: c.duracion_texto,
    servicios: servs.filter((s) => s.categoria_id === c.id).map((s) => ({
      id: s.id, nombre: s.nombre, detalle: s.detalle, precio: s.precio, minutos: s.minutos,
      limpieza: s.limpieza_min, ajustesLargo: s.ajustes_largo, precioAntes: s.precio_antes, cuidados: s.cuidados,
    })),
  })));
  DISENOS.splice(0, DISENOS.length, ...disenos.map((d) => ({ id: d.id, foto: d.foto, nombre: d.nombre, categoria: d.categoria, detalle: d.detalle, precio: d.precio })));
  PROFESIONALES.splice(0, PROFESIONALES.length, ...profs.map((p) => ({
    id: p.id, nombre: p.nombre, rol: p.rol, especialidad: p.especialidad, categorias: p.categorias,
    rating: Number(p.rating), resenas: p.resenas, tono: p.tono, dias: p.dias,
    horario: [horaCorta(p.hora_inicio), horaCorta(p.hora_fin)], nivel: p.nivel, bio: p.bio,
    certificados: p.certificados, portafolio: p.portafolio,
  })));
  PRODUCTOS.splice(0, PRODUCTOS.length, ...prods.map((p) => ({
    id: p.id, foto: p.foto, nombre: p.nombre, detalle: p.detalle, precio: p.precio, stock: p.stock,
    stockMinimo: p.stock_minimo, ingredientes: p.ingredientes, modoUso: p.modo_uso, categoria: p.categoria,
  })));
  FESTIVOS.clear(); fest.forEach((f) => FESTIVOS.add(f.fecha));
  const salon = config.find((c) => c.clave === 'salon');
  if (salon) Object.assign(SALON, salon.valor);
  const integ = config.find((c) => c.clave === 'integraciones');
  if (integ) Object.assign(INTEGRACIONES, integ.valor);
  ESTADO_CONEXION.conectado = true;
}

// Llaves de servicios externos (se configuran en el panel). Vacías = "pendiente de conectar".
const INTEGRACIONES = { wompiPublicKey: '', googleAnalyticsId: '', metaPixelId: '', whatsappApiActiva: false, googleReviewUrl: '' };

// Duración y precio de una combinación de servicios (igual que calcula la base de datos)
function calcularServicios(items, largo) {
  let minutos = 0, precio = 0;
  const categorias = new Set();
  items.forEach((s) => {
    let p = s.precio, m = s.minutos;
    if (largo && s.ajustesLargo && s.ajustesLargo[largo]) {
      p += s.ajustesLargo[largo].precio || 0;
      m += s.ajustesLargo[largo].minutos || 0;
    }
    minutos += m + (s.limpieza || 0);
    precio += p;
    categorias.add(s.categoria);
  });
  return { minutos, precio, categorias: [...categorias] };
}
function precioConLargo(s, largo) {
  return s.precio + (largo && s.ajustesLargo && s.ajustesLargo[largo] ? s.ajustesLargo[largo].precio || 0 : 0);
}

// Servicio a partir de su id ("corte" o "diseno:chrome-rosa")
function servicioPorId(id) {
  if (id.startsWith('diseno:')) {
    const d = DISENOS.find((x) => x.id === id.slice(7));
    return d ? { id, nombre: 'Manicura ' + d.nombre, precio: d.precio, minutos: 60, categoria: 'unas', foto: d.foto, limpieza: 0 } : null;
  }
  return buscarServicio(id);
}

// ===== AGREGAR LA CITA AL CALENDARIO =====
const formatoICS = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
function enlaceGoogleCalendar(titulo, inicioISO, finISO, detalles) {
  const p = new URLSearchParams({
    action: 'TEMPLATE', text: titulo, dates: `${formatoICS(inicioISO)}/${formatoICS(finISO)}`,
    details: detalles, location: SALON.direccion, ctz: 'America/Bogota',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}
function descargarICS(titulo, inicioISO, finISO, detalles) {
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Neiva Belleza//Reservas//ES', 'BEGIN:VEVENT',
    `UID:${formatoICS(inicioISO)}-${Math.random().toString(36).slice(2)}@neivabelleza`,
    `DTSTAMP:${formatoICS(new Date().toISOString())}`, `DTSTART:${formatoICS(inicioISO)}`, `DTEND:${formatoICS(finISO)}`,
    `SUMMARY:${titulo}`, `DESCRIPTION:${detalles.replace(/\n/g, '\\n')}`, `LOCATION:${SALON.direccion}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', 'DESCRIPTION:Recordatorio de tu cita', 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: 'cita-neiva-belleza.ics' });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Horas de inicio libres para un servicio de "minutos" de duración
function horariosLibres(profesional, fechaTexto, minutos, ignorar = null) {
  if (!trabajaEseDia(profesional, fechaTexto) || FESTIVOS.has(fechaTexto)) return [];
  const ahora = ahoraColombia();
  if (fechaTexto < ahora.fecha) return [];
  const limite = fechaTexto === ahora.fecha ? ahora.minutos + 30 : -1;
  const [entrada, salida] = profesional.horario.map(horaEnMinutos);
  // "ignorar" permite reprogramar sin chocar con la propia cita
  const ocupados = bloquesOcupados(profesional, fechaTexto)
    .filter(([a, b]) => !(ignorar && a === ignorar[0] && b === ignorar[1]));
  const libres = [];
  for (let inicio = entrada; inicio + minutos <= salida; inicio += INTERVALO_CITAS) {
    const fin = inicio + minutos;
    const choca = ocupados.some(([a, b]) => inicio < b && fin > a);
    if (!choca && inicio > limite) libres.push(minutosAHora(inicio));
  }
  return libres;
}

// Primer cupo libre en los próximos días
function proximoCupo(profesional, minutos, dias = 14) {
  const hoy = deTextoFecha(ahoraColombia().fecha);
  for (let i = 0; i < dias; i++) {
    const fecha = aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i));
    const libres = horariosLibres(profesional, fecha, minutos);
    if (libres.length) return { fecha, hora: libres[0], enDias: i };
  }
  return null;
}

function cuandoTexto(fechaTexto, enDias) {
  if (enDias === 0) return 'Hoy';
  if (enDias === 1) return 'Mañana';
  const t = fechaLegible(fechaTexto, { weekday: 'long', day: 'numeric' });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function duracionTexto(minutos) {
  const h = Math.floor(minutos / 60), m = minutos % 60;
  return h ? `${h} h${m ? ' ' + m + ' min' : ''}` : `${m} min`;
}
