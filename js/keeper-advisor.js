// =====================================================================
// keeper-advisor.js - your strongest keeper OPTIONS, and nothing invented
// ---------------------------------------------------------------------
// WHAT THIS IS ALLOWED TO KNOW
//
// Everything below is derived from facts DFL HQ already holds or that
// Sleeper publishes about THIS league:
//
//   your roster        sleeper_rosters.players, for the newest season, found
//                      by members.sleeper_user_id - never by team name
//   player identity    the Sleeper player map (name, position, NFL team)
//   draft rounds       sleeper_draft_picks: round, pick_no and picked_by for
//                      every pick on record, 2020-2025
//   keeper allowance   sleeper_leagues.max_keepers, straight from Sleeper
//
// WHAT THIS IS NOT ALLOWED TO DO, AND THE REASON IT MATTERS
//
// There is NO market value in this app. No ADP, no rankings, no
// projections, nobody's age and nobody's injury risk. So the advisor cannot
// answer "who is the best player" or "who is the best value", and it does
// not pretend to:
//
//   * "Best value" needs a market price to compare a cost against. A round
//     12 cost is only a discount if the player is worth more than round 12,
//     and we have no idea what anybody is worth. Cheap is not valuable.
//   * "Best player" needs a ranking. We have positions, not quality.
//   * "Upside" needs age, situation or projections. We have none of them.
//
// So every label this file produces is a statement about DATA WE HAVE. The
// honest ones read like "drafted round 12 in 2025" and "never drafted in
// this league". See LABELS below - each is a fact with its source attached.
//
// THE KEEPER COST IS NOT KNOWN, AND THAT IS A FINDING
//
// It is not in the rules table (the live table has no keeper rules at all),
// it is not in Sleeper (`is_keeper` is null on all 1080 picks - this league
// runs keepers by hand), and it cannot be recovered from the keepers table
// because those rows identify people by first name and players by nickname
// ("Shawn"/"Puka", "Cim"/"Mcbride"), which is not something to match on.
//
// So costOf() returns a cost ONLY when a keeper rule that states one is
// actually recorded. Recognised rule text is the single narrow door in this
// file, it is spelled out in COST_RULES, and everything else classifies as
// "cost unknown". Nothing here ever computes a round cost it cannot cite.
// =====================================================================

import { evaluate, originalQualifyingRound, priorKeeperSeasons } from "./keeper-rules.js";

/**
 * @typedef {Object} MarketValue    The future seam - see marketFrom().
 * @property {string} playerId
 * @property {number} [rank]            overall rank, 1 = best
 * @property {number} [projectedRound]  where the market would draft them
 * @property {string} source            who said so
 * @property {string} updatedAt         ISO date, so the UI can show its age
 */

/*
  THE MARKET SEAM, and it is deliberately three lines.

  The comparison logic below asks this for a value and copes with nothing
  coming back, which is what happens today. A real source - a public
  rankings API with stable player ids and a timestamp - becomes one function
  that returns these objects, and no part of the UI has to learn its name.

  Not built out further on purpose: an abstraction over zero providers is a
  guess about the one that arrives.
*/
export function marketFrom(rows = []) {
  const byId = new Map();
  for (const r of rows) {
    if (r && r.playerId != null) byId.set(String(r.playerId), r);
  }
  return {
    available: byId.size > 0,
    /** @returns {MarketValue|null} */
    get: (playerId) => byId.get(String(playerId)) || null,
    source: rows[0]?.source || null,
    updatedAt: rows[0]?.updatedAt || null,
  };
}

/** The empty market: what the advisor runs on today. */
export const NO_MARKET = marketFrom([]);

/*
  THE PROSE RECOGNISER IS GONE, AND COST_RULES / costRuleFrom() WITH IT.

  It pattern-matched English in the `rules` table to find a keeper cost
  ("costs the round they were drafted in, minus one round"). That was the only
  honest option while nothing machine-readable existed, and it is not one now:
  js/keeper-rules.js holds the commissioner's configured rules, season-aware
  and validated, and this file consumes evaluate() like everything else does.

  Do not reintroduce a second cost calculation here. If a keeper cost is wrong,
  it is wrong in one place.
*/

