import {describe,it,expect} from 'vitest';
import {normalizeReceivePositions,setReceivePositions} from './trade-receive-controls.js';
import {suggestTrades,suggestMultiTeamTrades} from './team-analyzer.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
import {tradeDraft,restoreTradeDraft,resetTradeSearch,tradeSearchRestricted} from './trade-draft.js';

const {teams,pool}=tradeReviewFixture();
const base={teams,pool,teamId:'1',maxPlayers:4,limit:40};
describe('whole-trade position controls',()=>{
 it('keeps legacy searches unrestricted and an explicit empty selection empty',()=>{
  expect(normalizeReceivePositions()).toEqual(['QB','RB','WR','TE']);
  expect(normalizeReceivePositions(['WR','WR','invalid','RB'])).toEqual(['RB','WR']);
  expect(normalizeReceivePositions([])).toEqual([]);
  expect(suggestTrades({...base,receivePositions:[]})).toEqual([]);
  expect(suggestMultiTeamTrades({parties:teams.slice(0,3),pool,receivePositions:[]})).toEqual([]);
 });
 it.each(['fair','aggressive','steal'])('excludes QBs and TEs from both sides of every %s offer, including refinements',intent=>{
  const offers=suggestTrades({...base,intent,receivePositions:['RB','WR']});
  expect(offers.length).toBeGreaterThan(0);
  expect(offers.every(o=>o.sendB.every(id=>['RB','WR'].includes(pool.get(id).position)))).toBe(true);
  expect(offers.every(o=>o.sendA.every(id=>['RB','WR'].includes(pool.get(id).position)))).toBe(true);
  expect(offers.every(o=>o.sendA.length+o.sendB.length<=4)).toBe(true);
 });
 it('keeps the original all-position results and respects exclusions on anchored targets',()=>{
  const offers=suggestTrades(base);
  expect(suggestTrades({...base,receivePositions:['QB','RB','WR','TE']})).toEqual(offers);
  expect(suggestTrades({...base,partnerId:'2',receiveAnchorIds:['2-5'],receivePositions:['RB','WR']})).toEqual([]);
  expect(suggestTrades({...base,partnerId:'2',sendAnchorIds:['1-0'],receivePositions:['RB','WR']})).toEqual([]);
  expect(suggestTrades({...base,partnerId:'2',receiveAnchorIds:['2-3'],receivePositions:['WR']})).not.toHaveLength(0);
 });
 it('filters every leg of a three-team exchange',()=>{
  const options={parties:teams.slice(0,3),pool,maxPlayers:6,limit:40,receivePositions:['RB','WR']};
  const offers=suggestMultiTeamTrades(options);
  expect(offers.length).toBeGreaterThan(0);
  expect(offers.every(o=>o.receives[0].every(id=>['RB','WR'].includes(pool.get(id).position)))).toBe(true);
  expect(offers.every(o=>o.sends.flat().every(id=>['RB','WR'].includes(pool.get(id).position)))).toBe(true);
  expect(suggestMultiTeamTrades({...options,receiveAnchorIds:['3-5']})).toEqual([]);
  expect(suggestMultiTeamTrades({...options,sendAnchorIds:['1-0']})).toEqual([]);
 });
 it('clears excluded anchors on both sides and goals without changing a manual draft',()=>{
  const shop={receiveAnchors:['2-5','2-3'],sendAnchors:['1-0'],goal:'TE'},manual={sends:[new Set(['1-0']),new Set(['2-5'])]};
  setReceivePositions(shop,['RB','WR'],pool);
  expect(shop).toMatchObject({receivePositions:['RB','WR'],receiveAnchors:['2-3'],sendAnchors:[],goal:'best'});
  expect([...manual.sends[1]]).toEqual(['2-5']);
 });
 it('keeps filters through data refresh, restores empty selections and resets a new league-wide search',()=>{
  const shop={};resetTradeSearch(shop);setReceivePositions(shop,['WR'],pool);
  expect(tradeSearchRestricted(shop)).toBe(true);
  const trade={memberIds:['2'],sends:[new Set(['1-0']),new Set(['2-5'])]};
  const saved=tradeDraft({selectedId:'1',trade,shop});
  expect(restoreTradeDraft(saved,teams,'1').shop.receivePositions).toEqual(['WR']);
  saved.shop.receivePositions=[];expect(restoreTradeDraft(saved,teams,'1').shop.receivePositions).toEqual([]);
  delete saved.shop.receivePositions;expect(restoreTradeDraft(saved,teams,'1').shop.receivePositions).toEqual(['QB','RB','WR','TE']);
  resetTradeSearch(shop);expect(shop.receivePositions).toEqual(['QB','RB','WR','TE']);expect(tradeSearchRestricted(shop)).toBe(false);
 });
});
