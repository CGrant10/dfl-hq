import { describe, expect, it } from "vitest";
import { parseSleeperProps, resolveImportedProps } from "./sleeper-prop-import.js";

describe("Sleeper prop import", () => {
  it("reads commissioner-friendly rows", () => {
    expect(parseSleeperProps("Josh Allen | Passing yards | 264.5\nBreece Hall, Rushing yards, 71.5")).toEqual([
      { playerName: "Josh Allen", statKey: "pass_yd", statLabel: "Passing yards", line: 264.5 },
      { playerName: "Breece Hall", statKey: "rush_yd", statLabel: "Rushing yards", line: 71.5 },
    ]);
  });

  it("reads loose screenshot OCR blocks and removes duplicates", () => {
    const text = `Justin Jefferson\nMIN - WR\nReceiving Yards\n84.5\nHigher\nLower\n\nJustin Jefferson\nReceiving yards\n84.5`;
    expect(parseSleeperProps(text)).toEqual([
      { playerName: "Justin Jefferson", statKey: "rec_yd", statLabel: "Receiving yards", line: 84.5 },
    ]);
  });

  it("resolves the player and their own kickoff", () => {
    const rows = parseSleeperProps("Josh Allen | Passing TDs | 1.5");
    expect(resolveImportedProps(rows, { "4984": { n: "Josh Allen", p: "QB", t: "BUF" } }, [
      { away_team_id: "BUF", home_team_id: "MIA", starts_at: "2026-10-04T17:00:00Z" },
    ])[0]).toMatchObject({ playerId: "4984", position: "QB", team: "BUF", closesAt: "2026-10-04T17:00:00Z" });
  });

  it("tolerates a missing suffix and common team abbreviation differences", () => {
    const rows = parseSleeperProps("Marvin Harrison | Receiving yards | 64.5");
    expect(resolveImportedProps(rows, { "9509": { n: "Marvin Harrison Jr.", p: "WR", t: "WAS" } }, [
      { away_team_id: "DAL", home_team_id: "WSH", starts_at: "2026-10-05T17:00:00Z" },
    ])[0]).toMatchObject({ playerId: "9509", closesAt: "2026-10-05T17:00:00Z" });
  });
});
