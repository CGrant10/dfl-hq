// =====================================================================
// supabase.js - database access
// =====================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getAdminToken, setAdminToken } from "./store.js";

export const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT-REF") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

let adminClient = null;
let adminOn = false;

function makePublicClient() {
  // Golf score permissions use the member selected on this device. The SQL
  // policy checks this header against golf_participants. Admin uses a separate
  // client and is still governed by is_admin().
  const memberId = localStorage.getItem("dfl.memberId") || "";
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: memberId ? { "x-member-id": memberId } : {} },
  });
}

function makeAdminClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { "x-admin-token": token } },
  });
}

export function db() { return adminOn && adminClient ? adminClient : makePublicClient(); }
export function isAdmin() { return adminOn; }

export async function adminLogin(password, remember = true) {
  const client = makeAdminClient(password);
  const { data, error } = await client.rpc("is_admin");
  if (error) throw error;
  if (data !== true) return false;
  adminClient = client;
  adminOn = true;
  if (remember) setAdminToken(password);
  return true;
}

export function adminLogout() { adminClient = null; adminOn = false; setAdminToken(""); }

export async function restoreAdmin() {
  const token = getAdminToken();
  if (!token || !configured) return false;
  try { return await adminLogin(token, false); } catch { return false; }
}

export async function changeAdminPassword(newPassword) {
  const { error } = await db().rpc("set_admin_password", { new_password: newPassword });
  if (error) throw error;
  adminClient = makeAdminClient(newPassword);
  setAdminToken(newPassword);
}

export async function selectAll(table, { order = "created_at", asc = false, limit = null } = {}) {
  let q = db().from(table).select("*").order(order, { ascending: asc });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function selectOne(table, id) {
  const { data, error } = await db().from(table).select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function insertRow(table, row) {
  const { data, error } = await db().from(table).insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, patch) {
  const { error } = await db().from(table).update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteRow(table, id) {
  const { error } = await db().from(table).delete().eq("id", id);
  if (error) throw error;
}

export async function registerUser(username) {
  if (!configured) return;
  try {
    await makePublicClient().from("users").upsert({ username }, { onConflict: "username", ignoreDuplicates: true });
  } catch {}
}
