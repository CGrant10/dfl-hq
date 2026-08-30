import { scorePlayer } from "./dfl-scoring.js";

export const ANALYZER_POSITIONS = ["QB", "RB", "WR", "TE"];
const STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1 };
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);
const round = (value, digits = 1) => {
  const scale = 10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
};
const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
const playerPosition = player => String(player?.p || player?.position || "").toUpperCase();
const projectionId = row => row?.player_id == null ? "" : String(row.player_id);

function adpFrom(row, scoringFormat = "ppr") {
  const stats = row?.stats || {};
  const keys = [`adp_${scoringFormat}`, "adp_ppr", "adp_half_ppr", "adp_std"];
  for (const key of keys) {
    const value = finite(stats[key]);
    if (value != null && value > 0 && value < 999) return value;
  }
  return null;
}

function percentileMap(entries, valueOf, { lowerIsBetter = false } = {}) {
  const usable = entries.filter(entry => finite(valueOf(entry)) != null)
    .sort((a, b) => lowerIsBetter ? valueOf(a) - valueOf(b) : valueOf(b) - valueOf(a));
  const out = new Map();
  usable.forEach((entry, index) => {
    const percentile = usable.length <= 1 ? 1 : 1 - index / (usable.length - 1);
    out.set(entry.id, percentile);
  });
  return out;
}

/**
 * One shared player model for every roster. Current projections lead, while
 * the completed season keeps one hot forecast from erasing proven production.
 */
export function buildPlayerPool({ rosters = [], players = {}, previousStats = {},
                                  projections = [], scoringSettings = null,
                                  scoringFormat = "ppr" } = {}) {
  const projectionById = new Map((projections || []).map(row => [projectionId(row), row]));
  const ids = [...new Set(rosters.flatMap(roster => Array.isArray(roster?.players) ? roster.players.map(String) : []))];
  const list = ids.map(id => {
    const meta = players[id] || projectionById.get(id)?.player || {};
    const position = playerPosition(meta);
    const priorLine = previousStats[id] || null;
    const projection = projectionById.get(id) || null;
    const lastPoints = priorLine ? scorePlayer(priorLine, scoringSettings) : null;
    const projectedPoints = projection?.stats ? scorePlayer(projection.stats, scoringSettings) : null;
    const expectedPoints = projectedPoints != null && lastPoints != null
      ? projectedPoints * 0.72 + lastPoints * 0.28
      : projectedPoints ?? lastPoints;
    return {
      id,
      name: meta?.n || meta?.full_name || id,
      position,
      nflTeam: meta?.t || meta?.team || "FA",
      lastPoints: finite(lastPoints),
      projectedPoints: finite(projectedPoints),
      expectedPoints: finite(expectedPoints),
      adp: adpFrom(projection, scoringFormat),
      games: finite(priorLine?.gp),
    };
  }).filter(player => ANALYZER_POSITIONS.includes(player.position));

  const productionPercentile = new Map();
  for (const position of ANALYZER_POSITIONS) {
    const positional = list.filter(player => player.position === position);
    for (const [id, value] of percentileMap(positional, player => player.expectedPoints)) productionPercentile.set(id, value);
  }
  const marketPercentile = percentileMap(list, player => player.adp, { lowerIsBetter: true });

  const pool = new Map();
  for (const player of list) {
    const production = productionPercentile.get(player.id);
    const market = marketPercentile.get(player.id);
    const known = [production, market].filter(value => value != null);
    const value = known.length === 2 ? production * 0.68 + market * 0.32
      : known.length ? known[0] : 0;
    pool.set(player.id, {
      ...player,
      expectedPoints: player.expectedPoints == null ? 0 : round(player.expectedPoints, 2),
      tradeValue: Math.max(1, Math.min(100, Math.round(value * 99 + 1))),
      confidence: player.projectedPoints != null && player.lastPoints != null ? "high"
        : player.projectedPoints != null || player.lastPoints != null ? "medium" : "low",
    });
  }
  return pool;
}

function sortedPlayers(ids, pool, position = null) {
  return (ids || []).map(String).map(id => pool.get(id)).filter(Boolean)
    .filter(player => !position || player.position === position)
    .sort((a, b) => b.expectedPoints - a.expectedPoints || b.tradeValue - a.tradeValue || a.name.localeCompare(b.name));
}

