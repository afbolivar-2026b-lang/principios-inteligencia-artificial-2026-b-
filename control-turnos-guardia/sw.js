/* Modo sin internet: guarda la página y sus archivos en el celular.
   La página siempre se pide primero a internet (para recibir cambios) y,
   si no hay conexión, se abre la copia guardada. Los datos de Firebase
   no pasan por aquí: Firestore tiene su propia copia local. */
const CACHE = 'turnos-v7';
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/favicon-32.png',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'descargar.html',
  'libs/firebase-app-compat.js',
  'libs/firebase-firestore-compat.js',
  'libs/xlsx.full.min.js',
  'libs/jspdf.umd.min.js',
  'libs/jspdf.plugin.autotable.min.js'
];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', ev => {
  const req = ev.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return; // Firebase, fuentes y demás van directo a internet

  if(req.mode === 'navigate'){
    // Página: primero internet, si falla la copia guardada
    ev.respondWith(
      fetch(req).then(resp => {
        const copia = resp.clone();
        caches.open(CACHE).then(c => c.put('index.html', copia));
        return resp;
      }).catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Archivos (librerías, íconos): la copia guardada al instante y se actualiza en segundo plano
  ev.respondWith(
    caches.match(req).then(guardado => {
      const red = fetch(req).then(resp => {
        if(resp.ok){
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      }).catch(() => guardado);
      return guardado || red;
    })
  );
});
