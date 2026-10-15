import { db, edge, privilegedFunctionHeaders } from "./supabase.js";
import { loadAnalyzerData } from "./team-analyzer-data.js";
import { tradeReasons, verdictFor } from "./trade-desk.js";
import {loadMemberDirectory} from './members.js';
import {currentTradeNames} from './current-team-names.js';
import {tradeAssessment} from './trade-assessment.js';

import {TRADE_ALERT_MODEL_VERSION,effectiveTradeReceipt,tradeReceiptVerdict, buildTradeAlertSnapshot as buildSnapshot} from "./trade-receipt-model.js";
export {TRADE_ALERT_MODEL_VERSION} from "./trade-receipt-model.js";
import {captureTradeReceipts} from "./trade-alert-capture.js";

const list = value => Array.isArray(value) ? value : [];
const rosterId = value => value == null ? "" : String(value);
const playerId = value => value == null ? "" : String(value);
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;
const schemaMissing = error => ["42P01", "42703", "PGRST204", "PGRST205"].includes(error?.code)
  || /trade_alerts|source_key/i.test(error?.message || "") && /does not exist|schema cache|column/i.test(error?.message || "");

export function tradeBreakingHeadline(alert) {
  alert=effectiveTradeReceipt(alert);
  if (String(alert?.headline_override || "").trim()) return String(alert.headline_override).trim();
  const winner = alert?.verdict?.winner_team_name || null;
  const fairness = Number(alert?.result?.fairness);
  const groupIndex=alert?.teams?.findIndex(t=>String(t.roster_id)===String(alert.verdict?.winner_roster_id));
  const lineup = Array.isArray(alert?.result?.weeklyDeltas)?Number(alert.result.weeklyDeltas[groupIndex])||0:alert?.verdict?.who === "a" ? Number(alert?.result?.weeklyDeltaA) || 0
    : alert?.verdict?.who === "b" ? Number(alert?.result?.weeklyDeltaB) || 0 : 0;
  const roster = Array.isArray(alert?.result?.rosterImpacts)?Number(alert.result.rosterImpacts[groupIndex])||0:alert?.verdict?.who === "a" ? Number(alert?.result?.rosterImpactA) || lineup
    : alert?.verdict?.who === "b" ? Number(alert?.result?.rosterImpactB) || lineup : 0;
  if (!winner) return Number.isFinite(fairness) && fairness >= 88
    ? "BLOCKBUSTER. NO CLEAR VICTIM." : "THE LEAGUE NEEDS TO REVIEW THIS ONE";
  if (Number.isFinite(fairness) && fairness < 55 && roster > 0) return `${winner} JUST COMMITTED HIGHWAY ROBBERY`;
  if (lineup < -.25 && roster <= 0) return `${winner} WON VALUE, NOT THEIR LINEUP`;
  if (roster >= 2) return `${winner} JUST GOT BETTER`;
  return `${winner} HAS THE EARLY EDGE`;
}

const impactFor = (result, side) => {
  const roster = Number(result?.[`rosterImpact${side}`]);
  if (Number.isFinite(roster)) return roster;
  return (Number(result?.[`weeklyDelta${side}`]) || 0) + (Number(result?.[`depthDelta${side}`]) || 0) * .35;
};

/** One plain-English result for Home's Trade Wire. Value is important, but a
 * pile of bench names cannot win the call if it does not help the receiving
 * roster. The same 55/8 blend used by recommendationFor() is applied to both
 * sides, then compared so the Home verdict and full ticket speak one language. */
