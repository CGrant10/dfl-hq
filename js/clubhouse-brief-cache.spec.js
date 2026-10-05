import { describe,it,expect,vi,beforeEach } from 'vitest';
const rpc=vi.hoisted(()=>vi.fn());
vi.mock('./supabase.js',()=>({db:()=>({rpc})}));
vi.mock('./sleeper.js',()=>({sleeper:{},loadPlayers:vi.fn()}));
vi.mock('./members.js',()=>({loadMemberDirectory:vi.fn()}));
import {loadClubhouseIndex,loadClubhouseWeek,clearClubhouseBriefCache} from './weekly-clubhouse-data.js';
beforeEach(()=>{clearClubhouseBriefCache();rpc.mockReset()});
describe('Shared weekly reads',()=>{
 it('coalesces simultaneous Home and GameDay reads',async()=>{rpc.mockResolvedValue({data:[{season:2026,week:4}]});const [a,b]=await Promise.all([loadClubhouseIndex(),loadClubhouseIndex()]);expect(a).toEqual(b);expect(rpc).toHaveBeenCalledTimes(1);await loadClubhouseIndex();expect(rpc).toHaveBeenCalledTimes(1)});
 it('retries failures and bypasses completed cache for Refresh',async()=>{rpc.mockResolvedValueOnce({error:Error('offline')}).mockResolvedValue({data:[1]});await expect(loadClubhouseIndex()).rejects.toThrow('offline');await loadClubhouseIndex();await loadClubhouseIndex({force:true});expect(rpc).toHaveBeenCalledTimes(3)});
 it('recomputes the vote deadline without mutating the cached payload',async()=>{const data={games:[1],voteClosesAt:new Date(Date.now()-1000).toISOString()};rpc.mockResolvedValue({data});const result=await loadClubhouseWeek(2026,4);expect(result.voteClosed).toBe(true);expect(data).not.toHaveProperty('voteClosed');await loadClubhouseWeek(2026,4);expect(rpc).toHaveBeenCalledTimes(1);clearClubhouseBriefCache();await loadClubhouseWeek(2026,4);expect(rpc).toHaveBeenCalledTimes(2)});
});
