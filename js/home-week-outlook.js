import { defenseDifficulty, matchupNote, startSitAdvice } from "./weekly-outlook.js";

const POSITIONS = ["QB", "RB", "WR", "TE", "K", "DEF"];
const num = value => Number.isFinite(Number(value)) ? Number(value) : null;
const id = value => value == null ? "" : String(value);
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;

function ownerMap(teams = []) {
  const owners = new Map();
  for (const team of teams) for (const playerId of team.playerIds || []) {
    owners.set(id(playerId), { id: id(team.id ?? team.roster_id), name: teamName(team), sleeperUserId: id(team.sleeper_user_id) });
  }
  return owners;
}

function playerView(player, owners, defense) {
  const owner = owners.get(id(player.id));
  return {
    id: id(player.id), name: player.name || id(player.id), position: player.position || "",
    nflTeam: player.team || "", opponent: player.opponent || "", points: num(player.points) || 0,
    injuryStatus: player.injuryStatus || null, ownerName: owner?.name || "Free agent",
    ownerId: owner?.id || null, matchup: matchupNote(player, defense),
  };
}

/** One shared Home forecast derived from the exact pool used by Start/Sit. */
export function buildHomeWeekOutlook({ analysis, weekly, fixtures = [], meSleeperId = null } = {}) {
  if (analysis?.state !== "ready" || !weekly?.pool?.size || !weekly?.week) return null;
  const owners = ownerMap(analysis.teams || []);
  const defense = defenseDifficulty(weekly.pool);
  const leaders = Object.fromEntries(POSITIONS.map(position => [position, [...weekly.pool.values()]
    .filter(player => player.position === position && player.hasGame && !player.isOut && num(player.points) != null)
    .sort((a, b) => num(b.points) - num(a.points) || String(a.name).localeCompare(String(b.name)))
    .slice(0, 3).map(player => playerView(player, owners, defense))]));

  const predictions = fixtures.map(fixture => {
    const a = fixture?.a, b = fixture?.b;
    const aPoints = num(a?.projection), bPoints = num(b?.projection);
    if (!a || !b || aPoints == null || bPoints == null) return null;
    const winner = aPoints >= bPoints ? a : b;
    const loser = winner === a ? b : a;
    const winnerPoints = winner === a ? aPoints : bPoints;
    const loserPoints = winner === a ? bPoints : aPoints;
    const margin = Math.abs(aPoints - bPoints);
    return {
      winner: { ...winner, projection: winnerPoints }, loser: { ...loser, projection: loserPoints }, margin,
      confidence: margin < 3 ? "TOSS-UP" : margin < 8 ? "LEAN" : margin < 15 ? "FAVORED" : "HEAVY FAVORITE",
      isMine: [a.sleeper_user_id, b.sleeper_user_id].some(uid => id(uid) === id(meSleeperId)),
    };
  }).filter(Boolean).sort((a, b) => Number(b.isMine) - Number(a.isMine) || b.margin - a.margin);

  const mine = (analysis.teams || []).find(team => id(team.sleeper_user_id) === id(meSleeperId));
  let startSit = null;
  if (mine) {
    const advice = startSitAdvice({
      playerIds: mine.playerIds || [], starterIds: mine.starters || [], weekly: weekly.pool, defense,
    });
    startSit = {
      teamName: teamName(mine), lineupIsSet: advice.lineupIsSet, pointsOnBench: advice.pointsOnBench,
      alarms: advice.alarms.map(alarm => ({ player: playerView(alarm.player, owners, defense), reason: alarm.reason })),
      swaps: advice.swaps.slice(0, 3).map(swap => ({
        start: playerView(swap.in, owners, defense), sit: playerView(swap.out, owners, defense),
        gain: swap.gain, urgent: swap.urgent,
      })),
    };
  }
  return { season: weekly.season, week: weekly.week, predictions, leaders, startSit };
}

export { POSITIONS as HOME_OUTLOOK_POSITIONS };

