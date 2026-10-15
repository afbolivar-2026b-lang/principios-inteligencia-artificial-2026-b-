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

// Respeta la preferencia "reducir movimiento" del celular
const SIN_ANIMACION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const desplazarA = (id) => document.getElementById(id).scrollIntoView({ behavior: SIN_ANIMACION ? 'auto' : 'smooth' });

// De dónde viene la clienta (?origen=instagram o ?utm_source=google) para el reporte de origen
const ORIGEN = (() => {
  const p = new URLSearchParams(location.search);
  const o = (p.get('origen') || p.get('utm_source') || 'web').toLowerCase();
  return ['web', 'instagram', 'google', 'whatsapp', 'referido'].includes(o) ? o : 'web';
})();

// ===== SERVICIOS =====
function pintarServicios() {
  document.getElementById('grid-servicios').innerHTML = CATEGORIAS.map((categoria) => `
    <article class="tarjeta-servicio">
      ${iconoSVG(categoria.id)}
      <h3>${categoria.nombre}</h3>
      <ul class="lista-servicios">
        ${categoria.servicios.map((s) => `
          <li>
            <div class="fila"><strong>${escaparHTML(s.nombre)}</strong>
              <span class="precio">${s.precioAntes ? `<s>${formatoCOP(s.precioAntes)}</s> ` : ''}${formatoCOP(s.precio)}</span></div>
            <small>${escaparHTML(s.detalle)}${s.ajustesLargo ? ' · varía según el largo' : ''}</small>
          </li>`).join('')}
      </ul>
      <span class="duracion">Duración: ${escaparHTML(categoria.duracion)}</span>
    </article>`).join('');
}

// ===== CATÁLOGO DE DISEÑOS CON FILTROS =====
const contenedorFiltros = document.getElementById('filtros');
const gridDisenos = document.getElementById('grid-disenos');
let filtroActual = 'Todos';

function pintarDisenos() {
  const categoriasDiseno = ['Todos', ...new Set(DISENOS.map((d) => d.categoria))];
  contenedorFiltros.innerHTML = categoriasDiseno.map((cat) => {
    const total = cat === 'Todos' ? DISENOS.length : DISENOS.filter((d) => d.categoria === cat).length;
    return `<button class="chip" role="tab" aria-selected="${cat === filtroActual}" data-filtro="${escaparHTML(cat)}">
      ${escaparHTML(cat)} <span>· ${total}</span></button>`;
  }).join('');
  const lista = filtroActual === 'Todos' ? DISENOS : DISENOS.filter((d) => d.categoria === filtroActual);
  gridDisenos.innerHTML = lista.map((d, i) => `
    <article class="tarjeta-diseno" style="animation-delay:${i * 50}ms">
      <div class="foto"><img src="${escaparHTML(d.foto)}" alt="Uñas ${escaparHTML(d.nombre)}" loading="lazy" width="264" height="198"></div>
      <h3>${escaparHTML(d.nombre)}</h3>
      <p>${escaparHTML(d.detalle)}</p>
      <span class="precio">${formatoCOP(d.precio)} COP</span>
      <span class="meta">${escaparHTML(d.categoria)} · 20–25 días</span>
      <a href="#reservar" class="btn btn-pequeno btn-borde" data-diseno="${escaparHTML(d.id)}">Elegir diseño</a>
    </article>`).join('');
}

contenedorFiltros.addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-filtro]');
  if (!chip) return;
  filtroActual = chip.dataset.filtro;
  pintarDisenos();
});

// ======================================================
// ===== RESERVA POR PASOS ==============================
// ======================================================
const PASOS = ['Servicio', 'Profesional', 'Fecha y hora', 'Productos', 'Confirmar'];
const MAX_SERVICIOS = 4;
const LARGOS = [['corto', 'Corto', 'Arriba de los hombros'], ['medio', 'Medio', 'Hasta media espalda'], ['largo', 'Largo', 'Más abajo de media espalda']];

const estado = {
  paso: 0,
  servicios: [],        // ids: "corte", "diseno:chrome-rosa"…
  largo: null,          // largo del cabello si hay un servicio de cabello
  profesional: null,    // id o 'cualquiera'
  fecha: null,          // 'AAAA-MM-DD'
  hora: null,           // 'H:MM'
  productos: new Set(),
  mesVista: primerDiaDelMes(deTextoFecha(ahoraColombia().fecha)),
  enviada: null,        // respuesta de la base de datos al confirmar
  enviando: false,
  error: '',
  sinConexion: false,
  espera: { abierta: false, enviada: false, error: '' },
};

const panel = document.getElementById('paso-contenido');
const listaPasos = document.getElementById('pasos');
const btnAtras = document.getElementById('btn-atras');
const btnSiguiente = document.getElementById('btn-siguiente');

// --- Cálculos de la reserva actual ---
const itemsElegidos = () => estado.servicios.map(servicioPorId).filter(Boolean);
const calculo = () => calcularServicios(itemsElegidos(), estado.largo);
const tieneCabello = () => itemsElegidos().some((s) => s.categoria === 'cabello');
function profesionalPorId(id) {
  return id === 'cualquiera' ? { nombre: 'Sin preferencia' } : (profesionalPorIdSeguro(id) || { nombre: '—' });
}
function candidatas() {
  const todas = profesionalesParaTodas(calculo().categorias);
  if (estado.profesional && estado.profesional !== 'cualquiera') return todas.filter((p) => p.id === estado.profesional);
  return todas;
}
function libresDelDia(fecha) {
  const minutos = calculo().minutos;
  const horas = new Set(candidatas().flatMap((p) => horariosLibres(p, fecha, minutos)));
  return [...horas].sort((a, b) => horaEnMinutos(a) - horaEnMinutos(b));
}
function productosElegidos() { return PRODUCTOS.filter((p) => estado.productos.has(p.id)); }
function totalReserva() { return calculo().precio + productosElegidos().reduce((s, p) => s + p.precio, 0); }
function textoHorario(p) { return `${diasDeTrabajo(p)} · ${horaLegible(p.horario[0])} – ${horaLegible(p.horario[1])}`; }
function retratoHTML(p, clase = 'retrato') {
  const iniciales = p.nombre.split(' ').map((x) => x[0]).join('');
  return `<span class="${clase}" style="background:linear-gradient(145deg, ${p.tono[0]}, ${p.tono[1]})">${escaparHTML(iniciales)}</span>`;
}
const finDeCita = (hora, minutos) => horaLegible(minutosAHora(horaEnMinutos(hora) + minutos));

