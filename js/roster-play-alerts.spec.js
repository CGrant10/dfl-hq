import {describe,it,expect} from 'vitest';
import {footballNotificationDrafts} from './live-football-notifications.js';
import {footballMomentRows} from './football-moments.js';
import {savedMoments,momentSummary} from './game-day-moments-model.js';
import {liveStarterEvents,redZoneGames} from './live-football-model.js';
import {footballNotificationTarget} from './football-notification-target.js';
import {DEFAULT_NOTIFICATION_CATEGORIES} from './notification-core.js';
const now=Date.parse('2026-11-08T19:30:00Z');
const receiver={id:'10',name:'My receiver',position:'WR',nflTeam:'CIN',role:'receiver'};
const passer={id:'20',name:'My QB',position:'QB',nflTeam:'CIN',role:'passer'};
const args=()=>({leagueId:'league',season:2026,week:10,now,feeds:[{game_id:'401',season:2026,week:10,fetched_at:new Date(now).toISOString(),plays:[{id:'123',at:now-1000,kind:'big-play',eligible:true,yards:40,text:'A verified 40-yard reception.',players:[receiver,passer]}]}],rows:[{roster_id:1,matchup_id:3,starters:['20'],players:['10','20']},{roster_id:2,matchup_id:3,starters:['30'],players:['30']}],rosters:[{roster_id:1,owner_id:'owner',players:['10','20']},{roster_id:2,owner_id:'other',players:['30']}],members:[{id:1,sleeper_user_id:'owner'},{id:2,sleeper_user_id:'other'}],optedMemberIds:[1,2]});
const model=()=>({leagueId:'league',season:2026,week:10,memberId:1,completed:false,games:[{id:'3',sides:[{roster:'1',memberId:1,name:'My team',lineup:[{...passer,isMine:true}],bench:[{...receiver,isMine:true}]},{roster:'2',memberId:2,name:'Opponent',lineup:[{id:'30',position:'RB'}],bench:[{id:'40',position:'WR'}]}]}]});
describe('rostered player big-play and touchdown alerts',()=>{
 it('groups a mixed bench/starter stack into one alert and saves the exact destination',()=>{
  const a=args(),[draft]=footballNotificationDrafts(a),moments=footballMomentRows(a);
  expect(footballNotificationDrafts(a)).toHaveLength(1);expect(draft.title).toContain('40-YD RECEPTION');expect(draft.body).toContain('Bench: My receiver');expect(draft.targetMemberIds).toEqual([1]);
  expect(footballNotificationTarget(draft.sourceKey,draft.targetUrl,draft.targetMemberIds)?.moment).toBe(moments[0].event_key);
  expect(moments[0].data.players).toEqual([{...receiver,bench:true},passer]);expect(moments[0].data).not.toHaveProperty('points');
 });
 it('labels a bench-only play in the notification and permanent receipt',()=>{
  const a=args();a.feeds[0].plays[0].players=[receiver];const [draft]=footballNotificationDrafts(a),rows=footballMomentRows(a);
  expect(draft.body).toMatch(/^Bench · /);const [moment]=savedMoments(rows.map((r,i)=>({...r,id:i+1,captured_at:new Date(now).toISOString()})),model());
  expect(moment.title).toBe('BENCH · 40-YD RECEPTION');expect(moment.text).toContain('My receiver (bench)');expect(momentSummary(moment).label).toBe('Bench · Big play');expect(moment.recap).not.toHaveProperty('points');
 });
 it('uses current ownership after a trade rather than old weekly lineup ownership',()=>{
  const a=args();a.rosters[0].players=[];a.rosters[1].players=['10','20','30'];const [draft]=footballNotificationDrafts(a);
  expect(draft.targetMemberIds).toEqual([2]);expect(footballMomentRows(a).map(m=>m.roster_id)).toEqual([2]);
 });
 it('does not resurrect an opted-out notification category',()=>{const a=args();a.optedMemberIds=[];expect(footballNotificationDrafts(a)).toEqual([]);expect(DEFAULT_NOTIFICATION_CATEGORIES).toContain('matchup_moments')});
 it.each([{week:9},{season:2025},{fetched_at:new Date(now-150001).toISOString()}])('rejects another week or stale feed %j',patch=>{const a=args();Object.assign(a.feeds[0],patch);expect(footballNotificationDrafts(a)).toEqual([]);expect(footballMomentRows(a)).toEqual([])});
 it.each([{eligible:false},{at:now+1},{at:now-180001},{players:[{...receiver,position:'DEF'}]},{players:[{...receiver,role:'defender'}]}])('ignores invalid plays %j',patch=>{const a=args();Object.assign(a.feeds[0].plays[0],patch);expect(footballNotificationDrafts(a)).toEqual([]);expect(footballMomentRows(a)).toEqual([])});
 it('deduplicates repeated feeds and keeps passing TD labels honest',()=>{const a=args();a.feeds[0].plays[0]={...a.feeds[0].plays[0],players:[passer],kind:'touchdown'};a.feeds.push(a.feeds[0]);const d=footballNotificationDrafts(a);expect(d).toHaveLength(1);expect(d[0].title).toContain('TD PASS');expect(d[0].body).not.toContain('6 points');expect(footballMomentRows(a)).toHaveLength(1)});
 it('adds only your own bench to in-app moments, leaving red-zone starters unchanged',()=>{const a=args(),m=model();expect(liveStarterEvents(a.feeds,m,{now})[0].players.map(p=>p.id)).toEqual(['20']);const event=liveStarterEvents(a.feeds,m,{now,includeOwnRoster:true})[0];expect(event.players.map(p=>[p.id,!!p.bench])).toEqual([['10',true],['20',false]]);a.feeds[0].plays[0].players=[{...receiver,id:'40'}];expect(liveStarterEvents(a.feeds,m,{now,includeOwnRoster:true})).toEqual([]);expect(redZoneGames(a.feeds,m,{now})).toEqual([])});
 it('still shows your player moments while watching a different fantasy matchup',()=>{const a=args(),m=model();m.games.push({id:'4',sides:[]});expect(liveStarterEvents(a.feeds,m,{now,gameId:'4',includeOwnRoster:true})[0].players).toHaveLength(2);expect(liveStarterEvents(a.feeds,{...m,memberId:null},{now,gameId:'4',includeOwnRoster:true})).toEqual([])});
});
