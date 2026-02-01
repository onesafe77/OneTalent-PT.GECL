
self.addEventListener('install', () => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients to take control immediately
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Unregister this service worker
      self.registration.unregister()
        .then(() => {
          console.log('Service Worker unregistered successfully.');
        })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  // Pass through all requests to the network
  event.respondWith(fetch(event.request));
});
