// =====================================================================
// keeper-rules.js - the one place that decides what a keeper costs
// ---------------------------------------------------------------------
// WHY THIS REPLACES WHAT WAS HERE BEFORE
//
// v1.105.0 tried to recognise the league's keeper rule by pattern-matching
// English in the `rules` table ("costs the round they were drafted in, minus
// one round"). That was the honest thing to do at the time - nothing
// machine-readable existed and the live rules table was empty - but it is not
// a foundation. Prose is not configuration: it cannot be validated, it cannot
// be versioned per season, and an editor cannot present it as controls.
//
// The commissioner has now stated the actual rules, so they become structured
// data:
//
//   maximum tenure        3 keeper seasons
//   cost basis            the player's ORIGINAL qualifying DFL draft round
//   round adjustment      1 round earlier than that
//   minimum cost          Round 1
//   progression           fixed from the original round - it does NOT
//                         compound each keeper year
//
//   original R8 -> R7 in keeper year 1, R7 in year 2, R7 in year 3, then done
//   original R2 -> R1        original R1 -> R1 (the floor holds)
//
// SEASON-AWARE, AND THAT IS THE WHOLE POINT OF THE SHAPE
//
// A rule set is stamped with the season it takes effect from. Changing 2027's
// rules cannot alter what was recorded in 2026, because a saved keeper row is
// a FACT - what the commissioner approved - and this file only ever proposes.
// configFor() picks the newest rule set at or before a target season, so the
// past keeps being calculated the way it was calculated.
//
// EVERYTHING CONSUMES THIS. The Advisor, the commissioner's roster picker,
// autofill, eligibility badges, tenure labels and the rule summary all call
// evaluate(). There is no second copy of the arithmetic.
// =====================================================================

/*
  Progression modes. Only one exists today and it is the league's actual rule,
  but the field exists so that "cost climbs a round every year you keep him" -
  the other common house rule - is a config change rather than a rewrite.

  The commissioner never sees these strings; the editor shows a sentence.
*/
export const PROGRESSION = {
  /** Cost is fixed by the original draft round, every keeper year. */
  FIXED_FROM_ORIGINAL: "fixed_from_original",
  /** Cost climbs by the adjustment again for each additional keeper year. */
  ESCALATES_PER_YEAR: "escalates_per_year",
};

/** The rules the commissioner supplied, as the seeded starting point. */
export const DEFAULT_RULES = {
  effective_season: 2026,
  max_keeper_seasons: 3,
  cost_basis: "original_draft_round",
  round_adjustment: 1,
  min_keeper_round: 1,
  progression: PROGRESSION.FIXED_FROM_ORIGINAL,
};

/**
 * Validate and coerce a stored/edited rule set.
 *
 * Invalid configuration must not be allowed to leak NaN into a keeper round,
 * so this returns errors rather than a half-usable object. The UI shows them
 * and refuses to save.
 *
 * @returns {{ok:boolean, config:object|null, errors:string[]}}
 */
export function validateConfig(input) {
  const errors = [];
  const raw = input || {};
  const num = (key, { min, max, integer = true } = {}) => {
    const value = Number(raw[key]);
    if (raw[key] === "" || raw[key] == null || !Number.isFinite(value)) {
      errors.push(`${key} must be a number`);
      return null;
    }
    if (integer && !Number.isInteger(value)) { errors.push(`${key} must be a whole number`); return null; }
    if (min != null && value < min) { errors.push(`${key} must be at least ${min}`); return null; }
    if (max != null && value > max) { errors.push(`${key} must be no more than ${max}`); return null; }
    return value;
  };

  const season = num("effective_season", { min: 2000, max: 2100 });
  const maxSeasons = num("max_keeper_seasons", { min: 1, max: 20 });
  /* Zero is legal - a league can keep at the original round - but negative is
     not: "minus -1 rounds" is a more expensive keeper written backwards, and
     it is exactly the sort of thing that should be a validation error rather
     than a surprise. */
  const adjustment = num("round_adjustment", { min: 0, max: 20 });
  const minRound = num("min_keeper_round", { min: 1, max: 40 });

  const progression = String(raw.progression || DEFAULT_RULES.progression);
  if (!Object.values(PROGRESSION).includes(progression)) {
    errors.push(`progression must be one of: ${Object.values(PROGRESSION).join(", ")}`);
  }
  const basis = String(raw.cost_basis || DEFAULT_RULES.cost_basis);
  if (basis !== "original_draft_round") {
    errors.push("cost_basis must be original_draft_round");
  }

  if (errors.length) return { ok: false, config: null, errors };
  return {
    ok: true,
    errors: [],
    config: {
      effective_season: season,
      max_keeper_seasons: maxSeasons,
      cost_basis: basis,
      round_adjustment: adjustment,
      min_keeper_round: minRound,
      progression,
      updated_at: raw.updated_at || null,
    },
  };
}

/**
 * The rule set that governs a season: the newest one effective at or before it.
 *
 * A 2027 rule change therefore leaves 2026 alone, and a season earlier than
 * any configuration returns null so callers can say "no rules configured"
 * instead of quietly inventing some.
 */
