import {describe,it,expect} from 'vitest';
import {evaluateTrade,suggestTrades,tradeSuggestionTier,isPlausibleTradeSuggestion} from './team-analyzer.js';
import {refineTradeOffers} from './trade-refine-offers.js';
const fixture=()=>{
 const pool=new Map(),make=(id,rows)=>({id,playerIds:rows.map(([name,position,points,value])=>{const pid=id+name;pool.set(pid,{id:pid,name:pid,position,expectedPoints:points,tradeValue:value,modelSource:'projection',consistency:{games:8,variation:.2},expertFeedStatus:'Fresh',expert:{rank:20}});return pid;})});
 const teams=[make('a',[['wr1','WR',300,60],['wr2','WR',270,55],['rb1','RB',250,60],['rb2','RB',230,50],['te','TE',180,30],['qb','QB',330,15],['wr3','WR',180,25],['rb3','RB',150,20]]),make('b',[['wr1','WR',320,90],['wr2','WR',290,80],['rb1','RB',180,30],['rb2','RB',150,25],['te','TE',160,25],['qb','QB',300,15],['wr3','WR',250,50]])];
 return {teams,pool};
};
describe('nearby offer discovery',()=>{
 it('finds supported Steal offers with real starter fit and the same manual grade',()=>{
  const {teams,pool}=fixture();const offers=suggestTrades({teams,pool,teamId:'a',intent:'steal',maxPlayers:4,limit:24});
  const steals=offers.filter(o=>o.tier==='steal');expect(steals.length).toBeGreaterThan(0);
  for(const offer of steals){const checked=evaluateTrade({teamA:teams[0],teamB:teams[1],sendA:offer.sendA,sendB:offer.sendB,pool});expect(tradeSuggestionTier(checked)).toBe('steal');expect(isPlausibleTradeSuggestion(checked)).toBe(true);expect(offer.sendB.every(id=>pool.get(id).position!=='QB')).toBe(true);}
 });
 it('regrades edits, keeps locked players and shapes, and caps expensive evaluations',()=>{
  const {teams,pool}=fixture(),mine=teams[0],other=teams[1],seed={other,sendA:['arb1'],sendB:['bwr3'],shape:'1-1',fairness:83,weeklyDeltaA:0,weeklyDeltaB:1};
  let spent=0;const rows=refineTradeOffers([seed],{mine,pool,intent:'steal',shapes:new Set(['1-1','1-2']),maxPlayers:3,sendRequired:['arb1'],evaluate:c=>{spent++;return {...c,tier:tradeSuggestionTier(evaluateTrade({teamA:mine,teamB:other,...c,pool}))};},budget:4});
  expect(rows.length).toBeGreaterThan(0);expect(spent).toBeGreaterThan(0);expect(spent).toBeLessThanOrEqual(4);
  for(const row of rows){expect(row.sendA).toEqual(['arb1']);expect(row.sendA.length+row.sendB.length).toBeLessThanOrEqual(3);expect(tradeSuggestionTier(evaluateTrade({teamA:mine,teamB:other,...row,pool}))).toBe('steal');}
 });
 it('does not invent Steal support when the expert feed is stale',()=>{
  const {teams,pool}=fixture();for(const player of pool.values())player.expertFeedStatus='Stale';
  expect(suggestTrades({teams,pool,teamId:'a',intent:'steal',maxPlayers:4,limit:24}).some(o=>o.tier==='steal')).toBe(false);
 });
});