function pasoValido(paso) {
  const items = itemsElegidos();
  return [
    items.length > 0 && (!tieneCabello() || Boolean(estado.largo)),
    Boolean(estado.profesional) && candidatas().length > 0,
    Boolean(estado.fecha && estado.hora),
    true,
    !estado.enviando,
  ][paso];
}

// Línea de tiempo del día: franjas ocupadas, libres y la cita elegida
function lineaTiempoHTML(profesional, fecha, minutos, horaElegida) {
  const [entrada, salida] = profesional.horario.map(horaEnMinutos);
  const total = salida - entrada;
  const pos = (m) => Math.max(0, Math.min(100, ((m - entrada) / total) * 100));
  const ocupados = bloquesOcupados(profesional, fecha)
    .map(([a, b]) => `<span class="franja ocupada" style="left:${pos(a)}%;width:${pos(b) - pos(a)}%"></span>`).join('');
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

// --- Paso 1: servicios (se pueden combinar) ---
function vistaServicio() {
  const items = itemsElegidos();
  const c = calculo();
  const ultima = leerLocal(CLAVE_ULTIMA, null);
  const ultimaItems = ultima ? ultima.servicios.map(servicioPorId).filter(Boolean) : [];
  const repetir = ultimaItems.length && JSON.stringify(ultima.servicios) !== JSON.stringify(estado.servicios)
    ? `<button type="button" class="repetir" data-accion="repetir">↺ Repetir mi última cita: <b>${ultimaItems.map((s) => escaparHTML(s.nombre)).join(' + ')}</b>${ultima.profesionalNombre ? ' con ' + escaparHTML(ultima.profesionalNombre) : ''}</button>`
    : '';
  const disenos = items.filter((s) => s.foto).map((s) => `
    <div class="diseno-elegido">
      <div class="miniatura"><img src="${escaparHTML(s.foto)}" alt=""></div>
      <div><small>Diseño elegido del catálogo</small><h4>${escaparHTML(s.nombre)}</h4><small>${formatoCOP(s.precio)} COP · ${s.minutos} min</small></div>
      <button type="button" class="quitar" data-quitar="${escaparHTML(s.id)}" aria-label="Quitar ${escaparHTML(s.nombre)}">✕</button>
    </div>`).join('');
  const largo = tieneCabello() ? `
    <div class="selector-largo" role="group" aria-label="Largo del cabello">
      <h4>¿Qué tan largo tienes el cabello?</h4>
      <p>El precio y el tiempo del servicio de cabello dependen del largo.</p>
      <div class="opciones-largo">
        ${LARGOS.map(([id, nombre, ayuda]) => {
          const extra = items.filter((s) => s.categoria === 'cabello').reduce((t, s) => t + (precioConLargo(s, id) - s.precio), 0);
          return `<button type="button" class="opcion-largo" data-largo="${id}" aria-pressed="${estado.largo === id}">
            <strong>${nombre}</strong><small>${ayuda}</small><em>${extra ? '+ ' + formatoCOP(extra) : 'Precio base'}</em></button>`;
        }).join('')}
      </div>
    </div>` : '';
  return `
    <div class="paso-titulo"><h3>1. Elige tus servicios</h3><p>Puedes combinar hasta ${MAX_SERVICIOS} servicios en la misma cita.</p></div>
    ${repetir}
    ${disenos}
    <div class="grid-opciones-servicio">
      ${CATEGORIAS.map((cat) => `
        <div class="grupo-servicio">
          <h4>${iconoSVG(cat.id, '')}${escaparHTML(cat.nombre)}</h4>
          ${cat.servicios.map((sv) => {
            const elegido = estado.servicios.includes(sv.id);
            return `<button type="button" class="opcion" data-servicio="${sv.id}" aria-pressed="${elegido}">
              <strong>${elegido ? '✓ ' : ''}${escaparHTML(sv.nombre)}</strong>
              <span class="precio">${sv.precioAntes ? `<s>${formatoCOP(sv.precioAntes)}</s> ` : ''}${formatoCOP(sv.precio)}<em>${duracionTexto(sv.minutos)}${sv.ajustesLargo ? '+' : ''}</em></span>
              <small>${escaparHTML(sv.detalle)}</small>
            </button>`;
          }).join('')}
        </div>`).join('')}
    </div>
    ${largo}
    ${items.length ? `<p class="resumen-seleccion">${items.length} servicio${items.length > 1 ? 's' : ''} · ${duracionTexto(c.minutos)} · ${formatoCOP(c.precio)} COP</p>` : ''}`;
}

// --- Paso 2: profesional ---
function vistaProfesional() {
  const c = calculo();
  const lista = profesionalesParaTodas(c.categorias);
  if (!lista.length) {
    return `<div class="paso-titulo"><h3>2. Elige tu profesional</h3></div>
      <p class="aviso-paso">Ninguna profesional hace todos esos servicios en la misma cita. Vuelve al paso 1 y resérvalos por separado, o quita uno.</p>`;
  }
  const tarjeta = (p) => {
    const elegida = estado.profesional === p.id;
    const estrellas = '★'.repeat(Math.round(p.rating)) + '☆'.repeat(5 - Math.round(p.rating));
    const cupo = ESTADO_CONEXION.cargado ? proximoCupo(p, c.minutos) : undefined;
    return `<button type="button" class="tarjeta-profesional" data-profesional="${p.id}" aria-pressed="${elegida}">
      ${elegida ? '<span class="etiqueta-estado">✓ Tu elección</span>' : ''}
      ${retratoHTML(p)}
      <span>
        <h4>${escaparHTML(p.nombre)}</h4>
        <span class="especialidad">${escaparHTML(p.rol)} · ${escaparHTML(p.especialidad)}</span>
        <span class="calificacion"><b>${estrellas}</b> ${p.rating} (${p.resenas} reseñas)</span>
        <span class="horario-pro">🗓 ${textoHorario(p)}</span>
        <span class="proximo-cupo">${cupo === undefined ? 'Consultando agenda…' : cupo ? `Próximo cupo: <b>${cuandoTexto(cupo.fecha, cupo.enDias)}, ${horaLegible(cupo.hora)}</b>` : 'Sin cupos en 2 semanas'}</span>
      </span>
    </button>`;
  };
  return `
    <div class="paso-titulo"><h3>2. Elige tu profesional</h3>
      <p>Tu cita dura ${duracionTexto(c.minutos)} · ${lista.length} especialista${lista.length > 1 ? 's' : ''} disponible${lista.length > 1 ? 's' : ''}</p></div>
    <div class="grid-profesionales">
      ${lista.map(tarjeta).join('')}
      <button type="button" class="tarjeta-profesional" data-profesional="cualquiera" aria-pressed="${estado.profesional === 'cualquiera'}">
        ${estado.profesional === 'cualquiera' ? '<span class="etiqueta-estado">✓ Tu elección</span>' : ''}
        <span class="retrato" style="background:linear-gradient(145deg, #f3e6df, #d9b7ad)">✦</span>
        <span><h4>Sin preferencia</h4><span class="especialidad">Te asignamos a quien tenga el primer cupo</span></span>
      </button>
    </div>`;
}

// --- Paso 3: fecha y hora ---
function primerCupoGeneral() {
  const hoy = deTextoFecha(ahoraColombia().fecha);
  for (let i = 0; i < 60; i++) {
    const f = aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i));
    const libres = libresDelDia(f);
    if (libres.length) return { fecha: f, hora: libres[0] };
  }
  return null;
}

