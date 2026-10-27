import {nflSummaryMatches,nflGameId} from './nfl-game-center-model.js';
const cache=new Map();
export function loadNflGameSummary(game,season,{force=false}={}){
 if(!nflGameId(game?.id)||!Number.isInteger(Number(season)))return Promise.reject(Error('Invalid NFL game'));
 const key=`${season}:${game.id}`,hit=cache.get(key),ttl=game.state==='post'?300000:20000;
 if(hit&&(!force||hit.pending)&&Date.now()-hit.at<ttl)return hit.promise;
 const entry={at:Date.now(),pending:true,promise:null};
 entry.promise=(async()=>{
  const response=await fetch(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${game.id}`,{signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw Error('NFL play-by-play unavailable');const summary=await response.json();
  if(!nflSummaryMatches(summary,game,season))throw Error('NFL game scope mismatch');return {summary,fetchedAt:Date.now()};
 })().then(value=>{entry.pending=false;return value},error=>{if(cache.get(key)===entry)cache.delete(key);throw error});
 cache.set(key,entry);if(cache.size>40)cache.delete(cache.keys().next().value);return entry.promise;
}
