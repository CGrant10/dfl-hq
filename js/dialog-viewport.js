// Keep native dialogs inside the visible phone viewport when a keyboard opens.
export function dialogViewportBounds(layoutHeight, height, top = 0) {
  return { top: Math.max(0, top), bottom: Math.max(0, layoutHeight - height - top), height: Math.max(0, height - 24) };
}
export function fitDialogToViewport(dialog) {
  const viewport = window.visualViewport;
  if (!viewport) return;
  const controller = new AbortController();
  let frame=0,last={};
  const stop=()=>{if(frame)cancelAnimationFrame(frame);frame=0;controller.abort()};
  const update = () => {
    if(frame)cancelAnimationFrame(frame);frame=0;if (!dialog.isConnected) { stop(); return; }
    const bounds = dialogViewportBounds(innerHeight, viewport.height, viewport.offsetTop);
    for (const [key,value] of Object.entries(bounds))if(last[key]!==value){dialog.style.setProperty(`--dialog-viewport-${key}`,`${value}px`);last[key]=value}
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update)};
  viewport.addEventListener('resize', schedule, { signal: controller.signal });
  viewport.addEventListener('scroll', schedule, { signal: controller.signal });
  window.addEventListener('dfl:route-performance', update, { signal: controller.signal });
  window.addEventListener('pageshow', update, { signal: controller.signal });
  window.addEventListener('resize', schedule, { signal: controller.signal });
  dialog.addEventListener('close', () => {if(!dialog.open)stop()}, { signal:controller.signal });
  update();
  return stop;
}