export function tradeOutcomeSummary(alert) {
  alert=effectiveTradeReceipt(alert);
  if (alert?.analysis_status !== "graded" || !alert?.result || alert.result.projectionEvidence?.missing?.length) {
    return { grade: "Review", tone: "review", winner: null, loser: null, closeness: null,
      detail: alert?.limitations?.[0] || "A complete player estimate is unavailable." };
  }
  if(Array.isArray(alert.result.values)){
    const result=alert.result,verdict=tradeReceiptVerdict(result,alert.teams),balanced=verdict.headline==='Balanced',uncertain=verdict.headline==='Review needed',close=verdict.headline==='Close call';
    const index=(alert.teams||[]).findIndex(t=>String(t.roster_id)===String(verdict.winner_roster_id));
    return {grade:balanced?'Fair deal':uncertain?'Review':close?'Close call':'Value edge',tone:balanced?'fair':uncertain?'review':close?'close':'clear',winner:verdict.winner_team_name,loser:null,closeness:result.fairness,
      lineup:index<0?null:result.weeklyDeltas[index],depth:index<0?null:result.depthDeltas[index],needsReview:uncertain||verdict.needsReview,
      detail:balanced?`${result.fairness}% group balance`:uncertain?receiptCaution(alert).detail:close?'Player value estimates are close.':`${verdict.winner_team_name} has the largest player value gain.`};
  }
  // Preserve older frozen receipts. New receipts use asset value for the winner;
  // lineup usefulness remains a separate consequence, just like the trade desk.
  if(["dflyzer-trade-v3-player-value","dflyzer-trade-v4-one-qb","dflyzer-trade-v5-expert-evidence","dflyzer-trade-v6-position-flex","dflyzer-trade-v7-price-fit-risk",TRADE_ALERT_MODEL_VERSION].includes(alert.model_version)){
    const result=alert.result,evidence=result.projectionEvidence;
    const balancedEstimate=['dflyzer-trade-v7-price-fit-risk',TRADE_ALERT_MODEL_VERSION].includes(alert.model_version)&&tradeAssessment(result)?.value.headline==='Balanced';
    if(!balancedEstimate&&(evidence?.stale?.length||evidence?.injuries?.length||evidence?.fallback?.length))
      return {grade:'Review',tone:'review',winner:null,loser:null,closeness:result.fairness,detail:receiptCaution(alert).detail};
    const verdict=verdictFor(result),teams=list(alert.teams),winnerIndex=verdict.who==='a'?0:verdict.who==='b'?1:-1;
    if (['Review needed', 'Projection gap'].includes(verdict.headline)) return {grade:'Review',tone:'review',winner:null,loser:null,closeness:result.fairness,detail:receiptCaution(alert).detail};
    const close=verdict.headline==='Close call',fair=winnerIndex<0;
    const winner=fair?null:teams[winnerIndex]?.team_name||`Team ${winnerIndex+1}`;
    const loser=fair?null:teams[1-winnerIndex]?.team_name||`Team ${2-winnerIndex}`;
    const suffix=winnerIndex===1?'B':'A',lineup=Number(result[`weeklyDelta${suffix}`])||0,depth=Number(result[`depthDelta${suffix}`])||0;
    return {grade:close?'Close call':fair?'Fair deal':verdict.headline==='FLEECE'?'Robbery':verdict.headline==='Slight edge'?'Close win':'Clear win',
      tone:close?'close':fair?'fair':verdict.headline==='FLEECE'?'robbery':verdict.headline==='Slight edge'?'close':'clear',winner,loser,closeness:result.fairness,lineup,depth,
      needsReview:balancedEstimate&&tradeAssessment(result).needsReview,
      detail:close?'Value sensitivity ranges overlap; no clear winner.':fair?`${result.fairness}% balanced · player values are close`:`${winner} wins player value · lineup ${lineup>=0?'+':'−'}${Math.abs(lineup).toFixed(1)} · depth ${depth>=0?'+':'−'}${Math.abs(depth).toFixed(1)}`};
  }
  const teams = list(alert.teams);
  const a = teams[0]?.team_name || `Team ${teams[0]?.roster_id || 1}`;
  const b = teams[1]?.team_name || `Team ${teams[1]?.roster_id || 2}`;
  const valueA = Number(alert.result.valueToA) || 0;
  const valueB = Number(alert.result.valueToB) || 0;
  const base = Math.max(valueA, valueB, 1);
  const valueEdge = (valueA - valueB) / base * 100;
  const impactA = impactFor(alert.result, "A");
  const impactB = impactFor(alert.result, "B");
  const scoreA = valueEdge * .55 + impactA * 8;
  const scoreB = -valueEdge * .55 + impactB * 8;
  const spread = scoreA - scoreB;
  const strength = Math.abs(spread);
  const fairness = Math.max(0, Math.min(100, Number(alert.result.fairness) || 0));
  const winnerA = spread >= 0;
  const winner = winnerA ? a : b;
  const loser = winnerA ? b : a;
  const lineup = winnerA ? Number(alert.result.weeklyDeltaA) || 0 : Number(alert.result.weeklyDeltaB) || 0;
  const depth = winnerA ? Number(alert.result.depthDeltaA) || 0 : Number(alert.result.depthDeltaB) || 0;
  const fair = fairness >= 92 && strength < 8;
  const robbery = !fair && fairness < 55 && strength >= 15;
  const close = !fair && !robbery && (strength < 10 || fairness >= 82);
  const grade = fair ? "Fair deal" : robbery ? "Robbery" : close ? "Close win" : "Clear win";
  const tone = fair ? "fair" : robbery ? "robbery" : close ? "close" : "clear";
  return {
    grade, tone, winner: fair ? null : winner, loser: fair ? null : loser,
    closeness: Math.round(fairness), lineup, depth, strength,
    detail: fair ? `${Math.round(fairness)}% balanced · neither roster owns a meaningful edge`
      : `${winner} wins the model · lineup ${lineup >= 0 ? "+" : "−"}${Math.abs(lineup).toFixed(1)} · depth ${depth >= 0 ? "+" : "−"}${Math.abs(depth).toFixed(1)}`,
  };
}