function vistaEspera() {
  const e = estado.espera;
  if (e.enviada) return '<p class="ok-espera">✓ Quedaste en la lista de espera. Si se libera un cupo ese día te escribimos por WhatsApp.</p>';
  if (!e.abierta) return `<button type="button" class="enlace-boton" data-accion="espera">¿No encuentras horario? Únete a la lista de espera</button>`;
  const datos = leerLocal(CLAVE_MIS_DATOS, {});
  return `<form class="form-espera" id="form-espera" novalidate>
      <p>Te avisamos si se libera un cupo el <b>${estado.fecha ? fechaLegible(estado.fecha, { weekday: 'long', day: 'numeric', month: 'long' }) : 'día que elijas'}</b>.</p>
      <div class="fila-espera">
        <input id="espera-nombre" placeholder="Tu nombre" maxlength="60" autocomplete="name" value="${escaparHTML(datos.nombre || '')}" aria-label="Nombre">
        <input id="espera-telefono" type="tel" placeholder="Celular" maxlength="20" autocomplete="tel" value="${escaparHTML(datos.telefono || '')}" aria-label="Celular">
        <button type="submit" class="btn btn-pequeno" ${estado.fecha ? '' : 'disabled'}>Avisarme</button>
      </div>
      ${e.error ? `<p class="error-general">${escaparHTML(e.error)}</p>` : ''}
    </form>`;
}

function vistaFecha() {
  const hoyTexto = ahoraColombia().fecha;
  const mes = estado.mesVista;
  const textoMes = mes.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
  const nombreMes = textoMes.charAt(0).toUpperCase() + textoMes.slice(1);
  const hoyD = deTextoFecha(hoyTexto);
  const esMesActual = mes.getFullYear() === hoyD.getFullYear() && mes.getMonth() === hoyD.getMonth();
  const diasEnMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const huecos = (mes.getDay() + 6) % 7;
  const minutos = calculo().minutos;
  const unica = estado.profesional && estado.profesional !== 'cualquiera' ? profesionalPorIdSeguro(estado.profesional) : null;

  if (!ESTADO_CONEXION.cargado) {
    return `<div class="paso-titulo"><h3>3. Fecha y hora</h3></div><p class="cargando">Consultando la agenda en línea…</p>`;
  }

  let dias = '<span></span>'.repeat(huecos);
  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = new Date(mes.getFullYear(), mes.getMonth(), d);
    const texto = aTextoFecha(fecha);
    let motivo = '';
    if (texto < hoyTexto) motivo = 'ya pasó';
    else if (fecha.getDay() === 0) motivo = 'salón cerrado';
    else if (FESTIVOS.has(texto)) motivo = 'festivo';
    else if (unica && !trabajaEseDia(unica, texto)) motivo = `${unica.nombre.split(' ')[0]} no trabaja`;
    else if (!libresDelDia(texto).length) motivo = 'sin cupos';
    dias += `<button type="button" class="dia ${texto === hoyTexto ? 'hoy' : ''} ${motivo ? '' : 'con-cupos'} ${motivo === 'festivo' ? 'festivo' : ''}" data-fecha="${texto}"
      aria-pressed="${estado.fecha === texto}" ${motivo ? 'disabled' : ''} title="${motivo || 'Con cupos'}"
      aria-label="${fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}${motivo ? ' (' + motivo + ')' : ''}">${d}</button>`;
  }

  let horarios = '<p class="sin-fecha">Elige un día con punto en el calendario: esos tienen cupos.</p>';
  if (estado.fecha) {
    const libres = libresDelDia(estado.fecha);
    horarios = libres.length
      ? `<div class="grid-horas">${libres.map((h) => `
          <button type="button" class="hora" data-hora="${h}" aria-pressed="${estado.hora === h}">
            ${horaLegible(h)}<small>hasta ${finDeCita(h, minutos)}</small>
          </button>`).join('')}</div>`
      : '<p class="sin-fecha">No quedan cupos este día. Prueba con otro o únete a la lista de espera.</p>';
    if (unica) horarios = lineaTiempoHTML(unica, estado.fecha, minutos, estado.hora) + horarios;
  }

  const agenda = unica
    ? `${retratoHTML(unica, 'retrato-mini')}<div><strong>Agenda de ${escaparHTML(unica.nombre)}</strong><small>${textoHorario(unica)}</small></div>`
    : `<span class="retrato-mini" style="background:linear-gradient(145deg,#f3e6df,#d9b7ad)">✦</span><div><strong>Agenda de todo el equipo</strong><small>Te asignamos a quien esté libre</small></div>`;

  return `
    <div class="paso-titulo"><h3>3. Fecha y hora</h3><p>Tu cita dura <b>${duracionTexto(minutos)}</b>. Solo te mostramos horarios en los que alcanza a terminar.</p></div>
    ${ESTADO_CONEXION.conectado ? '' : '<p class="aviso-paso">No pudimos conectar con la agenda en línea. Puedes elegir un horario y enviarnos la solicitud por WhatsApp.</p>'}
    ${estado.error ? `<p class="error-general" role="alert">${escaparHTML(estado.error)}</p>` : ''}
    <div class="agenda-elegida">${agenda}
      <button type="button" class="btn btn-pequeno btn-borde primer-cupo" data-accion="primer-cupo">⚡ Primer horario disponible</button>
    </div>
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
        ${vistaEspera()}
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
        const agotado = p.stock !== undefined && p.stock <= 0;
        return `<div class="tarjeta-producto ${agregado ? 'agregado' : ''}">
          <div class="foto-producto"><img src="${escaparHTML(p.foto)}" alt="${escaparHTML(p.nombre)}" loading="lazy"></div>
          <div class="info"><h4>${escaparHTML(p.nombre)}</h4><small>${escaparHTML(p.detalle)}</small><span class="precio">${formatoCOP(p.precio)} COP</span></div>
          <button type="button" class="boton-agregar" data-producto="${p.id}" aria-pressed="${agregado}" ${agotado && !agregado ? 'disabled' : ''}>${agotado ? 'Agotado' : agregado ? '✓ Agregado' : '+ Agregar'}</button>
        </div>`;
      }).join('')}
    </div>`;
}

