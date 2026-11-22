import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import {afterEach,describe,it,expect,vi} from 'vitest';
import {leagueHealth} from './league-health.js';
import {lineupAlertDrafts,lineupAlertSourceKey} from './lineup-alert-model.js';
import {nflWeekStatuses} from './clubhouse-matchup-model.js';
import {gameDayLineup} from './game-day-model.js';
import {matchesDflStartingSlots,DFL_STARTING_SLOTS} from './analyzer-league-context.js';
import {buildWeeklyPool} from './weekly-outlook.js';
import {MATCHUP_MOMENTS_FILTER,matchupMomentDrafts,matchupMomentWindow} from './matchup-moments.js';
const token='lineup-worker-test-token-at-least-32-characters',digest=createHash('sha256').update(token).digest('hex');
const bundle=process.env.DFL_LINEUP_WORKER_BUNDLE;
const source=(bundle?readFileSync(bundle,'utf8'):(await transformWithOxc(readFileSync('supabase/functions/lineup-alerts/index.ts','utf8'),'lineup.ts')).code).replace(/^import .*;$/gm,'').replace(/^export \{\};$/gm,'').replace(/(?:const|var) TOKEN_HASH\s*=\s*[^;]+;/,`const TOKEN_HASH="${digest}";`);
afterEach(()=>vi.useRealTimers());
async function run({dryRun=false,notifiedKeys=[]}={}){
 vi.useFakeTimers();vi.setSystemTime(Date.parse('2026-11-22T17:30:00Z'));
 const positions=['QB','RB','RB','WR','WR','TE','WR','K','DEF'];
 const rosters=Array.from({length:12},(_,i)=>({roster_id:i+1,owner_id:String(i+1),players:Array.from({length:10},(_,j)=>`${i+1}-${j}`)}));
 const rows=rosters.map((r,i)=>({roster_id:r.roster_id,matchup_id:Math.floor(i/2)+1,starters:r.players.slice(0,9)}));rows[1].starters[3]='0';
 const league={league_id:'fixture',season:'2026',status:'in_season',total_rosters:12,roster_positions:[...DFL_STARTING_SLOTS,'BN'],scoring_settings:{rec:1,rec_yd:.1}};
 const projections=rosters.flatMap((r,i)=>r.players.map((id,j)=>({player_id:id,team:i===0&&j===3?'ATL':'BUF',opponent:i===0&&j===3?null:'NYJ',stats:i===0&&j===3?{gp:0}:{gp:1,rec:5,rec_yd:94},player:{position:positions[j]||'WR',first_name:'Player',last_name:id}})));
 const board={season:{year:2026,type:2},week:{number:11,teamsOnBye:[{abbreviation:'ATL'}]},events:[{date:'2026-11-22T18:00:00Z',status:{type:{state:'pre'}},competitions:[{competitors:[{team:{abbreviation:'BUF'}},{team:{abbreviation:'NYJ'}}]}]}]};
 const members=rosters.map(r=>({id:r.roster_id,sleeper_user_id:r.owner_id})),sent=[];
 const admin={from(table){const data=table==='sleeper_config'?{sleeper_league_id:'fixture',auto_sync_enabled:true}:table==='members'?members:table==='notification_messages'?notifiedKeys.map(key=>({source_key:key,lineup_alert_keys:[key]})):[];const q={select(){return q},eq(){return q},contains(){return q},like(){return q},single(){return q},then(resolve){resolve({data,error:null})}};return q}};
 const fetch=async(url,options)=>{if(url.includes('/send-notification')){sent.push(JSON.parse(options.body));return Response.json({ok:true,delivered:1})}let data;if(url.includes('/state/nfl'))data={season:'2026',week:11,season_type:'regular'};else if(url.includes('scoreboard'))data={content:{sbData:board}};else if(url.includes('/rosters'))data=rosters;else if(url.includes('/matchups/'))data=rows;else if(url.includes('/projections/'))data=projections;else if(url.includes('/league/fixture'))data=league;else throw Error('Unexpected fixture URL');return Response.json(data)};
 let handler;const bindings={...(bundle?{}:{leagueHealth,lineupAlertDrafts,lineupAlertSourceKey,nflWeekStatuses,gameDayLineup,matchesDflStartingSlots,buildWeeklyPool,MATCHUP_MOMENTS_FILTER,matchupMomentDrafts,matchupMomentWindow}),createClient:()=>admin,fetch,Deno:{env:{get:key=>key==='SUPABASE_URL'?'https://fixture.invalid':'fixture-secret'},serve:fn=>handler=fn}};
 new Function(...Object.keys(bindings),source)(...Object.values(bindings));
 const response=await handler(new Request('https://fixture.invalid/lineup',{method:'POST',headers:{'content-type':'application/json','x-dfl-cron-token':token},body:JSON.stringify({dryRun})}));
 return {status:response.status,body:await response.json(),sent};
}
describe('lineup worker kickoff delivery',()=>{
 it('targets a bye and empty slot to the correct owners with unlocked backups',async()=>{const r=await run();expect(r.status).toBe(200);expect(r.body).toMatchObject({ok:true,created:2});expect(r.sent.map(d=>d.targetMemberIds)).toEqual([[1],[2]]);expect(r.sent[0].title).toContain('Bye week');expect(r.sent[1].title).toContain('Empty slot');for(const draft of r.sent){expect(draft.body).toContain('→');expect(draft.expiresAt).toBe('2026-11-22T18:00:00.000Z');expect(draft.sourceKey).toContain(':group:')}});
 it('previews the same advice without sending and suppresses previously notified issues',async()=>{const preview=await run({dryRun:true});expect(preview.body.drafts).toHaveLength(2);expect(preview.sent).toEqual([]);const notifiedKeys=preview.body.drafts.flatMap(d=>d.lineupKeys);const repeat=await run({notifiedKeys});expect(repeat.body).toMatchObject({created:0});expect(repeat.sent).toEqual([])});
});
