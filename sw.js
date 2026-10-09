/* ==========================================================================
   Startpage · Service worker
   Guarda los archivos de la página para que abra al instante y funcione sin
   conexión. Estrategia "stale-while-revalidate": responde con lo guardado y
   en segundo plano baja la versión nueva (se ve en la próxima apertura).
   Solo maneja archivos propios; APIs, fuentes y videos van directo a la red.
   ========================================================================== */
const CACHE = 'startpage-v2';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['./', 'index.html', 'css/style.css', 'assets/icon.svg']).catch(() => {})));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (/\.(mp4|webm|mov)$/i.test(url.pathname) || req.headers.has('range')) return; // videos: directo
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: url.pathname.endsWith('/') || url.pathname.endsWith('.html') });
    const net = fetch(req).then((res) => {
      if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const res = await net;
    return res || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
  })());
});
