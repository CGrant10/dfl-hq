import {describe,it,expect} from 'vitest';
import {nflFieldMotion} from './nfl-field-ui.js';

const play=(start,end,typeLabel='Pass Reception')=>({typeLabel,field:{start:{x:start},end:{x:end},animate:start!==end,turnover:false}});
describe('official endpoint play animation',()=>{
 it('lands exactly at the official end, with a finite flight between endpoints',()=>{
  const p=play(20,68),before=structuredClone(p),motion=nflFieldMotion(p);
  expect(motion.frames[0].transform).toBe('translate(150px,75px)');
  expect(motion.frames.at(-1).transform).toBe('translate(390px,75px)');
  expect(motion.frames.at(-1).opacity).toBe(1);
  expect(motion.duration).toBeGreaterThanOrEqual(760);
  expect(motion.duration).toBeLessThanOrEqual(1020);
  expect(p).toEqual(before);
 });
 it('keeps losses and reverse-direction gains moving toward the recorded end',()=>{
  const {frames}=nflFieldMotion(play(80,60,'Rush'));
  const positions=frames.map(f=>Number(f.transform.match(/translate\(([-\d.]+)/)[1]));
  expect(positions.every((n,i)=>!i||n<=positions[i-1])).toBe(true);
  expect(frames.at(-1).transform).toBe('translate(350px,75px)');
 });
 it('uses a restrained flight cue for passes and a lower motion for runs',()=>{
  const height=p=>Math.min(...nflFieldMotion(p).frames.map(f=>Number(f.transform.match(/,([-\d.]+)px/)[1])));
  expect(height(play(10,70,'Pass Reception'))).toBeLessThan(height(play(10,70,'Rush')));
 });
 it('never invents movement for missing, nullified or zero-distance field data',()=>{
  expect(nflFieldMotion(null)).toBeNull();
  expect(nflFieldMotion(play(50,50))).toBeNull();
  expect(nflFieldMotion({field:{animate:false,voided:true}})).toBeNull();
  expect(nflFieldMotion({field:{animate:true,voided:true}})).toBeNull();
 });
});
