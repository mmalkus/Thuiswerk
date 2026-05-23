const CACHE = 'thuiswerk-v8';
const ASSETS = [
  '/Thuiswerk/',
  '/Thuiswerk/index.html',
  '/Thuiswerk/dictee.html',
  '/Thuiswerk/rekentoets.html',
  '/Thuiswerk/topografie.html',
  '/Thuiswerk/shared.css',
  '/Thuiswerk/sidebar.js',
  '/Thuiswerk/manifest.json',
  '/Thuiswerk/icons/icon.svg',
  '/Thuiswerk/i18n-nl.json',
  '/Thuiswerk/i18n-en.json',
  '/Thuiswerk/words-nl.json',
  '/Thuiswerk/words-en.json',
  '/Thuiswerk/topo-nl.json',
  '/Thuiswerk/topo-europe.json',
  '/Thuiswerk/topo-world.json',
  '/Thuiswerk/topo-physical.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
