import { scorePlayer } from "./dfl-scoring.js";

export const ANALYZER_POSITIONS = ["QB", "RB", "WR", "TE"];
export const ANALYZER_UNITS = [...ANALYZER_POSITIONS, "FLEX"];
const STARTERS = { QB: 1, RB: 2, WR: 2, TE: 1 };
const FLEX_POSITIONS = new Set(["RB", "WR", "TE"]);
const DEPTH_WEIGHTS = [1, .84, .68, .52, .36];
const OUT_STATUSES = new Set(["Out", "IR", "PUP", "Sus", "NA", "DNR"]);
const RISKY_STATUSES = new Set(["Questionable", "Doubtful"]);
const round = (value, digits = 1) => {
  const scale = 10 ** digits;
  return Math.round((Number(value) || 0) * scale) / scale;
};
const finite = value => value == null || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const playerPosition = player => String(player?.p || player?.position || "").toUpperCase();
const projectionId = row => row?.player_id == null ? "" : String(row.player_id);

function recentProduction(weeks = [], scoringSettings = null) {
  const byPlayer = new Map();
  for (const rows of weeks || []) for (const row of rows || []) {
    const id = projectionId(row);
    const games = finite(row?.stats?.gp);
    if (!id || games === 0 || !row?.stats) continue;
    const points = scorePlayer(row.stats, scoringSettings);
    if (!Number.isFinite(points) || (games == null && points === 0)) continue;
    if (!byPlayer.has(id)) byPlayer.set(id, []);
    byPlayer.get(id).push(points);
  }
  return byPlayer;
}

