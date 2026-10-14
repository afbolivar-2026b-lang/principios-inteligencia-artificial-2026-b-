// ===== DATOS DEL SALÓN =====
// Edita este archivo para cambiar servicios, precios, profesionales y productos.
// Lo usan la página pública (index.html) y el panel (admin.html).

const SALON = {
  nombre: 'Neiva Belleza',
  whatsapp: '573001234567', // código de país + número, sin espacios ni "+"
  whatsappVisible: '+57 300 123 4567',
  direccion: 'Carrera 5 # 12-34, Neiva, Huila',
  email: 'hola@neivabelleza.co',
  instagram: '@neivabelleza',
  horario: 'Lunes a sábado: 9:00 a.m. – 7:00 p.m.',
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
      { id: 'corte', nombre: 'Corte & estilizado', detalle: 'Corte personalizado, brushing y acabado', precio: 45000, minutos: 60 },
      { id: 'color', nombre: 'Coloración profesional', detalle: 'Balayage, mechas o color global', precio: 160000, minutos: 120 },
      { id: 'hidratante', nombre: 'Tratamiento hidratante', detalle: 'Nutrición profunda, brillo y suavidad', precio: 90000, minutos: 60 },
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
      { id: 'limpieza', nombre: 'Limpieza profunda', detalle: 'Extracción, exfoliación y mascarilla', precio: 90000, minutos: 60 },
      { id: 'hidra-facial', nombre: 'Hidratación facial', detalle: 'Ácido hialurónico y luminosidad', precio: 110000, minutos: 60 },
      { id: 'masaje', nombre: 'Masaje relajante', detalle: 'Aromaterapia y piedras calientes', precio: 120000, minutos: 90 },
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

const PROFESIONALES = [
  { id: 'sofia', nombre: 'Sofía Martínez', especialidad: 'Uñas en gel & nail art', categorias: ['unas'], rating: 4.9, resenas: 124, tono: ['#e8c3b5', '#c98f88'] },
  { id: 'camila', nombre: 'Camila Reyes', especialidad: 'Manicura de lujo & diseño', categorias: ['unas'], rating: 4.9, resenas: 210, tono: ['#d9b49a', '#a8735c'] },
  { id: 'valentina', nombre: 'Valentina Ríos', especialidad: 'Colorimetría & balayage', categorias: ['cabello'], rating: 4.8, resenas: 98, tono: ['#f0d2c4', '#d39a93'] },
  { id: 'daniela', nombre: 'Daniela Ortiz', especialidad: 'Maquillaje & cejas', categorias: ['maquillaje'], rating: 4.7, resenas: 76, tono: ['#efd9cc', '#b8946a'] },
  { id: 'laura', nombre: 'Laura Gómez', especialidad: 'Spa facial & masajes', categorias: ['spa'], rating: 4.8, resenas: 88, tono: ['#e9d6d0', '#9d7b84'] },
  { id: 'mariana', nombre: 'Mariana López', especialidad: 'Cortes & peinados', categorias: ['cabello', 'maquillaje'], rating: 4.8, resenas: 132, tono: ['#f3ddd2', '#c4877c'] },
];

const PRODUCTOS = [
  { id: 'serum-rosa', foto: 'img/p-serum-rosa.jpg', nombre: 'Sérum de Rosa', detalle: 'Hidratante con pétalos de rosa · 30 ml', precio: 98000, stock: 5 },
  { id: 'aceite-facial', foto: 'img/p-aceite-facial.jpg', nombre: 'Aceite facial nutritivo', detalle: 'Jojoba y rosa mosqueta · 15 ml', precio: 76000, stock: 8 },
  { id: 'esmalte-nude', foto: 'img/p-esmalte-nude.jpg', nombre: 'Esmalte Nude · Tono 04', detalle: 'Larga duración, libre de 10 tóxicos · 10 ml', precio: 28000, stock: 14 },
  { id: 'aceite-cuticula', foto: 'img/p-aceite-cuticula.jpg', nombre: 'Aceite de cutícula', detalle: 'Argán y vitamina E · 15 ml', precio: 22000, stock: 3 },
  { id: 'shampoo', foto: 'img/p-shampoo.jpg', nombre: 'Shampoo nutritivo', detalle: 'Sin sulfatos, con aceite de argán · 250 ml', precio: 32000, stock: 20 },
  { id: 'esmalte-rose', foto: 'img/p-esmalte-rose.jpg', nombre: 'Esmalte Rosé Ivory', detalle: 'Brillo intenso, secado rápido · 12 ml', precio: 28000, stock: 11 },
];

const HORARIOS = ['9:00', '10:30', '12:00', '14:00', '15:30', '17:00'];

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
