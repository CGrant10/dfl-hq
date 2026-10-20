import { describe, expect, it } from "vitest";
import { teamIdentity, teamLabel, teamPortrait } from "./team-presentation.js";

describe("team presentation", () => {
  const team = { team_name: "Realm & Co", ownerName: "Grant", identity: { display_name: "Grant", profile_image: "https://example.com/me.jpg", accent_color: "#22C7A9" } };
  it("uses one stable team label", () => expect(teamLabel(team)).toBe("Realm & Co"));
  it("renders photo, safe fallback and accent", () => {
    const html = teamPortrait(team);
    expect(html).toContain("RC");
    expect(html).toContain("me.jpg");
    expect(html).toContain("#22C7A9");
  });
  it("keeps team and owner distinguishable", () => {
    const html = teamIdentity(team, { record: "2-0", movement: 2 });
    expect(html).toContain("Realm &amp; Co");
    expect(html).toContain("Grant");
    expect(html).toContain("2-0");
    expect(html).toContain("▲2");
  });
  it('uses the league team photo before the owner photo and keeps the DFL upload as a failure fallback',()=>{
    const html=teamPortrait({...team,sleeper_team_image:'https://sleepercdn.com/uploads/team.jpg',sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/owner'});
    expect(html).toContain('src="https://sleepercdn.com/uploads/team.jpg"');
    expect(html).toContain('data-photo-fallbacks="[&quot;https://sleepercdn.com/avatars/thumbs/owner&quot;,&quot;https://example.com/me.jpg&quot;]"');
    expect(teamPortrait({...team,sleeper_profile_image:'https://sleepercdn.com/avatars/thumbs/owner'})).toContain('src="https://sleepercdn.com/avatars/thumbs/owner"');
    expect(html).toContain('RC');
  });
});
