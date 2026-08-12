/* =====================================================================
   golf-people.js - what to call a player
   ---------------------------------------------------------------------
   Half the field is not in the fantasy league. Making those people
   members rows to get them onto a scorecard would put strangers in the
   "Who are you?" picker, the keeper tables and every member dropdown in
   the app, permanently - so a golf participant is EITHER a league member
   or a name typed in for the day (golf_participants.guest_name).

   That means no screen can read a name straight off member_id any more,
   and there are a lot of screens: the roster, the team editor, the draft
   board, the leaderboard, the 2v2 list and both scorecards. One function
   decides, so a guest cannot end up as "Unknown" on one card and their
   own name on another.
   ===================================================================== */

/** id -> display_name, for whatever loadMembers() returned. */
export function memberNames(members) {
  return new Map((members || []).map((m) => [String(m.id), m.display_name]));
}

/**
 * What to call this participant.
 * @param {object} part   a golf_participants row
 * @param {Map} names     from memberNames()
 */
export function playerName(part, names) {
  if (!part) return "Unknown";
  if (part.member_id != null) return names.get(String(part.member_id)) || "Unknown";
  const guest = String(part.guest_name || "").trim();
  return guest || "Guest";
}

/** True for somebody who only exists inside this outing. */
export function isGuest(part) {
  return !!part && part.member_id == null;
}
