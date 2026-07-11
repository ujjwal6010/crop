// =============================================
// AgriScan Service Worker — v50 (Cache-First)
// True offline-first: all app-shell assets are
// served from cache on every request. Network is
// used only to update the cache in the background.
// =============================================

const CACHE_NAME = 'agriscan-v51';

// Complete app-shell asset manifest for 100% offline startup.
// Every resource the app needs to boot and run inference is listed here.
const APP_SHELL_ASSETS = [
    './',
    './index.html',
    './manifest.json',

    // Stylesheets
    './assets/style.css',
    './assets/fonts/fonts.css',

    // Local Fonts (self-hosted, replaces Google Fonts CDN)
    './assets/fonts/CormorantGaramond-Light.ttf',
    './assets/fonts/CormorantGaramond-Regular.ttf',
    './assets/fonts/CormorantGaramond-SemiBold.ttf',
    './assets/fonts/CormorantGaramond-LightItalic.ttf',
    './assets/fonts/CormorantGaramond-Italic.ttf',
    './assets/fonts/Inter-Light.ttf',
    './assets/fonts/Inter-Regular.ttf',

    // Icons
    './assets/icons/fav.png',

    // TensorFlow.js Core Library (local vendor copy)
    './vendor/tf.min.js',

    // TF.js GraphModel Weights (YOLOv8n-cls)
    './models/model.json',
    './models/group1-shard1of2.bin',
    './models/group1-shard2of2.bin',
    './models/metadata.yaml',

    // Application Logic
    './src/app.js'
];

// =============================================
// INSTALL: Pre-cache entire app shell
// =============================================
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching app shell assets (' + APP_SHELL_ASSETS.length + ' files)');
                return cache.addAll(APP_SHELL_ASSETS);
            })
            .then(() => {
                console.log('[SW] App shell cached successfully — offline startup ready');
                return self.skipWaiting();
            })
            .catch((err) => {
                console.error('[SW] Failed to cache app shell:', err);
            })
    );
});

// =============================================
// ACTIVATE: Purge stale caches from prior versions
// =============================================
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[SW] Purging stale cache:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
            .then(() => {
                console.log('[SW] Activated — claiming all clients');
                return self.clients.claim();
            })
    );
});

// =============================================
// FETCH: Cache-First Strategy
//
// 1. For GET requests to app-shell resources:
//    → Serve from cache immediately (fast, offline-safe).
//    → In the background, fetch from network and update
//      the cache for next load (stale-while-revalidate).
//
// 2. For non-GET requests (POST to /send-alert):
//    → Pass through to network (handled by app.js
//      IndexedDB sync queue if offline).
// =============================================
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests (API calls go straight to network)
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests (e.g., analytics, external APIs)
    const requestUrl = new URL(event.request.url);
    if (requestUrl.origin !== location.origin) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // CACHE HIT — serve immediately
            if (cachedResponse) {
                // Background revalidation: update cache with fresh copy
                const fetchPromise = fetch(event.request)
                    .then((networkResponse) => {
                        if (networkResponse && networkResponse.ok) {
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, networkResponse);
                            });
                        }
                        return networkResponse.clone();
                    })
                    .catch(() => {
                        // Network unavailable — silent fail, cache is valid
                    });

                // Don't wait for network — return cached version now
                return cachedResponse;
            }

            // CACHE MISS — try network, then cache the response
            return fetch(event.request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Both cache and network failed
                    return new Response(
                        '<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:4rem;">' +
                        '<h1>AgriScan Offline</h1>' +
                        '<p>This resource is not available offline. Please connect to the internet and reload.</p>' +
                        '</body></html>',
                        {
                            status: 503,
                            statusText: 'Service Unavailable',
                            headers: { 'Content-Type': 'text/html' }
                        }
                    );
                });
        })
    );
});
