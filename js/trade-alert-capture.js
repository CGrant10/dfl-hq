import {applyCompletedTrade, preTradeRosterState, classifyCompletedTrade, buildTradeAlertSnapshot} from "./trade-receipt-model.js";
const completedAt=t=>Number(t.status_updated??t.created)||0;
const schemaMissing = error => ["42P01", "42703", "PGRST204", "PGRST205"].includes(error?.code);
export function isRecentTrade(transaction, now = Date.now()) {
  const created = Number(transaction?.status_updated ?? transaction?.created);
  return Number.isFinite(created) && created > 0 && created <= now + 300000 && created >= now - 86400000;
}

async function deliverPendingTradeAlerts(database, transactionIds, log, notifyTradeAlert) {
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

/** Shared by manual and scheduled sync; saved receipt values never change. */
export async function captureTradeReceipts({ transactions = [], currentRosters = [], season, week, database, log = (_message) => {}, loadAnalyzer, notifyTradeAlert, buildSnapshot = buildTradeAlertSnapshot,reviewUnsupported=false, transactionWeeks={}, now = Date.now() } = {}) {
  const complete = transactions.filter(transaction => classifyCompletedTrade(transaction))
    .sort((a, b) => completedAt(a)-completedAt(b));
  if (!complete.length) return { created: 0, notified: 0 };
  const ids = complete.map(transaction => String(transaction.transaction_id));
  const { data: existingAlerts, error: existingError } = await database.from("trade_alerts")
    .select("sleeper_transaction_id").in("sleeper_transaction_id", ids);
  if (existingError) {
    if (schemaMissing(existingError)) return { created: 0, notified: 0, schemaMissing: true };
    throw existingError;
  }
  const existingIds = new Set((existingAlerts || []).map(row => String(row.sleeper_transaction_id)));
  const missingIds = new Set(ids.filter(id => !existingIds.has(id)));
  const freshIds = new Set(complete.filter(transaction => isRecentTrade(transaction, now)).map(transaction => String(transaction.transaction_id)));
  const legacyIds=complete.filter(t=>existingIds.has(String(t.transaction_id))&&t.roster_ids?.length>2).map(t=>String(t.transaction_id));
  let reviews=[];
  if(reviewUnsupported&&legacyIds.length){
    const {data,error}=await database.from('trade_alerts').select('*').in('sleeper_transaction_id',legacyIds).eq('analysis_status','review').is('result',null).is('routing_review',null);
    if(error&&!schemaMissing(error))throw error;
    reviews=(data||[]).filter(row=>(row.limitations||[]).some(text=>String(text)==='Multi-team trade: automatic ownership routing is not supported yet.'));
  }
  const reviewIds=new Set(reviews.map(row=>String(row.sleeper_transaction_id)));
  if (!missingIds.size&&!reviewIds.size) {
    const pending = await deliverPendingTradeAlerts(database, ids, log, notifyTradeAlert);
    return { created: 0, notified: pending.notified, schemaMissing: pending.schemaMissing };
  }

  let analyzer;
  try { analyzer = await loadAnalyzer(); }
  catch (error) { log(`Trade alerts skipped: DFLyzer data unavailable (${error.message}).`); return { created: 0, notified: (await deliverPendingTradeAlerts(database, ids, log, notifyTradeAlert)).notified }; }
  if (analyzer.state !== "ready") return { created: 0, notified: (await deliverPendingTradeAlerts(database, ids, log, notifyTradeAlert)).notified };
  /* Rebuild the season from its current roster by reversing every completed
     ownership change, then replay the full ledger. That lets an installation
     created midseason grade its older trades against the roster each team
     actually had at the time. Waivers must be replayed too or a later trade
     can falsely claim its sender never owned the player. */
  const ownership = transactions.filter(transaction => transaction?.status === "complete")
    .sort((a, b) => completedAt(a)-completedAt(b));
  const state = preTradeRosterState({ previousRosters: [], currentRosters, transactions: ownership });
  const receiptWeek=id=>{const candidate=Number(transactionWeeks[id]);return Number.isInteger(candidate)&&candidate>=1&&candidate<=18?candidate:week};
  const created = [];
  let backfilled = 0,reviewed=0;
  for (const transaction of ownership) {
    const transactionId = String(transaction.transaction_id);
    if(reviewIds.has(transactionId)){
      const snapshot=buildSnapshot({transaction,season,week:receiptWeek(transactionId),rosterState:state,teams:analyzer.teams,pool:analyzer.pool});
      if(snapshot?.result&&!snapshot.result.projectionEvidence?.missing?.length){
        const {data,error}=await database.from('trade_alerts').update({routing_review:{...snapshot,reviewed_at:new Date(now).toISOString()}})
          .eq('sleeper_transaction_id',transactionId).is('routing_review',null).select('id');
        if(error)throw error;reviewed+=(data||[]).length;
      }
    }
    if (missingIds.has(transactionId) && classifyCompletedTrade(transaction)) {
      const snapshot = buildSnapshot({ transaction, season, week:receiptWeek(transactionId), rosterState: state, teams: analyzer.teams, pool: analyzer.pool });
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

  const pending = await deliverPendingTradeAlerts(database, ids, log, notifyTradeAlert);
  const notified = pending.notified;
  if (created.length) log(`   ${created.length} trade receipt${created.length === 1 ? "" : "s"}${backfilled ? ` (${backfilled} backfilled)` : ""}; ${notified} push${notified === 1 ? "" : "es"} sent`);
  if(reviewed)log(`   ${reviewed} previously unsupported trade receipt${reviewed===1?'':'s'} received routed analysis.`);
  return { created: created.length, backfilled,reviewed, notified };
}
