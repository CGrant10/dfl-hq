import { selectCoreProps, corePropStat, propLine } from './sportsbook-core-props.js';
import { propMarketMeta } from './sportsbook-props.js';

const identity = value => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const preferences = {
  QB: ['passing_yards', 'passing_touchdowns'],
  RB: ['rushing_yards', 'touchdowns', 'rushing_touchdowns', 'receiving_touchdowns', 'receptions'],
  WR: ['receptions', 'touchdowns', 'receiving_touchdowns', 'rushing_touchdowns'],
  TE: ['receptions', 'touchdowns', 'receiving_touchdowns', 'rushing_touchdowns'],
};
export function propPlayerKey(meta) { return `${identity(meta.team)}:${identity(meta.player)}`; }
export function groupPropPlayers(rows) {
  const players = new Map();
  for (const row of rows) {
    const key = propPlayerKey(row.meta);
    const player = players.get(key) || { key, meta: row.meta, rows: [] };
    player.rows.push(row); players.set(key, player);
  }
  return [...players.values()].map(player => {
    const order=preferences[player.meta.position] || [];
    const rank=row=>{const index=order.indexOf(row.kind || corePropStat(row.meta.stat,propLine(row.market)));return index<0?99:index;};
    player.rows.sort((a,b)=>rank(a)-rank(b));return player;
  });
}

// Curate the display only. Accepted bets and the feed's grading markets stay intact.
// The main volume line ranks players within their position; no invented prices or stats.
export function selectFeaturedProps(markets = []) {
  const games = new Map();
  for (const market of selectCoreProps(markets)) {
    const meta = propMarketMeta(market), kind = corePropStat(meta.stat, propLine(market));
    const position = meta.position || (kind.startsWith('passing_') ? 'QB' : kind === 'rushing_yards' ? 'RB' : kind === 'receptions' ? 'WR' : '');
    if (!preferences[position] || !preferences[position].includes(kind)) continue;
    const key = String(market.provider_event_id || market.closes_at || meta.matchup);
    const rows = games.get(key) || []; rows.push({market, meta: {...meta, position}, kind}); games.set(key, rows);
  }
  const selected = [];
  for (const rows of games.values()) {
    const players = groupPropPlayers(rows).map(player => {
      const order = preferences[player.meta.position];
      player.rows.sort((a,b) => order.indexOf(a.kind) - order.indexOf(b.kind));
      const volume = player.rows.find(row => row.kind === order[0]);
      return {...player, volume: volume ? propLine(volume.market) : -1};
    }).filter(player => player.volume >= 0);
    players.sort((a,b) => b.volume - a.volume || a.meta.player.localeCompare(b.meta.player));
    const counts = new Map();
    let playerCount = 0;
    for (const player of players) {
      const pos = player.meta.position, team = player.meta.team;
      // With team metadata: QB1, RB1, WR1–2, TE1 per team. Otherwise the same game-wide caps.
      const key = `${team || 'game'}:${pos}`, limit = (pos === 'WR' ? 2 : 1) * (team ? 1 : 2);
      if ((counts.get(key) || 0) >= limit || playerCount >= 10) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
      playerCount++;
      selected.push(...player.rows.slice(0,2).map(row => row.market));
    }
  }
  return selected;
}
