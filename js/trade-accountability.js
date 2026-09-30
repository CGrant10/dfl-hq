import { db } from "./supabase.js";
import { recordTradeRecommendation } from "./trade-model-health.js";

export async function saveTradeRecommendation(input, pool) {
  const row = recordTradeRecommendation(input, pool);
  const { error } = await db().rpc("record_trade_recommendation", {
    audit_season: input.season || null, audit_week: input.week || null,
    audit_team_id: String(input.teamId), audit_partner_id: String(input.partnerId),
    audit_send: row.sendA, audit_receive: row.sendB, audit_weekly_delta: Number(input.weeklyDelta) || 0,
  });
  if (error) throw error;
  return row;
}

export async function loadSharedTradeRecommendations(limit = 80) {
  const { data, error } = await db().rpc("my_trade_recommendations", { max_rows: limit });
  if (error) throw error;
  return data || [];
}
