import { readPageChoice } from './page-disclosure.js';

const easing = 'cubic-bezier(.2,.75,.25,1)';
const running = new Set();
const exits = new Map();
let started = false;

export function motionAllowed({ preference = 'on', reduced = false, hidden = false, explicit = true } = {}) {
  return preference !== 'off' && !reduced && !hidden && explicit;
}
function canPlay(node, explicit = true) {
  return node?.isConnected && motionAllowed({
    preference: readPageChoice('gameday-motion', ['on', 'off'], 'on'),
    reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
    hidden: document.visibilityState !== 'visible',
    explicit: explicit && !node.closest('[data-motion="off"]'),
  });
}
export function cancelUiMotion(node) {
  for (const animation of running) {
    if (!node || animation.effect?.target === node || node.contains(animation.effect?.target)) {
      animation.onfinish = null;
      animation.cancel();
      running.delete(animation);
    }
  }
}
export function animateUi(node, frames, { motion = true, ...options } = {}) {
  if (!node?.animate || !canPlay(node, motion)) return;
  cancelUiMotion(node);
  const animation = node.animate(frames, { duration: 220, easing, ...options });
  running.add(animation);
  animation.onfinish = () => { running.delete(animation); animation.cancel(); };
  return animation;
}
export function cancelUiExit(node) {
  if (!exits.has(node)) return;
  exits.delete(node);
  delete node.dataset.uiClosing;
  cancelUiMotion(node);
}
// A dismissal completes once, even if Escape repeats or motion is switched
// off mid-flight. Reopening cancels the old completion, not the new surface.
export function exitUi(node, complete, { immediate = false, surface = node } = {}) {
  const existing = exits.get(node);
  if (existing) { if (immediate) existing(); return; }
  if (immediate || !canPlay(node)) { complete(); return; }
  const finish = () => {
    if (exits.get(node) !== finish) return;
    exits.delete(node);
    delete node.dataset.uiClosing;
    cancelUiMotion(node);
    complete();
  };
  exits.set(node, finish);
  const opacity = getComputedStyle(node).opacity;
  const transform = getComputedStyle(surface).transform;
  node.dataset.uiClosing = '1';
  const current = animateUi(node, surface === node
    ? [{ opacity, transform }, { opacity:0, transform:'translateY(8px)' }]
    : [{ opacity }, { opacity:0 }], { duration:160, fill:'forwards' });
  if (surface !== node) animateUi(surface, [{ transform }, { transform:'translateY(8px)' }], { duration:160, fill:'forwards' });
  if (current) current.finished.then(finish, finish);
  else finish();
}
export function startUiMotion() {
  if (started) return;
  started = true;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sync = () => {
    const enabled = motionAllowed({ preference: readPageChoice('gameday-motion', ['on', 'off'], 'on'), reduced: reduced.matches });
    const value = enabled ? 'on' : 'off';
    const changed = document.documentElement.dataset.uiMotion !== value;
    document.documentElement.dataset.uiMotion = value;
    if (!enabled) cancelUiMotion();
    if (changed) window.dispatchEvent(new Event('dfl:ui-motion-change'));
  };
  reduced.addEventListener('change', sync);
  window.addEventListener('storage', sync);
  window.addEventListener('dfl:route-performance', sync);
  document.addEventListener('click', event => {
    if (event.target.closest?.('[data-gameday-motion],[data-clubhouse-motion]')) queueMicrotask(sync);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelUiMotion(); });
  sync();
}

// Explicitly opt in ordinary control strips. Clubhouse and the event stages
// keep their own motion controllers; no live score mutation is an entrance.
const rails = [
  { bar: '.sb-product-tabs' }, { bar: '.sb-tabs' }, { bar: '.page-activity-tabs' },
  { bar: '.td-entry-actions', panel: '.tb-custom,[data-tb-offers]' },
  { bar: '#hist-tabs', panel: '#hist-body' }, { bar: '#year-picker', panel: '#hist-body' },
  { bar: '#rule-tabs', panel: '#rule-body' }, { bar: '#cal-tabs', panel: '#cal-body' },
  { bar: '#year-tabs', panel: '#keeper-body' }, { bar: '#fin-years', panel: '#fin-body' },
];
const barSelector = rails.map(item => item.bar).join(',');
const selectedSelector = ':scope > button[aria-selected="true"],:scope > button[aria-pressed="true"],:scope > button.on,:scope > button.active';
const keyFor = button => button.id || button.dataset.tab || button.dataset.season || button.dataset.year || button.dataset.tdMode || button.textContent.trim();
const visible = node => {
  if (!node || node.closest('[hidden]') || !node.getClientRects().length) return false;
  const box = node.getBoundingClientRect();
  return box.bottom > 44 && box.top < innerHeight - 48 && box.right > 0 && box.left < innerWidth;
};

