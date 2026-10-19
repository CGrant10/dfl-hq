export const CROWD_CALLS=Object.freeze({cheer:'FUCKING SEND IT',heckle:'RUN, YOU BASTARD'});
export const stadiumCrowdRun=snapshot=>String(snapshot?.event?.race_manifest?.run_id||`grid-${snapshot?.event?.race_revision??0}`);
export function stadiumReadyState(state,racers,revision){
 const allowed=new Set(racers.map(r=>String(r.id))),watching=new Set(),ready=new Set();
 for(const item of Object.values(state||{}).flat().slice(0,1000)){
  if(!item||typeof item.key!=='string'||!item.key.length||item.key.length>80)continue;
  watching.add(item.key);
  if(item.readyFor===String(revision)&&allowed.has(String(item.racer)))ready.add(String(item.racer));
 }
 return {watching:watching.size,ready:[...ready]};
}
export function stadiumCrowdReaction(value,{run,racers,now=Date.now()}={}){
 if(!value||value.v!==1||typeof value.id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(value.id)
  ||value.run!==run||typeof value.kind!=='string'||!Object.hasOwn(CROWD_CALLS,value.kind)||!Number.isFinite(value.at)||Math.abs(now-value.at)>10000
  ||!racers.some(r=>String(r.id)===value.racer))return null;
 return {id:value.id,racer:value.racer,kind:value.kind,call:CROWD_CALLS[value.kind]};
}
