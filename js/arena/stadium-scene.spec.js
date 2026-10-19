import {it,expect} from 'vitest';
import {stadiumShowdown,stadiumShowdownLane,stadiumDepth} from './stadium-scene.js';
const frame=()=>({countdown:0,finished:false,rows:[{id:'a',index:0,progress:.5,rank:2,place:12},{id:'b',index:11,progress:.505,rank:1,place:1}]});
const shot={kind:'battle',ids:['b','a']};
it('keeps separate close-ups in stable lanes while the true lead changes',()=>{
 const f=frame(),original=structuredClone(f),first=stadiumShowdown(shot,f);
 expect(first.rows.map(row=>row.id)).toEqual(['a','b']);expect(first.leaderId).toBe('b');expect(first.gapYards).toBeCloseTo(.5);expect(f).toEqual(original);
 f.rows[0].progress=.51;f.rows[0].rank=1;f.rows[1].rank=2;
 const second=stadiumShowdown({...shot,ids:['a','b']},f);
 expect(second.key).toBe(first.key);expect(second.leaderId).toBe('a');expect(second.rows.map(row=>row.id)).toEqual(['a','b']);
});
it('keeps manual cameras, reduced motion, starting grids and completed results in charge',()=>{
 for(const options of [{camera:'field'},{camera:'follow'},{motion:false},{state:'idle'},{state:'finished'}])expect(stadiumShowdown(shot,frame(),options)).toBeNull();
 expect(stadiumShowdown({...shot,kind:'launch'},frame())).toBeNull();
 expect(stadiumShowdown(shot,{...frame(),countdown:2})).toBeNull();
 expect(stadiumShowdown(shot,{...frame(),finished:true},{replay:true})).toBeNull();
 expect(stadiumShowdown({...shot,kind:'photo'},frame(),{state:'finished',replay:true})).not.toBeNull();
 expect(stadiumShowdown(shot,frame(),{state:'paused'})).not.toBeNull();
});
it('does not turn nearby lanes, distant racers or unknown identities into a showdown',()=>{
 const f=frame();f.rows[1].index=2;expect(stadiumShowdown(shot,f)).toBeNull();f.rows[1].index=11;f.rows[1].progress=.6;expect(stadiumShowdown(shot,f)).toBeNull();
 expect(stadiumShowdown({...shot,ids:['missing','a']},frame())).toBeNull();expect(stadiumShowdown({...shot,ids:['a','a']},frame())).toBeNull();
 f.rows[1].progress=NaN;expect(stadiumShowdown(shot,f)).toBeNull();
});
it('fits runner bodies below the labels and keeps both feeds inside portrait and landscape fields',()=>{
 for(const [width,height] of [[280,105],[350,144],[844,180],[740,350]])for(const i of [0,1]){
  const lane=stadiumShowdownLane(i,{top:30,height,width});
  expect(lane.ground-60*lane.scale).toBeGreaterThanOrEqual(lane.top+(lane.columns?28:16));
  expect(lane.ground+6*lane.scale).toBeLessThanOrEqual(lane.top+lane.height);
  expect(lane.left).toBeGreaterThanOrEqual(0);expect(lane.left+lane.width).toBeLessThanOrEqual(width);
  expect(lane.columns).toBe(width<650);
 }
});
it('holds an established pair through a small gap change without rapid cuts at the entry threshold',()=>{
 const f=frame();f.rows[1].progress=.54;
 expect(stadiumShowdown(shot,f)).toBeNull();expect(stadiumShowdown(shot,f,{activeKey:'a:b'})).not.toBeNull();
 f.rows[1].progress=.56;expect(stadiumShowdown(shot,f,{activeKey:'a:b'})).toBeNull();
});
it('moves distant stands less than the near crowd and foreground, using camera position only',()=>{
 expect(stadiumDepth(0)).toEqual({far:0,near:0,sideline:0});
 const mid=stadiumDepth(1150);expect(mid).toEqual({far:-9,near:-21,sideline:-37});expect(Math.abs(mid.far)).toBeLessThan(Math.abs(mid.near));expect(Math.abs(mid.near)).toBeLessThan(Math.abs(mid.sideline));
 expect(stadiumDepth(5000)).toEqual(stadiumDepth(2300));expect(stadiumDepth(-500)).toEqual(stadiumDepth(0));
 expect(stadiumDepth(1800,{motion:false})).toEqual(stadiumDepth(0));expect(stadiumDepth(NaN)).toEqual(stadiumDepth(0));
});
