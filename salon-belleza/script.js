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

// --- Utilidades propias de la reserva (las generales están en datos.js) ---
function profesionalPorId(id) {
  return id === 'cualquiera' ? { nombre: 'Sin preferencia' } : PROFESIONALES.find((p) => p.id === id);
}
function minutosServicio() { return estado.servicio ? estado.servicio.minutos : 60; }
// Profesionales que pueden atender la reserva actual
function candidatas() {
  if (estado.profesional && estado.profesional !== 'cualquiera') return [profesionalPorIdSeguro(estado.profesional)];
  return estado.servicio ? profesionalesPara(estado.servicio.categoria) : PROFESIONALES;
}
// Horas libres del día uniendo la agenda de las candidatas
function libresDelDia(fecha) {
  const horas = new Set(candidatas().flatMap((p) => horariosLibres(p, fecha, minutosServicio())));
  return [...horas].sort((a, b) => horaEnMinutos(a) - horaEnMinutos(b));
}
function textoHorario(p) { return `${diasDeTrabajo(p)} · ${horaLegible(p.horario[0])} – ${horaLegible(p.horario[1])}`; }
function retratoHTML(p, clase = 'retrato') {
  const iniciales = p.nombre.split(' ').map((x) => x[0]).join('');
  return `<span class="${clase}" style="background:linear-gradient(145deg, ${p.tono[0]}, ${p.tono[1]})">${iniciales}</span>`;
}

// Línea de tiempo del día: franjas ocupadas, libres y la cita elegida
function lineaTiempoHTML(profesional, fecha, minutos, horaElegida) {
  const [entrada, salida] = profesional.horario.map(horaEnMinutos);
  const total = salida - entrada;
  const pos = (m) => ((m - entrada) / total) * 100;
  const ocupados = bloquesOcupados(profesional, fecha)
    .map(([a, b]) => `<span class="franja ocupada" style="left:${pos(a)}%;width:${pos(b) - pos(a)}%" title="Ocupado ${horaLegible(minutosAHora(a))} – ${horaLegible(minutosAHora(b))}"></span>`).join('');
  let elegida = '';
  if (horaElegida) {
    const a = horaEnMinutos(horaElegida);
    elegida = `<span class="franja elegida" style="left:${pos(a)}%;width:${pos(a + minutos) - pos(a)}%"></span>`;
  }
  const marcas = [];
  for (let m = Math.ceil(entrada / 60) * 60; m <= salida; m += 120) {
    marcas.push(`<span style="left:${pos(m)}%">${horaLegible(minutosAHora(m)).replace(':00', '')}</span>`);
  }
  return `<div class="linea-tiempo" aria-hidden="true">
      <div class="pista-tiempo">${ocupados}${elegida}</div>
      <div class="marcas-tiempo">${marcas.join('')}</div>
    </div>
    <p class="leyenda-tiempo"><span class="muestra libre"></span>Libre <span class="muestra ocupada"></span>Ocupado ${horaElegida ? '<span class="muestra elegida"></span>Tu cita' : ''}</p>`;
}

