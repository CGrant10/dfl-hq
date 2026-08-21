// DFL Arena mobile orientation gate.
// The race is a wide broadcast composition. On a phone, portrait mode is not
// a compressed version of that composition; it is the wrong composition.
// Block the spectator view until the device is landscape, while leaving
// desktop/tablet portrait layouts and every non-Broadcast route alone.

const PHONE_MAX = 900;
let overlay = null;

function isBroadcast() {
  return (location.hash || "").split("?")[0] === "#/broadcast";
}

function needsLandscape() {
  return isBroadcast()
    && window.innerWidth <= PHONE_MAX
    && window.matchMedia?.("(orientation: portrait)")?.matches;
}

function ensureOverlay() {
  if (overlay?.isConnected) return overlay;
  overlay = document.createElement("div");
  overlay.className = "arena-rotate-gate";
  overlay.setAttribute("role", "status");
  overlay.setAttribute("aria-live", "polite");
  overlay.innerHTML = `
    <div class="arena-rotate-card">
      <div class="arena-rotate-phone" aria-hidden="true">▯</div>
      <strong>Rotate for the race</strong>
      <span>The Arena is built for landscape. Turn your phone sideways to continue.</span>
    </div>`;
  document.body.appendChild(overlay);
  return overlay;
}

function paint() {
  const show = needsLandscape();
  document.body.classList.toggle("arena-needs-landscape", show);
  if (show) ensureOverlay();
  else overlay?.remove();
}

if (!document.getElementById("arena-landscape-gate-css")) {
  const style = document.createElement("style");
  style.id = "arena-landscape-gate-css";
  style.textContent = `
.arena-rotate-gate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:#090b0f;color:#fff;text-align:center}
.arena-rotate-card{display:grid;justify-items:center;gap:10px;max-width:340px}
.arena-rotate-phone{font-size:54px;line-height:1;transform:rotate(90deg);animation:arena-rotate-nudge 1.7s ease-in-out infinite}
.arena-rotate-card strong{font-size:22px;letter-spacing:.02em}.arena-rotate-card span{font-size:14px;line-height:1.45;color:#aeb6c2}
body.arena-needs-landscape{overflow:hidden!important}
@keyframes arena-rotate-nudge{0%,100%{transform:rotate(90deg) translateY(0)}50%{transform:rotate(90deg) translateY(-5px)}}
@media(min-width:901px){.arena-rotate-gate{display:none!important}}
`;
  document.head.appendChild(style);
}

window.addEventListener("resize", paint, { passive: true });
window.addEventListener("orientationchange", () => setTimeout(paint, 80));
window.addEventListener("hashchange", paint);
queueMicrotask(paint);
