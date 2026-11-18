import {assessBackfieldRoles} from './backfield-roles-model.js';
const published='https://raw.githubusercontent.com/CGrant10/dfl-hq/main/data/backfield-roles.json';
const snapshot=new URL('../data/backfield-roles.json',import.meta.url);
let cached=null,inFlight=null,expiresAt=0;
export async function loadBackfieldRoles({force=false}={}){
 if(!force&&cached&&Date.now()<expiresAt)return assessBackfieldRoles(cached);
 if(!inFlight)inFlight=Promise.allSettled([published,snapshot].map(async url=>{
  const response=await fetch(url,{cache:'no-cache',signal:AbortSignal.timeout(2500)});
  if(!response.ok)throw Error('Backfield roles unavailable');return response.json();
 })).then(results=>{
  const valid=results.filter(r=>r.status==='fulfilled'&&assessBackfieldRoles(r.value).fetchedAt).map(r=>r.value).sort((a,b)=>b.fetchedAt-a.fetchedAt);
  if(valid[0]&&(!cached||valid[0].fetchedAt>=cached.fetchedAt))cached=valid[0];
  expiresAt=Date.now()+5*60*1000;
  return valid.length>0;
 }).finally(()=>{inFlight=null});
 const verified=await inFlight;
 return assessBackfieldRoles(force&&!verified?null:cached);
}
