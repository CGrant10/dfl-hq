import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./home.js", import.meta.url), "utf8");

describe("Home redesign wiring", () => {
  it("carries the retired dashboard's unique stories as stage slides", () => {
    /* The tabbed dashboard is gone. Its "Power Ranks" and "Report" tabs drew
       the same two views as the standing sections below them, so they were
       dropped outright; the trade alert and the auto-scout had nowhere else
       to live, so they became deck items on the stage instead. */
    expect(source).not.toContain("homeDashboardShell");
    expect(source).not.toContain("data-hd-panel");
    expect(source).toContain("tradeAlertSlide");
    expect(source).toContain("nextMoveSlide");
    expect(source).toContain("home-slides.js");
  });

  it("gives the anniversary band to the laurels alone", () => {
    /* The crest was dropped from this band: the masthead above it already
       carries the mark, and it was taking the left grid track that the
       headline needed in order to centre. */
    expect(source).not.toContain('src="icons/crest-512.webp"');
    expect(source).toContain("dfl-anniv-branch is-left");
    expect(source).toContain("dfl-anniv-branch is-right");
    /* The break is explicit so the words box can shrink-wrap to its widest
       line and the laurels hug the letters rather than an empty box. */
    expect(source).toContain("Anniversary<br>Season");
    expect(source).toContain("LEAGUE_FOUNDED");
  });

  it("promotes the broadcast stage into the slot the dashboard held", () => {
    expect(source).toContain('<section class="home-broadcast is-loading"');
    expect(source).not.toContain("home-broadcast-secondary");
    /* One reserved stage, above the standing sections and the league utility.
       It commits only after the complete startup deck is ready. */
    expect(source).toContain("Loading league broadcast");
    expect(source).toContain("startHomeStage(build(golfDayNow))");
    expect(source.indexOf("home-broadcast-loading")).toBeLessThan(source.indexOf("data-home-rankings-slot"));
    expect(source.indexOf("home-broadcast-loading")).toBeLessThan(source.indexOf("data-home-feed-slot"));
  });

  it("lets GameDay own the personal matchup while the broadcast keeps its editorial order", () => {
    expect(source).toContain('off: new Set([...off, "myMatchup"])');
    expect(source).not.toContain("personalMatchupFirst");
    expect(source).not.toContain("slides.push(matchupPreviewSlide(");
    expect(source).not.toContain("stage?.update(build(golfDay))");
    expect(source).not.toContain("if (stage) stage.update(build(golfDayNow))");
  });

  it("retains the power rankings composition in the visible league desk", () => {
    expect(source).toContain("export function homeRankingsCard");
    expect(source).toContain("home-rank-head");
    expect(source).toContain('row(item, index, String(item.id) === String(focus.id))');
    expect(source).toContain("home-rank-ellipsis");
    expect(source).toContain("data-home-rankings-slot");
    expect(source).toContain("data-home-rank-toggle");
    expect(source).toContain("wireHomeRankings");
  });

  it("renders the current week as matchup predictions, player forecasts and Start/Sit advice", () => {
    expect(source).toContain("export function homeWeeklyDigest");
    expect(source).toContain("WEEK AHEAD");
    expect(source).toContain("PROJECTED");
    expect(source).toContain("Actual pts");
    expect(source).toContain("playerLiveState(player)");
    expect(source).toContain("data-live-score");
    expect(source).toContain("Top 3 by position");
    expect(source).toContain("data-week-tab");
    expect(source).toContain("data-position-tab");
    expect(source).toContain("wireHomeWeekHub");
    expect(source).toContain("Start / Sit");
    expect(source).toContain("Full Start / Sit");
    expect(source).toContain("buildHomeWeekOutlook");
    expect(source).toContain("data-home-report-slot");
  });

  it("keeps completed trade verdicts on Home after breaking coverage ends", () => {
    expect(source).toContain("export function homeTradeWire");
    expect(source).toContain("Trade wire");
    expect(source).toContain("DFLYZER VERDICTS");
    expect(source).toContain("data-home-trade-slot");
    expect(source).toContain("tradeAlertViewModel");
    expect(source).toContain("(alerts || []).slice(0, 1)");
    expect(source).not.toContain("SHOW ${older.length} OLDER TRADE");
    expect(source).toContain("seasonTradeViews");
  });

  it("keeps the lower Home page compact and defers its secondary data", () => {
    expect(source).not.toContain("seasonDoors(");
    expect(source).toContain("loadWall(3)");
    expect(source).toContain("compact: true");
    expect(source).toContain("homeLeagueFeed");
    expect(source).toContain("whenNear");
    expect(source).toContain("loadTradeAlerts({ limit: 12 })");
  });
});
