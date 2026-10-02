// One full-game line per player/stat. Existing tickets retain their original markets.
const stats = new Map([
  ['passing yards', 'passing_yards'], ['pass yd', 'passing_yards'],
  ['passing tds', 'passing_touchdowns'], ['passing touchdowns', 'passing_touchdowns'], ['pass td', 'passing_touchdowns'],
  ['rushing yards', 'rushing_yards'], ['rush yd', 'rushing_yards'],
  ['receptions', 'receptions'], ['receiving receptions', 'receptions'], ['rec', 'receptions'],
  ['touchdowns', 'touchdowns'], ['rushing + receiving tds', 'touchdowns'], ['rush rec td', 'touchdowns'],
  ['rushing touchdowns', 'rushing_touchdowns'], ['receiving touchdowns', 'receiving_touchdowns'],
]);
const clean = value => String(value || '').trim().toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ');
const numeric = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)) ? Number(value) : null;
export function corePropStat(stat, line) {
  const key = stats.get(clean(stat)) || '';
  return key.includes('touchdowns') && key !== 'passing_touchdowns' && numeric(line) !== .5 ? '' : key;
}
export function propLine(market) {
  return numeric(market.provider_line) ?? numeric(String(market.lore_note || '').match(/(?:^| · )Book consensus ([\d.]+)/i)?.[1]);
}
export function selectCoreProps(markets = []) {
  const groups = new Map();
  for (const market of markets) {
    if (market.category !== 'Player Props') continue;
    const [player, stat] = String(market.title || '').split('·').map(value => value.trim());
    const line = propLine(market), kind = corePropStat(stat, line);
    if (!player || !kind || line === null) continue;
    const family = kind.includes('touchdowns') && kind !== 'passing_touchdowns' ? 'scoring_td' : kind;
    const game = market.closes_at && Number.isFinite(Date.parse(market.closes_at)) ? new Date(market.closes_at).toISOString() : String(market.provider_event_id || '');
    const key = `${game}:${clean(player).replace(/[^a-z0-9]/g, '')}:${family}`;
    const rows = groups.get(key) || []; rows.push({market, kind}); groups.set(key, rows);
  }
  return [...groups.values()].map(rows => rows.sort((a, b) => {
    // Prefer an anytime scoring TD market over a single rushing/receiving TD market.
    const td = Number(b.kind === 'touchdowns') - Number(a.kind === 'touchdowns');
    const books = market => Number(String(market.lore_note || '').match(/(?:^| · )(\d+) books?\b/i)?.[1]) || 0;
    const updated = market => Math.floor((Date.parse(market.provider_updated_at || market.updated_at || '') || 0) / 60000);
    return td || updated(b.market) - updated(a.market) || books(b.market) - books(a.market) || Number(b.market.id || 0) - Number(a.market.id || 0);
  })[0].market);
}
