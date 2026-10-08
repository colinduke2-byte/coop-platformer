// Offline support: after the first visit the game (its page, script and assets) is kept in the browser and served from there,
// so it starts with no connection. Stale-while-revalidate: a cached copy is used at once and refreshed in the background,
// so a new version arrives on the second load after it is published.
const CACHE = 'frostfall-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async (cache) => {
    const hit = await cache.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
