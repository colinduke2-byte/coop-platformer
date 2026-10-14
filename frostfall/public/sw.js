// Frostfall offline worker. After the first visit the game is kept in the browser, so it starts with no connection.
//  - The page (navigations / HTML) is NETWORK-FIRST: online you always get the newest published game; offline (or when the
//    network takes longer than NET_TIMEOUT to answer) the cached copy is used.
//  - Everything else (scripts, icons, manifest) is CACHE-FIRST: those files are content-hashed or never change per build.
//  - The cache name carries the build id, injected at build/publish time (vite.config.js + tools/publish.mjs replace the
//    placeholders below), so every published build gets a fresh cache and old ones are deleted when it activates.
//  - A new worker does not take over by itself while an older one controls an open tab: the page can show
//    "UPDATE READY - RELOAD" and post {type:'SKIP_WAITING'} to switch (see docs/PUBLISHING.md).
const BUILD = '__BUILD__';
const CACHE = 'frostfall-' + BUILD;
const PRECACHE = ['./', 'index.html'].concat(/*__PRECACHE__*/[]);
const NET_TIMEOUT = 4000;

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the HTTP cache (GitHub Pages serves max-age=600), so a fresh build is stored, not a stale copy.
  e.waitUntil(caches.open(CACHE).then((cache) => Promise.all(PRECACHE.map((u) =>
    fetch(new Request(u, { cache: 'reload' })).then((res) => { if (res.ok) return cache.put(u, res); }).catch(() => {})))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('frostfall-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => {
  if (e.data && (e.data === 'SKIP_WAITING' || e.data.type === 'SKIP_WAITING')) self.skipWaiting();
  // {type:'GET_BUILD'} (+ a MessageChannel port) answers {type:'BUILD', build}: lets the page tell "a newer game is waiting" from
  // "this page already is the newest game, only the worker is new" (network-first served the new page before the worker swapped).
  if (e.data && e.data.type === 'GET_BUILD') {
    const msg = { type: 'BUILD', build: BUILD };
    if (e.ports && e.ports[0]) e.ports[0].postMessage(msg); else if (e.source) e.source.postMessage(msg);
  }
});

const isPage = (req) => req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');

async function pageFromCache(cache, req) {
  const url = new URL(req.url); url.search = ''; url.hash = '';
  return (await cache.match(url.href)) || (await cache.match('./')) || (await cache.match('index.html'));
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  const url = new URL(req.url); url.search = ''; url.hash = '';
  const net = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res && res.ok && res.type === 'basic') cache.put(url.href, res.clone());
    return res;
  });
  net.catch(() => {});                                         // a late failure after the timeout is not an error
  const timeout = new Promise((resolve) => setTimeout(resolve, NET_TIMEOUT));
  try {
    const first = await Promise.race([net, timeout]);
    if (first) return first;                                   // the network answered in time
    const cached = await pageFromCache(cache, req);            // slow network: use the cached game, keep refreshing behind
    return cached || await net;
  } catch (err) {
    const cached = await pageFromCache(cache, req);            // offline
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;
  e.respondWith(isPage(req) ? networkFirst(req) : cacheFirst(req));
});
