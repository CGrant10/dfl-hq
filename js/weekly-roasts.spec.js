import {describe,it,expect} from 'vitest';
import {weeklyRoasts} from './weekly-roasts.js';
import {DFL_SLOTS} from './lineup-alert-model.js';
const players=Object.fromEntries(DFL_SLOTS.map((slot,i)=>[String(i),{p:slot==='FLEX'?'WR':slot,n:`Player ${i}`}]));
players.bench={n:'Benched Ace',p:'WR'};
const row={roster_id:1,starters:DFL_SLOTS.map((_,i)=>String(i)),players_points:Object.fromEntries(DFL_SLOTS.map((_,i)=>[String(i),8]))};row.players_points.bench=27;
const input={season:2026,now:Date.parse('2026-10-11T16:00:00Z'),completed:true,games:[{matchup_id:1,left:{roster:1,name:'Current name',score:100},right:{roster:2,name:'Winner',score:104}}],raw:[row],players};
describe('fact-based weekly receipts',()=>{
 it('proves a slot-eligible single bench swap would change the final result in hindsight',()=>{
  const result=weeklyRoasts(input)[0];expect(result.kind).toBe('Bench disaster');expect(result.text).toContain('27.00');expect(result.text).toContain('4.00');expect(result.text).toContain('fucking');expect(result.detail).toContain('adds 19.00');expect(result.detail).toContain('kickoff availability was not recorded');
 });
 it('does not compare a benched QB to a low scoring WR or flex',()=>{
  const p={...players,bench:{n:'QB',p:'QB'}},r={...row,players_points:{...row.players_points,0:30}};
  expect(weeklyRoasts({...input,players:p,raw:[r]})[0].kind).toBe('Narrow escape');
 });
 it('does not infer historical eligibility from a current player position',()=>{expect(weeklyRoasts({...input,season:2025})[0].kind).toBe('Narrow escape')});
 it('does not invent outcome-changing swaps from missing points or partial historical lineups',()=>{
  expect(weeklyRoasts({...input,raw:[{...row,starters:['3']}]})[0].kind).toBe('Narrow escape');
  expect(weeklyRoasts({...input,raw:[{...row,players_points:{bench:27}}]})[0].kind).toBe('Narrow escape');
 });
 it('requires a final result and does not roast drawn or unknown-score matchups',()=>{
  expect(weeklyRoasts({...input,completed:false})).toEqual([]);
  for(const score of [104,null,undefined])expect(weeklyRoasts({...input,games:[{...input.games[0],left:{...input.games[0].left,score}}]})).toEqual([]);
 });
});