function injuryProfile(status, playerStatus) {
  const injuryStatus = String(status || "").trim() || null;
  const rosterStatus = String(playerStatus || "").trim() || null;
  const reserve = /injured reserve|physically unable|pup/i.test(rosterStatus || "");
  const isOut = reserve || OUT_STATUSES.has(injuryStatus);
  const isRisky = !isOut && RISKY_STATUSES.has(injuryStatus);
  const missedGames = reserve || ["IR", "PUP"].includes(injuryStatus) ? 3
    : ["Out", "Sus", "NA", "DNR"].includes(injuryStatus) ? 1
    : injuryStatus === "Doubtful" ? .65 : injuryStatus === "Questionable" ? .15 : 0;
  const valueFactor = reserve || ["IR", "PUP"].includes(injuryStatus) ? .86
    : injuryStatus === "Out" ? .95 : injuryStatus === "Doubtful" ? .97
    : injuryStatus === "Questionable" ? .99 : 1;
  return { injuryStatus, playerStatus: rosterStatus, isOut, isRisky, missedGames, valueFactor };
}

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
export function buildPlayerPool({ rosters = [], players = {}, previousStats = {}, currentStats = {},
                                  projections = [], weeklyProjections = [], recentStats = [], trending = null,
                                  scoringSettings = null,
                                  scoringFormat = "ppr" } = {}) {
  const projectionById = new Map((projections || []).map(row => [projectionId(row), row]));
  const weeklyById = new Map((weeklyProjections || []).map(row => [projectionId(row), row]));
  const recentById = recentProduction(recentStats, scoringSettings);
  const ids = [...new Set(rosters.flatMap(roster => Array.isArray(roster?.players) ? roster.players.map(String) : []))];
  const list = ids.map(id => {
    const meta = players[id] || projectionById.get(id)?.player || {};
    const position = playerPosition(meta);
    const priorLine = previousStats[id] || null;
    const currentLine = currentStats[id] || null;
    const projection = projectionById.get(id) || null;
    const weekly = weeklyById.get(id) || null;
    const weeklyMeta = weekly?.player || {};
    const availability = injuryProfile(weekly?.injury_status || weeklyMeta.injury_status || meta?.i || meta?.injury_status,
      weeklyMeta.status || meta?.s || meta?.status);
    const lastPoints = priorLine ? scorePlayer(priorLine, scoringSettings) : null;
    const projectedPoints = projection?.stats ? scorePlayer(projection.stats, scoringSettings) : null;
    const games = finite(priorLine?.gp);
    const seasonGames = games != null && games > 0 ? Math.min(17, games) : 17;
    const hasPriorProduction = lastPoints != null && lastPoints > 0;
    const priorPace = hasPriorProduction ? lastPoints / Math.max(1, seasonGames) * 17 : null;
    const priorReliability = games == null ? 1 : Math.max(.25, Math.min(1, games / 17));
    const projectionWeight = .74 + (1 - priorReliability) * .14;
    const baselinePoints = projectedPoints != null && priorPace != null
      ? projectedPoints * projectionWeight + priorPace * (1 - projectionWeight)
      : projectedPoints ?? priorPace;
    const currentPoints = currentLine ? scorePlayer(currentLine, scoringSettings) : null;
    const currentGames = Math.max(0, Math.min(17, finite(currentLine?.gp) || 0));
    const currentPace = currentGames > 0 ? currentPoints / currentGames * 17 : null;
    const recentScores = recentById.get(id) || [];
    const recentAverage = recentScores.length ? recentScores.reduce((sum, points) => sum + points, 0) / recentScores.length : null;
    /* Current production earns influence gradually: one wild Sunday cannot
       rewrite a season, but by midseason the model should reflect this year
       more than its preseason priors. Actual points already earned are never
       projected away; only the unplayed games use the blended forward pace. */
    /* Two or three real games should matter without taking the wheel from a
       full projection. Reach the in-season blend sooner, then cap it so a
       short hot streak never becomes the whole forecast. */
    const currentWeight = Math.min(.65, currentGames / 6 * .65);
    const baselinePerGame = baselinePoints == null ? null : baselinePoints / 17;
    const currentPerGame = currentGames > 0 ? currentPoints / currentGames : null;
    /* Recent form is a correction inside the in-season share, not a second
       full-strength input. Three hot Sundays can move the forecast, but they
       cannot erase the season projection or the larger current sample. */
    const formWeight = Math.min(.3, recentScores.length / 3 * .3);
    const formPerGame = currentPerGame != null && recentAverage != null
      ? currentPerGame * (1 - formWeight) + recentAverage * formWeight
      : currentPerGame ?? recentAverage;
    const forwardPerGame = baselinePerGame != null && formPerGame != null
      ? baselinePerGame * (1 - currentWeight) + formPerGame * currentWeight
      : baselinePerGame ?? formPerGame;
    const remainingGames = Math.max(0, 17 - currentGames);
    const expectedPoints = currentGames > 0 && forwardPerGame != null
      ? currentPoints + forwardPerGame * Math.max(0, remainingGames - Math.min(remainingGames, availability.missedGames))
      : baselinePoints == null ? null : baselinePoints - (baselinePerGame || 0) * Math.min(17, availability.missedGames);
    const priorWindowGames = Math.max(0, currentGames - recentScores.length);
    const priorWindowAverage = priorWindowGames >= 2
      ? (currentPoints - recentScores.reduce((sum, points) => sum + points, 0)) / priorWindowGames
      : baselinePerGame;
    const recentDelta = recentAverage != null && priorWindowAverage != null ? recentAverage - priorWindowAverage : null;
    return {
      id,
      name: meta?.n || meta?.full_name || id,
      position,
      nflTeam: meta?.t || meta?.team || "FA",
      lastPoints: finite(lastPoints),
      priorPace: finite(priorPace),
      projectedPoints: finite(projectedPoints),
      currentPoints: finite(currentPoints),
      currentGames,
      currentPace: finite(currentPace),
      recentAverage: finite(recentAverage),
      recentGames: recentScores.length,
      recentDelta: finite(recentDelta),
      expectedPoints: finite(expectedPoints),
      adp: adpFrom(projection, scoringFormat),
      games,
      hasPriorProduction,
      injuryStatus: availability.injuryStatus,
      playerStatus: availability.playerStatus,
      practiceParticipation: weeklyMeta.practice_participation || meta?.pp || meta?.practice_participation || null,
      isOut: availability.isOut,
      isRisky: availability.isRisky,
      injuryValueFactor: availability.valueFactor,
      marketAdds: Number(trending?.adds?.get?.(id)) || 0,
      marketDrops: Number(trending?.drops?.get?.(id)) || 0,
    };
  }).filter(player => ANALYZER_POSITIONS.includes(player.position));

  const productionPercentile = new Map();
  for (const position of ANALYZER_POSITIONS) {
    const positional = list.filter(player => player.position === position);
    for (const [id, value] of percentileMap(positional, player => player.expectedPoints)) productionPercentile.set(id, value);
  }
  const marketPercentile = percentileMap(list, player => player.adp, { lowerIsBetter: true });
  const positionRanks = new Map();
  for (const position of ANALYZER_POSITIONS) {
    const ordered = list.filter(player => player.position === position)
      .sort((a, b) => (b.expectedPoints || 0) - (a.expectedPoints || 0));
    ordered.forEach((player, index) => positionRanks.set(player.id, { rank: index + 1, count: ordered.length }));
  }

  const pool = new Map();
  for (const player of list) {
    const production = productionPercentile.get(player.id);
    const market = marketPercentile.get(player.id);
    const known = [production, market].filter(value => value != null);
    /* ADP is useful before kickoff, but every completed game makes it less
       relevant than what the player is doing now. */
    const marketWeight = .32 * (1 - Math.min(.75, (player.currentGames || 0) / 10 * .75));
    const value = known.length === 2 ? production * (1 - marketWeight) + market * marketWeight
      : known.length ? known[0] : 0;
    const expectedPerGame = (player.expectedPoints || 0) / 17;
    const lastPerGame = player.hasPriorProduction ? player.lastPoints / Math.max(1, player.games || 17) : null;
    const recentTrend = player.recentGames >= 2 && player.recentDelta != null
      ? player.recentDelta > Math.max(1.5, Math.abs((player.recentAverage || 0) - player.recentDelta) * .15) ? "up"
        : player.recentDelta < -Math.max(1.5, Math.abs((player.recentAverage || 0) - player.recentDelta) * .15) ? "down" : "steady"
      : null;
    const baseTradeValue = value * 99 + 1;
    const marketActivity = player.marketAdds + player.marketDrops;
    const marketBalance = marketActivity >= 25 ? (player.marketAdds - player.marketDrops) / marketActivity : 0;
    const marketFactor = 1 + marketBalance * .02;
    pool.set(player.id, {
      ...player,
      expectedPoints: player.expectedPoints == null ? 0 : round(player.expectedPoints, 2),
      expectedPerGame: round(expectedPerGame, 2),
      lastPerGame: lastPerGame == null ? null : round(lastPerGame, 2),
      trend: recentTrend || (lastPerGame == null ? "new" : expectedPerGame - lastPerGame > 1.25 ? "up"
        : lastPerGame - expectedPerGame > 1.25 ? "down" : "steady"),
      trendBasis: recentTrend ? "recent" : lastPerGame == null ? "projection" : "year-over-year",
      marketTrend: marketBalance > .2 ? "up" : marketBalance < -.2 ? "down" : "steady",
      positionRank: positionRanks.get(player.id)?.rank || null,
      positionCount: positionRanks.get(player.id)?.count || null,
      tradeValue: Math.max(1, Math.min(100, Math.round(baseTradeValue * player.injuryValueFactor * marketFactor))),
    });
  }
  return pool;
}

