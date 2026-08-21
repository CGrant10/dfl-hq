/* =====================================================================
   golf-board.js - what the live leaderboard says, with no DOM in it
   ---------------------------------------------------------------------
   The arithmetic and the ranking behind golf-live.js, kept in their own
   file for the same reason golf-battle.js is: this is the part that can be
   WRONG in a way nobody notices until somebody is standing on the 18th
   arguing about it, and it is the part a test runner can actually load.
   golf-live.js reads the database and paints; nothing here does either.

   A "ball" is one side of one match: a pair in a 2v2 nine, a person in a
   singles nine. That is the unit the tournament scores (see
   golf_matches_schema.sql), so it is the unit everything below counts.
   ===================================================================== */
import { roundHoles, pairName } from "./golf-battle.js";
import { teamInk } from "./brand-ink.js";

export const isSingles = (round) => round?.format === "singles";
export const roundLabel = (round) => round?.name || `Round ${round?.round_number ?? "?"}`;
export const roundShort = (round) => `R${round?.round_number ?? "?"}`;

const parOf = (holes, hole) => {
  const row = (holes || []).find((h) => Number(h.hole) === Number(hole));
  return Number(row?.par) || 0;
};

/*
  TO PAR OVER THE HOLES ACTUALLY WRITTEN DOWN, and only those.

  A pair three holes into a nine is -1 thru 3, not -1 with six holes of par
  still owed. Counting unplayed holes as par would rank a side that has not
  teed off level with the field, and would make a leader look worse the
  moment they bogeyed a hole nobody else had reached yet.

  A nine played twice is still holes 1-9 of the course, so the par lookup
  is the course hole number either way. No par row means the holes table
  has not been filled in: the strokes still add up and the to-par cannot,
  and counting that hole as par 0 is the honest version of that.
*/
export function toPar(strokes, holes, round) {
  const last = roundHoles(round);
  let total = 0, par = 0, thru = 0;
  for (let h = 1; h <= last; h++) {
    const st = Number(strokes?.get(h));
    if (!Number.isFinite(st) || st <= 0) continue;
    total += st;
    par += parOf(holes, h);
    thru++;
  }
  return { diff: total - par, total, thru, of: last };
}

function accumulate(row, x) {
  row.diff += x.diff;
  row.total += x.total;
  row.thru += x.thru;
  row.of += x.of;
  return row;
}

/*
  ONE SORT FOR BOTH UNITS. Best to-par first; a tie goes to whoever has
  played MORE holes, because -1 thru 9 is a better round than -1 thru 3.
  Anybody yet to hit a shot sits at the bottom rather than at level par -
  a board nobody has started is not a twelve-way tie for the lead.
*/
export function rank(rows) {
  return rows.sort((a, b) => {
    if (!a.thru && !b.thru) return a.order - b.order;
    if (!a.thru) return 1;
    if (!b.thru) return -1;
    return a.diff - b.diff || b.thru - a.thru || a.order - b.order;
  });
}

export const label = (row) => (!row.thru ? "—" : row.diff === 0 ? "E" : row.diff > 0 ? `+${row.diff}` : `${row.diff}`);
export const tone = (row) => (!row.thru ? "none" : row.diff < 0 ? "under" : row.diff > 0 ? "over" : "even");
export const progress = (row) => (!row.thru ? "Not started" : row.thru >= row.of ? "Finished" : `Thru ${row.thru}`);
export const strokeLine = (row) => (!row.thru ? "" : `${row.total} stroke${row.total === 1 ? "" : "s"}`);

/** The rounds a selection covers. "all", or an unknown id, means every one. */
export function selectedRounds(rounds, choice) {
  if (!choice || choice === "all") return rounds;
  const one = rounds.find((r) => String(r.id) === String(choice));
  return one ? [one] : rounds;
}

const ballsIn = (balls, rounds) => {
  const ids = new Set(rounds.map((r) => String(r.id)));
  return balls.filter((b) => b.round && ids.has(String(b.round.id)));
};

/** Every ball a team has out in these rounds, added into one row per team. */
export function teamBoard({ teams, balls, holes }, rounds) {
  const byTeam = new Map((teams || []).map((t, i) => [String(t.id), {
    diff: 0, total: 0, thru: 0, of: 0, balls: 0,
    key: String(t.id),
    name: t.name || "Team",
    color: teamInk(t.color, t.sort_order ?? i),
    order: t.sort_order ?? i,
  }]));
  for (const ball of ballsIn(balls || [], rounds)) {
    const row = byTeam.get(String(ball.teamId));
    if (!row) continue;
    accumulate(row, toPar(ball.strokes, holes, ball.round));
    row.balls++;
  }
  return rank([...byTeam.values()]);
}

/*
  SINGLES, WHICH IS ONLY SINGLES WHERE THE FORMAT IS.

  In a singles nine a side holds one player, so a side IS a person and the
  row is that person. In a 2v2 nine a side holds two sharing one ball, so
  the row is that pair and it says so. The unit follows the data, not the
  label on the toggle - a shared ball reported as an individual score is
  invented data, and it would be invented for four of the six players in
  every 2v2 round.

  Across a mixed selection there is no honest total either: a score you
  made and a score you shared are different quantities. So when the
  selection contains ANY singles round, only those count, and the caller
  is handed the rounds that were dropped so it can say which. A day with
  no singles round at all shows its pairs rather than an empty board.

  @returns {{rows:Array, scope:Array, dropped:Array}}
*/
export function singlesBoard({ balls, holes }, rounds) {
  const singles = rounds.filter(isSingles);
  const scope = singles.length ? singles : rounds;
  const dropped = rounds.filter((r) => !scope.includes(r));
  const rows = new Map();

  for (const ball of ballsIn(balls || [], scope)) {
    const shared = ball.players.length > 1;
    /* Keyed by WHO is on the ball, so one player's singles nines add into
       a single row while a pair stays its own line - and so the same pair
       playing two rounds together does not become two rows. */
    const key = ball.players.map((p) => String(p.participantId)).sort().join("+") || `side:${ball.id}`;
    if (!rows.has(key)) {
      rows.set(key, {
        diff: 0, total: 0, thru: 0, of: 0, key, shared,
        name: shared ? pairName(ball.players.map((p) => p.name)) : (ball.players[0]?.name || "Open seat"),
        teamName: ball.teamName,
        color: ball.color,
        /* Ties fall back to team then match order, so an untouched board
           reads down the card in the order the matches were built. */
        order: (ball.teamOrder ?? 0) * 1000 + (ball.matchNumber ?? 0),
        matchId: ball.matchId,
        matches: new Set(),
      });
    }
    const row = rows.get(key);
    accumulate(row, toPar(ball.strokes, holes, ball.round));
    row.matches.add(String(ball.matchId));
    row.shared = row.shared || shared;
  }

  return { rows: rank([...rows.values()]), scope, dropped };
}
