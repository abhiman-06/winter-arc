/* Service worker — makes Winter Arc installable and usable offline.
   Bump CACHE when you change any shell file.                            */
const CACHE = 'winter-arc-v1';
const SHELL = [
  './',
  'index.html',
  'css/style.css',
  'js/store.js',
  'js/charts.js',
  'js/ui.js',
  'js/views/today.js',
  'js/views/habits.js',
  'js/views/tasks.js',
  'js/views/goals.js',
  'js/views/insights.js',
  'js/app.js',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // addAll fails the whole install if one file 404s — add them individually
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => {
      if (hit) {
        // refresh the cache in the background so updates land on next launch
        fetch(e.request).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }).catch(() => {});
        return hit;
      }
      return fetch(e.request).then(res => {
        if (res && res.ok && e.request.url.startsWith(self.location.origin)) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('index.html'));
    })
  );
});
