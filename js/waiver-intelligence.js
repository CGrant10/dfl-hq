import {rosterLineupScore} from './waiver-coach.js';
import {availableBeforeKickoff} from './lineup-alert-model.js';
const finite=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n));
const round=n=>Math.round(n*10)/10;
const positions=new Set(['QB','RB','WR','TE','K','DEF']);
const teamKey=team=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[team]||team);
const gameFor=(player,schedule)=>schedule?.get(teamKey(player?.team));
const unlocked=(player,schedule,now)=>availableBeforeKickoff({...player,state:gameFor(player,schedule)?.key,kickoff:gameFor(player,schedule)?.kickoff},now);
const quantile=(values,q)=>{const sorted=[...values].sort((a,b)=>a-b),index=(sorted.length-1)*q,low=Math.floor(index);return sorted[low]+(sorted[Math.ceil(index)]-sorted[low])*(index-low)};

export function waiverTransactions(transactions,{season,week,now=Date.now()}={}){
 const seen=new Set();
 return transactions.flatMap(row=>{
  if(!row||typeof row!=='object')return [];
  const detail=row.details||row,id=String(row.sleeper_transaction_id||detail.transaction_id||'');
  const type=row.type||detail.type,status=row.status||detail.status,leg=Number(row.week??detail.leg);
  const at=Number(detail.status_updated||row.created_ms||detail.created);
  if(!id||seen.has(id)||Number(row.season)!==Number(season)||!Number.isInteger(leg)||leg<Math.max(1,week-3)||leg>week
    ||!['waiver','free_agent'].includes(type)||status!=='complete'||!Number.isFinite(at)||at<=0||at>now)return [];
  seen.add(id);
  const entries=value=>value&&typeof value==='object'&&!Array.isArray(value)?Object.entries(value)
   .filter(([player,roster])=>player&&Number.isSafeInteger(Number(roster))&&Number(roster)>0).map(([player,roster])=>({player:String(player),roster:Number(roster)})):[];
  const adds=entries(detail.adds),drops=entries(detail.drops);
  const bid=type==='waiver'&&adds.length===1&&finite(detail.settings?.faab_bid)&&Number(detail.settings.faab_bid)>=0?Number(detail.settings.faab_bid):null;
  return [{id,type,week:leg,at,adds,drops,bid}];
 }).sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
}

function rosterBaseline(roster,weekly,schedule,now,currentWeek){
 const inactive=new Set([...(roster.reserve||[]),...(roster.taxi||[])].map(String));
 const ids=(roster.players||[]).map(String).filter(id=>!inactive.has(id)),pool=weekly.pool;
 const starters=(roster.starters||[]).map(String).filter(id=>id!=='0');
 // Missing player/slot projections cannot be treated as a roster need.
 if(ids.some(id=>!pool.has(id)||pool.get(id).hasGame&&!finite(pool.get(id).points)))return null;
 const locked=weekly.week!==currentWeek?[]:(roster.starters||[]).flatMap((id,slotIndex)=>{
  if(String(id)==='0')return [];
  const player=pool.get(String(id));
  if(!player||inactive.has(String(id)))return [{id:String(id),slotIndex}];
  return player.hasGame===false||unlocked(player,schedule,now)?[]:[{id:String(id),slotIndex}];
 });
 if(starters.some(id=>!pool.has(id)))return null;
 const base=rosterLineupScore(ids,pool,{locked});
 return base?{ids,pool,locked,base}:null;
}
function gainFor(baseline,player){
 if(!baseline)return null;
 const projected=baseline.pool.get(String(player.id));
 if(!projected||!projected.hasGame||projected.isOut||projected.isRisky||!finite(projected.points))return null;
 const after=rosterLineupScore([...baseline.ids,String(player.id)],baseline.pool,{locked:baseline.locked});
 return after?round(after.total-baseline.base.total):null;
}

