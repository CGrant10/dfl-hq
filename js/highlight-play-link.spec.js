import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {highlightPlayMatch,clipForPlay} from './highlight-play-link.js';
import {linkHighlightPlays} from '../supabase/functions/_shared/highlight-links.ts';
import {footballNotificationDrafts} from './live-football-notifications.js';
const json=file=>JSON.parse(readFileSync(new URL(`../tools/fixtures/${file}`,import.meta.url),'utf8'));
const clip=json('home-highlight-clips.json')[0],summary=json('nfl-game-center-summary.json'),detail=json('nfl-highlight-play.json');
const now=Date.parse(clip.published_at)+1000,play={id:detail.id,gameId:clip.game_id,kind:'big-play',yards:49,at:Date.parse(detail.wallclock),text:detail.text,players:[{name:'Tyler Shough',role:'passer'},{name:'Barion Brown',role:'receiver'}]};
describe('exact play-to-video links',()=>{
 it('resolves a real ESPN video through its structured play participants',async()=>{const rows=await linkHighlightPlays([clip],summary,async url=>{expect(url).toContain(`/events/${clip.game_id}/competitions/${clip.game_id}/plays/${detail.id}?`);return detail});expect(rows[0].play_id).toBe(detail.id)});
 it('resolves a touchdown when the summary omits scoreValue, only after checking the full play',async()=>{const td=json('nfl-highlight-touchdown.json'),video=json('home-highlight-clips.json')[2];expect((await linkHighlightPlays([video],summary,async()=>td))[0].play_id).toBe(td.id);expect((await linkHighlightPlays([video],summary,async()=>({...td,scoreValue:2})))[0].play_id).toBe(null)});
 it('never guesses from an abbreviated play description without participants',()=>expect(highlightPlayMatch(clip,[{...play,players:[]}])).toBe(null));
 it('rejects ambiguity, a different game, yards, time, reversed play or compound clip',()=>{
  expect(highlightPlayMatch(clip,[play,{...play,id:'999'}])).toBe(null);
  for(const patch of [{gameId:'999'},{yards:48},{at:play.at-30*60000},{text:'Play reversed — no play'},{players:[{name:'Different Player',role:'receiver'}]}])expect(highlightPlayMatch(clip,[{...play,...patch}])).toBe(null);
  expect(highlightPlayMatch({...clip,headline:'Tyler Shough 49-yard pass sets up a touchdown'},[play])).toBe(null);
  expect(highlightPlayMatch({...clip,headline:'Tyler Shough completes a 49-yard pass to Chris Olave'},[play],['Chris Olave'])).toBe(null);
 });
 it('does not follow an unrecognized participant endpoint or mismatched detail',async()=>{expect((await linkHighlightPlays([clip],summary,async()=>({...detail,id:'999'})))[0].play_id).toBe(null)});
 it('requires a real, unexpired playable clip for the exact game and play',()=>{const c={...clip,play_id:play.id};expect(clipForPlay([c],clip.game_id,play.id,now)?.id).toBe(clip.id);for(const patch of [{game_id:'999'},{play_id:'999'},{expires_at:new Date(now-1).toISOString()},{video_url:null}])expect(clipForPlay([{...c,...patch}],clip.game_id,play.id,now)).toBe(null)});
 it('labels video pushes and deep-links to that video, retaining the saved play context',()=>{
  const fresh={...play,at:now-1000,eligible:true,players:[{id:'10',name:'Barion Brown',role:'receiver'}]},args={season:2026,week:7,now,feeds:[{game_id:clip.game_id,fetched_at:new Date(now).toISOString(),plays:[fresh]}],rows:[{roster_id:1,matchup_id:2,starters:['10']}],rosters:[{roster_id:1,owner_id:'owner'}],members:[{id:1,sleeper_user_id:'owner'}],optedMemberIds:[1]};
  const draft=footballNotificationDrafts({...args,clips:[{...clip,play_id:play.id}]})[0];expect(draft.body).toContain('Video available');expect(draft.targetUrl).toContain(`&tab=highlights&matchup=2&moment=nfl:${clip.game_id}:${play.id}:1&nflGame=${clip.game_id}&clip=${clip.id}`);
  const plain=footballNotificationDrafts({...args,clips:[{...clip,play_id:'999'}]})[0];expect(plain.body).not.toContain('Video available');expect(plain.targetUrl).toContain('&tab=matchups');expect(plain.targetUrl).not.toContain('&clip=');
 });
});
