import {describe,it,expect} from 'vitest';
import {analyzeLeague,buildPlayerPool,optimalLineup,tradeLineupPreviews} from './team-analyzer.js';
const player=(id,position,points)=>[id,{id,name:id,position,expectedPoints:points,tradePerGame:points/17,tradeValue:20}];
const pool=new Map([player('q','QB',340),player('r1','RB',240),player('r2','RB',230),player('w1','WR',250),player('w2','WR',220),player('t1','TE',150),player('t2','TE',200),player('bench','RB',300)]);
const ids=['q','r1','r2','w1','w2','t1','t2','kicker','DEF','bench'];
describe('DFL lineup and scoring audit',()=>{
 it('preserves a legal submitted TE flex, excluding kicker/defense from offensive totals',()=>{
  const lineup=optimalLineup(ids,pool,{starterIds:ids.slice(0,9)});
  expect(lineup.source).toBe('set');expect(lineup.starters).toHaveLength(7);expect(lineup.flexId).toBe('t2');
  expect(lineup.starterPoints).toBe(1630);expect(lineup.bench.map(p=>p.id)).toContain('bench');
 });
 it('does not count the flex player again in the dedicated position grade',()=>{
  const [team]=analyzeLeague({rosters:[{roster_id:1,players:ids,starters:ids.slice(0,9)}],pool});
  expect(team.positionScores.TE).toBe(150);expect(team.positionScores.FLEX).toBe(200);
  expect(team.positionGrades.TE.starters.map(p=>p.id)).toEqual(['t1']);
  expect(team.positionGrades.FLEX.starters.map(p=>p.id)).toEqual(['t2']);
 });
 it.each(['RB','WR','TE'])('accepts %s in flex while keeping one QB and dedicated TE',position=>{
  const p=new Map(pool);p.set('flex',{id:'flex',name:'Flex',position,expectedPoints:170,tradeValue:20});
  const lineup=optimalLineup([...ids,'flex'],p,{starterIds:['q','r1','r2','w1','w2','t1','flex','kicker','DEF']});
  expect(lineup.source).toBe('set');expect(lineup.flexId).toBe('flex');expect(lineup.starters.filter(p=>p.position==='QB')).toHaveLength(1);
 });
 it('never treats duplicate starter IDs as two separate slots',()=>{
  const lineup=optimalLineup(ids,pool,{starterIds:['q','r1','r1','w1','w2','t1','t2']});
  expect(lineup.source).toBe('optimized');expect(new Set(lineup.starters.map(p=>p.id)).size).toBe(lineup.starters.length);
 });
 it('prices 12-team full-PPR receiving work and DFL QB scoring from raw stats',()=>{
  const rosters=Array.from({length:12},()=>({players:['receiving','rushing','qb','kicker','DEF']}));
  const projections=[{player_id:'receiving',player:{position:'RB'},stats:{rec:80,rec_yd:800}},{player_id:'rushing',player:{position:'RB'},stats:{rush_yd:800}},{player_id:'qb',player:{position:'QB'},stats:{pass_yd:4000,pass_td:30,pass_int:10,bonus_pass_yd_300:4}}];
  const input={rosters,projections,scoringSettings:{rec:1,rec_yd:.1,rush_yd:.1,pass_yd:.04,pass_td:4,pass_int:-2,bonus_pass_yd_300:1}};
  const p=buildPlayerPool(input),half=buildPlayerPool({...input,scoringSettings:{...input.scoringSettings,rec:.5}});
  expect(p.get('receiving').projectedPoints).toBe(160);expect(p.get('rushing').projectedPoints).toBe(80);expect(p.get('qb').projectedPoints).toBe(264);
  expect(p.get('receiving').tradeValue).toBeGreaterThan(p.get('rushing').tradeValue);
  expect(p.get('receiving').projectedPoints-half.get('receiving').projectedPoints).toBe(40);
  expect(p.has('kicker')).toBe(false);expect(p.has('DEF')).toBe(false);
 });
});
