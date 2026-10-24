import {describe,it,expect} from 'vitest';
import {negotiationProposal,negotiationDeal,negotiationActions,negotiationStatus,negotiationChanges,negotiationSleeperUrl} from './trade-negotiation-model.js';
import {evaluateTradeDeal} from './trade-workspace.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';

describe('Trade negotiation terms and permissions',()=>{
 it('keeps three-way recipients while putting the viewing manager first',()=>{
  const data=tradeReviewFixture();data.teams.forEach((t,i)=>t.sleeper_user_id='user'+i);
  const parties=data.teams.slice(0,3),deal=evaluateTradeDeal(parties,[['1-3'],['2-3'],['3-3']],data.pool,{'1-3':'3','2-3':'1','3-3':'2'}),proposal=negotiationProposal(deal);
  const restored=negotiationDeal(proposal,data,{sleeper_user_id:'user2'});
  expect(restored.parties.map(t=>t.id)).toEqual(['3','1','2']);
  expect(restored.receives[0]).toEqual(['1-3']);
  expect(negotiationProposal(restored)).toEqual(proposal);
  data.teams[0].playerIds=data.teams[0].playerIds.filter(id=>id!=='1-3');
  expect(negotiationDeal(proposal,data,{sleeper_user_id:'user2'})).toBeNull();
 });
 it('restricts drafts to their owner and replies to participating recipients',()=>{
  const room={owner_id:1,sender_id:1,member_ids:[1,2,3],accepted_ids:[1],status:'draft'};
  expect(negotiationActions(room,1)).toEqual(['edit','send','remove']);
  expect(negotiationActions(room,2)).toEqual([]);
  room.status='pending';
  expect(negotiationActions(room,1)).toEqual(['withdraw']);
  expect(negotiationActions(room,2)).toEqual(['counter','accept','decline']);
  expect(negotiationActions(room,4)).toEqual([]);
  room.accepted_ids.push(2);
  expect(negotiationActions(room,2)).toEqual(['counter','decline']);
  expect(negotiationStatus(room,1)).toBe('Waiting · 2/3 agreed');
  expect(negotiationStatus(room,3)).toBe('Your move');
  room.status='agreed';expect(negotiationActions(room,2)).toEqual([]);
  expect(negotiationStatus(room,2)).toBe('Agreed in DFL');
 });
 it('reports additions, removals and routing changes independently of display order',()=>{
  const before={teamIds:['1','2','3'],sends:[['a','b'],['c'],['d']],destinations:{a:'2',b:'3',c:'1',d:'2'}},after={teamIds:['3','1','2'],sends:[['d'],['a','e'],['c']],destinations:{a:'3',e:'2',c:'1',d:'2'}};
  expect(negotiationChanges(before,after)).toEqual([{id:'b',kind:'removed',from:'1',to:'3'},{id:'a',kind:'rerouted',from:'1',to:'3'},{id:'e',kind:'added',from:'1',to:'2'}]);
 });
 it('opens only a real Sleeper league URL and never claims to submit a trade',()=>{
  expect(negotiationSleeperUrl({league_id:'123456'})).toBe('https://sleeperbot.app.link/esEa7TDlJN');
  expect(negotiationSleeperUrl({league_id:'javascript:alert(1)'})).toBeNull();
 });
});
