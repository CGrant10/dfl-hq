import {restoreTradeProposal,evaluateTradeDeal} from './trade-workspace.js';
import {sleeperUrl} from './sleeper-links.js';

export function negotiationProposal(deal){
 if(!deal?.parties||!deal?.sends)return null;
 const rows=deal.parties.map((t,i)=>({id:String(t.id),sends:[...deal.sends[i]].map(String).sort()})).sort((a,b)=>Number(a.id)-Number(b.id));
 return {teamIds:rows.map(r=>r.id),sends:rows.map(r=>r.sends),destinations:Object.fromEntries(Object.entries(deal.destinations||{}).sort(([a],[b])=>a.localeCompare(b)).map(([id,to])=>[id,String(to)]))};
}
export function negotiationDeal(proposal,data,member){
 const deal=restoreTradeProposal(proposal,data.teams,data.pool);if(!deal)return null;
 const mine=member?.sleeper_user_id?deal.parties.findIndex(t=>String(t.sleeper_user_id)===String(member.sleeper_user_id)):-1;
 if(mine<=0)return deal;
 const order=[mine,...deal.parties.map((_,i)=>i).filter(i=>i!==mine)];
 return evaluateTradeDeal(order.map(i=>deal.parties[i]),order.map(i=>deal.sends[i]),data.pool,deal.destinations);
}
export function negotiationActions(room,memberId){
 if(!room||(room.member_ids||[]).every(id=>String(id)!==String(memberId)))return [];
 const sender=String(room.sender_id)===String(memberId),accepted=(room.accepted_ids||[]).some(id=>String(id)===String(memberId));
 if(room.status==='draft')return String(room.owner_id)===String(memberId)?['edit','send','remove']:[];
 if(room.status!=='pending')return [];
 return sender?['withdraw']:['counter',...accepted?[]:['accept'],'decline'];
}
export function negotiationStatus(room,memberId){
 if(room.status==='agreed')return 'Agreed in DFL';
 if(room.status==='pending')return negotiationActions(room,memberId).includes('accept')?'Your move':`Waiting · ${(room.accepted_ids||[]).length}/${(room.member_ids||[]).length} agreed`;
 return {draft:'Draft',declined:'Declined',withdrawn:'Withdrawn'}[room.status]||'Offer';
}
export function negotiationChanges(previous,next){
 const routes=p=>new Map((p?.teamIds||[]).flatMap((from,i)=>(p.sends[i]||[]).map(id=>[String(id),{from:String(from),to:String(p.destinations?.[id]||'')}])));
 const a=routes(previous),b=routes(next),changes=[];
 for(const [id,route] of a)if(!b.has(id))changes.push({id,kind:'removed',...route});
 for(const [id,route] of b){const old=a.get(id);if(!old)changes.push({id,kind:'added',...route});else if(old.to!==route.to||old.from!==route.from)changes.push({id,kind:'rerouted',...route});}
 return changes;
}
export function negotiationSleeperUrl(room){return sleeperUrl(room?.league_id);}
