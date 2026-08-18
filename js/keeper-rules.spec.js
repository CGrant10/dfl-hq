import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES, PROGRESSION,
  configFor, describeRules, evaluate, keeperCost, legacyKeeperNames,
  originalQualifyingRound, priorKeeperSeasons, ruleExample, validateConfig,
} from "./keeper-rules.js";

const ok = (raw) => {
  const v = validateConfig(raw);
  expect(v.ok, v.errors.join("; ")).toBe(true);
  return v.config;
};
const DEFAULT = ok(DEFAULT_RULES);
/* The alternative set from the brief: 2-year max, 2 rounds earlier. */
const CHANGED = ok({ ...DEFAULT_RULES, effective_season: 2027,
                     max_keeper_seasons: 2, round_adjustment: 2 });

describe("keeper cost under the commissioner's stated rules", () => {
  it("is one round earlier than the original draft round, with a floor of R1", () => {
    expect(keeperCost(8, DEFAULT)).toBe(7);
    expect(keeperCost(5, DEFAULT)).toBe(4);
    expect(keeperCost(2, DEFAULT)).toBe(1);
    expect(keeperCost(1, DEFAULT)).toBe(1);      // the floor holds
  });

  it("does NOT compound across keeper years", () => {
    /* The rule the commissioner stated: originally R8 costs R7 in year one,
       R7 in year two and R7 in year three. */
    expect(keeperCost(8, DEFAULT, 1)).toBe(7);
    expect(keeperCost(8, DEFAULT, 2)).toBe(7);
    expect(keeperCost(8, DEFAULT, 3)).toBe(7);
  });

  it("can escalate instead, when a league configures that", () => {
    const climbing = ok({ ...DEFAULT_RULES, progression: PROGRESSION.ESCALATES_PER_YEAR });
    expect(keeperCost(8, climbing, 1)).toBe(7);
    expect(keeperCost(8, climbing, 2)).toBe(6);
    expect(keeperCost(8, climbing, 3)).toBe(5);
    expect(keeperCost(2, climbing, 5)).toBe(1);  // still floored
  });

  it("returns null rather than a number when the original round is unknown", () => {
    expect(keeperCost(null, DEFAULT)).toBeNull();
    expect(keeperCost(undefined, DEFAULT)).toBeNull();
    expect(keeperCost(0, DEFAULT)).toBeNull();
    expect(keeperCost(8, null)).toBeNull();
  });
});

describe("changed configuration", () => {
  it("applies the new adjustment and floor", () => {
    expect(keeperCost(8, CHANGED)).toBe(6);
    expect(keeperCost(5, CHANGED)).toBe(3);
    expect(keeperCost(2, CHANGED)).toBe(1);      // 2 - 2 = 0, floored to 1
    expect(keeperCost(1, CHANGED)).toBe(1);
  });

  it("applies the new tenure limit", () => {
    const at = (prior, config) => evaluate({ config, targetSeason: config.effective_season,
                                             originalRound: 8, priorKeeperSeasons: prior });
    expect(at(0, CHANGED).reason).toBe("Year 1 of 2");
    expect(at(1, CHANGED).finalKeeperYear).toBe(true);
    expect(at(2, CHANGED).state).toBe("unavailable");
    /* And the default set is unaffected by the other existing. */
    expect(at(1, DEFAULT).reason).toBe("Year 2 of 3");
    expect(at(2, DEFAULT).finalKeeperYear).toBe(true);
  });

  it("never hard-codes the maximum into the labels", () => {
    expect(evaluate({ config: DEFAULT, targetSeason: 2026, originalRound: 8, priorKeeperSeasons: 0 })
      .maxKeeperYears).toBe(3);
    expect(evaluate({ config: CHANGED, targetSeason: 2027, originalRound: 8, priorKeeperSeasons: 0 })
      .maxKeeperYears).toBe(2);
  });
});

