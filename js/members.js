// =====================================================================
// members.js - who is using this device
// ---------------------------------------------------------------------
// No accounts and no passwords. Opening the app asks "Who are you?" and
// the chosen member's id is kept in localStorage.
//
// The old free-text league name is still honoured: whichever member is
// picked also writes their display_name into the existing username slot,
// so polls and side-event sign-ups keep working unchanged.
// =====================================================================

import { db, configured } from "./supabase.js";
import { setUsername } from "./store.js";

const KEY = "dfl.memberId";

let cache = null;      // all active members, loaded once per page load
let current = null;    // the member using this device

export function getMemberId() {
  return localStorage.getItem(KEY) || "";
}

export function currentMember() {
  return current;
}

/** Active members, newest league additions last. */
export async function loadMembers({ force = false } = {}) {
  if (cache && !force) return cache;
  if (!configured) return [];

  const { data, error } = await db()
    .from("members")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("display_name", { ascending: true });

  if (error) throw error;
  cache = data || [];
  return cache;
}

/** Work out who this device belongs to. Returns null if not chosen yet. */
export async function restoreMember() {
  const id = getMemberId();
  if (!id) return null;

  try {
    const members = await loadMembers();
    current = members.find((m) => String(m.id) === String(id)) || null;
  } catch {
    current = null;
  }

  if (current) setUsername(current.display_name);
  return current;
}

/** Remember a member on this device. */
export function selectMember(member) {
  current = member;
  localStorage.setItem(KEY, String(member.id));
  setUsername(member.display_name);   // keeps polls and sign-ups working
}

export function clearMember() {
  current = null;
  localStorage.removeItem(KEY);
}

/** Reload the current member's row after an edit. */
export async function refreshMember() {
  cache = null;
  return restoreMember();
}

/*
  WHICH PICTURE OF SOMEBODY TO USE.

  Four columns, one preference order, one place. The broadcast, a profile
  header and anything else that wants a member's face all ask here, so
  they cannot drift into disagreeing about what "their picture" means.

    profile_image     the person. The default everywhere.
    broadcast_image   the one the stage prefers - more personality than a
                      headshot, which is what a jumbotron wants.
    lookalike_image   the celebrity double.
    chaos_image       OPT-IN ONLY.

  chaos is never in a fallback chain and never reached for automatically:
  a caller has to name it. A championship slide is not the moment to
  surprise somebody with their worst photograph.

  Every branch ends at profile_image or null, so a member with nothing set
  behaves exactly as they did before these columns existed.
*/
export function memberImage(member, kind = "profile") {
  if (!member) return null;
  const profile = member.profile_image || null;
  switch (kind) {
    case "broadcast": return member.broadcast_image || member.lookalike_image || profile;
    case "lookalike": return member.lookalike_image || member.broadcast_image || profile;
    case "chaos":     return member.chaos_image || null;   // asked for by name, or not at all
    default:          return profile;
  }
}
