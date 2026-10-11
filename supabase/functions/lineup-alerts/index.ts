import {leagueHealth} from '../../../js/league-health.js';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {lineupAlertDrafts,lineupAlertSourceKey} from '../../../js/lineup-alert-model.js';
import {nflWeekStatuses} from '../../../js/clubhouse-matchup-model.js';
import {gameDayLineup} from '../../../js/game-day-model.js';
import {matchesDflStartingSlots} from '../../../js/analyzer-league-context.js';
import {buildWeeklyPool} from '../../../js/weekly-outlook.js';
import {MATCHUP_MOMENTS_FILTER,matchupMomentDrafts,matchupMomentWindow} from '../../../js/matchup-moments.js';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
const get=async(url:string)=>{const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 DFL-HQ-Roster-Coach/1.0'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw Error(`Roster alert provider ${new URL(url).hostname}: ${response.status}`);return response.json()};
function secretKey(){try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}catch{return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}}
Deno.serve(async request=>{
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  const token=request.headers.get('x-dfl-cron-token')||'';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
  if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
  const input=await request.json().catch(()=>({})),dryRun=input.dryRun===true;
  try{
    const url=Deno.env.get('SUPABASE_URL')||'',admin=createClient(url,secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:config,error}=await admin.from('sleeper_config').select('sleeper_league_id,auto_sync_enabled').eq('id',1).single();if(error)throw error;
    if(!config?.auto_sync_enabled)return Response.json({ok:true,skipped:'disabled'});
    const state=await get('https://api.sleeper.app/v1/state/nfl');
    const season=Number(state.season),week=Number(state.week);
    if(state.season_type!=='regular'||week<1||week>18)return Response.json({ok:true,skipped:'outside-regular-season'});
    // Use the same public scoreboard endpoint as the existing sportsbook worker.
    const [league,scoreboard]=await Promise.all([get(`https://api.sleeper.app/v1/league/${config.sleeper_league_id}`),get(`https://cdn.espn.com/core/nfl/scoreboard?xhr=1&limit=50&dates=${season}&seasontype=2&week=${week}`)]);
    if(Number(league.season)!==season||league.status!=='in_season'||!matchesDflStartingSlots(league.roster_positions))return Response.json({ok:true,skipped:'league-not-active'});
    const schedule=nflWeekStatuses(scoreboard?.content?.sbData,season,week),now=Date.now();
    const windowOpen=[...schedule.values()].some(s=>s.key==='upcoming'&&Date.parse(s.kickoff)>now&&Date.parse(s.kickoff)-now<=90*60000);
    const momentWindow=matchupMomentWindow(schedule,now);
    if(!windowOpen&&!momentWindow.live&&!momentWindow.final&&!dryRun)return Response.json({ok:true,skipped:'no-game-window'});
    const opted=await admin.from('push_subscriptions').select('member_id').eq('enabled',true).contains('categories',MATCHUP_MOMENTS_FILTER);
    if(opted.error)console.warn('Matchup moment preferences unavailable; keeping lineup checks');
    const optedMemberIds=[...new Set((opted.error?[]:opted.data||[]).map(row=>Number(row.member_id)))];
    if(!windowOpen&&!optedMemberIds.length&&!dryRun)return Response.json({ok:true,skipped:'no-opted-moments'});
    const [rosters,rows,projections,members]=await Promise.all([
      get(`https://api.sleeper.app/v1/league/${league.league_id}/rosters`),get(`https://api.sleeper.app/v1/league/${league.league_id}/matchups/${week}`),
      get(`https://api.sleeper.app/projections/nfl/${season}/${week}?season_type=regular`),admin.from('members').select('id,sleeper_user_id'),
    ]);
    if(members.error)throw members.error;
    const health=leagueHealth({league,state,rosters,rows,week});
    if(!health.ok)throw Error(`League health check failed: ${health.issues.join(', ')}`);
    if(!Array.isArray(projections))throw Error('Incomplete roster alert data');
    const {data:previous,error:previousError}=await admin.from('notification_messages').select('source_key,lineup_alert_keys').like('source_key',`weekly:lineup:${season}:${week}:%`);
    if(previousError)throw previousError;
    const notifiedKeys=(previous||[]).flatMap(row=>row.lineup_alert_keys||[row.source_key]);
    const pool:Map<string,any>=buildWeeklyPool(projections,league.scoring_settings),players=Object.fromEntries([...pool].map(([id,p])=>[id,{n:p.name,p:p.position,t:p.team,i:p.injuryStatus,b:p.hasGame===false}]));
    const teams=rosters.flatMap((r:any)=>{
      const member=members.data?.find((m:any)=>String(m.sleeper_user_id)===String(r.owner_id)),row=rows.find((s:any)=>String(s.roster_id)===String(r.roster_id));if(!member||!row)return [];
      const lineup=gameDayLineup({...row,players:r.players},players,schedule,{rosterPositions:league.roster_positions});
      return [{...lineup,bench:lineup.bench.map((p:any)=>({...p,activeRoster:![...(r.reserve||[]),...(r.taxi||[])].map(String).includes(p.id),projection:pool.get(p.id)?.points})),memberId:member.id,uid:r.owner_id,roster:r.roster_id}];
    });
    const drafts=lineupAlertDrafts({season,week,teams,now,notifiedKeys});
    let moments:any[]=[],momentsUnavailable=!!opted.error;
    if((optedMemberIds.length||dryRun&&input.previewMoments===true)&&(momentWindow.live||momentWindow.final)){
      const results=await Promise.allSettled([get(`https://api.sleeper.app/v1/league/${league.league_id}/users`),
        admin.from('notification_messages').select('source_key').like('source_key',`weekly:matchup:${season}:${week}:%`)]);
      const users=results[0].status==='fulfilled'?results[0].value:null;
      const past=results[1].status==='fulfilled'?results[1].value:null;
      if(!Array.isArray(users)||!past||past.error||rosters.some((r:any)=>!users.some((u:any)=>String(u.user_id)===String(r.owner_id))))momentsUnavailable=true;
      else{
        const teamNames=new Map<string,string>(rosters.map((r:any):[string,string]=>{const user=users.find((u:any)=>String(u.user_id)===String(r.owner_id));return [String(r.roster_id),user.metadata?.team_name||user.display_name||`Team ${r.roster_id}`]}));
        moments=matchupMomentDrafts({season,week,rows,rosters,members:members.data||[],players,schedule,teamNames,now,
          optedMemberIds:dryRun&&input.previewMoments===true?(members.data||[]).map(m=>Number(m.id)):optedMemberIds,
          notifiedKeys:(past.data||[]).map((row:any)=>row.source_key)});
      }
    }
    if(dryRun)return Response.json({ok:true,dryRun,season,week,windowOpen,rostersChecked:rosters.length,health,drafts,
      momentWindow,optedOwners:optedMemberIds.length,momentsUnavailable,moments});
    let created=0,duplicates=0;
    for(const draft of [...drafts,...moments]){
      const response=await fetch(`${url}/functions/v1/send-notification`,{method:'POST',headers:{'Content-Type':'application/json','x-dfl-cron-token':token},body:JSON.stringify({...draft,sourceKey:draft.sourceKey||await lineupAlertSourceKey(draft)}),signal:AbortSignal.timeout(15000)});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(`Lineup alert delivery ${response.status}`);
      if(result.duplicate)duplicates++;else if(!result.skipped)created++;
    }
    return Response.json({ok:true,season,week,created,duplicates,momentsUnavailable});
  }catch(error){console.error('lineup-alerts',error);const detail=error&&typeof error==='object'&&'message' in error?String(error.message).slice(0,240):'Roster alerts unavailable';return Response.json({error:detail},{status:500})}
});
