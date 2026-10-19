import {db} from './supabase.js';
import {verifiedPin,markMemberUnlocked} from './member-lock.js';

export function tradeNegotiationApi(member){
 let pin=verifiedPin(member.id);
 async function call(name,args={}){const {data,error}=await db().rpc(name,{...args,p_pin:pin});if(error)throw error;return data;}
 return {
  list:()=>call('trade_room_list'),
  async needsPin(){const {data,error}=await db().rpc('profile_lock_status',{target_member_id:Number(member.id)});if(error)throw error;return !!data&&!pin;},
  read:id=>call('trade_room_read',{p_id:Number(id)}),
  command:(action,{room=null,proposal=null,season=null,requestId=null}={})=>call('trade_room_command',{p_action:action,p_id:room?.id??null,p_revision:room?.revision??0,p_season:season,p_proposal:proposal,p_request_id:requestId}),
  async unlock(value){const {data,error}=await db().rpc('profile_verify_pin',{target_member_id:Number(member.id),attempted_pin:value});if(error)throw error;if(data!==true)throw Error('Wrong profile PIN');pin=value;markMemberUnlocked(member.id,value);},
 };
}
