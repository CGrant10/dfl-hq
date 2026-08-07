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

const CACHE_NAME = "dfl-hq-v1.16.1";

// Third party hosts worth keeping for offline use: the Supabase client, and
// the Google font the wordmark is set in (css2 serves the stylesheet,
// gstatic the font file itself - both are needed).
const CDN_HOSTS = new Set([
  "cdn.jsdelivr.net",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]);

const APP_SHELL = [
  "./",
  "./index.html",
  "./css/style.css",
  "./css/broadcast.css",
  "./css/golf.css",
  "./manifest.json",
  "./js/config.js",
  "./js/app.js",
  "./js/install.js",
  "./js/update.js",
  "./js/members.js",
  "./js/teams.js",
  "./js/theme.js",
  "./js/router.js",
  "./js/store.js",
  "./js/supabase.js",
  "./js/ui.js",
  "./js/crud.js",
  "./js/form.js",
  "./js/inline.js",
  "./js/sections.js",
  "./js/settings.js",
  "./js/sleeper.js",
  "./js/sync.js",
  "./js/pages/home.js",
  "./js/pages/rules.js",
  "./js/pages/keepers.js",
  "./js/pages/polls.js",
  "./js/pages/arena.js",
  "./js/pages/golf.js",
  "./js/pages/broadcast.js",
  "./js/arena/race.js",
  "./js/arena/sprites.js",
  "./js/pages/calendar.js",
  "./js/pages/history.js",
  "./js/pages/finances.js",
  "./js/pages/profile.js",
  "./js/pages/admin.js",
  "./js/pages/admin_sleeper.js",
  "./js/pages/admin_finance.js",
  "./js/pages/admin_finance_setup.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/logo-64.png",
  "./icons/logo-256.png",
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

/*
  "Network first" was only half true.

  fetch(request) uses the request's default cache mode, which consults the
  BROWSER's HTTP cache before the network. GitHub Pages serves assets with
  max-age=600, so for ten minutes after a release this handler happily
  returned ten-minute-old JavaScript and never touched the network - which
  is what made the Update button appear to do nothing: it cleared this
  worker and Cache Storage, reloaded, and landed straight back on the stale
  copy still sitting in the HTTP cache.

  "no-cache" means always ask the server, but send the validators, so an
  unchanged file comes back as an empty 304 rather than a fresh download.
  Freshness costs a round trip, not the bytes.

  Navigation requests are passed through untouched: mode "navigate" cannot
  be reconstructed, and the version check covers a stale document anyway.
*/
function revalidating(request) {
  if (request.mode === "navigate") return request;
  try {
    return new Request(request, { cache: "no-cache" });
  } catch {
    return request;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never cache league data - always talk to Supabase directly.
  if (url.hostname.endsWith("supabase.co")) return;

  // Sleeper is handled by the app itself (sleeper.js caches the big player
  // list on its own terms), so let those requests go straight through.
  if (url.hostname.endsWith("sleeper.app")) return;

  // version.txt is how the app spots a stale cache. Caching it here would
  // be self-defeating, so it always goes to the network.
  if (url.pathname.endsWith("/version.txt")) return;

  event.respondWith(
    fetch(revalidating(request))
      .then((response) => {
        // Stash a fresh copy of anything from our own origin, plus the
        // third parties the app genuinely depends on: the supabase-js
        // library and the brand font. Without the font hosts here the
        // wordmark silently falls back to the system face offline, which is
        // the one bit of the header anybody would notice.
        if (response.ok && (url.origin === location.origin || CDN_HOSTS.has(url.hostname))) {
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
