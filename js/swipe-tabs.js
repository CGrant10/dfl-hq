import { animateUi, cancelUiMotion } from './ui-motion.js';

// Touch navigation complements the existing click and keyboard tab controls.
export function mountSwipeTabs(surface, tabs) {
  if (!surface) return () => {};
  let gesture = null, suppressUntil = 0, frame = 0, moving = null;
  const settling = new Map();
  const buttons = () => [...tabs.querySelectorAll('[role="tab"]')];
  const panel = () => {
    const id = buttons().find(button => button.getAttribute('aria-selected') === 'true')?.getAttribute('aria-controls');
    return id && surface.querySelector?.(`#${CSS.escape(id)}`);
  };
  const canMove = () => typeof document !== 'undefined' && document.visibilityState === 'visible'
    && document.documentElement.dataset.uiMotion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restore = (settle = false) => {
    if (frame) cancelAnimationFrame(frame); frame = 0;
    if (!moving) return;
    const { node, original, offset } = moving; moving = null;
    node.style.transform = original;
    if (settle) animateUi(node, [{ transform:`translateX(${offset}px)` }, { transform:original || 'none' }], { duration:180 });
    else cancelUiMotion(node);
  };
  const down = event => {
    if (!event.isPrimary) { gesture = null; restore(); return; }
    if (event.pointerType === 'mouse' || event.button !== 0 || event.target.closest('a,button,input,select,textarea,summary,[contenteditable]') || String(getSelection())) return;
    restore();
    gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, at:performance.now(), horizontal:false };
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
    if (!gesture.horizontal && dy > 12 && dy >= dx) { gesture = null; restore(); return; }
    if (dx > 16 && dx > dy * 1.4) {
      gesture.horizontal = true;
      if (!surface.hasPointerCapture(event.pointerId)) surface.setPointerCapture(event.pointerId);
      if (canMove()) {
        const node = panel();
        if (node && !moving) { cancelUiMotion(node); moving = { node, original:node.style.transform, offset:0 }; }
        if (moving) {
          const list = buttons(), index = list.findIndex(button => button.getAttribute('aria-selected') === 'true');
          const delta = event.clientX - gesture.x;
          const hasNext = Boolean(list[index + (delta < 0 ? 1 : -1)]);
          moving.offset = Math.max(-64, Math.min(64, delta * (hasNext ? .6 : .15)));
          if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (moving) moving.node.style.transform = `translateX(${moving.offset}px)`; });
        }
      } else restore();
    }
  };
  const end = event => {
    const current = gesture; gesture = null;
    if (!current || event.pointerId !== current.id || event.type !== 'pointerup') { restore(); return; }
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (!current.horizontal || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4 || performance.now() - current.at > 850) { restore(true); return; }
    suppressUntil = performance.now() + 400;
    const list = buttons();
    const index = list.findIndex(button => button.getAttribute('aria-selected') === 'true');
    const next = list[index + (dx < 0 ? 1 : -1)];
    restore(!next);
    // Clicking keeps one source of truth, including the shared moving highlight.
    next?.click();
    if (next) {
      const incoming = panel();
      if (incoming) {
        const entrance = animateUi(incoming, [{ opacity:.6, transform:`translateX(${dx < 0 ? 32 : -32}px)` }, { opacity:1, transform:'none' }], { duration:240 });
        if (entrance) {
          incoming.dataset.uiSwipeSettling = 'true';
          settling.set(incoming, entrance);
          const finish = () => { if (settling.get(incoming) === entrance) { settling.delete(incoming); delete incoming.dataset.uiSwipeSettling; } };
          entrance.finished.then(finish, finish);
        }
      }
    }
  };
  const click = event => {
    if (performance.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  // Touch starts with implicit capture on the child. Moving capture to the
  // panel emits a bubbling loss from that child; it does not end our swipe.
  const lost = event => { if (event.target === surface) end(event); };
  const interrupt = () => {
    gesture = null; restore();
    for (const node of settling.keys()) { cancelUiMotion(node); delete node.dataset.uiSwipeSettling; }
    settling.clear();
  };
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  surface.addEventListener('lostpointercapture', lost);
  surface.addEventListener('click', click, true);
  if (typeof window !== 'undefined') window.addEventListener('dfl:ui-motion-change', interrupt);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', interrupt);
  return () => {
    interrupt();
    surface.removeEventListener('pointerdown', down);
    surface.removeEventListener('pointermove', move);
    surface.removeEventListener('pointerup', end);
    surface.removeEventListener('pointercancel', end);
    surface.removeEventListener('lostpointercapture', lost);
    surface.removeEventListener('click', click, true);
    if (typeof window !== 'undefined') window.removeEventListener('dfl:ui-motion-change', interrupt);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', interrupt);
  };
}