// --- Paso 5: confirmar ---
function filasResumen() {
  const items = itemsElegidos();
  const c = calculo();
  const productos = productosElegidos();
  const largo = estado.largo && tieneCabello() ? LARGOS.find((l) => l[0] === estado.largo)[1].toLowerCase() : '';
  return `
    <div class="fila-resumen"><span>Servicios</span><span>${items.map((s) => `${escaparHTML(s.nombre)} · ${formatoCOP(precioConLargo(s, estado.largo))}`).join('<br>')}${largo ? `<br><small>Cabello ${largo}</small>` : ''}</span></div>
    <div class="fila-resumen"><span>Profesional</span><span>${escaparHTML(profesionalPorId(estado.profesional).nombre)}</span></div>
    <div class="fila-resumen"><span>Fecha</span><span>${fechaLegible(estado.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}<br>${horaLegible(estado.hora)} – ${finDeCita(estado.hora, c.minutos)} (${duracionTexto(c.minutos)})</span></div>
    <div class="fila-resumen"><span>Lugar</span><span>${escaparHTML(SALON.direccion)}</span></div>
    <div class="fila-resumen"><span>Productos (${productos.length})</span><span>${productos.length ? productos.map((p) => `${escaparHTML(p.nombre)} · ${formatoCOP(p.precio)}`).join('<br>') : '—'}</span></div>
    <div class="fila-resumen total"><span>Total</span><span>${formatoCOP(totalReserva())} COP</span></div>`;
}

function vistaConfirmar() {
  const d = leerLocal(CLAVE_MIS_DATOS, {});
  const v = (x) => escaparHTML(x || '');
  return `
    <div class="paso-titulo"><h3>5. Confirma tu reserva</h3><p>Tu cita queda guardada al instante y recibes un enlace para cambiarla o cancelarla.</p></div>
    ${estado.error ? `<p class="error-general" role="alert">${escaparHTML(estado.error)}</p>` : ''}
    <div class="grid-confirmar">
      <form id="form-datos" novalidate>
        <div class="campo"><label for="nombre">Nombre completo</label>
          <input id="nombre" name="nombre" autocomplete="name" placeholder="Ej: María Pérez" maxlength="60" value="${v(d.nombre)}"><small class="error"></small></div>
        <div class="campo"><label for="telefono">Celular / WhatsApp</label>
          <input id="telefono" name="telefono" type="tel" autocomplete="tel" placeholder="300 123 4567" maxlength="20" value="${v(d.telefono)}"><small class="error"></small></div>
        <div class="fila-campos">
          <div class="campo"><label for="email">Correo (opcional)</label>
            <input id="email" name="email" type="email" autocomplete="email" placeholder="tu@correo.com" maxlength="80" value="${v(d.email)}"><small class="error"></small></div>
          <div class="campo"><label for="cumpleanos">Cumpleaños (opcional)</label>
            <input id="cumpleanos" name="cumpleanos" type="date" value="${v(d.cumpleanos)}"><small class="error"></small></div>
        </div>
        <div class="campo"><label for="nota">Alergias, ideas o referencias (opcional)</label>
          <textarea id="nota" name="nota" rows="3" maxlength="300" placeholder="Ej: alérgica al látex · quiero un tono miel"></textarea></div>
        <div class="campo"><label for="referido">¿Te recomendó una amiga? Escribe su código (opcional)</label>
          <input id="referido" name="referido" maxlength="10" placeholder="Ej: A1B2C3" autocapitalize="characters"><small class="error"></small></div>
        <label class="check"><input type="checkbox" id="promos" ${d.aceptaPromos ? 'checked' : ''}> Quiero recibir promociones por WhatsApp</label>
        <label class="check"><input type="checkbox" id="recordar" checked> Recordar mis datos en este celular</label>
        <p class="legal">Al reservar aceptas los <a href="terminos.html" target="_blank">términos de reserva</a> y la <a href="privacidad.html" target="_blank">política de tratamiento de datos</a>.</p>
      </form>
      <div class="tarjeta-resumen">
        <h4>Resumen de la reserva</h4>
        ${filasResumen()}
        <p class="nota-deposito">Pagas en el salón · Cancelación gratuita hasta 24 h antes.</p>
      </div>
    </div>`;
}

