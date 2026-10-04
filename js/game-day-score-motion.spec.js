import {describe,it,expect} from 'vitest';
import {scoreChange} from './game-day-score-motion.js';
import {matchupReceiptData} from './game-day-matchup-share.js';
describe('GameDay changes',()=>{
 it('shows signed point gains and corrections at fantasy scoring precision',()=>{
  expect(scoreChange(10.2,16.2)).toEqual({from:10.2,to:16.2,delta:6,label:'+6.00'});
  expect(scoreChange(16.2,15.8)?.label).toBe('−0.40');
  expect(scoreChange(10,10.004)).toBeNull();
 });
 it('does not manufacture gains from absent or invalid baseline scores',()=>{
  for(const value of [null,undefined,NaN,Infinity,'pending'])expect(scoreChange(value,6)).toBeNull();
  expect(scoreChange(6,null)).toBeNull();
 });
});
const sides=[{name:'Grant',known:true,remaining:0,score:120,starters:[{name:'My starter',points:26}]},{name:'Klutch',known:true,remaining:0,score:118,starters:[{name:'Their starter',points:28}]}];
const model={season:2026,week:4,completed:false,games:[{isMine:true,sides}]};
describe('final matchup receipts',()=>{
 it('uses actual final totals and MVP from both starting lineups',()=>{
  const card=matchupReceiptData(model);expect(card.winner.name).toBe('Grant');expect(card.margin).toBe(2);expect(card.mvp.name).toBe('Their starter');expect(card.banter).toContain('stat corrections');
 });
 it('waits for known final games and scores, rather than treating pending players as finished',()=>{
  const build=over=>({...model,games:[{isMine:true,sides:[{...sides[0],...over},sides[1]]}]});
  expect(matchupReceiptData(build({known:false}))).toBeNull();expect(matchupReceiptData(build({remaining:1}))).toBeNull();expect(matchupReceiptData({...build({score:null}),completed:true})).toBeNull();
  expect(matchupReceiptData({...build({known:false}),completed:true})).not.toBeNull();
 });
 it('handles tied totals and no scored starters honestly',()=>{
  const card=matchupReceiptData({...model,games:[{isMine:true,sides:sides.map(t=>({...t,score:120,starters:[]}))}]});expect(card.winner).toBeNull();expect(card.mvp).toBeNull();expect(card.banter).toContain('tie');
 });
});
