import {describe,it,expect} from 'vitest';
import {evaluateTrade,suggestTrades,tradeSuggestionTier,optimalLineup} from './team-analyzer.js';
import {tradeAssessment} from './trade-assessment.js';
import {tradeSuggestionQuality,tradePartnerFit} from './trade-suggestion-quality.js';
import {balanceTradeSuggestions} from './trade-auto-balance.js';
import {tradeDecisionMarkup} from './trade-decision-ui.js';
import {tradeDraft,restoreTradeDraft} from './trade-draft.js';

// Controlled full-PPR, 12-team, 1QB/2RB/2WR/TE/FLEX scenarios. These are
// football invariants, not claims about today's rankings or a win probability.
function fixture(){
 const pool=new Map();
 const roster=(id,need,rows)=>({id,need,playerIds:rows.map(([role,position,pace,value,club='ATL'])=>{
  const pid=`${id}-${role}`;pool.set(pid,{id:pid,name:pid,position,nflTeam:club,expectedPoints:pace*17,expectedPerGame:pace,tradePerGame:pace,forwardPerGame:pace,tradeValue:value,modelSource:'projection'});return pid;
 })});
 const a=roster('a','WR',[['qb','QB',18,20],['rb1','RB',24,95],['rb2','RB',22,90],['flex','RB',20,80],['spare','RB',18,60],['wr1','WR',10,25],['wr2','WR',9,20],['te','TE',10,30],['lateral','WR',8,15]]);
 const b=roster('b','RB',[['qb','QB',18,20],['wr1','WR',24,95],['wr2','WR',22,90],['flex','WR',20,80],['spare','WR',18,60,'KC'],['rb1','RB',10,25],['rb2','RB',9,20],['te','TE',10,30],['lateral','WR',8,15]]);
 const teams=[a,b,...Array.from({length:10},(_,i)=>roster('other'+i,'TE',[['qb','QB',18,20],['te','TE',10,30]]))];
 return {pool,a,b,teams};
}
describe('trade desk football benchmarks',()=>{
 it('finds the surplus RB/WR exchange that improves both legal starting lineups',()=>{
  const {pool,a,b,teams}=fixture();pool.get('b-spare').tradeValue=58;
  const offers=suggestTrades({teams,pool,teamId:a.id,partnerId:b.id,intent:'fair',shapes:['1-1'],limit:96});
  const mutual=offers.find(o=>o.sendA.includes('a-spare')&&o.sendB.includes('b-spare'));
  const lateral=offers.find(o=>o.sendA.includes('a-qb')&&o.sendB.includes('b-qb'));
  expect(mutual).toMatchObject({tier:'fair',fairness:97,weeklyDeltaA:9,weeklyDeltaB:9,partnerFit:'You add WR help · They add RB help'});
  expect(lateral).toBeTruthy();expect(offers.indexOf(mutual)).toBeLessThan(offers.indexOf(lateral));
  expect(optimalLineup(a.playerIds,pool).starters).toHaveLength(7);
  expect(new Set(optimalLineup(a.playerIds,pool).starters.map(p=>p.id)).size).toBe(7);
 });
 it('keeps both-team improvements ahead of exact-price lateral swaps across partners',()=>{
  const {pool,a,b,teams}=fixture();
  const offers=suggestTrades({teams,pool,teamId:a.id,intent:'fair',shapes:['1-1'],limit:96});
  expect(offers[0].other.id).toBe(b.id);
  expect(offers[0].utility.group).toBe(4);
  const fair=offers.filter(o=>o.tier==='fair');expect(fair.map(o=>o.utility.group)).toEqual(fair.map(o=>o.utility.group).sort((a,b)=>b-a));
 });
 it('reports equal price and a harmful lineup separately instead of changing the price grade',()=>{
  const result={fairness:100,valueToA:60,valueToB:60,weeklyDeltaA:-2,weeklyDeltaB:2,projectionEvidence:{injuries:['Player'],stale:['Player']}};
  expect(tradeAssessment(result)).toMatchObject({tier:'fair',value:{headline:'Balanced'},fit:{label:'Your lineup loses',balanced:false},needsReview:true});
  expect(tradeSuggestionQuality(result).group).toBe(0);
  const html=tradeDecisionMarkup(result,new Map());
  expect(html).toContain('Your lineup loses');expect(html).toContain('Injury risk');expect(html).toContain('Stale inputs');expect(html).not.toContain('Review needed');
 });
 it('never promotes an incoming ordinary quarterback or an uncertain edge into Steal',()=>{
  const r={fairness:60,valueToA:100,valueToB:60,weeklyDeltaA:2,weeklyDeltaB:0,incomingEvidence:{low:90},outgoingEvidence:{high:65}};
  expect(tradeSuggestionTier({...r,incomingPositionsA:['QB']})).not.toBe('steal');
  expect(tradeSuggestionTier({...r,incomingPositionsA:['WR'],projectionEvidence:{injuries:['Player']}})).not.toBe('steal');
 });
 it('does not turn comparable-star-plus-depth overpayment into a Steal',()=>{
  const pool=new Map([['amonra',{id:'amonra',name:'Amon-Ra St. Brown',position:'WR',tradeValue:90,tradePerGame:20,expectedPoints:340}],['ceedee',{id:'ceedee',name:'CeeDee Lamb',position:'WR',tradeValue:92,tradePerGame:20.5,expectedPoints:348.5}],['depth',{id:'depth',name:'Depth RB',position:'RB',tradeValue:30,tradePerGame:11,expectedPoints:187}]]);
  const r=evaluateTrade({teamA:{id:'a',playerIds:['amonra','depth']},teamB:{id:'b',playerIds:['ceedee']},sendA:['amonra','depth'],sendB:['ceedee'],pool});
  expect(r.comparableStarPremium).toBe(true);expect(tradeSuggestionTier(r)).not.toBe('steal');expect(r.valueToB).toBe(120);
 });
 it('keeps low-end TE returns materially below a proven starting receiver',()=>{
  const {pool,a,b}=fixture();
  pool.set('evans',{id:'evans',name:'Mike Evans',position:'WR',tradeValue:55,tradePerGame:16,expectedPoints:272});
  pool.set('juwan',{id:'juwan',name:'Juwan Johnson',position:'TE',tradeValue:12,tradePerGame:8,expectedPoints:136});
  const r=evaluateTrade({teamA:{...a,playerIds:[...a.playerIds,'evans']},teamB:{...b,playerIds:[...b.playerIds,'juwan']},sendA:['evans'],sendB:['juwan'],pool});
  expect(r.fairness).toBeLessThan(40);expect(tradeSuggestionTier(r)).not.toBe('fair');
 });
 it('uses actual upcoming byes in ranking without changing quoted prices',()=>{
  const {pool,a,b,teams}=fixture(),query={teams,pool,teamId:a.id,partnerId:b.id,sendAnchorIds:['a-spare'],receiveAnchorIds:['b-spare'],intent:'fair',shapes:['1-1']};
  const season=suggestTrades(query)[0],schedules=[{week:7,schedule:new Map([['ATL',{opponent:'SEA',available:true}]])}];
  const next=suggestTrades({...query,horizon:'next4',weekSchedules:schedules})[0];
  expect(next.fairness).toBe(season.fairness);expect(next.valueToA).toBe(season.valueToA);
  expect(next.windowWeeks).toEqual([7]);expect(next.windowDeltas[0]).toBeLessThan(season.weeklyDeltaA);
  expect(tradeDecisionMarkup(next,pool)).toContain('Week 7');
  const unavailable=suggestTrades({...query,horizon:'next4',weekSchedules:[{week:7,schedule:null}]})[0];
  expect(unavailable.windowDeltas).toBeUndefined();
 });
 it('moves a bye-limited return below offers that help both upcoming lineups',()=>{
  const {pool,a,b,teams}=fixture();
  const rows=suggestTrades({teams,pool,teamId:a.id,partnerId:b.id,intent:'fair',shapes:['1-1'],limit:96,horizon:'next4',weekSchedules:[{week:7,schedule:new Map([['ATL',{opponent:'SEA',available:true}]])}]});
  const target=rows.find(o=>o.sendA.includes('a-spare')&&o.sendB.includes('b-spare'));
  expect(target.windowDeltas[0]).toBe(0);expect(target.partnerFit).toBe('');
  expect(rows[0].utility.group).toBe(4);expect(target.utility.group).toBeLessThan(rows[0].utility.group);
 });
 it('preserves the selected planning window in a reconciled local draft',()=>{
  const {teams,a}=fixture(),trade={memberIds:[],sends:[new Set(),new Set()]},shop={horizon:'next4',openTiers:new Set(['fair'])};
  expect(restoreTradeDraft(tradeDraft({selectedId:a.id,trade,shop}),teams,a.id).shop.horizon).toBe('next4');
 });
});
describe('bounded automatic offer balancing',()=>{
 it('discovers and fully regrades an adjusted package beyond the initial value-paired search',()=>{
  let seed=1;const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32),pool=new Map();
  const teams=['a','b'].map(id=>({id,playerIds:Array.from({length:18},(_,i)=>{
   const pid=id+i,pace=8+Math.floor(random()*16);
   pool.set(pid,{id:pid,name:pid,position:['QB','RB','WR','TE'][i%4],expectedPoints:pace*17,tradePerGame:pace,tradeValue:5+Math.floor(random()*80),modelSource:'projection'});return pid;
  })}));
  const rows=suggestTrades({teams,pool,teamId:'a',partnerId:'b',intent:'fair',shapes:['2-2','3-2','2-3'],limit:200});
  const adjusted=rows.find(row=>row.balancedFrom);expect(adjusted).toBeTruthy();
  const exact=evaluateTrade({teamA:teams[0],teamB:teams[1],sendA:adjusted.sendA,sendB:adjusted.sendB,pool});
  expect(adjusted.fairness).toBe(exact.fairness);expect(adjusted.fairness).toBeGreaterThanOrEqual(90);
  expect(adjusted.weeklyDeltaA).toBe(exact.weeklyDeltaA);expect(adjusted.weeklyDeltaB).toBe(exact.weeklyDeltaB);
  expect(['2-2','3-2','2-3']).toContain(adjusted.shape);
 });
 it('replaces an unlocked piece, preserves the target and regrades the complete deal',()=>{
  const {pool,a,b}=fixture();pool.get('a-spare').tradeValue=50;
  const seed={other:b,sendA:['a-spare'],sendB:['b-spare'],shape:'1-1',...evaluateTrade({teamA:a,teamB:b,sendA:['a-spare'],sendB:['b-spare'],pool})};
  const rows=balanceTradeSuggestions([seed],{mine:a,pool,shapes:new Set(['1-1','2-1']),maxPlayers:3,receiveRequired:['b-spare'],evaluate:c=>{const result=evaluateTrade({teamA:a,teamB:b,...c,pool});return {...c,...result,tier:tradeSuggestionTier(result)};}});
  expect(rows.length).toBeGreaterThan(0);
  for(const row of rows){expect(row.sendB).toEqual(['b-spare']);expect(row.fairness).toBeGreaterThanOrEqual(90);expect(row.sendA.length+row.sendB.length).toBeLessThanOrEqual(3);expect(row.valueToA).toBe(evaluateTrade({teamA:a,teamB:b,...row,pool}).valueToA);}
 });
 it('never removes locked players or exceeds a fixed shape or evaluation budget',()=>{
  const {pool,a,b}=fixture();pool.get('a-spare').tradeValue=50;
  const seed={other:b,sendA:['a-spare'],sendB:['b-spare'],shape:'1-1',...evaluateTrade({teamA:a,teamB:b,sendA:['a-spare'],sendB:['b-spare'],pool})};let calls=0;
  const rows=balanceTradeSuggestions([seed],{mine:a,pool,shapes:new Set(['1-1']),maxPlayers:2,sendRequired:['a-spare'],receiveRequired:['b-spare'],budget:2,evaluate:()=>{calls++;}});
  expect(rows).toEqual([]);expect(calls).toBe(0);
 });
});
