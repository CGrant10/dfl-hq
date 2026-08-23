/* =====================================================================
   golf-theme.js - Golf and Polls use a light content surface
   ===================================================================== */

const LIGHT_ROUTE_CLASS = "route-light-content";

const onGolf = () => (location.hash || "#/home").split("?")[0] === "#/golf";
const onLightRoute = () => ["#/golf", "#/polls"].includes((location.hash || "#/home").split("?")[0]);

/* Mark the route instead of repainting :root. The content view switches to
   light while the shell continues to follow the member's profile theme. */
export function syncGolfContentTheme() {
  document.body?.classList.toggle(LIGHT_ROUTE_CLASS, onLightRoute());
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
