import {applyCompletedTrade, preTradeRosterState, classifyCompletedTrade, buildTradeAlertSnapshot} from "./trade-receipt-model.js";
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
export async function captureTradeReceipts({ transactions = [], currentRosters = [], season, week, database, log = (_message) => {}, loadAnalyzer, notifyTradeAlert, buildSnapshot = buildTradeAlertSnapshot, now = Date.now() } = {}) {
  const complete = transactions.filter(transaction => classifyCompletedTrade(transaction))
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));
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
  if (!missingIds.size) {
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
    .sort((a, b) => Number(a.created || 0) - Number(b.created || 0));
  const state = preTradeRosterState({ previousRosters: [], currentRosters, transactions: ownership });
  const created = [];
  let backfilled = 0;
  for (const transaction of ownership) {
    const transactionId = String(transaction.transaction_id);
    if (missingIds.has(transactionId) && classifyCompletedTrade(transaction)) {
      const snapshot = buildSnapshot({ transaction, season, week, rosterState: state, teams: analyzer.teams, pool: analyzer.pool });
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
  return { created: created.length, backfilled, notified };
}
