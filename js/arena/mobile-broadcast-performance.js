// DFL Arena mobile Broadcast performance + Safari blur compatibility.
//
// Keep the browser/Pixi animation scheduler native. A previous pass globally
// wrapped requestAnimationFrame to force 30fps on phone Broadcast views, but
// that made independent RAF users (Pixi, Broadcast UI, effects) drift against
// each other and could feel much choppier than a clean native cadence.
//
// This module now only owns the Safari-safe scenery blur path. Race timing,
// physics and renderer scheduling remain untouched.

const PHONE_MAX = 900;
const BLUR_POLL_MS = 120;
const BLUR_EPSILON = 0.12;

const isBroadcast = () => (location.hash || "").split("?")[0] === "#/broadcast";
const isPhoneBroadcast = () => isBroadcast() && Math.min(innerWidth, innerHeight) <= PHONE_MAX;

if (!document.getElementById("arena-mobile-performance-css")) {
  const style = document.createElement("style");
  style.id = "arena-mobile-performance-css";
  style.textContent = `
@media(max-width:900px){
  .bc-stage.arena-mobile-performance .race-scenery{
    filter:blur(var(--arena-mobile-blur,0px))!important;
    -webkit-filter:blur(var(--arena-mobile-blur,0px))!important;
    transform:scale(1.012);
    transform-origin:center;
    contain:paint;
    will-change:transform;
  }
  .bc-stage.arena-mobile-performance[data-course-stopped="true"] .race-scenery{
    filter:none!important;
    -webkit-filter:none!important;
  }
}
`;
  document.head.appendChild(style);
}

let blurTimer = 0;
let lastBlur = -1;

function syncMobileScenery() {
  const stage = document.querySelector("#bc-stage");
  if (!stage || !isPhoneBroadcast()) {
    stage?.classList.remove("arena-mobile-performance");
    lastBlur = -1;
    return;
  }

  stage.classList.add("arena-mobile-performance");
  const motion = Number.parseFloat(stage.style.getPropertyValue("--arena-motion")) || 0;
  const px = Math.min(2.6, Math.max(0, motion * 2.6));
  if (lastBlur >= 0 && Math.abs(px - lastBlur) < BLUR_EPSILON) return;
  lastBlur = px;
  stage.style.setProperty("--arena-mobile-blur", `${px.toFixed(2)}px`);
}

function startBlurSync() {
  clearInterval(blurTimer);
  syncMobileScenery();
  blurTimer = window.setInterval(syncMobileScenery, BLUR_POLL_MS);
}

window.addEventListener("hashchange", startBlurSync);
window.addEventListener("resize", syncMobileScenery, { passive: true });
window.addEventListener("orientationchange", () => setTimeout(syncMobileScenery, 80));
startBlurSync();
