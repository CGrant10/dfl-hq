// DFL Arena mobile Broadcast performance + Safari blur compatibility.
//
// The race clock/simulation stays deterministic and full resolution. This
// module only limits how often a PHONE paints the Broadcast presentation and
// replaces the large animated SVG Gaussian blur with a cheaper CSS/WebKit
// blur. Desktop/OBS is untouched.

const PHONE_MAX = 900;
const FRAME_MS = 1000 / 30;
const BLUR_POLL_MS = 80;

const isBroadcast = () => (location.hash || "").split("?")[0] === "#/broadcast";
const isPhoneBroadcast = () => isBroadcast() && Math.min(innerWidth, innerHeight) <= PHONE_MAX;

// ---------------------------------------------------------------------
// 30fps phone presentation cap.
// requestAnimationFrame users still receive a normal high-resolution time,
// but a phone Broadcast callback waits until at least one 30fps frame slot.
// The underlying simulation uses wall-clock elapsed time, so this does NOT
// change race duration, seed, finish order, gaps or any saved result.
// ---------------------------------------------------------------------
const nativeRaf = window.requestAnimationFrame.bind(window);
const nativeCancel = window.cancelAnimationFrame.bind(window);
let tokenSeq = 1;
const jobs = new Map();

window.requestAnimationFrame = (callback) => {
  const token = tokenSeq++;
  const requestedAt = performance.now();
  const run = (now) => {
    const job = jobs.get(token);
    if (!job) return;
    if (isPhoneBroadcast() && now - requestedAt < FRAME_MS - 1) {
      job.nativeId = nativeRaf(run);
      return;
    }
    jobs.delete(token);
    callback(now);
  };
  const job = { nativeId: nativeRaf(run) };
  jobs.set(token, job);
  return token;
};

window.cancelAnimationFrame = (token) => {
  const job = jobs.get(token);
  if (job) {
    nativeCancel(job.nativeId);
    jobs.delete(token);
    return;
  }
  // Compatibility for any native id created before this module loaded.
  nativeCancel(token);
};

// ---------------------------------------------------------------------
// Mobile scenery blur.
//
// The Broadcast currently animates an SVG <feGaussianBlur> every frame.
// That is costly on phones and Safari/iOS can simply fail to display it when
// the filter is applied to an HTML scenery layer. On phones, override that
// rendered filter with a small GPU-friendly CSS blur. The existing JS may
// continue updating the detached/unrendered SVG primitive; it is no longer
// on the hot rendering path.
// ---------------------------------------------------------------------
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
    will-change:transform,filter;
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
function syncMobileScenery() {
  const stage = document.querySelector("#bc-stage");
  if (!stage || !isPhoneBroadcast()) {
    stage?.classList.remove("arena-mobile-performance");
    return;
  }

  stage.classList.add("arena-mobile-performance");
  const motion = Number.parseFloat(stage.style.getPropertyValue("--arena-motion")) || 0;
  // Enough softness to visibly read as speed on a condensed phone without
  // smearing the course into soup. Capped to keep the compositing cheap.
  const px = Math.min(2.6, Math.max(0, motion * 2.6));
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
