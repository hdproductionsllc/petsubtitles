const CACHE_NAME = "whatmypetthinks-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/og-image.png",
  "/samples/cat-judging.jpg",
  "/samples/cat-judging-thumb.jpg",
  "/samples/cat-stare.jpg",
  "/samples/cat-stare-thumb.jpg",
  "/samples/dog-begging.jpg",
  "/samples/dog-begging-thumb.jpg",
  "/samples/dog-guilty.jpg",
  "/samples/dog-guilty-thumb.jpg",
  "/samples/kitten-surprised.jpg",
  "/samples/kitten-surprised-thumb.jpg",
  "/samples/puppy-mess.jpg",
  "/samples/puppy-mess-thumb.jpg",
];

// Install — cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Skip non-GET and API requests
  if (request.method !== "GET" || request.url.includes("/api/")) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses for static assets
        if (response.ok && response.type === "basic") {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          // Return cached home page for navigation requests (SPA fallback)
          if (request.mode === "navigate") {
            return caches.match("/");
          }
          return new Response("Offline", { status: 503 });
        });
      })
  );
});
