export const WATCHLIST_NOTIFICATION_FILTER=JSON.stringify(['waivers']);
export const watchAlertKey=(c,season,week)=>`weekly:watch:${season}:${week}:${c.memberId}:${c.id}:${c.revision}`;
/** @param {{changes:Array<any>,opted:Array<number>,notifiedKeys?:Array<string>,season:number,week:number,now?:number}} input */
export async function buildWatchlistDrafts({changes,opted,notifiedKeys=[],season,week,now=Date.now()}){
 const sent=new Set(notifiedKeys),drafts=[];
 const eligible=changes.filter(c=>opted.includes(c.memberId)&&!sent.has(watchAlertKey(c,season,week)));
 for(const memberId of new Set(eligible.map(c=>c.memberId))){
  const own=eligible.filter(c=>c.memberId===memberId).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,20),watchKeys=own.map(c=>watchAlertKey(c,season,week));
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(watchKeys.join('|')))),b=>b.toString(16).padStart(2,'0')).join('');
  const details=own.slice(0,2).map(c=>`${c.name}: ${c.copy}`).join('; ');
  drafts.push({title:own.length===1?`${own[0].name} · watchlist update`:`${own.length} watched players changed`,body:details.slice(0,180)+(own.length>2?`; +${own.length-2} more`:'')+'. Check before making a move.',category:'waivers',audience:'members',targetMemberIds:[memberId],targetUrl:'#/analyzer?watchlist=1',watchPlayerIds:own.map(c=>c.id),watchKeys,sourceKey:`weekly:watch:${season}:${week}:${memberId}:${digest}`,expiresAt:new Date(now+2*3600000).toISOString()});
 }
 return drafts;
}
