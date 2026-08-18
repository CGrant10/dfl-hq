import { describe, expect, it } from "vitest";
import {
  CLASS, LABELS, NO_MARKET,
  advise, badgesFor, candidates, costRuleFrom, marketFrom, rankCandidates, reasonFor,
} from "./keeper-advisor.js";

/* The Sleeper player map's real shape: {id: {n, p, t}}. */
const players = {
  "100": { n: "Bijan Robinson", p: "RB", t: "ATL" },
  "200": { n: "Puka Nacua",     p: "WR", t: "LAR" },
  "300": { n: "Drake Maye",     p: "QB", t: "NE"  },
  "400": { n: "Retired Guy",    p: "RB", t: "FA"  },
  // "999" is deliberately absent: an id the map does not know.
};

/* sleeper_draft_picks rows, as stored. */
const picks = [
  { season: 2024, player_id: "100", round: 3,  pick_no: 30, sleeper_user_id: "meU" },
  { season: 2025, player_id: "100", round: 1,  pick_no: 4,  sleeper_user_id: "meU" },
  { season: 2025, player_id: "200", round: 12, pick_no: 140, sleeper_user_id: "otherU" },
  { season: 2025, player_id: "400", round: 9,  pick_no: 105, sleeper_user_id: "meU" },
];

const roster = { season: 2026, players: ["100", "200", "300", "400", "999"] };
const member = { id: 1, display_name: "Grant", sleeper_user_id: "meU" };

const base = {
  member, sleeperUserId: "meU", roster, players, draftPicks: picks,
  keeperRules: [], maxKeepers: 1,
};

describe("keeper advisor: what it knows", () => {
  it("prices nothing when the league has not written a keeper rule down", () => {
    /*
      THE FINDING THIS SPEC EXISTS FOR. The live rules table has no keeper
      rules, Sleeper's is_keeper is null on every DFL pick, and the keepers
      table names people by first name. So there is no cost, and the advisor
      must not invent one.
    */
    expect(costRuleFrom([])).toBeNull();
    const out = advise(base);
    expect(out.state).toBe("ready");
    expect(out.costRule).toBeNull();
    expect(out.candidates.every((c) => c.keeperCost === null)).toBe(true);
    expect(out.counts.costKnown).toBe(0);
  });

  it("prices keepers only once a recognised rule is recorded, and cites it", () => {
    const rules = [{ title: "Cost", content: "A kept player costs the round they were drafted in, minus one round." }];
    const rule = costRuleFrom(rules);
    expect(rule?.id).toBe("round-minus-one");
    expect(rule.cost(12)).toBe(11);
    expect(rule.cost(1)).toBe(1);                 // never cheaper than round 1
    expect(rule.citation).toMatch(/minus one round/);

    const out = advise({ ...base, keeperRules: rules });
    const puka = out.candidates.find((c) => c.playerId === "200");
    expect(puka.class).toBe(CLASS.KNOWN);
    expect(puka.draftRound).toBe(12);
    expect(puka.keeperCost).toBe(11);
    expect(reasonFor(puka, { costRule: rule })).toMatch(/^Round 11 cost · drafted round minus one/);
  });

  it("recognises a same-round rule without matching the minus-one wording", () => {
    const same = costRuleFrom([{ content: "A keeper costs the round they were drafted." }]);
    expect(same?.id).toBe("same-round");
    expect(same.cost(7)).toBe(7);
    const minus = costRuleFrom([{ content: "A kept player costs the round they were drafted in, minus one round." }]);
    expect(minus?.id).toBe("round-minus-one");
  });

  it("ignores keeper prose that states no cost at all", () => {
    expect(costRuleFrom([{ title: "How many", content: "Each team may keep up to 2 players." }])).toBeNull();
    expect(costRuleFrom([{ content: "Keepers are due before the draft." }])).toBeNull();
  });
});

