/* =====================================================================
   golf-battle.js - who is winning a 2v2, and what it is worth
   ---------------------------------------------------------------------
   Pure arithmetic: no DOM, no database. The pair card, the battle list and
   the team points board all read the result from here, so they cannot
   disagree about the same round - which is the bug this file exists to
   prevent, given three places display it.

   THE GAME
   Two teams of six split into pairs. A pair plays 2v2 against a pair from
   the other team, one ball each, and the pair with the FEWEST STROKES over
   the round takes one point for their team. Level is level: a halved
   battle is worth nothing to either side, so three battles can finish
   2-0-with-one-halved, or 1-1, or 0-0.

   TWO RULES WORTH BEING EXPLICIT ABOUT
   1. Only holes BOTH pairs have posted are compared. Otherwise a pair who
      had written down five holes would show as losing by 20 to a pair who
      had written down one.
   2. The point is not awarded until both cards are full. "Ahead with two
      to play" is not a win, and a card with a hole missing is not a round.
   ===================================================================== */

/* A 9-hole course is played twice, so a round is always 18 numbers - the
   same count the scorecards offer. Not outing.holes, which is 9 for Rolla. */
export const ROUND_HOLES = 18;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** How many of the round's holes this side has actually written down. */
export function posted(strokes) {
  let n = 0;
  for (let h = 1; h <= ROUND_HOLES; h++) if (num(strokes.get(h)) > 0) n++;
  return n;
}

/** Every stroke this side has posted, whether or not the other pair has. */
export function total(strokes) {
  let t = 0;
  for (let h = 1; h <= ROUND_HOLES; h++) t += num(strokes.get(h));
  return t;
}

/**
 * Where a battle stands.
 * @param {Map<number,number>} a  slot 1's strokes by hole
 * @param {Map<number,number>} b  slot 2's strokes by hole
 * @returns {{thru:number, a:number, b:number, diff:number, lead:number,
 *            postedA:number, postedB:number, complete:boolean,
 *            winner:(1|2|null), halved:boolean}}
 *          diff is a minus b, so negative means slot 1 is ahead. lead is
 *          how many strokes the leader is up by, always positive.
 */
export function battleResult(a, b) {
  let sa = 0, sb = 0, thru = 0;
  for (let h = 1; h <= ROUND_HOLES; h++) {
    const x = num(a.get(h)), y = num(b.get(h));
    if (!x || !y) continue;          // rule 1: comparable holes only
    sa += x; sb += y; thru++;
  }
  const postedA = posted(a), postedB = posted(b);
  const complete = postedA >= ROUND_HOLES && postedB >= ROUND_HOLES;
  const diff = sa - sb;
  return {
    thru, a: sa, b: sb, diff, lead: Math.abs(diff), postedA, postedB, complete,
    winner: complete && diff !== 0 ? (diff < 0 ? 1 : 2) : null,   // rule 2
    halved: complete && diff === 0,
  };
}

/**
 * The one line that says where a battle is at.
 * @param {object} r      a battleResult
 * @param {string} nameA  slot 1's pair, e.g. "Cole & Ryan"
 * @param {string} nameB  slot 2's pair
 */
export function standingLine(r, nameA, nameB) {
  const leader = r.diff < 0 ? nameA : nameB;
  if (r.complete) {
    if (r.halved) return "Halved — no point";
    return `${leader} won by ${r.lead}`;
  }
  if (!r.thru) {
    /* Somebody has started but the other pair has posted nothing, so there
       is still nothing to compare - say which, or it reads as a dead card. */
    if (r.postedA || r.postedB) {
      return `Waiting on ${r.postedA ? nameB : nameA}`;
    }
    return "Not started";
  }
  if (!r.diff) return `All square thru ${r.thru}`;
  return `${leader} by ${r.lead} thru ${r.thru}`;
}

/**
 * Team points from a set of battles.
 *
 * @param {Array<{sides:Array<{team_id:any}>, result:object}>} battles
 * @returns {Map<string,number>} team id (as a string) -> points
 */
export function teamPoints(battles) {
  const points = new Map();
  const add = (teamId, n) => {
    const key = String(teamId);
    points.set(key, (points.get(key) || 0) + n);
  };
  for (const battle of battles) {
    for (const side of battle.sides) if (!points.has(String(side.team_id))) add(side.team_id, 0);
    const w = battle.result?.winner;
    if (!w) continue;                                   // halved or unfinished
    const side = battle.sides.find((s) => Number(s.slot) === w);
    if (side) add(side.team_id, 1);
  }
  return points;
}

/** "2 halved" / "1 still out" - what the points total does not say by itself. */
export function pointsFootnote(battles) {
  const halved = battles.filter((x) => x.result?.halved).length;
  const open = battles.filter((x) => !x.result?.complete).length;
  const bits = [];
  if (halved) bits.push(`${halved} halved — no point`);
  if (open) bits.push(`${open} still out`);
  return bits.join(" · ");
}

/** "Cole & Ryan", "Cole", or "Nobody yet". */
export function pairName(names) {
  const clean = (names || []).filter(Boolean);
  if (!clean.length) return "Nobody yet";
  return clean.join(" & ");
}
