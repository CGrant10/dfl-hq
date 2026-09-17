import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./home.js", import.meta.url), "utf8");

describe("Home redesign wiring", () => {
  it("keeps the four dashboard stories in one stable rotating shell", () => {
    expect(source).toContain('const tabs = ["My Week", "Power Ranks", "Next Move", "Report"]');
    expect(source).toContain("data-hd-pause");
    expect(source).toContain("data-hd-panel");
    expect(source).toContain("wireHomeDashboard");
  });

  it("uses the existing crest for the tenth-anniversary treatment", () => {
    expect(source).toContain('src="icons/crest-512.webp"');
    expect(source).toContain("Anniversary Season");
    expect(source).toContain("LEAGUE_FOUNDED");
  });

  it("demotes the older broadcast below the dashboard and league utility", () => {
    expect(source.indexOf("${homeDashboardShell()}")).toBeLessThan(source.indexOf("${renderStage(deck1)}"));
    expect(source.indexOf("home-lower")).toBeLessThan(source.indexOf("home-broadcast-secondary"));
  });

  it("renders the approved always-visible power rankings composition", () => {
    expect(source).toContain("export function homeRankingsCard");
    expect(source).toContain("YOUR RANK");
    expect(source).toContain("LEAGUE LEADER");
    expect(source).toContain("home-rank-ellipsis");
    expect(source).toContain("data-home-rankings-slot");
  });

  it("renders a compact three-column weekly report rail", () => {
    expect(source).toContain("export function homeWeeklyDigest");
    expect(source).toContain("BENCH CRIME");
    expect(source).toContain("CLOSEST ESCAPE");
    expect(source).toContain("TOP STARTER");
    expect(source).toContain("data-home-report-slot");
  });
});
