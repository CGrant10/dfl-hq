import {runTradeOfferQuery} from './trade-offer-query.js';
let snapshot=null;
self.onmessage=({data})=>{
  if(data.type==='init'){snapshot=data.snapshot;return;}
  if(data.type!=='search')return;
  try{
    if(!snapshot)throw Error('Player data unavailable');
    self.postMessage({id:data.id,offers:runTradeOfferQuery(snapshot,data.query)});
  }catch{self.postMessage({id:data.id,error:'Couldn’t find offers. Try again.'});}
};
