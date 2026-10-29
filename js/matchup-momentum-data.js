import {db} from './supabase.js';
export async function loadMatchupScoreHistory(model,game){
 const {data,error}=await db().from('gameday_score_history').select('id,league_id,season,week,matchup_id,roster1,roster2,score1,score2,observed_at')
  .eq('league_id',model.leagueId).eq('season',model.season).eq('week',model.week).eq('matchup_id',Number(game.id)).order('id',{ascending:false}).limit(1000).abortSignal(AbortSignal.timeout(10000));
 if(error)throw error;return data||[];
}
