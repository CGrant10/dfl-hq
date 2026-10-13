import {db} from '../supabase.js';
export async function loadStadiumRace(id){
 const {data,error}=await db().rpc('arena_stadium_snapshot',{p_event_id:String(id)});
 if(error)throw error;if(!data?.event||!Number.isFinite(Number(data.server_ms)))throw Error('Race unavailable.');return data;
}
export async function commandStadiumRace(snapshot,action,{name,duration,memberIds}={}){
 const {data,error}=await db().rpc('arena_stadium_command',{p_event_id:snapshot?.event?.id??null,p_action:action,p_revision:snapshot?.event?.race_revision??0,
  p_name:name??null,p_duration_seconds:duration??null,p_member_ids:memberIds??null});
 if(error)throw error;if(!data?.event)throw Error('The race could not be changed.');return data;
}
export function createStadiumClock(now=()=>performance.now()){
 let server=0,at=0;
 return {sync(serverMs,sentAt,receivedAt=now()){server=Number(serverMs)+Math.max(0,receivedAt-sentAt)/2;at=receivedAt;},now:()=>server+now()-at};
}
