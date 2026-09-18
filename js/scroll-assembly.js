// =====================================================================
// scroll-assembly.js - Home's bands come together as you scroll to them
// ---------------------------------------------------------------------
// One number per part per frame, written to --a: 1 while the part is still
// low on the screen, 0 once it has risen past the settle line. Every effect
// is arithmetic on that in CSS (see "SCROLL ASSEMBLY" in css/home.css), so
// the shape of the motion lives with the styles and only the measurement
// lives here.
//
// It is bound to scroll POSITION rather than triggered once on entry, which
// is the whole point: scrolling back up raises --a again and the bands pull
// apart. A reveal that fires once can only ever happen to you in one
// direction.
//
// WHAT THIS DELIBERATELY LEAVES ALONE: the broadcast stage. It runs its own
// cross-fade between slides (see paint() in broadcast-stage.js) and owns the
// transform on .bx-slide while a swap is in flight; a second system writing
// transforms to the same element would fight it mid-animation.
// =====================================================================

/* Where a part is considered assembled, as a fraction of the viewport from
   the top. 0.62 means a part settles once its middle has risen past the top
   62% of the screen - high enough that nobody reads a row that is still
   moving, low enough that the assembly is visible rather than happening off
   the bottom edge. */
const SETTLE = 0.62;

/* rAF is the fast path; this is the guarantee. See the comment on schedule(). */
const FALLBACK_MS = 80;

/**
 * How far from assembled a part is, 1 (scattered) to 0 (in place).
 *
 * Exported for its own sake: it is the only arithmetic here, and a wrong
 * clamp is invisible in a browser but obvious in a test.
 *
 * @param {DOMRect|{top:number,height:number}} rect  the part's box
 * @param {number} viewH  the viewport height
 */
export function assemblyProgress(rect, viewH) {
  if (!rect || !(viewH > 0)) return 0;
  const middle = rect.top + rect.height / 2;
  const settleAt = viewH * SETTLE;
  const span = viewH - settleAt;
  if (!(span > 0)) return 0;
  return Math.min(1, Math.max(0, (middle - settleAt) / span));
}

/**
 * Drive every [data-assemble] part inside `root` from the window's scroll.
 *
 * @param {Element} root
 * @returns {Function} stop, which unbinds and leaves every part assembled
 */
export function startAssembly(root) {
  const parts = root ? [...root.querySelectorAll("[data-assemble]")] : [];
  if (!parts.length) return () => {};

  const calm = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  let stopped = false;

  const paint = () => {
    if (stopped) return;
    /* A viewport with no height means the page is not laid out yet - a route
       still measuring itself, a hidden tab. Every part would divide against
       nothing and pin to "scattered", which reads as a broken page rather
       than an un-scrolled one, so assemble instead. */
    const viewH = globalThis.innerHeight || 0;
    const off = !viewH || calm?.matches === true;
    for (const part of parts) {
      part.style.setProperty("--a", off ? 0 : assemblyProgress(part.getBoundingClientRect(), viewH));
    }
  };

  /*
    COALESCED, BUT NEVER DEPENDENT ON requestAnimationFrame.

    The obvious shape is a `queued` flag cleared inside a rAF callback. It
    deadlocks: rAF does not run while the surface is not drawing - a
    backgrounded tab, an occluded window - so the flag latches true and the
    parts freeze wherever they were, which looks exactly like the effect
    having broken. paint() is idempotent, so a timer can race the frame and
    whichever lands first wins.
  */
  let queued = false;
  const schedule = () => {
    if (queued || stopped) return;
    queued = true;
    const run = () => { queued = false; paint(); };
    globalThis.requestAnimationFrame?.(run);
    setTimeout(run, FALLBACK_MS);
  };

  globalThis.addEventListener("scroll", schedule, { passive: true });
  globalThis.addEventListener("resize", schedule, { passive: true });
  calm?.addEventListener?.("change", paint);
  paint();

  return () => {
    stopped = true;
    globalThis.removeEventListener("scroll", schedule);
    globalThis.removeEventListener("resize", schedule);
    calm?.removeEventListener?.("change", paint);
    /* Leave the page in the state a reader should see if nothing ever drives
       it again: assembled. */
    for (const part of parts) part.style.setProperty("--a", 0);
  };
}
