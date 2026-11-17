import {evaluateTradeDeal,tradeCounterofferSearch} from './trade-workspace.js';
import {tradePackageEdits} from './trade-package-edits.js';
import {tradePerspective} from './trade-routing.js';
import {automaticTradePlayer} from './player-availability.js';

const signature=deal=>JSON.stringify([deal.sends.map(ids=>[...ids].sort()),Object.entries(deal.destinations).sort(([a],[b])=>a.localeCompare(b))]);
const impacts=deal=>{const p=tradePerspective(deal.result);return deal.result.rosterImpacts||[p.rosterImpactA??p.weeklyDeltaA,p.rosterImpactB??p.weeklyDeltaB]};
const cutIncoming=deal=>deal.result.cutIncoming?.some(ids=>ids.length)||deal.result.cutIncomingA?.length||deal.result.cutIncomingB?.length;
const priced=deal=>!deal.result.projectionEvidence?.missing?.length;
const fair=deal=>deal.result.fairness>=90&&impacts(deal).every(v=>Number(v)>=-.75)&&(deal.result.weeklyDeltas||[deal.result.weeklyDeltaA,deal.result.weeklyDeltaB]).every(v=>Number(v)>=-1)&&!cutIncoming(deal);
const quality=deal=>Number(deal.result.fairness)-Math.abs(Math.min(0,...impacts(deal).map(Number)))*12-(deal.changes?.length||0)*.75-deal.sends.flat().length*.15;
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));

// Strict small repairs first; then permit explicit, visible main-piece changes.
// No valuation threshold is weakened to call the closest legal package "fair".
export async function planTradeCounteroffers(deal,pool,{limit=3,lockedIds=[],intent='fair',receivePositions,active=()=>true,yieldTask=pause,maxChecks=280}={}){
 if(!deal?.result||!deal.parties?.length||limit<=0)return {kind:'incomplete',candidates:[],message:'Finish both sides of the offer.'};
 const allowed=receivePositions?new Set(receivePositions):null,locked=new Set(lockedIds.map(String)),original=new Set(deal.sends.flat());
 const usable=row=>row.sends.flat().every(id=>(!allowed||allowed.has(pool.get(id)?.position))&&automaticTradePlayer(pool.get(id)));
 const finish=rows=>{
  const main=deal.sends.map(ids=>[...ids].sort((a,b)=>(Number(pool.get(b)?.tradeValue)||0)-(Number(pool.get(a)?.tradeValue)||0))[0]);
  const candidates=rows.slice(0,limit).map(row=>({...row,counterKind:fair(row)?'fair':'closest',changesMain:main.some((id,i)=>id&&!row.sends[i].includes(id))}));
  return {kind:candidates.every(fair)?'fair':'closest',candidates,message:candidates.every(fair)?'':'Closest packages · balance shown as graded.'};
 };
 if(!active())return {kind:'cancelled',candidates:[]};
 if(allowed&&(!allowed.size||[...locked].some(id=>original.has(id)&&!allowed.has(pool.get(id)?.position))))return {kind:'constraints',candidates:[],message:'Change the position filters or locked players to build a different package.'};
 const search=tradeCounterofferSearch(deal,pool,{limit,lockedIds,intent,receivePositions});
 let step=search.next();
 while(!step.done){await yieldTask();if(!active())return {kind:'cancelled',candidates:[]};step=search.next();}
 const small=step.value.filter(row=>usable(row)&&priced(row));
 if(small.length)return finish(small);
 let beam=[{...deal,changes:[]}],checked=0,unpriced=false;
 const seen=new Set([signature(deal)]),candidates=[];
 const budget=Math.max(0,Math.min(360,Number(maxChecks)||0));
 for(let depth=0;depth<3&&checked<budget;depth++){
  const queues=beam.map(row=>tradePackageEdits(row,pool,{lockedIds:[...locked]})),next=[];
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
  if(candidates.some(fair))break;
  beam=next.sort((a,b)=>quality(b)-quality(a)).slice(0,8);
  if(!beam.length)break;
 }
 if(!active())return {kind:'cancelled',candidates:[],checked};
 if(candidates.length)return {...finish(candidates.sort((a,b)=>Number(fair(b))-Number(fair(a))||quality(b)-quality(a))),checked};
 return {kind:unpriced?'needs-data':'no-alternative',candidates:[],checked,message:unpriced?'Player values are incomplete. Refresh before choosing a counter.':fair(deal)?'This offer is already balanced. Keep it or change a main player.':'No different legal package with these players and filters. Change a main player.'};
}
