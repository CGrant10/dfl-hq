import { describe, expect, it } from "vitest";
import { boardWeekLabel, buildLeaguePowerRankings, leaguePowerRankingsCard, teamInitials } from "./league-trajectory.js";

const teams = [
  { id: "1", roster_id: 1, sleeper_user_id: "u1", team_name: "Alpha", rank: 1, lineup: { weeklyPoints: 130 } },
  { id: "2", roster_id: 2, sleeper_user_id: "u2", team_name: "Beta", rank: 2, lineup: { weeklyPoints: 120 } },
  { id: "3", roster_id: 3, sleeper_user_id: "u3", team_name: "Gamma", rank: 3, lineup: { weeklyPoints: 110 } },
  { id: "4", roster_id: 4, sleeper_user_id: "u4", team_name: "Delta", rank: 4, lineup: { weeklyPoints: 100 } },
];

describe("weekly league power rankings", () => {
  it("turns each completed week into a ranked board with week-over-week movement", () => {
    const result = buildLeaguePowerRankings({ teams, matchups: [
      { week: 1, user1: "u1", score1: 80, user2: "u4", score2: 150 },
      { week: 1, user1: "u2", score1: 120, user2: "u3", score2: 110 },
    ] });
    expect(result.latestWeek).toBe(1);
    expect(result.boards.map(board => board.label)).toEqual(["Roster model", "Week 1"]);
    const delta = result.boards[1].rows.find(team => team.id === "4");
    expect(delta.rank).toBeLessThan(4);
    expect(delta.movement).toBeGreaterThan(0);
    expect(delta.previousRank).toBe(4);
    expect(result.boards[1].comparison).toBe("vs roster model");
  });

  it("compares a new board with the prior completed week", () => {
    const result = buildLeaguePowerRankings({ teams, matchups: [
      { week: 1, user1: "u1", score1: 80, user2: "u4", score2: 150 },
      { week: 1, user1: "u2", score1: 120, user2: "u3", score2: 110 },
      { week: 2, user1: "u1", score1: 150, user2: "u4", score2: 70 },
      { week: 2, user1: "u2", score1: 90, user2: "u3", score2: 130 },
    ] });
    expect(result.boards.at(-1).comparison).toBe("vs Week 1");
    expect(result.boards.at(-1).rows.every(row => Number.isInteger(row.movement))).toBe(true);
  });

  it("renders a compact accessible board and escapes names", () => {
    const changed = [{ ...teams[0], team_name: "<Alpha>" }, ...teams.slice(1)];
    const result = buildLeaguePowerRankings({ teams: changed, matchups: [
      { week: 1, roster1: 1, score1: 130, roster2: 2, score2: 110 },
      { week: 1, roster1: 3, score1: 100, roster2: 4, score2: 90 },
    ] });
    const html = leaguePowerRankingsCard(result, "1");
    expect(html).toContain("WEEKLY POWER RANKINGS");
    expect(html).toContain("data-pp-week-prev");
    expect(html).toContain("&lt;Alpha&gt;");
    expect(html).not.toContain("<Alpha>");
  });

  it("ignores future matchup rows without scores", () => {
    const result = buildLeaguePowerRankings({ teams, matchups: [
      { week: 1, user1: "u1", score1: null, user2: "u2", score2: null },
    ] });
    expect(result.latestWeek).toBe(0);
    expect(result.boards).toHaveLength(1);
  });
});

describe("the week named on the Power Rankings header", () => {
  /* A board only exists for a week with final scores, so the newest board is
     always the week just finished. The header names the week being played. */
  it("names the live week instead of the last one scored", () => {
    expect(boardWeekLabel({ label: "Week 1" }, 2)).toBe("Week 2");
    expect(boardWeekLabel({ label: "Week 1" }, 5)).toBe("Week 5");
  });

  it("keeps the board's own label when the live week is unknown", () => {
    expect(boardWeekLabel({ label: "Week 1" }, null)).toBe("Week 1");
    expect(boardWeekLabel({ label: "Week 1" }, 0)).toBe("Week 1");
    expect(boardWeekLabel({ label: "Week 1" }, "nonsense")).toBe("Week 1");
  });

  it("leaves the preseason board alone - it is not a week", () => {
    expect(boardWeekLabel({ label: "Roster model" }, 2)).toBe("Roster model");
  });
});

