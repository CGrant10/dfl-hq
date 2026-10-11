import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {nflWeekStatuses} from '../../../js/clubhouse-matchup-model.js';
import {leagueHealth} from '../../../js/league-health.js';
import {buildWeeklyPool} from '../../../js/weekly-outlook.js';
import {buildPlayerPool} from '../../../js/team-analyzer.js';
import {assessExpertRankings} from '../../../js/expert-rankings-model.js';
import {buildAdviceReceipts} from '../../../js/advice-receipts.js';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
const get=async(url:string)=>{const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 DFL-HQ-Advice/1.0'},signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`Advice provider ${new URL(url).hostname}: ${r.status}`);return r.json()};
function secretKey(){try{return JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}catch{return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}}
Deno.serve(async request=>{
  if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  const token=request.headers.get('x-dfl-cron-token')||'';
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token))),b=>b.toString(16).padStart(2,'0')).join('');
  if(token.length<32||hash!==TOKEN_HASH)return Response.json({error:'Unauthorized'},{status:401});
  const input=await request.json().catch(()=>({})),dryRun=input.dryRun===true;
  try{
    const admin=createClient(Deno.env.get('SUPABASE_URL')||'',secretKey(),{auth:{persistSession:false,autoRefreshToken:false}});
    const config=await admin.from('sleeper_config').select('sleeper_league_id,auto_sync_enabled').eq('id',1).single();if(config.error)throw config.error;
    if(!config.data?.auto_sync_enabled)return Response.json({ok:true,skipped:'disabled'});
    const state=await get('https://api.sleeper.app/v1/state/nfl'),season=Number(state.season),week=Number(state.week);
    if(state.season_type!=='regular'||week<1||week>18)return Response.json({ok:true,skipped:'outside-regular-season'});
    const leagueId=String(config.data.sleeper_league_id);
    const [league,scoreboard,checks,saved]=await Promise.all([get(`https://api.sleeper.app/v1/league/${leagueId}`),
      get(`https://cdn.espn.com/core/nfl/scoreboard?xhr=1&limit=50&dates=${season}&seasontype=2&week=${week}`),
      admin.from('roster_advice_checks').select('roster_id,checked_at').eq('league_id',leagueId).eq('season',season).eq('week',week),
      admin.from('roster_advice_receipts').select('roster_id,kind').eq('league_id',leagueId).eq('season',season).eq('week',week)]);
    if(checks.error)throw checks.error;if(saved.error)throw saved.error;
    if(Number(league.season)!==season||league.status!=='in_season')return Response.json({ok:true,skipped:'league-not-active'});
    const schedule=nflWeekStatuses(scoreboard?.content?.sbData,season,week);
    if(![...schedule.values()].some(s=>s.key==='upcoming'&&Date.parse(s.kickoff)>Date.now()+60000))return Response.json({ok:true,skipped:'no-upcoming-games'});
    const [rosters,rows]=await Promise.all([get(`https://api.sleeper.app/v1/league/${leagueId}/rosters`),get(`https://api.sleeper.app/v1/league/${leagueId}/matchups/${week}`)]);
    const health=leagueHealth({league,state,rosters,rows,week});if(!health.ok)throw Error(`League health: ${health.issues.join(', ')}`);
    const checked=new Map((checks.data||[]).map(r=>[Number(r.roster_id),Date.parse(r.checked_at)]));
    const kinds=(id:number)=>(saved.data||[]).filter(r=>Number(r.roster_id)===id).map(r=>r.kind);
    const targets=rosters.filter((r:any)=>kinds(Number(r.roster_id)).length<2).sort((a:any,b:any)=>(checked.get(Number(a.roster_id))||0)-(checked.get(Number(b.roster_id))||0)||a.roster_id-b.roster_id);
    const target=targets[0];if(!target)return Response.json({ok:true,skipped:'calls-recorded'});
    // One roster per poll keeps the legal-lineup search within the worker's CPU
    // budget. Already-recorded calls are immutable; empty reviews rotate too.
    const weeks=Array.from({length:Math.min(3,19-week)},(_,i)=>week+i),completedWeeks=Array.from({length:Math.min(week-1,17)},(_,i)=>i+1);
    const [players,prior,current,market,weeklyRows,seasonRows,experts]=await Promise.all([
      get('https://api.sleeper.app/v1/players/nfl'),get(`https://api.sleeper.app/v1/stats/nfl/regular/${season-1}`),get(`https://api.sleeper.app/v1/stats/nfl/regular/${season}`),
      get(`https://api.sleeper.app/projections/nfl/${season}?season_type=regular&order_by=adp_ppr&position[]=QB&position[]=RB&position[]=WR&position[]=TE`),
      Promise.all(weeks.map(w=>get(`https://api.sleeper.app/projections/nfl/${season}/${w}?season_type=regular`))),
      Promise.all(completedWeeks.map(w=>get(`https://api.sleeper.app/stats/nfl/${season}/${w}?season_type=regular`))),
      get('https://raw.githubusercontent.com/CGrant10/dfl-hq/main/data/expert-ros-ppr.json').catch(()=>null)]);
    if(!players||Array.isArray(players)||!prior||!current||!Array.isArray(market)||weeklyRows.some(r=>!Array.isArray(r)||!r.length)||seasonRows.some(r=>!Array.isArray(r)))throw Error('Incomplete advice inputs');
    const submitted=rosters.map((r:any)=>({...r,starters:rows.find((s:any)=>String(s.roster_id)===String(r.roster_id))?.starters||[]}));
    const now=Date.now(),signals={fetchedAt:now,stale:false};
    const valueInput:any={rosters:submitted,players,previousStats:prior,currentStats:current,projections:market,weeklyProjections:weeklyRows[0],
      recentStats:seasonRows.slice(-3),seasonWeeklyStats:seasonRows,scoringSettings:league.scoring_settings,currentWeek:week,scoringFormat:'ppr',
      expertRankings:assessExpertRankings(experts,{season,scoring:'ppr',now} as any),dataSignals:{projections:signals,production:signals,availability:signals,weeklyResults:signals}};
    const values=buildPlayerPool(valueInput);
    const weekly=weeklyRows.map((r:any,i:number)=>({week:weeks[i],pool:buildWeeklyPool(r,league.scoring_settings)}));
    const receiptInput:any={league,rosters:submitted,rosterId:target.roster_id,weekly,values,schedule,season,week,now};
    const receipts=buildAdviceReceipts(receiptInput)
      .filter(r=>!kinds(Number(target.roster_id)).includes(r.kind)&&Date.parse(r.locks_at)>Date.now()+60000);
    if(dryRun)return Response.json({ok:true,dryRun,season,week,rosterId:target.roster_id,health,receipts});
    if(receipts.length){const result=await admin.from('roster_advice_receipts').upsert(receipts,{onConflict:'league_id,season,week,roster_id,kind',ignoreDuplicates:true});if(result.error)throw result.error}
    const review=await admin.from('roster_advice_checks').upsert({league_id:leagueId,season,week,roster_id:target.roster_id,checked_at:new Date().toISOString()},{onConflict:'league_id,season,week,roster_id'});if(review.error)throw review.error;
    return Response.json({ok:true,season,week,rosterId:target.roster_id,recorded:receipts.length});
  }catch(error){console.error('roster-advice',error);return Response.json({error:error instanceof Error?error.message.slice(0,240):'Advice capture unavailable'},{status:500})}
});
