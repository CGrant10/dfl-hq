import {it,expect} from 'vitest';
import {runnerCadence} from './stadium-motion.js';
it('makes stride cadence follow the current speed with bounded lean and bob',()=>{
 const normal=runnerCadence(600,1),surge=runnerCadence(600,1.6);
 expect(surge.phase).toBeGreaterThan(normal.phase);expect(surge.burst).toBe(true);expect(normal.burst).toBe(false);
 for(const speed of [0,.4,1,1.5,9,NaN]){const value=runnerCadence(900,speed,2);expect(value.stride).toBeGreaterThanOrEqual(0);expect(value.stride).toBeLessThan(6);expect(Math.abs(value.bob)).toBeLessThanOrEqual(.8);expect(value.lean).toBeLessThanOrEqual(.065);}
});
it('keeps paused, finished and reduced-motion poses still',()=>{
 for(const time of [0,600,12000])expect(runnerCadence(time,1.5,4,false)).toMatchObject({stride:1,bob:0,lean:0,burst:false});
});
it('anchors acceleration to traveled distance instead of changing all accumulated stride time',()=>{
 const a=runnerCadence(100000,1,0,true,900),b=runnerCadence(100016,1.6,0,true,900.2);
 expect(b.phase-a.phase).toBeCloseTo(.2);expect(b.burst).toBe(true);
 expect(runnerCadence(1,1.6,0,true,900.2).phase).toBe(b.phase);
 expect(runnerCadence(100016,1.6,0,false,900.2)).toMatchObject({stride:1,bob:0,lean:0});
});