function vistaExito() {
  const r = estado.enviada;
  const primerNombre = escaparHTML(r.nombre.split(' ')[0]);
  const ini = fechaHoraColombia(r.inicio);
  const fin = fechaHoraColombia(r.fin);
  const titulo = `Cita en ${SALON.nombre}: ${r.servicios.map((s) => s.nombre).join(' + ')}`;
  const detalles = `Con ${r.profesional}. Código ${r.codigo}. Cambiar o cancelar: ${location.origin}${location.pathname.replace(/[^/]*$/, '')}cita.html?t=${r.token}`;
  const cuidados = r.servicios.map((s) => (buscarServicio(s.id) || {}).cuidados).filter(Boolean);
  const mensajeWA = `¡Hola ${SALON.nombre}! Acabo de reservar. Mi código es ${r.codigo}.`;
  return `<div class="exito animar-paso">
    <div class="sello">✓</div>
    <h3>¡Listo, ${primerNombre}! Tu cita quedó reservada</h3>
    <p class="codigo-reserva">Código de reserva <b>${escaparHTML(r.codigo)}</b></p>
    <p>Te esperamos el <strong>${fechaLegible(ini.fecha, { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
      de <strong>${horaLegible(ini.hora)}</strong> a <strong>${horaLegible(fin.hora)}</strong>
      con <strong>${escaparHTML(r.profesional)}</strong> para tu ${r.servicios.map((s) => escaparHTML(s.nombre)).join(' + ')}.
      Total: <strong>${formatoCOP(r.total)} COP</strong>, pagas en el salón.</p>
    <div class="acciones-exito">
      <a class="btn" href="${enlaceGoogleCalendar(titulo, r.inicio, r.fin, detalles)}" target="_blank" rel="noopener">Agregar a Google Calendar</a>
      <button type="button" class="btn btn-borde" data-accion="ics">Agregar al calendario del celular</button>
      <a class="btn btn-borde" href="cita.html?t=${encodeURIComponent(r.token)}">Cambiar o cancelar mi cita</a>
      <a class="btn btn-borde" href="https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent(mensajeWA)}" target="_blank" rel="noopener">Escribir al salón</a>
    </div>
    <p class="nota-enlace">Guarda el enlace "Cambiar o cancelar": te permite moverla sin llamar.</p>
    ${r.codigo_referido ? `<p class="referido-exito">Tu código para recomendar el salón: <b>${escaparHTML(r.codigo_referido)}</b>. Compártelo con tus amigas.</p>` : ''}
    ${cuidados.length ? `<div class="cuidados"><h4>Cuidados después de tu servicio</h4><ul>${cuidados.map((c) => `<li>${escaparHTML(c)}</li>`).join('')}</ul></div>` : ''}
    <button type="button" class="enlace-boton" data-accion="nueva">Hacer otra reserva</button>
  </div>`;
}

function vistaSinConexion() {
  const c = calculo();
  const form = document.getElementById('form-datos');
  const nombre = form ? form.nombre.value.trim() : '';
  const mensaje = [
    `¡Hola ${SALON.nombre}! Quiero reservar:`,
    `• Nombre: ${nombre}`,
    `• Servicios: ${itemsElegidos().map((s) => s.nombre).join(' + ')}`,
    `• Profesional: ${profesionalPorId(estado.profesional).nombre}`,
    `• Fecha: ${fechaLegible(estado.fecha, { weekday: 'long', day: 'numeric', month: 'long' })} a las ${horaLegible(estado.hora)} (${duracionTexto(c.minutos)})`,
    `• Total estimado: ${formatoCOP(totalReserva())} COP`,
  ].join('\n');
  return `<p class="aviso-paso">No pudimos guardar la reserva porque no hay conexión con la agenda. Envíanos tu solicitud por WhatsApp y te confirmamos.
    <a class="btn btn-pequeno" href="https://wa.me/${SALON.whatsapp}?text=${encodeURIComponent(mensaje)}" target="_blank" rel="noopener">Enviar por WhatsApp</a></p>`;
}

// --- Pintar todo ---
function pintarReserva() {
  pintarPasos();
  const vistas = [vistaServicio, vistaProfesional, vistaFecha, vistaProductos, vistaConfirmar];
  // Conserva lo escrito en el formulario al repintar
  const form = document.getElementById('form-datos');
  const escrito = form ? Object.fromEntries([...form.elements].filter((e) => e.id).map((e) => [e.id, e.type === 'checkbox' ? e.checked : e.value])) : null;

  panel.innerHTML = estado.enviada ? vistaExito()
    : `<div class="animar-paso">${vistas[estado.paso]()}${estado.paso === 4 && estado.sinConexion ? vistaSinConexion() : ''}</div>`;

  const nuevo = document.getElementById('form-datos');
  if (nuevo && escrito) Object.entries(escrito).forEach(([id, v]) => {
    const el = nuevo.elements[id] || document.getElementById(id);
    if (el) el.type === 'checkbox' ? (el.checked = v) : (el.value = v);
  });

  const c = calculo();
  const partes = [];
  if (estado.servicios.length) partes.push(itemsElegidos().map((s) => s.nombre).join(' + '));
  if (estado.profesional) partes.push(profesionalPorId(estado.profesional).nombre);
  if (estado.fecha) partes.push(fechaLegible(estado.fecha) + (estado.hora ? ' · ' + horaLegible(estado.hora) : ''));
  if (estado.productos.size) partes.push(`${estado.productos.size} producto${estado.productos.size > 1 ? 's' : ''}`);
  document.getElementById('resumen-lineas').textContent = partes.length ? partes.join(' • ') : 'Aún no has elegido un servicio';
  document.getElementById('resumen-total').textContent = formatoCOP(estado.enviada ? estado.enviada.total : totalReserva()) + ' COP';

  btnAtras.hidden = estado.paso === 0 || Boolean(estado.enviada);
  btnSiguiente.hidden = Boolean(estado.enviada);
  btnSiguiente.disabled = !pasoValido(estado.paso);
  btnSiguiente.textContent = estado.paso === 4 ? (estado.enviando ? 'Guardando…' : 'Confirmar reserva')
    : (estado.paso === 3 && !estado.productos.size ? 'Omitir y continuar →' : 'Continuar →');

  const contador = document.getElementById('contador-bolsa');
  contador.textContent = estado.productos.size;
  contador.hidden = estado.productos.size === 0;

  // Guardar la reserva a medias por si cierra la página
  if (!estado.enviada) {
    guardarLocal(CLAVE_BORRADOR, {
      paso: estado.paso, servicios: estado.servicios, largo: estado.largo, profesional: estado.profesional,
      fecha: estado.fecha, hora: estado.hora, productos: [...estado.productos], guardado: Date.now(),
    });
  }
  void c;
}

function irAPaso(paso, desplazar = true) {
  estado.paso = paso;
  estado.error = '';
  pintarReserva();
  if (desplazar) desplazarA('reservar');
}

function reiniciarReserva() {
  Object.assign(estado, { paso: 0, servicios: [], largo: null, profesional: null, fecha: null, hora: null, enviada: null, error: '', sinConexion: false });
  estado.espera = { abierta: false, enviada: false, error: '' };
  estado.productos.clear();
  guardarLocal(CLAVE_BORRADOR, null);
}

