import {describe,it,expect} from 'vitest';
import {playerCardPreviewMatches} from './player-card-model.js';
const model={player:{id:'7564'},season:2026,week:6,points:29,state:'final'};
const saved={model,memberId:12,at:100000};
const context={season:2026,week:6,points:29,state:'final'};
describe('player card presentation preview',()=>{
 it('allows only a recent matching player and member while refreshing',()=>{
  expect(playerCardPreviewMatches(saved,{id:'7564'},context,12,100001)).toBe(true);
  expect(playerCardPreviewMatches(saved,{id:7564},null,12,159999)).toBe(true);
  for(const [selection,ctx,member,at] of [
   [{id:'7564'},context,13,100001],[{id:'other'},context,12,100001],
   [{id:'7564'},context,12,160000],[{id:'7564'},context,12,99999],
   [{id:'7564'},{...context,week:7},12,100001],[{id:'7564'},{...context,season:2027},12,100001],
   [{id:'7564'},{...context,points:30},12,100001],[{id:'7564'},{...context,state:'live'},12,100001],
  ])expect(playerCardPreviewMatches(saved,selection,ctx,member,at)).toBe(false);
 });
});
