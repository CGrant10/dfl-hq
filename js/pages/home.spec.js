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

  it("uses the existing crest for the tenth-anniversary treatment", () => {
    expect(source).toContain('src="icons/crest-512.webp"');
    expect(source).toContain("Anniversary Season");
    expect(source).toContain("LEAGUE_FOUNDED");
  });

  it("promotes the broadcast stage into the slot the dashboard held", () => {
    expect(source).toContain('<section class="home-broadcast"');
    expect(source).not.toContain("home-broadcast-secondary");
    /* One stage, above the standing sections and the league utility. */
    expect(source.match(/\$\{renderStage\(deck1\)\}/g)).toHaveLength(1);
    expect(source.indexOf("${renderStage(deck1)}")).toBeLessThan(source.indexOf("data-home-rankings-slot"));
    expect(source.indexOf("${renderStage(deck1)}")).toBeLessThan(source.indexOf("home-lower"));
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
