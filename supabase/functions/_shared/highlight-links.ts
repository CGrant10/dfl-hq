import {highlightPlayCandidates,highlightPlayMatch} from '../../../js/highlight-play-link.js';
import {footballPlays,footballAthleteId} from '../../../js/live-football-model.js';
// The summary has athlete names but usually omits structured play participants.
// Resolve those from ESPN's exact play endpoint; never guess from initials.
export async function linkHighlightPlays(clips:any[],summary:any,get:(url:string)=>Promise<any>){
 const raw=footballPlays(summary),names=new Map<string,string>();
 for(const team of summary.boxscore?.players||[])for(const group of team.statistics||[])for(const row of group.athletes||[]){if(row.athlete?.id&&row.athlete?.displayName)names.set(String(row.athlete.id),String(row.athlete.displayName))}
 const candidates=[...new Map(clips.flatMap(clip=>highlightPlayCandidates(clip,raw)).map(play=>[String(play.id),play])).values()].slice(-24),verified:any[]=[],deadline=Date.now()+4000;let cursor=0;
 await Promise.all(Array.from({length:Math.min(3,candidates.length)},async()=>{while(cursor<candidates.length&&Date.now()<deadline){const play=candidates[cursor++];try{
  const detail=await get(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${summary.header.id}/competitions/${summary.header.id}/plays/${play.id}?lang=en&region=us`);
  if(String(detail.id)!==String(play.id))continue;
  verified.push({...detail,gameId:String(summary.header.id),players:(detail.participants||[]).filter((p:any)=>['passer','receiver','rusher','scorer'].includes(p.type)).map((p:any)=>({name:names.get(footballAthleteId(p.athlete))||'',role:p.type}))});
 }catch{/* A missing official participant keeps this clip unlinked. */}}}));
 return clips.map(clip=>({...clip,play_id:highlightPlayMatch(clip,verified,[...names.values()])}));
}
