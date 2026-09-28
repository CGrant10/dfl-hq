import { REGULAR_SEASON_WEEKS } from "./season-outlook.js";

const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const key = value => value == null ? "" : String(value);
const nameOf = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;

function statusFor(row, rows, berths) {
  const maxWins = row.wins + row.remaining;
  const canCatch = rows.filter(other => other.id !== row.id && other.wins + other.remaining >= row.wins).length;
  if (canCatch < berths) return "clinched";
  const alreadyBeyond = rows.filter(other => other.id !== row.id && other.wins > maxWins).length;
  if (alreadyBeyond >= berths) return "eliminated";
  return "alive";
}

export function buildLeagueStakes({ teams = [], standings = [], projections = new Map(), fixtures = [],
  season = null, week = 1, playoffTeams = 8 } = {}) {
  const current = standings.filter(row => Number(row.season) === Number(season));
  const byUser = new Map(current.map(row => [key(row.sleeper_user_id), row]));
  const berths = Math.max(1, Math.min(Number(playoffTeams) || 8, teams.length || 1));
  const rows = teams.map(team => {
    const standing = byUser.get(key(team.sleeper_user_id)) || {};
    const wins = number(standing.wins), losses = number(standing.losses), ties = number(standing.ties);
    const played = wins + losses + ties;
    const projection = projections.get(key(team.id)) || null;
    return {
      id: key(team.id), sleeperUserId: key(team.sleeper_user_id), name: nameOf(team), identity: team.identity || null,
      wins, losses, ties, played, remaining: Math.max(0, REGULAR_SEASON_WEEKS - played),
      rank: number(standing.rank) || null, points: number(standing.points_for), projection,
    };
  });
  rows.forEach(row => { row.status = statusFor(row, rows, berths); });

  const rowByUser = new Map(rows.map(row => [row.sleeperUserId, row]));
  const games = fixtures.map(fixture => {
    const a = rowByUser.get(key(fixture?.a?.sleeper_user_id));
    const b = rowByUser.get(key(fixture?.b?.sleeper_user_id));
    if (!a || !b) return null;
    const aProjection = number(fixture.a.projection), bProjection = number(fixture.b.projection);
    const spread = Math.abs(aProjection - bProjection);
    const aOdds = number(a.projection?.playoffOdds), bOdds = number(b.projection?.playoffOdds);
    const bubble = 1 - Math.min(1, (Math.abs(aOdds - .5) + Math.abs(bOdds - .5)) / 1.2);
    const alive = Number(a.status === "alive") + Number(b.status === "alive");
    const importance = alive * 30 + bubble * 45 + Math.max(0, 20 - spread);
    return { a, b, spread, aProjection, bProjection, importance };
  }).filter(Boolean).sort((a, b) => b.importance - a.importance);

  const projected = [...rows].sort((a, b) => number(b.projection?.playoffOdds) - number(a.projection?.playoffOdds)
    || number(a.projection?.seed) - number(b.projection?.seed));
  return { season, week: Number(week) || 1, berths, rows, gameOfWeek: games[0] || null, projected };
}

export function stakeLine(row) {
  if (!row) return "Season outlook unavailable";
  if (row.status === "clinched") return "PLAYOFF BERTH CLINCHED";
  if (row.status === "eliminated") return "ELIMINATED FROM PLAYOFF CONTENTION";
  const odds = Math.round(number(row.projection?.playoffOdds) * 100);
  if (odds >= 80) return "CONTROL OF THE PLAYOFF PATH";
  if (odds >= 55) return "INSIDE THE PROJECTED FIELD";
  if (odds >= 30) return "ON THE PLAYOFF BUBBLE";
  return "NEEDS A RUN NOW";
}
