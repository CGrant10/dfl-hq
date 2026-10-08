import {describe,it,expect} from 'vitest';
import {buildPlayerPool,evaluateTrade,evaluateMultiTeamTrade} from './team-analyzer.js';
import {tradePerspective} from './trade-routing.js';
function fixture({names={},pace={},adp={},injury={}}={}){
 const projections=[],players={};
 const add=(id,position,points)=>{
  players[id]={n:names[id]||id,p:position,i:injury[id]};
  projections.push({player_id:id,player:{position},stats:{[position==='QB'?'pass_yd':'rec']:points*17*(position==='QB'?25:1),...(adp[id]?{adp_ppr:adp[id]}:{})}});
 };
 const qbs=[28,24,23,22,...Array(8).fill(20),...Array(20).fill(18)];
 qbs.forEach((points,i)=>add(`q${i}`,'QB',pace[`q${i}`]??points));
 for(const position of ['RB','WR','TE'])Array.from({length:50},(_,i)=>add(`${position}${i}`,position,i===0?28:i===1?16:i===2?14:8));
 const rosters=Array.from({length:12},(_,i)=>({players:projections.filter((_,j)=>j%12===i).map(p=>p.player_id)}));
 return {rosters,players,projections,scoringSettings:{pass_yd:.04,rec:1}};
}
describe('1QB asset pricing',()=>{
 it('prices ordinary starters below useful RB, WR and TE assets despite higher raw QB points',()=>{
  const p=buildPlayerPool(fixture({names:{q0:'Josh Allen',q3:'Jared Goff'}})),qb=p.get('q3');
  expect(qb.tradePerGame).toBe(22);expect(qb.oneQbStarterBaseline).toBe(20);
  expect(qb.oneQbValueFactor).toBe(.35);
  for(const id of ['RB1','WR1','TE2'])expect(qb.tradeValue).toBeLessThan(p.get(id).tradeValue);
  expect(qb.tradeValue).toBeLessThan(15);
  expect(p.get('q12').tradeValue).toBe(1);
 });
 it('keeps a meaningful premium for a true Allen-level scoring edge',()=>{
  const p=buildPlayerPool(fixture({names:{q0:'Josh Allen'}}));
  expect(p.get('q0').oneQbValueFactor).toBe(1);
  expect(p.get('q0').tradeValue).toBeGreaterThan(p.get('WR1').tradeValue);
  expect(p.get('q0').tradeValue).toBeGreaterThan(p.get('q3').tradeValue*4);
 });
 it('uses forecast advantage rather than a hard-coded famous-name exception',()=>{
  const a=buildPlayerPool(fixture({names:{q0:'Unheralded QB',q3:'Josh Allen'}})),b=buildPlayerPool(fixture({names:{q0:'Josh Allen',q3:'Unheralded QB'}}));
  expect(a.get('q0').tradeValue).toBe(b.get('q0').tradeValue);
  expect(a.get('q3').tradeValue).toBe(b.get('q3').tradeValue);
  expect(a.get('q3').oneQbValueFactor).toBe(.35);
 });
 it('earns premium smoothly and preserves forecast points when discounting assets',()=>{
  const a=buildPlayerPool(fixture({pace:{q1:23.99}})),b=buildPlayerPool(fixture({pace:{q1:24.01}}));
  expect(a.get('q1').oneQbValueFactor).toBeLessThan(b.get('q1').oneQbValueFactor);
  expect(Math.abs(a.get('q1').tradeValue-b.get('q1').tradeValue)).toBeLessThanOrEqual(1);
  expect(a.get('q3').expectedPoints).toBe(22*17);
  expect(a.get('q3').tradePerGame).toBe(22);
 });
 it('discounts draft market influence too, without discounting skill positions',()=>{
  const a=buildPlayerPool(fixture()),b=buildPlayerPool(fixture({adp:{q3:1,WR1:1}}));
  expect(b.get('q3').tradeValue).toBeLessThan(b.get('WR1').tradeValue);
  expect(b.get('WR1').oneQbValueFactor).toBeNull();
  expect(b.get('WR1').tradeValue).toBeGreaterThan(a.get('WR1').tradeValue);
  for(const id of ['RB1','TE2','WR2'])expect(b.get(id).tradeValue).toBe(a.get(id).tradeValue);
 });
 it('does not keep an elite premium when availability removes the weekly edge',()=>{
  const healthy=buildPlayerPool(fixture()),hurt=buildPlayerPool(fixture({injury:{q0:'IR'}}));
  expect(hurt.get('q0').tradeValue).toBeLessThan(healthy.get('q0').tradeValue);
  expect(hurt.get('q0').oneQbValueFactor).toBeLessThan(1);
 });
 it('uses discounted values in actual two-team and directed group package totals',()=>{
  const pool=buildPlayerPool(fixture()),teams=[{id:'a',playerIds:['WR1']},{id:'b',playerIds:['q3']},{id:'c',playerIds:['RB2']}];
  const two=evaluateTrade({teamA:teams[0],teamB:teams[1],sendA:['WR1'],sendB:['q3'],pool});
  expect(two.valueToA).toBe(pool.get('q3').tradeValue);expect(two.valueToA).toBeLessThan(two.valueToB);
  const multi=evaluateMultiTeamTrade({teams,sends:[['WR1'],['q3'],['RB2']],destinations:{WR1:'c',q3:'a',RB2:'b'},pool});
  expect(tradePerspective(multi).valueToA).toBe(two.valueToA);
  expect(multi.routeValues.q3).toBe(two.valueToA);
 });
});
