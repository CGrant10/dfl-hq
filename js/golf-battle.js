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

   Each round is won under one of two scorings, chosen per round:

     STROKE PLAY   fewest strokes over the nine
     MATCH PLAY    hole by hole, most holes won - and a match three up with
                   two to play is over where it stands

   Either way the winning side puts one point on their team's board, and
   level is level: a halved match is worth nothing to either side, so a nine
   can finish 2-0-with-one-halved, or 1-1, or 0-0. Points from all three
   rounds pile onto the same two teams, and every round keeps its own, so
   the nine just played is still readable after the next starts.

   TWO RULES WORTH BEING EXPLICIT ABOUT
   1. Only holes BOTH sides have posted are compared. Otherwise a side who
      had written down five holes would show as losing by 20 to a side who
      had written down one.
   2. A point is not awarded until the match is DECIDED. Under stroke play
      that means both cards are full - "ahead with two to play" is not a win
      and a card with a hole missing is not a round. Under match play it can
      come earlier, because 3&2 genuinely is the end of the match.
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
export const SCORING_NAMES = { strokes: "Stroke play", match: "Match play" };

/** The holes both sides have written down, which are the only comparable ones. */
function shared(a, b, holes) {
  const rows = [];
  for (let h = 1; h <= holes; h++) {
    const x = num(a.get(h)), y = num(b.get(h));
    if (!x || !y) continue;          // rule 1
    rows.push({ hole: h, x, y });
  }
  return rows;
}

/*
  MATCH PLAY

  Holes, not strokes: take a hole and go one up, and a 9 on one hole costs
  exactly as much as a 5. Two things fall out of that and both matter.

  1. A match can END EARLY. Three up with two to play is over - nobody can
     catch up - so "complete" here means DECIDED, not "all nine written
     down". Requiring nine would refuse to award a point for a match that
     everybody walked in from on the 7th.
  2. The margin is quoted the golf way: 3&2 for three up with two to play,
     or "2 up" if it went the distance.

  Level after nine is still level, and still worth nothing to either side.
*/
function matchPlay(a, b, holes, rows, allThru, postedA, postedB) {
  let wonA = 0, wonB = 0, halvedHoles = 0;
  const running = [];
  let thru = 0, closedOut = false;

  /*
    Walk the holes IN ORDER and stop where the match was decided.

    Counting the whole card instead reported a match won on the 10th as "18
    up" if the pair played the last eight out anyway - and a golfer will tell
    you it was 10&8. The margin is a fact about where the match ENDED, not
    about how many holes got written down afterwards, so the loop stops the
    moment one side is up by more holes than are left.
  */
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.x < r.y) wonA++;
    else if (r.y < r.x) wonB++;
    else halvedHoles++;
    running.push({ hole: r.hole, up: wonA - wonB });
    thru = i + 1;
    if (Math.abs(wonA - wonB) > holes - thru) { closedOut = true; break; }
  }

  const up = Math.abs(wonA - wonB);
  const remaining = Math.max(0, holes - thru);
  const complete = closedOut || thru >= holes;
  return {
    scoring: "match", holes, thru, postedA, postedB,
    wonA, wonB, halvedHoles, running, up, remaining, closedOut,
    /* Negative means slot 1 is ahead, the same convention stroke play uses,
       so every caller can pick the leader the same way for both. */
    diff: wonB - wonA,
    lead: up,
    a: total(a, holes), b: total(b, holes),
    complete,
    winner: complete && up > 0 ? (wonA > wonB ? 1 : 2) : null,
    halved: complete && up === 0,
  };
}

function strokePlay(a, b, holes, rows, thru, postedA, postedB) {
  let sa = 0, sb = 0;
  for (const r of rows) { sa += r.x; sb += r.y; }
  const complete = postedA >= holes && postedB >= holes;
  const diff = sa - sb;
  return {
    scoring: "strokes", holes, thru, postedA, postedB,
    a: sa, b: sb, diff, lead: Math.abs(diff),
    complete,
    winner: complete && diff !== 0 ? (diff < 0 ? 1 : 2) : null,   // rule 2
    halved: complete && diff === 0,
  };
}

/**
 * Where a match stands, under whichever scoring its round uses.
 * @param {Map<number,number>} a  slot 1's strokes by hole
 * @param {Map<number,number>} b  slot 2's strokes by hole
 * @param {number} holes          the round's hole count
 * @param {"strokes"|"match"} scoring
 */
export function battleResult(a, b, holes = DEFAULT_ROUND_HOLES, scoring = "strokes") {
  const rows = shared(a, b, holes);
  const thru = rows.length;
  const postedA = posted(a, holes), postedB = posted(b, holes);
  return scoring === "match"
    ? matchPlay(a, b, holes, rows, thru, postedA, postedB)
    : strokePlay(a, b, holes, rows, thru, postedA, postedB);
}

/** "3&2", "2 up", or "by 4" for stroke play. */
export function marginLabel(r) {
  if (r.scoring !== "match") return `by ${r.lead}`;
  if (r.closedOut && r.remaining > 0) return `${r.up}&${r.remaining}`;
  return `${r.up} up`;
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
    return `${leader} won ${marginLabel(r)}`;
  }
  if (!r.thru) {
    /* Somebody has started but the other side has posted nothing, so there
       is still nothing to compare - say which, or it reads as a dead card. */
    if (r.postedA || r.postedB) {
      return `Waiting on ${r.postedA ? nameB : nameA}`;
    }
    return "Not started";
  }
  if (r.scoring === "match") {
    if (!r.up) return `All square thru ${r.thru}`;
    return `${leader} ${r.up} up thru ${r.thru}`;
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
/* =====================================================================
   WHAT STATE IS THIS OUTING IN
   ---------------------------------------------------------------------
   One answer, owned here, because the app currently has TWO and they can
   disagree:

     pages/golf.js   status === "active"                 -> "Live" pill
     pages/home.js   decided > 0 && decided < total      -> LIVE badge

   They happen to agree today, and they come apart the moment somebody
   enters a score before flipping the status, or flips the status on a
   Tuesday before anybody has teed off.

   THE RULE, and it is deliberate rather than inferred: an outing is LIVE
   when the commissioner has said it is active AND at least one battle has
   been decided AND they are not all decided. Scores alone never promote an
   event to live - a stroke typed in on a practice round is not a
   tournament - and "active" alone never does either, because a status
   flipped early would have the front page claiming a live event over an
   empty course.

   FOUR STATES, and "complete" is the one worth naming: every battle is
   decided but the commissioner has not marked the outing final. The day is
   over; the paperwork is not. Calling that "live" would be a lie and
   calling it "final" would pre-empt a decision that is theirs.

   Takes the SAME rounds shape dayPoints() takes - [{round, battles}] -
   so no caller has to assemble anything new to ask.
   ===================================================================== */
export function outingState(outing, rounds = []) {
  const battles = (rounds || [])
    .flatMap((r) => r?.battles || [])
    .filter((b) => (b?.sides || []).length === 2);

  const total = battles.length;
  const decided = battles.filter((b) => b?.result?.complete).length;
  const status = String(outing?.status || "").trim().toLowerCase();
  const base = { status, total, decided, live: false };

  if (status === "final") return { ...base, state: "final" };

  if (status === "active") {
    if (total > 0 && decided >= total) return { ...base, state: "complete" };
    if (decided > 0) return { ...base, state: "live", live: true };
    return { ...base, state: "upcoming" };      // active, but nothing played
  }

  // "setup", empty, or anything unrecognised: it has not started.
  return { ...base, state: "upcoming" };
}

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
