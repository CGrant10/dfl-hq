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

  /* Keep the public table legible even when the simulator has not produced a
     seed yet. Record and points are the league's real tiebreaking evidence;
     simulated odds only decide between otherwise similar resumes. */
  const ordered = [...rows].sort((a, b) => number(b.projection?.playoffOdds) - number(a.projection?.playoffOdds)
    || b.wins - a.wins || b.points - a.points || number(a.rank) - number(b.rank));
  ordered.forEach((row, index) => {
    // A seed is a position in this ordered field, not a rounded simulation
    // average (several teams can share that average).
    row.projectedSeed = index + 1;
    row.expectedFinish = number(row.projection?.seed) || null;
    row.playoffOdds = row.status === "clinched" ? 1 : row.status === "eliminated" ? 0
      : row.projection?.playoffOdds == null ? null : Math.max(0, Math.min(1, number(row.projection.playoffOdds)));
  });
  const cutline = ordered[Math.min(berths - 1, ordered.length - 1)] || null;
  rows.forEach(row => {
    const target = cutline ? cutline.wins : 0;
    row.winsNeeded = row.status === "clinched" ? 0 : Math.max(0, Math.min(row.remaining, target + 1 - row.wins));
  });

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

  return { season, week: Number(week) || 1, berths, rows, cutline, gameOfWeek: games[0] || null, projected: ordered };
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

export function scenarioLine(row, berths = 8) {
  if (!row) return "No playoff scenario yet.";
  if (row.status === "clinched") return `Seed #${row.projectedSeed} projection · playing for position.`;
  if (row.status === "eliminated") return "The postseason path is closed.";
  const odds = playoffChance(row);
  const need = number(row.winsNeeded);
  if (!row.remaining) return `${odds} playoff chance · awaiting the final table.`;
  if (!need) return `${odds} playoff chance · currently inside the top ${berths}.`;
  return `${odds} playoff chance · target ${need} win${need === 1 ? "" : "s"} over the final ${row.remaining}.`;
}

export function playoffChance(row) {
  if (row?.status === "clinched") return "100%";
  if (row?.status === "eliminated") return "0%";
  const value = row?.playoffOdds ?? row?.projection?.playoffOdds;
  if (value == null || !Number.isFinite(Number(value))) return "—";
  const odds = Math.round(Math.max(0, Math.min(1, Number(value))) * 100);
  return odds === 100 ? ">99%" : odds === 0 ? "<1%" : `${odds}%`;
}
