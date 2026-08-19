// =====================================================================
// supabase.js - database access
// =====================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getAdminToken, setAdminToken, getCommissionerPin, setCommissionerPin } from "./store.js";
import { golfHeaders, golfHeaderKey } from "./golf-guest.js";

export const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT-REF") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

let adminClient = null;
let adminOn = false;
let commissionerClient = null;
let commissionerAccess = null;
let commissionerMemberId = "";

let publicClient = null;
let publicClientKey = null;

function memberIdNow() { return localStorage.getItem("dfl.memberId") || ""; }

function makePublicClient() {
  const memberId = memberIdNow();
  const key = `${memberId}|${golfHeaderKey()}`;
  if (publicClient && publicClientKey === key) return publicClient;
  publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        ...(memberId ? { "x-member-id": memberId } : {}),
        ...golfHeaders(),
      },
    },
  });
  publicClientKey = key;
  return publicClient;
}

function makeAdminClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { "x-admin-token": token } },
  });
}

function makeCommissionerClient(memberId, pin) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        "x-member-id": String(memberId),
        "x-commissioner-pin": pin,
        ...golfHeaders(),
      },
    },
  });
}

function commissionerStillMatchesMember() {
  return !!commissionerClient && !!commissionerAccess && String(memberIdNow()) === String(commissionerMemberId);
}

export function db() {
  if (adminOn && adminClient) return adminClient;
  if (commissionerStillMatchesMember()) return commissionerClient;
  return makePublicClient();
}

// Compatibility: existing pages use isAdmin() to decide whether privileged
// controls exist. It now means "an authenticated privileged session". Use
// isMasterAdmin(), isCommissionerOwner(), or hasPermission() when scope matters.
export function isAdmin() { return (adminOn && !!adminClient) || commissionerStillMatchesMember(); }
export function isMasterAdmin() { return adminOn && !!adminClient; }
export function isCommissioner() { return !isMasterAdmin() && commissionerStillMatchesMember(); }
export function isCommissionerOwner() { return isMasterAdmin() || !!(commissionerStillMatchesMember() && commissionerAccess?.is_owner); }
export function commissionerProfile() { return commissionerStillMatchesMember() ? commissionerAccess : null; }
export function hasPermission(permission) {
  if (isMasterAdmin()) return true;
  if (!commissionerStillMatchesMember()) return false;
  if (commissionerAccess?.is_owner) return true;
  return (commissionerAccess?.permissions || []).includes(permission);
}

export async function adminLogin(password, remember = true) {
  const client = makeAdminClient(password);
  const { data, error } = await client.rpc("is_admin");
  if (error) throw error;
  if (data !== true) return false;
  adminClient = client;
  adminOn = true;
  commissionerClient = null;
  commissionerAccess = null;
  commissionerMemberId = "";
  setCommissionerPin("");
  if (remember) setAdminToken(password);
  return true;
}

export async function commissionerLogin(pin, remember = true) {
  const memberId = memberIdNow();
  if (!memberId) return false;
  const client = makeCommissionerClient(memberId, pin);
  const { data, error } = await client.rpc("my_commissioner_access");
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.member_id) return false;

  commissionerClient = client;
  commissionerMemberId = String(row.member_id);
  commissionerAccess = {
    member_id: row.member_id,
    is_owner: !!row.is_owner,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  };
  adminClient = null;
  adminOn = false;
  setAdminToken("");
  if (remember) setCommissionerPin(pin);
  return true;
}

export function adminLogout() {
  adminClient = null;
  adminOn = false;
  commissionerClient = null;
  commissionerAccess = null;
  commissionerMemberId = "";
  setAdminToken("");
  setCommissionerPin("");
}

export async function restoreAdmin() {
  if (!configured) return false;
  const master = getAdminToken();
  if (master) {
    try { if (await adminLogin(master, false)) return true; } catch {}
  }
  const pin = getCommissionerPin();
  if (pin && memberIdNow()) {
    try { return await commissionerLogin(pin, false); } catch {}
  }
  return false;
}

export async function changeAdminPassword(newPassword) {
  if (!isMasterAdmin()) throw new Error("Master admin access required");
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

/* Legacy users table: write-only compatibility. Canonical identity is members.id. */
export async function registerUser(username) {
  if (!configured) return;
  try {
    await makePublicClient().from("users").upsert({ username }, { onConflict: "username", ignoreDuplicates: true });
  } catch {}
}
