import { describe, expect, it } from "vitest";
import { playerIdentity, playerPortrait } from "./player-presentation.js";

describe("shared player presentation", () => {
  it("uses a Sleeper headshot and team-colored identity", () => {
    const html = playerIdentity({ id: "4046", name: "Amon-Ra St. Brown", position: "WR", nflTeam: "DET" }, { signal: "HOT" });
    expect(html).toContain("players/thumb/4046.jpg");
    expect(html).toContain("--player-primary:#0076B6");
    expect(html).toContain("Amon-Ra St. Brown");
    expect(html).toContain("is-up");
    expect(html).toContain("classList.add('has-photo')");
    expect(html).toContain("classList.remove('has-photo')");
    expect(html).toContain('width="48" height="48"');
  });

  it("uses the real team mark for defenses", () => {
    const html = playerPortrait({ id: "SEA", name: "Seattle", position: "DEF", nflTeam: "SEA" });
    expect(html).toContain("teamlogos/nfl/500/sea.png");
    expect(html).toContain("is-team");
  });
  it('uses the larger source only for large portraits, with the smaller source as a failure fallback',()=>{
    const player={id:'2449',name:'Stefon Diggs'};
    const large=playerPortrait(player,{size:96});
    expect(large).toContain('src="https://sleepercdn.com/content/nfl/players/2449.jpg"');
    expect(large).toContain('data-portrait-fallback="https://sleepercdn.com/content/nfl/players/thumb/2449.jpg"');
    expect(playerPortrait(player)).not.toContain('data-portrait-fallback');
  });
});