export function optimalLineup(playerIds = [], pool = new Map()) {
  const used = new Set();
  const starters = [];
  for (const position of ANALYZER_POSITIONS) {
    sortedPlayers(playerIds, pool, position).slice(0, STARTERS[position]).forEach(player => {
      used.add(player.id);
      starters.push(player);
    });
  }
  const flex = sortedPlayers(playerIds, pool).filter(player => FLEX_POSITIONS.has(player.position) && !used.has(player.id))[0];
  if (flex) { used.add(flex.id); starters.push(flex); }
  const bench = sortedPlayers(playerIds, pool).filter(player => !used.has(player.id));
  const starterPoints = starters.reduce((sum, player) => sum + player.expectedPoints, 0);
  const depthPoints = bench.slice(0, 5).reduce((sum, player, index) => sum + player.expectedPoints * [0.12, 0.1, 0.08, 0.06, 0.04][index], 0);
  return {
    starters,
    bench,
    starterPoints: round(starterPoints),
    depthPoints: round(depthPoints),
    score: round(starterPoints + depthPoints),
    weeklyPoints: round(starterPoints / 17),
  };
}

function grade(percentile) {
  if (percentile >= .92) return "A+";
  if (percentile >= .82) return "A";
  if (percentile >= .72) return "A−";
  if (percentile >= .62) return "B+";
  if (percentile >= .52) return "B";
  if (percentile >= .42) return "B−";
  if (percentile >= .32) return "C+";
  if (percentile >= .22) return "C";
  if (percentile >= .12) return "C−";
  return "D";
}

function percentileAt(sorted, value) {
  if (sorted.length <= 1) return 1;
  const below = sorted.filter(other => other <= value).length - 1;
  return Math.max(0, below / (sorted.length - 1));
}

export function analyzeLeague({ rosters = [], pool = new Map() } = {}) {
  const base = rosters.map(roster => {
    const ids = Array.isArray(roster.players) ? roster.players.map(String) : [];
    const lineup = optimalLineup(ids, pool);
    const positionScores = Object.fromEntries(ANALYZER_POSITIONS.map(position => {
      const options = sortedPlayers(ids, pool, position);
      const count = STARTERS[position];
      const score = options.slice(0, count).reduce((sum, player) => sum + player.expectedPoints, 0)
        + (options[count]?.expectedPoints || 0) * .15;
      return [position, round(score)];
    }));
    return { ...roster, id: String(roster.roster_id ?? roster.id), playerIds: ids, lineup, positionScores };
  });
  const teamScores = base.map(team => team.lineup.score).sort((a, b) => a - b);
  const positionDistributions = Object.fromEntries(ANALYZER_POSITIONS.map(position => [position,
    base.map(team => team.positionScores[position]).sort((a, b) => a - b)]));
  const ordered = [...base].sort((a, b) => b.lineup.score - a.lineup.score || a.id.localeCompare(b.id));
  return ordered.map((team, index) => {
    const positionGrades = Object.fromEntries(ANALYZER_POSITIONS.map(position => [position, {
      score: team.positionScores[position],
      grade: grade(percentileAt(positionDistributions[position], team.positionScores[position])),
      players: sortedPlayers(team.playerIds, pool, position).slice(0, STARTERS[position] + 1),
    }]));
    const rankedPositions = ANALYZER_POSITIONS.map(position => ({ position, ...positionGrades[position] }))
      .sort((a, b) => b.score - a.score);
    const percentile = percentileAt(teamScores, team.lineup.score);
    return {
      ...team,
      rank: index + 1,
      grade: grade(percentile),
      positionGrades,
      strength: rankedPositions[0]?.position || null,
      weakness: rankedPositions.at(-1)?.position || null,
    };
  });
}

function packageValue(ids, recipientIds, pool) {
  const incoming = sortedPlayers(ids, pool).sort((a, b) => b.tradeValue - a.tradeValue);
  if (!incoming.length) return 0;
  const cutLine = sortedPlayers(recipientIds, pool).sort((a, b) => a.tradeValue - b.tradeValue);
  return round(incoming.reduce((sum, player, index) => {
    if (index === 0) return sum + player.tradeValue;
    const displaced = cutLine[index - 1]?.tradeValue || 0;
    return sum + Math.max(0, player.tradeValue - displaced) * .65;
  }, 0));
}