function restaurarBorrador() {
  const b = leerLocal(CLAVE_BORRADOR, null);
  if (!b || Date.now() - b.guardado > 3 * 864e5) return;
  estado.servicios = (b.servicios || []).filter((id) => servicioPorId(id));
  estado.largo = b.largo || null;
  estado.profesional = b.profesional && (b.profesional === 'cualquiera' || profesionalPorIdSeguro(b.profesional)) ? b.profesional : null;
  estado.productos = new Set((b.productos || []).filter((id) => PRODUCTOS.some((p) => p.id === id)));
  if (b.fecha && b.fecha >= ahoraColombia().fecha) {
    estado.fecha = b.fecha;
    estado.mesVista = primerDiaDelMes(deTextoFecha(b.fecha));
    estado.hora = b.hora && libresDelDia(b.fecha).includes(b.hora) ? b.hora : null;
  }
  let paso = Math.min(b.paso || 0, 4);
  while (paso > 0 && !PASOS.slice(0, paso).every((_, j) => pasoValido(j))) paso--;
  estado.paso = paso;
}

// --- Clics dentro del panel ---
panel.addEventListener('click', (evento) => {
  const el = evento.target.closest('button');
  if (!el) return;
  const d = el.dataset;
  estado.error = '';

  if (d.servicio) {
    const i = estado.servicios.indexOf(d.servicio);
    if (i >= 0) estado.servicios.splice(i, 1);
    else if (estado.servicios.length < MAX_SERVICIOS) estado.servicios.push(d.servicio);
    estado.hora = null;
    if (!tieneCabello()) estado.largo = null;
    if (estado.profesional && estado.profesional !== 'cualquiera' && !candidatas().length) estado.profesional = null;
  } else if (d.quitar) {
    estado.servicios = estado.servicios.filter((id) => id !== d.quitar);
    estado.hora = null;
  } else if (d.largo) {
    estado.largo = d.largo;
    estado.hora = null;
  } else if (d.profesional) {
    estado.profesional = d.profesional;
    estado.hora = null;
  } else if (d.mes) {
    estado.mesVista = new Date(estado.mesVista.getFullYear(), estado.mesVista.getMonth() + Number(d.mes), 1);
  } else if (d.fecha) {
    estado.fecha = d.fecha;
    estado.hora = null;
    estado.espera.enviada = false;
  } else if (d.hora) {
    estado.hora = d.hora;
  } else if (d.producto) {
    estado.productos.has(d.producto) ? estado.productos.delete(d.producto) : estado.productos.add(d.producto);
  } else if (d.accion === 'primer-cupo') {
    const cupo = primerCupoGeneral();
    if (cupo) {
      estado.fecha = cupo.fecha; estado.hora = cupo.hora;
      estado.mesVista = primerDiaDelMes(deTextoFecha(cupo.fecha));
    } else {
      estado.error = 'No encontramos cupos en los próximos 2 meses. Únete a la lista de espera.';
    }
  } else if (d.accion === 'espera') {
    estado.espera.abierta = true;
  } else if (d.accion === 'repetir') {
    const u = leerLocal(CLAVE_ULTIMA, null);
    if (u) {
      estado.servicios = u.servicios.filter((id) => servicioPorId(id));
      estado.largo = u.largo || null;
      estado.profesional = u.profesional && profesionalPorIdSeguro(u.profesional) ? u.profesional : null;
      estado.fecha = null; estado.hora = null;
      estado.paso = estado.profesional ? 2 : 1;
    }
  } else if (d.accion === 'ics') {
    const r = estado.enviada;
    descargarICS(`Cita en ${SALON.nombre}`, r.inicio, r.fin, `Con ${r.profesional}. Código ${r.codigo}.`);
    return;
  } else if (d.accion === 'nueva') {
    reiniciarReserva();
  } else {
    return;
  }
  pintarReserva();
});

panel.addEventListener('input', (evento) => {
  const campo = evento.target.closest('.campo');
  if (campo && campo.classList.contains('invalido')) marcarError(evento.target, '');
});

panel.addEventListener('submit', async (evento) => {
  if (evento.target.id !== 'form-espera') return;
  evento.preventDefault();
  const nombre = document.getElementById('espera-nombre').value.trim();
  const telefono = document.getElementById('espera-telefono').value.trim();
  const items = itemsElegidos();
  try {
    await db.rpc('unirse_lista_espera', {
      p_nombre: nombre, p_telefono: telefono, p_fecha: estado.fecha,
      p_servicio: items[0] && !items[0].id.startsWith('diseno:') ? items[0].id : null,
      p_profesional: estado.profesional && estado.profesional !== 'cualquiera' ? estado.profesional : null,
    });
    estado.espera = { abierta: false, enviada: true, error: '' };
  } catch (e) {
    estado.espera.error = mensajeError(e);
  }
  pintarReserva();
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
  const id = 'diseno:' + boton.dataset.diseno;
  estado.servicios = estado.servicios.filter((s) => !s.startsWith('diseno:'));
  if (estado.servicios.length >= MAX_SERVICIOS) estado.servicios.pop();
  estado.servicios.push(id);
  estado.hora = null;
  if (estado.profesional && estado.profesional !== 'cualquiera' && !candidatas().length) estado.profesional = null;
  estado.enviada = null;
  irAPaso(pasoValido(0) ? 1 : 0, false);
});

// --- Confirmar: validar y guardar en la base de datos ---
function marcarError(campo, texto) {
  const contenedor = campo.closest('.campo');
  if (!contenedor) return;
  contenedor.classList.toggle('invalido', Boolean(texto));
  contenedor.querySelector('.error').textContent = texto;
}

