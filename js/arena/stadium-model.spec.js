import {describe,it,expect,vi} from 'vitest';
vi.mock('../supabase.js',()=>({db:()=>{throw Error('No database in model tests');}}));
import {buildStadiumRace,stadiumFrame,stadiumElapsed,stadiumFinishFraction,STADIUM_ENGINE} from './stadium-model.js';
import {createStadiumClock} from './stadium-data.js';

const make=(count=12,duration=60000,seed=2407)=>{
 const racers=Array.from({length:count},(_,i)=>({id:String(i+1),name:`Member ${i+1}`}));
 const manifest={engine:STADIUM_ENGINE,seed,order:racers.map(r=>r.id).reverse(),story_duration_ms:60000};
 return buildStadiumRace(racers,manifest,duration);
};
describe('shared stadium race',()=>{
 it.each([2,12,32])('keeps %i paths monotone and finishes once in the sealed order',count=>{
  const race=make(count),previous=Array(count).fill(0);let finished=new Set();
  for(let elapsed=0;elapsed<=60000;elapsed+=100){
   const frame=stadiumFrame(race,elapsed);
   for(const row of frame.rows){
    if(row.progress<previous[row.index]-1e-10||row.speed<0||row.progress>1||!row.finished&&row.progress>=1)throw Error(`Invalid path for ${row.id} at ${elapsed}ms`);
    previous[row.index]=row.progress;if(row.finished)finished.add(row.id);
   }
   if(elapsed<58500)expect(finished.size).toBe(0);
  }
  expect(finished.size).toBe(count);expect(stadiumFrame(race,60000).ranked.map(r=>r.id)).toEqual(race.order);
  expect(race.paths.at(-1).place).toBe(1);expect(Math.max(...race.paths.map(p=>p.finishMs))).toBe(60000);
 });
 it('is independent of render rate and late arrival',()=>{
  const one=make(),two=make();for(let t=0;t<28000;t+=16.667)stadiumFrame(one,t);
  expect(stadiumFrame(one,28000)).toEqual(stadiumFrame(two,28000));
 });
 it('preserves draw, paths and normalized positions after a duration edit',()=>{
  const short=make(12,30000),long=make(12,120000);
  expect(stadiumFrame(short,9000).rows.map(r=>r.progress)).toEqual(stadiumFrame(long,36000).rows.map(r=>r.progress));
  expect(short.order).toEqual(long.order);expect(long.paths[0].finishMs).toBe(short.paths[0].finishMs*4);
 });
 it('has meaningful leader changes while keeping motion continuous',()=>{
  const race=make(),leaders=new Set();let changes=0,last='';
  for(let t=6000;t<54000;t+=100){const f=stadiumFrame(race,t);const leader=f.ranked[0].id;leaders.add(leader);if(last&&last!==leader)changes++;last=leader;}
  expect(changes).toBeGreaterThan(8);expect(leaders.size).toBeGreaterThan(5);
  let positionJump=0,speedJump=0;
  for(const path of race.paths)for(let t=.06;t<.97;t+=.001){const a=path.at(t-1e-7),b=path.at(t+1e-7);positionJump=Math.max(positionJump,Math.abs(a.progress-b.progress));speedJump=Math.max(speedJump,Math.abs(a.speed-b.speed));}
  expect(positionJump).toBeLessThan(.00001);expect(speedJump).toBeLessThan(.001);
 });
 it('rejects corrupt and incomplete draws',()=>{
  const race=make();for(const order of [[],['1','1'],race.order.slice(1),race.order.map((id,i)=>i?'99':id)])expect(()=>buildStadiumRace(race.racers,{engine:STADIUM_ENGINE,seed:1,order},60000)).toThrow();
  for(const duration of [0,14999,600001,NaN,15000.5])expect(()=>make(12,duration)).toThrow();
 });
 it('uses the server clock, pauses countdown, and resumes its remaining time',()=>{
  const now=Date.parse('2026-10-13T12:00:00Z');const e={bc_state:'running',bc_started_at:new Date(now+3000).toISOString(),bc_offset_ms:0,race_duration_ms:60000};
  expect(stadiumElapsed(e,now)).toBe(-3000);expect(stadiumElapsed({...e,bc_state:'paused',bc_offset_ms:-1800},now+100000)).toBe(-1800);
  expect(stadiumElapsed({...e,bc_started_at:new Date(now+100000).toISOString(),bc_offset_ms:-1800},now+100900)).toBe(-900);
  expect(stadiumElapsed({...e,bc_state:'finished'},now)).toBe(60000);
 });
 it('assigns the final crossing at exactly the selected duration',()=>{
  expect(stadiumFinishFraction(1,12)).toBe(.975);expect(stadiumFinishFraction(12,12)).toBe(1);
  expect(stadiumFrame(make(),-2000).countdown).toBe(2);
 });
 it('anchors time to monotonic elapsed time and half the request round trip',()=>{
  let now=100;const clock=createStadiumClock(()=>now);clock.sync(100000,80,100);expect(clock.now()).toBe(100010);now=5100;expect(clock.now()).toBe(105010);
 });

});
