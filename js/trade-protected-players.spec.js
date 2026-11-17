import {describe,it,expect} from 'vitest';
import {protectedPlayerIds,readProtectedPlayers,writeProtectedPlayers,setProtectedPlayers} from './trade-protected-players.js';
import {suggestTrades,suggestMultiTeamTrades,evaluateTrade} from './team-analyzer.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
import {evaluateTradeDeal} from './trade-workspace.js';
import {planTradeCounteroffers} from './trade-counter-plan.js';
import {replaceBoardPlayer} from './trade-offer-board-model.js';
import {runTradeOfferQuery} from './trade-offer-query.js';
import {resetTradeSearch} from './trade-draft.js';

const {teams,pool}=tradeReviewFixture(),mine=teams[0],other=teams[1];
const storage=()=>{const rows=new Map();return {getItem:key=>rows.get(key),setItem:(key,value)=>rows.set(key,value)}};
describe('private Don’t trade preferences',()=>{
 it('reconciles current ownership and removes protected anchors',()=>{
  expect(protectedPlayerIds(['1-4','1-4','2-4','gone'],mine)).toEqual(['1-4']);
  const shop={sendAnchors:['1-4','1-3'],receiveAnchors:['2-6']};setProtectedPlayers(shop,['1-4','2-4'],mine);
  expect(shop.sendAnchors).toEqual(['1-3']);expect(shop.receiveAnchors).toEqual(['2-6']);expect(shop.excludedSendIds).toEqual(['1-4']);
  resetTradeSearch(shop);expect(shop.excludedSendIds).toEqual(['1-4']);expect(shop.partnerId).toBe('all');
 });
 it('saves independently by member, season and roster, including Clear all',()=>{
  const store=storage();expect(writeProtectedPlayers('a',2026,mine,['1-4'],store)).toBe(true);
  expect(readProtectedPlayers('a',2026,mine,store)).toEqual(['1-4']);
  expect(readProtectedPlayers('b',2026,mine,store)).toEqual([]);expect(readProtectedPlayers('a',2027,mine,store)).toEqual([]);expect(readProtectedPlayers('a',2026,other,store)).toEqual([]);
  expect(readProtectedPlayers('a',2026,{...mine,playerIds:[]},store)).toEqual([]);
  writeProtectedPlayers('a',2026,mine,[],store);expect(readProtectedPlayers('a',2026,mine,store)).toEqual([]);
 });
 it('survives invalid or unavailable browser storage',()=>{
  expect(readProtectedPlayers('a',2026,mine,{getItem:()=>'{'})).toEqual([]);
  expect(readProtectedPlayers('a',2026,mine,{getItem:()=>{throw Error()}})).toEqual([]);
  expect(writeProtectedPlayers('a',2026,mine,[],{setItem:()=>{throw Error()}})).toBe(false);
  const before=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
  try{Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('Storage denied')}});expect(readProtectedPlayers('a',2026,mine)).toEqual([]);expect(writeProtectedPlayers('a',2026,mine,[])).toBe(false)}finally{if(before)Object.defineProperty(globalThis,'localStorage',before);else delete globalThis.localStorage}
 });
});
describe('protected players remain on the roster but out of automatic offers',()=>{
 for(const intent of ['fair','aggressive','steal'])it(`honors the hard exclusion in ${intent} searches and refinements`,()=>{
  const excludedSendIds=['1-3','1-4'],before=JSON.stringify(mine.playerIds);
  const offers=suggestTrades({teams,pool,teamId:mine.id,intent,excludedSendIds,limit:36});
  expect(offers.length).toBeGreaterThan(0);
  for(const offer of offers){
   expect(offer.sendA.some(id=>excludedSendIds.includes(id))).toBe(false);
   const regraded=evaluateTrade({teamA:mine,teamB:offer.other,sendA:offer.sendA,sendB:offer.sendB,pool});
   expect(offer.weeklyDeltaA).toBe(regraded.weeklyDeltaA);expect(offer.fairness).toBe(regraded.fairness);
  }
  expect(JSON.stringify(mine.playerIds)).toBe(before);
 });
 it('rejects conflicting send anchors and an entirely protected roster',()=>{
  expect(suggestTrades({teams,pool,teamId:mine.id,sendAnchorIds:['1-4'],excludedSendIds:['1-4']})).toEqual([]);
  expect(suggestTrades({teams,pool,teamId:mine.id,excludedSendIds:mine.playerIds})).toEqual([]);
 });
 it('does not exclude an incoming player from another roster',()=>{
  const offers=suggestTrades({teams,pool,teamId:mine.id,partnerId:other.id,receiveAnchorIds:['2-6'],excludedSendIds:['2-6'],limit:36});
  expect(offers.length).toBeGreaterThan(0);expect(offers.every(o=>o.sendB.includes('2-6'))).toBe(true);
 });
 it('passes the rule through worker queries and multi-team generation',()=>{
  const query={teamId:mine.id,intent:'fair',excludedSendIds:['1-3','1-4'],limit:36};
  const bilateral=runTradeOfferQuery({teams,pool},query);expect(bilateral.length).toBeGreaterThan(0);expect(bilateral.every(o=>!o.sendA.some(id=>query.excludedSendIds.includes(id)))).toBe(true);
  const multi=suggestMultiTeamTrades({parties:teams.slice(0,3),pool,intent:'fair',excludedSendIds:['1-1','1-3'],limit:36});
  expect(multi.length).toBeGreaterThan(0);expect(multi.every(o=>!o.sends[0].some(id=>['1-1','1-3'].includes(id)))).toBe(true);
 });
 it('keeps manual grading available, while counters can replace a protected main piece',async()=>{
  const deal=evaluateTradeDeal([mine,other],[['1-4'],['2-6']],pool),before=JSON.stringify(deal.sends);
  expect(deal.result).toBeTruthy();
  const plan=await planTradeCounteroffers(deal,pool,{excludedSendIds:['1-4','1-3'],yieldTask:()=>Promise.resolve()});
  expect(plan.candidates.length).toBeGreaterThan(0);expect(plan.candidates.every(o=>!o.sends[0].some(id=>['1-4','1-3'].includes(id)))).toBe(true);
  expect(JSON.stringify(deal.sends)).toBe(before);
  const locked=await planTradeCounteroffers(deal,pool,{excludedSendIds:['1-4'],lockedIds:['1-4']});expect(locked.kind).toBe('constraints');expect(locked.candidates).toEqual([]);
 });
 it('does not offer a protected player through Swap',()=>{
  const deal=evaluateTradeDeal([mine,other],[['1-4'],['2-6']],pool);
  expect(replaceBoardPlayer(deal,0,'1-4','1-3',pool,{excludedSendIds:['1-3']})).toBeNull();
  expect(replaceBoardPlayer(deal,1,'2-6','2-3',pool,{excludedSendIds:['2-3']})).not.toBeNull();
 });
});
