import {evaluateTrade} from "./team-analyzer.js";
import {verdictFor} from "./trade-verdict.js";
export const TRADE_ALERT_MODEL_VERSION = "dflyzer-trade-v7-price-fit-risk";
const list = value => Array.isArray(value) ? value : [];
const rosterId = value => value == null ? "" : String(value);
const playerId = rosterId;
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;

function copyRosterMap(rows = []) {
  return new Map(rows.map(row => [rosterId(row.roster_id), new Set(list(row.players).map(playerId).filter(Boolean))]));
}

function ensureRoster(state, id) {
  const key = rosterId(id);
  if (!state.has(key)) state.set(key, new Set());
  return state.get(key);
}

/** Apply Sleeper's player ownership maps to a roster state. */
export function applyCompletedTrade(state, transaction, { reverse = false } = {}) {
  const adds = transaction?.adds || {};
  const drops = transaction?.drops || {};
  const players = new Set([...Object.keys(adds), ...Object.keys(drops)]);
  for (const id of players) {
    const source = rosterId(drops[id]);
    const destination = rosterId(adds[id]);
    if (reverse) {
      if (destination) ensureRoster(state, destination).delete(playerId(id));
      if (source) ensureRoster(state, source).add(playerId(id));
    } else {
      if (source) ensureRoster(state, source).delete(playerId(id));
      if (destination) ensureRoster(state, destination).add(playerId(id));
    }
  }
  return state;
}

/**
 * Prefer the database snapshot from immediately before sync. On a first-ever
 * sync there is no snapshot, so reverse the newly completed trades from the
 * current Sleeper rosters, newest first, to recover the same starting point.
 */
export function preTradeRosterState({ previousRosters = [], currentRosters = [], transactions = [] } = {}) {
  if (previousRosters.length) return copyRosterMap(previousRosters);
  const state = copyRosterMap(currentRosters);
  [...transactions].sort((a, b) => Number(b.created || 0) - Number(a.created || 0))
    .forEach(transaction => applyCompletedTrade(state, transaction, { reverse: true }));
  return state;
}

function transferPackages(transaction) {
  const ids = list(transaction?.roster_ids).map(rosterId).filter(Boolean);
  const packages = new Map(ids.map(id => [id, []]));
  for (const [id, source] of Object.entries(transaction?.drops || {})) {
    const sourceId = rosterId(source);
    const destinationId = rosterId(transaction?.adds?.[id]);
    if (sourceId && destinationId && sourceId !== destinationId && packages.has(sourceId)) {
      packages.get(sourceId).push(playerId(id));
    }
  }
  return { ids, packages };
}

export function classifyCompletedTrade(transaction) {
  if (transaction?.type !== "trade" || transaction?.status !== "complete") return null;
  const { ids, packages } = transferPackages(transaction);
  const hasPicks = list(transaction.draft_picks).length > 0;
  const hasFaab = list(transaction.waiver_budget).some(item => Number(item?.amount) !== 0);
  const twoTeam = ids.length === 2 && new Set(ids).size === 2;
  const playerExchange = twoTeam && ids.every(id => packages.get(id)?.length);
  const analysisStatus = !twoTeam ? "review" : hasPicks || hasFaab || !playerExchange ? "partial" : "graded";
  const limitations = [];
  if (!twoTeam) limitations.push("Multi-team trade: automatic ownership routing is not supported yet.");
  if (hasPicks) limitations.push("Draft picks are not included in the DFLyzer value model.");
  if (hasFaab) limitations.push("FAAB is not included in the DFLyzer value model.");
  if (twoTeam && !playerExchange) limitations.push("Both teams must exchange a rated player for an automatic verdict.");
  return { rosterIds: ids, packages, analysisStatus, limitations };
}

const playerSnapshot = (id, pool) => {
  const player = pool.get(playerId(id));
  return {
    id: playerId(id),
    name: player?.name || playerId(id),
    position: player?.position || "",
    nfl_team: player?.nflTeam || "",
    trade_value: Number(player?.tradeValue) || 0,
    expected_points: Number(player?.expectedPoints) || 0,
  };
};

