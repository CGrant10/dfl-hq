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
});
