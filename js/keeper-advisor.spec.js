import { describe, expect, it } from "vitest";
import {
  CLASS, LABELS, NO_MARKET,
  advise, badgesFor, candidates, marketFrom, rankCandidates, reasonFor,
} from "./keeper-advisor.js";
import { DEFAULT_RULES, validateConfig } from "./keeper-rules.js";

/* The Sleeper player map's real shape: {id: {n, p, t}}. */
const players = {
  "100": { n: "Bijan Robinson", p: "RB", t: "ATL" },
  "200": { n: "Puka Nacua",     p: "WR", t: "LAR" },
  "300": { n: "Drake Maye",     p: "QB", t: "NE"  },
  "400": { n: "Retired Guy",    p: "RB", t: "FA"  },
  // "999" is deliberately absent: an id the map does not know.
};

/*
  sleeper_draft_picks rows. Player 100 was drafted twice - round 8 in 2022 and
  round 1 in 2025 - which is the case that separates "what it cost originally"
  from "the last time somebody drafted him".
*/
const picks = [
  { season: 2022, player_id: "100", round: 8,  pick_no: 90,  sleeper_user_id: "meU" },
  { season: 2025, player_id: "100", round: 1,  pick_no: 4,   sleeper_user_id: "meU" },
  { season: 2025, player_id: "200", round: 12, pick_no: 140, sleeper_user_id: "otherU" },
  { season: 2025, player_id: "400", round: 9,  pick_no: 105, sleeper_user_id: "meU" },
];

const roster = { season: 2025, players: ["100", "200", "300", "400", "999"] };
const member = { id: 1, display_name: "Grant", sleeper_user_id: "meU" };
const rules = validateConfig(DEFAULT_RULES).config;

const base = {
  member, sleeperUserId: "meU", roster, players, draftPicks: picks,
  rules, targetSeason: 2026, keeperRows: [], maxKeepers: 1,
};

describe("the advisor now prices keepers from configured rules", () => {
  it("costs a keeper off the ORIGINAL draft round, not the most recent one", () => {
    /*
      Player 100 went round 8 in 2022 and round 1 in 2025. The keeper right was
      established in 2022, so under the league's rules (one round earlier) the
      cost is R7 - not R1. v1.105.0 read the newest pick and would have made
      him get cheaper every time somebody re-drafted him.
    */
    const out = advise(base);
    const bijan = out.candidates.find((c) => c.playerId === "100");
    expect(bijan.originalRound).toBe(8);
    expect(bijan.originalSeason).toBe(2022);
    expect(bijan.draftRound).toBe(1);            // still shown, for recognition
    expect(bijan.draftSeason).toBe(2025);
    expect(bijan.keeperCost).toBe(7);
    expect(bijan.standing).toBe("eligible");
    expect(reasonFor(bijan)).toMatch(/^Original R8 · Keeper R7 · Year 1 of 3/);
  });

  it("prices the floor case at Round 1", () => {
    const out = advise(base);
    const puka = out.candidates.find((c) => c.playerId === "200");
    expect(puka.originalRound).toBe(12);
    expect(puka.keeperCost).toBe(11);
    /* And a first-rounder cannot go below the floor. */
    const firstRounder = candidates({
      playerIds: ["100"], players, rules, targetSeason: 2026,
      draftPicks: [{ season: 2024, player_id: "100", round: 1 }],
    })[0];
    expect(firstRounder.keeperCost).toBe(1);
  });

  it("counts tenure from canonical keeper rows and labels the final year", () => {
    const kept = (years) => years.map((y) => ({ year: y, member_id: 1, player_id: "100" }));
    const at = (years) => advise({ ...base, keeperRows: kept(years) })
      .candidates.find((c) => c.playerId === "100");

    expect(at([])).toMatchObject({ keeperYear: 1, maxKeeperYears: 3, finalKeeperYear: false });
    expect(at([2025])).toMatchObject({ keeperYear: 2, finalKeeperYear: false });
    expect(at([2024, 2025])).toMatchObject({ keeperYear: 3, finalKeeperYear: true });
    expect(reasonFor(at([2024, 2025]))).toMatch(/FINAL YEAR/);

    const spent = at([2023, 2024, 2025]);
    expect(spent.standing).toBe("unavailable");
    expect(badgesFor(spent, [spent])).toContain(LABELS.LIMIT_REACHED);
  });

  it("asks for review rather than guessing when the original round is unknown", () => {
    const out = advise(base);
    /* 300 was never drafted by this league; 999 is not in the player map. */
    const maye = out.candidates.find((c) => c.playerId === "300");
    expect(maye.originalRound).toBeNull();
    expect(maye.keeperCost).toBeNull();
    expect(maye.standing).toBe("review");
    expect(maye.reviewNeeded).toBe(true);
    expect(reasonFor(maye)).toMatch(/Original draft round unknown/);
    expect(badgesFor(maye, out.candidates)).toContain(LABELS.NEEDS_REVIEW);

    const ghost = out.candidates.find((c) => c.playerId === "999");
    expect(ghost.class).toBe(CLASS.UNKNOWN);
    expect(reasonFor(ghost)).toBe(LABELS.UNKNOWN_ID);
  });

  it("reports no-rules honestly instead of inventing a cost", () => {
    const out = advise({ ...base, rules: null });
    expect(out.rules).toBeNull();
    expect(out.counts.costKnown).toBe(0);
    expect(out.candidates.every((c) => c.keeperCost === null)).toBe(true);
  });

  it("never hard-codes the tenure maximum into a label", () => {
    const twoYear = validateConfig({ ...DEFAULT_RULES, max_keeper_seasons: 2, round_adjustment: 2 }).config;
    const out = advise({ ...base, rules: twoYear, keeperRows: [{ year: 2025, member_id: 1, player_id: "100" }] });
    const bijan = out.candidates.find((c) => c.playerId === "100");
    expect(bijan.maxKeeperYears).toBe(2);
    expect(bijan.finalKeeperYear).toBe(true);
    expect(bijan.keeperCost).toBe(6);            // R8 - 2
    expect(reasonFor(bijan)).toMatch(/Original R8 · Keeper R6 · FINAL YEAR/);
  });
});

