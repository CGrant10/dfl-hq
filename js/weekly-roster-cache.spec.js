import {describe,it,expect,vi,afterEach} from 'vitest';
const api=vi.hoisted(()=>({matchups:vi.fn()}));
vi.mock('./sleeper.js',()=>({sleeper:api,loadPlayers:vi.fn()}));
vi.mock('./supabase.js',()=>({db:vi.fn()}));
vi.mock('./members.js',()=>({loadMemberDirectory:vi.fn()}));
vi.mock('./weekly-clubhouse-model.js',()=>({buildWeeklyClubhouse:vi.fn()}));
import {loadWeeklyRosters} from './weekly-clubhouse-data.js';
afterEach(()=>vi.useRealTimers());
describe('shared weekly score reads',()=>{
 it('coalesces forced concurrent readers and ages the result from success',async()=>{
  vi.useFakeTimers();vi.setSystemTime(1000);let resolve;
  api.matchups.mockImplementationOnce(()=>new Promise(r=>{resolve=r}));
  const a=loadWeeklyRosters('coalesce',6,{maxAgeMs:0}),b=loadWeeklyRosters('coalesce',6,{maxAgeMs:0});
  await Promise.resolve();expect(api.matchups).toHaveBeenCalledTimes(1);
  vi.setSystemTime(61000);resolve([{roster_id:1}]);expect(await a).toEqual(await b);
  await loadWeeklyRosters('coalesce',6,{maxAgeMs:1000});expect(api.matchups).toHaveBeenCalledTimes(1);
  api.matchups.mockResolvedValueOnce([{roster_id:2}]);await loadWeeklyRosters('coalesce',6,{maxAgeMs:0});expect(api.matchups).toHaveBeenCalledTimes(2);
 });
 it('allows a retry after an unsuccessful shared read',async()=>{
  api.matchups.mockRejectedValueOnce(Error('offline'));const a=loadWeeklyRosters('retry',6),b=loadWeeklyRosters('retry',6);
  await expect(a).rejects.toThrow('offline');await expect(b).rejects.toThrow('offline');
  api.matchups.mockResolvedValueOnce([{roster_id:1}]);await expect(loadWeeklyRosters('retry',6)).resolves.toEqual([{roster_id:1}]);
 });
});
