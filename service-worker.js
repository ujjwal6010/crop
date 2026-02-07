const CACHE_NAME = 'agriscan-v40';
const ASSETS = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// Install Event: Cache essential assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching essential assets');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
            .then(() => self.clients.claim())
    );
});

// Fetch Event: Network First Strategy
self.addEventListener('fetch', (event) => {
    // We only want to handle GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                // If network succeeds, clone response to cache and return
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            })
            .catch(() => {
                // If network fails (offline), try the cache
                return caches.match(event.request).then((cachedResponse) => {
                    return cachedResponse || new Response('Offline: Resource not available', {
                        status: 503,
                        statusText: 'Service Unavailable'
                    });
                });
            })
    );
});
