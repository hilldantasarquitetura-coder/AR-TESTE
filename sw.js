const CACHE_VERSION = 'ar-app-shell-v1';
const CACHE_ASSETS = [
  './',
  './index.html',
  './sw.js',
  './manifest.json',
  'https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
  'https://unpkg.com/html5-qrcode',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CACHE_ASSETS).catch((error) => {
        console.warn('SW: falha ao armazenar alguns assets offline:', error);
      }))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_VERSION).then((cache) => {
            cache.put('./index.html', response.clone());
            return response;
          });
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_VERSION).then((cache) => {
            if (event.request.url.startsWith(self.location.origin) || event.request.url.startsWith('https://')) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        })
        .catch(() => {
          if (event.request.destination === 'image') {
            return new Response('', { status: 503, statusText: 'Offline' });
          }
          return caches.match('./index.html');
        });
    })
  );
});