/*
  THE FOUR CLASSES, named the way the brief names them.

  KNOWN      a cost rule is recorded AND we know the draft round
  NO_COST    on the roster, draft round known, but no rule to price it
  NO_ROUND   on the roster and never drafted in this league - so there is no
             round to price even if a rule existed
  UNKNOWN    the player id is not in the Sleeper player map at all
*/
export const CLASS = {
  KNOWN:    "cost-known",
  NO_COST:  "cost-unknown",
  NO_ROUND: "never-drafted",
  UNKNOWN:  "unknown-player",
};

/**
 * Every player on the roster, with what is actually known about each.
 *
 * @param {Object}   input
 * @param {string[]} input.playerIds        sleeper_rosters.players
 * @param {Object}   input.players          the Sleeper player map, {id:{n,p,t}}
 * @param {Object[]} input.draftPicks       sleeper_draft_picks rows
 * @param {string}   input.sleeperUserId    whose roster this is
 * @param {Object|null} input.rules         a validated rule set (keeper-rules.js)
 * @param {number}   input.targetSeason     the season being decided
 * @param {Object[]} [input.keeperRows]     existing keeper rows, for tenure
 * @param {number|string} [input.memberId]  whose keeper history to count
 * @param {number|null} [input.earliestSyncedSeason]  where draft history starts
 * @param {Object}   [input.market]         from marketFrom()
 */
export function candidates({ playerIds = [], players = {}, draftPicks = [],
                             sleeperUserId = null, rules = null, targetSeason = null,
                             keeperRows = [], memberId = null,
                             earliestSyncedSeason = null, market = NO_MARKET }) {
  /*
    THE NEWEST PICK IS FOR DISPLAY. THE EARLIEST ONE SETS THE COST.

    Two different questions, and v1.105.0 only asked the first. "Drafted round
    14 in 2025" is what a manager recognises, so it is still shown - but the
    keeper right was established by the FIRST time this league drafted the
    player, and the cost is pinned to that round. Taking the newest pick would
    make a player cheaper every time somebody re-drafted them. See
    originalQualifyingRound().
  */
  const latestPick = new Map();
  for (const p of draftPicks) {
    if (!p || p.player_id == null) continue;
    const id = String(p.player_id);
    const seen = latestPick.get(id);
    if (!seen || Number(p.season) > Number(seen.season)) latestPick.set(id, p);
  }

  return playerIds.map((rawId) => {
    const id = String(rawId);
    const meta = players[id] || null;
    const pick = latestPick.get(id) || null;
    const value = market.get(id);

    const name = meta?.n || null;
    const position = meta?.p || "";
    const nflTeam = meta?.t || "";

    /*
      A retired or released player still sits in a roster row until the next
      sync, and the Sleeper map marks them FA rather than dropping them. That
      is worth saying out loud on the card - it is exactly the player somebody
      would otherwise waste their keeper on.
    */
    const freeAgent = meta ? (!nflTeam || nflTeam === "FA") : false;

    const draftRound = pick ? Number(pick.round) : null;
    const draftSeason = pick ? Number(pick.season) : null;
    /* Did they draft this player themselves, or arrive later by trade or
       waiver? Compared on Sleeper user ids, never on a name. */
    const draftedByMe = pick && sleeperUserId != null
      ? String(pick.sleeper_user_id) === String(sleeperUserId)
      : null;

    /* The original qualifying round, and how many seasons this member has
       already kept this player - both fed to the one rules engine. */
    const origin = originalQualifyingRound(draftPicks, id, { earliestSyncedSeason });
    const prior = priorKeeperSeasons(keeperRows, {
      playerId: id, memberId, beforeSeason: targetSeason });
    const standing = evaluate({ config: rules, targetSeason,
                                originalRound: origin.round, priorKeeperSeasons: prior });

    let klass;
    if (!meta) klass = CLASS.UNKNOWN;
    else if (standing.state === "eligible") klass = CLASS.KNOWN;
    else if (origin.round == null) klass = CLASS.NO_ROUND;
    else klass = CLASS.NO_COST;

    return {
      playerId: id, name, position, nflTeam, freeAgent,
      /* Display: the most recent time this league drafted them. */
      draftRound, draftSeason, draftedByMe, draftPickNo: pick ? Number(pick.pick_no) : null,
      /* Cost basis: the FIRST time, which is what the rules charge against. */
      originalRound: origin.round, originalSeason: origin.season,
      originUncertain: origin.uncertain, originReason: origin.reason,
      priorKeeperSeasons: prior,
      class: klass,
      keeperCost: standing.calculatedRound,
      keeperYear: standing.keeperYear,
      maxKeeperYears: standing.maxKeeperYears,
      finalKeeperYear: standing.finalKeeperYear,
      standing: standing.state,
      standingReason: standing.reason,
      reviewNeeded: standing.reviewNeeded,
      marketRank: value?.rank ?? null,
      marketProjectedRound: value?.projectedRound ?? null,
    };
  });
}

