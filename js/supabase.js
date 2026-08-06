// =====================================================================
// supabase.js - database access
// ---------------------------------------------------------------------
// Two clients:
//   publicClient - plain anon key. Read anything, vote, sign up.
//   adminClient  - same anon key PLUS an "x-admin-token" header holding
//                  the admin password. Postgres checks that header with
//                  the is_admin() function before allowing any write.
//
// Always call db() rather than using a client directly: it hands back the
// admin client when an admin is signed in, otherwise the public one.
// =====================================================================

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getAdminToken, setAdminToken } from "./store.js";

export const configured =
  SUPABASE_URL.startsWith("https://") &&
  !SUPABASE_URL.includes("YOUR-PROJECT-REF") &&
  !SUPABASE_ANON_KEY.includes("YOUR-ANON");

const publicClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let adminClient = null;
let adminOn = false;

function makeAdminClient(token) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { "x-admin-token": token } },
  });
}

/** The client to use for the current user. */
export function db() {
  return adminOn && adminClient ? adminClient : publicClient;
}

/** True when this device is signed in as admin. */
export function isAdmin() {
  return adminOn;
}

/**
 * Ask Postgres whether a password is the admin password.
 * On success the client is kept and (optionally) remembered on this device.
 */
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

export function adminLogout() {
  adminClient = null;
  adminOn = false;
  setAdminToken("");
}

/** Called once at start-up: re-uses a remembered password if it still works. */
export async function restoreAdmin() {
  const token = getAdminToken();
  if (!token || !configured) return false;
  try {
    return await adminLogin(token, false);
  } catch {
    return false;
  }
}

/** Change the admin password (admin only). */
export async function changeAdminPassword(newPassword) {
  const { error } = await db().rpc("set_admin_password", { new_password: newPassword });
  if (error) throw error;
  // The old remembered password is now wrong - re-sign in with the new one.
  adminClient = makeAdminClient(newPassword);
  setAdminToken(newPassword);
}

// ---------------------------------------------------------------------
// Small query helpers used by the pages
// ---------------------------------------------------------------------

/** SELECT * FROM <table>, with optional ordering and row limit. */
export async function selectAll(table, { order = "created_at", asc = false, limit = null } = {}) {
  let q = db().from(table).select("*").order(order, { ascending: asc });
  if (limit) q = q.limit(limit);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
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

/** Record a league name in the users table. Ignores duplicates. */
export async function registerUser(username) {
  if (!configured) return;
  try {
    await publicClient
      .from("users")
      .upsert({ username }, { onConflict: "username", ignoreDuplicates: true });
  } catch {
    /* not important enough to bother the user about */
  }
}
