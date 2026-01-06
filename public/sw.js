const CACHE_NAME = 'wattcount-v1';
const STATIC_CACHE = [
  '/',
  '/index.html'
];

// Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_CACHE))
  );
  self.skipWaiting();
});

// Fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 🚫 NEVER touch API requests
  if (url.pathname.startsWith('/auth') ||
      url.pathname.startsWith('/users') ||
      url.pathname.startsWith('/bills') ||
      url.pathname.startsWith('/payments')) {
    return;
  }

  // 🚫 NEVER intercept JS / CSS / fonts
  if (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font'
  ) {
    return;
  }

  // Cache-first for navigation only
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cached) => cached || fetch(request))
    );
  }
});

// Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    )
  );
  self.clients.claim();
});
