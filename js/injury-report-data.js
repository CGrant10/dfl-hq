const URL='https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries';
let cache=null,inFlight=null;
export async function loadNflInjuries({force=false}={}){
 if(!force&&cache&&Date.now()-cache.checkedAt<5*60*1000)return cache;
 if(inFlight)return inFlight;
 const request=(async()=>{const response=await fetch(URL,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('Injury report unavailable');const payload=await response.json();if(!Array.isArray(payload?.injuries))throw Error('Invalid injury report');const slim={timestamp:payload.timestamp,injuries:payload.injuries.map(team=>({injuries:(team.injuries||[]).map(p=>({status:p.status,date:p.date,details:{type:p.details?.type||''},athlete:{id:p.athlete?.id,displayName:p.athlete?.displayName,firstName:p.athlete?.firstName,lastName:p.athlete?.lastName,position:p.athlete?.position,team:{abbreviation:p.athlete?.team?.abbreviation},headshot:p.athlete?.headshot,links:p.athlete?.links?.filter(link=>link.rel?.includes('playercard')).slice(0,1)}}))}))};cache={payload:slim,checkedAt:Date.now()};return cache})();
 inFlight=request;try{return await request}finally{inFlight=null}
}