async function confirmarReserva() {
  const form = document.getElementById('form-datos');
  const f = form.elements;
  const nombre = f.nombre.value.trim();
  const telefono = f.telefono.value.trim();
  const email = f.email.value.trim();
  const errores = {
    nombre: nombre.length < 3 ? 'Escribe tu nombre completo.' : '',
    telefono: /^[0-9\s+()-]{7,20}$/.test(telefono) ? '' : 'Escribe un número de celular válido.',
    email: !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : 'Revisa el correo.',
  };
  Object.entries(errores).forEach(([k, v]) => marcarError(f[k], v));
  const primero = Object.keys(errores).find((k) => errores[k]);
  if (primero) { f[primero].focus(); return; }

  estado.enviando = true;
  estado.error = '';
  estado.sinConexion = false;
  pintarReserva();

  const datos = {
    nombre, telefono, email, cumpleanos: f.cumpleanos.value || '', aceptaPromos: f.promos.checked,
  };
  try {
    const r = await db.rpc('crear_reserva', {
      p_nombre: nombre, p_telefono: telefono, p_servicios: estado.servicios,
      p_profesional: estado.profesional, p_inicio: aISOColombia(estado.fecha, estado.hora),
      p_largo: tieneCabello() ? estado.largo : null,
      p_productos: [...estado.productos].map((id) => ({ id, cantidad: 1 })),
      p_notas: f.nota.value.trim(), p_email: email || null, p_cumpleanos: f.cumpleanos.value || null,
      p_acepta_promos: f.promos.checked, p_codigo_referido: f.referido.value.trim() || null, p_origen: ORIGEN,
    });
    guardarLocal(CLAVE_MIS_DATOS, f.recordar.checked ? datos : null);
    guardarLocal(CLAVE_ULTIMA, { servicios: estado.servicios, largo: estado.largo, profesional: r.profesional_id, profesionalNombre: r.profesional });
    const mis = leerLocal(CLAVE_MIS_CITAS, []);
    mis.unshift({ codigo: r.codigo, token: r.token, inicio: r.inicio, servicios: r.servicios.map((s) => s.nombre), profesional: r.profesional });
    guardarLocal(CLAVE_MIS_CITAS, mis.slice(0, 20));
    guardarLocal(CLAVE_BORRADOR, null);
    estado.enviada = { ...r, nombre };
    registrarOcupado(r.profesional_id, r.inicio, r.fin);
    pintarEquipo();
  } catch (e) {
    if (e instanceof TypeError) {
      estado.sinConexion = true;
    } else {
      estado.error = mensajeError(e);
      if (['HORARIO_OCUPADO', 'BLOQUEADO', 'HORA_PASADA', 'FUERA_DE_HORARIO', 'NO_TRABAJA', 'FESTIVO'].includes(e.message)) {
        estado.hora = null;
        estado.paso = 2;
        cargarOcupados().then(pintarReserva).catch(() => {});
      }
    }
  } finally {
    estado.enviando = false;
    pintarReserva();
    if (estado.enviada) desplazarA('reservar');
  }
}

// ===== PIE DE PÁGINA Y WHATSAPP =====
function pintarPie() {
  document.getElementById('anio').textContent = new Date().getFullYear();
  document.getElementById('pie-direccion').textContent = SALON.direccion;
  document.getElementById('pie-contacto').innerHTML = `
    <li><a href="https://wa.me/${SALON.whatsapp}" target="_blank" rel="noopener">WhatsApp: ${escaparHTML(SALON.whatsappVisible)}</a></li>
    <li><a href="tel:+${SALON.whatsapp}">Llamar: ${escaparHTML(SALON.whatsappVisible)}</a></li>
    <li><a href="mailto:${escaparHTML(SALON.email)}">Email: ${escaparHTML(SALON.email)}</a></li>
    <li>Instagram: ${escaparHTML(SALON.instagram)}</li>`;
  document.getElementById('whatsapp-flotante').href = `https://wa.me/${SALON.whatsapp}`;
}

// ======================================================
// ===== EQUIPO Y AGENDA DE CADA PROFESIONAL ============
// ======================================================
let filtroEquipo = 'todos';
const agenda = { profesional: null, servicioId: null, largo: 'corto', fecha: null, hora: null };
const dialogoAgenda = document.getElementById('agenda');
const contenidoAgenda = document.getElementById('agenda-contenido');

function semanaMiniHTML(p) {
  return `<span class="semana-mini" aria-label="Trabaja ${diasDeTrabajo(p)}">${[1, 2, 3, 4, 5, 6, 0]
    .map((d) => `<span class="${p.dias.includes(d) ? 'trabaja' : ''}">${NOMBRES_DIAS[d][0].toUpperCase()}</span>`).join('')}</span>`;
}

function pintarEquipo() {
  const filtros = [{ id: 'todos', nombre: 'Todos' }, ...CATEGORIAS.map((c) => ({ id: c.id, nombre: c.nombre }))];
  document.getElementById('filtros-equipo').innerHTML = filtros.map((f) =>
    `<button class="chip" role="tab" aria-selected="${f.id === filtroEquipo}" data-filtro-equipo="${f.id}">${escaparHTML(f.nombre)}</button>`).join('');

  const lista = filtroEquipo === 'todos' ? PROFESIONALES : profesionalesPara(filtroEquipo);
  document.getElementById('grid-equipo').innerHTML = lista.map((p, i) => {
    const servicios = serviciosDe(p);
    const masCorto = servicios.length ? Math.min(...servicios.map((s) => s.minutos)) : 60;
    const cupo = ESTADO_CONEXION.cargado ? proximoCupo(p, masCorto) : undefined;
    return `<article class="tarjeta-equipo" style="animation-delay:${i * 50}ms">
      ${retratoHTML(p, 'retrato retrato-grande')}
      <h3>${escaparHTML(p.nombre)}</h3>
      <p class="rol">${escaparHTML(p.rol)} · ${escaparHTML(p.especialidad)}</p>
      <span class="calificacion"><b>★</b> ${p.rating} · ${p.resenas} reseñas</span>
      ${semanaMiniHTML(p)}
      <p class="horario-pro">${horaLegible(p.horario[0])} – ${horaLegible(p.horario[1])}</p>
      <p class="proximo-cupo">${cupo === undefined ? 'Consultando agenda…' : cupo ? `Próximo cupo: <b>${cuandoTexto(cupo.fecha, cupo.enDias)}, ${horaLegible(cupo.hora)}</b>` : 'Sin cupos en 2 semanas'}</p>
      <ul class="duraciones">
        ${servicios.slice(0, 3).map((s) => `<li><span>${escaparHTML(s.nombre)}</span><b>${duracionTexto(s.minutos)}${s.ajustesLargo ? '+' : ''}</b></li>`).join('')}
      </ul>
      <button type="button" class="btn btn-pequeno" data-agenda="${p.id}">Ver agenda y reservar</button>
    </article>`;
  }).join('');
}

