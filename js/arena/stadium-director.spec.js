import {it,expect} from 'vitest';
import {createStadiumDirector,closestStadiumBattle,stadiumShotWindow,stadiumCelebration} from './stadium-director.js';
const frame=(elapsed,order=['a','b','c'],progress=[.4,.398,.37])=>({elapsed,u:elapsed/60000,rows:order.map((id,index)=>({id,index,rank:index+1,progress:progress[index],finished:false})),ranked:order.map((id,index)=>({id,index,rank:index+1,progress:progress[index],finished:false}))});
it('holds a real battle, follows an observed pass, and resets on replay without altering race data',()=>{
 const d=createStadiumDirector(),start=frame(8000),before=structuredClone(start);
 expect(d.update(start).kind).toBe('battle');expect(start).toEqual(before);
 expect(d.update(frame(9000,['c','a','b'])).ids).toEqual(['a','b']);
 d.update(frame(11000,['a','b','c']));
 expect(d.update(frame(11200,['b','a','c']))).toMatchObject({kind:'pass',ids:['b','a']});
 expect(d.update(frame(2000)).kind).toBe('launch');
});
it('finds a close midfield battle and keeps manual cameras and pause in charge',()=>{
 const f=frame(15000,['a','b','c'],[.5,.45,.449]);expect(closestStadiumBattle(f).map(r=>r.id)).toEqual(['b','c']);
 const d=createStadiumDirector(),shot=d.update(f);expect(d.update(frame(16000),{state:'paused'})).toBe(shot);
 expect(d.update(f,{camera:'follow',racerId:'c'})).toMatchObject({kind:'follow',ids:['c']});
 expect(d.update(f,{camera:'field'}).kind).toBe('field');expect(d.update(f,{motion:false}).kind).toBe('field');
});
it('uses visible positions for final shots and frames both racers and the goal line',()=>{
 const d=createStadiumDirector(),f=frame(55000);expect(d.update(f).kind).toBe('finish');expect(d.update(f,{photo:true}).kind).toBe('photo');
 const window=stadiumShotWindow([{progress:.97},{progress:.985}],{finish:true});
 expect(window.start).toBeLessThan(.97*2300);expect(window.start+window.span).toBeGreaterThan(2300);
 expect(stadiumShotWindow([]).span).toBe(2760);
});
it('keeps finite celebrations still outside their window and when motion is disabled',()=>{
 for(const age of [-1,1501,Infinity])expect(stadiumCelebration(age,0)).toEqual({lift:0,lean:0,turn:1});
 expect(stadiumCelebration(500,1,false)).toEqual({lift:0,lean:0,turn:1});
 expect(new Set([0,1,2].map(i=>JSON.stringify(stadiumCelebration(500,i)))).size).toBe(3);
});
