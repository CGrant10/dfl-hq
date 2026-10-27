import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {loadNflGameSummary} from './nfl-game-center-data.js';
let serial=99000;
const game=()=>({id:String(serial++),state:'in'});
const payload=id=>({header:{id,season:{year:2026,type:2}}});
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-25T22:00:00Z'));vi.stubGlobal('fetch',vi.fn((url)=>Promise.resolve({ok:true,json:async()=>payload(new URL(url).searchParams.get('event'))})))});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
it('checks the live summary again after ten seconds and keeps short reads deduplicated',async()=>{
 const selected=game();await loadNflGameSummary(selected,2026);await loadNflGameSummary(selected,2026);expect(fetch).toHaveBeenCalledTimes(1);
 vi.advanceTimersByTime(10000);await loadNflGameSummary(selected,2026);expect(fetch).toHaveBeenCalledTimes(2);
});
it('fetches the final plays when the scoreboard changes to Final instead of reusing the live cache for five minutes',async()=>{
 const selected=game();await loadNflGameSummary(selected,2026);selected.state='post';await loadNflGameSummary(selected,2026);expect(fetch).toHaveBeenCalledTimes(2);
 vi.advanceTimersByTime(10000);await loadNflGameSummary(selected,2026);expect(fetch).toHaveBeenCalledTimes(2);
 await loadNflGameSummary(selected,2026,{force:true});expect(fetch).toHaveBeenCalledTimes(3);
});
it('shares pending forced reads and recovers from failed and wrong-game responses',async()=>{
 const selected=game();let release;fetch.mockImplementationOnce(()=>new Promise(resolve=>release=resolve));
 const first=loadNflGameSummary(selected,2026),second=loadNflGameSummary(selected,2026,{force:true});expect(first).toBe(second);
 release({ok:false});await expect(first).rejects.toThrow('unavailable');
 fetch.mockResolvedValueOnce({ok:true,json:async()=>payload('different')});await expect(loadNflGameSummary(selected,2026)).rejects.toThrow('scope');
 await expect(loadNflGameSummary(selected,2026)).resolves.toHaveProperty('summary.header.id',selected.id);
});
