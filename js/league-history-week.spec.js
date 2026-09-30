import { describe, expect, it } from "vitest";
import { historyForWeek } from "./league-history-week.js";
describe("this week in league history", () => { it("finds the high score, blowout and closest finish for the same week", () => { const lore = { matchups: [
  { season: 2024, week: 4, user1: "a", score1: 130, user2: "b", score2: 100 },
  { season: 2025, week: 4, user1: "a", score1: 110, user2: "b", score2: 109.5 },
] }; const members = [{ sleeper_user_id: "a", team_name: "Alpha" }, { sleeper_user_id: "b", team_name: "Beta" }]; const view = historyForWeek({ lore, week: 4, members }); expect(view.high).toMatchObject({ name: "Alpha", score: 130 }); expect(view.blowout.margin).toBe(30); expect(view.close.margin).toBe(.5); }); });
