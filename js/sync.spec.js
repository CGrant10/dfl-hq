import { describe, expect, it, vi } from "vitest";
vi.mock("./supabase.js", () => ({ db: vi.fn(), edge: vi.fn(), privilegedFunctionHeaders: vi.fn() }));
vi.mock("./team-analyzer-data.js", () => ({ loadAnalyzerData: vi.fn() }));
import { adoptTeamName } from "./sync.js";

describe("adopting a renamed team", () => {
  /* The real case: Sleeper returns names with trailing spaces, the members
     row stores them trimmed, so the stored name never matched the roster
     history and a rename was read as an admin's hand-typed name. */
  it("adopts the new name even when history only differs by whitespace", () => {
    expect(adoptTeamName({
      current: "Quontom Leap ",
      stored: "Team Lafountain",
      everUsed: ["Waddle Waddle", "Team Lafountain ", "Purdy Sucks"],
    })).toBe("Quontom Leap");
  });

  it("writes the trimmed name rather than Sleeper's padding", () => {
    expect(adoptTeamName({ current: "  Quontom Leap  ", stored: "", everUsed: [] })).toBe("Quontom Leap");
  });

  /* The guard that matters in the other direction: a commissioner who types
     a name by hand must not have it overwritten on the next sync. */
  it("leaves a name the sync never imported alone", () => {
    expect(adoptTeamName({
      current: "Quontom Leap",
      stored: "The Fighting Mongooses",
      everUsed: ["Team Lafountain", "Purdy Sucks"],
    })).toBeNull();
  });

  it("fills an empty stored name", () => {
    expect(adoptTeamName({ current: "Quontom Leap", stored: null, everUsed: [] })).toBe("Quontom Leap");
    expect(adoptTeamName({ current: "Quontom Leap", stored: "   ", everUsed: [] })).toBe("Quontom Leap");
  });

  it("does nothing when the name already matches but for spacing", () => {
    expect(adoptTeamName({ current: "Quontom Leap ", stored: "Quontom Leap", everUsed: [] })).toBeNull();
  });

  it("does nothing when Sleeper has no name to offer", () => {
    expect(adoptTeamName({ current: "", stored: "Team Lafountain", everUsed: ["Team Lafountain"] })).toBeNull();
    expect(adoptTeamName({ current: null, stored: "Team Lafountain", everUsed: ["Team Lafountain"] })).toBeNull();
  });

  it("ignores blank entries in the imported history", () => {
    expect(adoptTeamName({
      current: "Quontom Leap",
      stored: "Custom Name",
      everUsed: ["", "  ", null],
    })).toBeNull();
  });
});