describe("the initials shown when a member has no photo", () => {
  it("takes a letter from each of the first two words", () => {
    expect(teamInitials("Da Nickers")).toBe("DN");
    expect(teamInitials("Bastards of the Realm")).toBe("BO");
  });

  it("keeps two letters of a single-word name", () => {
    expect(teamInitials("Jack-HAMMER")).toBe("JH");
    expect(teamInitials("Deadly")).toBe("DE");
  });

  /* Team names in this league really do start with emoji, and an emoji is a
     surrogate pair - slicing it by code unit renders a broken glyph. */
  it("steps over emoji instead of splitting one in half", () => {
    expect(teamInitials("\u{1F3C6} DaGrapeApes \u{1F3C6}")).toBe("DA");
    expect(teamInitials("Deadly \u{1F480}")).toBe("DE");
  });

  it("falls back rather than returning nothing", () => {
    expect(teamInitials("")).toBe("?");
    expect(teamInitials(null)).toBe("?");
    expect(teamInitials("\u{1F3C6}")).toBe("?");
  });
});

describe("a week still being played", () => {
  const teams = [
    { id: "1", roster_id: 1, sleeper_user_id: "u1", team_name: "Alpha", rank: 1, lineup: { weeklyPoints: 130 } },
    { id: "2", roster_id: 2, sleeper_user_id: "u2", team_name: "Bravo", rank: 2, lineup: { weeklyPoints: 120 } },
    { id: "3", roster_id: 3, sleeper_user_id: "u3", team_name: "Charlie", rank: 3, lineup: { weeklyPoints: 110 } },
    { id: "4", roster_id: 4, sleeper_user_id: "u4", team_name: "Delta", rank: 4, lineup: { weeklyPoints: 100 } },
  ];
  const week1 = [
    { season: 2026, week: 1, user1: "u1", score1: 120, user2: "u2", score2: 100 },
    { season: 2026, week: 1, user1: "u3", score1: 90, user2: "u4", score2: 111 },
  ];
  /* Thursday night: one fixture has kicked off, the other has not. */
  const week2Partial = [
    { season: 2026, week: 2, user1: "u1", score1: 23.3, user2: "u2", score2: 0 },
    { season: 2026, week: 2, user1: "u3", score1: 0, user2: "u4", score2: 0 },
  ];

  it("does not count a half-played week as played", () => {
    const built = buildLeaguePowerRankings({ teams, matchups: [...week1, ...week2Partial] });
    expect(built.latestWeek).toBe(1);
    expect(built.boards.map(b => b.label)).toEqual(["Roster model", "Week 1"]);
  });

  it("leaves every record on one game while week 2 is in progress", () => {
    const built = buildLeaguePowerRankings({ teams, matchups: [...week1, ...week2Partial] });
    const rows = built.boards.at(-1).rows;
    expect(rows.every(row => /^[01]-[01]$/.test(row.record))).toBe(true);
  });

  it("counts the week once every fixture has both sides scored", () => {
    const week2Done = [
      { season: 2026, week: 2, user1: "u1", score1: 23.3, user2: "u2", score2: 118 },
      { season: 2026, week: 2, user1: "u3", score1: 96, user2: "u4", score2: 101 },
    ];
    const built = buildLeaguePowerRankings({ teams, matchups: [...week1, ...week2Done] });
    expect(built.latestWeek).toBe(2);
    expect(built.boards.at(-1).rows.every(row => /^[012]-[012]$/.test(row.record))).toBe(true);
  });
});
