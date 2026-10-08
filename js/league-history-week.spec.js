import { describe, expect, it } from "vitest";
import { historyForWeek } from "./league-history-week.js";
describe("this week in league history", () => { it("finds the high score, blowout and closest finish for the same week", () => { const lore = { matchups: [
  { season: 2024, week: 4, user1: "a", score1: 130, user2: "b", score2: 100 },
  { season: 2025, week: 4, user1: "a", score1: 110, user2: "b", score2: 109.5 },
] }; const members = [{ sleeper_user_id: "a", team_name: "Alpha" }, { sleeper_user_id: "b", team_name: "Beta" }]; const view = historyForWeek({ lore, week: 4, members }); expect(view.high).toMatchObject({ name: "Alpha", score: 130 }); expect(view.blowout.margin).toBe(30); expect(view.close.margin).toBe(.5); });
  it("keeps missing, unsynced and other-week scores out of historical records", () => {
    const game={season:2025,week:4,user1:'a',user2:'b'};
    const lore={matchups:[{...game,score1:null,score2:100},{...game,score1:0,score2:0},{...game,score1:'bad',score2:100},{...game,week:5,score1:160,score2:120},{...game,score1:110,score2:100}]};
    const result=historyForWeek({lore,week:4});expect(result.games).toBe(1);expect(result.close.margin).toBe(10);expect(result.high.score).toBe(110);expect(historyForWeek({lore,week:18})).toBeNull();
  });
  it("uses the recorded season and roster to identify former members", () => {
    const lore={matchups:[{season:2022,week:5,user1:null,roster1:3,user2:'b',roster2:4,score1:130,score2:129},{season:2021,week:5,user1:null,roster1:6,user2:'b',roster2:4,score1:100,score2:110}]};
    const result=historyForWeek({lore,week:5,historicalName:(uid,season,roster)=>({label:uid==='b'?'Beta':`${season} roster ${roster}`})});
    expect(result.close.winner.name).toBe('2022 roster 3');expect(result.rivalry.names).toEqual(['2022 roster 3','Beta']);
    expect(result.rivalry.games).toBe(1);
  });
});
