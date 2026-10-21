// Guarda la app en el equipo para que abra y funcione sin internet.
// Los datos (Firestore) no pasan por aquí: Firebase los guarda en su propio caché.
const VERSION = 'parqueadero-v8';
const APP = ['./', './index.html', './manifest.webmanifest', './icono.svg', './icono-192.png', './icono-512.png'];
const LIBRERIAS = [
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js',
  'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js'
];

self.addEventListener('install', e=>{
  e.waitUntil((async()=>{
    const c = await caches.open(VERSION);
    await c.addAll(APP);
    // las librerías externas se guardan una por una: si una falla, las demás quedan
    await Promise.all(LIBRERIAS.map(u=> c.add(new Request(u, { mode:'no-cors' })).catch(()=>{})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e=>{
  e.waitUntil((async()=>{
    for(const k of await caches.keys()) if(k!==VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

function esLibreria(url){
  return url.hostname==='www.gstatic.com' || url.hostname==='cdnjs.cloudflare.com' || url.hostname==='cdn.jsdelivr.net' ||
         url.hostname==='fonts.googleapis.com' || url.hostname==='fonts.gstatic.com';
}

self.addEventListener('fetch', e=>{
  const req = e.request;
  if(req.method!=='GET') return;
  const url = new URL(req.url);

  // La página: primero internet (para recibir actualizaciones) y, si no hay, la copia guardada.
  if(req.mode==='navigate' || (url.origin===location.origin && APP.some(a=> url.pathname.endsWith(a.replace('./','/'))))){
    e.respondWith((async()=>{
      const c = await caches.open(VERSION);
      try{
        const r = await fetch(req);
        if(r.ok) c.put(req.mode==='navigate' ? './index.html' : req, r.clone());
        return r;
      }catch(err){
        return (await c.match(req, { ignoreSearch:true })) || (await c.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // Librerías y fuentes: la copia guardada primero, porque no cambian.
  if(esLibreria(url)){
    e.respondWith((async()=>{
      const c = await caches.open(VERSION);
      const hit = await c.match(req, { ignoreVary:true });
      if(hit) return hit;
      try{
        const r = await fetch(req);
        if(r.ok || r.type==='opaque') c.put(req, r.clone());
        return r;
      }catch(err){ return Response.error(); }
    })());
  }
});