/** Public receipt copy must describe the deal as a whole, not scold whichever
 * roster Sleeper happened to list first. `tradeReasons()` is intentionally
 * written from team A's negotiating point of view, so using its first line on
 * league-wide cards made several different trades all read "dogshit" even
 * when the receipt above them said balanced or named the other team winner. */
export function tradeOutcomeReason(outcome) {
  if (!outcome || outcome.grade === "Review") {
    return { tone: "neutral", title: outcome?.detail || "Completed trade recorded." };
  }
  if(outcome.grade=== "Close call")return {tone:"neutral",title:"Too close to call. Keep the receipt.",copy:outcome.detail};
  if (outcome.grade === "Fair deal") {
    return { tone: "neutral", title: "Fair deal. Nobody got robbed.", copy: outcome.detail };
  }
  if (outcome.grade === "Robbery") {
    return { tone: "good", title: `${outcome.winner} committed robbery.`, copy: outcome.detail };
  }
  if(outcome.grade==='Value edge')return {tone:'good',title:`${outcome.winner} got the biggest value bump.`,copy:outcome.detail};
  if (outcome.grade === "Close win") {
    return { tone: "neutral", title: `${outcome.winner} got the slight edge.`, copy: outcome.detail };
  }
  return { tone: "good", title: `${outcome.winner} won this trade.`, copy: outcome.detail };
}

export {applyCompletedTrade, preTradeRosterState, classifyCompletedTrade} from "./trade-receipt-model.js";
export function buildTradeAlertSnapshot(options) {
  return buildSnapshot({...options, reasonBuilder: tradeReasons});
}

export {scheduledTradeNotification as tradeAlertNotification} from "./trade-receipt-model.js";
import {receiptCaution, scheduledTradeNotification as tradeAlertNotification} from "./trade-receipt-model.js";

export async function loadTradeAlerts({ limit = 20 } = {}) {
  const { data, error } = await db().from("trade_alerts")
    .select("*").order("occurred_at", { ascending: false, nullsFirst: false }).limit(Math.min(Math.max(Number(limit) || 20, 1), 100));
  if (error) {
    if (schemaMissing(error)) return [];
    throw error;
  }
  const members=await loadMemberDirectory().catch(()=>[]);
  return (data||[]).map(alert=>currentTradeNames(effectiveTradeReceipt(alert),members));
}

export async function loadTradeAlertByTransaction(transactionId){
 const {data,error}=await db().from('trade_alerts').select('*').eq('sleeper_transaction_id',String(transactionId)).maybeSingle();
 if(error)throw error;if(!data)return null;
 const members=await loadMemberDirectory().catch(()=>[]);
 return currentTradeNames(effectiveTradeReceipt(data),members);
}