/** Build the immutable model receipt saved for Home and the Trade page. */
export function buildTradeAlertSnapshot({ transaction, season, week, rosterState, teams = [], pool = new Map(), reasonBuilder = (..._args) => [] } = {}) {
  const classification = classifyCompletedTrade(transaction);
  if (!classification) return null;
  const teamById = new Map(teams.map(team => [rosterId(team.id ?? team.roster_id), team]));
  const parties = classification.rosterIds.map(id => {
    const team = teamById.get(id) || { id, roster_id: Number(id), playerIds: [...(rosterState.get(id) || [])] };
    return { ...team, id, playerIds: [...(rosterState.get(id) || team.playerIds || [])] };
  });
  const sends = classification.rosterIds.map(id => classification.packages.get(id) || []);
  let result = null, verdict = null, reasons = [];
  if (classification.analysisStatus === "graded") {
    result = evaluateTrade({ teamA: parties[0], teamB: parties[1], sendA: sends[0], sendB: sends[1], pool });
    if (result) {
      if (result.projectionEvidence?.missing?.length) {
        classification.analysisStatus = 'review';
        classification.limitations.push(`Missing player projections and production: ${result.projectionEvidence.missing.join(', ')}.`);
      }
      verdict = verdictFor(result);
      reasons = reasonBuilder(result, parties[0], parties[1], pool, sends[0], sends[1]).slice(0, 3);
    } else {
      classification.analysisStatus = "review";
      classification.limitations.push("The pre-trade roster could not be verified, so no winner was declared.");
    }
  }
  const winnerIndex = verdict?.who === "a" ? 0 : verdict?.who === "b" ? 1 : -1;
  return {
    sleeper_transaction_id: String(transaction.transaction_id),
    season: Number(season),
    week: Number(transaction.leg ?? week) || null,
    occurred_at: transaction.status_updated || transaction.created ? new Date(Number(transaction.status_updated || transaction.created)).toISOString() : null,
    analysis_status: classification.analysisStatus,
    model_version: TRADE_ALERT_MODEL_VERSION,
    teams: parties.map((team, index) => ({
      roster_id: Number(classification.rosterIds[index]),
      team_name: teamName(team),
      sleeper_user_id:team.sleeper_user_id||null,
      owner_name: team.ownerName || team.display_name || "",
    })),
    packages: sends.map((ids, index) => ({
      roster_id: Number(classification.rosterIds[index]),
      sends: ids.map(id => playerSnapshot(id, pool)),
    })),
    result,
    verdict: verdict ? { ...verdict, winner_roster_id: winnerIndex >= 0 ? Number(classification.rosterIds[winnerIndex]) : null,
      winner_team_name: winnerIndex >= 0 ? teamName(parties[winnerIndex]) : null } : null,
    reasons,
    limitations: classification.limitations,
    pre_trade_rosters: parties.map((team, index) => ({
      roster_id: Number(classification.rosterIds[index]), player_ids: [...team.playerIds],
    })),
  };
}


/** A withheld winner is model uncertainty, never a request for league approval. */
export function receiptCaution(alert) {
  const evidence = alert?.result?.projectionEvidence || {};
  if (alert?.analysis_status === 'partial') return {label: 'Player-only estimate', detail: (alert.limitations || []).join(' ') || 'Picks or FAAB are outside this player-value estimate.'};
  if (alert?.analysis_status !== 'graded' || !alert.result || evidence.missing?.length)
    return {label: 'Not rated', detail: alert?.limitations?.[0] || 'A complete player estimate is unavailable for this trade.'};
  if (evidence.injuries?.length) return {label: 'Injury flags', detail: `Availability flags: ${evidence.injuries.join(', ')}. Balance is an estimate; no winner called.`};
  if (evidence.stale?.length || evidence.fallback?.length) return {label: 'Estimate only', detail: 'Some player inputs are stale or use production fallback. No winner called.'};
  if (evidence.expert?.required && evidence.expert.status !== 'Fresh')
    return {label: 'Estimate only', detail: 'Fresh expert rankings were unavailable. Balance uses DFL player estimates; no winner called.'};
  if (evidence.expert?.missing?.length || evidence.expert?.disagreements?.length || evidence.expert?.split?.length || evidence.thinSamples?.length)
    return {label: 'Estimate only', detail: 'Player evidence is mixed. Balance is an estimate; no winner called.'};
  return {label: 'Not rated', detail: 'No complete verdict is available for this trade.'};
}

export function scheduledTradeNotification(alert) {
  const names = (alert.teams || []).map(team => team.team_name).filter(Boolean);
  const matchup = names.length > 1 ? names.join(' and ') : 'League teams';
  const result = alert.result, raw = result?.fairness;
  const balance = raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Math.round(Number(raw))}% balance` : '';
  const verdict = alert.analysis_status === 'graded' ? verdictFor(result) : null;
  const rated = verdict && !['Review needed', 'Projection gap'].includes(verdict.headline);
  const call = rated ? verdict.headline === 'Balanced' ? `Balanced deal${result.decisionVersion===2&&verdictFor(result).headline==='Balanced'&&receiptCaution(alert).label!=='Not rated'?` · ${receiptCaution(alert).label}`:''}` : verdict.headline === 'Close call' ? 'Close call'
    : `${alert.verdict?.winner_team_name || 'One team'}: ${verdict.headline.toLowerCase()}`
    : alert.analysis_status === 'partial' ? 'Picks/FAAB need review; player estimate only' : receiptCaution(alert).label;
  return {title: 'DFL TRADE ALERT', body: `${matchup} made a deal. ${[balance, call].filter(Boolean).join(' · ')}.`};
}
