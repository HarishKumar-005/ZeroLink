// Enhanced service worker for ZeroLink PWA with improved caching strategy

const CACHE_VERSION = 'zerolink-v2';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAX_DYNAMIC_ITEMS = 50;

// Assets that should be cached immediately on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Next.js static assets will be cached on first fetch
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => {
        console.error('[SW] Failed to cache static assets:', err);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete any cache that doesn't match our current version
          if (!cacheName.startsWith(CACHE_VERSION)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  return self.clients.claim();
});

// Fetch event - network-first strategy for API calls, cache-first for static assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip chrome-extension and non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Network-first strategy for API routes and server actions
  if (url.pathname.startsWith('/api/') || request.method !== 'GET') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful GET responses
          if (request.method === 'GET' && response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(err => {
          console.warn('[SW] Network request failed, trying cache:', url.pathname);
          return caches.match(request).then(cachedResponse => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Offline - no cached data available' }),
              { 
                status: 503, 
                headers: { 'Content-Type': 'application/json' }
              }
            );
          });
        })
    );
    return;
  }

  // Cache-first strategy for static assets (HTML, CSS, JS, images, fonts)
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached response and update cache in background
          fetch(request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, networkResponse);
              });
            }
          }).catch(() => {
            // Network request failed, but we have cache - do nothing
          });
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request).then(response => {
          // Don't cache non-successful responses or opaque responses
          if (!response || response.status !== 200 || response.type === 'opaque') {
            return response;
          }

          const responseToCache = response.clone();
          
          // Determine which cache to use
          const cacheToUse = url.pathname === '/' || 
                             url.pathname.endsWith('.js') || 
                             url.pathname.endsWith('.css') ||
                             url.pathname.includes('/_next/') 
                             ? STATIC_CACHE : DYNAMIC_CACHE;

          caches.open(cacheToUse).then(cache => {
            cache.put(request, responseToCache);
            
            // Limit dynamic cache size
            if (cacheToUse === DYNAMIC_CACHE) {
              trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
            }
          });

          return response;
        }).catch(err => {
          console.error('[SW] Fetch failed:', err);
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Helper function to trim cache to a maximum number of items
function trimCache(cacheName, maxItems) {
  caches.open(cacheName).then(cache => {
    cache.keys().then(keys => {
      if (keys.length > maxItems) {
        // Delete oldest items
        const deleteCount = keys.length - maxItems;
        for (let i = 0; i < deleteCount; i++) {
          cache.delete(keys[i]);
        }
      }
    });
  });
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }).then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});
