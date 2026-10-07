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
 return Number(result.fairness)*.65+Math.min(0,...impacts)*12+impacts.reduce((sum,v)=>sum+Math.max(-2,Math.min(2,v)),0)*5+(Number(p.rosterImpactA)||0)*4;
};
// Bounded small edits, graded by the same engine. Main pieces stay in the deal.
export function findTradeCounteroffers(deal,pool,{limit=3,lockedIds=[]}={}){
 if(!deal)return [];
 const locked=new Set(lockedIds.map(String));
 deal.sends.forEach(ids=>{const main=[...ids].sort((a,b)=>(Number(pool.get(b)?.tradeValue)||0)-(Number(pool.get(a)?.tradeValue)||0))[0];if(main)locked.add(main)});
 const baseline=score(deal.result),original=new Set(deal.sends.flat()),candidates=[],seen=new Set();let evaluated=0;
 const consider=(sends,routes,change)=>{
  if(evaluated++>=200||sends.flat().length>8)return;
  const candidate=evaluateTradeDeal(deal.parties,sends,pool,routes);if(!candidate)return;
  const key=JSON.stringify([sends.map(ids=>[...ids].sort()),routes]);if(seen.has(key))return;seen.add(key);
  const p=tradePerspective(candidate.result),current=tradePerspective(deal.result),impacts=candidate.result.rosterImpacts||[p.rosterImpactA??p.weeklyDeltaA,p.rosterImpactB??p.weeklyDeltaB];
  if(candidate.result.fairness<55||impacts.some(v=>Number(v)<-1)||score(candidate.result)<=baseline+.5)return;
  if(Number(p.rosterImpactA??p.weeklyDeltaA)<Number(current.rosterImpactA??current.weeklyDeltaA)-.3)return;
  candidates.push({...candidate,change,score:score(candidate.result)});
 };
 deal.parties.forEach((owner,i)=>{
  const available=owner.playerIds.map(String).filter(id=>!original.has(id)&&pool.has(id)).sort((a,b)=>(Number(pool.get(b)?.tradeValue)||0)-(Number(pool.get(a)?.tradeValue)||0)).slice(0,8);
  const recipients=deal.parties.filter(t=>String(t.id)!==String(owner.id));
  for(const id of available)for(const to of recipients){const sends=deal.sends.map(ids=>[...ids]);sends[i].push(id);consider(sends,{...deal.destinations,[id]:String(to.id)},{type:'add',player:id,from:String(owner.id),to:String(to.id)});}
  for(const old of deal.sends[i].filter(id=>!locked.has(id))){
   if(deal.sends[i].length>1){const sends=deal.sends.map(ids=>[...ids]);sends[i]=sends[i].filter(id=>id!==old);const routes={...deal.destinations};delete routes[old];consider(sends,routes,{type:'remove',player:old,from:String(owner.id)});}
   for(const id of available){const sends=deal.sends.map(ids=>[...ids]);sends[i]=sends[i].map(p=>p===old?id:p);const routes={...deal.destinations,[id]:deal.destinations[old]};delete routes[old];consider(sends,routes,{type:'replace',player:id,previous:old,from:String(owner.id),to:deal.destinations[old]});}
  }
 });
 return candidates.sort((a,b)=>b.score-a.score||a.sends.flat().length-b.sends.flat().length).slice(0,limit);
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
