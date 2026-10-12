// Minimal service worker: enables installability. No caching yet.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intentionally empty: requests go straight to the network.
self.addEventListener("fetch", () => {});