/*
  HOW THE LIST IS ORDERED, and why it is not a score.

  A single number would be a claim - "this is a 93" - and there is nothing to
  compute one from. So the order is a stated preference over facts, in this
  sequence, and the UI prints the reason beside each row:

    1. a priced keeper is more useful than an unpriced one (only ever
       happens once a rule is recorded), CHEAPEST cost first - and cheapest
       means the LATEST round. Giving up a 14th-round pick to keep somebody
       costs almost nothing; giving up your first-round pick costs the most
       expensive asset you own. The first cut of this sorted round numbers
       ascending and put "Round 1 cost" at the top labelled as the lowest
       cost, which is exactly backwards.
    2. then players whose draft round we know, latest round first - because
       every round-based keeper rule anybody uses makes a later pick cheaper,
       so a later round is the more likely bargain. This is NOT a claim that
       they are good.
    3. then players with no draft round in this league
    4. then ids the player map does not recognise
    5. a free agent sinks within its group, because keeping somebody who is
       not on an NFL roster is almost certainly a mistake

  Ties break on name so the list is stable between renders.
*/
export function rankCandidates(list = []) {
  /* Ineligible sinks below everything that can actually be kept, and an
     unrecognised player id sinks below that. */
  const groupOf = (c) => c.standing === "unavailable" ? 4
                       : c.class === CLASS.KNOWN ? 0
                       : c.class === CLASS.NO_COST ? 1
                       : c.class === CLASS.NO_ROUND ? 2 : 3;
  return [...list].sort((a, b) => {
    const g = groupOf(a) - groupOf(b);
    if (g) return g;
    if (a.freeAgent !== b.freeAgent) return a.freeAgent ? 1 : -1;
    if (a.keeperCost != null && b.keeperCost != null && a.keeperCost !== b.keeperCost) {
      return b.keeperCost - a.keeperCost;      // a later round is a cheaper keeper
    }
    if (a.draftRound != null && b.draftRound != null && a.draftRound !== b.draftRound) {
      return b.draftRound - a.draftRound;      // later round first
    }
    return String(a.name || a.playerId).localeCompare(String(b.name || b.playerId));
  });
}

/*
  THE LABELS.

  Every one of these is a fact with its source in the wording. There is no
  "Best value" and no "Safest choice" here, because both are claims about a
  market this app cannot see. The moment a market source exists, the two
  value labels at the top start appearing and they carry the source with
  them - which is the only condition under which they are honest.
*/
export const LABELS = {
  /* "Lowest cost" = the latest round given up, not the lowest round number. */
  CHEAPEST_COST: "Lowest keeper cost",
  LATEST_ROUND:  "Latest-round pick",
  EARLIEST_ROUND: "Earliest-round pick",
  RETURNING:     "You drafted them",
  FINAL_YEAR:    "Final keeper year",
  LIMIT_REACHED: "Keeper limit reached",
  NEEDS_REVIEW:  "Needs review",
  ACQUIRED:      "Acquired, not drafted",
  NEVER_DRAFTED: "Never drafted in this league",
  NEEDS_MARKET:  "Needs market ranking",
  NOT_ON_NFL:    "Not on an NFL roster",
  UNKNOWN_ID:    "Not in the Sleeper player list",
};

/**
 * The one-line reason printed under a candidate. Facts only.
 */
