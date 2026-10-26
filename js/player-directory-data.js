import {validPlayerDirectory} from './player-directory-model.js';
export async function loadCompactPlayers(maxAgeMs){
 if(maxAgeMs<=0)return null;
 try{
  const {db}=await import('./supabase.js');
  const {data,error}=await db().from('nfl_player_directory').select('players,fetched_at').eq('id',1).maybeSingle().abortSignal(AbortSignal.timeout(10000));
  const at=Date.parse(data?.fetched_at),age=Date.now()-at;
  if(error||!Number.isFinite(at)||age<0||age>=maxAgeMs||!validPlayerDirectory(data?.players))return null;
  return {players:data.players,fetchedAt:at};
 }catch{return null}
}
