import { describe, expect, it } from "vitest";
import { playerIdentity, playerPortrait } from "./player-presentation.js";

describe("shared player presentation", () => {
  it("uses a Sleeper headshot and team-colored identity", () => {
    const html = playerIdentity({ id: "4046", name: "Amon-Ra St. Brown", position: "WR", nflTeam: "DET" }, { signal: "HOT" });
    expect(html).toContain("players/thumb/4046.jpg");
    expect(html).toContain("--player-primary:#0076B6");
    expect(html).toContain("Amon-Ra St. Brown");
    expect(html).toContain("is-up");
  });

  it("uses the real team mark for defenses", () => {
    const html = playerPortrait({ id: "SEA", name: "Seattle", position: "DEF", nflTeam: "SEA" });
    expect(html).toContain("teamlogos/nfl/500/sea.png");
    expect(html).toContain("is-team");
  });
});

