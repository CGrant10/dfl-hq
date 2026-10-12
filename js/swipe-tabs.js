import { animateUi, cancelUiMotion } from './ui-motion.js';
import { mountHorizontalSwipe } from './horizontal-swipe.js';

export function mountSwipeTabs(surface, tabs, { getButtons = () => [...tabs.querySelectorAll('[role="tab"]')], getPanel = null, accepts = (_target) => true, exclude = 'a,button,input,select,textarea,summary,[contenteditable]', selected = button => button.getAttribute('aria-selected') === 'true' } = {}) {
  if (!surface) return () => {};
  let frame = 0, moving = null;
  const settling = new Map();
  const panel = getPanel || (() => {
    const id = getButtons().find(selected)?.getAttribute('aria-controls');
    return id && surface.querySelector?.(`#${CSS.escape(id)}`);
  });
  const canMove = () => typeof document !== 'undefined' && document.visibilityState === 'visible'
    && document.documentElement.dataset.uiMotion !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const restore = (settle = false) => {
    if (frame) cancelAnimationFrame(frame); frame = 0;
    if (!moving) return;
    const { node, original, offset } = moving; moving = null; node.style.transform = original;
    if (settle) animateUi(node, [{ transform:`translateX(${offset}px)` }, { transform:original || 'none' }], { duration:180 });
    else cancelUiMotion(node);
  };
  const swipe = mountHorizontalSwipe(surface, {
    accepts, exclude,
    onStart: () => restore(),
    onMove({ dx }) {
      if (!canMove()) { restore(); return; }
      const node = panel();
      if (moving && moving.node !== node) restore();
      if (node && !moving) { cancelUiMotion(node); moving = { node, original:node.style.transform, offset:0 }; }
      if (!moving) return;
      const list = getButtons(), index = list.findIndex(selected), hasNext = Boolean(list[index + (dx < 0 ? 1 : -1)]);
      moving.offset = Math.max(-64, Math.min(64, dx * (hasNext ? .6 : .15)));
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (moving) moving.node.style.transform = `translateX(${moving.offset}px)`; });
    },
    onEnd({ dx, valid }) {
      if (!valid) { restore(true); return; }
      const list = getButtons(), index = list.findIndex(selected), next = list[index + (dx < 0 ? 1 : -1)];
      restore(!next); next?.click();
      const incoming = next && panel();
      if (!incoming) return;
      const entrance = animateUi(incoming, [{ opacity:.6, transform:`translateX(${dx < 0 ? 32 : -32}px)` }, { opacity:1, transform:'none' }], { duration:240 });
      if (entrance) {
        incoming.dataset.uiSwipeSettling = 'true'; settling.set(incoming, entrance);
        const finish = () => { if (settling.get(incoming) === entrance) { settling.delete(incoming); delete incoming.dataset.uiSwipeSettling; } };
        entrance.finished.then(finish, finish);
      }
    },
  });
  const interrupt = () => {
    restore();
    for (const node of settling.keys()) { cancelUiMotion(node); delete node.dataset.uiSwipeSettling; }
    settling.clear();
  };
  if (typeof window !== 'undefined') window.addEventListener('dfl:ui-motion-change', interrupt);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', interrupt);
  return () => {
    swipe.stop(); interrupt();
    if (typeof window !== 'undefined') window.removeEventListener('dfl:ui-motion-change', interrupt);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', interrupt);
  };
}
