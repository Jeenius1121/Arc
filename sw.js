// Service worker Tracker : app hors-ligne + mise à jour à la demande (bandeau)
// VERSION est modifiée par tools/release.py : tout changement de ce fichier déclenche l'installation
// d'un nouveau service worker, qui attend que l'utilisateur touche le bandeau « Mettre à jour ».
const VERSION = '1.0.0';
const CACHE = 'tracker-' + VERSION;
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'assets/css/app.css',
  'assets/js/app.js',
  'assets/js/data.js',
  'assets/js/engine.js',
  'assets/js/icons.js',
  'assets/js/mapsvg.js',
  'assets/js/store.js',
  'assets/js/ui.js',
  'assets/js/update.js',
  'assets/js/version.js',
  'assets/js/views/home.js',
  'assets/js/views/item.js',
  'assets/js/views/craft.js',
  'assets/js/views/maps.js',
  'assets/js/views/list.js',
  'assets/js/views/more.js',
  'data/db.json',
  'assets/fonts/chakra-petch-latin-500-normal.woff2',
  'assets/fonts/chakra-petch-latin-600-normal.woff2',
  'assets/fonts/chakra-petch-latin-700-normal.woff2',
  'assets/fonts/barlow-latin-400-normal.woff2',
  'assets/fonts/barlow-latin-500-normal.woff2',
  'assets/fonts/barlow-latin-600-normal.woff2',
  'assets/fonts/barlow-latin-700-normal.woff2',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  // cache: 'reload' contourne le cache HTTP pour récupérer les fichiers neufs
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/sw.js')) return; // toujours le réseau

  if (req.mode === 'navigate') {
    event.respondWith(caches.match('index.html', { cacheName: CACHE }).then((r) => r || fetch(req)));
    return;
  }
  event.respondWith(
    caches.match(req, { cacheName: CACHE, ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && res.type === 'basic') {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    })),
  );
});
