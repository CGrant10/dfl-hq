// Keep a horizontal gesture on a stable surface, even if a child is replaced.
// Capture starts after direction is clear, so taps and vertical scroll stay native.
export function mountHorizontalSwipe(surface, { accepts = (_target) => true, exclude = 'a,button,input,select,textarea,summary,[contenteditable]', allowMouse = false, min = 48, onStart = () => {}, onMove = (_gesture) => {}, onEnd = (_gesture) => {} } = {}) {
  let gesture = null, suppressUntil = 0, stopped = false;
  const release = id => { if (surface.hasPointerCapture?.(id)) surface.releasePointerCapture?.(id); };
  const finish = (event, cancelled = false) => {
    if (!gesture || event && event.pointerId !== gesture.id) return;
    const current = gesture; gesture = null;
    const dx = event ? event.clientX - current.x : current.dx, dy = event ? event.clientY - current.y : current.dy;
    const valid = !cancelled && current.horizontal && Math.abs(dx) >= min && Math.abs(dx) > Math.abs(dy) * 1.4;
    if (current.horizontal) suppressUntil = performance.now() + 400;
    release(current.id);
    onEnd({ ...current, dx, dy, valid });
  };
  const down = event => {
    suppressUntil = 0; // A fresh touch is intentional, including taps on controls.
    if (event.isPrimary === false) { finish(null, true); return; }
    if (stopped || event.button !== 0 || event.pointerType === 'mouse' && !allowMouse || event.target.closest(exclude) || String(getSelection()) || !accepts(event.target)) return;
    finish(null, true);
    gesture = { id:event.pointerId, target:event.target, x:event.clientX, y:event.clientY, dx:0, dy:0, at:performance.now(), horizontal:false };
    onStart();
  };
  const move = event => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    gesture.dx = dx; gesture.dy = dy;
    if (!gesture.horizontal && Math.abs(dy) > 12 && Math.abs(dy) >= Math.abs(dx)) { finish(event, true); return; }
    if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      gesture.horizontal = true;
      if (!surface.hasPointerCapture?.(event.pointerId)) surface.setPointerCapture?.(event.pointerId);
    }
    if (gesture.horizontal) onMove(gesture);
  };
  const up = event => finish(event);
  const cancel = event => finish(event, true);
  // Implicit capture moving from a child to the surface emits a child loss.
  const lost = event => {
    // A previous release can report its loss after a fresh gesture starts.
    // Only cancel a horizontal drag that actually lost its current capture.
    if (event.target === surface && gesture?.horizontal && !surface.hasPointerCapture?.(event.pointerId)) finish(event, true);
  };
  const click = event => {
    // Synthetic tab/button clicks keep their original native control path.
    if (event.target.closest('button:not(.player-card-trigger):not(.gameday-player-tap),input,select,textarea,summary') || performance.now() >= suppressUntil) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const interrupt = () => finish(null, true);
  surface.addEventListener('pointerdown', down); surface.addEventListener('pointermove', move);
  surface.addEventListener('pointerup', up); surface.addEventListener('pointercancel', cancel);
  surface.addEventListener('lostpointercapture', lost); surface.addEventListener('click', click, true);
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', interrupt);
  if (typeof window !== 'undefined') window.addEventListener('dfl:ui-motion-change', interrupt);
  return {
    get tracking() { return Boolean(gesture); },
    cancel: interrupt,
    stop() {
      stopped = true; interrupt();
      surface.removeEventListener('pointerdown', down); surface.removeEventListener('pointermove', move);
      surface.removeEventListener('pointerup', up); surface.removeEventListener('pointercancel', cancel);
      surface.removeEventListener('lostpointercapture', lost); surface.removeEventListener('click', click, true);
      if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', interrupt);
      if (typeof window !== 'undefined') window.removeEventListener('dfl:ui-motion-change', interrupt);
    },
  };
}
