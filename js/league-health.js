import {matchesDflStartingSlots} from './analyzer-league-context.js';

// Counts and fixed issue codes only; no owner/player identifiers in the report.
export function leagueHealth({league = {}, state = {}, rosters = [], rows = [], users = null, week, now = Date.now()}) {
  const issues = new Set();
  const rosterList = Array.isArray(rosters) ? rosters : [];
  const matchupList = Array.isArray(rows) ? rows : [];
  const expected = Number(league.total_rosters);
  if (expected !== 12 || rosterList.length !== expected) issues.add('roster_count');
  if (!Array.isArray(league.roster_positions) || !matchesDflStartingSlots(league.roster_positions) || Number(league.scoring_settings?.rec) !== 1) issues.add('league_format');
  const owners = new Set(), ids = new Set(), players = new Map();
  for (const roster of rosterList) {
    const id = String(roster.roster_id ?? '');
    if (!id || ids.has(id)) issues.add('roster_ids');
    ids.add(id);
    const owner = String(roster.owner_id ?? '');
    if (!owner || owners.has(owner)) issues.add('roster_owners');
    owners.add(owner);
    if (users && (!Array.isArray(users) || !users.some(user => String(user.user_id) === owner))) issues.add('missing_owners');
    if (!Array.isArray(roster.players) || !roster.players.length) issues.add('empty_rosters');
    for (const player of new Set([...(roster.players || []), ...(roster.reserve || []), ...(roster.taxi || [])].map(String))) {
      if (players.has(player) && players.get(player) !== id) issues.add('duplicate_players');
      players.set(player, id);
    }
  }
  const seen = new Set();
  for (const row of matchupList) {
    const id = String(row.roster_id ?? '');
    if (!ids.has(id) || seen.has(id)) issues.add('matchup_rosters');
    seen.add(id);
    const starters = (row.starters || []).map(String).filter(player => player !== '0');
    if (new Set(starters).size !== starters.length || starters.some(player => players.get(player) !== id)) issues.add('invalid_starters');
    if (row.week != null && Number(row.week) !== Number(week)) issues.add('wrong_week');
    if (row.season != null && Number(row.season) !== Number(league.season)) issues.add('wrong_season');
  }
  if (matchupList.length !== rosterList.length || seen.size !== ids.size) issues.add('matchup_count');
  if (league.status === 'in_season' && state.season_type === 'regular') {
    if (Number(league.season) !== Number(state.season)) issues.add('wrong_season');
    if (Number(week) !== Number(state.week)) issues.add('wrong_week');
  }
  return {ok: !issues.size, checkedAt: new Date(now).toISOString(), season: Number(league.season), week: Number(week),
    expectedTeams: expected, rostersChecked: rosterList.length, matchupsChecked: matchupList.length, issues: [...issues].sort()};
}

export const LEAGUE_HEALTH_LABELS = {
  roster_count: 'Missing or unexpected rosters', roster_ids: 'Duplicate or missing roster IDs',
  roster_owners: 'Duplicate or missing owners', missing_owners: 'Owner directory incomplete',
  empty_rosters: 'Empty roster data', duplicate_players: 'Players assigned to multiple teams',
  matchup_rosters: 'Matchups assigned to the wrong rosters', matchup_count: 'Incomplete weekly matchups',
  invalid_starters: 'Duplicate or unowned starters', wrong_week: 'Wrong league week', wrong_season: 'Wrong league season',
  league_format: 'League settings differ from 12-team PPR / one QB',
};
