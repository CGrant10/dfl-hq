import {describe,it,expect} from 'vitest';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
import {evaluateTradeDeal} from './trade-workspace.js';
import {planTradeCounteroffers} from './trade-counter-plan.js';
import {parseTradeOffer} from './trade-offer-import.js';

const {teams,pool}=tradeReviewFixture();
const options={yieldTask:()=>Promise.resolve()};
describe('received-offer counter plans',()=>{
 it('regrades every returned package without sending or changing the original offer',async()=>{
  const deal=evaluateTradeDeal(teams.slice(0,2),[['1-4'],['2-6']],pool),before=JSON.stringify(deal.sends);
  const plan=await planTradeCounteroffers(deal,pool,options);
  expect(plan.candidates.length).toBeGreaterThan(0);expect(plan.candidates.length).toBeLessThanOrEqual(3);
  for(const row of plan.candidates){
   expect(row.result).toEqual(evaluateTradeDeal(row.parties,row.sends,pool,row.destinations).result);
   expect(row.sends).not.toEqual(deal.sends);expect(row.sends.flat().length).toBeLessThanOrEqual(8);
   if(row.counterKind==='fair')expect(row.result.fairness).toBeGreaterThanOrEqual(90);
  }
  expect(JSON.stringify(deal.sends)).toBe(before);
 });
 it('can change a main player when small locked-core repairs cannot balance an offer',async()=>{
  const deal=evaluateTradeDeal(teams.slice(0,2),[['1-4'],['2-6']],pool);
  const plan=await planTradeCounteroffers(deal,pool,{...options,intent:'fair'});
  expect(plan.candidates.length).toBeGreaterThan(0);
  expect(plan.candidates.some(row=>row.changesMain)).toBe(true);
  for(const row of plan.candidates)if(row.result.fairness<90)expect(row.counterKind).toBe('closest');
 });
 it('preserves explicit locks and both directions of position exclusions',async()=>{
  const deal=evaluateTradeDeal(teams.slice(0,2),[['1-4'],['2-6']],pool);
  const plan=await planTradeCounteroffers(deal,pool,{...options,lockedIds:['1-4','2-6']});
  for(const row of plan.candidates){expect(row.sends[0]).toContain('1-4');expect(row.sends[1]).toContain('2-6');}
  const filtered=await planTradeCounteroffers(deal,pool,{...options,receivePositions:['WR']});
  for(const row of filtered.candidates)expect(row.sends.flat().every(id=>pool.get(id).position==='WR')).toBe(true);
  expect((await planTradeCounteroffers(deal,pool,{...options,receivePositions:[]})).kind).toBe('constraints');
 });
 it('does not invent a changed package when each team owns only its offered player',async()=>{
  const parties=teams.slice(0,2).map((t,i)=>({...t,playerIds:[`${i+1}-1`]}));
  const plan=await planTradeCounteroffers(evaluateTradeDeal(parties,[['1-1'],['2-1']],pool),pool,options);
  expect(plan.candidates).toEqual([]);expect(plan.kind).toBe('no-alternative');expect(plan.message).toBeTruthy();
 });
 it('cancels a broader search when the user changes the draft',async()=>{
  let current=true;
  const plan=await planTradeCounteroffers(evaluateTradeDeal(teams.slice(0,2),[['1-4'],['2-6']],pool),pool,{intent:'fair',active:()=>current,yieldTask:async()=>{current=false}});
  expect(plan.kind).toBe('cancelled');expect(plan.candidates).toEqual([]);
 });
 it('keeps split recipients valid in a three-team counter and excludes season-ending players',async()=>{
  const updated=new Map(pool),unavailable=teams[1].playerIds.at(-1);
  updated.set(unavailable,{...pool.get(unavailable),outForSeason:true,automaticTradeEligible:false});
  const parties=teams.slice(0,3),deal=evaluateTradeDeal(parties,[['1-1','1-3'],['2-1'],['3-3']],updated,{'1-1':'2','1-3':'3','2-1':'1','3-3':'1'});
  const plan=await planTradeCounteroffers(deal,updated,options);
  expect(plan.candidates.length).toBeGreaterThan(0);
  for(const row of plan.candidates){
   expect(row.sends.flat()).not.toContain(unavailable);
   expect(evaluateTradeDeal(row.parties,row.sends,updated,row.destinations)?.receives).toEqual(row.receives);
   expect(row.result).toEqual(evaluateTradeDeal(row.parties,row.sends,updated,row.destinations).result);
  }
 });
 it('yields during small repairs as well as the broader search',async()=>{
  let yields=0;
  const deal=evaluateTradeDeal(teams.slice(0,3),[['1-1','1-3'],['2-1'],['3-3']],pool,{'1-1':'2','1-3':'3','2-1':'1','3-3':'1'});
  const plan=await planTradeCounteroffers(deal,pool,{yieldTask:async()=>{yields++}});
  expect(plan.candidates.length).toBeGreaterThan(0);expect(yields).toBeGreaterThan(0);
 });
});

