import {afterEach,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import * as football from './live-football-model.js';
import {footballNotificationDrafts} from './live-football-notifications.js';
import {footballMomentRows} from './football-moments.js';
import {MATCHUP_MOMENTS_FILTER} from './matchup-moments.js';
import {leagueHealth} from './league-health.js';
import {DFL_STARTING_SLOTS} from './analyzer-league-context.js';
import {gameHighlightClips} from './home-highlight-model.js';
import {highlightPlayMatch} from './highlight-play-link.js';

// Execute the production worker with real parsing, ownership, freshness and
// destination helpers. Provider/DB/push I/O stays entirely inside this fixture.
const token='unit-test-cron-token-with-at-least-32-characters';
const digest=createHash('sha256').update(token).digest('hex');
const bundle=process.env.DFL_LIVE_WORKER_BUNDLE;
const source=(bundle?readFileSync(bundle,'utf8'):(await transformWithOxc(readFileSync('supabase/functions/live-football/index.ts','utf8'),'live-football.ts')).code)
 .replace(/^import .*;$/gm,'').replace(/^export \{\};$/gm,'').replace(/(?:const|var) TOKEN_HASH\s*=\s*[^;]+;/,`const TOKEN_HASH="${digest}";`);
const start=Date.parse('2026-11-08T19:30:00Z');
afterEach(()=>vi.useRealTimers());

async function run({type='67',yards=32,playAt=start-2000,captureDelay=5000,summaryDelay=0,opted=true,eligible=true,duplicate=false,dryRun=false}={}){
 vi.useFakeTimers();vi.setSystemTime(start);
 const pushes=[],moments=[],captures=[];
 const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,owner_id:`owner${i+1}`,players:[String(i?100+i:10)]}));
 const rows=rosters.map(r=>({roster_id:r.roster_id,matchup_id:Math.ceil(r.roster_id/2),starters:r.players,players:r.players}));
 const league={league_id:'league',season:'2026',status:'in_season',total_rosters:12,roster_positions:DFL_STARTING_SLOTS,scoring_settings:{rec:1}};
 const play={id:'123',sequenceNumber:'1230',type:{id:type},scoringPlay:type==='67'||type==='68',scoreValue:type==='67'||type==='68'?6:0,
  statYardage:yards,text:'A verified offensive play.',wallclock:new Date(playAt).toISOString(),start:{team:{$ref:'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/teams/22?lang=en'}},
  participants:[{type:type==='68'?'rusher':'receiver',athlete:{$ref:'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/100?lang=en'}}]};
 const event={id:'999',date:new Date(start-3600000).toISOString(),competitions:[{status:{type:{state:'in'},period:3,displayClock:'4:12'},competitors:[{team:{id:'22',abbreviation:'ARI'},score:'14'},{team:{id:'7',abbreviation:'DEN'},score:'7'}]}]};
 const admin={from(table){const q={select(){return q},eq(){return q},in(){return q},gt(){return q},contains(){return q},
  upsert(value){if(table==='gameday_moments')moments.push(...value);return q},
  single:async()=>({data:{sleeper_league_id:'league',auto_sync_enabled:true},error:null}),
  then(resolve){resolve({data:table==='members'?[{id:1,sleeper_user_id:'owner1'}]:table==='push_subscriptions'?(opted?[{member_id:1}]:[]):[],error:null})}};return q},
  async rpc(name,input){expect(name).toBe('capture_nfl_live_game');vi.setSystemTime(start+captureDelay);captures.push(input);
   return {data:{game_id:input.p_game.id,season:2026,week:10,snapshot:input.p_game,fetched_at:new Date().toISOString(),plays:input.p_plays.map(p=>({...p,eligible:eligible&&!!p.kind}))},error:null};
  }};
 const get=async(url,options)=>{
  if(url.includes('/functions/v1/send-notification')){pushes.push(JSON.parse(options.body));return Response.json({ok:true,...(duplicate?{duplicate:true}:{delivered:1})})}
  let data;
  if(url==='https://api.sleeper.app/v1/state/nfl')data={season:'2026',week:10,season_type:'regular'};
  else if(url==='https://api.sleeper.app/v1/league/league')data=league;
  else if(url.endsWith('/league/league/rosters'))data=rosters;
  else if(url.endsWith('/league/league/matchups/10'))data=rows;
  else if(url==='https://api.sleeper.app/v1/players/nfl')data={'10':{full_name:'Roster receiver',position:'WR',team:'ARI',espn_id:'100'}};
  else if(url.includes('/scoreboard?'))data={events:[event]};
  else if(url.includes('/summary?event=999')){vi.setSystemTime(start+summaryDelay);data={header:{id:'999',season:{year:2026}},drives:{current:{plays:[play]}}}}
  else if(url.includes('/plays/123?'))data=play;
  else throw Error('Unexpected external request in fixture: '+url);
  return Response.json(data);
 };
 let handler;
 const helpers=bundle?{}:{...football,footballNotificationDrafts,footballMomentRows,MATCHUP_MOMENTS_FILTER,leagueHealth,gameHighlightClips,highlightPlayMatch};
 const bindings={...helpers,
  createClient:()=>admin,fetch:get,Deno:{env:{get:()=>''},serve(fn){handler=fn}}};
 new Function(...Object.keys(bindings),source)(...Object.values(bindings));
 const response=await handler(new Request('https://fixture.invalid/live-football',{method:'POST',headers:{'x-dfl-cron-token':token,'Content-Type':'application/json'},body:JSON.stringify({dryRun})}));
 expect(response.status).toBe(200);
 return {body:await response.json(),pushes,moments,captures};
}

