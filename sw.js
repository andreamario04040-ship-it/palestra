/* Service worker: app shell offline-first, aggiornamento in background. */

const VERSION = 'v1.1.3';
const CACHE = `palestra-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/lib/dom.js',
  './js/lib/icons.js',
  './js/lib/store.js',
  './js/lib/coach.js',
  './js/lib/anim.js',
  './js/lib/charts.js',
  './js/data/exercises.js',
  './js/data/templates.js',
  './js/views/home.js',
  './js/views/routines.js',
  './js/views/workout.js',
  './js/views/history.js',
  './js/views/stats.js',
  './js/views/settings.js',
  './js/views/exercises.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/favicon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  const isCode = /\.(?:js|css|webmanifest|json)$/.test(url.pathname) || req.mode === 'navigate';

  if (isCode) {
    // network-first: evita di mischiare moduli di versioni diverse quando si è online
    e.respondWith(
      fetch(req)
        .then((r) => {
          if (r && r.status === 200) {
            const copy = r.clone();
            caches.open(CACHE).then((c) => c.put(req.mode === 'navigate' ? './index.html' : req, copy));
          }
          return r;
        })
        .catch(() => caches.match(req).then((hit) => hit
          || (req.mode === 'navigate' ? caches.match('./index.html') : undefined))),
    );
    return;
  }

  // immagini e font: cache-first, con aggiornamento silenzioso in background
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => {
        if (r && r.status === 200) caches.open(CACHE).then((c) => c.put(req, r.clone()));
        return r;
      }).catch(() => hit);
      return hit || net;
    }),
  );
});