export function evaluateTrade({ teamA, teamB, sendA = [], sendB = [], pool = new Map() } = {}) {
  if (!teamA || !teamB || !sendA.length || !sendB.length) return null;
  const aSet = new Set(teamA.playerIds.map(String)), bSet = new Set(teamB.playerIds.map(String));
  if (sendA.some(id => !aSet.has(String(id))) || sendB.some(id => !bSet.has(String(id)))) return null;
  const nextA = teamA.playerIds.filter(id => !sendA.map(String).includes(String(id))).concat(sendB.map(String));
  const nextB = teamB.playerIds.filter(id => !sendB.map(String).includes(String(id))).concat(sendA.map(String));
  const beforeA = optimalLineup(teamA.playerIds, pool), beforeB = optimalLineup(teamB.playerIds, pool);
  const afterA = optimalLineup(nextA, pool), afterB = optimalLineup(nextB, pool);
  const valueToA = packageValue(sendB, nextA, pool), valueToB = packageValue(sendA, nextB, pool);
  const high = Math.max(valueToA, valueToB, 1);
  return {
    sendA: sendA.map(String), sendB: sendB.map(String),
    deltaA: round(afterA.score - beforeA.score),
    deltaB: round(afterB.score - beforeB.score),
    weeklyDeltaA: round((afterA.starterPoints - beforeA.starterPoints) / 17),
    weeklyDeltaB: round((afterB.starterPoints - beforeB.starterPoints) / 17),
    valueToA, valueToB,
    fairness: Math.max(0, Math.round(100 - Math.abs(valueToA - valueToB) / high * 100)),
  };
}

/**
 * Search realistic one-for-one, one-for-two and two-for-one structures. A
 * package is judged after roster cuts; extra names do not receive free value.
 */
export function suggestTrades({ teams = [], teamId, playerId, pool = new Map(), limit = 6 } = {}) {
  const mine = teams.find(team => String(team.id) === String(teamId));
  if (!mine || !mine.playerIds.includes(String(playerId))) return [];
  const myExtras = sortedPlayers(mine.playerIds.filter(id => String(id) !== String(playerId)), pool)
    .sort((a, b) => b.tradeValue - a.tradeValue).slice(0, 6);
  const possibilities = [];
  for (const other of teams.filter(team => String(team.id) !== String(mine.id))) {
    const targets = sortedPlayers(other.playerIds, pool).sort((a, b) => b.tradeValue - a.tradeValue).slice(0, 9);
    for (const target of targets) possibilities.push({ other, sendA: [String(playerId)], sendB: [target.id] });
    for (let i = 0; i < Math.min(7, targets.length); i++) {
      for (let j = i + 1; j < Math.min(7, targets.length); j++) {
        possibilities.push({ other, sendA: [String(playerId)], sendB: [targets[i].id, targets[j].id] });
      }
    }
    for (const extra of myExtras) {
      for (const target of targets.slice(0, 6)) possibilities.push({ other, sendA: [String(playerId), extra.id], sendB: [target.id] });
    }
  }
  return possibilities.map(candidate => {
    const result = evaluateTrade({ teamA: mine, teamB: candidate.other, sendA: candidate.sendA, sendB: candidate.sendB, pool });
    if (!result) return null;
    const balancePenalty = Math.abs(result.deltaA - result.deltaB);
    const score = result.fairness + (result.deltaA + result.deltaB) * 2 - balancePenalty;
    return { ...candidate, ...result, score };
  }).filter(Boolean)
    /* A seasonal delta of 30 points is under two points per week. Keep that
       much negotiating room; stricter filtering made positional swaps vanish
       even when both packages were fairly valued. */
    .filter(result => result.fairness >= 66 && result.deltaA >= -30 && result.deltaB >= -30)
    .sort((a, b) => b.score - a.score || b.fairness - a.fairness)
    .filter((result, index, all) => index === all.findIndex(other => String(other.other.id) === String(result.other.id)
      && other.sendA.join(",") === result.sendA.join(",") && other.sendB.join(",") === result.sendB.join(",")))
    .slice(0, limit);
}

export function compareTeams(teamA, teamB) {
  if (!teamA || !teamB) return null;
  return {
    teamA, teamB,
    scoreEdge: round(teamA.lineup.score - teamB.lineup.score),
    weeklyEdge: round(teamA.lineup.weeklyPoints - teamB.lineup.weeklyPoints),
    positions: ANALYZER_POSITIONS.map(position => ({
      position,
      a: teamA.positionGrades[position],
      b: teamB.positionGrades[position],
      winner: teamA.positionGrades[position].score === teamB.positionGrades[position].score ? null
        : teamA.positionGrades[position].score > teamB.positionGrades[position].score ? "a" : "b",
    })),
  };
}
