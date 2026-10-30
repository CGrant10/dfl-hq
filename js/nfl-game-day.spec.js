import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {loadNflGameDay} from './nfl-game-day.js';
vi.mock('./app-diagnostics.js',()=>({reportAppIssue:vi.fn()}));
let week=8;
const payload=()=>({season:{year:2026,type:2},week:{number:week},events:[{status:{type:{state:'in'}},competitions:[{competitors:[]}]}]});
beforeEach(()=>{week++;vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-30T02:00Z'));vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>payload()})))});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
it('supports a five-second live board without changing the default twenty-second cache',async()=>{
 await loadNflGameDay(2026,week);vi.advanceTimersByTime(5000);
 await loadNflGameDay(2026,week);expect(fetch).toHaveBeenCalledTimes(1);
 await loadNflGameDay(2026,week,{maxAgeMs:5000});expect(fetch).toHaveBeenCalledTimes(2);
 await loadNflGameDay(2026,week,{maxAgeMs:5000});expect(fetch).toHaveBeenCalledTimes(2);
});
it('shares an in-flight board even when another reader forces a refresh',async()=>{
 let release;fetch.mockImplementationOnce(()=>new Promise(resolve=>release=resolve));
 const first=loadNflGameDay(2026,week),second=loadNflGameDay(2026,week,{force:true,maxAgeMs:5000});
 expect(fetch).toHaveBeenCalledTimes(1);release({ok:true,json:async()=>payload()});
 expect(await first).toBe(await second);
});
it('removes failed cache entries so the next update can recover',async()=>{
 fetch.mockResolvedValueOnce({ok:false});await expect(loadNflGameDay(2026,week)).rejects.toThrow('unavailable');
 await loadNflGameDay(2026,week);expect(fetch).toHaveBeenCalledTimes(2);
});
