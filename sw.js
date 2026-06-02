// ============================================
// HERBI – Service Worker (sw.js)
// ============================================

const CACHE_NAME  = 'herbi-v2';
const BASE        = '/herbi';

const PRECACHE_URLS = [
  BASE + '/',
  BASE + '/index.html',
  BASE + '/manifest.json',
  BASE + '/css/app.css',
  BASE + '/js/store.js',
  BASE + '/js/router.js',
  BASE + '/js/api.js',
  BASE + '/js/app.js',
  BASE + '/screens/onboarding.js',
  BASE + '/screens/plan.js',
  BASE + '/screens/recipe.js',
  BASE + '/screens/list.js',
  BASE + '/icon-192.png',
  BASE + '/icon-512.png',
  BASE + '/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // API calls immer online lassen
  if (url.hostname === 'api.anthropic.com' || url.hostname === 'api.getbring.com') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.destination === 'document') {
          return caches.match(BASE + '/index.html');
        }
      });
    })
  );
});
