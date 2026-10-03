import {nflWeekStatuses} from './clubhouse-matchup-model.js';
const cache=new Map();
export async function loadNflGameDay(season,week,{force=false}={}){
 const key=`${season}:${week}`,hit=cache.get(key);if(!force&&hit&&Date.now()-hit.at<60000)return hit.value;
 const value=(async()=>{const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${Number(season)}&seasontype=2&week=${Number(week)}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('NFL status unavailable');const payload=await response.json();return {payload,teams:nflWeekStatuses(payload,season,week)}})().catch(error=>{cache.delete(key);throw error});cache.set(key,{at:Date.now(),value});return value;
}
