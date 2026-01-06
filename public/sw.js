const CACHE_NAME = 'wattcount-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.js',
  '/src/assets/main.css'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // BLOCK localhost requests in production - this prevents CORS errors
  const isProduction = self.location.hostname.includes('vercel.app') || 
                       self.location.hostname.includes('.netlify.app') ||
                       (!self.location.hostname.includes('localhost') && !self.location.hostname.includes('127.0.0.1'));
  
  if (isProduction && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) {
    console.warn('[SW] Blocked localhost request in production:', url.href);
    event.respondWith(
      Promise.reject(new Error('Localhost requests are not allowed in production'))
    );
    return;
  }
  
  // Skip caching for API calls - always fetch from network
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(err => {
      console.error('[SW] API fetch failed:', err);
      throw err;
    }));
    return;
  }
  
  // Skip caching for external requests that aren't from the same origin
  if (url.origin !== self.location.origin) {
    // In production, block external requests except to same domain
    if (isProduction && !url.origin.includes(self.location.hostname.split('.').slice(-2).join('.'))) {
      console.warn('[SW] Blocked external request in production:', url.href);
      event.respondWith(Promise.reject(new Error('External requests blocked in production')));
      return;
    }
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch((err) => {
        console.error('[SW] Cache fetch failed:', err);
        // If fetch fails, return a basic response to prevent errors
        return new Response('Network error', { status: 408 });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
