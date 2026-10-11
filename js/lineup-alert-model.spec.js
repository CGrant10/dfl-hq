import {describe,it,expect} from 'vitest';
import {lineupRescuePlan,lineupAlertDrafts,slotEligible} from './lineup-alert-model.js';
const now=Date.parse('2026-10-11T16:00:00Z');
const p=(id,position='WR',extra={})=>({id,name:id,position,state:'upcoming',kickoff:'2026-10-11T17:00:00Z',...extra});
const team={memberId:1,uid:'a',roster:2,lineup:[p('starter','WR',{slotType:'WR',injuryStatus:'Out'})],bench:[p('backup')]};
describe('actionable lineup rescue',()=>{
 it('uses the submitted slot, excluding owned starters, wrong positions and locked games',()=>{
  const result=lineupRescuePlan({...team,bench:[p('starter'),p('qb','QB'),p('locked','WR',{state:'live'}),p('expired','WR',{kickoff:'2026-10-11T15:00:00Z'}),p('unknown','WR',{state:'unknown'}),p('backup')]},{now});
  expect(result[0].backup.id).toBe('backup');
 });
 it('keeps a later flex backup available for a questionable starter',()=>{
  const result=lineupRescuePlan({...team,lineup:[p('starter','WR',{slotType:'FLEX',injuryStatus:'Questionable'})],bench:[p('early','RB',{kickoff:'2026-10-11T16:30:00Z',projection:20}),p('late','TE',{kickoff:'2026-10-11T20:00:00Z',projection:8})]},{now});
  expect(result[0]).toMatchObject({severity:'questionable',lateCover:true,backup:{id:'late'}});
 });
 it('does not promise the same backup for two affected starters and prioritizes Out',()=>{
  const result=lineupRescuePlan({...team,lineup:[p('q','WR',{slotType:'WR',injuryStatus:'Questionable'}),p('out','WR',{slotType:'WR',injuryStatus:'Out'})]},{now});
  expect(result[0]).toMatchObject({player:{id:'out'},backup:{id:'backup'}});expect(result[1].backup).toBeNull();
 });
 it('does not present unhealthy, unknown or already started reserves as backups',()=>{
  const bench=[p('out','WR',{injuryStatus:'Out'}),p('q','WR',{injuryStatus:'Questionable'}),p('ir','WR',{availabilityStatus:'IR'}),p('unknown','WR',{kickoff:null}),p('taxi','WR',{activeRoster:false})];
  expect(lineupRescuePlan({...team,bench},{now})[0].backup).toBeNull();
 });
 it('does not issue alerts after kickoff or after the league week is final',()=>{
  expect(lineupRescuePlan(team,{now:Date.parse(team.lineup[0].kickoff)})).toEqual([]);
  expect(lineupAlertDrafts({season:2026,week:6,teams:[team],now,completed:true})).toEqual([]);
 });
 it('flags unknown availability without pretending a swap is unlocked',()=>{
  const result=lineupRescuePlan({...team,lineup:[p('starter','WR',{slotType:'WR',state:'unknown',kickoff:null,injuryStatus:'Out'})]},{now});
  expect(result[0].actionable).toBe(false);
  expect(lineupAlertDrafts({season:2026,week:6,teams:[{...team,lineup:result.map(r=>r.player)}],now})).toEqual([]);
 });
 it('targets only the owner in a 90-minute window and escalates Out once',()=>{
  const first=lineupAlertDrafts({season:2026,week:6,teams:[team],now})[0];
  expect(first).toMatchObject({targetMemberIds:[1],category:'matchups',audience:'members',expiresAt:team.lineup[0].kickoff});
  expect(first.body).toContain('backup');expect(first.sourceKey).toContain(':out');
  const q=lineupAlertDrafts({season:2026,week:6,teams:[{...team,lineup:[{...team.lineup[0],injuryStatus:'Questionable'}]}],now})[0];
  expect(q.sourceKey).not.toBe(first.sourceKey);
  expect(lineupAlertDrafts({season:2026,week:6,teams:[team],now:now-3600000})).toEqual([]);
  expect(lineupAlertDrafts({season:2026,week:6,teams:[{...team,memberId:null}],now})).toEqual([]);
 });
 it('supports flex and dual eligibility while rejecting a QB in flex',()=>{
  expect(slotEligible({position:'QB'},'FLEX')).toBe(false);
  expect(slotEligible({position:'WR',positions:['WR','RB']},'RB')).toBe(true);
 });
});
