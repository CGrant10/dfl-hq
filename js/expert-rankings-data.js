import {assessExpertRankings} from './expert-rankings-model.js';
const published='https://raw.githubusercontent.com/CGrant10/dfl-hq/main/data/expert-ros-ppr.json';
const snapshot=new URL('../data/expert-ros-ppr.json',import.meta.url);
let cached=null,inFlight=null,expiresAt=0,checkedAt=0;
async function read(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);try{const response=await fetch(url,{signal:controller.signal,cache:'no-cache'});if(!response.ok)throw new Error('Expert rankings unavailable');return await response.json()}finally{clearTimeout(timer)}}
export async function loadExpertRankings(context={}, {force=false,maxAgeMs=15*60*1000}={}){
 let verified=true;
 if(force||Date.now()>=expiresAt||Date.now()-checkedAt>=maxAgeMs){
  if(!inFlight)inFlight=(async()=>{
   const results=await Promise.allSettled([read(published),read(snapshot)]);
   const valid=results.filter(r=>r.status==='fulfilled'&&assessExpertRankings(r.value,{...context,season:r.value?.season}).updatedAt).map(r=>r.value);
   const next=valid.sort((a,b)=>b.updatedAt-a.updatedAt||b.fetchedAt-a.fetchedAt)[0];
   if(next&&(!cached||next.updatedAt>=cached.updatedAt))cached=next;
   const fresh=next&&assessExpertRankings(cached,context).usable;
   checkedAt=Date.now();
   expiresAt=checkedAt+(fresh?15:5)*60*1000;
   return !!next;
  })().finally(()=>{inFlight=null});
  verified=await inFlight;
 }
 // A final trade recheck must not call an unverified cached consensus fresh
 // after both current reads fail. Keep the cache for ordinary offline views.
 if(force&&!verified)return assessExpertRankings(null,context);
 return assessExpertRankings(cached,context);
}
