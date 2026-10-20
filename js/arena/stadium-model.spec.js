import {describe,it,expect,vi} from 'vitest';
vi.mock('../supabase.js',()=>({db:()=>{throw Error('No database in model tests');}}));
import {buildStadiumRace,stadiumFrame,stadiumElapsed,stadiumFinishFraction,stadiumMoment,STADIUM_ENGINE} from './stadium-model.js';
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

describe('versioned dramatic stadium presentation',()=>{
 const modern=(count=12,duration=60000,seed=2407)=>{const base=make(count,duration,seed);return buildStadiumRace(base.racers,{engine:STADIUM_ENGINE,seed,order:base.order,story_duration_ms:60000,presentation_version:2},duration)};
 it.each([2,12,32])('keeps every one of %i runners moving forward into the same official finish times',count=>{
  for(const seed of [1,2407,9811])for(const duration of [15000,60000,600000]){
   const race=modern(count,duration,seed),previous=Array(count).fill(0);
   for(let i=0;i<=400;i++)for(const row of stadiumFrame(race,duration*i/400).rows){
    if(!Number.isFinite(row.progress)||!Number.isFinite(row.speed)||row.progress<previous[row.index]-1e-10||row.speed<0||row.progress>1||!row.finished&&row.progress>=1)throw Error(`Invalid dramatic path: ${count} racers, seed ${seed}, ${duration}ms, frame ${i}, racer ${row.id}`);
    previous[row.index]=row.progress;
   }
   expect(race.paths.map(p=>p.finishMs)).toEqual(make(count,duration,seed).paths.map(p=>p.finishMs));
   expect(stadiumFrame(race,duration).ranked.map(r=>r.id)).toEqual(race.order);
  }
 });
 it('makes visible breakaways and comebacks without changing legacy replays',()=>{
  const race=modern(),leaders=new Set();let spread=0,bestComeback=0;
  for(let t=6000;t<54000;t+=500){const f=stadiumFrame(race,t),before=stadiumFrame(race,t-4000);leaders.add(f.ranked[0].id);spread=Math.max(spread,f.ranked[0].progress-f.ranked.at(-1).progress);for(const row of f.rows)bestComeback=Math.max(bestComeback,before.rows[row.index].rank-row.rank);}
  expect(spread).toBeGreaterThan(.18);expect(leaders.size).toBeGreaterThanOrEqual(4);expect(bestComeback).toBeGreaterThanOrEqual(3);
  const old=make();expect(old.presentationVersion).toBe(1);expect(stadiumFrame(old,28000).rows).not.toEqual(stadiumFrame(race,28000).rows);
  expect(stadiumFrame(race,28000)).toEqual(stadiumFrame(modern(),28000));
  expect(stadiumFrame(modern(12,120000),56000).rows.map(r=>r.progress)).toEqual(stadiumFrame(race,28000).rows.map(r=>r.progress));
 });
 it('only calls rank changes that happened in the shared measured window',()=>{
  const race=modern();let passes=0,leads=0;
  for(let t=6000;t<54000;t+=3000){
   const frame=stadiumFrame(race,t),call=stadiumMoment(race,frame),before=stadiumFrame(race,t-3000);
   if(call.title==='TAKES THE LEAD'){expect(frame.ranked[0].id).not.toBe(before.ranked[0].id);expect(call.name).toBe(race.racers[frame.ranked[0].index].name);leads++;}
   if(call.title.includes('→')){const row=frame.rows.find(r=>race.racers[r.index].name===call.name);expect(before.rows[row.index].rank-row.rank).toBeGreaterThanOrEqual(2);passes++;}
  }
  expect(leads).toBeGreaterThan(1);expect(passes).toBeGreaterThan(0);
 });
 it('refuses an unknown presentation instead of showing an incompatible race',()=>{
  const race=make();expect(()=>buildStadiumRace(race.racers,{engine:STADIUM_ENGINE,seed:1,order:race.order,presentation_version:3},60000)).toThrow('Update DFL');
 });
});
