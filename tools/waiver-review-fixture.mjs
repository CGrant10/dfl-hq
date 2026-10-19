import {DFL_SLOTS} from '../js/lineup-alert-model.js';
import {buildWaiverPlan} from '../js/waiver-coach.js';
import {buildWaiverIntelligence} from '../js/waiver-intelligence.js';
export function waiverReviewFixture({faab=false,partial=false}={}){
 const now=Date.parse('2026-10-11T16:00:00Z'),pool=new Map(),players={};
 const add=(id,position,points,name=id)=>{pool.set(id,{id,name,team:'CHI',position,points,hasGame:true,isOut:false});players[id]={n:name,p:position};return id};
 const order=[6,2,8,1,3,4,5,7,9,10,11,12];
 const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,players:DFL_SLOTS.map((slot,j)=>add(`${i}-${j}`,slot==='FLEX'?'WR':slot,i===0?10:[1,2].includes(i)&&j===1?8:30)),settings:{waiver_position:order[i],waiver_budget_used:20}}));
 rosters.forEach(r=>{r.starters=[...r.players]});rosters[0].players.push(add('drop','WR',3,'Reserve receiver'));
 add('rb','RB',20,'Running Back Prospect');add('wr','WR',22,'Wide Receiver Prospect');
 const transactions=Array.from({length:16},(_,i)=>{
  players['old-'+i]={n:'Historical pickup',p:i<8?'RB':'WR'};
  return {sleeper_transaction_id:'tx'+i,season:2026,week:6,type:faab?'waiver':'free_agent',status:'complete',created_ms:now-3600000-i*1000,
   details:{adds:{['old-'+i]:2},drops:i===0?{rb:3}:i===8?{wr:2}:{},settings:faab?{faab_bid:12+i%8}:{}}};
 });
 const league={league_id:'1286077564572037120',season:2026,total_rosters:12,roster_positions:[...DFL_SLOTS,'BN'],settings:{waiver_type:faab?2:0,waiver_budget:100}};
 const weekly=[{week:6,pool}],schedule=new Map([['CHI',{key:'upcoming',kickoff:'2026-10-11T17:00:00Z'}]]);
 const plan=buildWaiverPlan({rosters,rosterId:1,weekly,schedule,values:new Map([['drop',{tradeValue:8,positionRank:90}]]),league,now});
 const enriched=buildWaiverIntelligence({plan,history:{state:partial?'partial':'ready',transactions},rosters,weekly,schedule,players,league,season:2026,week:6,now,
  teamNames:new Map(rosters.map(r=>[String(r.roster_id),r.roster_id===2?'Current Team With A Particularly Long Name':'Current team '+r.roster_id]))});
 return {plan:enriched,rescue:[],checkedAt:now,league};
}
