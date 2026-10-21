import {db} from './supabase.js';
import {getMemberId} from './members.js';
import {verifiedPin,markMemberUnlocked} from './member-lock.js';
export function tradeIntentionsApi(member){
 let pin=member?verifiedPin(member.id):null;
 const check=()=>{if(!member||String(getMemberId())!==String(member.id))throw Error('Your selected member changed. Reopen Trade.');};
 return {
  async list(){const {data,error}=await db().rpc('trade_intentions_list');if(error)throw error;if(!Array.isArray(data))throw Error('Intentions unavailable.');return data;},
  async save({season,leagueId,revision,players,needs}){check();const {data,error}=await db().rpc('trade_intentions_save',{p_season:season,p_league:leagueId,p_revision:revision,p_players:players,p_needs:needs,p_pin:pin});check();if(error)throw error;return data;},
  async unlock(value){check();const {data,error}=await db().rpc('profile_verify_pin',{target_member_id:Number(member.id),attempted_pin:value});check();if(error)throw error;if(data!==true)throw Error('Wrong profile PIN');pin=value;markMemberUnlocked(member.id,value);},
 };
}
