// =====================================================================
// update.js - "a new version is available" button
// ---------------------------------------------------------------------
// A service worker will eventually pick up new files on its own, but
// "eventually" is not good enough when you have just pushed a fix and
// somebody is staring at the old screen. This checks a plain text file
// on the server and offers a button that force-clears everything.
//
// RELEASE SOURCES:
//   1. the dfl-app-version meta in index.html (read by config.js)
//   2. CACHE_NAME in sw.js
//   3. version.txt at the project root
// config.js deliberately reads (1), so it cannot drift independently.
// =====================================================================

/* Arena finish-line presentation is global to the shared race viewer, so it
   rides with this always-loaded module instead of becoming another script tag
   that can drift out of the app shell. */
/*
  THE SECOND FINISH LINE IS GONE, AND IT WAS THE BOOMERANG.

  js/arena-finish-line.js was a global requestAnimationFrame loop that wrote
  --course-finish-x and overrode `left` with !important, so it beat the
  time-derived --finish-x that broadcast.js writes. Two systems, one position,
  and the one that won was driven by leaderRatio() - the DRAWN leader position,
  read back out of the DOM.

  Drawn progress is NOT MONOTONIC. Collapses are a feature, so `shown` is allowed
  to move backwards, and finishArrival()'s own comment records what that costs:
  "measured over 25 seeded races the stripe reversed in 8 of them", followed by
  "Do not reintroduce a progress-driven reveal." That is exactly what came back,
  and the finish line boomerangged.

  Its two good behaviours were kept and moved to where they belong: the start
  gate hides once the field is away (css/broadcast.css), and the course stops
  travelling when the structure is home (finish.courseStopped, written once per
  frame from the same clock as everything else).
*/
import { APP_VERSION } from "./config.js";

const bar = () => document.getElementById("update");

/**
 * The page module names, so the updater can refresh pages nobody has opened.
 *
 * Deliberately NOT a static `import { routeNames } from "./router.js"`. This
 * file's whole job is coping with a device holding a mismatched set of files,
 * and a static import of a symbol that an older router.js does not export is a
 * hard module-link failure - the app would not boot at all, which is a far
 * worse bug than the one being fixed. A dynamic read degrades instead: an
 * older router just means falling back to the routes the tab bar advertises.
 */
async function routeList() {
  try {
    const router = await import("./router.js");
    if (typeof router.routeNames === "function") return router.routeNames();
  } catch {
    /* fall through */
  }
  return [...document.querySelectorAll("#tabbar a[data-route]")]
    .map((a) => a.dataset.route)
    .filter(Boolean);
}

/**
 * Every app file this device could be holding a stale copy of.
 *
 * Worked out at runtime rather than hand-listed: whatever the page actually
 * loaded (from the Performance timeline) plus the page modules the router
 * can lazily import, which may not have been visited yet. A hardcoded list
 * would rot the first time somebody adds a file and forgets this one.
 *
 * Cross-origin files are left out. The only one is the Supabase library,
 * which is pinned to a version in its URL and so can never go stale.
 */
async function appFiles() {
  const base = new URL(".", location.href).href;   // the folder the app sits in

  const loaded = performance.getEntriesByType("resource")
    .map((e) => e.name.split("?")[0])
    .filter((n) => n.startsWith(location.origin) && /\.(js|css|json|html)$/.test(n));

  const pages = (await routeList()).map((n) => `${base}js/pages/${n}.js`);
  const shell = ["", "index.html", "css/style.css", "manifest.json", "sw.js"]
    .map((p) => base + p);

  return [...new Set([...shell, ...loaded, ...pages])];
}

/**
 * Pull every app file straight from the server, bypassing the HTTP cache.
 *
 * This is the part the Update button was missing. Clearing Cache Storage and
 * the service worker still left the browser's own HTTP cache holding the old
 * files, so the reload came back on the same version it started on. The
 * "reload" cache mode skips that cache on the way out AND replaces what is
 * in it, so the reload that follows gets the new code.
 */
async function refetchAll() {
  const files = await appFiles();
  const results = await Promise.allSettled(
    files.map((url) => fetch(url, { cache: "reload" }))
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed) console.warn(`Update: ${failed} of ${files.length} files could not be refreshed`);
}

/** "1.4.10" > "1.4.9" - compared piece by piece, not as text. */
function isNewer(remote, local) {
  const a = String(remote).trim().split(".").map(Number);
  const b = String(local).trim().split(".").map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0, y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

/** What version is on the server right now? */
async function serverVersion() {
  // cache:no-store AND a cache-buster, because this one file must never
  // come from a cache - it is the thing telling us the cache is stale.
  const res = await fetch(`version.txt?cb=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`version.txt returned ${res.status}`);
  const text = (await res.text()).trim();
  if (!/^\d+(\.\d+)*$/.test(text)) throw new Error(`version.txt looks wrong: "${text.slice(0, 30)}"`);
  return text;
}

/**
 * Throw away every cached file and the service worker, then reload.
 * Deliberately heavy-handed: it is the button people press when the app
 * is being stubborn.
 */
export async function forceUpdate() {
  try {
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // Pull every file straight from the server, bypassing the HTTP cache.
    await refetchAll();

    /*
      The worker is UPDATED, not unregistered.

      Unregistering was the mistake: the worker is the one component that
      revalidates every request (see revalidating() in sw.js), so throwing it
      away left the reload depending on the browser HTTP cache - and a module
      already in the page's module map is not re-fetched at all. That is how
      an update could appear to succeed while the app carried on running the
      previous version's JavaScript.

      Keeping it registered and calling update() means the reload is served by
      a worker that always asks the server.
    */
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.update().catch(() => {})));
    }
  } catch (err) {
    console.warn("Update cleanup failed, reloading anyway", err);
  }
  // Keep the page they were on, add a cache-buster to beat the HTTP cache.
  location.replace(`${location.pathname}?u=${Date.now()}${location.hash}`);
}

/**
 * Compare versions and show the bar if the server is ahead.
 * @param {boolean} announce  when true, also report "you are up to date"
 * @returns {Promise<{current:string, latest:string, stale:boolean}>}
 */
export async function checkForUpdate(announce = false) {
  const latest = await serverVersion();
  const stale = isNewer(latest, APP_VERSION);

  const el = bar();
  if (stale && el) {
    el.innerHTML = `
      <span class="install-text">Version ${latest} is available. You have ${APP_VERSION}.</span>
      <button class="btn small" id="update-go">Update</button>
      <button class="install-x" id="update-no" aria-label="Later">&times;</button>
    `;
    el.classList.remove("hidden");
  } else if (announce && el) {
    el.innerHTML = `<span class="install-text">You are up to date (v${APP_VERSION}).</span>
      <button class="install-x" id="update-no" aria-label="Close">&times;</button>`;
    el.classList.remove("hidden");
    setTimeout(() => el.classList.add("hidden"), 3500);
  }

  return { current: APP_VERSION, latest, stale };
}

export function setupUpdates() {
  const el = bar();
  if (!el) return;

  el.addEventListener("click", async (e) => {
    const go = e.target.closest("#update-go");
    if (go) {
      go.disabled = true;
      go.textContent = "Updating…";
      el.querySelector("#update-no")?.remove();
      await forceUpdate();
      return;
    }
    if (e.target.closest("#update-no")) el.classList.add("hidden");
  });

  // Quietly on start-up...
  checkForUpdate().catch(() => {});

  // ...and whenever the app is brought back to the foreground, which is
  // when an installed PWA would otherwise sit on a stale version for days.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) checkForUpdate().catch(() => {});
  });
}
