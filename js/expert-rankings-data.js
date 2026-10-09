import {assessExpertRankings} from './expert-rankings-model.js';
const published='https://raw.githubusercontent.com/CGrant10/dfl-hq/main/data/expert-ros-ppr.json';
const snapshot=new URL('../data/expert-ros-ppr.json',import.meta.url);
let cached=null,inFlight=null,expiresAt=0;
async function read(url){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);try{const response=await fetch(url,{signal:controller.signal,cache:'no-cache'});if(!response.ok)throw new Error('Expert rankings unavailable');return await response.json()}finally{clearTimeout(timer)}}
export async function loadExpertRankings(context={}){
 if(!cached||Date.now()>=expiresAt){
  if(!inFlight)inFlight=(async()=>{
   const results=await Promise.allSettled([read(published),read(snapshot)]);
   const valid=results.filter(r=>r.status==='fulfilled'&&assessExpertRankings(r.value,{...context,season:r.value?.season}).updatedAt).map(r=>r.value);
   const next=valid.sort((a,b)=>b.updatedAt-a.updatedAt||b.fetchedAt-a.fetchedAt)[0];
   if(next&&(!cached||next.updatedAt>=cached.updatedAt))cached=next;
   expiresAt=Date.now()+(next?60*60*1000:60*1000);
  })().finally(()=>{inFlight=null});
  await inFlight;
 }
 return assessExpertRankings(cached,context);
}
