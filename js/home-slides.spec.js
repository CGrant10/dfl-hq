import { describe, expect, it } from "vitest";
import { currentMatchupWeek, headToHead, matchupPreviewSlide, matchupStory, nextMoveSlide, tradeAlertSlide, weekSlateSlide } from "./home-slides.js";

describe("trade alert as a stage slide", () => {
  const alert = {
    season: 2026, week: 3, fairness: 64, winner: "Da Nickers", balanced: false,
    reason: { title: "Da Nickers takes the better back." },
    lineupDeltas: [{ teamName: "Da Nickers", weekly: 4.2 }],
    href: "#/trade?id=7",
  };

  it("returns nothing when there is no completed trade", () => {
    expect(tradeAlertSlide(null)).toBeNull();
  });

  it("maps the verdict onto the stat treatment", () => {
    const slide = tradeAlertSlide(alert);
    expect(slide.treatment).toBe("stat");
    expect(slide.headline).toBe("Da Nickers WINS");
    expect(slide.figure).toBe("64%");
    expect(slide.kicker).toContain("WEEK 3");
    expect(slide.href).toBe("#/trade?id=7");
  });

  it("carries the weekly lineup swing into the subtitle", () => {
    expect(tradeAlertSlide(alert).subtitle).toContain("+4.2/wk");
  });

  it("says BALANCED rather than naming a winner when the model calls it even", () => {
    expect(tradeAlertSlide({ ...alert, balanced: true }).headline).toBe("BALANCED");
  });

  it("survives a model that could not score the trade", () => {
    const slide = tradeAlertSlide({ ...alert, fairness: null, winner: null, balanced: false, reason: null, lineupDeltas: [] });
    expect(slide.figure).toBeNull();
    expect(slide.headline).toBe("REVIEW NEEDED");
    expect(slide.subtitle).toBeTruthy();
  });

  /* editorialStage() filters the deck by generator, and these two come from
     neither a generator nor the commissioner - without the flag they would be
     built and then dropped before they ever reached the stage. */
  it("is pinned so the editorial filter keeps it", () => {
    expect(tradeAlertSlide(alert).pinned).toBe(true);
  });
});

describe("next move as a stage slide", () => {
  const move = {
    week: 5, need: { position: "WR", urgent: true },
    mine: { sleeper_user_id: "u1" },
    trade: { team: { name: "Dream Enders" }, player: { name: "A. Receiver" } },
    waiver: null,
  };

  it("returns nothing without a move worth showing", () => {
    expect(nextMoveSlide(null)).toBeNull();
    expect(nextMoveSlide({ ...move, trade: null, waiver: null })).toBeNull();
  });

  it("names the trade target and routes to that owner's analyzer", () => {
    const slide = nextMoveSlide(move);
    expect(slide.treatment).toBe("announcement");
    expect(slide.body).toContain("Dream Enders");
    expect(slide.body).toContain("A. Receiver");
    expect(slide.subtitle).toBe("WR need");
    expect(slide.href).toBe("#/analyzer?owner=u1");
    expect(slide.pinned).toBe(true);
  });

  it("falls back to the waiver lane when no trade candidate exists", () => {
    const slide = nextMoveSlide({ ...move, trade: null, waiver: { player: { name: "B. Sleeper" } } });
    expect(slide.body).toContain("B. Sleeper");
    expect(slide.body).toContain("unrostered");
  });

  it("calls it an upgrade rather than a need when nothing is urgent", () => {
    expect(nextMoveSlide({ ...move, need: { position: "TE", urgent: false } }).subtitle).toBe("TE upgrade");
  });
});

describe("which week the matchup slide is about", () => {
  const on = day => new Date(Date.UTC(2026, 8, 6 + day, 12, 0, 0));
  /* Sleeper rolls state.week forward once Monday night ends, so on Tuesday
     "week 5" already means the week nobody has played. */
  it("holds Tuesday and Wednesday back to the week just played", () => {
    expect(currentMatchupWeek(5, on(2))).toBe(4);
    expect(currentMatchupWeek(5, on(3))).toBe(4);
  });

  it("looks ahead from Thursday through Monday", () => {
    for (const day of [4, 5, 6, 0, 1]) expect(currentMatchupWeek(5, on(day))).toBe(5);
  });

  it("never goes below week 1", () => {
    expect(currentMatchupWeek(1, on(2))).toBe(1);
    expect(currentMatchupWeek(0, on(3))).toBe(1);
  });
});