describe('player-name offer import',()=>{
 const a={id:'a',playerIds:['olave','cook','stbrown']},b={id:'b',playerIds:['lamb','devonta']},c={id:'c',playerIds:['douglas']};
 const players=new Map([
  ['olave',{id:'olave',name:'Chris Olave',position:'WR',tradeValue:50,expectedPoints:200}],
  ['cook',{id:'cook',name:'James Cook',position:'RB',tradeValue:60,expectedPoints:220}],
  ['stbrown',{id:'stbrown',name:'Amon-Ra St. Brown',position:'WR',tradeValue:85,expectedPoints:280}],
  ['lamb',{id:'lamb',name:'CeeDee Lamb',position:'WR',tradeValue:85,expectedPoints:280}],
  ['devonta',{id:'devonta',name:'DeVonta Smith',position:'WR',tradeValue:50,expectedPoints:200}],
  ['douglas',{id:'douglas',name:'Demario Smith',position:'WR',tradeValue:10,expectedPoints:100}],
 ]);
 const parse=(sendText,receiveText,rest={})=>parseTradeOffer({team:a,teams:[a,b,c],pool:players,sendText,receiveText,...rest});
 it('resolves punctuation, initials and separate names to exact roster IDs and recipients',()=>{
  const imported=parse('RB James Cook\nA. St. Brown','CeeDee Lamb; DeVonta Smith');
  expect(imported.ok).toBe(true);expect(imported.deal.sends).toEqual([['cook','stbrown'],['lamb','devonta']]);
  expect(imported.deal.receives[0]).toEqual(['lamb','devonta']);
  expect(imported.deal.destinations).toEqual({cook:'b',stbrown:'b',lamb:'a',devonta:'a'});
 });
 it.each([['Chris Olave','Chris Olave'],['CeeDee Lamb','Chris Olave'],['Chris Olave, Chris Olave','CeeDee Lamb'],['Unknown Player','CeeDee Lamb'],['Chris Olave','D. Smith']])('rejects wrong ownership, duplicates, unknown or ambiguous names: %s / %s',(give,get)=>{
  const result=parse(give,get);expect(result.ok).toBe(false);expect(result.errors.length).toBeGreaterThan(0);expect(result.deal).toBeUndefined();
 });
 it('does not guess additional legs in a multi-team proposal',()=>{
  const result=parse('Chris Olave','CeeDee Lamb, Demario Smith');expect(result.ok).toBe(false);expect(result.errors.join(' ')).toContain('multi-team');
 });
 it('enforces the package limit and accepts real IR players for review without approving them',()=>{
  expect(parse('James Cook, Chris Olave','CeeDee Lamb',{maxPlayers:2}).ok).toBe(false);
  const injured=new Map(players);injured.set('olave',{...players.get('olave'),outForSeason:true,automaticTradeEligible:false});
  expect(parse('Chris Olave','CeeDee Lamb',{pool:injured}).ok).toBe(true);
 });
});
