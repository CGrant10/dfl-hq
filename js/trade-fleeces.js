import { scorePlayer } from "./dfl-scoring.js";

export function completedTrades(rows = []) {
  return rows.filter(row => row?.type === "trade" && row?.status === "complete" && row?.details?.status === "complete");
}

export function tradeSides(row) {
  const sides = new Map();
  for (const rosterId of row?.details?.roster_ids || []) sides.set(String(rosterId), []);
  for (const [playerId, rosterId] of Object.entries(row?.details?.adds || {})) {
    const key = String(rosterId);
    if (!sides.has(key)) sides.set(key, []);
    sides.get(key).push(String(playerId));
  }
  return [...sides.entries()].map(([rosterId, playerIds]) => ({ rosterId, playerIds }));
}

function packageOutcome(playerIds, tradeSeason, latestSeason, statsBySeason, scoringBySeason) {
  const seasons = [];
  for (let year = Number(tradeSeason) + 1; year <= Math.min(Number(tradeSeason) + 3, latestSeason); year++) seasons.push(year);
  if (!seasons.length) return null;

  let total = 0;
  for (const playerId of playerIds) {
    let playerTotal = 0;
    for (const year of seasons) {
      playerTotal += scorePlayer(statsBySeason.get(year)?.[playerId], scoringBySeason.get(year)) || 0;
    }
    total += playerTotal / seasons.length;
  }
  return Math.round(total * 10) / 10;
}

export function rankTradeFleeces({ trades = [], latestSeason = 0, statsBySeason = new Map(), scoringBySeason = new Map() } = {}) {
  return completedTrades(trades).map(trade => {
    const sides = tradeSides(trade).map(side => ({
      ...side,
      outcome: packageOutcome(side.playerIds, trade.season, latestSeason, statsBySeason, scoringBySeason),
    }));
    if (sides.length < 2 || sides.some(side => side.outcome == null || !side.playerIds.length)) return null;
    sides.sort((a, b) => b.outcome - a.outcome);
    return { trade, winner: sides[0], loser: sides.at(-1), gap: Math.round((sides[0].outcome - sides.at(-1).outcome) * 10) / 10 };
  }).filter(row => row && row.gap > 0).sort((a, b) => b.gap - a.gap);
}
