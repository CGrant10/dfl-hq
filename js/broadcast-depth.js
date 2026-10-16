import { animateUi, cancelUiMotion } from './ui-motion.js';

// Scroll moves only large decorative artwork. Lineups, injury portraits and
// headlines keep their exact positions; no timer or frame loop runs at rest.
export function mountBroadcastDepth(root) {
  if (root.dataset.presentation !== 'editorial' || typeof IntersectionObserver !== 'function') return { enter() {}, stop() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sheen = document.createElement('span');
  sheen.className = 'bx-editorial-sheen'; sheen.setAttribute('aria-hidden', 'true');
  root.append(sheen);
  let stopped = false, visible = false, frame = 0;
  const allowed = () => !stopped && root.isConnected && visible && !document.hidden
    && !reduced.matches && document.documentElement.dataset.uiMotion !== 'off';
  const reset = () => {
    cancelAnimationFrame(frame); frame = 0;
    root.style.removeProperty('--bx-depth-y'); delete root.dataset.depthActive;
    cancelUiMotion(sheen);
  };
  const paint = () => {
    frame = 0;
    if (!allowed()) { reset(); return; }
    const box = root.getBoundingClientRect();
    const distance = (innerHeight / 2 - (box.top + box.height / 2)) / innerHeight;
    root.dataset.depthActive = 'true';
    root.style.setProperty('--bx-depth-y', `${Math.max(-6, Math.min(6, distance * 12)).toFixed(2)}px`);
  };
  const schedule = () => { if (allowed() && !frame) frame = requestAnimationFrame(paint); };
  const changed = () => { if (allowed()) schedule(); else reset(); };
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting); changed();
  }, { threshold: 0 });
  observer.observe(root);
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('dfl:ui-motion-change', changed);
  document.addEventListener('visibilitychange', changed);
  reduced.addEventListener('change', changed);
  return {
    enter() {
      schedule();
      if (allowed()) animateUi(sheen, [
        { opacity: 0, transform: 'translateX(-110%)' },
        { opacity: .55, offset: .4 },
        { opacity: 0, transform: 'translateX(110%)' },
      ], { duration: 650, easing: 'ease-in-out' });
    },
    stop() {
      stopped = true; reset(); observer.disconnect(); sheen.remove();
      window.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      window.removeEventListener('dfl:ui-motion-change', changed);
      document.removeEventListener('visibilitychange', changed); reduced.removeEventListener('change', changed);
    },
  };
}
