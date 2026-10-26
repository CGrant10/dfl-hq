import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {footballGame,footballPlays,candidatePlay,footballPlay,footballPlayerIndex,footballProfileMatch,footballAthleteId,LIVE_PLAY_AGE} from '../../../js/live-football-model.js';
import {footballNotificationDrafts} from '../../../js/live-football-notifications.js';
import {MATCHUP_MOMENTS_FILTER} from '../../../js/matchup-moments.js';
import {leagueHealth} from '../../../js/league-health.js';
import {footballMomentRows} from '../../../js/football-moments.js';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
let playerRaw:any=null,playerCache:any=null,playerAt=0,playerPending:Promise<any>|null=null;
const get=async(url:string)=>{const response=await fetch(url,{headers:{'User-Agent':'DFL-HQ-Live-Football/1.0'},signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error(`NFL provider ${response.status}`);return response.json()};
async function playerIndex(){
 if(playerCache&&Date.now()-playerAt<3600000)return playerCache;
 if(!playerPending)playerPending=get('https://api.sleeper.app/v1/players/nfl').then(raw=>{playerRaw=Object.fromEntries(Object.entries(raw).filter(([_id,p]:any)=>['QB','RB','WR','TE'].includes(p.position)&&p.team).map(([id,p]:any)=>[id,{n:p.full_name||`${p.first_name||''} ${p.last_name||''}`,p:p.position,t:p.team,espn_id:p.espn_id}]));playerCache=footballPlayerIndex(playerRaw);playerAt=Date.now();return playerCache}).finally(()=>playerPending=null);
 return playerPending;
}
async function pool<T,R>(values:T[],limit:number,run:(value:T)=>Promise<R>){const results:R[]=[];let index=0;await Promise.all(Array.from({length:Math.min(limit,values.length)},async()=>{while(index<values.length){const value=values[index++];try{results.push(await run(value))}catch(error){console.warn('NFL game capture unavailable',error instanceof Error?error.message:'provider failure')}}}));return results}
function secretKey(){try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}catch{return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}}
Deno.serve(async request=>{
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 const token=request.headers.get('x-dfl-cron-token')||'',hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
 if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
 const input=await request.json().catch(()=>({})),dryRun=input.dryRun===true;
 try{
  const url=Deno.env.get('SUPABASE_URL')||'',admin=createClient(url,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}}),now=Date.now();
  const config=await admin.from('sleeper_config').select('sleeper_league_id,auto_sync_enabled').eq('id',1).single();if(config.error)throw config.error;
  if(!config.data.auto_sync_enabled)return Response.json({ok:true,skipped:'disabled'});
  const state=await get('https://api.sleeper.app/v1/state/nfl'),season=Number(state.season),week=Number(state.week);
  if(state.season_type!=='regular'||week<1||week>18)return Response.json({ok:true,skipped:'outside-regular-season'});
  const [league,scoreboard]=await Promise.all([get(`https://api.sleeper.app/v1/league/${config.data.sleeper_league_id}`),get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${season}&seasontype=2&week=${week}`)]);
  if(Number(league.season)!==season||league.status!=='in_season')return Response.json({ok:true,skipped:'league-not-active'});
  let games:any[]=(scoreboard.events||[]).map((event:any)=>footballGame(event,{season,week,now})).filter((game:any)=>game&&(game.live||game.final&&now-game.kickoff<10*3600000));
  if(!games.length)return Response.json({ok:true,skipped:'no-live-games'});
  const known=await admin.from('nfl_live_games').select('game_id,snapshot').in('game_id',games.map(game=>game.id));if(known.error)throw known.error;
  games=games.filter(game=>{if(game.live)return true;const prior=known.data?.find(row=>row.game_id===game.id)?.snapshot;game.finalSeenAt=Number(prior?.finalSeenAt)||now;return game.final&&now-game.finalSeenAt<LIVE_PLAY_AGE});
  if(!games.length)return Response.json({ok:true,skipped:'no-live-games'});
  const [rosters,rows,members,opted]=await Promise.all([get(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`),get(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${week}`),admin.from('members').select('id,sleeper_user_id'),admin.from('push_subscriptions').select('member_id').eq('enabled',true).contains('categories',MATCHUP_MOMENTS_FILTER)]);
  if(members.error||opted.error)throw members.error||opted.error;
  const health=leagueHealth({league,state,rosters,rows,week});if(!health.ok)throw Error('Live roster health check failed');
  const feeds=await pool<any,any>(games,3,async game=>{
   const summary=await get(`https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=${game.id}`);
   if(String(summary.header?.id)!==game.id||Number(summary.header?.season?.year||season)!==season)throw Error('NFL summary scope mismatch');
   const raw=footballPlays(summary),candidates=raw.filter(play=>candidatePlay(play)&&Number.isFinite(Date.parse(play.wallclock))&&now-Date.parse(play.wallclock)>=0&&now-Date.parse(play.wallclock)<=LIVE_PLAY_AGE).slice(-12);
   const enriched=await pool<any,any>(candidates,3,async play=>{
    // Construct an allow-listed public URL; never follow provider $ref hosts.
    const detail=await get(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${game.id}/competitions/${game.id}/plays/${play.id}?lang=en&region=us`);
    if(String(detail.id)!==String(play.id))throw Error('NFL play scope mismatch');return detail;
   });
   const players=enriched.length?await playerIndex():new Map(),details=new Map(enriched.map(play=>[String(play.id),play]));
   const missing=[...new Set<string>(enriched.flatMap(play=>(play.participants||[]).filter((p:any)=>['passer','receiver','rusher','scorer'].includes(p.type)).map((p:any)=>footballAthleteId(p.athlete))).filter((id:string)=>id&&!players.has(id)))];
   await pool<string,void>(missing,3,async id=>{const profile=await get(`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${season}/athletes/${id}?lang=en&region=us`);if(String(profile.id)!==id)return;const match=footballProfileMatch(profile,playerRaw,game);if(match)players.set(id,match)});
   const plays=raw.map(play=>footballPlay(details.get(String(play.id))||play,game,players)).filter(Boolean);
   if(dryRun)return {game_id:game.id,snapshot:game,plays,fetched_at:new Date(now).toISOString(),dryRun:true};
   const capture=await admin.rpc('capture_nfl_live_game',{p_game:game,p_plays:plays,p_seen:raw.map(play=>String(play.id))});if(capture.error)throw capture.error;return capture.data;
  });
  if(!feeds.length)throw Error('All live game providers unavailable');
  const drafts=footballNotificationDrafts({season,week,feeds,rows,rosters,members:members.data||[],optedMemberIds:(opted.data||[]).map(row=>Number(row.member_id)),now});
  if(dryRun)return Response.json({ok:true,dryRun,season,week,games:feeds.map(feed=>({id:feed.game_id,redZone:feed.snapshot.redZone,plays:feed.plays.length,verified:feed.plays.filter((p:any)=>p.kind).length})),drafts:[],wouldCapture:feeds.length});
  const moments=footballMomentRows({leagueId:String(league.league_id),season,week,feeds,rows,now});
  if(moments.length){const saved=await admin.from('gameday_moments').upsert(moments,{onConflict:'league_id,season,week,event_key',ignoreDuplicates:true});if(saved.error)throw saved.error}
  let created=0,duplicates=0;
  for(const draft of drafts){const response=await fetch(`${url}/functions/v1/send-notification`,{method:'POST',headers:{'Content-Type':'application/json','x-dfl-cron-token':token},body:JSON.stringify(draft),signal:AbortSignal.timeout(10000)});const result=await response.json();if(!response.ok||!result.ok)throw Error(`Live notification delivery ${response.status}`);if(result.duplicate)duplicates++;else if(!result.skipped)created++}
  return Response.json({ok:true,season,week,games:feeds.length,created,duplicates,moments:moments.length});
 }catch(error){console.error('live-football',error instanceof Error?error.message:'capture unavailable');return Response.json({error:'Live football refresh unavailable'},{status:500})}
});
