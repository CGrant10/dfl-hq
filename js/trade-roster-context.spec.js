import {describe,it,expect} from 'vitest';
import {tradeRosterContext,safeBalancedTrade} from './trade-roster-context.js';
import {evaluateTrade,evaluateMultiTeamTrade,suggestTrades} from './team-analyzer.js';
import {tradeSuggestionQuality,usefulFairTrade} from './trade-suggestion-quality.js';
import {tradeAssessment} from './trade-assessment.js';
import {tradeCoverageMarkup} from './trade-roster-ui.js';
const player=(id,position,pace,value=40,extra={})=>({id,name:id,position,nflTeam:'KC',expectedPoints:pace*17,expectedPerGame:pace,tradePerGame:pace,tradeValue:value,...extra});
function fixture(){
 const players=[player('walker','RB',16,60),player('cook','RB',17,65),player('johnson','RB',5,20,{handcuffForId:'walker'}),player('spare','RB',9,20,{nflTeam:'DEN'}),player('qb','QB',19),player('wr1','WR',17),player('wr2','WR',14),player('flex','WR',12),player('te','TE',9),player('upgrade','WR',13,20),player('elite','WR',25,20)];
 const pool=new Map(players.map(p=>[p.id,p]));
 const a={id:'a',playerIds:['walker','cook','johnson','spare','qb','wr1','wr2','flex','te']};
 const b={id:'b',playerIds:['upgrade','elite']};return {pool,a,b};
}
describe('roster insurance in trade decisions',()=>{
 it('flags losing an owned starter’s handcuff and values acquiring the coverage',()=>{
  const {pool,a}=fixture(),after=a.playerIds.filter(id=>id!=='johnson');
  const lost=tradeRosterContext(a.playerIds,after,pool);expect(lost.lostHandcuffs).toEqual([{playerId:'johnson',starterId:'walker',penalty:1}]);expect(lost.penalty).toBeGreaterThan(1);
  const gain=tradeRosterContext(after,a.playerIds,pool);expect(gain.gainedHandcuffs).toHaveLength(1);expect(gain.gain).toBeGreaterThan(0);
 });
 it('does not invent a handcuff for unrelated, unknown or season-ending players',()=>{
  const {pool,a}=fixture();
  for(const extra of [{handcuffForId:null},{nflTeam:'DEN'},{outForSeason:true}]){const changed=new Map(pool);changed.set('johnson',{...pool.get('johnson'),...extra});expect(tradeRosterContext(a.playerIds,a.playerIds.filter(id=>id!=='johnson'),changed).lostHandcuffs).toHaveLength(0);}
 });
 it('raises the insurance cost when the protected starter is injured and does not penalize moving both backs together',()=>{
  const {pool,a}=fixture();pool.get('walker').isRisky=true;
  expect(tradeRosterContext(a.playerIds,a.playerIds.filter(id=>id!=='johnson'),pool).lostHandcuffs[0].penalty).toBe(1.75);
  expect(tradeRosterContext(a.playerIds,a.playerIds.filter(id=>!['johnson','walker'].includes(id)),pool).lostHandcuffs).toHaveLength(0);
  pool.get('walker').outForSeason=true;
  expect(tradeRosterContext(a.playerIds,a.playerIds.filter(id=>id!=='johnson'),pool).lostHandcuffs).toHaveLength(0);
 });
 it('recognizes the last usable RB reserve without valuing fringe roster bodies as insurance',()=>{
  const {pool}=fixture();const ids=['walker','cook','spare'];
  expect(tradeRosterContext(ids,ids.slice(0,2),pool).depth[0]).toMatchObject({position:'RB',before:1,after:0});
  pool.get('spare').tradeValue=1;expect(tradeRosterContext(ids,ids.slice(0,2),pool).depth).toHaveLength(0);
 });
 it('keeps quoted balance distinct from a poor recommendation, but permits a meaningful starter upgrade',()=>{
  const {pool,a,b}=fixture();
  const marginal=evaluateTrade({teamA:a,teamB:b,sendA:['johnson'],sendB:['upgrade'],pool});
  expect(marginal.fairness).toBe(100);expect(marginal.rosterSafeguards[0].lostHandcuffs).toHaveLength(1);expect(safeBalancedTrade(marginal)).toBe(false);expect(usefulFairTrade(marginal)).toBe(false);
  const better=evaluateTrade({teamA:a,teamB:b,sendA:['johnson'],sendB:['elite'],pool});
  expect(better.weeklyDeltaA).toBeGreaterThan(5);expect(better.rosterSafeguards[0].lostHandcuffs).toHaveLength(1);
  const neutral={...better,weeklyDeltaB:0,rosterImpactB:0};expect(safeBalancedTrade(neutral)).toBe(true);
  expect(tradeSuggestionQuality(neutral).group).toBeGreaterThan(tradeSuggestionQuality(marginal).group);
  const benchImprovement={...neutral,weeklyDeltaA:0,rosterImpactA:4};
  expect(safeBalancedTrade(benchImprovement)).toBe(false);
  expect(tradeSuggestionQuality(benchImprovement).group).toBe(0);
 });
 it('finds coverage risk for every party in a routed three-team trade',()=>{
  const {pool,a,b}=fixture(),c={id:'c',playerIds:['elite']},other={...b,playerIds:['upgrade']};
  const result=evaluateMultiTeamTrade({teams:[other,a,c],sends:[['upgrade'],['johnson'],['elite']],destinations:{upgrade:'a',johnson:'c',elite:'b'},pool});
  expect(result.rosterSafeguards[1].lostHandcuffs[0].playerId).toBe('johnson');expect(result.rosterSafeguards[0].lostHandcuffs).toHaveLength(0);
 });
 it('labels value direction independently of uncertain evidence and shows named coverage compactly',()=>{
  const result={fairness:75,valueToA:100,valueToB:75,projectionEvidence:{stale:['Receiver']}};
  expect(tradeAssessment(result).price.headline).toBe('Favors you');expect(tradeAssessment({...result,valueToA:75,valueToB:100}).price.headline).toBe('You’re overpaying');
  const {pool,a,b}=fixture(),deal=evaluateTrade({teamA:a,teamB:b,sendA:['johnson'],sendB:['upgrade'],pool});
  expect(tradeCoverageMarkup(deal,pool)).toContain('Handcuff lost');expect(tradeCoverageMarkup(deal,pool)).toContain('johnson');expect(tradeCoverageMarkup(deal,pool)).toContain('walker');
 });
 it('keeps automated Fair suggestions from spending the handcuff for a marginal exchange',()=>{
  const {pool,a,b}=fixture();
  const offers=suggestTrades({teams:[a,b],teamId:a.id,pool,intent:'fair',maxPlayers:2,limit:30});
  expect(offers.filter(o=>o.tier==='fair').every(o=>safeBalancedTrade(o))).toBe(true);
  expect(offers.some(o=>o.tier==='fair'&&o.sendA.includes('johnson'))).toBe(false);
 });
 it('counts forced drops separately from the quoted package balance',()=>{
  const pool=new Map([player('a','WR',15,55),player('reserve','RB',9,15),player('b','WR',14,40),player('extra','RB',10,15)].map(p=>[p.id,p]));
  const a={id:'a',playerIds:['a','reserve']},b={id:'b',playerIds:['b','extra']};
  const result=evaluateTrade({teamA:a,teamB:b,sendA:['a'],sendB:['b','extra'],pool});
  expect(result.requiredDropsA).toEqual(['reserve']);expect(result.rosterCostA).toBe(15);
  expect(result.fairness).toBe(100);expect(result.netBalanceA).toBeCloseTo(72.7,1);expect(safeBalancedTrade(result)).toBe(false);
  expect(tradeAssessment(result).price.headline).toBe('You’re overpaying');
 });
 it('keeps a price estimate while excluding an unverified RB-role edge from Steal',()=>{
  const result={fairness:60,valueToA:100,valueToB:60,incomingEvidence:{low:90,high:110},outgoingEvidence:{low:50,high:70},projectionEvidence:{backfield:{required:true,status:'Unavailable'}}};
  expect(tradeAssessment(result).price.headline).toBe('Favors you');expect(tradeAssessment(result).tier).toBe('aggressive');expect(tradeAssessment(result).flags).toContain('RB roles unavailable');
 });
});
