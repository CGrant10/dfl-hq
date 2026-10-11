import {describe,it,expect} from 'vitest';
import {MATCHUP_MOMENTS_CATEGORY,matchupMomentWindow,matchupMomentDrafts,optedMatchupRecipients} from './matchup-moments.js';
const now=Date.parse('2026-10-12T02:00:00Z');
function fixture(){
 const schedule=new Map([['CHI',{key:'final',kickoff:'2026-10-11T17:00:00Z'}],['DAL',{key:'live',kickoff:'2026-10-12T00:15:00Z'}]]);
 return {season:2026,week:5,now,schedule,rows:[{roster_id:1,matchup_id:4,points:101.12,starters:['a','b']},{roster_id:2,matchup_id:4,points:98.22,starters:['c','d']}],
  rosters:[{roster_id:1,owner_id:'one'},{roster_id:2,owner_id:'two'}],members:[{id:11,sleeper_user_id:'one'},{id:12,sleeper_user_id:'two'}],
  players:{a:{n:'A',t:'CHI'},b:{n:'B',t:'DAL'},c:{n:'C',t:'CHI'},d:{n:'D',t:'DAL'}},teamNames:new Map([['1','Current name one'],['2','Current name two']]),optedMemberIds:[11,12]};
}
describe('optional matchup moments',()=>{
 it('targets only opted-in owners of a late close matchup using actual scores and current names',()=>{
  const f=fixture();f.optedMemberIds=[11];const drafts=matchupMomentDrafts(f);expect(drafts).toHaveLength(1);
  expect(drafts[0]).toMatchObject({category:MATCHUP_MOMENTS_CATEGORY,audience:'members',targetMemberIds:[11],sourceKey:'weekly:matchup:2026:5:1:close',targetUrl:'#/clubhouse?season=2026&week=5&tab=matchups&matchup=4'});
  expect(drafts[0].body).toContain('Current name two by 2.90');expect(drafts[0].body).toContain('101.12–98.22');expect(Date.parse(drafts[0].expiresAt)-now).toBe(30*60000);
 });
 it('stays quiet for early, lopsided, idle or unknown games',()=>{
  for(const change of [f=>f.rows[0].points=5,f=>f.rows[0].points=140,f=>f.schedule.get('DAL').key='upcoming',f=>delete f.players.b,f=>{f.rows[0].starters.push('b2','b3','b4');for(const id of ['b2','b3','b4'])f.players[id]={t:'DAL'}}]){
   const f=fixture();change(f);expect(matchupMomentDrafts(f)).toEqual([]);
  }
 });
 it('does not confuse missing or placeholder score values with zero',()=>{
  for(const value of [null,undefined,NaN,'']){const f=fixture();f.rows[0].points=value;expect(matchupMomentDrafts(f)).toEqual([])}
 });
 it('does not notify anyone without opt-in, mapped membership or a valid two-team pairing',()=>{
  const f=fixture();f.optedMemberIds=[];expect(matchupMomentDrafts(f)).toEqual([]);
  f.optedMemberIds=[11,12];f.members=[];expect(matchupMomentDrafts(f)).toEqual([]);
  f.members=fixture().members;f.rows.push({...f.rows[0],roster_id:3});expect(matchupMomentDrafts(f)).toEqual([]);
 });
 it('deduplicates each moment separately across polls and lead changes',()=>{
  const f=fixture();f.notifiedKeys=['weekly:matchup:2026:5:1:close','weekly:matchup:2026:5:2:close'];f.rows[0].points=95;expect(matchupMomentDrafts(f)).toEqual([]);
  f.now=Date.parse('2026-10-12T05:00:00Z');f.schedule.get('DAL').key='final';const finals=matchupMomentDrafts(f);expect(finals).toHaveLength(2);expect(finals[0].sourceKey).toContain(':final');
  f.notifiedKeys.push(...finals.map(d=>d.sourceKey));expect(matchupMomentDrafts(f)).toEqual([]);
 });
 it('waits for the whole NFL slate and excludes premature, stale and postponed finals',()=>{
  const f=fixture();f.schedule.get('DAL').key='final';expect(matchupMomentDrafts(f)).toEqual([]);
  f.now=Date.parse('2026-10-12T05:00:00Z');expect(matchupMomentDrafts(f)).toHaveLength(2);
  f.now=Date.parse('2026-10-12T15:00:00Z');expect(matchupMomentDrafts(f)).toEqual([]);
  f.now=Date.parse('2026-10-12T05:00:00Z');f.schedule.get('DAL').key='unknown';expect(matchupMomentDrafts(f)).toEqual([]);
 });
 it('supports verified bye starters in final results while withholding missing metadata',()=>{
  const f=fixture();f.now=Date.parse('2026-10-12T05:00:00Z');f.schedule.get('DAL').key='final';f.players.b={t:'BUF',b:true};expect(matchupMomentDrafts(f)).toHaveLength(2);
  f.players.b={t:'BUF'};expect(matchupMomentDrafts(f)).toEqual([]);
 });
 it('keeps ties factual and result alerts short lived',()=>{
  const f=fixture();f.now=Date.parse('2026-10-12T05:00:00Z');f.schedule.get('DAL').key='final';f.rows[1].points=f.rows[0].points;
  const draft=matchupMomentDrafts(f)[0];expect(draft.title).toContain('dead even');expect(draft.body).toContain('stat corrections');expect(Date.parse(draft.expiresAt)-f.now).toBe(2*3600000);
 });
 it('requires a verified kickoff timestamp for the moment window',()=>{
  const schedule=fixture().schedule;schedule.get('DAL').kickoff='invalid';expect(matchupMomentWindow(schedule,now)).toEqual({live:false,final:false});expect(matchupMomentWindow(null,now)).toEqual({live:false,final:false});
 });
 it('does not treat a future or stale live provider status as a timely game',()=>{
  const schedule=new Map([['DAL',{key:'live',kickoff:'2026-10-12T00:15:00Z'}]]);
  expect(matchupMomentWindow(schedule,Date.parse('2026-10-11T23:00:00Z')).live).toBe(false);
  expect(matchupMomentWindow(schedule,Date.parse('2026-10-12T08:00:00Z')).live).toBe(false);
 });
 it('rechecks enabled device opt-in before recording optional inbox messages',()=>{
  expect(optedMatchupRecipients([{member_id:11,enabled:true,categories:[MATCHUP_MOMENTS_CATEGORY]},
   {member_id:11,enabled:true,categories:[MATCHUP_MOMENTS_CATEGORY]},{member_id:12,enabled:false,categories:[MATCHUP_MOMENTS_CATEGORY]},
   {member_id:13,enabled:true,categories:['matchups']},{member_id:14,enabled:true,categories:[MATCHUP_MOMENTS_CATEGORY]}],[11,12,13])).toEqual([11]);
 });
});
