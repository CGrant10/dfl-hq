import {describe,it,expect} from 'vitest';
import {buildRecordArchive,recordChases} from './record-chases-model.js';
const scoring={rec:1,pass_td:4,pass_yd:.04,rec_yd:.1};
const row=(season,week,a=170,b=140)=>({season,week,roster1:1,user1:'a',score1:a,roster2:2,user2:'b',score2:b});
function fixture(){return {archiveComplete:true,leagues:[2024,2025,2026].map(season=>({season,scoring_settings:{...scoring}})),standings:[2024,2025,2026].flatMap(season=>['a','b','c','d'].map((sleeper_user_id,i)=>({season,roster_id:i+1,sleeper_user_id}))),matchups:[row(2024,1,180,150),row(2025,1,190,160),row(2026,1,160,155),row(2026,2,165,150)]}}
const scope={season:2026,week:3};
const team=(uid,score)=>({uid,name:`Current ${uid}`,roster:uid,known:true,score,lineup:[{state:'live'}],identity:{sleeper_user_id:uid}});
function live(lore=fixture(),score=183.61){const archive=buildRecordArchive(lore,scope);return {model:{...scope,leagueId:'league',completed:false,recordArchive:archive},game:{id:'1',sides:[team('a',score),team('b',100)]}}}
describe('verified record benchmarks',()=>{
 it('uses only scoring-compatible past receipts and keeps the benchmark source',()=>{
  const f=fixture();f.leagues.push({season:2023,scoring_settings:{...scoring,rec:0}});f.matchups.push(row(2023,1,400,300),row(2026,3,350,350),row(2026,4,500,500),row(2027,1,600,600));
  const r=buildRecordArchive(f,scope);expect(r.league).toMatchObject({uid:'a',cents:19000,season:2025,week:1});expect(r.years).toEqual([2024,2025,2026]);expect(r.seasonal.get('a').cents).toBe(16500);
 });
 it('compares harmless float precision and explicit zero settings consistently',()=>{
  const f=fixture();f.leagues[0].scoring_settings={...scoring,rec_yd:.10000000149011612,unused:0};expect(buildRecordArchive(f,scope).years).toEqual([2024,2025,2026]);
 });
 it('requires a complete counted archive, known scoring and a valid selected week',()=>{
  for(const patch of [{archiveComplete:false},{archiveComplete:undefined},{error:Error('offline')},{leagues:[]},{leagues:[{season:2026,scoring_settings:{}}]},{leagues:[{season:2026,scoring_settings:{rec:null}}]}])expect(buildRecordArchive({...fixture(),...patch},scope)).toBeNull();
  expect(buildRecordArchive(fixture(),{season:2026,week:0})).toBeNull();
 });
 it('deduplicates identical and reversed receipts without extra appearances',()=>{
  const f=fixture(),r=f.matchups[1];f.matchups.push({...r},{...r,user1:'b',roster1:2,score1:r.score2,user2:'a',roster2:1,score2:r.score1});expect(buildRecordArchive(f,scope).personal.get('a').cents).toBe(19000);
 });
 it('withholds ambiguous records instead of choosing a convenient conflicting score',()=>{
  const f=fixture();f.matchups.push(row(2025,1,195,160));const r=buildRecordArchive(f,scope);expect(r.league).toBeNull();expect(r.personal.has('a')).toBe(false);expect(r.seasonal.get('a').cents).toBe(16500);
 });
 it('does not turn blank scores, booleans or unplayed 0–0 receipts into evidence',()=>{
  for(const value of [null,'',false,NaN]){const f=fixture();f.matchups[0].score1=value;const r=buildRecordArchive(f,scope);expect(r.league).toBeNull();expect(r.personal.has('a')).toBe(false)}
  const f=fixture();f.matchups[0]=row(2024,1,0,0);expect(buildRecordArchive(f,scope).league).toBeNull();
 });
 it('resolves a missing owner only from that season’s roster, never a name or another season',()=>{
  const f=fixture();f.matchups[0].user1=null;expect(buildRecordArchive(f,scope).personal.get('a').cents).toBe(19000);
  f.standings=f.standings.filter(r=>!(r.season===2024&&r.roster_id===1));const r=buildRecordArchive(f,scope);expect(r.league).toBeNull();expect(r.personal.size).toBe(0);expect(r.seasonal.has('a')).toBe(true);
 });
 it('rejects conflicting roster ownership and multiple opponents in the same week',()=>{
  const f=fixture();f.matchups.push({...row(2025,1),user2:'c',roster2:3});const r=buildRecordArchive(f,scope);expect(r.league).toBeNull();expect(r.personal.has('a')).toBe(false);expect(r.personal.has('b')).toBe(false);expect(r.personal.has('c')).toBe(false);
  const other=fixture();other.matchups[0].user1='different-owner';expect(buildRecordArchive(other,scope).personal.has('a')).toBe(false);
 });
});
describe('live record watch',()=>{
 it('needs the extra hundredth to beat a benchmark and does not call a tie a record',()=>{
  const {model,game}=live();const r=recordChases(model,game)[0];expect(r).toMatchObject({remaining:6.4,state:'chasing',kind:'league'});
  game.sides[0].score=190;expect(recordChases(model,game)[0]).toMatchObject({remaining:.01,state:'tied'});
  game.sides[0].score=190.01;expect(recordChases(model,game)[0]).toMatchObject({remaining:0,above:.01,state:'cleared',final:false,progress:1});
 });
 it('falls back to a meaningful personal or season target when a bigger record is too far away',()=>{
  const f=fixture();f.matchups.push({...row(2025,1,300,250),roster1:3,user1:'c',roster2:4,user2:'d'});const {model,game}=live(f);expect(recordChases(model,game)[0].kind).toBe('team');
  f.matchups[1].score1=250;const next=live(f,160);expect(recordChases(next.model,next.game)[0]).toMatchObject({kind:'season',remaining:5.01});
 });
 it('stays absent for distant goals, unknown scores, pregame, missing history and a mismatched week',()=>{
  const {model,game}=live();game.sides[0].score=0;expect(recordChases(model,game)).toEqual([]);
  for(const value of [null,'',false]){game.sides[0].score=value;expect(recordChases(model,game)).toEqual([])}
  game.sides[0]=team('a',185);game.sides[0].lineup=[{state:'upcoming'}];expect(recordChases(model,game)).toEqual([]);
  game.sides[0]=team('a',185);expect(recordChases({...model,week:4},game)).toEqual([]);expect(recordChases({...model,recordArchive:null},game)).toEqual([]);
 });
 it('keeps current names and owner identity while distinguishing a settled final from live clearance',()=>{
  const {model,game}=live(fixture(),191);game.sides[0].name='The renamed team';expect(recordChases({...model,completed:true},game)[0]).toMatchObject({uid:'a',final:true,team:{name:'The renamed team'}});
 });
});
