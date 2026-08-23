/* =====================================================================
   golf-theme.js - Golf content follows the active app theme
   ===================================================================== */

const GOLF_CONTENT_CLASS = "golf-content";

const onGolf = () => (location.hash || "#/home").split("?")[0] === "#/golf";

/* Mark the route without changing palette variables. Golf inherits the same
   light, dark, Medicine Wheel, or team theme as the rest of the app. */
export function syncGolfContentTheme() {
  document.body?.classList.toggle(GOLF_CONTENT_CLASS, onGolf());
}

/*
  Tournament controls predate commissioner roles and still call their access
  badge "Admin only". That is no longer true: an authenticated commissioner
  with Golf permission can use them, and Commissioner Owners inherit every
  commissioner permission. Keep the existing class/style, but make the words
  match the actual authorization model. Restrict this to Golf and to the exact
  legacy label so LIVE/Complete/etc badges are never touched.
*/
function paintAccessLabels() {
  if (!onGolf()) return;
  for (const badge of document.querySelectorAll("#golf-outing .admin-badge")) {
    if (badge.textContent?.trim() === "Admin only") {
      badge.textContent = "Commissioner";
      badge.title = "Commissioner access";
      badge.setAttribute("aria-label", "Commissioner access");
    }
  }
}

function sync() {
  syncGolfContentTheme();
  paintAccessLabels();
}

window.addEventListener("hashchange", sync);
sync();

new MutationObserver(paintAccessLabels).observe(document.body, {
  childList: true,
  subtree: true,
});
