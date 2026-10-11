import {describe,it,expect} from 'vitest';
import {DFL_SLOTS} from './lineup-alert-model.js';
import {buildWaiverPlan} from './waiver-coach.js';
import {buildWaiverIntelligence,waiverTransactions} from './waiver-intelligence.js';
const now=Date.parse('2026-10-11T16:00:00Z');
function fixture(){
 const pool=new Map(),players={},priorities=[5,2,8,1,3,4,6,7,9,10,11,12];
 const add=(id,position,points,extra={})=>{const p={id,name:id,team:'CHI',position,points,hasGame:true,isOut:false,...extra};pool.set(id,p);players[id]={n:id,p:position};return id};
 const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,players:DFL_SLOTS.map((slot,j)=>add(`${i}-${j}`,slot==='FLEX'?'WR':slot,i===0?10:[1,2].includes(i)&&j===1?8:30)),settings:{waiver_position:priorities[i],waiver_budget_used:20}}));
 rosters.forEach(r=>{r.starters=[...r.players]});rosters[0].players.push(add('drop','WR',3));add('pickup','RB',20);add('qb','QB',21);
 for(let i=0;i<8;i++)players['history-'+i]={n:'Historical RB',p:'RB'};
 const transactions=Array.from({length:8},(_,i)=>({sleeper_transaction_id:'tx'+i,season:2026,week:6,type:'free_agent',status:'complete',created_ms:now-3600000-i*10000,
  details:{adds:{['history-'+i]:2},drops:i===0?{pickup:3}:{}}}));
 const league={total_rosters:12,roster_positions:[...DFL_SLOTS,'BN'],settings:{waiver_type:0,waiver_budget:100}};
 const weekly=[{week:6,pool}],schedule=new Map([['CHI',{key:'upcoming',kickoff:'2026-10-11T17:00:00Z'}]]),values=new Map([['drop',{tradeValue:8,positionRank:90}]]);
 const plan=buildWaiverPlan({rosters,rosterId:1,weekly,schedule,values,league,now});
 return {plan,history:{state:'ready',transactions},rosters,weekly,schedule,players,league,season:2026,week:6,now,teamNames:new Map(rosters.map(r=>[String(r.roster_id),'Current team '+r.roster_id]))};
}
describe('DFL waiver intelligence',()=>{
 it('counts actual positional pickups and shows only rivals whose legal lineup improves',()=>{
  const result=buildWaiverIntelligence(fixture()),rb=result.offers.find(o=>o.player.id==='pickup');
  expect(result.intelligence).toMatchObject({pickups:8,myPriority:5,positionDemand:[{position:'RB',count:8}]});
  expect(rb.intel.otherTeams.map(t=>t.rosterId)).toEqual([2,3]);expect(rb.intel.otherTeams[0]).toMatchObject({name:'Current team 2',ahead:true,gain:12});
  expect(rb.intel.otherTeams[1].ahead).toBe(false);expect(rb.faab).toBeNull();
 });
 it('does not call every roster with an existing QB a competing QB buyer in one-QB DFL',()=>{
  const result=buildWaiverIntelligence(fixture()),qb=result.offers.find(o=>o.player.id==='qb');expect(qb.intel.otherTeams).toEqual([]);
 });
 it('suppresses unsupported roster needs and already locked player slots',()=>{
  const f=fixture();f.weekly[0].pool.delete('1-3');f.schedule.set('CHI',{key:'live',kickoff:'2026-10-11T15:00:00Z'});
  expect(buildWaiverIntelligence(f).offers.find(o=>o.player.id==='pickup').intel.otherTeams).toEqual([]);
 });
 it('flags a healthy unclaimed drop that can help and uses the latest team name',()=>{
  const result=buildWaiverIntelligence(fixture());expect(result.recentDrops).toMatchObject([{player:{id:'pickup'},teamName:'Current team 3',gain:10,targetWeek:6}]);
 });
 it.each(['players','reserve','taxi'])('hides a dropped player reclaimed onto %s',key=>{
  const f=fixture();f.rosters[1][key]=[...(f.rosters[1][key]||[]),'pickup'];expect(buildWaiverIntelligence(f).recentDrops).toEqual([]);
 });
 it('ignores unhealthy, old and already-started drops',()=>{
  const f=fixture();f.weekly[0].pool.get('pickup').isOut=true;expect(buildWaiverIntelligence(f).recentDrops).toEqual([]);
  f.weekly[0].pool.get('pickup').isOut=false;f.history.transactions[0].created_ms=now-8*86400000;expect(buildWaiverIntelligence(f).recentDrops).toEqual([]);
  f.history.transactions[0].created_ms=now-3600000;f.schedule.set('CHI',{key:'live',kickoff:'2026-10-11T15:00:00Z'});expect(buildWaiverIntelligence(f).recentDrops).toEqual([]);
 });
 it('keeps usable lineup advice when pickup history is unavailable',()=>{
  const f=fixture();f.history={state:'unavailable',transactions:[]};const result=buildWaiverIntelligence(f);expect(result.offers).toHaveLength(f.plan.offers.length);expect(result.intelligence.state).toBe('unavailable');expect(result.intelligence.pickups).toBe(0);
 });
 it('uses sufficient same-position winning bids conservatively and respects remaining budget',()=>{
  const f=fixture();f.league.settings.waiver_type=2;f.plan.offers.forEach(o=>{o.faab={min:4,max:9,budget:100,remaining:80}});
  f.history.transactions.forEach((t,i)=>{t.type='waiver';t.details.settings={faab_bid:20+i}});
  const rb=buildWaiverIntelligence(f).offers.find(o=>o.player.id==='pickup');expect(rb.faab).toMatchObject({source:'league-history'});expect(rb.faab.max).toBeLessThanOrEqual(18);expect(rb.intel.winningBids.samples).toBe(8);
  f.plan.offers.forEach(o=>{o.faab.remaining=1});expect(buildWaiverIntelligence(f).offers.every(o=>o.faab.max<=1)).toBe(true);
 });
 it('does not infer winning bids from free pickups, small samples or partial history',()=>{
  const f=fixture();f.league.settings.waiver_type=2;f.plan.offers.forEach(o=>{o.faab={min:4,max:9,budget:100,remaining:80}});
  f.history.transactions.forEach(t=>{t.details.settings={faab_bid:30}});
  expect(buildWaiverIntelligence(f).offers.every(o=>o.faab.source!== 'league-history')).toBe(true);
  f.history.transactions.forEach(t=>{t.type='waiver'});f.history.state='partial';expect(buildWaiverIntelligence(f).offers.every(o=>o.faab.source!== 'league-history')).toBe(true);
  f.history.state='ready';f.history.transactions=f.history.transactions.slice(0,4);expect(buildWaiverIntelligence(f).offers.every(o=>o.faab.source!== 'league-history')).toBe(true);
 });
 it('excludes failed, pending, traded, future, duplicate and wrong-season transactions',()=>{
  const f=fixture(),good=f.history.transactions[0];
  const rows=[good,good,...['failed','pending'].map(status=>({...good,sleeper_transaction_id:status,status})),{...good,sleeper_transaction_id:'trade',type:'trade'},
   {...good,sleeper_transaction_id:'future',created_ms:now+1000},{...good,sleeper_transaction_id:'old',season:2025},{...good,sleeper_transaction_id:'week',week:1},{...good,sleeper_transaction_id:'missing',week:undefined}];
  expect(waiverTransactions(rows,{season:2026,week:6,now})).toHaveLength(1);
 });
 it('does not assign one multi-add transaction bid to each separate player',()=>{
  const f=fixture(),row=f.history.transactions[0];row.type='waiver';row.details.settings={faab_bid:50};row.details.adds={'history-1':2,'history-2':2};expect(waiverTransactions([row],{season:2026,week:6,now})[0].bid).toBeNull();
 });
});
