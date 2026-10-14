// ===== MENÚ EN CELULAR =====
const botonMenu = document.querySelector('.menu-toggle');
const menu = document.querySelector('nav');

function cerrarMenu() {
  menu.classList.remove('abierto');
  botonMenu.setAttribute('aria-expanded', 'false');
}

botonMenu.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  botonMenu.setAttribute('aria-expanded', String(abierto));
});
menu.querySelectorAll('a').forEach((enlace) => enlace.addEventListener('click', cerrarMenu));

// ===== PORTADA =====

// ===== SERVICIOS =====
document.getElementById('grid-servicios').innerHTML = CATEGORIAS.map((categoria) => `
  <article class="tarjeta-servicio">
    ${iconoSVG(categoria.id)}
    <h3>${categoria.nombre}</h3>
    <ul class="lista-servicios">
      ${categoria.servicios.map((s) => `
        <li>
          <div class="fila"><strong>${s.nombre}</strong><span class="precio">${formatoCOP(s.precio)}</span></div>
          <small>${s.detalle}</small>
        </li>`).join('')}
    </ul>
    <span class="duracion">Duración: ${categoria.duracion}</span>
  </article>`).join('');

// ===== CATÁLOGO DE DISEÑOS CON FILTROS =====
const contenedorFiltros = document.getElementById('filtros');
const gridDisenos = document.getElementById('grid-disenos');
const categoriasDiseno = ['Todos', ...new Set(DISENOS.map((d) => d.categoria))];
let filtroActual = 'Todos';

function pintarFiltros() {
  contenedorFiltros.innerHTML = categoriasDiseno.map((cat) => {
    const total = cat === 'Todos' ? DISENOS.length : DISENOS.filter((d) => d.categoria === cat).length;
    return `<button class="chip" role="tab" aria-selected="${cat === filtroActual}" data-filtro="${cat}">
      ${cat} <span>· ${total}</span></button>`;
  }).join('');
}

function pintarDisenos() {
  const lista = filtroActual === 'Todos' ? DISENOS : DISENOS.filter((d) => d.categoria === filtroActual);
  gridDisenos.innerHTML = lista.map((d, i) => `
    <article class="tarjeta-diseno" style="animation-delay:${i * 50}ms">
      <div class="foto"><img src="${d.foto}" alt="Uñas ${d.nombre}" loading="lazy"></div>
      <h3>${d.nombre}</h3>
      <p>${d.detalle}</p>
      <span class="precio">${formatoCOP(d.precio)} COP</span>
      <span class="meta">${d.categoria} · 20–25 días</span>
      <a href="#reservar" class="btn btn-pequeno btn-borde" data-diseno="${d.id}">Elegir diseño</a>
    </article>`).join('');
}

contenedorFiltros.addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-filtro]');
  if (!chip) return;
  filtroActual = chip.dataset.filtro;
  pintarFiltros();
  pintarDisenos();
});

pintarFiltros();
pintarDisenos();

// ======================================================
// ===== RESERVA POR PASOS ==============================
// ======================================================
const PASOS = ['Servicio', 'Profesional', 'Fecha y hora', 'Productos', 'Confirmar'];
const CLAVE_RESERVAS = 'neivaBelleza.reservas';

const estado = {
  paso: 0,
  servicio: null,     // { id, nombre, precio, minutos, categoria, foto? }
  profesional: null,  // id de PROFESIONALES o 'cualquiera'
  fecha: null,        // 'AAAA-MM-DD'
  hora: null,
  productos: new Set(),
  mesVista: primerDiaDelMes(new Date()),
  enviada: null,      // reserva confirmada (muestra la pantalla de éxito)
};

const panel = document.getElementById('paso-contenido');
const listaPasos = document.getElementById('pasos');
const btnAtras = document.getElementById('btn-atras');
const btnSiguiente = document.getElementById('btn-siguiente');

