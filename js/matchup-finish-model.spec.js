import {describe,it,expect} from 'vitest';
import {matchupFinish,finishSeenKey} from './matchup-finish-model.js';
import {matchupReceiptData} from './game-day-matchup-share.js';
import {matchupFinishHtml} from './matchup-finish.js';
const game=(a=110.04,b=110,id='1')=>({id,isMine:true,sides:[{name:'Bayou Bombers',score:a},{name:'Klutch Sports Group',score:b}]});
const model={leagueId:'league',season:2026,week:6,completed:true};
describe('settled matchup finishes',()=>{
 it('waits for a confirmed complete week, scoped matchup and both actual scores',()=>{
  for(const change of [{completed:false},{completed:undefined},{leagueId:null},{week:0}])expect(matchupFinish({...model,...change},game())).toBeNull();
  for(const score of [null,undefined,'',NaN,Infinity])expect(matchupFinish(model,{...game(),sides:[{name:'A',score},{name:'B',score:100}]})).toBeNull();
  expect(matchupFinish(model,{id:'1',sides:[]})).toBeNull();
 });
 it('uses hundredths for truthful margins and distinct finish treatments at their boundaries',()=>{
  for(const [margin,kind] of [[0,'tie'],[0.04,'clutch'],[1,'clutch'],[1.01,'close'],[4.99,'close'],[5,'win'],[29.99,'win'],[30,'blowout'],[40,'blowout']]){
   const result=matchupFinish(model,game(100+margin,100));expect(result.kind).toBe(kind);expect(result.margin).toBe(margin);
  }
  expect(matchupFinish(model,game(110.00000001,110)).winner).toBeNull();
  expect(matchupFinish(model,game(90,130)).winner).toBe(1);
 });
 it('keeps ties neutral and never converts an ordinary win into an upset without evidence',()=>{
  const tied=matchupFinish(model,game(0,0));expect(tied.roast).toContain('Zero');expect(tied.announcement).toContain('Finished level');
  expect(tied.announcement).not.toContain('won');expect(matchupFinish(model,game()).announcement).toContain('won by 0.04');
  expect(matchupFinish(model,game()).roast).not.toContain('upset');
 });
 it('deduplicates across surfaces and score corrections, but separates members, leagues, weeks and matchups',()=>{
  const original=matchupFinish(model,game()),corrected=matchupFinish(model,game(111));
  expect(finishSeenKey(original,'a')).toBe(finishSeenKey(corrected,'a'));
  expect(finishSeenKey(original,'a')).not.toBe(finishSeenKey(original,'b'));
  for(const other of [matchupFinish({...model,week:7},game()),matchupFinish({...model,leagueId:'other'},game()),matchupFinish(model,game(110,100,'2'))])expect(other.key).not.toBe(original.key);
 });
 it('escapes team names and exposes replay, sharing and an accessible result without repeating the scoreboard',()=>{
  const result=matchupFinish(model,{...game(),sides:[{name:'<img src=x>',score:150},{name:'A & B',score:100}]});
  const html=matchupFinishHtml(result);expect(html).toContain('A &amp; B');expect(html).not.toContain('<img');expect(html).toContain('data-finish-replay');expect(html).toContain('data-finish-share');expect(html).not.toContain('150.00');
 });
 it('shares the selected matchup while preserving the existing personal-card default',()=>{
  const mine=game(),other={...game(80,120,'2'),isMine:false};const full={...model,games:[mine,other]};
  expect(matchupReceiptData(full).sides[0].score).toBe(110.04);
  expect(matchupReceiptData(full,{gameId:'2'}).sides.map(team=>team.score)).toEqual([80,120]);
  expect(matchupReceiptData(full,{gameId:'missing'})).toBeNull();
 });
});
