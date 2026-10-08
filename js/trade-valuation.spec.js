import {describe,it,expect} from 'vitest';
import {buildPlayerPool,evaluateTrade,evaluateMultiTeamTrade,tradeSuggestionTier,suggestTrades} from './team-analyzer.js';
import {recommendationFor,tradeReasons,verdictFor} from './trade-desk.js';
import {tradePerspective} from './trade-routing.js';
import {productionProfile,packageEvidence,playerSensitivity} from './trade-player-evidence.js';
const make=(id,position,pace,value)=>[id,{id,name:id,position,tradePerGame:pace,expectedPerGame:pace,expectedPoints:pace*17,tradeValue:value,modelSource:'projection',currentGames:5,consistency:{games:5,variation:.2}}];
const pool=new Map([make('Amon-Ra St. Brown','WR',19,90),make('CeeDee Lamb','WR',21,96),make('depth','RB',11,35),make('third','RB',14,45)]);
const a={id:'a',playerIds:['Amon-Ra St. Brown','depth']},b={id:'b',playerIds:['CeeDee Lamb']},c={id:'c',playerIds:['third']};
describe('honest trade prices and Steal offers',()=>{
 it('never labels Amon-Ra plus usable depth for CeeDee a steal',()=>{
  const result=evaluateTrade({teamA:a,teamB:b,sendA:a.playerIds,sendB:b.playerIds,pool});
  expect(result.valueToA).toBe(96);expect(result.valueToB).toBe(125);
  expect(result.comparableStarPremium).toBe(true);
  expect(tradeSuggestionTier(result)).toBe('aggressive');
  expect(recommendationFor(result).action).not.toBe('ACCEPT');
  expect(tradeReasons(result,a,b,pool,a.playerIds,b.playerIds)[0].title).toContain('Similar star');
  const offers=suggestTrades({teams:[a,b],teamId:'a',partnerId:'b',sendAnchorIds:a.playerIds,receiveAnchorIds:b.playerIds,pool,intent:'steal',maxPlayers:4,limit:96});
  // An implausible small-roster offer may be excluded entirely.
  expect(offers.every(o=>o.tier!=='steal')).toBe(true);
 });
 it('cannot turn an overpay into a steal through a huge lineup advantage',()=>{
  expect(tradeSuggestionTier({fairness:65,valueToA:65,valueToB:100,rosterImpactA:10,rosterImpactB:-1})).toBe('aggressive');
  expect(recommendationFor({fairness:65,valueToA:65,valueToB:100,rosterImpactA:10} ).action).toBe('PASS');
 });
 it('requires a value advantage that survives the sensitivity ranges',()=>{
  const result={fairness:70,valueToA:100,valueToB:70,rosterImpactA:1,rosterImpactB:0,incomingEvidence:{low:90,high:110},outgoingEvidence:{low:63,high:77}};
  expect(tradeSuggestionTier(result)).toBe('steal');
  expect(tradeSuggestionTier({...result,outgoingEvidence:{low:60,high:95}})).toBe('aggressive');
  for(const field of ['missing','fallback','injuries','stale'])expect(tradeSuggestionTier({...result,projectionEvidence:{[field]:['affected']}})).toBe('aggressive');
 });
 it('requires review before giving a decisive verdict on stale or injured data',()=>{
  for(const field of ['stale','injuries']){
   const result={valueToA:100,valueToB:20,fairness:20,weeklyDeltaA:5,projectionEvidence:{[field]:['affected']}};
   expect(verdictFor(result).who).toBeNull();expect(recommendationFor(result).action).toBe('REVIEW');
  }
 });
 it('keeps asset prices identical when the recipients’ depth changes',()=>{
  const args={teamA:a,teamB:b,sendA:['Amon-Ra St. Brown'],sendB:['CeeDee Lamb'],pool};
  const one=evaluateTrade(args),two=evaluateTrade({...args,teamB:{...b,playerIds:[...b.playerIds,'third','depth']}});
  expect(two.valueToA).toBe(one.valueToA);expect(two.valueToB).toBe(one.valueToB);
 });
 it('grades the actual outgoing package in a directed multi-member deal',()=>{
  const result=evaluateMultiTeamTrade({teams:[a,b,c],sends:[a.playerIds,b.playerIds,c.playerIds],destinations:{'Amon-Ra St. Brown':'b',depth:'c','CeeDee Lamb':'a',third:'a'},pool});
  const p=tradePerspective(result);expect(p.valueToA).toBe(141);expect(p.valueToB).toBe(125);
  expect(p.incomingEvidence.value).toBe(141);expect(p.outgoingEvidence.value).toBe(125);
  expect(result.routeValues.depth).toBe(35);
 });
 it('prices nearly equal projections nearly equally and gives spare parts a small price',()=>{
  const projections=Array.from({length:45},(_,i)=>({player_id:String(i),player:{position:'WR'},stats:{rec:i<2?340-i:220-i*3}}));
  const p=buildPlayerPool({rosters:Array.from({length:12},(_,i)=>({players:[String(i)]})),projections,scoringSettings:{rec:1}});
  expect(Math.abs(p.get('0').tradeValue-p.get('1').tradeValue)).toBeLessThanOrEqual(2);
  expect(p.get('0').replacementPerGame).toBeGreaterThan(0);
  expect(p.get('0').valuationBasis).toBe('replacement-points');
 });
 it('widens sensitivity for short, volatile, injured or stale samples',()=>{
  const healthy=pool.get('CeeDee Lamb');
  expect(playerSensitivity({...healthy,consistency:{games:2,variation:.8},currentGames:2})).toBeGreaterThan(playerSensitivity(healthy));
  expect(playerSensitivity({...healthy,isOut:true})).toBeGreaterThan(playerSensitivity(healthy));
  expect(playerSensitivity({...healthy,staleSignals:['availability']})).toBeGreaterThan(playerSensitivity(healthy));
  expect(packageEvidence(['depth','depth'],pool).value).toBe(35);
 });
 it('reports observed consistency without dropping played zero-point games',()=>{
  expect(productionProfile([{points:0},{points:10},{points:20},{points:30}])).toMatchObject({games:4,average:15,floor:7.5,ceiling:22.5});
  const input={rosters:[{players:['x']}],players:{x:{n:'X',p:'WR',t:'DET'}},projections:[{player_id:'x',stats:{rec:170}}],currentStats:{x:{gp:4,rec:50,rec_tgt:30,rush_att:2}},seasonWeeklyStats:[[{player_id:'x',stats:{gp:1,rec:0}}],[{player_id:'x',stats:{gp:0,rec:0}}],[{player_id:'x',stats:{gp:1,rec:20}}]],scoringSettings:{rec:1}};
  const p=buildPlayerPool(input).get('x');expect(p.consistency.games).toBe(2);expect(p.consistency.average).toBe(10);expect(p.targetsPerGame).toBe(7.5);expect(p.carriesPerGame).toBe(.5);
 });
});
