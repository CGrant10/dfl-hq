import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {footballNotificationDrafts} from './live-football-notifications.js';
import {footballNotificationTarget} from './football-notification-target.js';
import {highlightVideoUrl} from './home-highlight-model.js';
import {livePlaySource,LIVE_PLAY_AGE} from './live-football-model.js';
import {notificationUrgency} from './notification-core.js';
import {WATCHLIST_NOTIFICATION_FILTER} from './watchlist-alerts.js';
import {MATCHUP_MOMENTS_CATEGORY,MATCHUP_MOMENTS_FILTER,optedMatchupRecipients} from './matchup-moments.js';
const token='fixture-internal-token-at-least-32-characters',digest=createHash('sha256').update(token).digest('hex');
const bundled=process.env.DFL_NOTIFICATION_BUNDLE;
const code=(bundled?readFileSync(bundled,'utf8'):(await transformWithOxc(readFileSync('supabase/functions/send-notification/index.ts','utf8'),'sender.ts')).code)
 .replace(/^import .*;$/gm,'').replace(/^export \{\};$/gm,'').replace(/(?:const|var) SLEEPER_SYNC_TOKEN_HASH\s*=\s*[^;]+;/,`const SLEEPER_SYNC_TOKEN_HASH="${digest}";`);
const now=Date.parse('2026-11-15T19:30:00Z'),expires=new Date(now+120000).toISOString();
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(now)});afterEach(()=>vi.useRealTimers());
async function delivery({video=true,opted=true,duplicate=false,invalidClip=false,expired=false}={}){
 const play={id:'123',at:now-5000,eligible:true,kind:'touchdown',yards:32,text:'Receiver scores a 32-yard touchdown.',players:[{id:'10',name:'Roster Receiver',position:'WR',role:'receiver'}]};
 const clip={id:'456',game_id:'999',play_id:'123',headline:'Roster Receiver 32-yard touchdown',kind:'touchdown',session_date:'2026-11-15',published_at:new Date(now).toISOString(),expires_at:new Date(now+86400000).toISOString(),source_url:'https://www.espn.com/video/clip/_/id/456',thumbnail_url:'https://espnmedia-cdn.akamaized.net/highlight.jpg',duration:27,video_url:'https://espnmedia-cdn.akamaized.net/espn/media/clip.mp4'};
 const feed={season:2026,week:11,game_id:'999',plays:[play],fetched_at:new Date(now).toISOString()};
 const draft=footballNotificationDrafts({season:2026,week:11,feeds:[feed],rows:[{roster_id:3,matchup_id:2,starters:['10']}],rosters:[{roster_id:3,owner_id:'owner',players:['10']}],members:[{id:1,sleeper_user_id:'owner'}],optedMemberIds:[1],clips:video?[clip]:[],now})[0];
 expect(draft).toBeDefined();if(expired)draft.expiresAt=new Date(now-1).toISOString();
 const pushes=[],messages=[],sub={id:1,member_id:1,enabled:true,categories:opted?['matchup_moments']:[],endpoint:'https://fixture.invalid/push',p256dh:'fixture',auth:'fixture'};
 const admin={rpc:async()=>({data:false}),from(table){let inserted=false;const q={select(){return q},eq(){return q},in(){return q},contains(){return q},limit(){return q},update(){return q},insert(row){inserted=true;messages.push(row);return q},
  async maybeSingle(){return {data:table==='nfl_live_games'?feed:table==='nfl_highlight_clips'?(invalidClip?null:clip):table==='notification_messages'&&duplicate?{id:89}:null,error:null}},
  async single(){return {data:inserted?{id:89}:null,error:null}},then(resolve){resolve({data:table==='gameday_moments'?[{id:1}]:table==='push_subscriptions'?[sub]:[],error:null})}};return q}};
 let handler;const bindings={...(bundled?{}:{footballNotificationTarget,highlightVideoUrl,livePlaySource,LIVE_PLAY_AGE,notificationUrgency,WATCHLIST_NOTIFICATION_FILTER,MATCHUP_MOMENTS_CATEGORY,MATCHUP_MOMENTS_FILTER,optedMatchupRecipients}),createClient:()=>admin,
  webpush:{setVapidDetails(){},sendNotification:async(_sub,payload,options)=>pushes.push({payload:JSON.parse(payload),options})},
  Deno:{env:{get:key=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'fixture-secret',VAPID_PUBLIC_KEY:'fixture-public',VAPID_PRIVATE_KEY:'fixture-private'}[key]||'')},serve:fn=>handler=fn}};
 new Function(...Object.keys(bindings),code)(...Object.values(bindings));
 const response=await handler(new Request('https://fixture.invalid/notification',{method:'POST',headers:{'content-type':'application/json','x-dfl-cron-token':token},body:JSON.stringify(draft)}));expect(response.status).toBe(200);
 return {result:await response.json(),draft,pushes,messages};
}
describe('rostered play through the production notification sender',()=>{
 it('delivers the exact video and fantasy matchup at high priority with a short TTL',async()=>{
  const r=await delivery();expect(r.result.delivered).toBe(1);expect(r.pushes[0].options).toMatchObject({urgency:'high'});expect(r.pushes[0].options.TTL).toBeGreaterThan(0);expect(r.pushes[0].options.TTL).toBeLessThanOrEqual(180);
  expect(r.pushes[0].payload.url).toBe(r.draft.targetUrl);expect(r.pushes[0].payload.url).toContain('&nflGame=999&clip=456');expect(r.pushes[0].payload.body).toContain('Video available');expect(r.messages[0].target_member_ids).toEqual([1]);
 });
 it('retains the exact saved play when a linked video disappears before send',async()=>{const r=await delivery({invalidClip:true});expect(r.result.delivered).toBe(1);expect(r.pushes[0].payload.url).toContain('tab=matchups&matchup=2&moment=nfl:999:123:3');expect(r.pushes[0].payload.url).not.toContain('&clip=');expect(r.pushes[0].payload.body).not.toContain('Video available')});
 it('keeps nonvideo plays linked to the exact player moment',async()=>{const r=await delivery({video:false});expect(r.result.delivered).toBe(1);expect(r.pushes[0].payload.url).toBe(r.draft.targetUrl);expect(r.pushes[0].payload.url).toContain('moment=nfl:999:123:3')});
 it.each([{opted:false},{duplicate:true},{expired:true}])('does not push opted-out, duplicate or expired events: %j',async options=>{const r=await delivery(options);expect(r.result.delivered).toBe(0);expect(r.pushes).toEqual([]);expect(r.messages).toEqual([])});
});