describe("tenure states under the default rules", () => {
  const at = (prior) => evaluate({ config: DEFAULT, targetSeason: 2026,
                                   originalRound: 8, priorKeeperSeasons: prior });

  it("counts 0, 1, 2 prior seasons and then refuses", () => {
    expect(at(0)).toMatchObject({ state: "eligible", keeperYear: 1, finalKeeperYear: false, calculatedRound: 7 });
    expect(at(1)).toMatchObject({ state: "eligible", keeperYear: 2, finalKeeperYear: false, calculatedRound: 7 });
    expect(at(2)).toMatchObject({ state: "eligible", keeperYear: 3, finalKeeperYear: true,  calculatedRound: 7 });
    expect(at(3)).toMatchObject({ state: "unavailable", eligible: false });
    expect(at(4).state).toBe("unavailable");
  });

  it("says why it is unavailable rather than just refusing", () => {
    expect(at(3).reason).toMatch(/Keeper limit reached/);
    expect(at(3).reviewNeeded).toBe(false);      // not a data problem
  });

  it("asks for review when the original round is unknown, without blocking", () => {
    const out = evaluate({ config: DEFAULT, targetSeason: 2026, originalRound: null, priorKeeperSeasons: 0 });
    expect(out.state).toBe("review");
    expect(out.reviewNeeded).toBe(true);
    expect(out.calculatedRound).toBeNull();
    /* Tenure is still known even when the round is not - that is useful. */
    expect(out.keeperYear).toBe(1);
    expect(out.maxKeeperYears).toBe(3);
    expect(out.reason).toMatch(/Original qualifying draft round unknown/);
  });

  it("checks the tenure limit even when the round is unknown", () => {
    const out = evaluate({ config: DEFAULT, targetSeason: 2026, originalRound: null, priorKeeperSeasons: 3 });
    expect(out.state).toBe("unavailable");
  });

  it("reports no-rules rather than inventing a calculation", () => {
    const out = evaluate({ config: null, targetSeason: 2026, originalRound: 8 });
    expect(out.state).toBe("no-rules");
    expect(out.calculatedRound).toBeNull();
    expect(out.reason).toMatch(/No keeper rules are configured/);
  });
});

describe("season awareness: a rule change never rewrites the past", () => {
  const sets = [DEFAULT_RULES, { ...DEFAULT_RULES, effective_season: 2027,
                                 max_keeper_seasons: 2, round_adjustment: 2 }];

  it("picks the newest rule set effective at or before the target season", () => {
    expect(configFor(sets, 2026).effective_season).toBe(2026);
    expect(configFor(sets, 2026).round_adjustment).toBe(1);
    expect(configFor(sets, 2027).effective_season).toBe(2027);
    expect(configFor(sets, 2027).round_adjustment).toBe(2);
    expect(configFor(sets, 2030).effective_season).toBe(2027);   // newest still applies
  });

  it("returns null for a season earlier than any configuration", () => {
    expect(configFor(sets, 2025)).toBeNull();
    expect(configFor([], 2026)).toBeNull();
    expect(configFor(sets, "nonsense")).toBeNull();
  });

  it("gives 2026 and 2027 different answers for the same player", () => {
    const p = { originalRound: 8, priorKeeperSeasons: 1 };
    const a = evaluate({ config: configFor(sets, 2026), targetSeason: 2026, ...p });
    const b = evaluate({ config: configFor(sets, 2027), targetSeason: 2027, ...p });
    expect(a.calculatedRound).toBe(7);
    expect(a.finalKeeperYear).toBe(false);       // year 2 of 3
    expect(b.calculatedRound).toBe(6);
    expect(b.finalKeeperYear).toBe(true);        // year 2 of 2
  });

  it("ignores a malformed rule set instead of letting it win", () => {
    const withJunk = [...sets, { effective_season: 2028, max_keeper_seasons: 0, round_adjustment: -1, min_keeper_round: 0 }];
    expect(configFor(withJunk, 2029).effective_season).toBe(2027);
  });
});

