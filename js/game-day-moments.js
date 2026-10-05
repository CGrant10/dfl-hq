import {db} from './supabase.js';
import {savedMoments} from './game-day-moments-model.js';
export async function loadGameDayMoments(model,players,{limit=100,before=null}={}){
 let query=db().from('gameday_moments').select('id,league_id,season,week,captured_at,kind,matchup_id,roster_id,player_id,data').eq('league_id',model.leagueId).eq('season',model.season).eq('week',model.week);
 if(before!=null)query=query.lt('id',before);
 const {data,error}=await query.order('id',{ascending:false}).limit(limit);
 if(error)throw error;return {items:savedMoments(data||[],model,players),cursor:data?.at(-1)?.id??null,more:data?.length===limit};
}
