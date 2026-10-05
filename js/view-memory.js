const TTL = 12 * 60 * 60 * 1000;
const keyFor = (member, name) => `dfl.view.v1.${member || 'guest'}.${name}`;
export function readViewMemory(member, name, storage = globalThis.sessionStorage, now = Date.now()) {
  try { const value = JSON.parse(storage.getItem(keyFor(member, name)) || 'null'); return value && now - value.at < TTL && now >= value.at ? value.data : null; }
  catch { return null; }
}
export function writeViewMemory(member, name, data, storage = globalThis.sessionStorage, now = Date.now()) {
  try { storage.setItem(keyFor(member, name), JSON.stringify({ at: now, data })); } catch {}
}

// Only scroll offsets and non-sensitive disclosure/tab positions are generic.
// Actual selections and trade packages are saved by their owning page.
export function captureView(view, y = globalThis.scrollY || 0) {
  return { y: Math.max(0, Number(y) || 0), details: [...view.querySelectorAll('details[id],details[data-page-detail],details[data-watch-bench]')].filter(d => !d.closest('dialog')).map(d => ({ key: d.id ? `#${d.id}` : d.dataset.pageDetail ? `[data-page-detail="${CSS.escape(d.dataset.pageDetail)}"]` : `[data-watch-bench="${CSS.escape(d.dataset.watchBench)}"]`, open: d.open })), strips: [...view.querySelectorAll('.tabs[id]')].map(d => ({ id: d.id, x: d.scrollLeft })) };
}
export function restoreView(view, memory, { active = () => true, scroll = y => window.scrollTo({ top: y, behavior: 'instant' }) } = {}) {
  if (!memory) return () => {};
  for (const d of memory.details || []) { const node = view.querySelector(d.key); if (node) node.open = !!d.open; }
  for (const strip of memory.strips || []) { const node = view.querySelector(`#${CSS.escape(strip.id)}`); if (node) node.scrollLeft = strip.x; }
  let stopped = false, frame = 0;
  const apply = () => {
    frame = 0; if (stopped || !active()) return;
    scroll(memory.y);
    if (Math.abs((globalThis.scrollY || 0) - memory.y) < 2) stop();
  };
  const schedule = () => { if (!frame && !stopped) frame = requestAnimationFrame(apply); };
  // Deferred Home sections may not be tall enough on the first frame.
  const observer = new ResizeObserver(schedule); observer.observe(view);
  const cancel = () => stop();
  const stop = () => { if (stopped) return; stopped = true; observer.disconnect(); cancelAnimationFrame(frame); clearTimeout(timer); for (const name of ['pointerdown', 'wheel', 'keydown']) window.removeEventListener(name, cancel); };
  const timer = setTimeout(stop, 5000);
  for (const name of ['pointerdown', 'wheel', 'keydown']) window.addEventListener(name, cancel, { passive: true, once: true });
  schedule(); return stop;
}