export function reasonFor(c) {
  if (c.class === CLASS.UNKNOWN) return LABELS.UNKNOWN_ID;
  const bits = [];
  if (c.originalRound != null) {
    bits.push(`Original R${c.originalRound}`);
    if (c.keeperCost != null) bits.push(`Keeper R${c.keeperCost}`);
  } else {
    bits.push("Original draft round unknown");
  }
  /* Tenure, in the configured league's own terms - never a hard-coded 3. */
  if (c.standing === "unavailable") bits.push(c.standingReason);
  else if (c.finalKeeperYear) bits.push("FINAL YEAR");
  else if (c.keeperYear != null && c.maxKeeperYears != null) {
    bits.push(`Year ${c.keeperYear} of ${c.maxKeeperYears}`);
  }
  if (c.reviewNeeded && c.originalRound == null) bits.push("needs review");
  if (c.freeAgent) bits.push("not on an NFL roster");
  return bits.join(" · ");
}

/**
 * The badges on a candidate: which superlatives it actually holds, worked
 * out against the rest of the list rather than asserted.
 */
export function badgesFor(c, all = []) {
  const out = [];
  const priced = all.filter((x) => x.keeperCost != null && x.standing === "eligible");

  /* The cheapest keeper is the one costing the LATEST round - handing over a
     14th-round pick costs almost nothing, a first-rounder costs the most
     valuable thing you own. Math.max, not Math.min. */
  if (c.keeperCost != null && c.standing === "eligible" && priced.length > 1 &&
      c.keeperCost === Math.max(...priced.map((x) => x.keeperCost))) {
    out.push(LABELS.CHEAPEST_COST);
  }
  if (c.finalKeeperYear && c.standing === "eligible") out.push(LABELS.FINAL_YEAR);
  if (c.standing === "unavailable") out.push(LABELS.LIMIT_REACHED);
  if (c.reviewNeeded && c.class !== CLASS.UNKNOWN) out.push(LABELS.NEEDS_REVIEW);
  if (c.draftedByMe === true) out.push(LABELS.RETURNING);
  if (c.draftedByMe === false) out.push(LABELS.ACQUIRED);
  if (c.freeAgent) out.push(LABELS.NOT_ON_NFL);
  return out;
}

/**
 * Everything the page needs, in one call.
 *
 * `state` is what the UI switches on, so no view has to work out which of
 * the empty cases it is looking at:
 *
 *   no-member | no-sleeper-id | no-roster | no-players | ready
 */
export function advise(input) {
  const { member = null, sleeperUserId = null, roster = null,
          players = null, draftPicks = [], rules = null, targetSeason = null,
          keeperRows = [], earliestSyncedSeason = null,
          maxKeepers = null, market = NO_MARKET } = input || {};

  if (!member) return { state: "no-member" };
  if (!sleeperUserId) return { state: "no-sleeper-id", member };
  if (!roster) return { state: "no-roster", member, sleeperUserId };

  const playerIds = Array.isArray(roster.players) ? roster.players.map(String) : [];
  if (!playerIds.length) return { state: "no-players", member, sleeperUserId, roster };

  const list = rankCandidates(candidates({
    playerIds, players: players || {}, draftPicks, sleeperUserId,
    rules, targetSeason, keeperRows, memberId: member?.id,
    earliestSyncedSeason, market,
  }));

  const known = list.filter((c) => c.standing === "eligible").length;
  const rounds = list.filter((c) => c.originalRound != null).length;

  return {
    state: "ready",
    member, sleeperUserId, roster, rules, targetSeason, maxKeepers,
    market: { available: market.available, source: market.source, updatedAt: market.updatedAt },
    candidates: list,
    counts: { total: list.length, costKnown: known, draftRoundKnown: rounds,
              neverDrafted: list.filter((c) => c.originalRound == null && c.class !== CLASS.UNKNOWN).length,
              unavailable: list.filter((c) => c.standing === "unavailable").length,
              needsReview: list.filter((c) => c.reviewNeeded && c.class !== CLASS.UNKNOWN).length,
              unknownPlayer: list.filter((c) => c.class === CLASS.UNKNOWN).length },
    /* How many rows to lead with. The allowance if Sleeper stated one, and
       never more than a screenful. */
    shortlist: Math.min(list.length, Math.max(3, (Number(maxKeepers) || 0) + 2)),
  };
}
