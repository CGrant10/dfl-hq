import {describe,it,expect} from 'vitest';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
import {tradeTransfers,reconcileTradeDestinations,tradePerspective} from './trade-routing.js';
import {evaluateTradeDeal,lineupPreviewsFor,findTradeCounteroffers,savedTradeProposal,restoreTradeProposal,readTradeProposals,writeTradeProposals,applyTradeDeal} from './trade-workspace.js';
import {tradeShareSpec} from './share-export-model.js';
import {dealCardData,dealCardText} from './trade-card.js';
import {tradeDraft,restoreTradeDraft} from './trade-draft.js';
const {teams,pool}=tradeReviewFixture(),parties=teams.slice(0,3),sends=[['1-1','1-3'],['2-1'],['3-3']],routes={'1-1':'2','1-3':'3','2-1':'1','3-3':'1'};
const split=()=>evaluateTradeDeal(parties,sends,pool,routes);
const storage=()=>{const map=new Map();return {getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,value)};};
describe('explicit trade recipients',()=>{
 it('splits an owner’s package between members and combines incoming packages',()=>{expect(tradeTransfers(parties,sends,routes).receives).toEqual([['2-1','3-3'],['1-1'],['1-3']]);});
 it.each([
  [sends,{'1-1':'1',...routes,'1-3':'3','1-1':'1'}],
  [sends,{...routes,'1-3':'missing'}],
  [sends,{'1-1':'2','2-1':'1','3-3':'1'}],
  [[['1-1','1-1'],['2-1'],['3-3']],routes],
  [[['2-1'],['2-1'],['3-3']],routes],
  [sends,{...routes,'1-3':'2'}],
  [[[],['2-1'],['3-3']],routes],
 ])('rejects an invalid routing without producing a verdict (%#)',(packages,destinations)=>{expect(tradeTransfers(parties,packages,destinations)).toBeNull();expect(evaluateTradeDeal(parties,packages,pool,destinations)).toBeNull();});
 it('keeps chosen destinations when adding or reordering members',()=>{expect(reconcileTradeDestinations(teams,[...sends,[]],routes)).toEqual(routes);expect(reconcileTradeDestinations([parties[0],parties[2],parties[1]],[sends[0],sends[2],sends[1]],routes)).toEqual(routes);});
 it('requires a new recipient when a chosen member is removed from a multi-team deal',()=>{const next=reconcileTradeDestinations([teams[0],teams[1],teams[3]],[sends[0],sends[1],[]],routes);expect(next['1-3']).toBe('');expect(next['1-1']).toBe('2');});
 it('still supports legacy circular proposals and bilateral deals',()=>{expect(tradeTransfers(parties,sends).receives).toEqual([['3-3'],['1-1','1-3'],['2-1']]);expect(evaluateTradeDeal(teams.slice(0,2),[['1-1'],['2-1']],pool)).not.toBeNull();});
 it('allocates outgoing value to the actual recipient and balances each party',()=>{const deal=split(),r=deal.result;expect(r.receives).toEqual([['2-1','3-3'],['1-1'],['1-3']]);expect(r.outgoingValues[0]).toBeCloseTo(r.routeValues['1-1']+r.routeValues['1-3'],0);expect(r.values[0]).toBeCloseTo(r.routeValues['2-1']+r.routeValues['3-3'],0);expect(r.fairness).toBe(Math.min(...r.partyBalances));const p=tradePerspective(r);expect(p.valueToB).toBe(r.outgoingValues[0]);expect(p.weeklyDeltaB).toBeCloseTo(r.weeklyDeltas[1]+r.weeklyDeltas[2]);});
 it('shares every actual leg, including split sends, instead of a fixed circle',()=>{const deal=split(),card=dealCardData({...deal,pool,recommendation:{action:'NEGOTIATE'}});expect(card.columns).toHaveLength(4);expect(tradeShareSpec(card).context).toBe('3-team deal');expect(card.columns.slice(0,2).map(c=>c.to)).toEqual(['Klutch Sports Group','The Bayou Bombers']);expect(card.columns[3].to).toBe('Bastards of the Realm');expect(dealCardText(card)).toContain('The Bayou Bombers sends');expect(dealCardText(card)).toContain('to Bastards of the Realm');expect(card.columns.reduce((sum,c)=>sum+c.total,0)).toBeCloseTo(deal.result.values.reduce((a,b)=>a+b,0),0);});
});
describe('roster consequences and counteroffers',()=>{
 it('shows seven legal slots with no duplicated FLEX player, and matches the evaluated weekly change',()=>{const deal=split();lineupPreviewsFor(deal,pool).forEach((p,i)=>{expect(p.after.map(s=>s.slot)).toEqual(['QB','RB1','RB2','WR1','WR2','TE','FLEX']);const ids=p.after.filter(s=>s.player).map(s=>s.player.id);expect(new Set(ids).size).toBe(ids.length);expect(p.afterPoints-p.beforePoints).toBeCloseTo(deal.result.weeklyDeltas[i],0);expect([...p.after,...p.benchAfter.map(player=>({player}))].map(s=>s.player?.id)).not.toEqual(expect.arrayContaining(sends[i]));});});
 it('reports exact required cuts when incoming players overfill the roster',()=>{const deal=evaluateTradeDeal(teams.slice(0,2),[['1-9'],['2-1','2-3','2-4']],pool);const previews=lineupPreviewsFor(deal,pool);expect(previews[0].drops).toHaveLength(2);expect(previews[1].drops).toHaveLength(0);expect(previews[0].drops.some(p=>p.id==='1-9')).toBe(false);expect(previews[0].after.filter(s=>s.player).length+previews[0].benchAfter.length).toBe(teams[0].playerIds.length);});
 it('finds real, regraded improvements without dropping main pieces or sending any offer',()=>{const deal=evaluateTradeDeal(teams.slice(0,2),[['1-4'],['2-6']],pool),counters=findTradeCounteroffers(deal,pool);expect(counters.length).toBeGreaterThan(0);expect(counters.length).toBeLessThanOrEqual(3);for(const c of counters){expect(c.sends[0]).toContain('1-4');expect(c.sends[1]).toContain('2-6');expect(c.sends.flat().length).toBeLessThanOrEqual(8);expect(c.result).toEqual(evaluateTradeDeal(c.parties,c.sends,pool,c.destinations).result);expect(c.result.fairness).toBeGreaterThan(deal.result.fairness);expect(Math.min(c.result.rosterImpactA,c.result.rosterImpactB)).toBeGreaterThanOrEqual(-1);}});
 it('returns no invented suggestion when no unused piece is available',()=>{const parties=teams.slice(0,2).map((t,i)=>({...t,playerIds:[`${i+1}-1`]})),deal=evaluateTradeDeal(parties,[['1-1'],['2-1']],pool);expect(findTradeCounteroffers(deal,pool)).toEqual([]);});
 it('keeps explicitly locked extras in each counteroffer',()=>{const deal=evaluateTradeDeal(teams.slice(0,2),[['1-4','1-10'],['2-6']],pool);findTradeCounteroffers(deal,pool,{lockedIds:['1-10']}).forEach(c=>expect(c.sends[0]).toContain('1-10'));});
});
describe('saved comparisons and drafts',()=>{
 it('round-trips recipients and isolates profiles and seasons, keeping at most three comparisons',()=>{const st=storage(),row=savedTradeProposal(split(),{id:'one',at:1});expect(writeTradeProposals('me',2026,[row,row,row,row],st)).toBe(true);expect(readTradeProposals('me',2026,st)).toHaveLength(3);expect(readTradeProposals('them',2026,st)).toEqual([]);expect(readTradeProposals('me',2025,st)).toEqual([]);expect(restoreTradeProposal(row,teams,pool).destinations).toEqual(routes);});
 it('rejects stale ownership and missing saved recipients rather than modifying the deal',()=>{const row=savedTradeProposal(split());expect(restoreTradeProposal(row,teams.map(t=>({...t,playerIds:t.playerIds.filter(id=>id!=='1-1')})),pool)).toBeNull();expect(restoreTradeProposal({...row,destinations:{}},teams,pool)).toBeNull();});
 it('handles corrupt or blocked storage',()=>{expect(readTradeProposals('me',2026,{getItem:()=>'{'})).toEqual([]);const blocked={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}};expect(readTradeProposals('me',2026,blocked)).toEqual([]);expect(writeTradeProposals('me',2026,[],blocked)).toBe(false);});
 it('keeps routes and workspace mode in the session draft',()=>{const trade={};applyTradeDeal(trade,split());const shop={mode:'manual',openTiers:new Set(['fair']),customOpen:true};const restored=restoreTradeDraft(tradeDraft({selectedId:'1',trade,shop}),teams);expect(restored.trade.destinations).toEqual(routes);expect(restored.shop.mode).toBe('manual');expect(restored.trade.sends.map(s=>[...s])).toEqual(sends);});
});
