import { animateUi, cancelUiMotion } from './ui-motion.js';

let active;
const primary = new Set(['home', 'clubhouse', 'sportsbook', 'trade', 'analyzer']);
const duration = 220;

// Use the indicator's current position when another tap interrupts navigation.
export function routeDirection(from, to, bar = document.getElementById('tabbar')) {
  if (from === to || !primary.has(from) || !primary.has(to) || !bar) return 0;
  const buttons = [...bar.querySelectorAll('a[data-route]')];
  const next = buttons.find(button => button.dataset.route === to);
  const previous = buttons.find(button => button.dataset.route === from);
  if (!next || !previous) return 0;
  let center = previous.offsetLeft + previous.offsetWidth / 2;
  if (bar.classList.contains('has-indicator')) {
    const style = getComputedStyle(bar, '::before');
    const width = parseFloat(style.width);
    if (style.transform !== 'none' && Number.isFinite(width)) {
      center = new DOMMatrixReadOnly(style.transform).m41 + width / 2;
    }
  }
  return Math.sign(next.offsetLeft + next.offsetWidth / 2 - center);
}

export function beginRouteGlide(from, to) {
  const direction = document.documentElement.dataset.matchupTransition||document.documentElement.dataset.receiptTransition?0:routeDirection(from, to);
  active?.cancel();
  let surface, started = 0, cancelled = false, generation = 0;
  const cleanSurface = () => {
    if (surface) { cancelUiMotion(surface); delete surface.dataset.routeGliding; }
  };
  const cancel = () => {
    cancelled = true;
    generation++;
    cleanSurface();
    window.removeEventListener('resize', cancel);
    window.removeEventListener('dfl:ui-motion-change', cancel);
    document.removeEventListener('visibilitychange', onVisibility);
    if (active === controller) active = undefined;
  };
  const onVisibility = () => { if (document.hidden) cancel(); };
  const play = (node, frames, ms, final = false) => {
    const token = ++generation;
    surface = node;
    node.dataset.routeGliding = '1';
    const complete = () => {
      if (token !== generation) return;
      delete node.dataset.routeGliding;
      if (final) cancel();
    };
    const animation = animateUi(node, frames, { duration: ms });
    if (animation) animation.finished.then(complete, complete);
    else complete();
  };
  const controller = {
    cancel,
    start(placeholder) {
      if (!direction || cancelled) return;
      started = performance.now();
      // Only move skeleton content, keeping its background edge to edge.
      play(placeholder.firstElementChild || placeholder, [
        { opacity: .5, transform: `translateX(${direction * 28}px)` },
        { opacity: 1, transform: 'translateX(0)' },
      ], duration);
    },
    ready(view) {
      if (!direction || cancelled) { cancel(); return false; }
      const style = surface?.isConnected ? getComputedStyle(surface) : null;
      const transform = style?.transform || 'none';
      const opacity = style?.opacity || '1';
      const remaining = Math.max(0, duration - (performance.now() - started));
      cleanSurface();
      view.classList.remove('page-in', 'page-switching');
      // Continue a fast load's existing slide. A slow load only fades in.
      play(view, [
        { opacity: remaining > 0 ? opacity : .65, transform },
        { opacity: 1, transform: 'translateX(0)' },
      ], remaining > 0 ? Math.max(80, remaining) : 100, true);
      return true;
    },
  };
  active = controller;
  window.addEventListener('resize', cancel);
  window.addEventListener('dfl:ui-motion-change', cancel);
  document.addEventListener('visibilitychange', onVisibility);
  return controller;
}
