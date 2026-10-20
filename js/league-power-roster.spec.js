import {describe,it,expect} from 'vitest';
import {powerRosterForecast} from './league-power-roster.js';
const positions=['QB','QB','RB','RB','RB','WR','WR','WR','TE','K','DEF'];
const players=Object.fromEntries(positions.map((p,i)=>[String(i),{p,i:null}]));
const rows=positions.map((position,i)=>({player_id:String(i),opponent:'BUF',stats:{rec:10+i},player:{position}}));
const roster={players:rows.map(r=>r.player_id)};
describe('available legal DFL lineup',()=>{
 it('scores PPR for one QB, two RB, two WR, TE, flex, K and DEF',()=>{
  const result=powerRosterForecast(roster,rows,players,{rec:1});
  expect(result.complete).toBe(true);
  expect(result.slots.map(s=>s.position)).toEqual(['QB','RB','RB','WR','WR','TE','K','DEF','FLEX']);
  expect(result.slots.filter(s=>s.player!=null)).toHaveLength(9);
  expect(new Set(result.slots.map(s=>s.player)).size).toBe(9);
  expect(result.slots.find(s=>s.position==='QB').player).toBe('1');
  expect(result.slots.find(s=>s.position==='FLEX').player).toBe('5');
  expect(result.points).toBe(143);
 });
 it('does not increase lineup strength by stacking bench quarterbacks',()=>{
  const a=powerRosterForecast(roster,rows,players,{rec:1});
  const b=powerRosterForecast(roster,rows.map((r,i)=>i? r:{...r,stats:{rec:10.9}}),players,{rec:1});
  expect(b.points).toBe(a.points);
 });
 it('uses fresh weekly availability, including a cleared injury, before cached directory status',()=>{
  const healthy=rows.map(r=>r.player_id==='7'?{...r,player:{...r.player,injury_status:null}}:r);
  const result=powerRosterForecast(roster,healthy,{...players,'7':{p:'WR',i:'Out'}},{rec:1});
  expect(result.slots.some(s=>s.player==='7')).toBe(true);
  const injured=healthy.map(r=>r.player_id==='7'?{...r,player:{...r.player,injury_status:'Out'}}:r);
  expect(powerRosterForecast(roster,injured,players,{rec:1}).slots.some(s=>s.player==='7')).toBe(false);
 });
 it('replaces an Out starter with the next legal player; Questionable remains eligible',()=>{
  const changed={...players,'7':{p:'WR',i:'Out'},'6':{p:'WR',i:'Questionable'}};
  const result=powerRosterForecast(roster,rows,changed,{rec:1});
  expect(result.complete).toBe(true);
  expect(result.slots.some(s=>s.player==='7')).toBe(false);
  expect(result.slots.some(s=>s.player==='6')).toBe(true);
  expect(result.points).toBeLessThan(powerRosterForecast(roster,rows,players,{rec:1}).points);
 });
 it('keeps missing projection data unknown rather than treating it as zero',()=>{
  expect(powerRosterForecast(roster,rows.slice(1),players,{rec:1})).toMatchObject({complete:false,points:null,unknown:1});
  expect(powerRosterForecast(roster,rows,players,{})).toMatchObject({complete:false,points:null});
 });
 it('distinguishes known bye rows and inactive players from missing data',()=>{
  const changed=rows.map(r=>r.player_id==='10'?{...r,opponent:null,stats:{gp:0}}:r);
  const result=powerRosterForecast(roster,changed,players,{rec:1});
  expect(result.complete).toBe(true);
  expect(result.slots.find(s=>s.position==='DEF')).toMatchObject({player:null,points:0});
  expect(powerRosterForecast(roster,rows.slice(1),{...players,'0':{p:'QB',s:'Inactive'}},{rec:1}).complete).toBe(true);
 });
});
