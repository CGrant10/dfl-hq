import {describe,it,expect} from 'vitest';
import {footballGame,footballPlay,footballPlayerIndex,candidatePlay,redZoneGames,liveStarterEvents,footballTeam,footballPlays,footballProfileMatch} from './live-football-model.js';
import {footballNotificationDrafts} from './live-football-notifications.js';
const now=Date.parse('2026-10-25T20:20:00Z');
const event=()=>({id:'999',date:new Date(now-3600000).toISOString(),status:{type:{state:'in'},displayClock:'4:12',period:3},competitions:[{competitors:[{team:{id:'7',abbreviation:'DEN'},score:'21',homeAway:'home'},{team:{id:'22',abbreviation:'ARI'},score:'17',homeAway:'away'}],situation:{isRedZone:true,possession:'22',possessionText:'DEN 12',down:3,distance:4,shortDownDistanceText:'3rd & 4',lastPlay:{id:'50',text:'A 10-yard catch.'}}}]});
const game=footballGame(event(),{season:2026,week:7,now});
const index=footballPlayerIndex({'1':{espn_id:'100',full_name:'Starting receiver',position:'WR',team:'ARI'},'2':{espn_id:'200',full_name:'Starting quarterback',position:'QB',team:'ARI'},'3':{espn_id:'300',full_name:'Other player',position:'RB',team:'DEN'}});
const raw=(patch={})=>({id:'123',sequenceNumber:'1230',type:{id:'67'},scoringPlay:true,scoreValue:6,statYardage:42,text:'Quarterback pass to receiver for 42 yards, TOUCHDOWN.',wallclock:new Date(now-5000).toISOString(),start:{team:{id:'22'}},participants:[{athlete:{id:'100'},type:'receiver'},{athlete:{id:'200'},type:'passer'}],...patch});
const model={season:2026,week:7,memberId:1,completed:false,games:[{id:'7',sides:[{name:'My team',memberId:1,roster:'1',lineup:[{id:'1',name:'Starting receiver',position:'WR',nflTeam:'ARI',isMine:true},{id:'2',name:'Starting quarterback',position:'QB',nflTeam:'ARI',isMine:true}]},{name:'Opponent',memberId:2,roster:'2',lineup:[{id:'3',name:'Other player',position:'RB',nflTeam:'DEN'}]}]}]};
const feed=()=>({game_id:'999',season:2026,week:7,snapshot:game,fetched_at:new Date(now).toISOString(),plays:[{...footballPlay(raw(),game,index),eligible:true}]});
describe('verified NFL red-zone context',()=>{
 it('links possession and the opponent field position to offensive starters',()=>{
  expect(game).toMatchObject({offense:'ARI',goal:12,redZone:true,down:'3rd & 4'});
  const zones=redZoneGames([feed()],model,{ownOnly:true,now});expect(zones[0].players.map(p=>p.id)).toEqual(['1','2']);
 });
 it('does not mark a team defending its own 12, an upcoming game, or a final',()=>{
  const e=event();e.competitions[0].situation.possession='7';expect(footballGame(e,{season:2026,week:7,now}).redZone).toBe(false);
  for(const state of ['pre','post']){const e=event();e.status.type.state=state;expect(footballGame(e,{season:2026,week:7,now}).redZone).toBe(false)}
 });
 it('requires explicit red-zone status, valid possession, down and field text',()=>{
  for(const patch of [{isRedZone:false},{possession:'missing'},{down:0},{down:5},{possessionText:'Unconfirmed'}]){const e=event();Object.assign(e.competitions[0].situation,patch);expect(footballGame(e,{season:2026,week:7,now}).redZone).toBe(false)}
 });
 it('rejects future kickoffs, stale snapshots, unknown freshness and another week',()=>{
  const e=event();e.date=new Date(now+3600000).toISOString();expect(footballGame(e,{season:2026,week:7,now}).redZone).toBe(false);
  for(const f of [{...feed(),fetched_at:new Date(now-151000).toISOString()},{...feed(),fetched_at:'unknown'},{...feed(),week:6}])expect(redZoneGames([f],model,{now})).toEqual([]);
 });
 it('normalizes provider team aliases and isolates the selected fantasy matchup',()=>{
  expect(footballTeam('WSH')).toBe('WAS');expect(footballTeam('JAC')).toBe('JAX');expect(redZoneGames([feed()],model,{now,gameId:'other'})).toEqual([]);
 });
});
describe('verified touchdown and big-play attribution',()=>{
 it('uses explicit roles and provider IDs for both halves of a touchdown connection',()=>{
  const p=footballPlay(raw(),game,index);expect(p.kind).toBe('touchdown');expect(p.players.map(p=>[p.id,p.role])).toEqual([['1','receiver'],['2','passer']]);
 });
 it('supports public athlete references and deduplicates a rusher/scorer',()=>{
  const p=footballPlay(raw({type:{id:'68'},participants:[{athlete:{$ref:'https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/100?lang=en'},type:'rusher'},{athlete:{id:'100'},type:'scorer'}]}),game,index);expect(p.players).toHaveLength(1);expect(p.players[0].role).toBe('rusher');
 });
 it('resolves a missing provider ID only from a unique official profile',()=>{const profile={id:'400',fullName:'A New Rookie',team:{id:'22'},position:{abbreviation:'WR'}},players={'10':{full_name:'A New Rookie',team:'ARI',position:'WR',espn_id:null}};expect(footballProfileMatch(profile,players,game)).toMatchObject({id:'10',nflTeam:'ARI',position:'WR'});expect(footballProfileMatch({...profile,fullName:'A Rookie'},players,game)).toBeNull();expect(footballProfileMatch({...profile,team:{id:'7'}},players,game)).toBeNull();expect(footballProfileMatch(profile,{...players,'11':players['10']},game)).toBeNull();expect(footballProfileMatch(profile,{'10':{...players['10'],espn_id:'999'}},game)).toBeNull()});
 it('does not guess a player from text, duplicate provider IDs or the wrong NFL offense',()=>{
  expect(footballPlay(raw({participants:[]}),game,index).kind).toBeNull();
  const duplicate=footballPlayerIndex({'1':{espn_id:'100',position:'WR',team:'ARI'},'2':{espn_id:'100',position:'WR',team:'ARI'}});expect(footballPlay(raw(),game,duplicate).players).toEqual([]);
  expect(footballPlay(raw({start:{team:{id:'7'}}}),game,index).kind).toBeNull();
 });
 it.each([{text:'Play overturned, NO PLAY.'},{isPenalty:true},{isTurnover:true},{scoreValue:4},{scoringPlay:false}])('rejects an invalid touchdown %j',patch=>{expect(footballPlay(raw(patch),game,index).kind).toBeNull()});
 it('requires 20 receiving/rushing yards or 40 passing yards for a big play',()=>{
  const p=footballPlay(raw({type:{id:'24'},scoringPlay:false,scoreValue:0,statYardage:25}),game,index);expect(p.kind).toBe('big-play');expect(p.players.map(p=>p.id)).toEqual(['1']);
  expect(footballPlay(raw({type:{id:'24'},scoringPlay:false,scoreValue:0,statYardage:40}),game,index).players).toHaveLength(2);
  expect(candidatePlay(raw({type:{id:'24'},scoringPlay:false,scoreValue:0,statYardage:19}))).toBe(false);
 });
 it('deduplicates drive plays and keeps sequence order',()=>{expect(footballPlays({drives:{previous:[{plays:[raw({id:'2',sequenceNumber:'2'})]}],current:{plays:[raw({id:'2',sequenceNumber:'2'}),raw({id:'1',sequenceNumber:'1'})]}}}).map(p=>p.id)).toEqual(['1','2'])});
});
describe('starter-only notifications and event freshness',()=>{
 const args=()=>({season:2026,week:7,feeds:[feed()],rows:[{roster_id:1,matchup_id:7,starters:['1','2']}],rosters:[{roster_id:1,owner_id:'owner'}],members:[{id:1,sleeper_user_id:'owner'}],optedMemberIds:[1],now});
 it('groups a stack into one member/play notification and routes to the exact matchup',()=>{
  const drafts=footballNotificationDrafts(args());expect(drafts).toHaveLength(1);expect(drafts[0]).toMatchObject({targetMemberIds:[1],sourceKey:'weekly:play:2026:7:1:999:123',targetUrl:'#/clubhouse?season=2026&week=7&tab=matchups&matchup=7&moment=nfl:999:123:1',category:'matchup_moments'});
 });
 it('does not notify for bench players, opted-out members or ambiguous ownership',()=>{
  for(const patch of [{rows:[{roster_id:1,matchup_id:7,starters:['3']}]},{optedMemberIds:[]},{members:[{id:1,sleeper_user_id:'owner'},{id:2,sleeper_user_id:'owner'}]}])expect(footballNotificationDrafts({...args(),...patch})).toEqual([]);
 });
 it('does not notify for a baseline, stale, future or unverified play',()=>{
  for(const patch of [{eligible:false},{at:now-181000},{at:now+1000},{kind:null}]){const f=feed();Object.assign(f.plays[0],patch);expect(footballNotificationDrafts({...args(),feeds:[f]})).toEqual([]);expect(liveStarterEvents([f],model,{now})).toEqual([])}
 });
 it('never describes a quarterback passing touchdown as six fantasy points',()=>{const a=args();a.rows[0].starters=['2'];const d=footballNotificationDrafts(a)[0];expect(d.title).toContain('TD PASS');expect(d.body).not.toContain('fantasy points')});
 it('ignores completed fantasy weeks and identifies only the requested starters',()=>{expect(liveStarterEvents([feed()],{...model,completed:true},{now})).toEqual([]);expect(liveStarterEvents([feed()],model,{now,gameId:'7',ownOnly:true})[0].players).toHaveLength(2)});
});