function sortedPlayers(ids, pool, position = null) {
  return (ids || []).map(String).map(id => pool.get(id)).filter(Boolean)
    .filter(player => !position || player.position === position)
    .sort((a, b) => b.expectedPoints - a.expectedPoints || b.tradeValue - a.tradeValue || a.name.localeCompare(b.name));
}

function setLineup(playerIds, starterIds, pool) {
  const roster = new Set((playerIds || []).map(String));
  const starters = (starterIds || []).map(String).filter(id => roster.has(id)).map(id => pool.get(id)).filter(Boolean)
    .filter(player => ANALYZER_POSITIONS.includes(player.position));
  const counts = Object.fromEntries(ANALYZER_POSITIONS.map(position => [position, starters.filter(player => player.position === position).length]));
  const legal = starters.length === 7 && counts.QB === 1 && counts.TE === 1 && counts.RB >= 2 && counts.WR >= 2;
  if (!legal) return null;
  const baseCounts = { QB: 0, RB: 0, WR: 0, TE: 0 };
  let flexId = null;
  for (const player of starters) {
    if (baseCounts[player.position] < STARTERS[player.position]) baseCounts[player.position]++;
    else if (FLEX_POSITIONS.has(player.position)) flexId = player.id;
  }
  return { starters, flexId };
}

