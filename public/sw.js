// Petyus kalandjai – service worker: a játék offline is indul, és másodszorra gyorsabban tölt.
// Az oldal (navigáció) mindig a hálózatról jön, ha van net (így a friss kiadás azonnal látszik); csak ha nincs net vagy
// 6 mp alatt nem válaszol, akkor a gyorsítótárból. Minden más (JS/CSS – a nevükben hash van –, modellek, képek, betűk)
// a gyorsítótárból, közben a háttérben frissül. A gyorsítótárba írás hibája soha nem rontja el a választ.
const CACHE = 'petyus-v2';
const HOME = new URL('./', self.location).href;
self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.add(HOME)).catch(() => {}));   // the start page, for an offline first launch
});
// the page sends the files it has already loaded: keep them (only the ones not yet stored)
self.addEventListener('message', (e) => {
  const urls = e.data && e.data.keep; if (!Array.isArray(urls)) return;
  e.waitUntil(caches.open(CACHE).then(async (c) => { for (const u of urls) { if (new URL(u).origin !== self.location.origin || await c.match(u, { ignoreVary: true })) continue; try { const res = await fetch(u, { credentials: 'same-origin' }); if (res.ok && !res.redirected) await c.put(u, res); } catch (err) { /* later */ } } }).catch(() => {}));
});
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
const keep = (req, res) => { if (res && res.ok && res.type === 'basic' && !res.redirected) caches.open(CACHE).then((c) => c.put(req, res)).catch(() => {}); };
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const res = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]);
        keep(req, res.clone());
        return res;
      } catch (err) {
        return (await caches.match(req, { ignoreSearch: true, ignoreVary: true })) || (await caches.match(HOME, { ignoreVary: true })) || fetch(req);
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const hit = await caches.match(req, { ignoreVary: true });   // ignoreVary: the same file stored from the page's list (no Origin header) still matches
    const net = fetch(req).then((res) => { keep(req, res.clone()); return res; });
    if (hit) { net.catch(() => {}); return hit; }
    return net;
  })());
});