describe("the week-ahead matchup preview", () => {
  const pairing = {
    mine: { sleeper_user_id: "me", name: "Da Nickers" },
    theirs: { sleeper_user_id: "them", name: "Dream Enders" },
  };
  const weekly = { teams: [
    { sleeper_user_id: "me", projection: 118.4 },
    { sleeper_user_id: "them", projection: 104.25 },
  ] };
  const base = { pairing, weekly, meSleeperId: "me", season: 2026, week: 5 };

  it("returns nothing without a pairing or a signed-in member", () => {
    expect(matchupPreviewSlide({ ...base, pairing: null })).toBeNull();
    expect(matchupPreviewSlide({ ...base, meSleeperId: null })).toBeNull();
  });

  it("returns nothing when either side has no projection to show", () => {
    expect(matchupPreviewSlide({ ...base, weekly: { teams: [{ sleeper_user_id: "me", projection: 118.4 }] } })).toBeNull();
  });

  it("puts both projections on a scoreboard and names the favourite", () => {
    const slide = matchupPreviewSlide(base);
    expect(slide.treatment).toBe("scoreboard");
    expect(slide.kicker).toBe("2026 · Week 5 · Preview");
    expect(slide.sides.map(s => s.score)).toEqual(["118.40", "104.25"]);
    expect(slide.whereText).toBe("You projected by 14.15");
    expect(slide.sides[0].up).toBe(true);
    expect(slide.sides[1].down).toBe(true);
  });

  it("names the opponent when they are favoured", () => {
    const slide = matchupPreviewSlide({ ...base, meSleeperId: "me",
      weekly: { teams: [{ sleeper_user_id: "me", projection: 90 }, { sleeper_user_id: "them", projection: 101.5 }] } });
    expect(slide.whereText).toBe("Dream Enders projected by 11.50");
  });

  it("says dead even rather than picking a side", () => {
    const slide = matchupPreviewSlide({ ...base,
      weekly: { teams: [{ sleeper_user_id: "me", projection: 100 }, { sleeper_user_id: "them", projection: 100 }] } });
    expect(slide.whereText).toBe("Projected dead even");
  });

  it("is pinned so the editorial filter keeps it", () => {
    expect(matchupPreviewSlide(base).pinned).toBe(true);
  });
});

describe("the all-time ledger between two teams", () => {
  const rows = [
    { season: 2024, week: 3, user1: "me", user2: "them", score1: 120, score2: 100 },
    { season: 2024, week: 9, user1: "them", user2: "me", score1: 130, score2: 90 },
    { season: 2025, week: 2, user1: "me", user2: "them", score1: 80, score2: 111 },
    { season: 2025, week: 11, user1: "them", user2: "me", score1: 140, score2: 99 },
    { season: 2026, week: 1, user1: "me", user2: "other", score1: 100, score2: 90 },
  ];
  const h = () => headToHead({ matchups: rows, meSleeperId: "me", oppSleeperId: "them" });

  it("counts only games between these two", () => {
    expect(h().meetings).toBe(4);
  });

  it("reads the result from whichever side each team was on", () => {
    expect(h().wins).toBe(1);
    expect(h().losses).toBe(3);
  });

  /* A fixture row can exist before it is played; counting it would hand
     everybody a phantom tie. */
  it("ignores a fixture with no score on either side", () => {
    const withUnplayed = [...rows, { season: 2026, week: 2, user1: "me", user2: "them", score1: 0, score2: 0 }];
    expect(headToHead({ matchups: withUnplayed, meSleeperId: "me", oppSleeperId: "them" }).meetings).toBe(4);
  });

  it("finds the current streak in chronological order", () => {
    /* Chronologically they won 2024 w9, 2025 w2 and 2025 w11 - the run
       reaches back past the season boundary. */
    expect(h().streak).toEqual({ holder: "them", count: 3 });
  });

  it("reports no meetings rather than failing", () => {
    expect(headToHead({ matchups: rows, meSleeperId: "me", oppSleeperId: "nobody" }).meetings).toBe(0);
  });
});

describe("the matchup story line", () => {
  it("says so plainly when they have never met", () => {
    expect(matchupStory({ h2h: { meetings: 0 }, theirsName: "Dream Enders" })).toBe("First time you have met.");
  });

  it("leads with a streak when there is one", () => {
    expect(matchupStory({ h2h: { meetings: 4, wins: 1, losses: 3, ties: 0, streak: { holder: "them", count: 2 } }, theirsName: "Dream Enders" }))
      .toBe("Dream Enders has taken the last 2. Series 1-3.");
    expect(matchupStory({ h2h: { meetings: 4, wins: 3, losses: 1, ties: 0, streak: { holder: "me", count: 3 } }, theirsName: "Dream Enders" }))
      .toBe("You have taken the last 3. Series 3-1.");
  });

  it("falls back to the series when a single win is not a run", () => {
    expect(matchupStory({ h2h: { meetings: 3, wins: 2, losses: 1, ties: 0, streak: { holder: "me", count: 1 } }, theirsName: "Dream Enders" }))
      .toBe("You lead the series 2-1.");
    expect(matchupStory({ h2h: { meetings: 3, wins: 1, losses: 2, ties: 0, streak: { holder: "them", count: 1 } }, theirsName: "Dream Enders" }))
      .toBe("Dream Enders leads the series 2-1.");
  });

  it("calls an even series even", () => {
    expect(matchupStory({ h2h: { meetings: 2, wins: 1, losses: 1, ties: 0, streak: { holder: "me", count: 1 } }, theirsName: "X" }))
      .toBe("All square at 1-1.");
  });
});

