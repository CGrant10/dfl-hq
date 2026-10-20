import {describe,it,expect} from 'vitest';
import {buildWaiverPlan,rosterLineupScore} from './waiver-coach.js';
import {DFL_SLOTS} from './lineup-alert-model.js';
const now=Date.parse('2026-10-11T16:00:00Z');
const p=(id,position,points,extra={})=>({id,name:id,team:'CHI',position,points,hasGame:true,isOut:false,...extra});
const rows=DFL_SLOTS.map((pos,i)=>p(`s${i}`,pos==='FLEX'?'WR':pos,10));
const players=[...rows,p('drop','WR',3),p('pickup','RB',20),p('qb','QB',21)];
const current=new Map(players.map(p=>[p.id,p]));
const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,players:i?[]:rows.map(p=>p.id).concat('drop'),starters:i?[]:rows.map(p=>p.id),settings:{waiver_budget_used:20}}));
const league={total_rosters:12,roster_positions:[...DFL_SLOTS,'BN'],settings:{waiver_type:2,waiver_budget:100}};
const schedule=new Map([['CHI',{key:'upcoming',kickoff:'2026-10-11T17:00:00Z'}]]);
const values=new Map([['drop',{tradeValue:8,positionRank:90}]]);
const input={rosters,rosterId:1,weekly:[{week:6,pool:current}],schedule,values,league,now};
describe('league-aware waiver recommendations',()=>{
 it('never cuts a receiver for a routine kicker pickup',()=>{
  const pool=new Map(current);pool.set('k',p('k','K',30));
  const plan=buildWaiverPlan({...input,weekly:[{week:6,pool}]});
  expect(plan.offers.find(o=>o.player.id==='k').drop.position).toBe('K');
 });
 it('protects injured and returning depth even when the temporary trade value is low',()=>{
  for(const changed of [{isOut:true},{injuryStatus:'IR'},{injuryValueFactor:.86},{estimatedMissedGames:1},{forwardPerGame:12},{projectedPoints:200}]){
   const protectedValues=new Map([['drop',{tradeValue:8,positionRank:90,...changed}]]);
   expect(buildWaiverPlan({...input,values:protectedValues}).offers.some(o=>o.drop?.id==='drop')).toBe(false);
  }
 });
 it('uses fresh player availability to protect a newly injured receiver from a stale value',()=>{
  expect(buildWaiverPlan({...input,players:{drop:{i:'Out'}}}).offers.some(o=>o.drop?.id==='drop')).toBe(false);
 });
 it('can replace a confirmed bye kicker without cutting skill-position depth',()=>{
  const pool=new Map(current);pool.set('s7',{...pool.get('s7'),hasGame:false,points:0,team:'BYE'});pool.set('k',p('k','K',8));
  expect(buildWaiverPlan({...input,weekly:[{week:6,pool}]}).offers.find(o=>o.player.id==='k')).toMatchObject({drop:{id:'s7',position:'K'},kind:'Fill a gap'});
 });
 it('ranks an actual skill-position improvement above a larger healthy kicker stream',()=>{
  const pool=new Map(current);pool.set('k',p('k','K',30));
  const offers=buildWaiverPlan({...input,weekly:[{week:6,pool}]}).offers;
  expect(offers[0].player.id).toBe('pickup');
 });
 it('keeps healthy IR returns separate from pickups and never drops or starts taxi players',()=>{
  const pool=new Map(current);pool.set('return',p('return','WR',22,{injuryStatus:null}));pool.set('taxi',p('taxi','WR',40,{injuryStatus:null}));
  const copy=rosters.map(r=>r.roster_id===1?{...r,players:r.players.concat('return','taxi'),reserve:['return'],taxi:['taxi']}:r);
  const plan=buildWaiverPlan({...input,rosters:copy,weekly:[{week:6,pool}]});
  expect(plan.returns).toMatchObject([{player:{id:'return'},gain:12,needsSpace:true}]);
  expect(plan.offers.every(o=>!['return','taxi'].includes(o.drop?.id))).toBe(true);
 });
 it('maximizes a legal nine-player lineup with one QB and a skill-only flex',()=>{
  expect(rosterLineupScore([...current.keys()],current)).toMatchObject({filled:9,total:111});
  const qbOnly=new Map(Array.from({length:9},(_,i)=>[String(i),p(String(i),'QB',30)]));
  expect(rosterLineupScore([...qbOnly.keys()],qbOnly)).toMatchObject({filled:1,total:30});
 });
 it('pairs an available upgrade with expendable bench depth',()=>{
  const plan=buildWaiverPlan(input);expect(plan.state).toBe('ready');
  const rb=plan.offers.find(o=>o.player.id==='pickup');expect(rb).toMatchObject({drop:{id:'drop'},gains:[{week:6,gain:10}],faab:{min:4,max:9,remaining:80}});
 });
 it('excludes owned players, including reserve and taxi ownership',()=>{
  for(const key of ['players','reserve','taxi']){
   const copy=rosters.map(r=>({...r}));copy[1][key]=['pickup'];
   expect(buildWaiverPlan({...input,rosters:copy}).offers.some(o=>o.player.id==='pickup')).toBe(false);
  }
 });
 it('requires a complete fresh league and verified future kickoff',()=>{
  expect(buildWaiverPlan({...input,rosters:rosters.slice(0,11)}).state).toBe('unavailable');
  expect(buildWaiverPlan({...input,fresh:false}).offers).toEqual([]);
  expect(buildWaiverPlan({...input,schedule:null}).state).toBe('schedule-unavailable');
  expect(buildWaiverPlan({...input,now:Date.parse('2026-10-11T17:00:00Z')}).offers).toEqual([]);
  expect(buildWaiverPlan({...input,schedule:new Map([['CHI',{key:'live',kickoff:'2026-10-11T17:00:00Z'}]])}).offers).toEqual([]);
 });
 it('can fill a confirmed bye slot and keeps QB alternatives from flooding the shortlist',()=>{
  const pool=new Map(current);pool.set('s0',{...pool.get('s0'),hasGame:false,team:'BYE'});pool.set('qb2',p('qb2','QB',19));
  const plan=buildWaiverPlan({...input,weekly:[{week:6,pool}]});
  expect(plan.offers.filter(o=>o.player.position==='QB')).toHaveLength(1);
  expect(plan.offers.find(o=>o.player.id==='qb')).toMatchObject({kind:'Fill a gap',gains:[{gain:21}]});
 });
 it('does not count a healthy taxi player as available lineup coverage',()=>{
  const pool=new Map(current);pool.set('taxi',p('taxi','QB',50));
  const copy=rosters.map(r=>r.roster_id===1?{...r,players:r.players.concat('taxi'),taxi:['taxi']}:r);
  expect(buildWaiverPlan({...input,rosters:copy,weekly:[{week:6,pool}]}).offers.some(o=>o.player.id==='qb')).toBe(true);
 });
 it('protects starters, valuable bench players and unknown drop values',()=>{
  expect(buildWaiverPlan({...input,values:new Map()}).offers).toEqual([]);
  expect(buildWaiverPlan({...input,values:new Map([['drop',{tradeValue:80,positionRank:3}]])}).offers).toEqual([]);
  expect(buildWaiverPlan({...input,rosters:rosters.map(r=>r.roster_id===1?{...r,starters:[...r.starters,'drop']}:r)}).offers).toEqual([]);
 });
 it('does not inflate a healthy pickup by treating a questionable starter as zero',()=>{
  const pool=new Map(current);pool.set('s0',{...pool.get('s0'),isRisky:true,points:30});
  expect(buildWaiverPlan({...input,weekly:[{week:6,pool}]}).offers.some(o=>o.player.id==='qb')).toBe(false);
 });
 it('finds an upcoming bye gap without sacrificing more than 1.5 points in another week',()=>{
  const future=new Map(current);future.set('s1',{...future.get('s1'),hasGame:false});future.set('pickup',{...future.get('pickup'),points:20});
  const plan=buildWaiverPlan({...input,weekly:[{week:6,pool:current},{week:7,pool:future}]});
  expect(plan.offers.find(o=>o.player.id==='pickup')).toMatchObject({targetWeek:7,kind:'Plan ahead'});
  const valuable=new Map(current);valuable.set('drop',p('drop','WR',30));
  expect(buildWaiverPlan({...input,weekly:[{week:6,pool:valuable},{week:7,pool:future}]}).offers.some(o=>o.player.id==='pickup')).toBe(false);
 });
 it('bounds bids to the actual remaining FAAB and does not invent FAAB for priority waivers',()=>{
  const copy=rosters.map(r=>({...r,settings:{waiver_budget_used:99}}));
  expect(buildWaiverPlan({...input,rosters:copy}).offers.every(o=>o.faab.max<=1)).toBe(true);
  expect(buildWaiverPlan({...input,league:{...league,settings:{waiver_type:0}}}).offers.every(o=>o.faab===null)).toBe(true);
 });
 it('offers an add without a drop only when there is an open roster spot',()=>{
  const result=buildWaiverPlan({...input,league:{...league,roster_positions:[...DFL_SLOTS,'BN','BN']}});
  expect(result.offers.every(o=>o.drop===null)).toBe(true);
 });
});