describe("configuration validation", () => {
  it("accepts the seeded defaults", () => {
    expect(validateConfig(DEFAULT_RULES).ok).toBe(true);
  });

  it("rejects every invalid shape the brief names", () => {
    const bad = (patch) => validateConfig({ ...DEFAULT_RULES, ...patch });
    expect(bad({ max_keeper_seasons: 0 }).ok).toBe(false);
    expect(bad({ max_keeper_seasons: -3 }).ok).toBe(false);
    expect(bad({ round_adjustment: -1 }).ok).toBe(false);
    expect(bad({ min_keeper_round: 0 }).ok).toBe(false);
    expect(bad({ min_keeper_round: -2 }).ok).toBe(false);
    expect(bad({ progression: "make_it_up" }).ok).toBe(false);
    expect(bad({ max_keeper_seasons: "three" }).ok).toBe(false);
    expect(bad({ round_adjustment: "" }).ok).toBe(false);
    expect(bad({ round_adjustment: 1.5 }).ok).toBe(false);
    expect(bad({ cost_basis: "auction_price" }).ok).toBe(false);
  });

  it("never returns a config alongside errors, so NaN cannot leak", () => {
    const v = validateConfig({ ...DEFAULT_RULES, max_keeper_seasons: 0 });
    expect(v.ok).toBe(false);
    expect(v.config).toBeNull();
    expect(v.errors.length).toBeGreaterThan(0);
  });

  it("allows a zero adjustment, which means keep at the original round", () => {
    const same = ok({ ...DEFAULT_RULES, round_adjustment: 0 });
    expect(keeperCost(8, same)).toBe(8);
  });
});

describe("original qualifying draft round", () => {
  const picks = [
    { player_id: "100", season: 2022, round: 8,  pick_no: 90 },
    { player_id: "100", season: 2024, round: 3,  pick_no: 30 },
    { player_id: "100", season: 2025, round: 1,  pick_no: 4  },
    { player_id: "200", season: 2025, round: 12, pick_no: 140 },
  ];

  it("takes the EARLIEST pick, not the most recent one", () => {
    /*
      This is the whole distinction. Player 100 was taken in round 8 in 2022
      and again in round 1 in 2025. The keeper right was established in 2022,
      so the cost basis is round 8 - taking the newest pick would make a
      player cheaper every time somebody re-drafted them.
    */
    const out = originalQualifyingRound(picks, "100");
    expect(out.round).toBe(8);
    expect(out.season).toBe(2022);
    expect(keeperCost(out.round, DEFAULT)).toBe(7);
  });

  it("returns null for a player this league never drafted", () => {
    const out = originalQualifyingRound(picks, "999");
    expect(out.round).toBeNull();
    expect(out.uncertain).toBe(true);
    expect(out.reason).toMatch(/Never drafted in this league/);
    expect(evaluate({ config: DEFAULT, targetSeason: 2026, originalRound: out.round }).state).toBe("review");
  });

  it("flags a first pick that sits on the edge of what was synced", () => {
    /* 2019 has no Sleeper draft board, so a player whose earliest pick is
       2020 may have arrived before that and this round may not be original. */
    const edge = originalQualifyingRound(
      [{ player_id: "7", season: 2020, round: 5 }], "7", { earliestSyncedSeason: 2020 });
    expect(edge.round).toBe(5);
    expect(edge.uncertain).toBe(true);
    expect(edge.reason).toMatch(/may predate/);

    const safe = originalQualifyingRound(
      [{ player_id: "7", season: 2023, round: 5 }], "7", { earliestSyncedSeason: 2020 });
    expect(safe.uncertain).toBe(false);
  });

  it("ignores malformed pick rows", () => {
    expect(originalQualifyingRound([{ player_id: "1", season: "x", round: "y" }], "1").round).toBeNull();
    expect(originalQualifyingRound(null, "1").round).toBeNull();
  });
});