describe("the preview carries the story", () => {
  it("puts the history in the mood slot and the margin in the where slot", () => {
    const slide = matchupPreviewSlide({
      pairing: { mine: { sleeper_user_id: "me", name: "Da Nickers" }, theirs: { sleeper_user_id: "them", name: "Dream Enders" } },
      weekly: { teams: [{ sleeper_user_id: "me", projection: 110 }, { sleeper_user_id: "them", projection: 100 }] },
      meSleeperId: "me", season: 2026, week: 5,
      matchups: [
        { season: 2025, week: 1, user1: "me", user2: "them", score1: 120, score2: 100 },
        { season: 2025, week: 8, user1: "me", user2: "them", score1: 115, score2: 90 },
      ],
    });
    expect(slide.moodText).toBe("You have taken the last 2. Series 2-0.");
    expect(slide.whereText).toBe("You projected by 10.00");
  });

  it("still builds when there is no history to tell", () => {
    const slide = matchupPreviewSlide({
      pairing: { mine: { sleeper_user_id: "me", name: "A" }, theirs: { sleeper_user_id: "them", name: "B" } },
      weekly: { teams: [{ sleeper_user_id: "me", projection: 110 }, { sleeper_user_id: "them", projection: 100 }] },
      meSleeperId: "me", season: 2026, week: 1,
    });
    expect(slide.moodText).toBe("First time you have met.");
  });
});

describe("the week's slate", () => {
  const fixture = (an, ap, bn, bp, aid = an, bid = bn) => ({
    a: { sleeper_user_id: aid, name: an, projection: ap },
    b: { sleeper_user_id: bid, name: bn, projection: bp },
  });
  const three = [
    fixture("Da Nickers", 102.4, "Jack-HAMMER", 113.7, "me", "them"),
    fixture("Fuck you", 120.1, "Dream Enders", 99.55),
    fixture("Bastards", 88, "Klutch", 88),
  ];

  it("puts every fixture on one card", () => {
    const slide = weekSlateSlide({ fixtures: three, season: 2026, week: 2, meSleeperId: "me" });
    expect(slide.treatment).toBe("slate");
    expect(slide.fixtures).toHaveLength(3);
    expect(slide.kicker).toBe("2026 · Week 2");
  });

  it("marks the reader's own game in place rather than moving it", () => {
    const slide = weekSlateSlide({ fixtures: three, season: 2026, week: 2, meSleeperId: "me" });
    expect(slide.fixtures.map(f => f.mine)).toEqual([true, false, false]);
  });

  it("lights only the projected winner", () => {
    const [first, , even] = weekSlateSlide({ fixtures: three, season: 2026, week: 2, meSleeperId: "me" }).fixtures;
    expect(first.a.up).toBe(false);
    expect(first.b.up).toBe(true);
    /* A dead-even projection lights neither side rather than picking one. */
    expect(even.a.up).toBe(false);
    expect(even.b.up).toBe(false);
  });

  it("rounds the scores for a dense list", () => {
    const [first] = weekSlateSlide({ fixtures: three, season: 2026, week: 2, meSleeperId: "me" }).fixtures;
    expect(first.a.score).toBe("102.4");
    expect(first.b.score).toBe("113.7");
  });

  it("drops a fixture that has no projection to show", () => {
    const withGap = [...three, { a: { sleeper_user_id: "x", name: "X", projection: null }, b: { sleeper_user_id: "y", name: "Y", projection: 100 } }];
    expect(weekSlateSlide({ fixtures: withGap, season: 2026, week: 2, meSleeperId: "me" }).fixtures).toHaveLength(3);
  });

  /* One fixture is the reader's own game with extra steps, and the preview
     slide already says it better. */
  it("does not bother with fewer than two fixtures", () => {
    expect(weekSlateSlide({ fixtures: three.slice(0, 1), season: 2026, week: 2, meSleeperId: "me" })).toBeNull();
    expect(weekSlateSlide({ fixtures: [], season: 2026, week: 2, meSleeperId: "me" })).toBeNull();
  });

  it("still builds for a reader who is not in the league", () => {
    const slide = weekSlateSlide({ fixtures: three, season: 2026, week: 2, meSleeperId: "nobody" });
    expect(slide.fixtures.every(f => f.mine === false)).toBe(true);
  });
});
