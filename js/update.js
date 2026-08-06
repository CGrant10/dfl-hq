// =====================================================================
// update.js - "a new version is available" button
// ---------------------------------------------------------------------
// A service worker will eventually pick up new files on its own, but
// "eventually" is not good enough when you have just pushed a fix and
// somebody is staring at the old screen. This checks a plain text file
// on the server and offers a button that force-clears everything.
//
// THREE PLACES MUST MATCH on every release, or this button misfires:
//   1. APP_VERSION in js/config.js
//   2. CACHE_NAME  in sw.js
//   3. version.txt at the project root
// =====================================================================

import { APP_VERSION } from "./config.js";

const bar = () => document.getElementById("update");

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
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (window.caches) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
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

  el.addEventListener("click", (e) => {
    if (e.target.closest("#update-go")) forceUpdate();
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
