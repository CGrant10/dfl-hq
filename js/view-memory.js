const TTL = 12 * 60 * 60 * 1000;
const keyFor = (member, name) => `dfl.view.v1.${member || 'guest'}.${name}`;
export function readViewMemory(member, name, storage = globalThis.sessionStorage, now = Date.now()) {
  try { const value = JSON.parse(storage.getItem(keyFor(member, name)) || 'null'); return value && now - value.at < TTL && now >= value.at ? value.data : null; }
  catch { return null; }
}
export function writeViewMemory(member, name, data, storage = globalThis.sessionStorage, now = Date.now()) {
  try {
    storage.setItem(keyFor(member, name), JSON.stringify({ at: now, data }));
    if(name.startsWith('visit:')){
      const indexKey=keyFor(member,'visit-index'),saved=JSON.parse(storage.getItem(indexKey)||'[]');
      const keys=[...(Array.isArray(saved)?saved:[]).filter(key=>typeof key==='string'&&key.startsWith('visit:')&&key!==name),name];
      for(const old of keys.splice(0,Math.max(0,keys.length-80)))storage.removeItem(keyFor(member,old));
      storage.setItem(indexKey,JSON.stringify(keys));
    }
  } catch {}
}

// Only scroll offsets and non-sensitive disclosure/tab positions are generic.
// Actual selections and trade packages are saved by their owning page.
export function captureView(view, y = globalThis.scrollY || 0) {
  return { y: Math.max(0, Number(y) || 0), details: [...view.querySelectorAll('details[id],details[data-page-detail],details[data-watch-bench]')].filter(d => !d.closest('dialog')).map(d => ({ key: d.id ? `#${d.id}` : d.dataset.pageDetail ? `[data-page-detail="${CSS.escape(d.dataset.pageDetail)}"]` : `[data-watch-bench="${CSS.escape(d.dataset.watchBench)}"]`, open: d.open })), strips: [...view.querySelectorAll('.tabs[id]')].map(d => ({ id: d.id, x: d.scrollLeft })) };
}

// Background refreshes keep the visible player/section in place even when
// updated content above it changes height. Route Back keeps its visit offset.
export function captureRefreshView(view) {
  const memory=captureView(view),candidates=[...view.querySelectorAll('[data-player-card],h2')];
  const node=candidates.filter(node=>node.getClientRects().length&&!node.closest('dialog,[hidden],details:not([open])')).map(node=>({node,box:node.getBoundingClientRect()})).filter(item=>item.box.top>=44&&item.box.bottom<=innerHeight).sort((a,b)=>a.box.top-b.box.top)[0]?.node;
  if(node){const selector=node.dataset.playerCard?`[data-player-card="${CSS.escape(node.dataset.playerCard)}"]`:'h2',text=node.tagName==='H2'?node.textContent:null;
    const matches=[...view.querySelectorAll(selector)].filter(item=>text==null||item.textContent===text);
    memory.anchor={selector,text,index:matches.indexOf(node),top:node.getBoundingClientRect().top};
  }
  return memory;
}
export function restoreRefreshView(view,memory,options={}) {
  if(!memory||options.active&&!options.active())return()=>{};
  restoreView(view,memory,{...options,restoreScroll:false});
  const anchor=memory.anchor,node=anchor&&[...view.querySelectorAll(anchor.selector)].filter(item=>anchor.text==null||item.textContent===anchor.text)[anchor.index];
  const y=node?.getClientRects().length?Math.max(0,scrollY+node.getBoundingClientRect().top-anchor.top):memory.y;
  (options.scroll||((top)=>window.scrollTo({top,behavior:'instant'})))(y);
  return restoreView(view,{...memory,y},options);
}
export function restoreView(view, memory, { active = () => true, scroll = y => window.scrollTo({ top: y, behavior: 'instant' }), restoreScroll = true } = {}) {
  if (!memory) return () => {};
  for (const d of memory.details || []) { const node = view.querySelector(d.key); if (node) node.open = !!d.open; }
  for (const strip of memory.strips || []) { const node = view.querySelector(`#${CSS.escape(strip.id)}`); if (node) node.scrollLeft = strip.x; }
  if(!restoreScroll)return () => {};
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
