// ============================================
// HERBI – Service Worker (sw.js)
// Ermöglicht Offline-Nutzung der App
// ============================================

const CACHE_NAME = 'herbi-v1';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/app.css',
  '/js/store.js',
  '/js/router.js',
  '/js/api.js',
  '/js/app.js',
  '/screens/onboarding.js',
  '/screens/plan.js',
  '/screens/recipe.js',
  '/screens/list.js',
];

// Installation – alle wichtigen Dateien cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activation – alte Caches löschen
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch – Cache First für App-Dateien, Network First für API
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Anthropic API immer online
  if (url.hostname === 'api.anthropic.com' || url.hostname === 'api.getbring.com') {
    return; // Standard fetch, kein Cache
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Erfolgreiche Responses cachen
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline-Fallback
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
