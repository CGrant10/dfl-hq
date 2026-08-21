import { describe, expect, it } from "vitest";
import { toPar, rank, selectedRounds, teamBoard, singlesBoard,
         isSingles, label, tone, progress } from "./golf-board.js";

/* A flat par-4 nine, which makes every expectation below readable: a 4 is
   level, a 3 is one under, a 5 is one over. */
const NINE = Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, par: 4 }));

const R1 = { id: 1, round_number: 1, format: "pairs", holes: 9 };
const R2 = { id: 2, round_number: 2, format: "pairs", holes: 9 };
const R3 = { id: 3, round_number: 3, format: "singles", holes: 9 };
const ROUNDS = [R1, R2, R3];

const card = (...strokes) => new Map(strokes.map((s, i) => [i + 1, s]));

let nextSide = 0;
function ball(round, teamId, players, strokes, extra = {}) {
  nextSide += 1;
  return {
    id: nextSide, matchId: extra.matchId ?? nextSide, matchNumber: extra.matchNumber ?? 1,
    round, teamId, teamName: `Team ${teamId}`, teamOrder: teamId, color: "#fff",
    players: players.map((name, i) => ({ participantId: `${name}`, name })),
    strokes,
  };
}

describe("to par", () => {
  it("counts only the holes actually written down", () => {
    /* Three holes in at one under. The six unplayed holes owe nothing. */
    const x = toPar(card(4, 3, 4), NINE, R1);
    expect(x).toEqual({ diff: -1, total: 11, thru: 3, of: 9 });
  });

  it("does not credit par for a hole with no score", () => {
    const played = toPar(card(4, 4, 4), NINE, R1);
    const blank = toPar(new Map(), NINE, R1);
    expect(played.diff).toBe(0);
    expect(blank).toEqual({ diff: 0, total: 0, thru: 0, of: 9 });
    /* Both read "level", which is exactly why thru has to break the tie
       and why rank() puts an unstarted row last rather than in front. */
    expect(rank([{ ...blank, order: 0 }, { ...played, order: 1 }])[0].thru).toBe(3);
  });

  it("ignores a zero or a nonsense stroke instead of counting the hole", () => {
    expect(toPar(card(4, 0, 4), NINE, R1).thru).toBe(2);
    expect(toPar(new Map([[1, 4], [2, null]]), NINE, R1).thru).toBe(1);
  });

  it("reads an 18-hole round as eighteen", () => {
    expect(toPar(card(4), NINE, { ...R1, holes: 18 }).of).toBe(18);
  });
});

describe("ranking", () => {
  const row = (diff, thru, order) => ({ diff, thru, of: 9, total: 0, order });

  it("puts the best score to par first", () => {
    const out = rank([row(2, 9, 1), row(-3, 9, 2), row(0, 9, 3)]);
    expect(out.map((r) => r.diff)).toEqual([-3, 0, 2]);
  });

  it("breaks a tie with whoever has played more holes", () => {
    /* -1 thru 9 is a better round than -1 thru 3, and the board has to say
       so or a pair one hole in tops it until everybody catches up. */
    const out = rank([row(-1, 3, 1), row(-1, 9, 2)]);
    expect(out[0].thru).toBe(9);
  });

  it("puts anybody yet to tee off last, whatever the field is doing", () => {
    const out = rank([row(0, 0, 1), row(9, 9, 2), row(0, 0, 3)]);
    expect(out[0].diff).toBe(9);
    expect(out.slice(1).every((r) => r.thru === 0)).toBe(true);
  });
});

describe("the round selector", () => {
  it("means every round when nothing is chosen", () => {
    expect(selectedRounds(ROUNDS, "all")).toHaveLength(3);
    expect(selectedRounds(ROUNDS, "")).toHaveLength(3);
  });

  it("narrows to one round by id", () => {
    expect(selectedRounds(ROUNDS, "2")).toEqual([R2]);
    expect(selectedRounds(ROUNDS, 2)).toEqual([R2]);
  });

  it("falls back to every round rather than an empty board", () => {
    /* A round deleted while somebody had it selected. */
    expect(selectedRounds(ROUNDS, "999")).toHaveLength(3);
  });
});

describe("the team board", () => {
  const teams = [{ id: 1, name: "Chaos", sort_order: 0 }, { id: 2, name: "Bogey", sort_order: 1 }];
  const data = () => ({
    teams, holes: NINE,
    balls: [
      ball(R1, 1, ["Ann", "Bo"], card(3, 3, 4)),      // -2 thru 3
      ball(R1, 1, ["Cal", "Dee"], card(4, 4, 4)),     //  0 thru 3
      ball(R1, 2, ["Eve", "Fay"], card(5, 5, 5)),     // +3 thru 3
      ball(R3, 1, ["Ann"], card(6, 6, 6)),            // +6 thru 3
      ball(R3, 2, ["Eve"], card(3, 3, 3)),            // -3 thru 3
    ],
  });

  it("adds up every ball a team has out in the chosen round", () => {
    const [first, second] = teamBoard(data(), [R1]);
    expect(first.name).toBe("Chaos");
    expect(first.diff).toBe(-2);
    expect(first.thru).toBe(6);      // two balls, three holes each
    expect(first.balls).toBe(2);
    expect(second.diff).toBe(3);
  });

  it("adds every round together when all rounds are selected", () => {
    const rows = teamBoard(data(), ROUNDS);
    const chaos = rows.find((r) => r.name === "Chaos");
    const bogey = rows.find((r) => r.name === "Bogey");
    expect(chaos.diff).toBe(4);      // -2 + 0 + 6
    expect(bogey.diff).toBe(0);      // +3 + -3
    /* And the running total can reorder the day: Chaos leads round 1 and
       still trails once round 3 is counted. */
    expect(rows[0].name).toBe("Bogey");
  });

  it("keeps a team that has not played on the board, at the bottom", () => {
    const rows = teamBoard(data(), [R2]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.thru === 0)).toBe(true);
  });
});

