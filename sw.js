// Worklog — Service Worker (офлайн-кэш)
const CACHE = 'worklog-v203';
const ASSETS = [
  './',
  './index.html',
  './css/base.css',
  './css/components.css',
  './crypto.js',
  './js/auth.js',
  './js/ui.js',
  './js/chart.js',
  './app.js',
  './manifest.webmanifest',
  './icon.svg',
  './icon-144.png',
  './icon-192.png',
  './icon-384.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // data.encrypted.json — ВСЕГДА из сети (не кэшируем)
  if (url.pathname.endsWith('data.encrypted.json')) {
    e.respondWith(fetch(e.request));
    return;
  }
  // Остальное — cache-first, network-fallback
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(resp => {
      if (e.request.method === 'GET' && resp.ok) {
        const copy = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return resp;
    }))
  );
});