export function optimalLineup(playerIds = [], pool = new Map(), { starterIds = [] } = {}) {
  const used = new Set();
  const set = setLineup(playerIds, starterIds, pool);
  const starters = set?.starters || [];
  let flexId = set?.flexId || null;
  if (set) starters.forEach(player => used.add(player.id));
  else {
    for (const position of ANALYZER_POSITIONS) {
      sortedPlayers(playerIds, pool, position).slice(0, STARTERS[position]).forEach(player => {
        used.add(player.id);
        starters.push(player);
      });
    }
    const flex = sortedPlayers(playerIds, pool).filter(player => FLEX_POSITIONS.has(player.position) && !used.has(player.id))[0];
    if (flex) { used.add(flex.id); starters.push(flex); flexId = flex.id; }
  }
  const bench = sortedPlayers(playerIds, pool).filter(player => !used.has(player.id));
  const starterPoints = starters.reduce((sum, player) => sum + player.expectedPoints, 0);
  /*
    SLEEPER'S OWN NUMBER, CARRIED SEPARATELY.

    expectedPoints is a blend - Sleeper's projection weighted against last
    season's pace - and that blend is this app's opinion, not Sleeper's. Where
    the two disagree is worth being able to see, so the unblended total rides
    alongside rather than replacing anything. Null-safe: a lineup of players
    Sleeper has not projected reports nothing rather than a hollow zero.
  */
  const projected = starters.map(player => player.projectedPoints).filter(value => value != null);
  const sleeperPoints = projected.length ? projected.reduce((sum, value) => sum + value, 0) : null;
  const depthScore = bench.slice(0, 5).reduce((sum, player, index) => sum + player.expectedPoints * DEPTH_WEIGHTS[index], 0);
  return {
    starters,
    bench,
    flexId,
    source: set ? "set" : "optimized",
    starterPoints: round(starterPoints),
    sleeperStarterPoints: sleeperPoints == null ? null : round(sleeperPoints),
    sleeperWeeklyPoints: sleeperPoints == null ? null : round(sleeperPoints / 17),
    sleeperProjectedCount: projected.length,
    depthScore: round(depthScore),
    score: round(starterPoints),
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
  const below = sorted.filter(other => other < value).length;
  const tied = sorted.filter(other => other === value).length;
  return Math.max(0, Math.min(1, (below + Math.max(0, tied - 1) / 2) / (sorted.length - 1)));
}

export function analyzeLeague({ rosters = [], pool = new Map() } = {}) {
  const base = rosters.map(roster => {
    const ids = Array.isArray(roster.players) ? roster.players.map(String) : [];
    const lineup = optimalLineup(ids, pool, { starterIds: Array.isArray(roster.starters) ? roster.starters : [] });
    const unitScores = Object.fromEntries(ANALYZER_POSITIONS.map(position => {
      const options = lineup.starters.filter(player => player.position === position)
        .sort((a, b) => b.expectedPoints - a.expectedPoints).slice(0, STARTERS[position]);
      const score = options.reduce((sum, player) => sum + player.expectedPoints, 0);
      return [position, round(score)];
    }));
    unitScores.FLEX = round(lineup.starters.find(player => player.id === lineup.flexId)?.expectedPoints || 0);
    const rosterValue = sortedPlayers(ids, pool).slice(0, 12).reduce((sum, player) => sum + player.tradeValue, 0);
    return { ...roster, id: String(roster.roster_id ?? roster.id), playerIds: ids, lineup, positionScores: unitScores, rosterValue };
  });
  const depthScores = base.map(team => team.lineup.depthScore).sort((a, b) => a - b);
  const rosterValues = base.map(team => team.rosterValue).sort((a, b) => a - b);
  const positionDistributions = Object.fromEntries(ANALYZER_UNITS.map(position => [position,
    base.map(team => team.positionScores[position]).sort((a, b) => a - b)]));
  const rated = base.map(team => {
    /* A starter grade summarizes the five units members can inspect below.
       Equal unit weight prevents a high-scoring position such as RB or QB from
       overpowering several weaker units simply because its raw scale is larger. */
    const unitPercentiles = Object.fromEntries(ANALYZER_UNITS.map(position => [position,
      percentileAt(positionDistributions[position], team.positionScores[position])]));
    const starterPercentile = ANALYZER_UNITS.reduce((sum, position) => sum + unitPercentiles[position], 0) / ANALYZER_UNITS.length;
    const depthPercentile = percentileAt(depthScores, team.lineup.depthScore);
    const valuePercentile = percentileAt(rosterValues, team.rosterValue);
    return { ...team, unitPercentiles, starterPercentile, depthPercentile, valuePercentile,
      overallPercentile: starterPercentile * .72 + depthPercentile * .18 + valuePercentile * .1 };
  });
  const ordered = [...rated].sort((a, b) => b.lineup.starterPoints - a.lineup.starterPoints || a.id.localeCompare(b.id));
  return ordered.map((team, index) => {
    const positionGrades = Object.fromEntries(ANALYZER_UNITS.map(position => [position, {
      score: team.positionScores[position],
      leagueRank: 1 + base.filter(other => other.positionScores[position] > team.positionScores[position]).length,
      leagueSize: base.length,
      percentile: team.unitPercentiles[position],
      grade: grade(team.unitPercentiles[position]),
      starters: position === "FLEX"
        ? team.lineup.starters.filter(player => player.id === team.lineup.flexId)
        : team.lineup.starters.filter(player => player.position === position)
          .sort((a, b) => b.expectedPoints - a.expectedPoints).slice(0, STARTERS[position]),
      depth: position === "FLEX" ? [] : team.lineup.bench.filter(player => player.position === position).slice(0, 2),
    }]));
    const rankedPositions = ANALYZER_POSITIONS.map(position => ({ position, ...positionGrades[position] }))
      .sort((a, b) => b.percentile - a.percentile || a.leagueRank - b.leagueRank);
    const internallyCovered = unit => {
      const reserve = unit.depth?.[0];
      const starter = [...(unit.starters || [])].sort((a, b) => a.expectedPoints - b.expectedPoints)[0];
      if (!reserve || !starter) return false;
      return reserve.expectedPoints >= starter.expectedPoints * .85
        || reserve.tradeValue >= starter.tradeValue * .9;
    };
    const need = [...rankedPositions].reverse()
      .find(unit => unit.percentile < .32 && !internallyCovered(unit))?.position || null;
    return {
      ...team,
      rank: index + 1,
      overallRank: 1 + rated.filter(other => other.overallPercentile > team.overallPercentile).length,
      grade: grade(team.starterPercentile),
      starterGrade: grade(team.starterPercentile),
      depthGrade: grade(team.depthPercentile),
      overallGrade: grade(team.overallPercentile),
      positionGrades,
      strength: rankedPositions[0]?.position || null,
      lowestUnit: rankedPositions.at(-1)?.position || null,
      weakness: need,
      need,
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

export function evaluateMultiTeamTrade({ teams = [], sends = [], pool = new Map() } = {}) {
  if (teams.length < 2 || teams.length !== sends.length || teams.some(team => !team || !Array.isArray(team.playerIds))
    || new Set(teams.map(team => String(team.id))).size !== teams.length) return null;
  const packages = sends.map(ids => (ids || []).map(String));
  if (packages.some(ids => !ids.length) || teams.some((team, index) => {
    const owned = new Set(team.playerIds.map(String));
    return packages[index].some(id => !owned.has(id));
  })) return null;
  const count = teams.length;
  const next = teams.map((team, index) => team.playerIds.filter(id => !packages[index].includes(String(id)))
    .concat(packages[(index + count - 1) % count]));
  const before = teams.map(team => optimalLineup(team.playerIds, pool));
  const after = next.map(ids => optimalLineup(ids, pool));
  const values = teams.map((_, index) => packageValue(packages[(index + count - 1) % count], next[index], pool));
  const high = Math.max(...values, 1), low = Math.min(...values);
  const weekly = teams.map((_, index) => round((after[index].starterPoints - before[index].starterPoints) / 17));
  return {
    sends: packages, values, weeklyDeltas: weekly,
    deltas: teams.map((_, index) => round(after[index].score - before[index].score)),
    fairness: Math.max(0, Math.round(low / high * 100)),
  };
}

export function evaluateThreeWayTrade({ teamA, teamB, teamC, sendA = [], sendB = [], sendC = [], pool = new Map() } = {}) {
  const result = evaluateMultiTeamTrade({ teams: [teamA, teamB, teamC], sends: [sendA, sendB, sendC], pool });
  if (!result) return null;
  return {
    ...result,
    sendA: result.sends[0], sendB: result.sends[1], sendC: result.sends[2],
    valueToA: result.values[0], valueToB: result.values[1], valueToC: result.values[2], valueOutA: result.values[1],
    weeklyDeltaA: result.weeklyDeltas[0], weeklyDeltaB: result.weeklyDeltas[1], weeklyDeltaC: result.weeklyDeltas[2],
    deltaA: result.deltas[0], deltaB: result.deltas[1], deltaC: result.deltas[2],
  };
}

function tradeShapes(maxPlayers = 4, shapes = []) {
  if (shapes.length) return shapes.map(shape => String(shape).split("-").map(Number))
    .filter(([send, receive]) => send > 0 && receive > 0 && send + receive <= maxPlayers);
  const result = [];
  for (let send = 1; send < maxPlayers; send++) {
    for (let receive = 1; receive + send <= maxPlayers; receive++) result.push([send, receive]);
  }
  return result;
}

function tradePackages(players, size, required = [], cap = 40) {
  const requiredIds = [...new Set(required.map(String))];
  if (requiredIds.length > size) return [];
  const available = players.map(player => String(player.id)).filter(id => !requiredIds.includes(id));
  if (size === requiredIds.length) return [requiredIds];
  const packages = [];
  const needed = size - requiredIds.length;
  const visit = (start, chosen) => {
    if (chosen.length === needed) { packages.push([...requiredIds, ...chosen]); return; }
    for (let index = start; index <= available.length - (needed - chosen.length); index++) {
      visit(index + 1, [...chosen, available[index]]);
    }
  };
  visit(0, []);
  if (packages.length <= cap) return packages;
  const sampled = [];
  for (let index = 0; index < cap; index++) sampled.push(packages[Math.round(index * (packages.length - 1) / (cap - 1))]);
  return sampled.filter((pkg, index, all) => index === all.findIndex(other => other.join(",") === pkg.join(",")));
}

function rawPackageValue(ids, pool) {
  return ids.reduce((sum, id) => sum + (Number(pool.get(String(id))?.tradeValue) || 0), 0);
}

function evaluationCandidates(possibilities, pool, cap = 900) {
  if (possibilities.length <= cap) return possibilities;
  const ordered = possibilities.map(candidate => {
    const send = rawPackageValue(candidate.sendA, pool), receive = rawPackageValue(candidate.sendB, pool);
    return { candidate, gap: Math.abs(send - receive) / Math.max(send, receive, 1) };
  }).sort((a, b) => a.gap - b.gap);
  const closeCount = Math.round(cap * .62), selected = ordered.slice(0, closeCount).map(item => item.candidate);
  const remainder = ordered.slice(closeCount), spreadCount = cap - selected.length;
  for (let index = 0; index < spreadCount; index++) {
    selected.push(remainder[Math.round(index * (remainder.length - 1) / Math.max(1, spreadCount - 1))].candidate);
  }
  return selected;
}

/* A global cap naturally fills with 2-for-2s because that shape has far more
   combinations than 1-for-2 or 3-for-1. Give every requested shape its own
   evaluation budget first, then let value proximity choose within the shape. */
function shapeBalancedCandidates(possibilities, pool, cap = 1200) {
  if (possibilities.length <= cap) return possibilities;
  const groups = new Map();
  for (const candidate of possibilities) {
    const shape = candidate.shape || `${candidate.sendA.length}-${candidate.sendB.length}`;
    if (!groups.has(shape)) groups.set(shape, []);
    groups.get(shape).push(candidate);
  }
  const perShape = Math.max(4, Math.floor(cap / Math.max(1, groups.size)));
  return [...groups.values()].flatMap(group => evaluationCandidates(group, pool, perShape));
}

/* Before evaluation gets expensive, reserve a candidate budget for every
   opponent. Without this pass a league-wide search can spend its entire cap
   on the first few rosters that happen to produce the most combinations. */
function partnerBalancedCandidates(possibilities, pool, cap = 1800) {
  const groups = new Map();
  for (const candidate of possibilities) {
    const partner = String(candidate.other?.id ?? "");
    if (!groups.has(partner)) groups.set(partner, []);
    groups.get(partner).push(candidate);
  }
  if (groups.size <= 1) return shapeBalancedCandidates(possibilities, pool, Math.min(cap, 1200));
  const perPartner = Math.max(120, Math.floor(cap / groups.size));
  return [...groups.values()].flatMap(group => shapeBalancedCandidates(group, pool, perPartner));
}

function pairPackages(sendPackages, receivePackages, pool) {
  if (!sendPackages.length || !receivePackages.length) return [];
  if (sendPackages.length * receivePackages.length <= 320) {
    return sendPackages.flatMap(sendA => receivePackages.map(sendB => ({ sendA, sendB })));
  }
  const right = receivePackages.map(ids => ({ ids, value: rawPackageValue(ids, pool) })).sort((a, b) => a.value - b.value);
  const pairs = [];
  for (const sendA of sendPackages) {
    const target = rawPackageValue(sendA, pool);
    let low = 0, high = right.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (right[mid].value < target) low = mid + 1; else high = mid;
    }
    const indices = new Set([0, right.length - 1]);
    for (let offset = -2; offset <= 2; offset++) indices.add(Math.max(0, Math.min(right.length - 1, low + offset)));
    for (const index of indices) pairs.push({ sendA, sendB: right[index].ids });
  }
  return pairs;
}

export function tradeSuggestionTier(result) {
  if (!result) return null;
  const high = Math.max(Number(result.valueToA) || 0, Number(result.valueToB) || 0, 1);
  const edge = ((Number(result.valueToA) || 0) - (Number(result.valueToB) || 0)) / high * 100;
  const weeklyA = Number(result.weeklyDeltaA) || 0, weeklyB = Number(result.weeklyDeltaB) || 0;
  const lineupGap = weeklyA - weeklyB;
  /* Fair means both the asset exchange and the lineup consequence are close.
     Direction matters below that line: winning the value is a steal attempt;
     paying the premium to land the target is an aggressive offer. */
  if (result.fairness >= 90 && Math.abs(lineupGap) <= 1.25 && Math.min(weeklyA, weeklyB) >= -.75) return "fair";
  if (edge >= 6 || lineupGap >= 1.5) return "steal";
  return "aggressive";
}

function suggestionScore(result, intent = "press") {
  const mutualGain = Math.max(-2, result.weeklyDeltaA) + Math.max(-2, result.weeklyDeltaB);
  if (intent === "fair") return result.fairness * 1.5 + mutualGain * 10;
  if (intent === "swing") return result.fairness * .45 + result.weeklyDeltaA * 22 + Math.max(0, result.valueToA - result.valueToB) * .35;
  return result.fairness + result.weeklyDeltaA * 15 + result.weeklyDeltaB * 5;
}

function shapeOrder(shape) {
  const [send, receive] = String(shape).split("-").map(Number);
  return (send + receive) * 10 - Math.abs(send - receive) + send / 100;
}

/* Round-robin across package shapes so the first batch is not four versions
   of the same 2-for-2. Ranking still decides the best offer within each shape. */
function diverseOffers(offers, limit) {
  const queues = new Map();
  for (const offer of offers) {
    if (!queues.has(offer.shape)) queues.set(offer.shape, []);
    queues.get(offer.shape).push(offer);
  }
  const shapes = [...queues.keys()].sort((a, b) => shapeOrder(a) - shapeOrder(b));
  const selected = [];
  while (selected.length < limit && shapes.some(shape => queues.get(shape).length)) {
    for (const shape of shapes) {
      const offer = queues.get(shape).shift();
      if (offer) selected.push(offer);
      if (selected.length === limit) break;
    }
  }
  return selected;
}

/* A league-wide search should not read like twelve offers from the same
   manager. Keep each manager's own package shapes varied, then deal one offer
   from every matching roster before returning to any of them. */
function diverseOffersAcrossPartners(offers, limit) {
  const queues = new Map();
  for (const offer of offers) {
    const partner = String(offer.other?.id ?? "");
    if (!queues.has(partner)) queues.set(partner, []);
    queues.get(partner).push(offer);
  }
  for (const [partner, queue] of queues) queues.set(partner, diverseOffers(queue, queue.length));
  const partners = [...queues.keys()];
  const selected = [];
  while (selected.length < limit && partners.some(partner => queues.get(partner).length)) {
    for (const partner of partners) {
      const offer = queues.get(partner).shift();
      if (offer) selected.push(offer);
      if (selected.length === limit) break;
    }
  }
  return selected;
}

/**
 * Search one- or two-sided packages up to eight total players around optional
 * anchors. Large combinations are value-paired before evaluation so expanding
 * the package ceiling does not turn the Trade Board into a Cartesian freeze.
 */
export function suggestTrades({ teams = [], teamId, playerId, playerIds, partnerId, anchorTeamId, sendAnchorIds, receiveAnchorIds,
  pool = new Map(), limit = 12, shapes = [], maxPlayers = 4, intent = "press" } = {}) {
  const mine = teams.find(team => String(team.id) === String(teamId));
  if (!mine) return [];
  const anchorId = String(anchorTeamId ?? teamId), anchorTeam = teams.find(team => String(team.id) === anchorId);
  const anchors = (playerIds?.length ? playerIds : [playerId]).filter(Boolean).map(String).slice(0, 2);
  const sendRequired = [...new Set((sendAnchorIds ?? (anchorId === String(mine.id) ? anchors : [])).map(String))];
  const receiveRequired = [...new Set((receiveAnchorIds ?? (anchorId !== String(mine.id) ? anchors : [])).map(String))];
  if (sendRequired.some(id => !mine.playerIds.map(String).includes(id))) return [];
  if (anchors.length && !anchorTeam) return [];
  const partners = partnerId
    ? teams.filter(team => String(team.id) === String(partnerId) && String(team.id) !== String(mine.id))
    : anchorId !== String(mine.id) && anchorTeam ? [anchorTeam] : teams.filter(team => String(team.id) !== String(mine.id));
  const allowedShapes = tradeShapes(Math.max(2, Math.min(8, Number(maxPlayers) || 4)), shapes);
  const possibilities = [];
  for (const other of partners) {
    if (receiveRequired.some(id => !other.playerIds.map(String).includes(id))) continue;
    const candidatePool = (team, required) => {
      const ranked = sortedPlayers(team.playerIds, pool).sort((a, b) => b.tradeValue - a.tradeValue);
      const selected = ranked.slice(0, 11);
      for (const id of required) if (!selected.some(player => String(player.id) === id)) {
        const anchored = ranked.find(player => String(player.id) === id);
        if (anchored) selected.push(anchored);
      }
      return selected;
    };
    const theirs = candidatePool(other, receiveRequired), minePlayers = candidatePool(mine, sendRequired);
    for (const [sendCount, receiveCount] of allowedShapes) {
      const sendPackages = tradePackages(minePlayers, sendCount, sendRequired);
      const receivePackages = tradePackages(theirs, receiveCount, receiveRequired);
      for (const pair of pairPackages(sendPackages, receivePackages, pool)) {
        possibilities.push({ other, ...pair, shape: `${sendCount}-${receiveCount}` });
      }
    }
  }
  const ranked = partnerBalancedCandidates(possibilities, pool).map(candidate => {
    const result = evaluateTrade({ teamA: mine, teamB: candidate.other, sendA: candidate.sendA, sendB: candidate.sendB, pool });
    if (!result) return null;
    const balancePenalty = Math.abs(result.deltaA - result.deltaB);
    const tier = tradeSuggestionTier(result);
    const score = suggestionScore(result, intent) + (result.deltaA + result.deltaB) * .35 - balancePenalty * .1;
    return { ...candidate, ...result, tier, shape: `${candidate.sendA.length}-${candidate.sendB.length}`, score };
  }).filter(isPlausibleTradeSuggestion)
    .sort((a, b) => b.score - a.score || b.fairness - a.fairness)
    .filter((result, index, all) => index === all.findIndex(other => String(other.other.id) === String(result.other.id)
      && other.sendA.join(",") === result.sendA.join(",") && other.sendB.join(",") === result.sendB.join(",")));
  const quota = Math.max(1, Math.floor(limit / 3));
  const chooseDiverse = partnerId ? diverseOffers : diverseOffersAcrossPartners;
  const selected = ["fair", "aggressive", "steal"].flatMap(tier => chooseDiverse(ranked.filter(offer => offer.tier === tier), quota));
  if (selected.length < limit) {
    for (const offer of ranked) {
      if (selected.includes(offer)) continue;
      selected.push(offer);
      if (selected.length === limit) break;
    }
  }
  return selected;
}

export function isPlausibleTradeSuggestion(result) {
  if (!result || result.fairness < 40) return false;
  const a = Number(result.weeklyDeltaA) || 0, b = Number(result.weeklyDeltaB) || 0;
  return a >= -2.5 && b >= -2.5 && a + b >= -3.5;
}

export function compareTeams(teamA, teamB) {
  if (!teamA || !teamB) return null;
  return {
    teamA, teamB,
    scoreEdge: round(teamA.lineup.score - teamB.lineup.score),
    weeklyEdge: round(teamA.lineup.weeklyPoints - teamB.lineup.weeklyPoints),
    positions: ANALYZER_UNITS.map(position => ({
      position,
      a: teamA.positionGrades[position],
      b: teamB.positionGrades[position],
      winner: teamA.positionGrades[position].score === teamB.positionGrades[position].score ? null
        : teamA.positionGrades[position].score > teamB.positionGrades[position].score ? "a" : "b",
    })),
  };
}