describe("the singles board", () => {
  const data = () => ({
    holes: NINE,
    balls: [
      ball(R1, 1, ["Ann", "Bo"], card(3, 4, 4), { matchId: 10, matchNumber: 1 }),
      ball(R1, 2, ["Eve", "Fay"], card(5, 4, 4), { matchId: 10, matchNumber: 1 }),
      ball(R3, 1, ["Ann"], card(3, 3, 4), { matchId: 30, matchNumber: 1 }),
      ball(R3, 2, ["Eve"], card(5, 5, 5), { matchId: 30, matchNumber: 1 }),
    ],
  });

  it("is individuals in a singles round", () => {
    const { rows, scope, dropped } = singlesBoard(data(), [R3]);
    expect(scope).toEqual([R3]);
    expect(dropped).toEqual([]);
    expect(rows.map((r) => r.name)).toEqual(["Ann", "Eve"]);
    expect(rows.every((r) => r.shared)).toBe(false);
    expect(rows[0].diff).toBe(-2);
  });

  it("is PAIRS in a 2v2 round, and says so", () => {
    /* The ball is shared, so there is no individual number to report and
       the row must not pretend otherwise. */
    const { rows } = singlesBoard(data(), [R1]);
    expect(rows.map((r) => r.name)).toEqual(["Ann & Bo", "Eve & Fay"]);
    expect(rows.every((r) => r.shared)).toBe(true);
  });

  it("counts only the singles rounds when the selection mixes formats", () => {
    const { rows, scope, dropped } = singlesBoard(data(), ROUNDS);
    expect(scope).toEqual([R3]);
    expect(dropped).toEqual([R1, R2]);
    /* Ann's -2 is her singles nine alone. Her round 1 pair score is NOT
       folded in, which is the whole point. */
    expect(rows.find((r) => r.name === "Ann").diff).toBe(-2);
    expect(rows.some((r) => r.shared)).toBe(false);
  });

  it("shows the pairs rather than nothing on a day with no singles round", () => {
    const { rows, scope, dropped } = singlesBoard(data(), [R1, R2]);
    expect(scope).toEqual([R1, R2]);
    expect(dropped).toEqual([]);
    expect(rows.every((r) => r.shared)).toBe(true);
  });

  it("keeps one player's several singles rounds on one row", () => {
    const R4 = { id: 4, round_number: 4, format: "singles", holes: 9 };
    const twice = {
      holes: NINE,
      balls: [
        ball(R3, 1, ["Ann"], card(3, 3, 3), { matchId: 30 }),
        ball(R4, 1, ["Ann"], card(5, 5, 5), { matchId: 40 }),
      ],
    };
    const { rows } = singlesBoard(twice, [R3, R4]);
    expect(rows).toHaveLength(1);
    expect(rows[0].diff).toBe(0);     // -3 then +3
    expect(rows[0].thru).toBe(6);
    /* Two matches means no single card to open, and golf-live.js drops the
       link rather than picking one of them. */
    expect(rows[0].matches.size).toBe(2);
  });

  it("gives a row with one match a card to open", () => {
    const { rows } = singlesBoard(data(), [R3]);
    expect(rows.every((r) => r.matches.size === 1)).toBe(true);
    expect(rows[0].matchId).toBe(30);
  });
});

describe("how a row reads", () => {
  it("says E for level and never +0", () => {
    expect(label({ diff: 0, thru: 3 })).toBe("E");
    expect(label({ diff: 2, thru: 3 })).toBe("+2");
    expect(label({ diff: -2, thru: 3 })).toBe("-2");
    expect(label({ diff: 0, thru: 0 })).toBe("—");
  });

  it("tints under, level and over the way the scorecard does", () => {
    expect(tone({ diff: -1, thru: 1 })).toBe("under");
    expect(tone({ diff: 1, thru: 1 })).toBe("over");
    expect(tone({ diff: 0, thru: 1 })).toBe("even");
    expect(tone({ diff: 0, thru: 0 })).toBe("none");
  });

  it("only says Finished once every hole of the round is in", () => {
    expect(progress({ thru: 0, of: 9 })).toBe("Not started");
    expect(progress({ thru: 8, of: 9 })).toBe("Thru 8");
    expect(progress({ thru: 9, of: 9 })).toBe("Finished");
    /* Two balls over two rounds: eighteen holes owed, not nine. */
    expect(progress({ thru: 9, of: 18 })).toBe("Thru 9");
  });

  it("knows which rounds are singles", () => {
    expect(isSingles(R3)).toBe(true);
    expect(isSingles(R1)).toBe(false);
    expect(isSingles(null)).toBe(false);
  });
});
