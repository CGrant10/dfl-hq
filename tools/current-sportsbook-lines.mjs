import { scorePlayer } from "../js/dfl-scoring.js";

const leagueId = process.argv[2];
if (!leagueId) throw new Error("Pass the Sleeper league id");
const get = async url => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
};
const league = await get(`https://api.sleeper.app/v1/league/${leagueId}`);
const season = Number(league.season);
const state = await get("https://api.sleeper.app/v1/state/nfl");
const week = Math.max(1, Number(state.week) || 1);
const [matchups, rosters, users, projections] = await Promise.all([
  get(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`),
  get(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),
  get(`https://api.sleeper.app/v1/league/${leagueId}/users`),
  get(`https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`),
]);
const userMap = new Map(users.map(user => [String(user.user_id), user]));
const rosterMap = new Map(rosters.map(roster => [Number(roster.roster_id), roster]));
const projectionMap = new Map(projections.map(row => [String(row.player_id), row.stats || {}]));
const projected = row => (row.starters || []).reduce((sum, id) => sum + scorePlayer(projectionMap.get(String(id)) || {}, league.scoring_settings || {}), 0);
const name = row => {
  const roster = rosterMap.get(Number(row.roster_id));
  const user = userMap.get(String(roster?.owner_id));
  return String(roster?.metadata?.team_name || user?.metadata?.team_name || user?.display_name || `Team ${row.roster_id}`).trim();
};
const american = probability => {
  const raw = probability >= .5 ? -100 * probability / (1 - probability) : 100 * (1 - probability) / probability;
  const rounded = Math.round(raw / 5) * 5;
  return rounded > -100 && rounded < 100 ? (rounded < 0 ? -100 : 100) : rounded;
};
const grouped = new Map();
for (const row of matchups) {
  if (!grouped.has(row.matchup_id)) grouped.set(row.matchup_id, []);
  grouped.get(row.matchup_id).push(row);
}
const lines = [...grouped.entries()].filter(([,rows]) => rows.length === 2).map(([matchupId, rows]) => {
  const [a,b] = rows, pa = projected(a), pb = projected(b);
  const fairA = Math.max(.18, Math.min(.82, 1 / (1 + Math.exp(-(pa - pb) / 13))));
  return {
    key: `matchup:${season}:${week}:${matchupId}`, season, week, matchupId,
    closesAt: `${season}-09-11T00:15:00.000Z`,
    title: `${name(a)} vs ${name(b)}`,
    projection: `${pa.toFixed(1)}–${pb.toFixed(1)}`,
    outcomes: [
      { label: name(a), odds: american(Math.min(.95, fairA + .025)), projected: Number(pa.toFixed(1)) },
      { label: name(b), odds: american(Math.min(.95, 1 - fairA + .025)), projected: Number(pb.toFixed(1)) },
    ],
  };
});
console.log(JSON.stringify({ season, week, generatedAt: new Date().toISOString(), lines }, null, 2));
