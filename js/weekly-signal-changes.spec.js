import { describe, expect, it } from "vitest";
import { weeklySignalChanges } from "./weekly-signal-changes.js";
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)) }; };
describe("weekly signal changes", () => {
  it("reports material projection and injury changes after the first snapshot", () => {
    const storage = memory(), player = { name: "Receiver",position:"WR", points: 10, hasGame: true, injuryStatus: null };
    const weekly = { season: 2026, week: 4, pool: new Map([["1", player]]) };
    expect(weeklySignalChanges(weekly, storage)).toEqual([]);
    player.points = 13; expect(weeklySignalChanges(weekly, storage)[0].detail).toContain("+3.0");
    player.injuryStatus = "Questionable"; expect(weeklySignalChanges(weekly, storage)[0]).toMatchObject({ type: "injury", impact: "down" });
  });
});

describe('fantasy-relevant Latest Updates',()=>{
 it('excludes defenders, linemen, kickers, punters and unprojected depth players',()=>{
  const storage=memory(),positions=['QB','RB','WR','TE','LB','DE','CB','S','OT','K','P'];
  const weekly={season:2026,week:8,pool:new Map(positions.map(p=>[p,{name:p,position:p,points:12,hasGame:true}]))};
  weekly.pool.set('depth',{name:'Practice squad WR',position:'WR',points:0});weeklySignalChanges(weekly,storage);
  for(const player of weekly.pool.values())player.injuryStatus='Out';
  const updates=weeklySignalChanges(weekly,storage);expect(updates.map(c=>c.id).sort()).toEqual(['QB','RB','TE','WR']);
 });
 it('keeps a rostered offensive player relevant even when an injury takes his projection to zero',()=>{
  const storage=memory(),player={name:'Starting receiver',position:'WR',points:14,hasGame:true,rostered:true};
  const weekly={season:2026,week:8,pool:new Map([['x',player]])};weeklySignalChanges(weekly,storage);player.points=0;player.injuryStatus='IR';expect(weeklySignalChanges(weekly,storage)).toMatchObject([{name:'Starting receiver',type:'injury'}]);
 });
 it('does not break the Home model when browser storage is unavailable',()=>{
  const weekly={season:2026,week:8,pool:new Map([['x',{position:'WR',points:10}]])};expect(()=>weeklySignalChanges(weekly,{getItem(){throw Error('Blocked')},setItem(){throw Error('Blocked')}})).not.toThrow();
 });
});
