import { describe, expect, it } from "vitest";
import { buildWeeklyBriefing } from "./weekly-briefing.js";

describe("weekly briefing", () => {
  it("turns Tuesday into a personal four-part read", () => {
    const briefing = buildWeeklyBriefing({
      now: new Date("2026-09-29T09:00:00"), meSleeperId: "u1",
      outlook: { week: 4, predictions: [{ isMine: true, winner: { name: "Mine", projection: 121 }, loser: { name: "Them", projection: 114 }, margin: 7 }], startSit: { lineupIsSet: true, swaps: [] } },
      stakes: { berths: 2, week: 4, rows: [{ sleeperUserId: "u1", status: "alive", projectedSeed: 2, playoffOdds: .67, remaining: 10, winsNeeded: 2 }] },
      move: { headline: "Hold your waiver priority" },
    });
    expect(briefing.title).toBe("Tuesday Briefing");
    expect(briefing.headline).toContain("favored by 7.0");
    expect(briefing.playoffDetail).toContain("67% playoff chance");
    expect(briefing.action).toBe("Hold your waiver priority");
  });
});

describe('fresh connected briefing',()=>{
 const now=new Date('2026-10-11T17:00:00Z'),outlook={week:5,startSit:{lineupIsSet:true,swaps:[]}};
 const coach={checkedAt:now.getTime(),plan:{state:'ready',week:5,offers:[{player:{name:'Waiver WR'},drop:{name:'Bench WR'},targetWeek:6}]},rescue:[{actionable:true,player:{name:'Injured WR'},status:'Out',slot:'WR',backup:{name:'Healthy WR'}}]};
 it('puts real injury cover before generic lineup advice and links the owner',()=>{const b=buildWeeklyBriefing({outlook,coach,meSleeperId:'u1',now});expect(b.lineup).toBe('Injured WR: Out · Healthy WR can cover WR');expect(b.action).toBe('Add Waiver WR · drop Bench WR · Week 6 cover');expect(b.actionUrl).toBe('#/analyzer?owner=u1');expect(b.needsAttention).toBe(true)});
 it('will not use another week or stale advice',()=>{for(const changed of [{...coach,checkedAt:now.getTime()-120001},{...coach,plan:{...coach.plan,week:4}}]){const b=buildWeeklyBriefing({outlook,coach:changed,move:{headline:'Hold'},now});expect(b.action).toBe('Hold');expect(b.lineup).toBe('No lineup move worth forcing');expect(b.checkedAt).toBeNull()}});
 it('does not manufacture a pickup if a fresh legal-lineup model finds none',()=>{expect(buildWeeklyBriefing({outlook,coach:{...coach,plan:{...coach.plan,offers:[]}},now}).action).toBe('No clear pickup improvement. Keep your depth.')});
});
