import { db, edge, privilegedFunctionHeaders } from "./supabase.js";
import { evaluateTrade } from "./team-analyzer.js";
import { loadAnalyzerData } from "./team-analyzer-data.js";
import { tradeReasons, verdictFor } from "./trade-desk.js";

export const TRADE_ALERT_MODEL_VERSION = "dflyzer-trade-v1";

const list = value => Array.isArray(value) ? value : [];
const rosterId = value => value == null ? "" : String(value);
const playerId = value => value == null ? "" : String(value);
const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || team?.id || ""}`;
const schemaMissing = error => ["42P01", "42703", "PGRST204", "PGRST205"].includes(error?.code)
  || /trade_alerts|source_key/i.test(error?.message || "") && /does not exist|schema cache|column/i.test(error?.message || "");

export function tradeBreakingHeadline(alert) {
  if (String(alert?.headline_override || "").trim()) return String(alert.headline_override).trim();
  const winner = alert?.verdict?.winner_team_name || null;
  const fairness = Number(alert?.result?.fairness);
  const lineup = alert?.verdict?.who === "a" ? Number(alert?.result?.weeklyDeltaA) || 0
    : alert?.verdict?.who === "b" ? Number(alert?.result?.weeklyDeltaB) || 0 : 0;
  const roster = alert?.verdict?.who === "a" ? Number(alert?.result?.rosterImpactA) || lineup
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
  if (alert?.analysis_status !== "graded" || !alert?.result) {
    return { grade: "Review", tone: "review", winner: null, loser: null, closeness: null,
      detail: alert?.limitations?.[0] || "The model needs a complete two-team player exchange." };
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
  if (outcome.grade === "Fair deal") {
    return { tone: "neutral", title: "Fair deal. Nobody got robbed.", copy: outcome.detail };
  }
  if (outcome.grade === "Robbery") {
    return { tone: "good", title: `${outcome.winner} committed robbery.`, copy: outcome.detail };
  }
  if (outcome.grade === "Close win") {
    return { tone: "neutral", title: `${outcome.winner} got the slight edge.`, copy: outcome.detail };
  }
  return { tone: "good", title: `${outcome.winner} won this trade.`, copy: outcome.detail };
}

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
export function buildTradeAlertSnapshot({ transaction, season, week, rosterState, teams = [], pool = new Map() } = {}) {
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
      verdict = verdictFor(result);
      reasons = tradeReasons(result, parties[0], parties[1], pool, sends[0], sends[1]).slice(0, 3);
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
    occurred_at: transaction.created ? new Date(Number(transaction.created)).toISOString() : null,
    analysis_status: classification.analysisStatus,
    model_version: TRADE_ALERT_MODEL_VERSION,
    teams: parties.map((team, index) => ({
      roster_id: Number(classification.rosterIds[index]),
      team_name: teamName(team),
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

export function tradeAlertNotification(alert) {
  const names = list(alert?.teams).map(team => team.team_name).filter(Boolean);
  const matchup = names.length > 1 ? `${names[0]} and ${names[1]}` : "League teams";
  if (alert?.analysis_status === "graded" && alert.verdict) {
    const call = alert.verdict.winner_team_name
      ? `${alert.verdict.winner_team_name}: ${String(alert.verdict.headline || "edge").toLowerCase()}`
      : "Balanced deal";
    return { title: "DFL TRADE ALERT", body: `${matchup} made a deal. DFLyzer: ${call} · ${alert.result?.fairness ?? 0}% balance.` };
  }
  const reason = alert?.analysis_status === "partial" ? "Picks/FAAB or an incomplete player exchange need review." : "This trade needs a commissioner review.";
  return { title: "DFL TRADE ALERT", body: `${matchup} made a deal. ${reason}` };
}

export async function loadTradeAlerts({ limit = 20 } = {}) {
  const { data, error } = await db().from("trade_alerts")
    .select("*").order("occurred_at", { ascending: false, nullsFirst: false }).limit(Math.min(Math.max(Number(limit) || 20, 1), 100));
  if (error) {
    if (schemaMissing(error)) return [];
    throw error;
  }
  return data || [];
}

export function tradeAlertViewModel(alert) {
  if (!alert?.sleeper_transaction_id) return null;
  const teams = list(alert.teams);
  const teamByRoster = new Map(teams.map(team => [rosterId(team.roster_id), team]));
  const packages = list(alert.packages).map(pkg => ({
    rosterId: rosterId(pkg.roster_id),
    teamName: teamByRoster.get(rosterId(pkg.roster_id))?.team_name || `Team ${pkg.roster_id}`,
    players: list(pkg.sends).map(player => ({
      id: playerId(player.id), name: player.name || playerId(player.id),
      position: player.position || "", nflTeam: player.nfl_team || "", value: Number(player.trade_value) || 0,
    })),
  }));
  const outcome = tradeOutcomeSummary(alert);
  const winner = outcome.winner;
  const balanced = outcome.grade === "Fair deal";
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
    teams: teams.map(team => ({ rosterId: rosterId(team.roster_id), teamName: team.team_name || `Team ${team.roster_id}` })),
    packages,
    winner,
    balanced,
    verdict: balanced ? "Balanced" : winner ? (alert.verdict?.headline || "Winner") : "Review needed",
    headline: tradeBreakingHeadline(alert),
    outcome,
    fairness: alert.analysis_status === "graded" ? Number(alert.result?.fairness) || 0 : null,
    lineupDeltas: teams.map((team, index) => ({
      rosterId: rosterId(team.roster_id),
      teamName: team.team_name || `Team ${team.roster_id}`,
      weekly: index === 0 ? Number(alert.result?.weeklyDeltaA) || 0 : index === 1 ? Number(alert.result?.weeklyDeltaB) || 0 : null,
    })),
    depthDeltas: teams.map((team, index) => ({
      rosterId: rosterId(team.roster_id),
      teamName: team.team_name || `Team ${team.roster_id}`,
      weekly: index === 0 ? Number(alert.result?.depthDeltaA) || 0 : index === 1 ? Number(alert.result?.depthDeltaB) || 0 : null,
    })),
    rosterImpacts: teams.map((team, index) => ({
      rosterId: rosterId(team.roster_id),
      weekly: index === 0 ? Number(alert.result?.rosterImpactA) || 0 : index === 1 ? Number(alert.result?.rosterImpactB) || 0 : null,
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
  return tradeAlertViewModel(data);
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

async function deliverPendingTradeAlerts(database, transactionIds, log) {
  const { data, error } = await database.from("trade_alerts").select("*")
    .in("sleeper_transaction_id", transactionIds).eq("breaking_active", true).is("notification_message_id", null);
  if (error) {
    if (schemaMissing(error)) return { notified: 0, schemaMissing: true };
    throw error;
  }
  let notified = 0;
  for (const alert of data || []) {
    try { await notifyTradeAlert(alert, database); notified++; }
    catch (notificationError) { log(`Trade saved, but its phone alert will retry on the next sync (${notificationError.message}).`); }
  }
  return { notified };
}

/** Called only by the manual current-season sync. */
export async function captureCompletedTradeAlerts({ transactions = [], priorTransactions = null, previousRosters = [], currentRosters = [], season, week, database, log = (_message) => {} } = {}) {
  const complete = transactions.filter(transaction => classifyCompletedTrade(transaction))
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));
  if (!complete.length) return { created: 0, notified: 0 };
  const ids = complete.map(transaction => String(transaction.transaction_id));
  let known = priorTransactions;
  if (!known) {
    const response = await database.from("sleeper_transactions")
      .select("sleeper_transaction_id,status").in("sleeper_transaction_id", ids);
    if (response.error) throw response.error;
    known = response.data;
  }
  const priorStatus = new Map((known || []).map(row => [String(row.sleeper_transaction_id), row.status]));
  const { data: existingAlerts, error: existingError } = await database.from("trade_alerts")
    .select("sleeper_transaction_id").in("sleeper_transaction_id", ids);
  if (existingError) {
    if (schemaMissing(existingError)) return { created: 0, notified: 0, schemaMissing: true };
    throw existingError;
  }
  const existingIds = new Set((existingAlerts || []).map(row => String(row.sleeper_transaction_id)));
  const missingIds = new Set(ids.filter(id => !existingIds.has(id)));
  const freshIds = new Set(ids.filter(id => priorStatus.get(id) !== "complete"));
  if (!missingIds.size) {
    const pending = await deliverPendingTradeAlerts(database, ids, log);
    return { created: 0, notified: pending.notified, schemaMissing: pending.schemaMissing };
  }

  let analyzer;
  try { analyzer = await loadAnalyzerData({ force: true }); }
  catch (error) { log(`Trade alerts skipped: DFLyzer data unavailable (${error.message}).`); return { created: 0, notified: 0 }; }
  if (analyzer.state !== "ready") return { created: 0, notified: 0 };
  /* Rebuild the season from its current roster by reversing every completed
     ownership change, then replay the full ledger. That lets an installation
     created midseason grade its older trades against the roster each team
     actually had at the time. Waivers must be replayed too or a later trade
     can falsely claim its sender never owned the player. */
  const ownership = transactions.filter(transaction => transaction?.status === "complete")
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));
  const state = preTradeRosterState({ previousRosters: [], currentRosters, transactions: ownership });
  const created = [];
  let backfilled = 0;
  for (const transaction of ownership) {
    const transactionId = String(transaction.transaction_id);
    if (missingIds.has(transactionId) && classifyCompletedTrade(transaction)) {
      const snapshot = buildTradeAlertSnapshot({ transaction, season, week, rosterState: state, teams: analyzer.teams, pool: analyzer.pool });
      if (snapshot) {
        /* Receipts from before this feature belong in Trade Wire, but must not
           impersonate new breaking news or send a surprise historical push. */
        if (!freshIds.has(transactionId)) {
          snapshot.breaking_active = false;
          snapshot.breaking_ended_at = new Date().toISOString();
          backfilled++;
        }
        const { data, error } = await database.from("trade_alerts").insert(snapshot).select("*").single();
        if (error?.code !== "23505") {
          if (schemaMissing(error)) {
            log("Trade alerts are waiting for the trade-alert schema; the Sleeper sync still completed.");
            return { created: 0, notified: 0, schemaMissing: true };
          }
          if (error) throw error;
        }
        if (data) created.push(data);
      }
    }
    applyCompletedTrade(state, transaction);
  }

  const pending = await deliverPendingTradeAlerts(database, ids, log);
  const notified = pending.notified;
  if (created.length) log(`   ${created.length} trade receipt${created.length === 1 ? "" : "s"}${backfilled ? ` (${backfilled} backfilled)` : ""}; ${notified} push${notified === 1 ? "" : "es"} sent`);
  return { created: created.length, backfilled, notified };
}