export function buildWaiverIntelligence({plan,history,rosters=[],weekly=[],schedule,players={},teamNames=new Map(),league={},season,week,now=Date.now()}){
 if(plan.state!=='ready')return plan;
 const mine=rosters.find(r=>String(r.roster_id)===String(plan.rosterId));
 if(!mine)return plan;
 const transactions=waiverTransactions(history?.transactions||[],{season,week,now});
 const demand=new Map(),bids=new Map(),latestDrops=new Map();
 for(const transaction of transactions){
  for(const add of transaction.adds){
   const position=players[add.player]?.p||players[add.player]?.position;
   if(positions.has(position))demand.set(position,(demand.get(position)||0)+1);
   if(transaction.bid!==null&&positions.has(position)){
    if(!bids.has(position))bids.set(position,[]);bids.get(position).push(transaction.bid);
   }
  }
  for(const drop of transaction.drops)if(!latestDrops.has(drop.player))latestDrops.set(drop.player,{...drop,at:transaction.at});
 }
 const baselines=new Map();
 const baseline=(roster,targetWeek)=>{
  const key=`${roster.roster_id}:${targetWeek}`;
  if(!baselines.has(key)){const target=weekly.find(w=>w.week===targetWeek);baselines.set(key,target?rosterBaseline(roster,target,schedule,now,week):null)}
  return baselines.get(key);
 };
 const name=id=>teamNames.get(String(id))||teamNames.get(Number(id))||`Team ${id}`;
 const priority=roster=>Number.isSafeInteger(Number(roster?.settings?.waiver_position))&&Number(roster.settings.waiver_position)>0?Number(roster.settings.waiver_position):null;
 const myPriority=priority(mine),isFaab=Number(league.settings?.waiver_type)===2;
 const rivalFits=(player,targetWeek)=>rosters.filter(r=>String(r.roster_id)!==String(mine.roster_id)).flatMap(r=>{
  const gain=gainFor(baseline(r,targetWeek),player);
  return gain!==null&&gain>=1.5?[{rosterId:r.roster_id,name:name(r.roster_id),gain,priority:priority(r),ahead:!isFaab&&myPriority!==null&&priority(r)!==null&&priority(r)<myPriority}]:[];
 }).sort((a,b)=>Number(b.ahead)-Number(a.ahead)||b.gain-a.gain);
 const offers=plan.offers.map(offer=>{
  const market=bids.get(offer.player.position)||[],fits=rivalFits(offer.player,offer.targetWeek);
  const drop=latestDrops.get(String(offer.player.id));
  const intel={pickups:demand.get(offer.player.position)||0,otherTeams:fits,myPriority:isFaab?null:myPriority,
   recentDrop:drop?{teamName:name(drop.roster),at:drop.at}:null,winningBids:null};
  let faab=offer.faab?{...offer.faab,min:Math.max(0,Math.min(offer.faab.min,offer.faab.remaining)),max:Math.max(0,Math.min(offer.faab.max,offer.faab.remaining))}:null;
  if(isFaab&&faab&&history?.state==='ready'&&market.length>=5){
   const low=Math.floor(quantile(market,.25)),high=Math.ceil(quantile(market,.75));
   intel.winningBids={min:low,max:high,samples:market.length,position:offer.player.position};
   // History guides the value-based bid; position-only samples cannot justify an unlimited price jump.
   const cap=Math.min(faab.remaining,faab.max*2),min=Math.min(cap,Math.round(faab.min*.6+low*.4));
   faab={...faab,min,max:Math.max(min,Math.min(cap,Math.round(faab.max*.6+high*.4))),source:'league-history'};
  }
  return {...offer,faab,intel};
 });
 const owned=new Set(rosters.flatMap(r=>[...(r.players||[]),...(r.reserve||[]),...(r.taxi||[])]).map(String));
 const recentDrops=[...latestDrops.values()].filter(drop=>!owned.has(drop.player)&&now-drop.at<=7*86400000)
  .flatMap(drop=>{
   const player=weekly[0]?.pool.get(drop.player);
   if(!player||!player.hasGame||player.isOut||player.isRisky||!unlocked(player,schedule,now))return [];
   const gains=weekly.map(w=>({week:w.week,gain:gainFor(baseline(mine,w.week),player)})).filter(g=>g.gain!==null&&g.gain>=1.5);
   if(!gains.length)return [];
   const best=gains.sort((a,b)=>b.gain-a.gain)[0];
   return [{player,teamName:name(drop.roster),at:drop.at,gain:best.gain,targetWeek:best.week}];
  }).sort((a,b)=>b.gain-a.gain||b.at-a.at).slice(0,3);
 return {...plan,offers,recentDrops,intelligence:{state:history?.state||'unavailable',myPriority:isFaab?null:myPriority,
  positionDemand:[...demand].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([position,count])=>({position,count})),
  pickups:transactions.reduce((n,t)=>n+t.adds.length,0),weeks:Math.min(4,week)}};
}