export function configFor(ruleSets = [], targetSeason) {
  const season = Number(targetSeason);
  if (!Number.isFinite(season)) return null;
  const usable = (ruleSets || [])
    .map((r) => validateConfig(r))
    .filter((v) => v.ok)
    .map((v) => v.config)
    .filter((c) => c.effective_season <= season)
    .sort((a, b) => b.effective_season - a.effective_season);
  return usable[0] || null;
}

/**
 * What keeping a player costs, from the round they were originally drafted.
 *
 * @param {number} originalRound   the original qualifying DFL draft round
 * @param {object} config          a validated rule set
 * @param {number} [keeperYear]    1-based; only read by escalating leagues
 * @returns {number|null} the round, or null when the original round is unknown
 */
export function keeperCost(originalRound, config, keeperYear = 1) {
  const round = Number(originalRound);
  if (!config || !Number.isFinite(round) || round < 1) return null;
  const years = Math.max(1, Number(keeperYear) || 1);
  const steps = config.progression === PROGRESSION.ESCALATES_PER_YEAR ? years : 1;
  const cost = round - config.round_adjustment * steps;
  /* The floor is a floor, not a wrap: an original first-rounder stays R1
     rather than becoming R0 or a negative round. */
  return Math.max(config.min_keeper_round, cost);
}

/**
 * Everything the UI needs about one player's keeper standing for one season.
 *
 * @param {Object} input
 * @param {object}  input.config            a validated rule set (or null)
 * @param {number}  input.targetSeason      the season being decided
 * @param {number|null} input.originalRound the original qualifying draft round
 * @param {number}  [input.priorKeeperSeasons]  how many seasons already kept
 * @returns {{
 *   state: "eligible"|"review"|"unavailable"|"no-rules",
 *   eligible: boolean, reviewNeeded: boolean,
 *   keeperYear: number|null, maxKeeperYears: number|null,
 *   finalKeeperYear: boolean, calculatedRound: number|null,
 *   originalRound: number|null, reason: string
 * }}
 */
export function evaluate({ config = null, targetSeason = null, originalRound = null,
                           priorKeeperSeasons = 0 } = {}) {
  /*
    Number(null) is 0 and Number("") is 0, so a plain isFinite() check called
    an unknown draft round "round zero" and walked straight past the review
    branch below into a keeperCost() of null reported as eligible. Unknown has
    to be tested before coercion.
  */
  const knownRound = originalRound !== null && originalRound !== undefined
    && originalRound !== "" && Number.isFinite(Number(originalRound))
    && Number(originalRound) >= 1
    ? Number(originalRound) : null;

  const base = {
    state: "review", eligible: false, reviewNeeded: true,
    keeperYear: null, maxKeeperYears: config?.max_keeper_seasons ?? null,
    finalKeeperYear: false, calculatedRound: null,
    originalRound: knownRound,
    reason: "",
  };

  if (!config) {
    return { ...base, state: "no-rules", reviewNeeded: true,
             reason: "No keeper rules are configured for this season" };
  }

  const prior = Math.max(0, Number(priorKeeperSeasons) || 0);
  const max = config.max_keeper_seasons;

  /* Tenure is checked BEFORE the round, because "you have already kept him
     three times" is true whether or not we know what he cost. */
  if (prior >= max) {
    return { ...base, state: "unavailable", reviewNeeded: false,
             keeperYear: prior + 1, maxKeeperYears: max,
             reason: `Keeper limit reached — kept ${prior} season${prior === 1 ? "" : "s"} of ${max}` };
  }

  const keeperYear = prior + 1;
  const finalKeeperYear = keeperYear === max;

  if (base.originalRound == null) {
    return { ...base, state: "review", reviewNeeded: true,
             keeperYear, maxKeeperYears: max, finalKeeperYear,
             reason: "Original qualifying draft round unknown — needs commissioner review" };
  }

  const calculatedRound = keeperCost(base.originalRound, config, keeperYear);
  /* A belt to the braces above: nothing reports eligible without a round to
     charge for it. If this ever fires, the cause is upstream and the honest
     answer is review rather than a card with a blank cost on it. */
  if (calculatedRound == null) {
    return { ...base, state: "review", reviewNeeded: true,
             keeperYear, maxKeeperYears: max, finalKeeperYear,
             reason: "Keeper cost could not be calculated — needs commissioner review" };
  }

  return {
    ...base,
    state: "eligible", eligible: true, reviewNeeded: false,
    keeperYear, maxKeeperYears: max, finalKeeperYear, calculatedRound,
    reason: finalKeeperYear
      ? `Final keeper season — year ${keeperYear} of ${max}`
      : `Year ${keeperYear} of ${max}`,
  };
}