describe("classification and roster facts", () => {
  const list = candidates({ playerIds: roster.players, players, draftPicks: picks,
                            sleeperUserId: "meU", rules, targetSeason: 2026 });
  const byId = (id) => list.find((c) => c.playerId === id);

  it("flags a player who is not on an NFL roster", () => {
    expect(byId("400").freeAgent).toBe(true);
    expect(byId("100").freeAgent).toBe(false);
    expect(badgesFor(byId("400"), list)).toContain(LABELS.NOT_ON_NFL);
  });

  it("tells your own pick from one acquired since, by user id and never by name", () => {
    expect(byId("100").draftedByMe).toBe(true);
    expect(byId("200").draftedByMe).toBe(false);
    expect(byId("300").draftedByMe).toBeNull();
    expect(badgesFor(byId("200"), list)).toContain(LABELS.ACQUIRED);
    expect(badgesFor(byId("100"), list)).toContain(LABELS.RETURNING);
  });

  it("never emits null or undefined into a displayed field", () => {
    for (const c of list) {
      expect(typeof c.playerId).toBe("string");
      expect(typeof c.position).toBe("string");
      expect(typeof c.nflTeam).toBe("string");
      expect(reasonFor(c)).toBeTruthy();
      expect(reasonFor(c)).not.toMatch(/undefined|null|NaN/);
      for (const b of badgesFor(c, list)) expect(b).toBeTruthy();
    }
  });
});