describe("keeper advisor: classification", () => {
  const list = candidates({ playerIds: roster.players, players, draftPicks: picks, sleeperUserId: "meU" });
  const byId = (id) => list.find((c) => c.playerId === id);

  it("uses the NEWEST draft round when a player was drafted more than once", () => {
    // 100 went round 3 in 2024 and round 1 in 2025. The 2025 pick applies.
    expect(byId("100").draftRound).toBe(1);
    expect(byId("100").draftSeason).toBe(2025);
  });

  it("separates never-drafted from unknown-player", () => {
    expect(byId("300").class).toBe(CLASS.NO_ROUND);   // on the roster, no pick on record
    expect(byId("300").draftRound).toBeNull();
    expect(byId("999").class).toBe(CLASS.UNKNOWN);    // not in the Sleeper map
    expect(byId("999").name).toBeNull();
    expect(reasonFor(byId("999"))).toBe(LABELS.UNKNOWN_ID);
  });

  it("flags a player who is not on an NFL roster", () => {
    expect(byId("400").freeAgent).toBe(true);
    expect(byId("100").freeAgent).toBe(false);
    expect(badgesFor(byId("400"), list)).toContain(LABELS.NOT_ON_NFL);
  });

  it("tells your own pick from one you acquired, by user id and never by name", () => {
    expect(byId("100").draftedByMe).toBe(true);
    expect(byId("200").draftedByMe).toBe(false);     // picked_by otherU
    expect(byId("300").draftedByMe).toBeNull();      // no pick to judge
    expect(reasonFor(byId("200"))).toMatch(/acquired since/);
    expect(reasonFor(byId("100"))).toMatch(/your own pick/);
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

describe("keeper advisor: ordering is a stated preference, not a score", () => {
  it("puts priced candidates first, and the CHEAPEST keeper leads", () => {
    /*
      Cheapest means the LATEST round. Handing over a 14th-round pick to keep
      somebody costs almost nothing; handing over your first-rounder costs the
      most valuable thing you own. Sorting round numbers ascending - which the
      first cut of this did - puts the dearest keeper at the top of a list
      labelled "Lowest keeper cost".
    */
    const rules = [{ content: "A kept player costs the round they were drafted in, minus one round." }];
    const out = advise({ ...base, keeperRules: rules });
    const priced = out.candidates.filter((c) => c.keeperCost != null);
    expect(priced.length).toBeGreaterThan(1);
    for (let i = 1; i < priced.length; i++) {
      // the free agent is allowed to sink below a cheaper real player
      if (priced[i - 1].freeAgent === priced[i].freeAgent) {
        expect(priced[i - 1].keeperCost).toBeGreaterThanOrEqual(priced[i].keeperCost);
      }
    }
    // Puka went round 12, so keeping him costs round 11: the cheapest here.
    const cheapest = priced.find((c) => badgesFor(c, out.candidates).includes(LABELS.CHEAPEST_COST));
    expect(cheapest.playerId).toBe("200");
    expect(cheapest.keeperCost).toBe(11);
    // and the round-1 pick is NOT called the lowest cost
    const bijan = out.candidates.find((c) => c.playerId === "100");
    expect(bijan.keeperCost).toBe(1);
    expect(badgesFor(bijan, out.candidates)).not.toContain(LABELS.CHEAPEST_COST);
    expect(out.candidates.at(-1).class).toBe(CLASS.UNKNOWN);
  });

  it("with no cost rule, orders by latest draft round and says why", () => {
    const out = advise(base);
    const rounds = out.candidates.filter((c) => c.draftRound != null && !c.freeAgent);
    expect(rounds[0].draftRound).toBeGreaterThanOrEqual(rounds.at(-1).draftRound);
    // and it is explicitly NOT calling that best value
    for (const c of out.candidates) {
      const badges = badgesFor(c, out.candidates).join(" ");
      expect(badges).not.toMatch(/best value|best player|safest|upside/i);
    }
  });

  it("awards a superlative only when the list actually supports it", () => {
    const solo = candidates({ playerIds: ["200"], players, draftPicks: picks, sleeperUserId: "meU" });
    // one candidate cannot be the latest OR the earliest round of anything
    expect(badgesFor(solo[0], solo)).not.toContain(LABELS.LATEST_ROUND);
    expect(badgesFor(solo[0], solo)).not.toContain(LABELS.EARLIEST_ROUND);

    const list = rankCandidates(candidates({
      playerIds: roster.players, players, draftPicks: picks, sleeperUserId: "meU" }));
    const latest = list.find((c) => badgesFor(c, list).includes(LABELS.LATEST_ROUND));
    expect(latest.draftRound).toBe(12);
  });

  it("is stable: the same input gives the same order", () => {
    const a = advise(base).candidates.map((c) => c.playerId);
    const b = advise(base).candidates.map((c) => c.playerId);
    expect(a).toEqual(b);
  });
});

describe("keeper advisor: every state the page has to draw", () => {
  it("names the state instead of returning an empty list", () => {
    expect(advise({}).state).toBe("no-member");
    expect(advise({ member }).state).toBe("no-sleeper-id");
    expect(advise({ member, sleeperUserId: "meU" }).state).toBe("no-roster");
    expect(advise({ member, sleeperUserId: "meU", roster: { players: [] } }).state).toBe("no-players");
    expect(advise(base).state).toBe("ready");
  });

  it("only ever lists players from that member's own roster", () => {
    const out = advise(base);
    const ids = new Set(out.candidates.map((c) => c.playerId));
    expect(ids).toEqual(new Set(roster.players));
    expect(ids.has("500")).toBe(false);
  });

  it("carries Sleeper's keeper allowance rather than assuming one", () => {
    expect(advise(base).maxKeepers).toBe(1);
    expect(advise({ ...base, maxKeepers: null }).maxKeepers).toBeNull();
    expect(advise(base).shortlist).toBeGreaterThanOrEqual(3);
    expect(advise(base).shortlist).toBeLessThanOrEqual(roster.players.length);
  });
});

describe("keeper advisor: the market seam", () => {
  it("reports no market today, and claims nothing from it", () => {
    expect(NO_MARKET.available).toBe(false);
    expect(NO_MARKET.get("100")).toBeNull();
    const out = advise(base);
    expect(out.market.available).toBe(false);
    expect(out.candidates.every((c) => c.marketRank === null)).toBe(true);
    expect(out.candidates.every((c) => c.marketProjectedRound === null)).toBe(true);
  });

  it("consumes a value model without the UI knowing the provider", () => {
    const market = marketFrom([
      { playerId: "200", rank: 14, projectedRound: 2, source: "example", updatedAt: "2026-08-01" },
    ]);
    expect(market.available).toBe(true);
    const out = advise({ ...base, market });
    expect(out.market.source).toBe("example");
    expect(out.market.updatedAt).toBe("2026-08-01");
    const puka = out.candidates.find((c) => c.playerId === "200");
    expect(puka.marketRank).toBe(14);
    expect(puka.marketProjectedRound).toBe(2);
    // a player the source does not cover stays null rather than guessing
    expect(out.candidates.find((c) => c.playerId === "300").marketRank).toBeNull();
  });
});