describe('live football worker capture-to-notification handoff',()=>{
 it.each(['67','68','24'])('delivers a newly captured offensive play after network/DB latency, type %s',async type=>{
  const result=await run({type});
  expect(result.body).toMatchObject({ok:true,created:1,moments:1});expect(result.pushes).toHaveLength(1);
  expect(result.pushes[0]).toMatchObject({targetMemberIds:[1],category:'matchup_moments',sourceKey:'weekly:play:2026:10:1:999:123',targetUrl:'#/clubhouse?season=2026&week=10&tab=matchups&matchup=1&moment=nfl:999:123:1'});
  expect(result.moments[0].event_key).toBe('nfl:999:123:1');
 });
 it('enriches a play arriving while the summary request was in flight',async()=>{
  const result=await run({playAt:start+1000,summaryDelay:2000});
  expect(result.body.created).toBe(1);expect(result.moments).toHaveLength(1);
 });
 it('does not send a play that expires while capture is in flight',async()=>{
  const result=await run({playAt:start-179000});
  expect(result.body.created).toBe(0);expect(result.pushes).toEqual([]);expect(result.moments).toEqual([]);
 });
 it('preserves opted-out devices while saving the rostered game moment',async()=>{
  const result=await run({opted:false});expect(result.pushes).toEqual([]);expect(result.moments).toHaveLength(1);
 });
 it('keeps a capture baseline ineligible rather than replaying old plays',async()=>{
  const result=await run({eligible:false});expect(result.pushes).toEqual([]);expect(result.moments).toEqual([]);
 });
 it('retains the member/play deduplication key across retries',async()=>{
  const result=await run({duplicate:true});expect(result.body).toMatchObject({created:0,duplicates:1});expect(result.pushes[0].sourceKey).toBe('weekly:play:2026:10:1:999:123');
 });
 it('does not write captures, moments or push messages during a dry run',async()=>{
  const result=await run({dryRun:true});expect(result.body.dryRun).toBe(true);expect(result.captures).toEqual([]);expect(result.moments).toEqual([]);expect(result.pushes).toEqual([]);
 });
});
