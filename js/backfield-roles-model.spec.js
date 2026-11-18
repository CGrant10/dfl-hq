import {describe,it,expect} from 'vitest';
import {assessBackfieldRoles,backfieldRoleIndex,BACKFIELD_MAX_AGE_MS} from './backfield-roles-model.js';
import {buildPlayerPool} from './team-analyzer.js';
const now=Date.now();
const facts=()=>({schemaVersion:1,source:'Sleeper',fetchedAt:now,players:Object.fromEntries(Array.from({length:32},(_,i)=>[String(i+1),{team:'KC',order:i%5+1}]))});
describe('current NFL backfield evidence',()=>{
 it('rejects stale, malformed, partial and future facts',()=>{
  expect(assessBackfieldRoles(facts(),{now}).usable).toBe(true);
  for(const data of [null,{...facts(),source:'Other'},{...facts(),players:{}},{...facts(),fetchedAt:now+300001},{...facts(),fetchedAt:now-BACKFIELD_MAX_AGE_MS-1}])expect(assessBackfieldRoles(data,{now}).usable).toBe(false);
 });
 it('only pairs a unique RB1 and RB2 and never assumes a third-stringer is the direct backup',()=>{
  const feed={usable:true,players:{walker:{team:'KC',order:1},johnson:{team:'KC',order:2},other:{team:'KC',order:3}}};
  expect(backfieldRoleIndex(feed).get('johnson').handcuffForId).toBe('walker');expect(backfieldRoleIndex(feed).get('other').handcuffForId).toBeNull();
  feed.players.tie={team:'KC',order:2};expect(backfieldRoleIndex(feed).get('johnson').handcuffForId).toBeNull();
  expect(backfieldRoleIndex({...feed,usable:false}).size).toBe(0);
 });
 it('carries verified roles into player values without adding an owner-specific market premium',()=>{
  const input={rosters:[{players:['8151','13337']}],players:{8151:{n:'Kenneth Walker',p:'RB',t:'KC'},13337:{n:'Emmett Johnson',p:'RB',t:'KC'}},projections:[{player_id:'8151',stats:{rec:200}},{player_id:'13337',stats:{rec:60}}],scoringSettings:{rec:1}};
  const plain=buildPlayerPool(input),pool=buildPlayerPool({...input,backfieldRoles:{usable:true,players:{8151:{team:'KC',order:1},13337:{team:'KC',order:2}}}});
  expect(pool.get('13337').handcuffForId).toBe('8151');expect(pool.get('13337').tradeValue).toBe(plain.get('13337').tradeValue);
  const moved=buildPlayerPool({...input,players:{...input.players,13337:{n:'Emmett Johnson',p:'RB',t:'DEN'}},backfieldRoles:{usable:true,players:{8151:{team:'KC',order:1},13337:{team:'KC',order:2}}}});
  expect(moved.get('13337').handcuffForId).toBeUndefined();
 });
});
