import {evaluateTrade,evaluateMultiTeamTrade} from "./team-analyzer.js";
import {verdictFor} from "./trade-verdict.js";
import {tradeAssessment} from './trade-assessment.js';
export const TRADE_ALERT_MODEL_VERSION = "dflyzer-trade-v8-sleeper-routing";
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
  [...transactions].sort((a, b) => Number(b.status_updated??b.created??0) - Number(a.status_updated??a.created??0))
    .forEach(transaction => applyCompletedTrade(state, transaction, { reverse: true }));
  return state;
}

function transferPackages(transaction) {
  const ids = list(transaction?.roster_ids).map(rosterId).filter(Boolean);
  const packages = new Map(ids.map(id => [id, []]));
  const destinations={},receives=new Map(ids.map(id=>[id,[]]));let valid=ids.length>=2&&new Set(ids).size===ids.length;
  const players=new Set([...Object.keys(transaction?.drops||{}),...Object.keys(transaction?.adds||{})]);
  for (const id of players) {
    const source=transaction?.drops?.[id];
    const sourceId = rosterId(source);
    const destinationId = rosterId(transaction?.adds?.[id]);
    if(packages.has(sourceId))packages.get(sourceId).push(playerId(id));
    if (sourceId && destinationId && sourceId !== destinationId && packages.has(sourceId)&&receives.has(destinationId)) {
      receives.get(destinationId).push(playerId(id));destinations[playerId(id)]=destinationId;
    }else valid=false;
  }
  return { ids, packages,receives,destinations,valid };
}

export function classifyCompletedTrade(transaction) {
  if (transaction?.type !== "trade" || transaction?.status !== "complete") return null;
  const { ids, packages,receives,destinations,valid } = transferPackages(transaction);
  const hasPicks = list(transaction.draft_picks).length > 0;
  const hasFaab = list(transaction.waiver_budget).some(item => Number(item?.amount) !== 0);
  const playerExchange = valid && ids.every(id => packages.get(id)?.length&&receives.get(id)?.length);
  const analysisStatus = !valid ? "review" : hasPicks || hasFaab ? "partial" : playerExchange ? "graded" : "review";
  const limitations = [];
  if (!valid) limitations.push("Sleeper player ownership routing is incomplete or invalid.");
  if (hasPicks) limitations.push("Draft picks are not included in the DFLyzer value model.");
  if (hasFaab) limitations.push("FAAB is not included in the DFLyzer value model.");
  if (valid && !playerExchange) limitations.push("Each team must send and receive a rated player for a complete player grade.");
  return { rosterIds: ids, packages,receives,destinations,valid,playerExchange,analysisStatus, limitations };
}

export function effectiveTradeReceipt(alert){
 const review=alert?.routing_review;
 return review&&review.sleeper_transaction_id===alert.sleeper_transaction_id&&review.model_version===TRADE_ALERT_MODEL_VERSION
  ?{...alert,...review,routing_review:null,id:alert.id,notification_message_id:alert.notification_message_id,reviewedAt:review.reviewed_at}:alert;
}

export function tradeReceiptVerdict(result,teams=[]){
 if(!result)return null;
 if(!Array.isArray(result.values))return verdictFor(result);
 const partyGrades=teams.map((team,i)=>{
  const perspective={...result,valueToA:result.values[i],valueToB:result.outgoingValues[i],fairness:result.partyBalances[i],
   incomingEvidence:result.incomingEvidence[i],outgoingEvidence:result.outgoingEvidence[i],incomingPositionsA:result.incomingPositions[i],
   weeklyDeltaA:result.weeklyDeltas[i],depthDeltaA:result.depthDeltas[i],rosterImpactA:result.rosterImpacts[i]};
  const grade=verdictFor(perspective);
  return {roster_id:Number(team.roster_id??team.id),team_name:teamName(team),received:result.values[i],sent:result.outgoingValues[i],net:result.values[i]-result.outgoingValues[i],balance:result.partyBalances[i],needsReview:tradeAssessment(perspective).needsReview,...grade};
 });
 const balanced=partyGrades.every(g=>g.headline==='Balanced'),uncertain=partyGrades.some(g=>['Review needed','Projection gap'].includes(g.headline));
 const winner=!uncertain&&!balanced?partyGrades.filter(g=>g.who==='a').sort((a,b)=>b.net-a.net)[0]:null;
  return {group:true,needsReview:partyGrades.some(g=>g.needsReview),tone:balanced?'even':winner?'clear':'even',headline:balanced?'Balanced':uncertain?'Review needed':winner?'Largest value gain':'Close call',who:null,
  winner_roster_id:winner?.roster_id??null,winner_team_name:winner?.team_name??null,partyGrades};
}

