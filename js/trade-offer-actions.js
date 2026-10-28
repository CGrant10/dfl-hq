// Intent and display order never change the identity of a real package.
export function tradeOfferKey(offer){
 const parties=offer.parties?.map(p=>String(p.id))||[String(offer.other?.id??'')];
 const sends=(offer.sends||[offer.sendA||[],offer.sendB||[]]).map(ids=>[...ids].map(String).sort());
 const routes=offer.destinations?Object.entries(offer.destinations).map(([id,to])=>[String(id),String(to)]).sort(([a],[b])=>a.localeCompare(b)):null;
 return JSON.stringify([parties,sends,routes]);
}
export function availableTradeOffers(offers,passed=[],teamId=''){
 const hidden=new Set(passed);return offers.filter(offer=>!hidden.has(`${teamId}:${tradeOfferKey(offer)}`));
}
export function tradeOfferAnchors(offer,id,side){
 if(offer.parties||!['send','receive'].includes(side))return null;
 const ids=side==='send'?offer.sendA:offer.sendB;
 if(!ids?.map(String).includes(String(id)))return null;
 return {partnerId:String(offer.other.id),memberIds:[],anchorPartnerId:String(offer.other.id),
  sendAnchors:side==='send'?[String(id)]:[],receiveAnchors:side==='receive'?[String(id)]:[],
  sendCount:'any',receiveCount:'any',setupOpen:false,mode:'offers',customOpen:false,visibleCount:6};
}
