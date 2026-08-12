/* =====================================================================
   golf-battle.js - who is winning a match, and what it is worth
   ---------------------------------------------------------------------
   Pure arithmetic: no DOM, no database. The match card, the round list and
   the team points board all read the result from here, so they cannot
   disagree about the same round - which is the bug this file exists to
   prevent, given three places display it.

   THE DAY
   Two captains draft twelve players into two teams of six. Those two teams
   stay put all day; the day is three rounds of nine holes on the same nine.
   Rounds 1 and 2 are 2v2s - and the pairs can be completely different
   between them - and round 3 is singles.

   Every match, whatever its format, is won by the side with the FEWEST
   STROKES over that round's nine, and the winner puts one point on their
   team's board. Level is level: a halved match is worth nothing to either
   side, so a nine can finish 2-0-with-one-halved, or 1-1, or 0-0. Points
   from all three rounds pile onto the same two teams, and every round keeps
   its own, so the nine just played is still readable after the next starts.

   TWO RULES WORTH BEING EXPLICIT ABOUT
   1. Only holes BOTH sides have posted are compared. Otherwise a pair who
      had written down five holes would show as losing by 20 to a pair who
      had written down one.
   2. The point is not awarded until both cards are full. "Ahead with two
      to play" is not a win, and a card with a hole missing is not a round.
   ===================================================================== */

/*
  A round is nine holes, played on the same nine each time.

  This was 18 when the day was one 2v2 over a nine played twice, and it is a
  PARAMETER now rather than a constant, because getting it wrong in either
  direction breaks the same thing: a nine-hole round measured against 18
  never awards its point, and an 18-hole round measured against 9 awards it
  at the turn. Every function below takes the round's own hole count and
  only falls back to this when a caller has none.
*/
export const DEFAULT_ROUND_HOLES = 9;

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** How many of the round's holes this side has actually written down. */
export function posted(strokes, holes = DEFAULT_ROUND_HOLES) {
  let n = 0;
  for (let h = 1; h <= holes; h++) if (num(strokes.get(h)) > 0) n++;
  return n;
}

/** Every stroke this side has posted, whether or not the other side has. */
export function total(strokes, holes = DEFAULT_ROUND_HOLES) {
  let t = 0;
  for (let h = 1; h <= holes; h++) t += num(strokes.get(h));
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
export function battleResult(a, b, holes = DEFAULT_ROUND_HOLES) {
  let sa = 0, sb = 0, thru = 0;
  for (let h = 1; h <= holes; h++) {
    const x = num(a.get(h)), y = num(b.get(h));
    if (!x || !y) continue;          // rule 1: comparable holes only
    sa += x; sb += y; thru++;
  }
  const postedA = posted(a, holes), postedB = posted(b, holes);
  const complete = postedA >= holes && postedB >= holes;
  const diff = sa - sb;
  return {
    holes, thru, a: sa, b: sb, diff, lead: Math.abs(diff), postedA, postedB, complete,
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

/**
 * The whole day: a running team total, plus what each round did on its own.
 *
 * The running total is the score of the tournament and the per-round tallies
 * are its history - the nine just played stays readable after the next one
 * starts, which is the entire reason rounds are their own rows rather than
 * the matches being rebuilt in place.
 *
 * @param {Array<{round:object, battles:Array}>} rounds  in round order
 * @returns {{total:Map<string,number>, per:Array<{round:object, points:Map<string,number>}>}}
 */
export function dayPoints(rounds) {
  const total = new Map();
  const per = [];
  for (const entry of rounds || []) {
    const points = teamPoints(entry.battles || []);
    per.push({ round: entry.round, points });
    for (const [team, n] of points) total.set(team, (total.get(team) || 0) + n);
  }
  return { total, per };
}

/** "Cole & Ryan", "Cole" for a singles match, or "Nobody yet". */
export function pairName(names) {
  const clean = (names || []).filter(Boolean);
  if (!clean.length) return "Nobody yet";
  return clean.join(" & ");
}
