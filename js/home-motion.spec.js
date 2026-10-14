import {describe,it,expect} from 'vitest';
import {homePrimaryAction} from './home-primary-action.js';
import {homeGameDayPhase} from './home-presentation.js';
import {homeScoreProgress} from './home-score-collapse.js';
import {broadcastArtworkOffset,broadcastSettleDuration} from './broadcast-gesture-motion.js';
describe('Home phase and connected motion',()=>{
 it('keeps lineup preparation primary until this matchup starts',()=>{for(const phase of ['upcoming','unknown'])expect(homePrimaryAction(phase)).toEqual({label:'Review lineup',watch:false});const sides=[{live:0,known:true,starters:[{state:'upcoming'}]},{live:0,known:true,starters:[{state:'upcoming'}]}];expect(homePrimaryAction(homeGameDayPhase({live:true,games:[{isMine:true,sides}]}).key).watch).toBe(false)});
 it('uses one stable primary action during and after the matchup',()=>{for(const phase of ['live','ongoing'])expect(homePrimaryAction(phase)).toEqual({label:'Watch matchup',watch:true});expect(homePrimaryAction('final')).toEqual({label:'View result',watch:true})});
 it('moves continuously in either scroll direction and bounds long jumps',()=>{const values=[240,200,160,120,80,40,0,-300].map(top=>homeScoreProgress(44,top,180));expect(values[0]).toBe(0);expect(values.at(-1)).toBe(1);for(let i=1;i<values.length;i++)expect(values[i]).toBeGreaterThanOrEqual(values[i-1]);expect(homeScoreProgress(44,120,180)).toBeGreaterThan(0);expect(homeScoreProgress(44,120,180)).toBeLessThan(1);expect(homeScoreProgress(44,120,180)).toBe(homeScoreProgress(44,120,180));expect(homeScoreProgress(44,1000,0)).toBe(0)});
 it('keeps decorative artwork within its available bleed and settles flicks faster',()=>{expect(broadcastArtworkOffset(80)).toBeLessThan(0);expect(broadcastArtworkOffset(-80)).toBeGreaterThan(0);for(const value of [-10000,-100,0,100,10000])expect(Math.abs(broadcastArtworkOffset(value))).toBeLessThanOrEqual(12);expect(broadcastSettleDuration(250,2)).toBeLessThan(broadcastSettleDuration(250,.1));expect(broadcastSettleDuration(100000,0)).toBe(340);expect(broadcastSettleDuration(0,4)).toBe(170)});
});
