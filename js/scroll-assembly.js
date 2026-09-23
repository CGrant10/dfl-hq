// =====================================================================
// scroll-assembly.js - one quiet, one-time fade for Home sections
// ---------------------------------------------------------------------
// The earlier version bound transforms to scroll position. Laurels travelled,
// ranking rows arrived from alternating sides and report columns scaled every
// time the reader reversed direction. That was more movement than information.
// Each part now fades once when it first enters the viewport, then stays put.
//
// WHAT THIS DELIBERATELY LEAVES ALONE: the broadcast stage. It runs its own
// cross-fade between functional slides and is not a scroll decoration.
// =====================================================================

/**
 * Reveal every [data-assemble] part once as it enters the viewport.
 *
 * @param {Element} root
 * @returns {Function} stop, which unbinds and leaves every part visible
 */
export function startAssembly(root) {
  const parts = root ? [...root.querySelectorAll("[data-assemble]")] : [];
  if (!parts.length) return () => {};

  const calm = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)") || null;
  const reveal = part => part.classList.add("is-scroll-visible");
  const Observer = globalThis.IntersectionObserver;
  if (calm?.matches === true || typeof Observer !== "function") {
    parts.forEach(reveal);
    return () => {};
  }

  root.classList.add("has-scroll-fade");
  const observer = new Observer(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      reveal(entry.target);
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
  parts.forEach(part => observer.observe(part));

  return () => {
    observer.disconnect();
    root.classList.remove("has-scroll-fade");
    parts.forEach(reveal);
  };
}