describe("ordering is a stated preference, not a score", () => {
  it("puts eligible keepers first and sinks the ineligible", () => {
    const out = advise({ ...base,
      keeperRows: [{ year: 2023, member_id: 1, player_id: "200" },
                   { year: 2024, member_id: 1, player_id: "200" },
                   { year: 2025, member_id: 1, player_id: "200" }] });
    const spentIndex = out.candidates.findIndex((c) => c.playerId === "200");
    const eligibleIndex = out.candidates.findIndex((c) => c.standing === "eligible");
    const unknownIndex = out.candidates.findIndex((c) => c.class === CLASS.UNKNOWN);
    expect(out.candidates[spentIndex].standing).toBe("unavailable");
    /* Eligible leads. A player proven ineligible sinks below even an
       unrecognised id, because "keeper limit reached" is a settled answer
       while an unknown id might still be resolvable. Neither is hidden. */
    expect(eligibleIndex).toBeLessThan(unknownIndex);
    expect(unknownIndex).toBeLessThan(spentIndex);
    expect(out.candidates.at(-1).standing).toBe("unavailable");
  });

  it("leads with the CHEAPEST keeper, which is the latest round", () => {
    /*
      Handing over a 14th-round pick costs almost nothing; a first-rounder
      costs the most valuable thing you own. An earlier version sorted round
      numbers ascending and put "Round 1" atop a list headed "lowest cost".
    */
    const out = advise(base);
    const priced = out.candidates.filter((c) => c.keeperCost != null);
    for (let i = 1; i < priced.length; i++) {
      if (priced[i - 1].freeAgent === priced[i].freeAgent) {
        expect(priced[i - 1].keeperCost).toBeGreaterThanOrEqual(priced[i].keeperCost);
      }
    }
    const cheapest = priced.find((c) => badgesFor(c, out.candidates).includes(LABELS.CHEAPEST_COST));
    expect(cheapest.playerId).toBe("200");       // original R12 -> keeper R11
    expect(cheapest.keeperCost).toBe(11);
  });

  it("claims no market value it does not have", () => {
    const out = advise(base);
    for (const c of out.candidates) {
      const badges = badgesFor(c, out.candidates).join(" ");
      expect(badges).not.toMatch(/best value|best player|safest|upside/i);
      expect(c.marketRank).toBeNull();
      expect(c.marketProjectedRound).toBeNull();
    }
    expect(out.market.available).toBe(false);
  });

  it("is stable: the same input gives the same order", () => {
    expect(advise(base).candidates.map((c) => c.playerId))
      .toEqual(advise(base).candidates.map((c) => c.playerId));
  });
});

describe("every state the page has to draw", () => {
  it("names the state instead of returning an empty list", () => {
    expect(advise({}).state).toBe("no-member");
    expect(advise({ member }).state).toBe("no-sleeper-id");
    expect(advise({ member, sleeperUserId: "meU" }).state).toBe("no-roster");
    expect(advise({ member, sleeperUserId: "meU", roster: { players: [] } }).state).toBe("no-players");
    expect(advise(base).state).toBe("ready");
  });

  it("only ever lists players from that member's own roster", () => {
    const ids = new Set(advise(base).candidates.map((c) => c.playerId));
    expect(ids).toEqual(new Set(roster.players));
    expect(ids.has("500")).toBe(false);
  });

  it("counts what it knows, so the card can explain the gaps", () => {
    const out = advise(base);
    expect(out.counts.total).toBe(5);
    expect(out.counts.costKnown).toBe(3);        // 100, 200, 400
    expect(out.counts.needsReview).toBe(1);      // 300, never drafted here
    expect(out.counts.unknownPlayer).toBe(1);    // 999
  });
});

describe("the market seam is unchanged and still empty", () => {
  it("reports no market today, and claims nothing from it", () => {
    expect(NO_MARKET.available).toBe(false);
    expect(NO_MARKET.get("100")).toBeNull();
  });

  it("consumes a value model without the UI knowing the provider", () => {
    const market = marketFrom([
      { playerId: "200", rank: 14, projectedRound: 2, source: "example", updatedAt: "2026-08-01" },
    ]);
    expect(market.available).toBe(true);
    const out = advise({ ...base, market });
    expect(out.market.source).toBe("example");
    const puka = out.candidates.find((c) => c.playerId === "200");
    expect(puka.marketRank).toBe(14);
    expect(puka.marketProjectedRound).toBe(2);
    expect(out.candidates.find((c) => c.playerId === "300").marketRank).toBeNull();
  });
});

describe("rankCandidates is exported and stable", () => {
  it("sorts a hand-built list without throwing", () => {
    const list = candidates({ playerIds: roster.players, players, draftPicks: picks,
                              sleeperUserId: "meU", rules, targetSeason: 2026 });
    expect(rankCandidates(list)).toHaveLength(list.length);
    expect(rankCandidates([])).toEqual([]);
  });
});
