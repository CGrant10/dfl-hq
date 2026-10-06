import { sleeper } from './sleeper.js';

// Small, shared public reads keep Home and GameDay ahead of a delayed DB sync.
const cache = new Map();
export function loadLatestLeagueResults(leagueId, season, currentWeek, { force = false } = {}) {
  const week = Math.min(18, Number(currentWeek) - 1);
  if (!leagueId || !(week > 0)) return Promise.resolve(null);
  const key = `${leagueId}:${season}:${week}`, hit = cache.get(key);
  if (hit && (hit.pending || !force && Date.now() - hit.at < 60000)) return hit.value;
  const entry = { at: Date.now(), pending: true, value: null };
  entry.value = Promise.allSettled([sleeper.rosters(leagueId), sleeper.matchups(leagueId, week)])
    .then(([rosters, matchups]) => ({ season, week,
      rosters: rosters.status === 'fulfilled' ? rosters.value : null,
      matchups: matchups.status === 'fulfilled' ? matchups.value : null,
    })).finally(() => { entry.pending = false; });
  cache.set(key, entry);
  return entry.value;
}
globalThis.addEventListener?.('dfl:quick-sync-complete', () => cache.clear());

/** Accept a complete, identified final-week slate; never fill gaps with zero. */
export function reconcileLeagueResults({ season, teams = [], standings = [], matchups = [], snapshot = null } = {}) {
  if (!snapshot || Number(snapshot.season) !== Number(season) || !(snapshot.week > 0)) return { standings, matchups };
  const rosterRows = Array.isArray(snapshot.rosters) ? snapshot.rosters.filter(Boolean) : [];
  const known = new Map(teams.map(t => [String(t.roster_id ?? t.roster), t]));
  const owners = new Map(rosterRows.map(r => [String(r.roster_id), r.owner_id]));
  const uid = id => owners.get(String(id)) || known.get(String(id))?.sleeper_user_id || known.get(String(id))?.uid || null;
  const points = row => row.custom_points ?? row.points;
  const valid = row => row && known.has(String(row.roster_id)) && row.matchup_id != null
    && points(row) != null && Number.isFinite(Number(points(row)));
  const rows = Array.isArray(snapshot.matchups) ? snapshot.matchups.filter(Boolean) : [], seen = new Set(rows.map(r => String(r.roster_id))), groups = new Map();
  for (const row of rows) {
    const id = String(row.matchup_id);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  const complete = known.size >= 2 && rows.length === known.size && seen.size === known.size
    && rows.every(valid) && [...groups.values()].every(g => g.length === 2);
  let updatedMatchups = matchups;
  if (complete) {
    const fresh = [...groups.entries()].map(([id, [a, b]]) => ({ season, week: snapshot.week, matchup_id: Number(id),
      roster1: a.roster_id, user1: uid(a.roster_id), score1: Number(points(a)),
      roster2: b.roster_id, user2: uid(b.roster_id), score2: Number(points(b)),
    }));
    updatedMatchups = [...matchups.filter(r => Number(r.week) !== Number(snapshot.week)), ...fresh];
  }
  // Official W/L only belongs to this board if every known team has that many completed games.
  const official = rosterRows.filter(r => known.has(String(r.roster_id)));
  const recordsReady = known.size >= 2 && official.length === known.size && new Set(official.map(r => String(r.roster_id))).size === known.size
    && official.every(r => ['wins','losses','ties'].every(k => Number.isInteger(r.settings?.[k]) && r.settings[k] >= 0)
      && r.settings.wins + r.settings.losses + r.settings.ties === Number(snapshot.week));
  let updatedStandings = standings;
  if (recordsReady) {
    const fresh = official.map(r => ({ season, roster_id: r.roster_id, sleeper_user_id: uid(r.roster_id),
      wins: r.settings.wins, losses: r.settings.losses, ties: r.settings.ties,
      points_for: Number(r.settings.fpts || 0) + Number(r.settings.fpts_decimal || 0) / 100,
    })).sort((a,b) => b.wins-a.wins || a.losses-b.losses || b.points_for-a.points_for);
    fresh.forEach((r,i) => { r.rank = i + 1; });
    updatedStandings = [...standings.filter(r => Number(r.season) !== Number(season)), ...fresh];
  }
  return { standings: updatedStandings, matchups: updatedMatchups };
}
