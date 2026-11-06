import {evaluateTradeDeal,restoreTradeProposal,savedTradeProposal} from './trade-workspace.js';
import {automaticTradePlayer} from './player-availability.js';
import {tradeOfferKey} from './trade-offer-actions.js';
export function boardOfferDeal(offer,mine,teams,pool){
 const ids=(offer.parties||[mine,offer.other]).map(t=>String(t?.id)),parties=ids.map(id=>teams.find(t=>String(t.id)===id));
 if(parties.some(t=>!t)||String(parties[0]?.id)!==String(mine?.id))return null;
 return evaluateTradeDeal(parties,offer.sends||[offer.sendA,offer.sendB],pool,offer.destinations);
}
export function replaceBoardPlayer(deal,owner,id,nextId,pool,{positions,locked=[]}={}){
 const i=Number(owner),old=String(id),next=String(nextId),player=pool.get(next);
 if(!deal?.parties[i]||!deal.sends[i].includes(old)||locked.map(String).includes(old)||!player||!automaticTradePlayer(player)
  ||positions&&!positions.includes(player.position)||deal.sends.flat().includes(next)||!deal.parties[i].playerIds.map(String).includes(next))return null;
 const sends=deal.sends.map(ids=>[...ids]),destinations={...deal.destinations,[next]:deal.destinations[old]};delete destinations[old];sends[i]=sends[i].map(p=>p===old?next:p);
 return evaluateTradeDeal(deal.parties,sends,pool,destinations);
}
export function boardDealKey(deal){return tradeOfferKey({parties:deal.parties,sends:deal.sends,destinations:deal.destinations})}
export function boardProposal(deal){return {...savedTradeProposal(deal),id:boardDealKey(deal)}}
export function restoreBoardChoice(choice,mine,teams,pool){return String(choice?.teamIds?.[0])===String(mine?.id)?restoreTradeProposal(choice,teams,pool):null}
