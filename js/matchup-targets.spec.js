import {describe,it,expect} from 'vitest';
import {matchupTargets} from './matchup-targets.js';
const game={sides:[{name:'A',memberId:1,score:100,known:true,remaining:2,starters:[{state:'live'},{state:'upcoming'}]},{name:'B',memberId:2,score:112.34,known:true,remaining:1,starters:[{state:'live'}]}]};
describe('live scoring targets',()=>{
 it('uses net points when both teams still have players and one cent to take a lead',()=>{
  expect(matchupTargets(game,{memberId:1})[0].text).toContain('12.35 more points than their remaining players');
 });
 it('shows a fixed target only when the opponent has finished',()=>{
  const g={sides:[game.sides[0],{...game.sides[1],remaining:0,starters:[{state:'final'}]}]};
  expect(matchupTargets(g)[0].text).toContain('12.35 points to take the lead');
 });
 it('never calculates targets from unknown scores, unknown status or pregame zeros',()=>{
  for(const update of [{known:false},{score:null},{score:undefined}])expect(matchupTargets({sides:[{...game.sides[0],...update},game.sides[1]]})).toEqual([]);
  expect(matchupTargets({sides:game.sides.map(t=>({...t,starters:[{state:'upcoming'}]}))})).toEqual([]);
  expect(matchupTargets(game,{completed:true})).toEqual([]);
 });
 it('keeps tied and all-player-finished games honest without premature final claims',()=>{
  expect(matchupTargets({sides:game.sides.map(t=>({...t,score:100}))})[0].text).toContain('0.01');
  expect(matchupTargets({sides:game.sides.map(t=>({...t,remaining:0,starters:[{state:'final'}]}))})[0].text).toContain('awaiting league final');
 });
});