describe("tenure from keeper history, and legacy rows", () => {
  const rows = [
    { year: 2024, member_id: 1, player_id: "100", player: "Bijan Robinson", round_cost: 7 },
    { year: 2025, member_id: 1, player_id: "100", player: "Bijan Robinson", round_cost: 7 },
    { year: 2025, member_id: 2, player_id: "200", player: "Puka Nacua", round_cost: 13 },
    /* Legacy rows: no player_id, nickname in `player`, first name in `team`. */
    { year: 2026, team: "Shawn", player: "Puka", round_cost: 13 },
    { year: 2026, team: "Izzy", player: "NA", round_cost: null },
  ];

  it("counts only canonical rows, and only seasons before the one being decided", () => {
    expect(priorKeeperSeasons(rows, { playerId: "100", memberId: 1, beforeSeason: 2026 })).toBe(2);
    expect(priorKeeperSeasons(rows, { playerId: "100", memberId: 1, beforeSeason: 2025 })).toBe(1);
    expect(priorKeeperSeasons(rows, { playerId: "200", memberId: 2, beforeSeason: 2026 })).toBe(1);
    expect(priorKeeperSeasons(rows, { playerId: "300", memberId: 1, beforeSeason: 2026 })).toBe(0);
  });

  it("does NOT infer tenure from a nickname", () => {
    /*
      "Puka" in a 2026 legacy row must not become a prior keeper season for
      player 200. Inventing tenure from a fuzzy name is how somebody gets
      told they are out of keeper years when they are not.
    */
    const legacyOnly = [{ year: 2024, team: "Shawn", player: "Puka", round_cost: 13 }];
    expect(priorKeeperSeasons(legacyOnly, { playerId: "200", memberId: 2, beforeSeason: 2026 })).toBe(0);
  });

  it("counts a repeated season once", () => {
    const dupes = [
      { year: 2025, member_id: 1, player_id: "100" },
      { year: 2025, member_id: 1, player_id: "100" },
    ];
    expect(priorKeeperSeasons(dupes, { playerId: "100", memberId: 1, beforeSeason: 2026 })).toBe(1);
  });

  it("surfaces legacy rows verbatim for review, without matching them", () => {
    const legacy = legacyKeeperNames(rows, { beforeSeason: 2027 });
    expect(legacy).toHaveLength(2);
    expect(legacy.map((r) => r.player)).toEqual(["Puka", "NA"]);
    /* Exactly as typed - no normalisation, no guess at who they are. */
    expect(legacy[0]).toMatchObject({ year: 2026, team: "Shawn", player: "Puka", round_cost: 13 });
  });
});

describe("rule summaries are derived, never hard-coded", () => {
  it("describes the default set", () => {
    expect(describeRules(DEFAULT)).toBe("3-year maximum · Original draft -1 round · Floor R1");
  });

  it("describes a changed set differently", () => {
    expect(describeRules(CHANGED)).toBe("2-year maximum · Original draft -2 rounds · Floor R1");
  });

  it("handles a zero adjustment and an escalating league", () => {
    expect(describeRules(ok({ ...DEFAULT_RULES, round_adjustment: 0 })))
      .toBe("3-year maximum · Original draft round · Floor R1");
    expect(describeRules(ok({ ...DEFAULT_RULES, progression: PROGRESSION.ESCALATES_PER_YEAR })))
      .toMatch(/cost climbs each keeper year$/);
  });

  it("returns null with nothing configured, so the UI omits the line", () => {
    expect(describeRules(null)).toBeNull();
    expect(ruleExample(null)).toBeNull();
  });

  it("shows a worked example straight from the configuration", () => {
    expect(ruleExample(DEFAULT, 8)).toMatchObject({ originalRound: 8, cost: 7 });
    expect(ruleExample(DEFAULT, 8).text).toBe("Player originally drafted in Round 8 → Keeper cost: Round 7");
    expect(ruleExample(CHANGED, 8).cost).toBe(6);
  });
});