function proximosDias(cantidad = 10) {
  const hoy = deTextoFecha(ahoraColombia().fecha);
  return Array.from({ length: cantidad }, (_, i) => aTextoFecha(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i)));
}
function minutosAgenda() {
  const s = buscarServicio(agenda.servicioId);
  return calcularServicios([s], s.categoria === 'cabello' ? agenda.largo : null);
}

function abrirAgenda(id) {
  const p = profesionalPorIdSeguro(id);
  agenda.profesional = p;
  const servicios = serviciosDe(p);
  const actual = estado.servicios.find((sid) => servicios.some((s) => s.id === sid));
  agenda.servicioId = actual || servicios[0].id;
  agenda.largo = estado.largo || 'corto';
  agenda.fecha = proximosDias(14).find((f) => horariosLibres(p, f, minutosAgenda().minutos).length) || null;
  agenda.hora = null;
  pintarAgenda();
  dialogoAgenda.showModal();
}

function pintarAgenda() {
  const p = agenda.profesional;
  const servicio = buscarServicio(agenda.servicioId);
  const { minutos, precio } = minutosAgenda();
  const hoyTexto = ahoraColombia().fecha;

  const dias = proximosDias().map((f) => {
    const libres = horariosLibres(p, f, minutos);
    const fecha = deTextoFecha(f);
    const estadoDia = FESTIVOS.has(f) ? 'Festivo' : !trabajaEseDia(p, f) ? 'Descansa' : (libres.length ? `${libres.length} cupos` : 'Lleno');
    return `<button type="button" class="dia-agenda" data-agenda-fecha="${f}" aria-pressed="${agenda.fecha === f}" ${libres.length ? '' : 'disabled'}>
      <small>${f === hoyTexto ? 'Hoy' : capitalizar(fecha.toLocaleDateString('es-CO', { weekday: 'short' }))}</small>
      <strong>${fecha.getDate()}</strong>
      <em>${estadoDia}</em>
    </button>`;
  }).join('');

  let horas = '<p class="sin-fecha">Elige un día con cupos.</p>';
  if (agenda.fecha) {
    const libres = horariosLibres(p, agenda.fecha, minutos);
    horas = lineaTiempoHTML(p, agenda.fecha, minutos, agenda.hora) + `<div class="grid-horas">${libres.map((h) => `
      <button type="button" class="hora" data-agenda-hora="${h}" aria-pressed="${agenda.hora === h}">
        ${horaLegible(h)}<small>hasta ${finDeCita(h, minutos)}</small>
      </button>`).join('')}</div>`;
  }

  const largo = servicio.ajustesLargo ? `<div class="largo-agenda">Largo del cabello:
      ${LARGOS.map(([id, nombre]) => `<button type="button" class="chip" data-agenda-largo="${id}" aria-pressed="${agenda.largo === id}">${nombre}</button>`).join('')}</div>` : '';

  const resumen = agenda.hora
    ? `<strong>${escaparHTML(servicio.nombre)} · ${fechaLegible(agenda.fecha, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
       <small>${horaLegible(agenda.hora)} – ${finDeCita(agenda.hora, minutos)} · ${duracionTexto(minutos)} · ${formatoCOP(precio)} COP</small>`
    : `<strong>${escaparHTML(servicio.nombre)}</strong><small>Dura ${duracionTexto(minutos)} · elige día y hora</small>`;

  contenidoAgenda.innerHTML = `
    <header class="agenda-cabecera">
      ${retratoHTML(p)}
      <div>
        <h3 id="agenda-titulo">Agenda de ${escaparHTML(p.nombre)}</h3>
        <p>${escaparHTML(p.rol)} · ${escaparHTML(p.especialidad)}</p>
        <p class="horario-pro">🗓 ${textoHorario(p)}</p>
      </div>
      <button type="button" class="cerrar-agenda" data-cerrar aria-label="Cerrar">✕</button>
    </header>
    <div class="agenda-cuerpo">
      <h4>1. ¿Qué servicio quieres?</h4>
      <div class="servicios-agenda">
        ${serviciosDe(p).map((s) => `<button type="button" class="opcion" data-agenda-servicio="${s.id}" aria-pressed="${s.id === agenda.servicioId}">
          <strong>${escaparHTML(s.nombre)}</strong><span class="precio">${duracionTexto(s.minutos)}${s.ajustesLargo ? '+' : ''}<em>${formatoCOP(s.precio)}</em></span>
        </button>`).join('')}
      </div>
      ${largo}
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
  if (e.target === dialogoAgenda) { dialogoAgenda.close(); return; }
  const b = e.target.closest('button');
  if (!b) return;
  const d = b.dataset;
  if ('cerrar' in d) { dialogoAgenda.close(); return; }
  const reubicar = () => {
    const m = minutosAgenda().minutos;
    if (!agenda.fecha || !horariosLibres(agenda.profesional, agenda.fecha, m).length) {
      agenda.fecha = proximosDias(14).find((f) => horariosLibres(agenda.profesional, f, m).length) || null;
    }
  };
  if (d.agendaServicio) {
    agenda.servicioId = d.agendaServicio; agenda.hora = null; reubicar();
  } else if (d.agendaLargo) {
    agenda.largo = d.agendaLargo; agenda.hora = null; reubicar();
  } else if (d.agendaFecha) {
    agenda.fecha = d.agendaFecha; agenda.hora = null;
  } else if (d.agendaHora) {
    agenda.hora = d.agendaHora;
  } else if ('agendaReservar' in d) {
    const s = buscarServicio(agenda.servicioId);
    Object.assign(estado, {
      servicios: [agenda.servicioId], largo: s.categoria === 'cabello' ? agenda.largo : null,
      profesional: agenda.profesional.id, fecha: agenda.fecha, hora: agenda.hora, enviada: null,
      mesVista: primerDiaDelMes(deTextoFecha(agenda.fecha)),
    });
    dialogoAgenda.close();
    irAPaso(3);
    return;
  } else {
    return;
  }
  pintarAgenda();
});

// ===== ARRANQUE =====
function pintarTodo() {
  pintarServicios();
  pintarDisenos();
  pintarEquipo();
  pintarReserva();
  pintarPie();
}
pintarTodo();

(async () => {
  try {
    await cargarCatalogo();
    await cargarOcupados();
  } catch (e) {
    console.warn('Sin conexión con la base de datos, se usan los datos de respaldo.', e);
  }
  ESTADO_CONEXION.cargado = true;
  restaurarBorrador();
  pintarTodo();
})();