export function tradeAlertViewModel(alert) {
  alert=effectiveTradeReceipt(alert);
  if (!alert?.sleeper_transaction_id) return null;
  const teams = list(alert.teams);
  const teamByRoster = new Map(teams.map(team => [rosterId(team.roster_id), team]));
  const readPlayer=player=>({id:playerId(player.id),name:player.name||playerId(player.id),position:player.position||'',nflTeam:player.nfl_team||'',
    value:player.rated===false||player.trade_value==null?null:Number(player.trade_value),fromRosterId:rosterId(player.from_roster_id),toRosterId:rosterId(player.to_roster_id)});
  const packages = list(alert.packages).map(pkg => ({
    rosterId: rosterId(pkg.roster_id),
    teamName: teamByRoster.get(rosterId(pkg.roster_id))?.team_name || `Team ${pkg.roster_id}`,
    team:teamByRoster.get(rosterId(pkg.roster_id)),players: list(pkg.sends).map(readPlayer),
  }));
  const outcome = tradeOutcomeSummary(alert);
  const winner = outcome.winner;
  const balanced = outcome.grade === "Fair deal";
  const caution = receiptCaution(alert);
  const rawBalance = alert.result?.fairness;
  const fairness = rawBalance == null || rawBalance === '' || !Number.isFinite(Number(rawBalance))||alert.result?.projectionEvidence?.missing?.length
    ? null : Math.round(Math.max(0, Math.min(100, Number(rawBalance))));
  const receivedPackages = list(alert.packages).length===teams.length&&list(alert.packages).every(p=>p.routing_complete!==false&&Array.isArray(p.receives))
    ?packages.map((pkg,index)=>({...pkg,players:list(alert.packages[index].receives).map(readPlayer)}))
    :teams.length === 2 && packages.length === 2?packages.map((pkg, index) => ({...pkg, players: packages[1 - index].players.map(p=>({...p,fromRosterId:packages[1-index].rosterId}))})):null;
  const number=value=>value==null||!Number.isFinite(Number(value))?null:Number(value);
  const metric=(key,index,legacy)=>!alert.result||alert.result.projectionEvidence?.missing?.length?null:number(Array.isArray(alert.result[key])?alert.result[key][index]:index<2?alert.result[legacy+(index?'B':'A')]:null);
  const sum=players=>players.some(p=>p.value==null||!Number.isFinite(p.value))?null:players.reduce((n,p)=>n+p.value,0);
  return {
    id: alert.id,
    transactionId: String(alert.sleeper_transaction_id),
    status: alert.analysis_status,
    season: Number(alert.season) || null,
    week: Number(alert.week) || null,
    occurredAt: alert.occurred_at || alert.created_at || null,
    breakingActive: alert.breaking_active !== false,
    breakingStartedAt: alert.breaking_started_at || alert.created_at || null,
    breakingEndedAt: alert.breaking_ended_at || null,
    teams: teams.map(team => ({...team, rosterId: rosterId(team.roster_id), teamName: team.team_name || `Team ${team.roster_id}` })),
    packages,
    receivedPackages,
    reviewedAt:alert.reviewedAt||null,
    teamValues:teams.map((team,i)=>{let sent=sum(packages.find(p=>p.rosterId===rosterId(team.roster_id))?.players||[]),received=receivedPackages?sum(receivedPackages.find(p=>p.rosterId===rosterId(team.roster_id))?.players||[]):null;const r=alert.result;if(r&&!r.projectionEvidence?.missing?.length){sent=number(Array.isArray(r.outgoingValues)?r.outgoingValues[i]:i?r.valueToA:r.valueToB)??sent;received=number(Array.isArray(r.values)?r.values[i]:i?r.valueToB:r.valueToA)??received}return {rosterId:rosterId(team.roster_id),sent,received,net:sent==null||received==null?null:received-sent,balance:r?.partyBalances?.[i]??fairness};}),
    caution,
    winner,
    balanced,
    verdict: outcome.grade === "Close call" ? "Close call" : balanced ? "Balanced" : winner ? (alert.verdict?.headline || "Winner") : caution.label,
    headline: outcome.grade === "Review" ? "DEAL DONE. KEEP THE RECEIPT." : tradeBreakingHeadline(alert),
    outcome,
    fairness,
    balanceLabel: alert.analysis_status === "partial" ? "Player balance" :teams.length>2?"Group balance": "Value balance",
    lineupDeltas: teams.map((team, index) => ({
      rosterId: rosterId(team.roster_id),
      teamName: team.team_name || `Team ${team.roster_id}`,
      weekly:metric('weeklyDeltas',index,'weeklyDelta'),
    })),
    depthDeltas: teams.map((team, index) => ({
      rosterId: rosterId(team.roster_id),
      teamName: team.team_name || `Team ${team.roster_id}`,
      weekly:metric('depthDeltas',index,'depthDelta'),
    })),
    rosterImpacts: teams.map((team, index) => ({
      rosterId: rosterId(team.roster_id),
      weekly:metric('rosterImpacts',index,'rosterImpact'),
    })),
    reason: tradeOutcomeReason(outcome),
    limitations: list(alert.limitations),
    href: `#/trade?tx=${encodeURIComponent(alert.sleeper_transaction_id)}`,
  };
}

