import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const now=Date.now(),payload=at=>({schemaVersion:1,source:'Sleeper',fetchedAt:at,players:Object.fromEntries(Array.from({length:32},(_,i)=>[String(i+1),{team:'KC',order:i%4+1}]))});
beforeEach(()=>vi.resetModules());afterEach(()=>vi.unstubAllGlobals());
it('selects the newest valid source, shares concurrent reads and caches the small facts',async()=>{
 const fetch=vi.fn(async url=>({ok:true,json:async()=>payload(String(url).includes('raw.githubusercontent')?now:now-60000)}));vi.stubGlobal('fetch',fetch);
 const {loadBackfieldRoles}=await import('./backfield-roles-data.js');
 const [one,two]=await Promise.all([loadBackfieldRoles(),loadBackfieldRoles()]);expect(one).toEqual(two);expect(one.fetchedAt).toBe(now);expect(fetch).toHaveBeenCalledTimes(2);
 await loadBackfieldRoles();expect(fetch).toHaveBeenCalledTimes(2);
});
it('excludes expired facts and does not call an unverified forced recheck fresh',async()=>{
 const fetch=vi.fn(async()=>({ok:true,json:async()=>payload(now)}));vi.stubGlobal('fetch',fetch);
 const {loadBackfieldRoles}=await import('./backfield-roles-data.js');expect((await loadBackfieldRoles()).usable).toBe(true);
 fetch.mockRejectedValue(Error('Offline'));expect((await loadBackfieldRoles({force:true})).usable).toBe(false);
 expect((await loadBackfieldRoles()).usable).toBe(true);
});
