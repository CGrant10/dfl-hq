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
    expect(source).toContain("Loading your matchup");
    expect(source).toContain("startHomeStage(build(golfDayNow))");
    expect(source.indexOf("home-broadcast-loading")).toBeLessThan(source.indexOf("data-home-rankings-slot"));
    expect(source.indexOf("home-broadcast-loading")).toBeLessThan(source.indexOf("home-lower"));
  });

  it("opens the complete deck on the signed-in member's matchup", () => {
    expect(source).toContain("export function personalMatchupFirst");
    expect(source).toContain('item?.generator === "myMatchup"');
    expect(source).not.toContain("stage?.update(build(golfDay))");
    expect(source).not.toContain("if (stage) stage.update(build(golfDayNow))");
  });

  it("renders the approved always-visible power rankings composition", () => {
    expect(source).toContain("export function homeRankingsCard");
    expect(source).toContain("YOUR RANK");
    expect(source).toContain("LEAGUE LEADER");
    expect(source).toContain("home-rank-ellipsis");
    expect(source).toContain("data-home-rankings-slot");
    expect(source).toContain("data-home-rank-toggle");
    expect(source).toContain("wireHomeRankings");
  });

  it("renders a compact three-column weekly report rail", () => {
    expect(source).toContain("export function homeWeeklyDigest");
    expect(source).toContain("BENCH CRIME");
    expect(source).toContain("CLOSEST ESCAPE");
    expect(source).toContain("TOP STARTER");
    expect(source).toContain("data-home-report-slot");
  });
});
