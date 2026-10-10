// Touch navigation complements the existing click and keyboard tab controls.
export function mountSwipeTabs(surface, tabs) {
  if (!surface) return () => {};
  let gesture = null, suppressUntil = 0;
  const down = event => {
    if (!event.isPrimary) { gesture = null; return; }
    if (event.pointerType === 'mouse' || event.button !== 0 || event.target.closest('a,button,input,select,textarea,summary,[contenteditable]') || String(getSelection())) return;
    gesture = { id:event.pointerId, x:event.clientX, y:event.clientY, at:performance.now(), horizontal:false };
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = Math.abs(event.clientX - gesture.x), dy = Math.abs(event.clientY - gesture.y);
    if (!gesture.horizontal && dy > 12 && dy >= dx) { gesture = null; return; }
    if (dx > 16 && dx > dy * 1.4) {
      gesture.horizontal = true;
      if (!surface.hasPointerCapture(event.pointerId)) surface.setPointerCapture(event.pointerId);
    }
  };
  const end = event => {
    const current = gesture; gesture = null;
    if (!current || event.pointerId !== current.id || event.type !== 'pointerup') return;
    const dx = event.clientX - current.x, dy = event.clientY - current.y;
    if (!current.horizontal || Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.4 || performance.now() - current.at > 850) return;
    suppressUntil = performance.now() + 400;
    const buttons = [...tabs.querySelectorAll('[role="tab"]')];
    const index = buttons.findIndex(button => button.getAttribute('aria-selected') === 'true');
    const next = buttons[index + (dx < 0 ? 1 : -1)];
    // Clicking keeps one source of truth, including the shared moving highlight.
    next?.click();
  };
  const click = event => {
    if (performance.now() < suppressUntil) { event.preventDefault(); event.stopImmediatePropagation(); }
  };
  // Touch starts with implicit capture on the child. Moving capture to the
  // panel emits a bubbling loss from that child; it does not end our swipe.
  const lost = event => { if (event.target === surface) end(event); };
  surface.addEventListener('pointerdown', down);
  surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', end);
  surface.addEventListener('lostpointercapture', lost);
  surface.addEventListener('click', click, true);
  return () => {
    surface.removeEventListener('pointerdown', down);
    surface.removeEventListener('pointermove', move);
    surface.removeEventListener('pointerup', end);
    surface.removeEventListener('pointercancel', end);
    surface.removeEventListener('lostpointercapture', lost);
    surface.removeEventListener('click', click, true);
  };
}
