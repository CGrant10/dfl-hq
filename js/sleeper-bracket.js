// =====================================================================
// sleeper-bracket.js - reading placements out of a Sleeper playoff bracket.
// ---------------------------------------------------------------------
// Pure, and separate from sync.js on purpose: sync.js imports the database, so
// nothing in it can be spec'd. A bracket parser is exactly the sort of thing
// that should have tests - it is a guess about somebody else's data format, and
// the failure mode is a wrong name carved into league history.
//
// SLEEPER'S SHAPE. Both brackets are a flat list of games:
//
//   { r: round, m: match, t1, t2, w: winner_roster, l: loser_roster, p?: place }
//
// `p` appears on the games that DECIDE a placement: p:1 is the championship,
// p:3 the third-place game, and in the losers bracket the higher numbers are
// the consolation places. Not every league configures every placement game, so
// nothing here assumes `p` exists.
// =====================================================================

/**
 * Champion and runner-up from the WINNERS bracket.
 *
 * The championship game is the one marked p:1; fall back to the final round
 * when a league has not configured placement games.
 */
export function readWinners(bracket) {
  if (!bracket?.length) return { championRoster: null, runnerUpRoster: null };

  let final = bracket.find((g) => g.p === 1);
  if (!final) {
    const lastRound = Math.max(...bracket.map((g) => g.r || 0));
    final = bracket.find((g) => g.r === lastRound);
  }
  if (!final || final.w == null) return { championRoster: null, runnerUpRoster: null };

  return { championRoster: final.w, runnerUpRoster: final.l ?? null };
}

/**
 * Dead last, from the LOSERS bracket.
 *
 * THIS IS NOT THE WORST REGULAR-SEASON RECORD, and that distinction is the whole
 * reason this function exists. `sleeper_standings.rank` is record then points
 * for - it is what the table looked like going INTO the playoffs. The Chip Eater
 * is whoever came last once the brackets were played, which a 4-11 team can
 * escape and a 8-7 team can walk into.
 *
 * The game deciding last place is the one playing for the HIGHEST placement
 * number, and last place is its LOSER. Where a league has configured no
 * placement games, the deepest round of the losers bracket is the same game by
 * construction - you only keep playing the teams that keep losing.
 *
 * Returns null rather than guessing when the bracket is absent, empty or
 * unfinished. A season with no answer shows no Chip Eater, which is the honest
 * outcome and is what the commissioner's manual override is for.
 */
export function readLastPlace(bracket) {
  if (!Array.isArray(bracket) || !bracket.length) return null;

  const placed = bracket.filter((g) => Number.isFinite(Number(g?.p)));
  let decider = null;

  if (placed.length) {
    /* Highest `p` is the lowest placing being contested. */
    decider = placed.reduce((worst, g) => (Number(g.p) > Number(worst.p) ? g : worst), placed[0]);
  } else {
    const lastRound = Math.max(...bracket.map((g) => Number(g?.r) || 0));
    /* More than one game can share the deepest round. The one whose loser is
       last is not knowable without placements, so this declines rather than
       picking one of them arbitrarily. */
    const finals = bracket.filter((g) => (Number(g?.r) || 0) === lastRound);
    if (finals.length !== 1) return null;
    decider = finals[0];
  }

  /* An unplayed game has no loser. Reporting a Chip Eater from a bracket that
     has not finished is how a placeholder becomes permanent. */
  const loser = decider?.l;
  return loser == null ? null : loser;
}