function productosElegidos() { return PRODUCTOS.filter((p) => estado.productos.has(p.id)); }
function totalReserva() {
  return (estado.servicio ? estado.servicio.precio : 0) + productosElegidos().reduce((s, p) => s + p.precio, 0);
}
function pasoValido(paso) {
  return [
    Boolean(estado.servicio),
    Boolean(estado.profesional) && (estado.profesional === 'cualquiera' || !estado.servicio ||
      profesionalPorIdSeguro(estado.profesional).categorias.includes(estado.servicio.categoria)),
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
  const lista = categoria ? profesionalesPara(categoria) : PROFESIONALES;
  const tarjeta = (p) => {
    const elegida = estado.profesional === p.id;
    const estrellas = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
    const cupo = proximoCupo(p, minutosServicio());
    return `<button type="button" class="tarjeta-profesional" data-profesional="${p.id}" aria-pressed="${elegida}">
      ${elegida ? '<span class="etiqueta-estado">✓ Tu elección</span>' : ''}
      ${retratoHTML(p)}
      <span>
        <h4>${p.nombre}</h4>
        <span class="especialidad">${p.rol} · ${p.especialidad}</span>
        <span class="calificacion"><b>${estrellas}</b> ${p.rating} (${p.resenas} reseñas)</span>
        <span class="horario-pro">🗓 ${textoHorario(p)}</span>
        <span class="proximo-cupo">${cupo ? `Próximo cupo: <b>${cuandoTexto(cupo.fecha, cupo.enDias)}, ${horaLegible(cupo.hora)}</b>` : 'Sin cupos en 2 semanas'}</span>
      </span>
    </button>`;
  };
  return `
    <div class="paso-titulo"><h3>2. Elige tu profesional</h3>
      <p>${estado.servicio ? `Especialistas en ${escaparHTML(estado.servicio.nombre)} · duración ${duracionTexto(minutosServicio())}` : 'Todas nuestras especialistas están certificadas.'}</p></div>
    <div class="grid-profesionales">
      ${lista.map(tarjeta).join('')}
      <button type="button" class="tarjeta-profesional" data-profesional="cualquiera" aria-pressed="${estado.profesional === 'cualquiera'}">
        ${estado.profesional === 'cualquiera' ? '<span class="etiqueta-estado">✓ Tu elección</span>' : ''}
        <span class="retrato" style="background:linear-gradient(145deg, #f3e6df, #d9b7ad)">✦</span>
        <span><h4>Sin preferencia</h4><span class="especialidad">Te asignamos a quien tenga el primer cupo</span></span>
      </button>
    </div>`;
}

// --- Paso 3: fecha y hora (según la agenda de la profesional y la duración del servicio) ---
function vistaFecha() {
  const hoy = new Date();
  const hoyTexto = aTextoFecha(hoy);
  const mes = estado.mesVista;
  const textoMes = mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const nombreMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);
  const esMesActual = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const huecos = (mes.getDay() + 6) % 7; // la semana empieza en lunes
  const minutos = minutosServicio();
  const unica = estado.profesional && estado.profesional !== 'cualquiera' ? profesionalPorIdSeguro(estado.profesional) : null;

  let dias = '<span></span>'.repeat(huecos);
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(mes.getFullYear(), mes.getMonth(), d);
    const texto = aTextoFecha(fecha);
    let motivo = '';
    if (texto < hoyTexto) motivo = 'ya pasó';
    else if (fecha.getDay() === 0) motivo = 'salón cerrado';
    else if (unica && !trabajaEseDia(unica, texto)) motivo = `${unica.nombre.split(' ')[0]} no trabaja`;
    else if (!libresDelDia(texto).length) motivo = 'sin cupos';
    dias += `<button type="button" class="dia ${texto === hoyTexto ? 'hoy' : ''} ${motivo ? '' : 'con-cupos'}" data-fecha="${texto}"
      aria-pressed="${estado.fecha === texto}" ${motivo ? 'disabled' : ''} title="${motivo || 'Con cupos'}"
      aria-label="${fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}${motivo ? ' (' + motivo + ')' : ''}">${d}</button>`;
  }

  let horarios = '<p class="sin-fecha">Elige un día con punto en el calendario: esos tienen cupos.</p>';
  if (estado.fecha) {
    const libres = libresDelDia(estado.fecha);
    horarios = libres.length
      ? `<div class="grid-horas">${libres.map((h) => `
          <button type="button" class="hora" data-hora="${h}" aria-pressed="${estado.hora === h}">
            ${horaLegible(h)}<small>hasta ${horaLegible(minutosAHora(horaEnMinutos(h) + minutos))}</small>
          </button>`).join('')}</div>`
      : '<p class="sin-fecha">No quedan cupos este día. Prueba con otro.</p>';
    if (unica) horarios = lineaTiempoHTML(unica, estado.fecha, minutos, estado.hora) + horarios;
  }

  const agenda = unica
    ? `${retratoHTML(unica, 'retrato-mini')}<div><strong>Agenda de ${unica.nombre}</strong><small>${textoHorario(unica)}</small></div>`
    : `<span class="retrato-mini" style="background:linear-gradient(145deg,#f3e6df,#d9b7ad)">✦</span><div><strong>Agenda de todo el equipo</strong><small>Te asignamos a quien esté libre</small></div>`;

  return `
    <div class="paso-titulo"><h3>3. Fecha y hora</h3><p>Tu servicio dura <b>${duracionTexto(minutos)}</b>. Solo te mostramos horarios en los que alcanza a terminar.</p></div>
    <div class="agenda-elegida">${agenda}</div>
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
      para tu <strong>${r.servicio.nombre}</strong> con <strong>${escaparHTML(r.profesional)}</strong>.
      Dura ${duracionTexto(r.servicio.minutos)}: terminas hacia las ${horaLegible(minutosAHora(horaEnMinutos(r.hora) + r.servicio.minutos))}.
      Te abrimos WhatsApp para confirmar con el salón.</p>
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
    estado.hora = null; // la duración cambió
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
  estado.hora = null;
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

  // Con "Sin preferencia" se asigna la primera profesional libre a esa hora
  const atiende = candidatas().find((p) => horariosLibres(p, estado.fecha, minutosServicio()).includes(estado.hora));
  if (!atiende) {
    alert('Ese horario se acaba de ocupar. Elige otro, por favor.');
    estado.hora = null;
    irAPaso(2);
    return;
  }

  const productos = productosElegidos();
  const reserva = {
    id: Date.now().toString(36),
    creada: new Date().toISOString(),
    nombre, telefono, nota,
    servicio: { nombre: estado.servicio.nombre, precio: estado.servicio.precio, minutos: estado.servicio.minutos, categoria: estado.servicio.categoria },
    profesional: atiende.nombre,
    profesionalId: atiende.id,
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

// ======================================================
// ===== EQUIPO Y AGENDA DE CADA PROFESIONAL ============
// ======================================================
const FILTROS_EQUIPO = [{ id: 'todos', nombre: 'Todos' }, ...CATEGORIAS.map((c) => ({ id: c.id, nombre: c.nombre }))];
let filtroEquipo = 'todos';
const agenda = { profesional: null, servicioId: null, fecha: null, hora: null };
const dialogoAgenda = document.getElementById('agenda');
const contenidoAgenda = document.getElementById('agenda-contenido');

function semanaMiniHTML(p) {
  return `<span class="semana-mini" aria-label="Trabaja ${diasDeTrabajo(p)}">${[1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<span class="${p.dias.includes(d) ? 'trabaja' : ''}">${NOMBRES_DIAS[d][0].toUpperCase()}</span>`).join('')}</span>`;
}

function pintarEquipo() {
  document.getElementById('filtros-equipo').innerHTML = FILTROS_EQUIPO.map((f) =>
    `<button class="chip" role="tab" aria-selected="${f.id === filtroEquipo}" data-filtro-equipo="${f.id}">${f.nombre}</button>`).join('');

  const lista = filtroEquipo === 'todos' ? PROFESIONALES : profesionalesPara(filtroEquipo);
  document.getElementById('grid-equipo').innerHTML = lista.map((p, i) => {
    const servicios = serviciosDe(p);
    const masCorto = Math.min(...servicios.map((s) => s.minutos));
    const cupo = proximoCupo(p, masCorto);
    return `<article class="tarjeta-equipo" style="animation-delay:${i * 50}ms">
      ${retratoHTML(p, 'retrato retrato-grande')}
      <h3>${p.nombre}</h3>
      <p class="rol">${p.rol} · ${p.especialidad}</p>
      <span class="calificacion"><b>★</b> ${p.rating} · ${p.resenas} reseñas</span>
      ${semanaMiniHTML(p)}
      <p class="horario-pro">${horaLegible(p.horario[0])} – ${horaLegible(p.horario[1])}</p>
      <p class="proximo-cupo">${cupo ? `Próximo cupo: <b>${cuandoTexto(cupo.fecha, cupo.enDias)}, ${horaLegible(cupo.hora)}</b>` : 'Sin cupos en 2 semanas'}</p>
      <ul class="duraciones">
        ${servicios.slice(0, 3).map((s) => `<li><span>${s.nombre}</span><b>${duracionTexto(s.minutos)}</b></li>`).join('')}
      </ul>
      <button type="button" class="btn btn-pequeno" data-agenda="${p.id}">Ver agenda y reservar</button>
    </article>`;
  }).join('');
}

function proximosDias(cantidad = 10) {
  const hoy = new Date();
  return Array.from({ length: cantidad }, (_, i) => aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)));
}

