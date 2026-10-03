import {db} from './supabase.js';
import {sleeper,loadPlayers} from './sleeper.js';
import {loadMemberDirectory} from './members.js';
import {buildWeeklyClubhouse} from './weekly-clubhouse-model.js';
const cache=new Map();
export async function loadWeeklyRosters(leagueId,week,{maxAgeMs=600000}={}){
 if(!leagueId)return[];const key=`${leagueId}:${week}`,hit=cache.get(key);if(hit&&Date.now()-hit.at<maxAgeMs)return hit.value;
 const promise=sleeper.matchups(leagueId,week).then(rows=>{if(!Array.isArray(rows)||!rows.length)throw Error('Weekly roster data unavailable');return rows}).catch(error=>{cache.delete(key);throw error});cache.set(key,{at:Date.now(),value:promise});return promise;
}
export async function loadClubhouseIndex(){const{data,error}=await db().rpc('clubhouse_week_index');if(error)throw error;return data||[]}
export async function loadClubhouseWeek(season,week){const{data,error}=await db().rpc('clubhouse_week_data',{p_season:season,p_week:week});if(error)throw error;if(!data?.games?.length)throw Error('This week has not been synced yet.');data.voteClosed=Date.now()>=Date.parse(data.voteClosesAt);return data}
export async function enrichClubhouseWeek(data,members){
 const results=await Promise.allSettled([loadWeeklyRosters(data.leagueId,data.week),loadPlayers()]);
 const raw=results[0].status==='fulfilled'?results[0].value:[],players=results[1].status==='fulfilled'?results[1].value:{};
 return{...buildWeeklyClubhouse(data,members,raw,players),rawRosters:raw,playerDirectory:players};
}
export async function loadMemberWeeklyAwards(season,memberId){
 const[{data,error},members,players]=await Promise.all([db().rpc('clubhouse_award_archive',{p_season:season}),loadMemberDirectory(),loadPlayers().catch(()=>({}))]);if(error)throw error;
 const weeks=[...new Set((data.games||[]).map(g=>g.week))].sort((a,b)=>b-a),results=new Map();let cursor=0;
 await Promise.all(Array.from({length:Math.min(3,weeks.length)},async()=>{while(cursor<weeks.length){const week=weeks[cursor++];try{results.set(week,await loadWeeklyRosters(data.leagueId,week))}catch{results.set(week,[])}}}));
 const awards=[];for(const week of weeks){const model=buildWeeklyClubhouse({season,week,completed:true,voteOpen:!(data.closedWeeks||[]).includes(week),games:data.games.filter(g=>g.week===week),votes:data.votes.filter(v=>v.week===week)},members,results.get(week),players);for(const award of model.awards){const mine=award.winners.filter(w=>String(w.memberId)===String(memberId));if(mine.length)awards.push({...award,week,winners:mine})}}
 return{awards,unavailable:weeks.filter(w=>!results.get(w)?.length).length};
}
