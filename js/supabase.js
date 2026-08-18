// =====================================================================
// supabase.js - database access
// =====================================================================

/*
  PINNED, EXACTLY.

  This used to be `@supabase/supabase-js@2/+esm`, which is not a version - it
  is "whatever the latest v2 happens to be when the browser asks". Every
  member's device could be on a different build of the client library, a
  release published on a Tuesday could change behaviour with no commit here to
  explain it, and there would be nothing to roll back to. The service worker
  makes it worse rather than better: it caches CDN responses by URL, so a
  floating URL is one cache key whose contents change underneath it.

  2.112.3 is what `@2` resolved to and what this app has been running and
  verified against. This is a PIN, not an upgrade - moving it is a deliberate,
  separate change with its own verification.
*/
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.3/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { getAdminToken, setAdminToken } from "./store.js";
import { golfHeaders, golfHeaderKey } from "./golf-guest.js";

export const configured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR-PROJECT-REF") && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

let adminClient = null;
let adminOn = false;

/*
  ONE CLIENT PER IDENTITY, not one per query.

  db() is called once for every table a page reads, and it used to hand back
  a freshly built client each time - Home alone opens eight in parallel, and
  each one constructs an auth client, a realtime client and a storage client
  it will never use, and each auth client reads and writes localStorage on
  the way up. That is pure waste on the slowest device somebody opens this on.

  The header is the only thing that varies, and it varies only when a
  different member is picked on this device, so the cache is keyed on it. A
  member switch still gets a client carrying the right x-member-id - which
  matters, because the golf write policies are decided by that header.
*/
let publicClient = null;
let publicClientKey = null;

function makePublicClient() {
  // Golf score permissions use the member selected on this device. The SQL
  // policy checks this header against golf_participants. Admin uses a separate
  // client and is still governed by is_admin().
  const memberId = localStorage.getItem("dfl.memberId") || "";
  /* A golf guest has no member id at all - their pass is the outing, the
     participant they signed in as, and the event code, and Postgres re-checks
     all three on every write. The pass is part of the cache key because a
     guest who signs in mid-round would otherwise keep sending the old headers
     until the page was reloaded. */
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

/*
  LEGACY, AND WRITE-ONLY.

  `users` predates the member picker: it was the list of names that had ever
  opened the app, back when a name was the identity. Nothing in the app reads
  this table any more - members.js, polls, side events, golf and the arena all
  work from members.id - so this is an append-only historical record and
  nothing else. It is kept because it costs one fire-and-forget upsert and
  because dropping the table is a data decision, not a code one.

  Do not add anything that READS this. Canonical identity is members.id.
*/
export async function registerUser(username) {
  if (!configured) return;
  try {
    await makePublicClient().from("users").upsert({ username }, { onConflict: "username", ignoreDuplicates: true });
  } catch {}
}