function abrirAgenda(id) {
  const p = profesionalPorIdSeguro(id);
  agenda.profesional = p;
  // Si ya eligió un servicio que esta profesional hace, se respeta
  const servicios = serviciosDe(p);
  agenda.servicioId = estado.servicio && servicios.some((s) => s.id === estado.servicio.id) ? estado.servicio.id : servicios[0].id;
  agenda.fecha = proximosDias(14).find((f) => horariosLibres(p, f, buscarServicio(agenda.servicioId).minutos).length) || null;
  agenda.hora = null;
  pintarAgenda();
  dialogoAgenda.showModal();
}

function pintarAgenda() {
  const p = agenda.profesional;
  const servicio = buscarServicio(agenda.servicioId);
  const hoyTexto = aTextoFecha(new Date());

  const dias = proximosDias().map((f) => {
    const libres = horariosLibres(p, f, servicio.minutos);
    const fecha = deTextoFecha(f);
    const estadoDia = !trabajaEseDia(p, f) ? 'Descansa' : (libres.length ? `${libres.length} cupos` : 'Lleno');
    return `<button type="button" class="dia-agenda" data-agenda-fecha="${f}" aria-pressed="${agenda.fecha === f}" ${libres.length ? '' : 'disabled'}>
      <small>${f === hoyTexto ? 'Hoy' : fecha.toLocaleDateString('es-CO', { weekday: 'short' })}</small>
      <strong>${fecha.getDate()}</strong>
      <em>${estadoDia}</em>
    </button>`;
  }).join('');

  let horas = '<p class="sin-fecha">Elige un día con cupos.</p>';
  if (agenda.fecha) {
    const libres = horariosLibres(p, agenda.fecha, servicio.minutos);
    horas = lineaTiempoHTML(p, agenda.fecha, servicio.minutos, agenda.hora) + `<div class="grid-horas">${libres.map((h) => `
      <button type="button" class="hora" data-agenda-hora="${h}" aria-pressed="${agenda.hora === h}">
        ${horaLegible(h)}<small>hasta ${horaLegible(minutosAHora(horaEnMinutos(h) + servicio.minutos))}</small>
      </button>`).join('')}</div>`;
  }

  const resumen = agenda.hora
    ? `<strong>${servicio.nombre} · ${fechaLegible(agenda.fecha, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
       <small>${horaLegible(agenda.hora)} – ${horaLegible(minutosAHora(horaEnMinutos(agenda.hora) + servicio.minutos))} · ${duracionTexto(servicio.minutos)} · ${formatoCOP(servicio.precio)} COP</small>`
    : `<strong>${servicio.nombre}</strong><small>Dura ${duracionTexto(servicio.minutos)} · elige día y hora</small>`;

  contenidoAgenda.innerHTML = `
    <header class="agenda-cabecera">
      ${retratoHTML(p)}
      <div>
        <h3 id="agenda-titulo">Agenda de ${p.nombre}</h3>
        <p>${p.rol} · ${p.especialidad}</p>
        <p class="horario-pro">🗓 ${textoHorario(p)}</p>
      </div>
      <button type="button" class="cerrar-agenda" data-cerrar aria-label="Cerrar">✕</button>
    </header>
    <div class="agenda-cuerpo">
      <h4>1. ¿Qué servicio quieres?</h4>
      <div class="servicios-agenda">
        ${serviciosDe(p).map((s) => `<button type="button" class="opcion" data-agenda-servicio="${s.id}" aria-pressed="${s.id === agenda.servicioId}">
          <strong>${s.nombre}</strong><span class="precio">${duracionTexto(s.minutos)}<em>${formatoCOP(s.precio)}</em></span>
        </button>`).join('')}
      </div>
      <h4>2. Elige el día</h4>
      <div class="dias-agenda">${dias}</div>
      <h4>3. Elige la hora ${agenda.fecha ? `<small>· ${fechaLegible(agenda.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}</small>` : ''}</h4>
      ${horas}
    </div>
    <footer class="agenda-pie">
      <div>${resumen}</div>
      <button type="button" class="btn" data-agenda-reservar ${agenda.hora ? '' : 'disabled'}>Reservar este horario →</button>
    </footer>`;
}

document.getElementById('filtros-equipo').addEventListener('click', (e) => {
  const chip = e.target.closest('[data-filtro-equipo]');
  if (!chip) return;
  filtroEquipo = chip.dataset.filtroEquipo;
  pintarEquipo();
});
document.getElementById('grid-equipo').addEventListener('click', (e) => {
  const boton = e.target.closest('[data-agenda]');
  if (boton) abrirAgenda(boton.dataset.agenda);
});

dialogoAgenda.addEventListener('click', (e) => {
  if (e.target === dialogoAgenda) { dialogoAgenda.close(); return; } // clic fuera de la ventana
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if ('cerrar' in d) { dialogoAgenda.close(); return; }
  if (d.agendaServicio) {
    agenda.servicioId = d.agendaServicio;
    agenda.hora = null;
    const minutos = buscarServicio(agenda.servicioId).minutos;
    if (agenda.fecha && !horariosLibres(agenda.profesional, agenda.fecha, minutos).length) {
      agenda.fecha = proximosDias(14).find((f) => horariosLibres(agenda.profesional, f, minutos).length) || null;
    }
  } else if (d.agendaFecha) {
    agenda.fecha = d.agendaFecha; agenda.hora = null;
  } else if (d.agendaHora) {
    agenda.hora = d.agendaHora;
  } else if ('agendaReservar' in d) {
    // Pasa todo a la reserva y salta a "Productos"
    Object.assign(estado, {
      servicio: buscarServicio(agenda.servicioId), profesional: agenda.profesional.id,
      fecha: agenda.fecha, hora: agenda.hora, enviada: null, mesVista: primerDiaDelMes(deTextoFecha(agenda.fecha)),
    });
    dialogoAgenda.close();
    irAPaso(3);
    return;
  } else {
    return;
  }
  pintarAgenda();
});

pintarEquipo();