const playerSnapshot = (id, pool) => {
  const player = pool.get(playerId(id));
  return {
    id: playerId(id),
    name: player?.name || playerId(id),
    position: player?.position || "",
    nfl_team: player?.nflTeam || "",
    trade_value: Number(player?.tradeValue) || 0,
    rated:!!player&&player.modelSource!=='unrated'&&player.tradeValue!=null&&Number.isFinite(Number(player.tradeValue)),
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
  if (classification.playerExchange) {
    result = parties.length===2?evaluateTrade({ teamA: parties[0], teamB: parties[1], sendA: sends[0], sendB: sends[1], pool })
     :evaluateMultiTeamTrade({teams:parties,sends,destinations:classification.destinations,pool});
    if (result) {
      if (result.projectionEvidence?.missing?.length) {
        if(classification.analysisStatus!=='partial')classification.analysisStatus = 'review';
        classification.limitations.push(`Missing player projections and production: ${result.projectionEvidence.missing.join(', ')}.`);
      }
      if(classification.analysisStatus==='graded'){
       verdict = tradeReceiptVerdict(result,parties);
       reasons = parties.length===2?reasonBuilder(result, parties[0], parties[1], pool, sends[0], sends[1]).slice(0, 3):[];
      }
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
      routing_complete:classification.valid,
      team_name: teamName(team),
      sleeper_user_id:team.sleeper_user_id||null,
      owner_name: team.ownerName || team.display_name || "",
    })),
    packages: sends.map((ids, index) => ({
      roster_id: Number(classification.rosterIds[index]),
      sends: ids.map(id => ({...playerSnapshot(id, pool),to_roster_id:Number(classification.destinations[id])})),
      receives:(classification.receives.get(classification.rosterIds[index])||[]).map(id=>({...playerSnapshot(id,pool),from_roster_id:Number(transaction.drops[id])})),
    })),
    result,
    verdict: verdict ? { ...verdict, winner_roster_id:verdict.group?verdict.winner_roster_id:winnerIndex >= 0 ? Number(classification.rosterIds[winnerIndex]) : null,
      winner_team_name:verdict.group?verdict.winner_team_name:winnerIndex >= 0 ? teamName(parties[winnerIndex]) : null } : null,
    reasons,
    limitations: classification.limitations,
    pre_trade_rosters: parties.map((team, index) => ({
      roster_id: Number(classification.rosterIds[index]), player_ids: [...team.playerIds],
    })),
  };
}


/** A withheld winner is model uncertainty, never a request for league approval. */
export function receiptCaution(alert) {
  alert=effectiveTradeReceipt(alert);
  const evidence = alert?.result?.projectionEvidence || {};
  if (alert?.analysis_status === 'partial') return {label: 'Player-only estimate', detail: (alert.limitations || []).join(' ') || 'Picks or FAAB are outside this player-value estimate.'};
  if (alert?.analysis_status !== 'graded' || !alert.result || evidence.missing?.length)
    return {label: 'Not rated', detail: alert?.limitations?.[0] || 'A complete player estimate is unavailable for this trade.'};
  if (evidence.injuries?.length) return {label: 'Injury flags', detail: `Injury uncertainty: ${evidence.injuries.join(', ')}. Value balance is estimated; the winner is too uncertain to call.`};
  if (evidence.stale?.length) return {label: 'Older player data', detail: `Older inputs: ${evidence.stale.join(', ')}. Value balance is estimated; no winner called.`};
  if (evidence.fallback?.length) return {label: 'Limited projections', detail: `Season projections unavailable: ${evidence.fallback.join(', ')}. Values use production estimates; no winner called.`};
  if (evidence.expert?.required && evidence.expert.status !== 'Fresh')
    return {label: evidence.expert.status==='Stale'?'Older rankings':'Rankings unavailable', detail: 'Fresh FantasyPros rankings were unavailable when this receipt was graded. Values use DFL estimates; no winner called.'};
  if (evidence.expert?.missing?.length) return {label: 'Ranking gaps', detail: `No matched expert ranking: ${evidence.expert.missing.join(', ')}. Value balance is estimated; no winner called.`};
  if (evidence.expert?.disagreements?.length) return {label: 'Rankings disagree', detail: `Expert rankings and DFL values disagree: ${evidence.expert.disagreements.join(', ')}. No winner called.`};
  if (evidence.expert?.split?.length) return {label: 'Experts split', detail: `Experts disagree on ${evidence.expert.split.join(', ')}. Value balance is estimated; no winner called.`};
  if (evidence.thinSamples?.length) return {label: 'Limited game data', detail: `Limited completed-game samples: ${evidence.thinSamples.join(', ')}. No winner called.`};
  return {label: 'Not rated', detail: 'No complete verdict is available for this trade.'};
}

export function scheduledTradeNotification(alert) {
  alert=effectiveTradeReceipt(alert);
  const names = (alert.teams || []).map(team => team.team_name).filter(Boolean);
  const matchup = names.length > 1 ? names.join(' and ') : 'League teams';
  const result = alert.result, raw = result?.fairness;
  const balance = raw != null && raw !== '' && Number.isFinite(Number(raw)) ? `${Math.round(Number(raw))}% balance` : '';
  const verdict = alert.analysis_status === 'graded' ? tradeReceiptVerdict(result,alert.teams) : null;
  const rated = verdict && !['Review needed', 'Projection gap'].includes(verdict.headline);
  const call = rated ? verdict.headline === 'Balanced' ? `Balanced deal${result.decisionVersion===2&&verdictFor(result).headline==='Balanced'&&receiptCaution(alert).label!=='Not rated'?` · ${receiptCaution(alert).label}`:''}` : verdict.headline === 'Close call' ? 'Close call'
    : `${alert.verdict?.winner_team_name || 'One team'}: ${verdict.headline.toLowerCase()}`
    : alert.analysis_status === 'partial' ? 'Picks/FAAB excluded; player estimate only' : receiptCaution(alert).label;
  return {title: 'DFL TRADE ALERT', body: `${matchup} made a deal. ${[balance, call].filter(Boolean).join(' · ')}.`};
}