export async function loadLatestTradeAlert({ hours = 72, activeOnly = false } = {}) {
  const safeHours = Math.min(Math.max(Number(hours) || 72, 1), 24 * 30);
  const cutoff = new Date(Date.now() - safeHours * 60 * 60 * 1000).toISOString();
  let query = db().from("trade_alerts").select("*")
    .gte("occurred_at", cutoff).order("occurred_at", { ascending: false }).limit(1);
  if (activeOnly) query = query.eq("breaking_active", true);
  let { data, error } = await query.maybeSingle();
  /* A deployment may briefly have the new client before the additive schema.
     Home still gets its ordinary recent trade card; the commissioner control
     clearly reports that the schema is required instead of breaking launch. */
  if (activeOnly && error?.code === "42703") {
    ({ data, error } = await db().from("trade_alerts").select("*")
      .gte("occurred_at", cutoff).order("occurred_at", { ascending: false }).limit(1).maybeSingle());
  }
  if (error) {
    if (schemaMissing(error)) return null;
    throw error;
  }
  const members=data?await loadMemberDirectory().catch(()=>[]):[];
  return tradeAlertViewModel(currentTradeNames(effectiveTradeReceipt(data),members));
}

export const loadActiveTradeAlert = options => loadLatestTradeAlert({ ...options, activeOnly: true });

export async function endBreakingTradeCoverage(alertId) {
  const id = Number(alertId);
  if (!Number.isFinite(id) || id <= 0) throw new Error("That trade alert could not be identified");
  const { data, error } = await db().rpc("end_trade_breaking_coverage", { alert_id: id });
  if (error) {
    if (/end_trade_breaking_coverage|schema cache|does not exist/i.test(error.message || "")) {
      throw new Error("Run trade_alerts_schema.sql in Supabase to activate commissioner dismissal");
    }
    throw error;
  }
  window.dispatchEvent(new CustomEvent("dfl:trade-coverage-changed", { detail: { id, active: false } }));
  return data === true;
}

async function notifyTradeAlert(alert, database) {
  const notice = tradeAlertNotification(alert);
  const { data, error } = await edge().functions.invoke("send-notification", {
    headers: privilegedFunctionHeaders(),
    body: {
      action: "send", ...notice, category: "trades", audience: "all",
      targetUrl: `#/trade?tx=${encodeURIComponent(alert.sleeper_transaction_id)}`,
      sourceKey: `trade:${alert.sleeper_transaction_id}`,
    },
  });
  if (error || !data?.ok) throw new Error(data?.error || error?.message || "Trade notification failed");
  const { error: updateError } = await database.from("trade_alerts")
    .update({ notification_message_id: data.messageId, notified_at: new Date().toISOString() })
    .eq("sleeper_transaction_id", alert.sleeper_transaction_id).is("notification_message_id", null);
  if (updateError) throw updateError;
}

/** Manual sync and the scheduled worker share the same capture policy. */
export async function captureCompletedTradeAlerts(options = {}) {
  return captureTradeReceipts({...options,
    loadAnalyzer: () => loadAnalyzerData({force: true}),
    buildSnapshot: buildTradeAlertSnapshot,
    notifyTradeAlert,
  });
}
