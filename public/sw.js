const CACHE_NAME = 'dalia-bakery-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Only intercept GET requests for same-origin
  if (event.request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return;
  }

  // Only intercept the main entry points and static assets we explicitly cached
  // This avoids issues with hashed assets in /assets/ failing to fetch through the SW
  const isBaseAsset = urlsToCache.some(path => {
    if (path === '/') return url.pathname === '/';
    return url.pathname.endsWith(path);
  });

  if (isBaseAsset) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          return response || fetch(event.request).catch(() => {
            // If fetch fails, just return whatever we have or let it fail
            return null;
          });
        })
    );
  }
  
  // For all other requests (assets, APIs), we don't call event.respondWith()
  // This allows the browser to handle the request normally, bypassing the SW.
});
