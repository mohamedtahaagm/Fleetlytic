// Service Worker for Fleet Management System

// Version number for cache
const CACHE_VERSION = 'v1';
const CACHE_NAME = `fleet-management-cache-${CACHE_VERSION}`;

// Files to cache
const cacheFiles = [
  '/',
  '/index.html',
  '/styles.css',
  '/effects.css',
  '/script.js',
  '/auth.js',
  '/dashboard.js',
  '/events.js',
  '/vehicles.js',
  '/maintenance.js',
  '/fuel.js',
  '/drivers.js',
  '/users.js',
  '/reports.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
  // External images removed from initial cache list and will be handled differently
];

// External resources that need special CORS handling
const externalResources = [
  'https://b.top4top.io/p_33161q5ox1.png',
  'https://h.top4top.io/p_3364gj0tv1.png'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installed');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching files');
        // Cache standard files
        return cache.addAll(cacheFiles);
      })
      .then(() => {
        // Cache external resources with special handling
        return cacheExternalResources();
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[ServiceWorker] Cache error:', error);
        // Continue even if some resources fail to cache
        return self.skipWaiting();
      })
  );
});

// Function to cache external resources with no-cors mode
function cacheExternalResources() {
  return caches.open(CACHE_NAME).then(cache => {
    const fetchPromises = externalResources.map(url => {
      return fetch(url, { mode: 'no-cors' })
        .then(response => {
          if (response) {
            console.log(`[ServiceWorker] Cached external resource: ${url}`);
            return cache.put(url, response);
          }
        })
        .catch(error => {
          console.warn(`[ServiceWorker] Failed to cache ${url}:`, error);
          // Continue even if this resource fails
          return Promise.resolve();
        });
    });
    
    return Promise.all(fetchPromises);
  });
}

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activated');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Check if request is for an external resource that needs special handling
  const isExternalResource = externalResources.includes(event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request
        const fetchRequest = event.request.clone();
        
        // Use different fetch options based on the resource type
        const fetchOptions = isExternalResource ? { mode: 'no-cors' } : {};
        
        return fetch(fetchRequest, fetchOptions)
          .then((response) => {
            // For no-cors requests, we can't check status but can still cache the opaque response
            if (isExternalResource) {
              if (response) {
                // Clone the response for caching
                const responseToCache = response.clone();
                
                caches.open(CACHE_NAME)
                  .then((cache) => {
                    cache.put(event.request, responseToCache);
                  });
              }
              return response;
            }
            
            // For normal requests, check if valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch((error) => {
            console.log('[ServiceWorker] Fetch failed:', error);
            
            // For navigation requests, return a fallback page
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html');
            }
            
            // For image requests, you could return a fallback image
            if (event.request.destination === 'image') {
              return caches.match('/path/to/fallback-image.png');
            }
            
            // Return the error for other requests
            return new Response('Network error occurred', {
              status: 408,
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Handle service worker updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});
