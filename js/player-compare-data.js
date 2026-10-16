import {loadAnalyzerData} from './team-analyzer-data.js';
import {loadPlayers,loadWeeklyProjections,loadWeeklyStats} from './sleeper.js';
import {buildWeeklyPool} from './weekly-outlook.js';
export async function loadPlayerComparison({refresh=false}={}){
 const analysis=await loadAnalyzerData(refresh?{liveRefresh:true}:{});
 if(analysis.state!=='ready')throw Error('League players unavailable.');
 const season=analysis.projectionSeason,week=analysis.liveWeek;
 const [raw,projections,weeks]=await Promise.all([loadPlayers(),week?loadWeeklyProjections(season,week,{maxAgeMs:60000}).catch(()=>({data:[],stale:true})):{data:[],stale:true},Promise.all(Array.from({length:Math.min(5,week)},(_,i)=>week-i).map(async w=>({...await loadWeeklyStats(season,w,{maxAgeMs:60000}).catch(()=>({data:[],stale:true})),week:w})))]);
 const players=new Map(Object.entries(raw).filter(([,p])=>['QB','RB','WR','TE','K','DEF'].includes(p.p)&&p.n&&p.t).map(([id,p])=>[id,{id,name:p.n,position:p.p,nflTeam:p.t,injuryStatus:p.i||'',modelSource:'unrated'}]));
 for(const [id,p]of analysis.pool)players.set(String(id),{...p,id:String(id)});
 const owners=new Map();for(const team of analysis.teams)for(const id of team.playerIds||[])owners.set(String(id),team.team_name||team.ownerName);
 return {analysis,players,owners,weeks,weekly:buildWeeklyPool(projections.data,analysis.league.scoring_settings,{players,schedule:analysis.nflSchedule}),projectionsStale:!!projections.stale};
}
