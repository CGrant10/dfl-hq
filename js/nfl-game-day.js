import {reportAppIssue} from './app-diagnostics.js';
import {nflWeekStatuses} from './clubhouse-matchup-model.js';
const cache=new Map();
export async function loadNflGameDay(season,week,{force=false,maxAgeMs=20000}={}){
 const key=`${season}:${week}`,hit=cache.get(key);if(hit&&(hit.pending||!force&&Date.now()-hit.at<maxAgeMs))return hit.value;
 const value=(async()=>{const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${Number(season)}&seasontype=2&week=${Number(week)}`,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error('NFL status unavailable');const payload=await response.json();return {fetchedAt:Date.now(),payload,teams:nflWeekStatuses(payload,season,week)}})().catch(error=>{cache.delete(key);reportAppIssue("request_error","nfl");throw error});const entry={at:Date.now(),value,pending:true};cache.set(key,entry);void value.then(()=>{entry.pending=false},()=>{});return value;
}
