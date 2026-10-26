import {db} from './supabase.js';
import {savedMoments} from './game-day-moments-model.js';
export async function loadGameDayMoments(model,players,{limit=100,before=null,gameId=null,eventKey=null}={}){
 let query=db().from('gameday_moments').select('id,event_key,league_id,season,week,captured_at,kind,matchup_id,roster_id,player_id,data').eq('league_id',model.leagueId).eq('season',model.season).eq('week',model.week);
 if(gameId!==null)query=query.eq('matchup_id',Number(gameId));
 if(eventKey!==null)query=query.eq('event_key',eventKey);
 if(before!=null)query=query.lt('id',before);
 const {data,error}=await query.order('id',{ascending:false}).limit(Math.max(1,Math.min(200,limit))).abortSignal(AbortSignal.timeout(12000));
 if(error)throw error;return {items:savedMoments(data||[],model,players),cursor:data?.at(-1)?.id??null,more:data?.length===limit};
}
