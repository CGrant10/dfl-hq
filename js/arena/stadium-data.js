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
export async function removeStadiumRace(event){
 const {data,error}=await db().rpc('arena_stadium_command',{p_event_id:event.id,p_action:'remove',p_revision:event.race_revision});
 if(error)throw error;if(String(data?.removed_id)!==String(event.id))throw Error('The race could not be removed.');return data;
}
export function createStadiumClock(now=()=>performance.now()){
 let server=0,at=0;
 return {sync(serverMs,sentAt,receivedAt=now()){server=Number(serverMs)+Math.max(0,receivedAt-sentAt)/2;at=receivedAt;},now:()=>server+now()-at};
}
export async function loadMyRacerKit(memberId){const {data,error}=await db().from('arena_racer_kits').select('kit,revision,member_id').eq('member_id',memberId).maybeSingle();if(error)throw error;return data;}
export async function saveMyRacerKit(kit,revision,pin){const {data,error}=await db().rpc('arena_save_racer_kit',{p_kit:kit,p_revision:revision,p_pin:pin||null});if(error)throw error;if(!data?.kit)throw Error('Racer could not be saved.');return data;}
