/* =====================================================================
   DFL HQ - service worker
   ---------------------------------------------------------------------
   Strategy:
     * App files (HTML/CSS/JS/icons) -> network first, fall back to cache.
       You always get the newest code when online, and the app still opens
       on a plane.
     * Supabase API calls -> never cached. League data must be live.

   IMPORTANT: bump CACHE_NAME whenever you change any file, otherwise
   phones may keep showing the old version. Keep it in step with
   APP_VERSION in js/config.js.
   ===================================================================== */

const CACHE_NAME = "dfl-hq-v1.0.3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./manifest.webmanifest",
  "./js/config.js",
  "./js/app.js",
  "./js/router.js",
  "./js/store.js",
  "./js/supabase.js",
  "./js/ui.js",
  "./js/crud.js",
  "./js/pages/home.js",
  "./js/pages/rules.js",
  "./js/pages/keepers.js",
  "./js/pages/polls.js",
  "./js/pages/calendar.js",
  "./js/pages/history.js",
  "./js/pages/admin.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache league data - always talk to Supabase directly.
  if (url.hostname.endsWith("supabase.co")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Stash a fresh copy of anything from our own origin (plus the
        // supabase-js library from the CDN) for offline use.
        if (response.ok && (url.origin === location.origin || url.hostname === "cdn.jsdelivr.net")) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Deep link opened while offline -> serve the app shell.
        if (request.mode === "navigate") return caches.match("./index.html");
        return Response.error();
      })
  );
});
