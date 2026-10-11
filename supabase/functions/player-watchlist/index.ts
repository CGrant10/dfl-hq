import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {buildWatchlistDrafts} from '../../../js/watchlist-alerts.js';
import {watchlistChanges} from '../../../js/player-watchlist-model.js';
import {nflWeekStatuses} from '../../../js/clubhouse-matchup-model.js';
import {matchesDflStartingSlots} from '../../../js/analyzer-league-context.js';
const TOKEN_HASH='c7429c5c8cfd182e13e7f1b537b0f671b0b99dcb004b19f8580b960f8f957091';
const get=async(url:string)=>{const r=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error(`Watchlist provider ${new URL(url).hostname}: ${r.status}`);return r.json()};
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
  if(!dryRun){const claimed=await admin.rpc('claim_player_watch_poll');if(claimed.error)throw claimed.error;if(!claimed.data)return Response.json({ok:true,skipped:'poll-in-progress'});}
  const devices=await admin.from('player_watch_devices').select('id,member_id,league_id').eq('league_id',config.sleeper_league_id).gte('updated_at',new Date(Date.now()-90*86400000).toISOString()).order('updated_at',{ascending:false}).limit(120);
  if(devices.error)throw devices.error;if(!devices.data?.length)return Response.json({ok:true,dryRun,skipped:'no-watchlists'});
  const [items,members,subscriptions,state]=await Promise.all([
   admin.from('player_watch_items').select('device_id,player_id,created_at').in('device_id',devices.data.map(d=>d.id)).limit(2400),
   admin.from('members').select('id,sleeper_user_id').eq('active',true),
   admin.from('push_subscriptions').select('member_id,categories,enabled').eq('enabled',true),
   get('https://api.sleeper.app/v1/state/nfl')
  ]);
  for(const result of [items,members,subscriptions])if(result.error)throw result.error;
  const season=Number(state.season),week=Number(state.week);
  if(state.season_type!=='regular'||week<1||week>18)return Response.json({ok:true,skipped:'outside-regular-season'});
  const watched=(items.data||[]).flatMap(item=>{const device=devices.data.find(d=>d.id===item.device_id),member=members.data?.find(m=>m.id===device?.member_id);return member?[{...item,...device,player_id:item.player_id,sleeper_user_id:member.sleeper_user_id}]:[]});
  if(!watched.length)return Response.json({ok:true,dryRun,skipped:'empty-watchlists'});
  const [league,rosters,players,scoreboard,previous]=await Promise.all([
   get(`https://api.sleeper.app/v1/league/${config.sleeper_league_id}`),get(`https://api.sleeper.app/v1/league/${config.sleeper_league_id}/rosters`),get('https://api.sleeper.app/v1/players/nfl'),
   get(`https://cdn.espn.com/core/nfl/scoreboard?xhr=1&limit=50&dates=${season}&seasontype=2&week=${week}`),
   admin.from('player_watch_states').select('*').eq('league_id',config.sleeper_league_id).in('member_id',[...new Set(watched.map(w=>w.member_id))]).limit(2400)
  ]);
  if(previous.error)throw previous.error;
  if(Number(league.season)!==season||league.status!=='in_season'||Number(league.total_rosters)!==12||!matchesDflStartingSlots(league.roster_positions))return Response.json({ok:true,skipped:'league-not-active'});
  if(!players||typeof players!=='object'||Array.isArray(players)||Object.keys(players).length<1000)throw Error('Complete current players required');
  const schedule=nflWeekStatuses(scoreboard?.content?.sbData,season,week);
  const matchupMembers=[...new Set((subscriptions.data||[]).filter(s=>Array.isArray(s.categories)&&s.categories.includes('matchups')).map(s=>Number(s.member_id)))];
  const opted=[...new Set((subscriptions.data||[]).filter(s=>Array.isArray(s.categories)&&s.categories.includes('waivers')).map(s=>Number(s.member_id)))];
  const {changes,states}=watchlistChanges({watched,previous:previous.data||[],rosters,players,season,week,matchupMembers,schedule});
  const past=await admin.from('notification_messages').select('watch_alert_keys').like('source_key',`weekly:watch:${season}:${week}:%`);
  if(past.error)throw past.error;
  const drafts=await buildWatchlistDrafts({changes,opted,season,week,notifiedKeys:(past.data||[]).flatMap(row=>row.watch_alert_keys||[])});
  if(dryRun)return Response.json({ok:true,dryRun,season,week,watched:states.length,changes:changes.length,drafts});
  let created=0,duplicates=0;
  for(const draft of drafts){
   const response=await fetch(`${url}/functions/v1/send-notification`,{method:'POST',headers:{'Content-Type':'application/json','x-dfl-cron-token':token},body:JSON.stringify(draft),signal:AbortSignal.timeout(15000)});
   const result=await response.json();if(!response.ok||!result.ok)throw Error(`Watchlist delivery ${response.status}`);if(result.duplicate)duplicates++;else if(!result.skipped)created++;
  }
  if(states.length){const write=await admin.from('player_watch_states').upsert(states,{onConflict:'league_id,member_id,player_id'});if(write.error)throw write.error;}
  return Response.json({ok:true,season,week,watched:states.length,created,duplicates});
 }catch(e){console.error('player-watchlist',e);return Response.json({error:e&&typeof e==='object'&&'message'in e?String(e.message).slice(0,200):'Watchlist check unavailable'},{status:500})}
});
