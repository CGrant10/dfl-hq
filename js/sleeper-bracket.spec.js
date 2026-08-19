import { describe, expect, it } from "vitest";
import { readWinners, readLastPlace } from "./sleeper-bracket.js";

describe("Sleeper bracket placements", () => {
  it("reads the champion from the p:1 game", () => {
    const b = [{ r: 3, m: 9, p: 1, w: 4, l: 7 }, { r: 3, m: 10, p: 3, w: 2, l: 5 }];
    expect(readWinners(b)).toEqual({ championRoster: 4, runnerUpRoster: 7 });
  });

  it("falls back to the deepest round when no placements are configured", () => {
    const b = [{ r: 1, m: 1, w: 4, l: 8 }, { r: 2, m: 5, w: 4, l: 2 }];
    expect(readWinners(b).championRoster).toBe(4);
  });

  it("takes LAST place from the highest placement game's loser", () => {
    /*
      THE POINT OF THIS FILE. p:11 is the game deciding 11th and 12th in a
      twelve-team league, so its loser is dead last - regardless of what any of
      these teams did in the regular season.
    */
    const losers = [
      { r: 1, m: 1, w: 9, l: 12 },
      { r: 2, m: 3, p: 9, w: 9, l: 10 },
      { r: 2, m: 4, p: 11, w: 12, l: 11 },
    ];
    expect(readLastPlace(losers)).toBe(11);
  });

  it("uses the deepest round only when it is unambiguous", () => {
    expect(readLastPlace([{ r: 1, m: 1, w: 3, l: 6 }, { r: 2, m: 2, w: 3, l: 8 }])).toBe(8);
    /* Two games tied for the deepest round: which loser is LAST is not knowable
       without placements, so it declines rather than picking one. */
    expect(readLastPlace([{ r: 2, m: 1, w: 3, l: 6 }, { r: 2, m: 2, w: 4, l: 8 }])).toBe(null);
  });

  it("declines rather than guessing", () => {
    expect(readLastPlace(null)).toBe(null);
    expect(readLastPlace([])).toBe(null);
    expect(readLastPlace(undefined)).toBe(null);
    /* An unfinished game has no loser. A placeholder Chip Eater becomes
       permanent the moment somebody screenshots it. */
    expect(readLastPlace([{ r: 2, m: 1, p: 11, w: null, l: null }])).toBe(null);
    expect(readWinners([])).toEqual({ championRoster: null, runnerUpRoster: null });
  });

  it("is not fooled by a p:1 sitting in an early round", () => {
    // Sleeper puts p on the deciding game whatever round it lands in.
    const b = [{ r: 2, m: 7, p: 1, w: 1, l: 2 }, { r: 3, m: 8, w: 5, l: 6 }];
    expect(readWinners(b).championRoster).toBe(1);
  });
});
