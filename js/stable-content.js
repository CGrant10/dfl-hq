// A late section above the viewport must not push the reader down the page.
// Work is synchronous: no scroll listener, timer, or retained DOM snapshot.
export function updateStableContent(host, update) {
  if (!host?.isConnected) return update();
  const y = window.scrollY;
  const before = y > 0 && !document.querySelector('dialog[open]') ? host.getBoundingClientRect() : null;
  const preserve = before && before.bottom <= 0;
  let anchor=host;
  while(preserve&&anchor&&!anchor.nextElementSibling&&anchor.parentElement!==document.body)anchor=anchor.parentElement;
  anchor=preserve?anchor?.nextElementSibling:null;
  const anchorTop=anchor?anchor.getBoundingClientRect().top+y:null;
  const result = update();
  if (preserve && host.isConnected) {
    const delta = anchor?.isConnected ? anchor.getBoundingClientRect().top+window.scrollY-anchorTop : host.getBoundingClientRect().height-before.height;
    const target = Math.max(0, y + delta);
    // Native scroll anchoring may already have applied the same correction.
    if (Math.abs(window.scrollY - target) > .5) window.scrollTo({top:target,behavior:'instant'});
  }
  return result;
}

export function replaceStableContent(host, html) {
  return updateStableContent(host, () => { host.innerHTML = html; });
}
