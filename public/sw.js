// Petyus kalandjai – service worker: a játék offline is indul, és másodszorra gyorsabban tölt.
// Az oldal (navigáció) hálózatról jön, ha van net (így a friss kiadás azonnal látszik), különben a gyorsítótárból;
// minden más (JS/CSS – a nevükben hash van –, modellek, képek, betűk) a gyorsítótárból, közben a háttérben frissül.
const CACHE = 'petyus-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try { const res = await fetch(req); (await caches.open(CACHE)).put(req, res.clone()); return res; }
      catch { return (await caches.match(req)) || (await caches.match('./')) || Response.error(); }
    })());
    return;
  }
  e.respondWith((async () => {
    const cache = await caches.open(CACHE), hit = await cache.match(req);
    const net = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || Response.error();
  })());
});
