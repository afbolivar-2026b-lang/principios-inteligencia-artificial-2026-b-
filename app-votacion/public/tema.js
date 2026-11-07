/*! © Opita Digital — Todos los derechos reservados. */
// Aplica el último diseño usado antes de pintar la página (evita parpadeo).
try {
  var t = localStorage.getItem('tema');
  if (t) document.documentElement.setAttribute('data-tema', t);
} catch (e) { /* almacenamiento no disponible */ }
