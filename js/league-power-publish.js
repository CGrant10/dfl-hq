import {buildPowerBoards,POWER_MODEL_VERSION} from './league-power-model.js';
import {powerRosterForecast} from './league-power-roster.js';
/** Scheduled service client only. Insert-once editions never rewrite a prior
 * roster, injury assessment, rank or movement when current rosters change. */
export async function publishLeaguePower({database,league,rosters,users=[],projections=[],loadPlayers,week}){
 const season=Number(league.season),leagueId=String(league.league_id),target=Math.min(14,Number(week)-1);
 if(target<1||!Array.isArray(rosters)||rosters.length!==Number(league.total_rosters))return {skipped:'incomplete-league'};
 const saved=await database.from('league_power_publications').select('season,week,model_version,payload,published_at').eq('league_id',leagueId).eq('season',season).eq('model_version',POWER_MODEL_VERSION).order('week',{ascending:true});
 if(saved.error)throw saved.error;
 if(saved.data.some(p=>p.week===target))return {skipped:'published'};
 const games=await database.from('sleeper_matchups').select('season,week,roster1,user1,score1,roster2,user2,score2').eq('season',season).eq('league_id',leagueId).lte('week',target);
 if(games.error)throw games.error;
 const players=projections.length?await loadPlayers():{};
 const teams=rosters.map(r=>{const owner=users.find(u=>String(u.user_id)===String(r.owner_id));return {...r,id:String(r.roster_id),sleeper_user_id:r.owner_id,team_name:owner?.metadata?.team_name||owner?.display_name||`Team ${r.roster_id}`,powerForecast:powerRosterForecast(r,projections,players,league.scoring_settings)};});
 const model=buildPowerBoards({teams,matchups:games.data,season,currentWeek:week,publications:saved.data});
 if(model?.latestWeek!==target)return {skipped:'scores-pending'};
 const editions=model.boards.filter(b=>b.week>0&&!b.published).map(b=>({league_id:leagueId,season,week:b.week,model_version:POWER_MODEL_VERSION,
  payload:{...b,reconstructed:b.week!==target,rows:b.rows.map(r=>({...r,history:r.history.slice(-3)}))}}));
 if(editions.length){const result=await database.from('league_power_publications').upsert(editions,{onConflict:'league_id,season,week,model_version',ignoreDuplicates:true});if(result.error)throw result.error;}
 return {published:editions.length,week:target};
}
