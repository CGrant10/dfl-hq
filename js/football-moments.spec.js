import {it,expect} from 'vitest';
import {footballMomentRows,footballMomentKey} from './football-moments.js';
import {savedMoments} from './game-day-moments-model.js';
import {momentRecapFrames,momentRecapFrame} from './moment-recap.js';
import {footballMomentShareSpec} from './share-export-model.js';
const now=Date.parse('2026-10-26T01:10:00Z');
const wr={id:'1',name:'Starting receiver',position:'WR',nflTeam:'ARI',role:'receiver'},qb={id:'2',name:'Starting QB',position:'QB',nflTeam:'ARI',role:'passer'};
const play=()=>({id:'123',gameId:'999',at:now-5000,eligible:true,kind:'touchdown',yards:42,period:3,clock:'4:12',text:'Quarterback pass to receiver for 42 yards, TOUCHDOWN.',players:[wr,qb]});
const args=()=>({leagueId:'league',season:2026,week:7,now,feeds:[{game_id:'999',season:2026,week:7,fetched_at:new Date(now).toISOString(),plays:[play()]}],rows:[{roster_id:1,matchup_id:7,starters:['1','2']},{roster_id:2,matchup_id:7,starters:['3']}]});
const model={leagueId:'league',season:2026,week:7,games:[{id:'7',sides:[{roster:'1',name:'Current <team>',lineup:[]},{roster:'2',name:'Other team',lineup:[]}]}]};
const saved=(rows=footballMomentRows(args()))=>savedMoments(rows.map((r,i)=>({...r,id:i+1,captured_at:new Date(now).toISOString()})),model);
it('saves a verified starter stack once without requiring push opt-in',()=>{
 const a=args();a.feeds.push(a.feeds[0]);const rows=footballMomentRows(a);expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({event_key:'nfl:999:123:1',matchup_id:7,roster_id:1,kind:'touchdown'});expect(rows[0].data.players).toHaveLength(2);expect(rows[0].data).not.toHaveProperty('points');
});
it('saves both opponents separately and keeps quarterback attribution truthful',()=>{
 const a=args();a.rows[0].starters=['2'];a.rows[1].starters=['1'];const moments=saved(footballMomentRows(a));expect(moments).toHaveLength(2);expect(moments.find(m=>m.roster==='1').title).toBe('TD PASS');expect(moments.find(m=>m.roster==='2').title).toBe('TOUCHDOWN');expect(new Set(moments.map(m=>m.eventKey)).size).toBe(2);
});
it('ignores baselines, stale/future/unverified plays, defensive players and other weeks',()=>{
 for(const patch of [{eligible:false},{at:now-180001},{at:now+1},{kind:null},{players:[{...wr,position:'DEF'}]}]){const a=args();Object.assign(a.feeds[0].plays[0],patch);expect(footballMomentRows(a)).toEqual([])}
 for(const patch of [{week:6},{season:2025},{fetched_at:'bad'},{fetched_at:new Date(now-150001).toISOString()}]){const a=args();Object.assign(a.feeds[0],patch);expect(footballMomentRows(a)).toEqual([])}
});
it('does not save bench players, unpaired matchups or ambiguous rosters',()=>{
 const a=args();a.rows[0].starters=['7'];expect(footballMomentRows(a)).toEqual([]);expect(footballMomentRows({...args(),rows:args().rows.slice(0,1)})).toEqual([]);expect(footballMomentRows({...args(),rows:[args().rows[0],args().rows[0]]})).toEqual([]);
 expect(footballMomentKey(1,'not-a-game','123')).toBeNull();
});
it('keeps official clock and play time in permanent history, using current team names',()=>{
 const moment=saved()[0];expect(moment.at).toBe(now-5000);expect(moment.observedAt).toBe(now);expect(moment.title).toBe('TOUCHDOWN');expect(moment.text).toContain('Current <team>');expect(moment.recap.play).toMatchObject({yards:42,clock:'4:12',period:3});expect(moment.player.id).toBe('1');
 const html=momentRecapFrame(moment);expect(html).toContain('Current &lt;team&gt;');expect(html).toContain('Q3 · 4:12');expect(html).toContain('Share play');expect(html).not.toContain('Fantasy points');expect(html).not.toContain('Observed');
});
it('retains archived starters even if they have since moved to the bench',()=>{
 const moment=saved()[0];expect(moment.player.id).toBe('1');expect(moment.recap.players).toHaveLength(2);
});
it('rejects malformed saved play provenance, roles, scope and timestamps',()=>{
 const row=footballMomentRows(args())[0];
 for(const r of [{...row,event_key:'nfl:other:123:1'},{...row,matchup_id:9},{...row,season:2025},{...row,data:{...row.data,play:{...row.data.play,at:null}}},{...row,data:{...row.data,players:[{...wr,role:'defender'}]}}])expect(saved([r])).toEqual([]);
});
it('opens a requested old play even beyond the eight-frame reel and keeps the reel bounded',()=>{
 const target=saved()[0],items=[target,...Array.from({length:12},(_,i)=>({...target,key:String(i+2),eventKey:`nfl:999:${200+i}:1`,at:now+i}))];
 const frames=momentRecapFrames(items,'7',{startKey:target.eventKey});expect(frames).toHaveLength(9);expect(frames[0].eventKey).toBe(target.eventKey);expect(frames.at(-1).kind).toBe('close');
 expect(momentRecapFrames(items,'other',{startKey:target.eventKey})).toEqual([]);
});
it('shares the real play in the existing clean/photo card system without invented points',()=>{
 const spec=footballMomentShareSpec(saved()[0],{season:2026,week:7});expect(spec.context).toBe('2026 / WEEK 07');expect(spec.results).toEqual([{label:'Play distance',value:'42 YDS'}]);expect(spec.players.map(p=>p.id)).toEqual(['1','2']);expect(spec.sections[0].copy).toContain('TOUCHDOWN');expect(spec.status).toBe('Q3 · 4:12');expect(footballMomentShareSpec({kind:'surge'})).toBeNull();
});
