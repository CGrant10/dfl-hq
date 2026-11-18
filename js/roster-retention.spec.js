import {describe,it,expect} from 'vitest';
import {rosterRetention} from './roster-retention.js';
import {buildWaiverPlan,worthwhileWaiverOffer} from './waiver-coach.js';
import {DFL_SLOTS} from './lineup-alert-model.js';
import {rosterNextAction} from './roster-next-action.js';
const now=Date.parse('2026-11-18T16:00:00Z');
const player=(id,position,points,extra={})=>({id,name:id,position,team:'KC',nflTeam:'KC',points,hasGame:true,isOut:false,...extra});
function fixture(){
 const starters=DFL_SLOTS.map((slot,i)=>player(`s${i}`,slot==='FLEX'?'WR':slot,10));
 const backup=player('johnson','RB',2,{handcuffForId:'s1',backfieldStatus:'Fresh',tradeValue:4});
 const pool=new Map([...starters,backup,player('pickup','WR',20)].map(p=>[p.id,p]));
 const values=new Map([...pool].map(([id,p])=>[id,{...p,tradeValue:p.tradeValue??8,positionRank:90}]));
 const roster={roster_id:1,players:[...starters.map(p=>p.id),'johnson'],starters:starters.map(p=>p.id)};
 const rosters=Array.from({length:12},(_,i)=>i?{roster_id:i+1,players:[],starters:[]}:roster);
 const league={league_id:'league',total_rosters:12,roster_positions:[...DFL_SLOTS,'BN']},schedule=new Map([['KC',{key:'upcoming',kickoff:'2026-11-22T18:00:00Z'}]]);
 return {rosters,rosterId:1,weekly:[{week:11,pool}],values,league,schedule,now};
}
describe('roster-aware retention and waiver usefulness',()=>{
 it('retains low-projection owned RB insurance, including coverage for a starter on IR',()=>{
  const f=fixture(),rosterIds=f.rosters[0].players;
  expect(rosterRetention({...f,id:'johnson',rosterIds})).toMatchObject({kind:'handcuff',starterId:'s1'});
  expect(rosterRetention({...f,id:'johnson',rosterIds:rosterIds.filter(id=>id!=='s1'),ownedIds:rosterIds})).toMatchObject({kind:'handcuff'});
  const plan=buildWaiverPlan(f);expect(plan.offers).toEqual([]);expect(plan.keep[0].id).toBe('johnson');
 });
 it('does not call unrelated, stale or season-ending backfields owned insurance',()=>{
  for(const change of [{handcuffForId:'someone-else'},{nflTeam:'DEN'}]){
   const f=fixture();Object.assign(f.values.get('johnson'),change);
   expect(rosterRetention({...f,id:'johnson',rosterIds:f.rosters[0].players})).toBeNull();
  }
  const stale=fixture();stale.values.get('johnson').backfieldStatus='Stale';expect(rosterRetention({...stale,id:'johnson',rosterIds:stale.rosters[0].players})).toMatchObject({kind:'roles',reason:'RB role unverified'});
  const f=fixture();f.values.get('s1').outForSeason=true;expect(rosterRetention({...f,id:'johnson',rosterIds:f.rosters[0].players})).toBeNull();
 });
 it('protects the last useful RB/WR reserve but permits a replacement that keeps coverage',()=>{
  const f=fixture();Object.assign(f.values.get('johnson'),{handcuffForId:null,tradeValue:8});f.weekly[0].pool.get('johnson').points=5;
  const args={...f,id:'johnson',rosterIds:f.rosters[0].players};
  expect(rosterRetention(args)).toMatchObject({kind:'depth',position:'RB'});
  f.weekly[0].pool.set('another-rb',player('another-rb','RB',15));
  expect(rosterRetention({...args,incoming:{id:'another-rb'}})).toBeNull();
  const offers=buildWaiverPlan(f).offers;expect(offers.some(o=>o.player.id==='pickup')).toBe(false);expect(offers.some(o=>o.player.id==='another-rb')).toBe(true);
 });
 it('keeps future bye cover when a same-position pickup cannot play that week',()=>{
  const f=fixture();Object.assign(f.values.get('johnson'),{handcuffForId:null,tradeValue:8});f.weekly[0].pool.get('johnson').points=5;
  const future=new Map([...f.weekly[0].pool].map(([id,p])=>[id,{...p}]));future.get('s1').hasGame=false;
  f.weekly[0].pool.set('another-rb',player('another-rb','RB',15));future.set('another-rb',player('another-rb','RB',0,{hasGame:false}));
  expect(rosterRetention({...f,weekly:[...f.weekly,{week:12,pool:future}],id:'johnson',rosterIds:f.rosters[0].players,incoming:{id:'another-rb'}})).toMatchObject({week:12});
 });
 it('keeps ordinary 1QB backup streamers expendable until a bye or risky starter needs cover',()=>{
  const pool=new Map([['starter',player('starter','QB',20)],['reserve',player('reserve','QB',16)]]),values=new Map([['reserve',{name:'reserve',position:'QB',tradeValue:8}]]);
  const args={id:'reserve',rosterIds:['starter','reserve'],values,weekly:[{week:11,pool}]};
  expect(rosterRetention(args)).toBeNull();pool.get('starter').isRisky=true;expect(rosterRetention(args)).toMatchObject({kind:'depth'});
 });
 it('distinguishes a real multiweek upgrade from one-week marginal churn and protects filled slots',()=>{
  const offer=gains=>({player:{position:'WR'},gains});
  expect(worthwhileWaiverOffer(offer([{week:11,gain:1.6,coverage:0}]),11)).toBe(false);
  expect(worthwhileWaiverOffer(offer([{week:11,gain:2,coverage:0,weight:1},{week:12,gain:2,coverage:0,weight:.7}]),11)).toBe(true);
  expect(worthwhileWaiverOffer(offer([{week:11,gain:1.5,coverage:1}]),11)).toBe(true);
  expect(worthwhileWaiverOffer(offer([{week:11,gain:30,coverage:-1}]),11)).toBe(false);
 });
 it('rechecks a cached Home pickup before dropping owned insurance and gives a named hold instead',()=>{
  const f=fixture(),plan=buildWaiverPlan(f);plan.offers=[{player:f.weekly[0].pool.get('pickup'),drop:f.weekly[0].pool.get('johnson'),targetWeek:11,gains:[{week:11,gain:10,coverage:0}]}];
  const coach={...f,plan,checkedAt:now,nfl:{teams:f.schedule}};
  const next=rosterNextAction({coach,outlook:{week:11},now});expect(next).toMatchObject({kind:'hold',text:'Keep johnson · s1 cover'});
 });
 it('keeps returning injury stashes but lets an explicitly season-ending player be replaced',()=>{
  const f=fixture();Object.assign(f.values.get('johnson'),{outForSeason:true,isOut:true,handcuffForId:null,tradeValue:0});
  Object.assign(f.weekly[0].pool.get('johnson'),{outForSeason:true,isOut:true,points:0});
  expect(buildWaiverPlan(f).offers.some(o=>o.drop?.id==='johnson')).toBe(true);
 });
});
