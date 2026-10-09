// One navigation surface follows the active route or the open More sheet.
let indicatorFrame;
function setTabIndicatorTarget(target, animate) {
  const bar = document.getElementById("tabbar");
  if (!bar || !target) return;
  const still = !animate || !bar.classList.contains("has-indicator");
  if (still) bar.classList.add("indicator-still");
  bar.style.setProperty("--tab-x", `${target.offsetLeft}px`);
  bar.style.setProperty("--tab-w", `${target.offsetWidth}px`);
  bar.style.setProperty("--tab-y", `${target.offsetTop}px`);
  bar.style.setProperty("--tab-h", `${target.offsetHeight}px`);
  bar.classList.add("has-indicator");
  if (still) {
    // Commit the new geometry without travelling during initial layout/rotation.
    void bar.offsetWidth;
    cancelAnimationFrame(indicatorFrame);
    indicatorFrame = requestAnimationFrame(() => bar.classList.remove("indicator-still"));
  }
}
export function syncTabIndicator({ animate = true } = {}) {
  const bar = document.getElementById("tabbar");
  if (!bar) return;
  const more = document.getElementById("more-btn");
  const active = more?.getAttribute("aria-expanded") === "true" ? more : bar.querySelector("a.on") ||
    (more?.classList.contains("on") ? more : null);
  if (!active) { bar.classList.remove("has-indicator"); return; }
  setTabIndicatorTarget(active, animate);
}

export function mountNavHighlight(bar) {
  const settleIndicator = () => syncTabIndicator({ animate: false });
  window.addEventListener("resize", settleIndicator);
  window.addEventListener("dfl:ui-motion-change", settleIndicator);
  document.addEventListener("visibilitychange", settleIndicator);
  if (bar) {
    const size = new ResizeObserver(settleIndicator);
    size.observe(bar);
    bar.querySelectorAll("a,.tabmore").forEach(tab => size.observe(tab));
  }
  syncTabIndicator({ animate: false });
}
