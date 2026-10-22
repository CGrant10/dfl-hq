import {describe,it,expect} from 'vitest';
import {homePrimaryAction} from './home-primary-action.js';
import {homeGameDayPhase} from './home-presentation.js';
import {homeScoreProgress,homeScoreFrame} from './home-score-collapse.js';
import {watchScoreCompact} from './watch-score-collapse.js';
import {broadcastArtworkOffset,broadcastSettleDuration} from './broadcast-gesture-motion.js';
describe('Home phase and connected motion',()=>{
 it('keeps lineup preparation primary until this matchup starts',()=>{for(const phase of ['upcoming','unknown'])expect(homePrimaryAction(phase)).toEqual({label:'Review lineup',watch:false});const sides=[{live:0,known:true,starters:[{state:'upcoming'}]},{live:0,known:true,starters:[{state:'upcoming'}]}];expect(homePrimaryAction(homeGameDayPhase({live:true,games:[{isMine:true,sides}]}).key).watch).toBe(false)});
 it('uses one stable primary action during and after the matchup',()=>{for(const phase of ['live','ongoing'])expect(homePrimaryAction(phase)).toEqual({label:'Watch matchup',watch:true});expect(homePrimaryAction('final')).toEqual({label:'View result',watch:true})});
 it('moves continuously in either scroll direction and bounds long jumps',()=>{const values=[240,200,160,120,80,40,0,-300].map(top=>homeScoreProgress(44,top,180));expect(values[0]).toBe(0);expect(values.at(-1)).toBe(1);for(let i=1;i<values.length;i++)expect(values[i]).toBeGreaterThanOrEqual(values[i-1]);expect(homeScoreProgress(44,120,180)).toBeGreaterThan(0);expect(homeScoreProgress(44,120,180)).toBeLessThan(1);expect(homeScoreProgress(44,120,180)).toBe(homeScoreProgress(44,120,180));expect(homeScoreProgress(44,1000,0)).toBe(0)});
 it('eases into both ends without lag or a jump when reversing',()=>{const p=x=>homeScoreProgress(44,148-x*156,180);expect(p(0)).toBe(0);expect(p(1)).toBe(1);expect(p(.01)).toBeLessThan(.001);expect(1-p(.99)).toBeLessThan(.001);expect(p(.5)).toBeCloseTo(.5)});
 it('lands a score exactly at both measured endpoints and fades its copies at the handoffs',()=>{
  const g={kind:'score',from:{left:10,top:50,width:80,height:40},to:{left:20,top:80,width:40,height:20},width:80,height:40,scale:.5};
  expect(homeScoreFrame(g,0,44,160)).toEqual({transform:'translate3d(10px,198px,0) scale(1)',opacity:0});
  expect(homeScoreFrame(g,1,44,160)).toEqual({transform:'translate3d(20px,80px,0) scale(0.5)',opacity:0});
  expect(homeScoreFrame(g,.5,44,160).opacity).toBe(1);
 });
 it('keeps traveling name text at one size in either direction',()=>{
  const g={kind:'name',from:{left:10,top:50,width:120,height:40},to:{left:30,top:60,width:80,height:30},width:80,height:30,scale:.6};
  for(const t of [0,.01,.25,.5,.8,.99,1,.5,.1])expect(homeScoreFrame(g,t,44,160).transform).toMatch(/scale\(1\)$/);
  expect(homeScoreFrame(g,.5,44,160)).toEqual(homeScoreFrame(g,.5,44,160));
 });
 it('keeps the Watch scoreboard stable around its collapse threshold',()=>{expect(watchScoreCompact(-25,0)).toBe(true);for(const top of [-25,-23,-18,-13])expect(watchScoreCompact(top,0,true)).toBe(true);expect(watchScoreCompact(-11,0,true)).toBe(false);expect(watchScoreCompact(75,100)).toBe(true);expect(watchScoreCompact(89,100,true)).toBe(false)});
 it('keeps decorative artwork within its available bleed and settles flicks faster',()=>{expect(broadcastArtworkOffset(80)).toBeLessThan(0);expect(broadcastArtworkOffset(-80)).toBeGreaterThan(0);for(const value of [-10000,-100,0,100,10000])expect(Math.abs(broadcastArtworkOffset(value))).toBeLessThanOrEqual(12);expect(broadcastSettleDuration(250,2)).toBeLessThan(broadcastSettleDuration(250,.1));expect(broadcastSettleDuration(100000,0)).toBe(340);expect(broadcastSettleDuration(0,4)).toBe(170)});
});
