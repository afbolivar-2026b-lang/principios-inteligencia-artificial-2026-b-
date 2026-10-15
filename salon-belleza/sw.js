// Service worker: guarda la página para abrir rápido y sin señal.
// Nunca guarda datos de la base de datos (citas, horarios): esos siempre se piden en vivo.
const VERSION = 'neiva-belleza-v1';
const ARCHIVOS = ['./', 'index.html', 'cita.html', 'terminos.html', 'privacidad.html', 'styles.css', 'api.js', 'datos.js', 'script.js', 'extras.js', 'cita.js',
  'img/icono.svg', 'img/portada-mano.jpg', 'manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('admin.html')) return;
  // Primero la red (siempre lo más nuevo); si no hay señal, la copia guardada
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
    return r;
  }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
});
