// Keep native dialogs inside the visible phone viewport when a keyboard opens.
export function dialogViewportBounds(layoutHeight, height, top = 0) {
  return { top: Math.max(0, top), bottom: Math.max(0, layoutHeight - height - top), height: Math.max(0, height - 24) };
}
export function fitDialogToViewport(dialog) {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const controller = new AbortController();
  const update = () => {
    if (!dialog.isConnected) { controller.abort(); return; }
    const bounds = dialogViewportBounds(innerHeight, viewport.height, viewport.offsetTop);
    for (const [key, value] of Object.entries(bounds)) dialog.style.setProperty(`--dialog-viewport-${key}`, `${value}px`);
  };
  viewport.addEventListener('resize', update, { signal: controller.signal });
  viewport.addEventListener('scroll', update, { signal: controller.signal });
  window.addEventListener('dfl:route-performance', update, { signal: controller.signal });
  dialog.addEventListener('close', () => controller.abort(), { once:true, signal:controller.signal });
  update();
}