// --- Utilidades ---
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
function horaEnMinutos(hora) { const [h, m] = hora.split(':').map(Number); return h * 60 + m; }
function horaLegible(hora) {
  const [h, m] = hora.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'a.m.' : 'p.m.'}`;
}
// Simula horarios ocupados de forma estable (siempre los mismos para la misma fecha)
function estaOcupado(fecha, hora, profesional) {
  const semilla = [...(fecha + hora + profesional)].reduce((suma, c) => suma + c.charCodeAt(0), 0);
  return semilla % 4 === 0;
}
function profesionalPorId(id) {
  return id === 'cualquiera' ? { nombre: 'Sin preferencia' } : PROFESIONALES.find((p) => p.id === id);
}
function productosElegidos() { return PRODUCTOS.filter((p) => estado.productos.has(p.id)); }
function totalReserva() {
  return (estado.servicio ? estado.servicio.precio : 0) + productosElegidos().reduce((s, p) => s + p.precio, 0);
}
function pasoValido(paso) {
  return [
    Boolean(estado.servicio),
    Boolean(estado.profesional),
    Boolean(estado.fecha && estado.hora),
    true,
    true,
  ][paso];
}

// --- Indicador de pasos ---
function pintarPasos() {
  listaPasos.innerHTML = PASOS.map((nombre, i) => {
    const alcanzable = i <= estado.paso || PASOS.slice(0, i).every((_, j) => pasoValido(j));
    const clase = i === estado.paso ? 'activo' : (i < estado.paso ? 'completo' : '');
    return `<li><button type="button" class="paso-boton ${clase}" data-ir="${i}" ${alcanzable && !estado.enviada ? '' : 'disabled'}
        ${i === estado.paso ? 'aria-current="step"' : ''}>
        <span class="numero">${i < estado.paso ? '✓' : i + 1}</span><span class="texto">${nombre}</span>
      </button></li>`;
  }).join('');
}

// --- Paso 1: servicio ---
function vistaServicio() {
  const s = estado.servicio;
  const diseno = s && s.foto
    ? `<div class="diseno-elegido">
        <div class="miniatura"><img src="${s.foto}" alt=""></div>
        <div><small>Diseño elegido del catálogo</small><h4>${s.nombre}</h4><small>${formatoCOP(s.precio)} COP · ${s.minutos} min</small></div>
      </div>`
    : '';
  return `
    <div class="paso-titulo"><h3>1. Elige tu servicio</h3><p>Puedes elegir un servicio o un diseño del catálogo.</p></div>
    ${diseno}
    <div class="grid-opciones-servicio">
      ${CATEGORIAS.map((cat) => `
        <div class="grupo-servicio">
          <h4>${iconoSVG(cat.id, '')}${cat.nombre}</h4>
          ${cat.servicios.map((sv) => `
            <button type="button" class="opcion" data-servicio="${sv.id}" aria-pressed="${s && s.id === sv.id}">
              <strong>${sv.nombre}</strong>
              <span class="precio">${formatoCOP(sv.precio)}<em>${sv.minutos} min</em></span>
              <small>${sv.detalle}</small>
            </button>`).join('')}
        </div>`).join('')}
    </div>`;
}

// --- Paso 2: profesional ---
function vistaProfesional() {
  const categoria = estado.servicio ? estado.servicio.categoria : null;
  const ordenadas = [...PROFESIONALES].sort((a, b) => b.categorias.includes(categoria) - a.categorias.includes(categoria));
  const tarjeta = (p) => {
    const recomendada = p.categorias.includes(categoria);
    const elegida = estado.profesional === p.id;
    const iniciales = p.nombre.split(' ').map((x) => x[0]).join('');
    const estrellas = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
    return `<button type="button" class="tarjeta-profesional" data-profesional="${p.id}" aria-pressed="${elegida}">
      ${elegida ? '<span class="etiqueta-estado">✓ Seleccionada</span>' : (recomendada ? '<span class="etiqueta-estado">Recomendada</span>' : '')}
      <span class="retrato" style="background:linear-gradient(145deg, ${p.tono[0]}, ${p.tono[1]})">${iniciales}</span>
      <span>
        <h4>${p.nombre}</h4>
        <span class="especialidad">${p.especialidad}</span>
        <span class="calificacion"><b>${estrellas}</b> ${p.rating} (${p.resenas} reseñas)</span>
      </span>
    </button>`;
  };
  return `
    <div class="paso-titulo"><h3>2. Elige tu profesional</h3><p>Todas nuestras especialistas están certificadas y muy bien calificadas.</p></div>
    <div class="grid-profesionales">
      ${ordenadas.map(tarjeta).join('')}
      <button type="button" class="tarjeta-profesional" data-profesional="cualquiera" aria-pressed="${estado.profesional === 'cualquiera'}">
        ${estado.profesional === 'cualquiera' ? '<span class="etiqueta-estado">✓ Seleccionada</span>' : ''}
        <span class="retrato" style="background:linear-gradient(145deg, #f3e6df, #d9b7ad)">✦</span>
        <span><h4>Sin preferencia</h4><span class="especialidad">Te asignamos la primera disponible</span></span>
      </button>
    </div>`;
}

// --- Paso 3: fecha y hora ---
function vistaFecha() {
  const hoy = new Date();
  const hoyTexto = aTextoFecha(hoy);
  const mes = estado.mesVista;
  const textoMes = mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const nombreMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);
  const esMesActual = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const huecos = (mes.getDay() + 6) % 7; // la semana empieza en lunes

  let dias = '<span></span>'.repeat(huecos);
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(mes.getFullYear(), mes.getMonth(), d);
    const texto = aTextoFecha(fecha);
    const cerrado = fecha.getDay() === 0 || texto < hoyTexto;
    dias += `<button type="button" class="dia ${texto === hoyTexto ? 'hoy' : ''}" data-fecha="${texto}"
      aria-pressed="${estado.fecha === texto}" ${cerrado ? 'disabled' : ''}
      aria-label="${fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}${cerrado ? ' (no disponible)' : ''}">${d}</button>`;
  }

  let horarios = '<p class="sin-fecha">Primero elige un día en el calendario.</p>';
  if (estado.fecha) {
    const ahora = hoy.getHours() * 60 + hoy.getMinutes();
    horarios = `<div class="grid-horas">${HORARIOS.map((h) => {
      const pasado = estado.fecha === hoyTexto && horaEnMinutos(h) <= ahora + 30;
      const ocupado = pasado || estaOcupado(estado.fecha, h, estado.profesional || '');
      return `<button type="button" class="hora" data-hora="${h}" aria-pressed="${estado.hora === h}" ${ocupado ? 'disabled' : ''}>${horaLegible(h)}</button>`;
    }).join('')}</div>`;
  }

  return `
    <div class="paso-titulo"><h3>3. Fecha y hora</h3><p>Los domingos el salón está cerrado.</p></div>
    <div class="grid-fecha">
      <div class="calendario">
        <div class="calendario-cabecera">
          <button type="button" class="flecha" data-mes="-1" aria-label="Mes anterior" ${esMesActual ? 'disabled' : ''}>‹</button>
          <strong>${nombreMes}</strong>
          <button type="button" class="flecha" data-mes="1" aria-label="Mes siguiente">›</button>
        </div>
        <div class="dias-semana"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
        <div class="dias-mes">${dias}</div>
      </div>
      <div class="horarios">
        <h4>Horarios disponibles</h4>
        <p>${estado.fecha ? fechaLegible(estado.fecha, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sin fecha seleccionada'}</p>
        ${horarios}
        <p class="nota-sesion">🕘 Duración de la sesión: ${estado.servicio ? estado.servicio.minutos : 60} min · Horario del salón: 9:00 a.m. – 7:00 p.m.</p>
      </div>
    </div>`;
}

// --- Paso 4: productos ---
function vistaProductos() {
  return `
    <div class="paso-titulo"><h3>4. Tienda de productos</h3><p>Opcional: agrega productos y te los entregamos en tu cita.</p></div>
    <div class="grid-productos">
      ${PRODUCTOS.map((p) => {
        const agregado = estado.productos.has(p.id);
        return `<div class="tarjeta-producto ${agregado ? 'agregado' : ''}">
          <div class="foto-producto"><img src="${p.foto}" alt="${p.nombre}" loading="lazy"></div>
          <div class="info"><h4>${p.nombre}</h4><small>${p.detalle}</small><span class="precio">${formatoCOP(p.precio)} COP</span></div>
          <button type="button" class="boton-agregar" data-producto="${p.id}" aria-pressed="${agregado}">${agregado ? '✓ Agregado' : '+ Agregar'}</button>
        </div>`;
      }).join('')}
    </div>`;
}

// --- Paso 5: confirmar ---
function filasResumen() {
  const s = estado.servicio;
  const productos = productosElegidos();
  return `
    <div class="fila-resumen"><span>Servicio</span><span>${s.nombre}<br><small>${s.minutos} min</small></span></div>
    <div class="fila-resumen"><span>Profesional</span><span>${profesionalPorId(estado.profesional).nombre}</span></div>
    <div class="fila-resumen"><span>Fecha</span><span>${fechaLegible(estado.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} · ${horaLegible(estado.hora)}</span></div>
    <div class="fila-resumen"><span>Lugar</span><span>${SALON.direccion}</span></div>
    <div class="fila-resumen"><span>Servicio</span><span>${formatoCOP(s.precio)} COP</span></div>
    <div class="fila-resumen"><span>Productos (${productos.length})</span><span>${productos.length ? productos.map((p) => `${p.nombre} · ${formatoCOP(p.precio)}`).join('<br>') : '—'}</span></div>
    <div class="fila-resumen total"><span>Total</span><span>${formatoCOP(totalReserva())} COP</span></div>`;
}

function vistaConfirmar() {
  return `
    <div class="paso-titulo"><h3>5. Confirma tu reserva</h3><p>Te enviaremos la confirmación por WhatsApp.</p></div>
    <div class="grid-confirmar">
      <form id="form-datos" novalidate>
        <div class="campo"><label for="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" autocomplete="name" placeholder="Ej: María Pérez" maxlength="60"><small class="error"></small></div>
        <div class="campo"><label for="telefono">Celular / WhatsApp</label>
          <input id="telefono" name="telefono" type="tel" autocomplete="tel" placeholder="300 123 4567" maxlength="20"><small class="error"></small></div>
        <div class="campo"><label for="nota">Comentarios (opcional)</label>
          <textarea id="nota" name="nota" rows="3" maxlength="300" placeholder="Alergias, ideas de diseño, referencias…"></textarea></div>
      </form>
      <div class="tarjeta-resumen">
        <h4>Resumen de la reserva</h4>
        ${filasResumen()}
        <p class="nota-deposito">Depósito del 20% para confirmar · Cancelación gratuita hasta 24 h antes.</p>
      </div>
    </div>`;
}

function vistaExito() {
  const r = estado.enviada;
  return `<div class="exito animar-paso">
    <div class="sello">✓</div>
    <h3>¡Reserva enviada, ${escaparHTML(r.nombre.split(' ')[0])}!</h3>
    <p>Te esperamos el <strong>${fechaLegible(r.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}</strong> a las <strong>${horaLegible(r.hora)}</strong>
      para tu <strong>${r.servicio.nombre}</strong>. Te abrimos WhatsApp para confirmar con el salón.</p>
    <button type="button" class="btn" data-accion="nueva">Hacer otra reserva</button>
  </div>`;
}

// --- Pintar todo ---
function pintarReserva() {
  pintarPasos();
  const vistas = [vistaServicio, vistaProfesional, vistaFecha, vistaProductos, vistaConfirmar];
  panel.innerHTML = estado.enviada ? vistaExito() : `<div class="animar-paso">${vistas[estado.paso]()}</div>`;

  // Barra de resumen
  const partes = [];
  if (estado.servicio) partes.push(estado.servicio.nombre);
  if (estado.profesional) partes.push(profesionalPorId(estado.profesional).nombre);
  if (estado.fecha) partes.push(fechaLegible(estado.fecha) + (estado.hora ? ' · ' + horaLegible(estado.hora) : ''));
  if (estado.productos.size) partes.push(`${estado.productos.size} producto${estado.productos.size > 1 ? 's' : ''}`);
  document.getElementById('resumen-lineas').textContent = partes.length ? partes.join(' • ') : 'Aún no has elegido un servicio';
  document.getElementById('resumen-total').textContent = formatoCOP(totalReserva()) + ' COP';

  btnAtras.hidden = estado.paso === 0 || Boolean(estado.enviada);
  btnSiguiente.hidden = Boolean(estado.enviada);
  btnSiguiente.disabled = !pasoValido(estado.paso);
  btnSiguiente.textContent = estado.paso === 4 ? 'Confirmar por WhatsApp'
    : (estado.paso === 3 && !estado.productos.size ? 'Omitir y continuar →' : 'Continuar →');

  // Contador de la bolsa en el menú
  const contador = document.getElementById('contador-bolsa');
  contador.textContent = estado.productos.size;
  contador.hidden = estado.productos.size === 0;
}

function irAPaso(paso, desplazar = true) {
  estado.paso = paso;
  pintarReserva();
  if (desplazar) document.getElementById('reservar').scrollIntoView({ behavior: 'smooth' });
}

// --- Clics dentro del panel ---
panel.addEventListener('click', (evento) => {
  const el = evento.target.closest('button');
  if (!el) return;
  const d = el.dataset;

  if (d.servicio) {
    estado.servicio = buscarServicio(d.servicio);
    if (estado.profesional && estado.profesional !== 'cualquiera' &&
        !profesionalPorId(estado.profesional).categorias.includes(estado.servicio.categoria)) {
      estado.profesional = null;
    }
  } else if (d.profesional) {
    estado.profesional = d.profesional;
    estado.hora = null; // la disponibilidad depende de la profesional
  } else if (d.mes) {
    estado.mesVista = new Date(estado.mesVista.getFullYear(), estado.mesVista.getMonth() + Number(d.mes), 1);
  } else if (d.fecha) {
    estado.fecha = d.fecha;
    estado.hora = null;
  } else if (d.hora) {
    estado.hora = d.hora;
  } else if (d.producto) {
    estado.productos.has(d.producto) ? estado.productos.delete(d.producto) : estado.productos.add(d.producto);
  } else if (d.accion === 'nueva') {
    Object.assign(estado, { paso: 0, servicio: null, profesional: null, fecha: null, hora: null, enviada: null });
    estado.productos.clear();
  } else {
    return;
  }
  pintarReserva();
});

// Al corregir un campo, se quita su mensaje de error
panel.addEventListener('input', (evento) => {
  const campo = evento.target.closest('.campo');
  if (campo && campo.classList.contains('invalido')) marcarError(evento.target, '');
});

listaPasos.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-ir]');
  if (boton && !boton.disabled) irAPaso(Number(boton.dataset.ir));
});

btnAtras.addEventListener('click', () => irAPaso(Math.max(0, estado.paso - 1)));

btnSiguiente.addEventListener('click', () => {
  if (!pasoValido(estado.paso)) return;
  if (estado.paso < 4) irAPaso(estado.paso + 1);
  else confirmarReserva();
});

// --- Elegir un diseño desde el catálogo ---
gridDisenos.addEventListener('click', (evento) => {
  const boton = evento.target.closest('[data-diseno]');
  if (!boton) return;
  const d = DISENOS.find((x) => x.id === boton.dataset.diseno);
  estado.servicio = { id: 'diseno-' + d.id, nombre: 'Manicura ' + d.nombre, precio: d.precio, minutos: 60, categoria: 'unas', foto: d.foto };
  if (estado.profesional && estado.profesional !== 'cualquiera' && !profesionalPorId(estado.profesional).categorias.includes('unas')) {
    estado.profesional = null;
  }
  estado.enviada = null;
  irAPaso(1, false);
});

// --- Confirmar: validar, guardar y abrir WhatsApp ---
function marcarError(campo, texto) {
  const contenedor = campo.closest('.campo');
  contenedor.classList.toggle('invalido', Boolean(texto));
  contenedor.querySelector('.error').textContent = texto;
}

function confirmarReserva() {
  const form = document.getElementById('form-datos');
  const nombre = form.nombre.value.trim();
  const telefono = form.telefono.value.trim();
  const nota = form.nota.value.trim();

  const errorNombre = nombre.length < 3 ? 'Escribe tu nombre completo.' : '';
  const errorTelefono = /^[0-9\s+()-]{7,20}$/.test(telefono) ? '' : 'Escribe un número de celular válido.';
  marcarError(form.nombre, errorNombre);
  marcarError(form.telefono, errorTelefono);
  if (errorNombre || errorTelefono) {
    (errorNombre ? form.nombre : form.telefono).focus();
    return;
  }

  const productos = productosElegidos();
  const reserva = {
    id: Date.now().toString(36),
    creada: new Date().toISOString(),
    nombre, telefono, nota,
    servicio: { nombre: estado.servicio.nombre, precio: estado.servicio.precio, minutos: estado.servicio.minutos, categoria: estado.servicio.categoria },
    profesional: profesionalPorId(estado.profesional).nombre,
    fecha: estado.fecha,
    hora: estado.hora,
    productos: productos.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio })),
    total: totalReserva(),
    estado: 'Pendiente',
  };

  // Se guarda en este navegador para verla en el panel (admin.html)
  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE_RESERVAS) || '[]');
    guardadas.push(reserva);
    localStorage.setItem(CLAVE_RESERVAS, JSON.stringify(guardadas));
  } catch (e) { /* almacenamiento no disponible: la reserva igual se envía por WhatsApp */ }

  const mensaje = [
    `¡Hola ${SALON.nombre}! Quiero confirmar mi reserva:`,
    `• Nombre: ${nombre}`,
    `• Celular: ${telefono}`,
    `• Servicio: ${reserva.servicio.nombre} (${formatoCOP(reserva.servicio.precio)})`,
    `• Profesional: ${reserva.profesional}`,
    `• Fecha: ${fechaLegible(reserva.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${horaLegible(reserva.hora)}`,
    productos.length ? `• Productos: ${productos.map((p) => p.nombre).join(', ')}` : '',
    nota ? `• Comentarios: ${nota}` : '',
    `• Total estimado: ${formatoCOP(reserva.total)} COP`,
  ].filter(Boolean).join('\n');

  window.open(`https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank', 'noopener');
  estado.enviada = reserva;
  estado.paso = 4;
  pintarReserva();
}

pintarReserva();

// ===== PIE DE PÁGINA Y WHATSAPP =====
document.getElementById('anio').textContent = new Date().getFullYear();
document.getElementById('pie-direccion').textContent = SALON.direccion;
document.getElementById('pie-contacto').innerHTML = `
  <li><a href="https://wa.me/${SALON.whatsapp}" target="_blank" rel="noopener">WhatsApp: ${SALON.whatsappVisible}</a></li>
  <li><a href="mailto:${SALON.email}">Email: ${SALON.email}</a></li>
  <li>Instagram: ${SALON.instagram}</li>`;
document.getElementById('whatsapp-flotante').href = `https://wa.me/${SALON.whatsapp}`;
