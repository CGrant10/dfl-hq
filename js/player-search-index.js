// Normalize and rank once per player snapshot, rather than on every keystroke.
export function createPlayerSearchIndex(players, {eligible = _player => true, compare = null, fields = ['n', 'p', 't']} = {}) {
  const entries = Object.entries(players).filter(([, player]) => eligible(player));
  if (compare) entries.sort(([, a], [, b]) => compare(a, b));
  return entries.map(entry => ({entry, text: fields.map(field => String(entry[1][field])).join(' ').toLowerCase()}));
}

export function searchPlayerIndex(index, query, limit) {
  const terms = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length || limit <= 0) return [];
  const matches = [];
  for (const row of index) {
    if (terms.every(term => row.text.includes(term))) {
      matches.push(row.entry);
      if (matches.length >= limit) break;
    }
  }
  return matches;
}
