import { describe, expect, it } from "vitest";
import { nextMoveSlide, tradeAlertSlide } from "./home-slides.js";

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
