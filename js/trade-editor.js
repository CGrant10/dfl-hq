import {reconcileTradeDestinations} from './trade-routing.js';
export function tradeEditSnapshot(parties,state){
 return {teamIds:parties.map(t=>String(t.id)),sends:state.sends.map(ids=>[...ids].map(String)),destinations:{...state.destinations}};
}
export function restoreTradeEdit(parties,state,snapshot){
 if(!snapshot||JSON.stringify(snapshot.teamIds)!==JSON.stringify(parties.map(t=>String(t.id)))||snapshot.sends.length!==parties.length)return false;
 const ids=snapshot.sends.flat();
 if(ids.length>8||new Set(ids).size!==ids.length||snapshot.sends.some((send,i)=>send.some(id=>!parties[i].playerIds.map(String).includes(id))))return false;
 state.sends=snapshot.sends.map(ids=>new Set(ids));state.destinations=reconcileTradeDestinations(parties,state.sends,snapshot.destinations);return true;
}
export function replaceTradePlayer(parties,state,side,previous,next){
 previous=String(previous);next=String(next);
 if(!state.sends[side]?.has(previous)||state.sends.some(ids=>ids.has(next))||!parties[side]?.playerIds.map(String).includes(next))return false;
 const recipient=state.destinations?.[previous];
 state.sends[side]=new Set([...state.sends[side]].map(id=>id===previous?next:id));
 delete state.destinations[previous];if(recipient!==undefined)state.destinations[next]=recipient;
 state.destinations=reconcileTradeDestinations(parties,state.sends,state.destinations);return true;
}
