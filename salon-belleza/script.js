// Número de WhatsApp del salón (código de país + número, sin espacios ni "+")
const WHATSAPP_SALON = '573001234567';

// ===== MENÚ EN CELULAR =====
const botonMenu = document.querySelector('.menu-toggle');
const menu = document.querySelector('nav');

botonMenu.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  botonMenu.setAttribute('aria-expanded', abierto);
  botonMenu.textContent = abierto ? '✕' : '☰';
});

// Cierra el menú al tocar un enlace
menu.querySelectorAll('a').forEach((enlace) => {
  enlace.addEventListener('click', () => {
    menu.classList.remove('abierto');
    botonMenu.setAttribute('aria-expanded', 'false');
    botonMenu.textContent = '☰';
  });
});

// ===== AÑO AUTOMÁTICO EN EL PIE DE PÁGINA =====
document.getElementById('anio').textContent = new Date().getFullYear();

// ===== FORMULARIO DE RESERVA =====
const formulario = document.getElementById('form-reserva');
const campoFecha = document.getElementById('fecha');
const mensajeExito = document.getElementById('mensaje-exito');

// No permite elegir fechas pasadas
const hoy = new Date();
hoy.setMinutes(hoy.getMinutes() - hoy.getTimezoneOffset());
campoFecha.min = hoy.toISOString().split('T')[0];

function marcarError(campo, texto) {
  const contenedor = campo.closest('.campo');
  contenedor.classList.toggle('invalido', Boolean(texto));
  contenedor.querySelector('.error').textContent = texto;
}

function validar() {
  const nombre = formulario.nombre;
  const telefono = formulario.telefono;
  const servicio = formulario.servicio;
  let valido = true;

  if (nombre.value.trim().length < 3) {
    marcarError(nombre, 'Escribe tu nombre completo.');
    valido = false;
  } else marcarError(nombre, '');

  if (!/^[0-9\s+()-]{7,15}$/.test(telefono.value.trim())) {
    marcarError(telefono, 'Escribe un número de teléfono válido.');
    valido = false;
  } else marcarError(telefono, '');

  if (!servicio.value) {
    marcarError(servicio, 'Elige un servicio.');
    valido = false;
  } else marcarError(servicio, '');

  if (!campoFecha.value || campoFecha.value < campoFecha.min) {
    marcarError(campoFecha, 'Elige una fecha desde hoy en adelante.');
    valido = false;
  } else marcarError(campoFecha, '');

  return valido;
}

formulario.addEventListener('submit', (evento) => {
  evento.preventDefault();
  mensajeExito.textContent = '';
  if (!validar()) return;

  const datos = new FormData(formulario);
  const texto =
    `¡Hola Bella Rosa! Quiero reservar una cita.\n` +
    `• Nombre: ${datos.get('nombre').trim()}\n` +
    `• Teléfono: ${datos.get('telefono').trim()}\n` +
    `• Servicio: ${datos.get('servicio')}\n` +
    `• Fecha: ${datos.get('fecha')}` +
    (datos.get('mensaje').trim() ? `\n• Comentarios: ${datos.get('mensaje').trim()}` : '');

  window.open(`https://wa.me/${WHATSAPP_SALON}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  mensajeExito.textContent = '¡Listo! Te abrimos WhatsApp para confirmar tu cita 💖';
  formulario.reset();
});

// ===== ANIMACIÓN AL HACER SCROLL =====
const elementosAnimados = document.querySelectorAll('.tarjeta-servicio, .foto, .opinion, .formulario');
elementosAnimados.forEach((el) => el.classList.add('aparecer'));

const observador = new IntersectionObserver((entradas) => {
  entradas.forEach((entrada) => {
    if (entrada.isIntersecting) {
      entrada.target.classList.add('visible');
      observador.unobserve(entrada.target);
    }
  });
}, { threshold: 0.15 });

elementosAnimados.forEach((el) => observador.observe(el));