/**
 * THE ORIGINAL QUALIFYING DRAFT ROUND, which is not the most recent one.
 *
 * A keeper right is established by the draft that first brought the player
 * into the league, and the cost is pinned to that round for as long as they
 * are kept - so taking the newest pick would make a player get cheaper every
 * time somebody re-drafted them. The EARLIEST pick on record is the answer.
 *
 * It is deliberately conservative about two gaps the audit found:
 *
 *   * 2019 has no draft board on Sleeper at all, so a player who arrived that
 *     year has no provable original round.
 *   * a player acquired by trade or waiver was never drafted by this league,
 *     so there is no round to inherit.
 *
 * Both return null, which evaluate() turns into "needs review" rather than a
 * guess. `earliestSyncedSeason` exists so a caller can say WHY: a player whose
 * earliest pick is the earliest season we have may have been in the league
 * before that, and the round we hold might not be the original one.
 *
 * @param {Array<{player_id:string|number, season:number|string, round:number|string}>} picks
 * @param {string|number} playerId
 * @param {{earliestSyncedSeason?:number}} [opts]
 * @returns {{round:number|null, season:number|null, uncertain:boolean, reason:string}}
 */
export function originalQualifyingRound(picks = [], playerId, { earliestSyncedSeason = null } = {}) {
  const id = String(playerId);
  const mine = (picks || [])
    .filter((p) => p && String(p.player_id) === id)
    .map((p) => ({ season: Number(p.season), round: Number(p.round) }))
    .filter((p) => Number.isFinite(p.season) && Number.isFinite(p.round))
    .sort((a, b) => a.season - b.season);

  if (!mine.length) {
    return { round: null, season: null, uncertain: true,
             reason: "Never drafted in this league on record" };
  }
  const first = mine[0];
  const boundary = Number(earliestSyncedSeason);
  const uncertain = Number.isFinite(boundary) && first.season <= boundary;
  return {
    round: first.round,
    season: first.season,
    uncertain,
    reason: uncertain
      ? `First drafted ${first.season}, the earliest season on record — may predate it`
      : `Originally drafted round ${first.round} in ${first.season}`,
  };
}

/**
 * How many seasons a player has already been kept, from canonical keeper rows.
 *
 * Counts only rows that carry a stable player_id, and only seasons BEFORE the
 * one being decided. Legacy nickname rows are deliberately not counted: the
 * audit found `team` holding first names and `player` holding nicknames, and
 * inventing tenure from a fuzzy name match would silently make somebody
 * ineligible. Where legacy rows might apply, callers surface review rather
 * than a number - see legacyKeeperNames().
 */
export function priorKeeperSeasons(keeperRows = [], { playerId, memberId, beforeSeason } = {}) {
  const pid = playerId == null ? null : String(playerId);
  const mid = memberId == null ? null : String(memberId);
  const cutoff = Number(beforeSeason);
  if (!pid || !Number.isFinite(cutoff)) return 0;

  const seasons = new Set();
  for (const row of keeperRows || []) {
    if (!row || row.player_id == null) continue;                 // legacy row
    if (String(row.player_id) !== pid) continue;
    if (mid != null && row.member_id != null && String(row.member_id) !== mid) continue;
    const year = Number(row.year ?? row.season);
    if (Number.isFinite(year) && year < cutoff) seasons.add(year);
  }
  return seasons.size;
}

/**
 * Legacy rows that MIGHT be about this player, for an honest review prompt.
 *
 * Returns the stored nickname strings and nothing else - no matching, no
 * scoring, no guess. "Puka", "JJettas" and "NA" stay exactly as typed, and the
 * commissioner is the one who decides whether they count.
 */
export function legacyKeeperNames(keeperRows = [], { beforeSeason } = {}) {
  const cutoff = Number(beforeSeason);
  return (keeperRows || [])
    .filter((row) => row && row.player_id == null)
    .filter((row) => {
      const year = Number(row.year ?? row.season);
      return !Number.isFinite(cutoff) || (Number.isFinite(year) && year < cutoff);
    })
    .map((row) => ({ year: row.year ?? row.season ?? null,
                     team: row.team ?? "", player: row.player ?? "",
                     round_cost: row.round_cost ?? null }));
}

/**
 * The rule set as a sentence, for the page summary and the share board.
 *
 * Every value comes from configuration - there is no hard-coded "3-year" or
 * "-1" anywhere in the UI. Returns null when nothing is configured, so a
 * caller omits the line instead of printing a confusing half-sentence.
 */
export function describeRules(config) {
  if (!config) return null;
  const parts = [`${config.max_keeper_seasons}-year maximum`];
  parts.push(config.round_adjustment === 0
    ? "Original draft round"
    : `Original draft -${config.round_adjustment} round${config.round_adjustment === 1 ? "" : "s"}`);
  parts.push(`Floor R${config.min_keeper_round}`);
  if (config.progression === PROGRESSION.ESCALATES_PER_YEAR) parts.push("cost climbs each keeper year");
  return parts.join(" · ");
}

/** The worked example the rule editor shows, straight from the config. */
export function ruleExample(config, originalRound = 8) {
  if (!config) return null;
  const cost = keeperCost(originalRound, config, 1);
  if (cost == null) return null;
  return { originalRound, cost,
           text: `Player originally drafted in Round ${originalRound} → Keeper cost: Round ${cost}` };
}
