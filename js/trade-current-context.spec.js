import {describe,it,expect} from 'vitest';
import facts from '../tools/fixtures/trade-context-2026-11-25.json';
import {buildPlayerPool} from './team-analyzer.js';
import {currentAvailabilityReport,expertContextFactor} from './player-value-context.js';
import {injuryAvailabilityIndex} from './player-availability.js';
import {incomingTradeRisks,incomingTradeRiskMarkup} from './trade-decision-ui.js';

const input=()=>({...facts,recentStats:facts.weeks,seasonWeeklyStats:facts.weeks,
 rosters:Array.from({length:12},(_,i)=>({roster_id:i+1,players:i===0?['13345','10229','12533']:i===1?['4034','5859','11564','11292']:[]}))});

describe('current trade context across injury absences',()=>{
 it('uses the last three played games across an absence, preserving real zeroes and skipping non-playing rows',()=>{
  const pool=buildPlayerPool(input()),merritt=pool.get('12533'),brown=pool.get('5859');
  expect(merritt.recentGames).toBe(3);expect(merritt.recentAverage).toBeCloseTo((7+14.2+15.7)/3);
  expect(brown.recentGames).toBe(3);expect(brown.recentAverage).toBeCloseTo((5.7+7.8+4.7)/3);
  const args=input();args.recentStats=[[{player_id:'12533',stats:{gp:1,rec:0}}],[],[{player_id:'12533',stats:{gp:0}}],[],[{player_id:'12533',stats:{gp:1,rec:2}}]];
  expect(buildPlayerPool(args).get('12533')).toMatchObject({recentGames:2,recentAverage:1});
 });
 it('recognizes the rising lead role without treating three touchdown totals as a guaranteed future average',()=>{
  const coleman=buildPlayerPool(input()).get('13345');
  expect(coleman.valueContext.roleChange).toBe('expanded');expect(coleman.recentAverage).toBeCloseTo(25.0333,3);
  expect(coleman.forwardPerGame).toBeGreaterThan(18);expect(coleman.forwardPerGame).toBeLessThan(coleman.recentAverage);
 });
 it('accounts for current poor production, a doubtful designation and a lost QB without a special rule for the name',()=>{
  const args=input(),pool=buildPlayerPool(args),brown=pool.get('5859');
  expect(brown.contextRisks).toContain('QB change');expect(brown.injuryStatus).toBe('Doubtful');
  expect(brown.forwardPerGame).toBeLessThan(7);expect(brown.tradeValue).toBeLessThan(pool.get('10229').tradeValue);
  const newerOpinion=buildPlayerPool({...args,expertRankings:{...args.expertRankings,updatedAt:args.now}}).get('5859');
  expect(brown.expertWeight).toBeLessThan(newerOpinion.expertWeight);
  expect(brown.currentPoints).toBe(newerOpinion.currentPoints);expect(brown.tradeValue).toBeLessThanOrEqual(newerOpinion.tradeValue);
 });
 it('uses dated current injury news over an older healthy weekly placeholder, then honors later clearance',()=>{
  const now=facts.now,report={date:new Date(now-3600000).toISOString(),status:'Out',athlete:{displayName:'Receiver',position:{abbreviation:'WR'},team:{abbreviation:'KC'}}};
  const make=(r=report)=>injuryAvailabilityIndex({injuries:[{injuries:[r]}]},{season:2026,now});
  const player={name:'Receiver',nflTeam:'KC',position:'WR'};
  expect(currentAvailabilityReport(player,{injuryIndex:make(),now})).toMatchObject({status:'Out'});
  expect(currentAvailabilityReport(player,{injuryIndex:make({...report,status:'Active'}),now})).toMatchObject({status:null});
  expect(currentAvailabilityReport(player,{injuryIndex:make(),newsUpdatedAt:now,now})).toBeNull();
  expect(currentAvailabilityReport(player,{injuryIndex:make({...report,date:new Date(now-15*86400000).toISOString()}),now})).toBeNull();
  const args={rosters:[{players:['r']}],players:{r:{n:'Receiver',p:'WR',t:'KC'}},weeklyProjections:[{player_id:'r',player:{injury_status:null}}],projections:[{player_id:'r',stats:{rec:100}}],season:2026,currentWeek:12,now,injuryReport:{injuries:[{injuries:[report]}]}};
  expect(buildPlayerPool(args).get('r')).toMatchObject({injuryStatus:'Out',isOut:true,estimatedMissedGames:1,injuryStatusUpdatedAt:now-3600000});
  const newerCatalog={...args,players:{r:{n:'Receiver',p:'WR',t:'KC',i:'Doubtful',nu:now-1800000}},weeklyProjections:[],injuryReport:{injuries:[{injuries:[{...report,status:'Active'}]}]}};
  expect(buildPlayerPool(newerCatalog).get('r')).toMatchObject({injuryStatus:'Doubtful',injuryStatusUpdatedAt:now-1800000});
 });
 it('does not reduce fresh opinions for old news, routine healthy updates or an unrelated player',()=>{
  const p={availabilityUpdatedAt:20,isRisky:true,injuryStatus:'Doubtful'};
  expect(expertContextFactor(p,10)).toBe(.35);expect(expertContextFactor({...p,availabilityUpdatedAt:1,injuryStatusUpdatedAt:20},10)).toBe(.35);expect(expertContextFactor(p,30)).toBe(1);
  expect(expertContextFactor({...p,isRisky:false},10)).toBe(1);
  expect(expertContextFactor({...p,injuryStatus:'Questionable'},10)).toBe(.7);
  expect(expertContextFactor({valueContext:{quarterback:{updatedAt:20}}},10)).toBe(.35);
 });
 it('makes incoming uncertainty visible independently of a balanced price, including three-way routes',()=>{
  const pool=buildPlayerPool(input()),deal={sendA:['13345','10229','12533'],sendB:['4034','5859']};
  expect(incomingTradeRisks(deal,pool).map(r=>r.player.id)).toEqual(['5859']);
  const html=incomingTradeRiskMarkup(deal,pool);expect(html).toContain('Risky return');expect(html).toContain('A.J. Brown');expect(html).toContain('Doubtful');expect(html).toContain('QB change');
  expect(incomingTradeRisks({sendA:['5859'],sendB:['13345']},pool)).toEqual([]);
  const routed={values:[10,20,30],weeklyDeltas:[0,0,0],receives:[['4034'],['5859'],['13345']],sends:[['13345'],['4034'],['5859']]};
  expect(incomingTradeRisks(routed,pool)).toEqual([]);
  pool.set('5859',{...pool.get('5859'),name:'<img src=x>'});expect(incomingTradeRiskMarkup(deal,pool)).not.toContain('<img');
 });
});