export function mountPageMotion(root) {
  if (['broadcast', 'arena-beta', 'golf'].includes(root.dataset.route) || root.dataset.route?.startsWith('arena')) return () => {};
  root.dataset.uiPolished = '1';
  const states = new Map(), pending = new Map(), userDetails = new WeakSet();
  let stopped = false, frame = null, intent = null;
  const current = () => !stopped && root.isConnected;
  const reveal = node => { if (visible(node)) animateUi(node, [{ opacity: .45 }, { opacity: 1 }], { duration: 180 }); };
  const drain = () => {
    for (const [selector, expires] of pending) {
      const panel = root.querySelector(selector);
      if (performance.now() > expires) { pending.delete(selector); continue; }
      if (!panel || panel.querySelector('.is-loading') || panel.matches('.is-loading')) continue;
      pending.delete(selector);
      reveal(panel);
    }
  };
  const resize = new ResizeObserver(() => schedule(false));
  function sync(animate = false) {
    if (!current()) return;
    for (const spec of rails) {
      const bar = root.querySelector(spec.bar), button = bar?.querySelector(selectedSelector);
      if (!button || !bar.getClientRects().length) continue;
      let state = states.get(spec.bar);
      if (!state || state.bar !== bar) {
        if (state) { cancelUiMotion(state.marker); resize.unobserve(state.bar); for (const tab of state.buttons) resize.unobserve(tab); }
        const marker = document.createElement('span');
        marker.className = 'dfl-selection-rail'; marker.setAttribute('aria-hidden', 'true');
        bar.dataset.uiRail = '1'; bar.append(marker); resize.observe(bar);
        const buttons = [...bar.querySelectorAll(':scope > button')];
        for (const tab of buttons) resize.observe(tab);
        state = { ...state, bar, marker, buttons }; states.set(spec.bar, state);
      }
      const rect = button.getBoundingClientRect(), bounds = bar.getBoundingClientRect();
      const key = keyFor(button), previous = state.rect;
      const changed = state.key && state.key !== key;
      const shouldAnimate = animate && changed && intent?.bar === spec.bar && performance.now() - intent.at < 1500;
      state.marker.style.width = `${rect.width}px`;
      state.marker.style.left = `${rect.left - bounds.left + bar.scrollLeft - bar.clientLeft}px`;
      state.marker.style.top = `${rect.bottom - bounds.top + bar.scrollTop - bar.clientTop - 2}px`;
      if (shouldAnimate && visible(button) && previous) {
        animateUi(state.marker, [
          { transform: `translateX(${previous.left - rect.left}px) scaleX(${previous.width / rect.width})` },
          { transform: 'translateX(0) scaleX(1)' },
        ], { duration: 260 });
        const panel = button.getAttribute('aria-controls');
        const selector = panel ? `#${CSS.escape(panel)}` : spec.panel;
        if (selector) pending.set(selector, performance.now() + 15000);
      } else if (!animate && previous && (Math.abs(previous.left - rect.left) > .5 || Math.abs(previous.width - rect.width) > .5)) cancelUiMotion(state.marker);
      state.key = key; state.rect = rect;
    }
    drain();
  }
  function schedule(animate = true) {
    if (stopped || frame != null) return;
    frame = requestAnimationFrame(() => { frame = null; sync(animate); });
  }
  const observer = new MutationObserver(records => {
    if (records.some(record => record.type === 'childList'
      ? [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && !node.matches('.dfl-selection-rail') && (node.matches(barSelector) || node.querySelector(barSelector))) || pending.size > 0
      : record.target.matches('button') && record.target.closest(barSelector))) schedule();
  });
  observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['aria-selected', 'aria-pressed', 'class'] });
  const click = event => {
    const button = event.target.closest?.('button'), bar = button?.closest(barSelector);
    const spec = bar && rails.find(item => bar.matches(item.bar));
    if (spec) { intent = { bar: spec.bar, at: performance.now() }; schedule(); }
    if (button?.matches('[data-tb-view-offers]')) { pending.set('[data-tb-offers]', performance.now() + 15000); schedule(); }
    const summary = event.target.closest?.('summary');
    if (summary?.parentElement.tagName === 'DETAILS') userDetails.add(summary.parentElement);
    const fold = event.target.closest?.('.dfl-fold');
    if (fold) requestAnimationFrame(() => {
      if (current() && fold.getAttribute('aria-expanded') === 'true') {
        for (const child of fold.parentElement.children) if (child !== fold) reveal(child);
      }
    });
  };
  const toggle = event => {
    const details = event.target;
    if (!current() || !details.matches?.('details') || !userDetails.has(details)) return;
    userDetails.delete(details);
    if (!details.open || details.closest('.clubhouse-command-center')) return;
    for (const child of details.children) if (child.tagName !== 'SUMMARY') reveal(child);
  };
  const change = event => {
    const selectors = { 'lore-filter': '[data-fact-results]' };
    const selector = event.target.matches('[data-ta-team-select]') ? '[data-ta-body]' : selectors[event.target.id];
    if (selector) { pending.set(selector, performance.now() + 15000); schedule(); }
  };
  const entryEnd = event => {
    // Release the completed effect instead of retaining a whole-page layer.
    // Clearing the class also prevents preference changes replaying the fade.
    if (event.target === root && event.animationName === 'ui-page-in') root.classList.remove('page-in');
  };
  const reset = () => { cancelUiMotion(root); root.classList.remove('page-in'); sync(false); };
  root.addEventListener('animationend', entryEnd);
  root.addEventListener('click', click, true);
  root.addEventListener('toggle', toggle, true);
  root.addEventListener('change', change, true);
  window.addEventListener('dfl:ui-motion-change', reset);
  sync(false);
  // Only identities move in these page-specific entrances, never statistics.
  if (root.dataset.route === 'profile') {
    const identity = root.querySelector('.profile-head .ph-top');
    if (visible(identity)) animateUi(identity, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 320 });
  }
  if (root.dataset.route === 'stakes') {
    root.querySelectorAll('.stakes-game > div > strong').forEach((node, i) => {
      if (visible(node)) animateUi(node, [{ opacity: 0, transform: `translateX(${i ? 24 : -24}px)` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 700, delay: i * 110, fill: 'backwards' });
    });
  }
  return () => {
    stopped = true; cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); cancelUiMotion(root);
    root.removeEventListener('click', click, true); root.removeEventListener('toggle', toggle, true); root.removeEventListener('change', change, true);
    root.removeEventListener('animationend', entryEnd);
    window.removeEventListener('dfl:ui-motion-change', reset);
    for (const state of states.values()) { cancelUiMotion(state.marker); state.marker.remove(); delete state.bar.dataset.uiRail; }
    pending.clear();
  };
}
