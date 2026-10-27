import {automaticTradePlayer} from './player-availability.js';
// Shared by manual counteroffers and automatic suggestion balancing. This
// generates candidates only; the caller must re-evaluate every legal roster.
export function tradePackageEdits(state,pool,{lockedIds=[],maxPlayers=8}={}){
 const locked=new Set(lockedIds.map(String)),occupied=new Set(state.sends.flat()),rows=[];
 const add=(sends,destinations,change)=>{
  if(sends.flat().length>maxPlayers)return;
  const totals=state.parties.map(()=>[0,0]);
  state.parties.forEach((team,i)=>sends[i].forEach(id=>{
   const value=Number(pool.get(id)?.tradeValue)||0;totals[i][0]+=value;
   const to=state.parties.findIndex(t=>String(t.id)===destinations[id]);if(to>=0)totals[to][1]+=value;
  }));
  const proximity=Math.min(...totals.map(([out,into])=>Math.min(out,into)/Math.max(out,into,1)));
  rows.push({sends,destinations,changes:[...(state.changes||[]),change],proximity});
 };
 state.parties.forEach((owner,i)=>{
  const available=owner.playerIds.map(String).filter(id=>!occupied.has(id)&&pool.has(id)&&automaticTradePlayer(pool.get(id)));
  for(const id of available)for(const to of state.parties.filter(t=>String(t.id)!==String(owner.id))){
   const sends=state.sends.map(ids=>[...ids]);sends[i].push(id);
   add(sends,{...state.destinations,[id]:String(to.id)},{type:'add',player:id,from:String(owner.id),to:String(to.id)});
  }
  for(const old of state.sends[i].filter(id=>!locked.has(id))){
   if(state.sends[i].length>1){const sends=state.sends.map(ids=>ids.filter(id=>id!==old)),routes={...state.destinations};delete routes[old];add(sends,routes,{type:'remove',player:old,from:String(owner.id)});}
   for(const id of available){const sends=state.sends.map(ids=>[...ids]);sends[i]=sends[i].map(p=>p===old?id:p);const routes={...state.destinations,[id]:state.destinations[old]};delete routes[old];add(sends,routes,{type:'replace',player:id,previous:old,from:String(owner.id),to:state.destinations[old]});}
  }
 });
 return rows.sort((a,b)=>b.proximity-a.proximity);
}
