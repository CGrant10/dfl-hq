// =====================================================================
// install.js - "Add to Home Screen" help
// ---------------------------------------------------------------------
// Two completely different worlds:
//
//   Android / Chrome / Edge
//     The browser fires `beforeinstallprompt`. We catch it, stop the
//     default mini-bar, and show our own Install button that calls
//     prompt() when tapped.
//
//   iPhone / iPad Safari
//     Apple has no install API at all. The only way in is Share ->
//     Add to Home Screen, so all we can do is show the instruction.
//
// Either way the banner disappears for good once the app is installed,
// or once the user dismisses it.
// =====================================================================

const DISMISSED = "dfl.installDismissed";

/** True when the app is already running from the home screen. */
export function isInstalled() {
  return window.matchMedia("(display-mode: standalone)").matches ||
         window.matchMedia("(display-mode: minimal-ui)").matches ||
         window.navigator.standalone === true;   // older iOS
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
         // iPadOS 13+ reports itself as a Mac, but it has a touch screen
         (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isSafari() {
  return /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(navigator.userAgent);
}

export function setupInstall() {
  if (isInstalled() || localStorage.getItem(DISMISSED)) return;

  const bar = document.getElementById("install");
  if (!bar) return;

  let deferred = null;

  const show = (html) => {
    bar.innerHTML = html;
    bar.classList.remove("hidden");
  };

  const hide = (remember) => {
    bar.classList.add("hidden");
    if (remember) localStorage.setItem(DISMISSED, "1");
  };

  // ---- Android / Chrome / Edge -------------------------------------
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();                 // suppress the browser's own bar
    deferred = e;
    show(`
      <span class="install-text">Install DFL HQ for full screen and faster loading.</span>
      <button class="btn small" id="install-go">Install</button>
      <button class="install-x" id="install-no" aria-label="Dismiss">&times;</button>
    `);
  });

  // ---- iPhone / iPad Safari ----------------------------------------
  if (isIos() && isSafari()) {
    show(`
      <span class="install-text">
        Add to your home screen: tap <strong>Share</strong>, then
        <strong>Add to Home Screen</strong>.
      </span>
      <button class="install-x" id="install-no" aria-label="Dismiss">&times;</button>
    `);
  }

  bar.addEventListener("click", async (e) => {
    if (e.target.closest("#install-no")) { hide(true); return; }

    if (e.target.closest("#install-go") && deferred) {
      hide(false);
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") localStorage.setItem(DISMISSED, "1");
      deferred = null;
    }
  });

  // Installed while the page was open - never nag again.
  window.addEventListener("appinstalled", () => hide(true));
}
