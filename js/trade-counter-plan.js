import {evaluateTradeDeal,tradeCounterofferSearch} from './trade-workspace.js';
import {tradePackageEdits} from './trade-package-edits.js';
import {automaticTradePlayer} from './player-availability.js';
import {tradeSendAllowed} from './trade-protected-players.js';
import {safeBalancedTrade,tradeAdjustedImpacts} from './trade-roster-context.js';
import {chooseCounterOptions} from './trade-counter-options.js';

const signature=deal=>JSON.stringify([deal.sends.map(ids=>[...ids].sort()),Object.entries(deal.destinations).sort(([a],[b])=>a.localeCompare(b))]);
const impacts=deal=>tradeAdjustedImpacts(deal.result);
const cutIncoming=deal=>deal.result.cutIncoming?.some(ids=>ids.length)||deal.result.cutIncomingA?.length||deal.result.cutIncomingB?.length;
const priced=deal=>!deal.result.projectionEvidence?.missing?.length;
const fair=deal=>safeBalancedTrade(deal.result);
const quality=deal=>Number(deal.result.fairness)-Math.abs(Math.min(0,...impacts(deal).map(Number)))*12-(deal.changes?.length||0)*.75-deal.sends.flat().length*.15;
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));

// Strict small repairs first; then permit explicit, visible main-piece changes.
// No valuation threshold is weakened to call the closest legal package "fair".
export async function planTradeCounteroffers(deal,pool,{limit=3,lockedIds=[],intent='fair',receivePositions,excludedSendIds=[],active=()=>true,yieldTask=pause,maxChecks=280}={}){
 if(!deal?.result||!deal.parties?.length||limit<=0)return {kind:'incomplete',candidates:[],message:'Finish both sides of the offer.'};
 const allowed=receivePositions?new Set(receivePositions):null,locked=new Set(lockedIds.map(String)),excluded=new Set(excludedSendIds.map(String)),original=new Set(deal.sends.flat());
 const usable=row=>tradeSendAllowed(row.sends[0],excluded)&&row.sends.flat().every(id=>(!allowed||allowed.has(pool.get(id)?.position))&&automaticTradePlayer(pool.get(id)));
 const finish=rows=>{
  const main=deal.sends.map(ids=>[...ids].sort((a,b)=>(Number(pool.get(b)?.tradeValue)||0)-(Number(pool.get(a)?.tradeValue)||0))[0]);
  const candidates=chooseCounterOptions(rows,deal,pool,limit).map(row=>({...row,changesMain:main.some((id,i)=>id&&!row.sends[i].includes(id))}));
  return {kind:candidates.every(fair)?'fair':'closest',candidates,message:candidates.every(fair)?'':'Closest packages · balance shown as graded.'};
 };
 if(!active())return {kind:'cancelled',candidates:[]};
 if(deal.parties[0].playerIds.every(id=>excluded.has(String(id)))||deal.sends[0].some(id=>excluded.has(id)&&locked.has(id)))return {kind:'constraints',candidates:[],message:'Update Don’t trade or unlock a protected player to find counters.'};
 if(allowed&&(!allowed.size||[...locked].some(id=>original.has(id)&&!allowed.has(pool.get(id)?.position))))return {kind:'constraints',candidates:[],message:'Change the position filters or locked players to build a different package.'};
 const search=tradeCounterofferSearch(deal,pool,{limit:36,lockedIds,intent,receivePositions,excludedSendIds});
 let step=search.next();
 while(!step.done){await yieldTask();if(!active())return {kind:'cancelled',candidates:[]};step=search.next();}
 const small=step.value.filter(row=>usable(row)&&priced(row));
 let beam=[{...deal,changes:[]}],checked=0,unpriced=false;
 const seen=new Set([signature(deal)]),candidates=[...small];
 const targetMains=deal.sends.slice(1).map(ids=>[...ids].sort((a,b)=>(Number(pool.get(b)?.tradeValue)||0)-(Number(pool.get(a)?.tradeValue)||0))[0]);
 const budget=Math.max(0,Math.min(360,Number(maxChecks)||0));
 for(let depth=0;depth<3&&checked<budget;depth++){
  const queues=beam.map(row=>tradePackageEdits(row,pool,{lockedIds:[...locked],excludedSendIds})),next=[];
  const stopAt=Math.min(budget,checked+(depth===0?80:100));
  while(checked<stopAt&&queues.some(q=>q.length)){
   for(const queue of queues){
    if(checked>=stopAt)break;
    const edit=queue.shift();if(!edit)continue;
    const key=signature(edit);if(seen.has(key))continue;seen.add(key);checked++;
    if(checked%8===0){await yieldTask();if(!active())return {kind:'cancelled',candidates:[],checked};}
    const candidate=evaluateTradeDeal(deal.parties,edit.sends,pool,edit.destinations);if(!candidate)continue;
    const row={...candidate,changes:edit.changes,change:edit.changes[0]};next.push(row);
    if(!usable(row)||cutIncoming(row))continue;
    if(!priced(row)){unpriced=true;continue;}
    candidates.push(row);
   }
  }
  if(depth>=1&&candidates.some(row=>fair(row)&&((row.result.weeklyDeltas?.[0]??row.result.weeklyDeltaA)>.2||impacts(row)[0]>.3)))break;
  const ranked=next.sort((a,b)=>quality(b)-quality(a));
  // Flat lateral repairs must not exhaust the beam before inspecting a
  // useful counter that retains the originally requested main player(s).
  const anchored=ranked.filter(row=>targetMains.every((id,i)=>row.sends[i+1].includes(id))).slice(0,4);
  beam=[...new Map([...anchored,...ranked].map(row=>[signature(row),row])).values()].slice(0,8);
  if(!beam.length)break;
 }
 if(!active())return {kind:'cancelled',candidates:[],checked};
 if(candidates.length)return {...finish(candidates.sort((a,b)=>Number(fair(b))-Number(fair(a))||quality(b)-quality(a))),checked};
 return {kind:unpriced?'needs-data':'no-alternative',candidates:[],checked,message:unpriced?'Player values are incomplete. Refresh before choosing a counter.':fair(deal)?'This offer is already balanced. Keep it or change a main player.':'No different legal package with these players and filters. Change a main player.'};
}
