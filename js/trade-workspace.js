import {tradePackageEdits} from './trade-package-edits.js';
import {evaluateTrade,evaluateMultiTeamTrade,tradeLineupPreviews} from './team-analyzer.js';
import {reconcileTradeDestinations,tradeTransfers,tradePerspective} from './trade-routing.js';

export function evaluateTradeDeal(parties,sends,pool,destinations=null){
 const transfers=tradeTransfers(parties,sends,destinations);if(!transfers)return null;
 const result=parties.length===2?evaluateTrade({teamA:parties[0],teamB:parties[1],sendA:transfers.sends[0],sendB:transfers.sends[1],pool}):evaluateMultiTeamTrade({teams:parties,sends:transfers.sends,destinations:transfers.destinations,pool});
 return result?{result,parties,sends:transfers.sends,receives:transfers.receives,destinations:transfers.destinations}:null;
}
export function lineupPreviewsFor(deal,pool){return deal?tradeLineupPreviews({teams:deal.parties,sends:deal.sends,receives:deal.receives,pool}):[];}

const score=result=>{
 const p=tradePerspective(result),impacts=result.rosterImpacts||[Number(p.rosterImpactA??p.weeklyDeltaA??0),Number(p.rosterImpactB??p.weeklyDeltaB??0)];
 return Number(result.fairness)*.65+Math.min(0,...impacts)*12+impacts.reduce((sum,v)=>sum+Math.max(-2,Math.min(2,v)),0)*5+(Number(p.rosterImpactA)||0)*4-(Number(p.rosterCostA)||0)*.3;
};
// Two-edit beam, including lower-value depth. Ownership, routes and locks survive.
export function findTradeCounteroffers(deal,pool,{limit=3,lockedIds=[],intent='improve',receivePositions}={}){
 if(!deal||limit<=0)return [];
 const locked=new Set(lockedIds.map(String));
 deal.sends.forEach(ids=>{const main=[...ids].sort((a,b)=>(Number(pool.get(b)?.tradeValue)||0)-(Number(pool.get(a)?.tradeValue)||0))[0];if(main)locked.add(main)});
 const baseline=score(deal.result),current=tradePerspective(deal.result),candidates=[],seen=new Set();
 const key=c=>JSON.stringify([c.sends.map(ids=>[...ids].sort()),c.sends.flat().sort().map(id=>[id,c.destinations[id]])]);
 seen.add(key(deal));
 const original=new Set(deal.sends.flat()),allowed=receivePositions?new Set(receivePositions):null;
 const edits=state=>tradePackageEdits(state,pool,{lockedIds:[...locked]}).filter(edit=>!allowed||edit.sends.flat().every(id=>original.has(id)||allowed.has(pool.get(id)?.position)));
 let beam=[deal];
 for(let depth=0;depth<2;depth++){
  const next=[],budget=depth===0?80:160;
  const queues=beam.map(edits);let count=0;
  // Give each first edit a turn, so one branch cannot consume the second pass.
  while(count<budget&&queues.some(q=>q.length))for(const queue of queues){
   if(count>=budget)break;const edit=queue.shift();if(!edit)continue;
   const fingerprint=key(edit);if(seen.has(fingerprint))continue;seen.add(fingerprint);
   count++;const candidate=evaluateTradeDeal(deal.parties,edit.sends,pool,edit.destinations);if(!candidate)continue;
   const row={...candidate,changes:edit.changes,change:edit.changes[0],score:score(candidate.result)};
   const p=tradePerspective(row.result),impacts=row.result.rosterImpacts||[p.rosterImpactA??p.weeklyDeltaA,p.rosterImpactB??p.weeklyDeltaB];
   next.push(row);
   if(row.result.projectionEvidence?.missing?.length)continue;
   if(intent==='fair'){
    const weekly=row.result.weeklyDeltas||[p.weeklyDeltaA,p.weeklyDeltaB];
    if(row.result.fairness<90||impacts.some(v=>Number(v)<-.75)||weekly.some(v=>Number(v)<-1)
     ||row.result.cutIncomingA?.length||row.result.cutIncomingB?.length||row.result.cutIncoming?.some(ids=>ids.length))continue;
   }else{
    if(row.result.fairness<55||impacts.some(v=>Number(v)<-1)||row.score<=baseline+.5)continue;
    if(Number(p.rosterImpactA??p.weeklyDeltaA)<Number(current.rosterImpactA??current.weeklyDeltaA)-.3)continue;
   }
   candidates.push(row);
  }
  // A usable one-edit repair beats a busier two-edit package. Still inspect
  // every budgeted first edit before choosing among equally small changes.
  if(intent==='fair'&&candidates.length)break;
  beam=next.sort((a,b)=>b.score-a.score).slice(0,8);
 }
 return candidates.sort((a,b)=>b.score-a.score||a.changes.length-b.changes.length||a.sends.flat().length-b.sends.flat().length).slice(0,limit);
}

export function savedTradeProposal(deal,{id,at=Date.now()}={}){return {id:String(id||at),at,teamIds:deal.parties.map(t=>String(t.id)),sends:deal.sends.map(ids=>[...ids]),destinations:{...deal.destinations}};}
export function restoreTradeProposal(proposal,teams,pool){
 if(!proposal||!proposal.destinations||typeof proposal.destinations!=='object'||Array.isArray(proposal.destinations)||!Array.isArray(proposal.teamIds)||proposal.teamIds.length<2||proposal.teamIds.length>8||!Array.isArray(proposal.sends)||proposal.sends.flat().length>8)return null;
 const parties=proposal.teamIds.map(id=>teams.find(t=>String(t.id)===String(id)));
 if(parties.some(t=>!t)||proposal.sends.flat().some(id=>!pool.has(String(id))))return null;
 return evaluateTradeDeal(parties,proposal.sends,pool,proposal.destinations);
}
const proposalKey=(member,season)=>`dfl.trade.proposals.v1.${member||'guest'}.${season}`;
export function readTradeProposals(member,season,storage=globalThis.localStorage){try{const rows=JSON.parse(storage.getItem(proposalKey(member,season))||'[]');return Array.isArray(rows)?rows.filter(r=>r&&typeof r.id==='string'&&Number.isFinite(r.at)&&Array.isArray(r.teamIds)&&Array.isArray(r.sends)).slice(0,3):[]}catch{return []}}
export function writeTradeProposals(member,season,rows,storage=globalThis.localStorage){try{storage.setItem(proposalKey(member,season),JSON.stringify(rows.slice(0,3)));return true}catch{return false}}
export function applyTradeDeal(state,deal){state.memberIds=deal.parties.slice(1).map(t=>String(t.id));state.sends=deal.sends.map(ids=>new Set(ids));state.destinations=reconcileTradeDestinations(deal.parties,state.sends,deal.destinations);state.editing=true;state.filters={};}
