import {describe,it,expect} from 'vitest';
import {matchupBanter,matchupChirp} from './matchup-banter.js';
const model={season:2026,week:4,games:[{id:'1',isMine:true,sides:[{uid:'a',name:'Alpha'},{uid:'b',name:'Beta'}]}]};
describe('weekly matchup banter',()=>{
 it('uses past streaks and excludes current and future results',()=>{const history=[{season:2025,week:2,user1:'a',user2:'b',score1:120,score2:100},{season:2026,week:1,user1:'b',user2:'a',score1:99,score2:110},{season:2026,week:4,user1:'a',user2:'b',score1:0,score2:200},{season:2026,week:5,user1:'a',user2:'b',score1:0,score2:200}];expect(matchupBanter(model,history)[0].text).toContain('Alpha has taken the last 2')});
 it('keeps copy stable through score refreshes and rotates by week',()=>{expect(matchupBanter(model)).toEqual(matchupBanter({...model,live:true}));expect(matchupBanter({...model,week:5})[0].text).not.toBe(matchupBanter(model)[0].text)});
 it('does not invent a rivalry record when history is unavailable',()=>{expect(matchupBanter(model)[0]).toMatchObject({kind:'pregame',receipt:'Alpha vs Beta · Week 4.'});expect(matchupBanter(model)[0].text).not.toContain('series')});
});

const input={left:{uid:'a',name:'Alpha',score:120},right:{uid:'b',name:'Beta',score:80},season:2026,week:4,id:'1'};
describe('DFL chirps follow the receipt',()=>{
 it('never calls an unfinished lead a final result',()=>{
  expect(matchupChirp({...input,live:true})).toMatchObject({kind:'live',receipt:'Alpha leads by 40.00 · still playing.'});
  expect(matchupChirp(input).kind).toBe('pregame');
  expect(matchupChirp({...input,completed:true})).toMatchObject({kind:'final',receipt:'Alpha beat Beta by 40.00.'});
 });
 it('handles reverse winners, ties and real zero scores',()=>{
  expect(matchupChirp({...input,left:{...input.left,score:0},completed:true}).receipt).toBe('Beta beat Alpha by 80.00.');
  const tied=matchupChirp({...input,right:{...input.right,score:120},completed:true});
  expect(tied.receipt).toBe('Alpha and Beta tied at 120.00.');expect(tied.roast).not.toContain('win');
  expect(matchupChirp({...input,left:{...input.left,score:0},right:{...input.right,score:0},completed:true}).receipt).toContain('tied at 0.00');
 });
 it('leaves missing totals and partial historical scores ungraded',()=>{
  expect(matchupChirp({...input,left:{...input.left,score:null},completed:true}).kind).toBe('pregame');
  expect(matchupChirp({...input,right:{...input.right,score:NaN},live:true}).kind).toBe('pregame');
  const chirp=matchupChirp({...input,history:[{season:2025,week:1,user1:'a',user2:'b',score1:null,score2:100}]});
  expect(chirp.receipt).toBe('Alpha vs Beta · Week 4.');
 });
 it('keeps the roast stable inside a live scoring band while updating the evidence',()=>{
  const first=matchupChirp({...input,live:true}),next=matchupChirp({...input,live:true,left:{...input.left,score:121}});
  expect(next.roast).toBe(first.roast);expect(next.receipt).toContain('41.00');
 });
 it('prioritizes the selected member without discarding other matchups',()=>{
  const games=[{...model.games[0],isMine:false},{id:'2',isMine:true,sides:[input.left,input.right]}];
  expect(matchupBanter({...model,games}).map(item=>item.id)).toEqual(['2','1']);
 });
});
