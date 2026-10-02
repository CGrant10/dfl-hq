// UI preferences only. Stakes, picks and tickets never enter this store.
const PREFIX = 'dfl.sportsbook.view.v1.';
export function cleanBookState(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  return {
    product: value.product === 'pickem' ? 'pickem' : 'book',
    tab: value.tab === 'tickets' ? 'tickets' : 'markets',
    filters: Object.fromEntries(['search','stat','position','team','game','source','sort'].map(key => [key, typeof value.filters?.[key] === 'string' ? value.filters[key].slice(0,100) : ''])),
    favorites: value.favorites === true,
    expanded: Array.isArray(value.expanded) ? value.expanded.filter(key => typeof key === 'string').slice(0,100) : [],
    scroll: Number.isFinite(value.scroll) ? Math.max(0, Math.min(100000,value.scroll)) : 0,
  };
}
export function readBookState(memberId, storage = globalThis.localStorage) {
  try { return cleanBookState(JSON.parse(storage.getItem(PREFIX + memberId))); }
  catch { return cleanBookState(); }
}
export function writeBookState(memberId, patch, storage = globalThis.localStorage) {
  const next = cleanBookState({ ...readBookState(memberId, storage), ...patch });
  try { storage.setItem(PREFIX + memberId, JSON.stringify(next)); } catch { /* Storage may be disabled. */ }
  return next;
}
