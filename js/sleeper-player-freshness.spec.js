import {afterEach,describe,expect,it,vi} from 'vitest';

describe('live player availability caching',()=>{
  afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();vi.resetModules()});
  const setup=async(cached=null)=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-11T16:00:00Z'));vi.resetModules();
    const cache={match:vi.fn().mockResolvedValue(cached),put:vi.fn().mockResolvedValue(undefined)};
    vi.stubGlobal('caches',{open:vi.fn().mockResolvedValue(cache)});
    const fetch=vi.fn().mockResolvedValue(new Response(JSON.stringify({x:{full_name:'Receiver',position:'WR',team:'DET',injury_status:'Out'}})));
    vi.stubGlobal('fetch',fetch);
    return {cache,fetch,...await import('./sleeper.js')};
  };
  it('refreshes daily-cached injury data for a live view, sharing one bounded in-flight read',async()=>{
    const cached=new Response(JSON.stringify({x:{n:'Receiver',p:'WR',t:'DET',i:'Questionable'}}),{headers:{'x-fetched-at':String(Date.parse('2026-10-11T15:30:00Z'))}});
    const {loadPlayers,fetch,cache}=await setup(cached);
    const first=loadPlayers({maxAgeMs:300000}),second=loadPlayers({maxAgeMs:300000});
    expect(first).toBe(second);expect((await first).x.i).toBe('Out');
    expect(fetch).toHaveBeenCalledOnce();expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);expect(cache.put).toHaveBeenCalledOnce();
    await loadPlayers({maxAgeMs:300000});expect(fetch).toHaveBeenCalledOnce();
  });
  it('expires memory-cached availability after five minutes while ordinary directory reads keep their daily cache',async()=>{
    const {loadPlayers,fetch,cache}=await setup();await loadPlayers();
    await vi.advanceTimersByTimeAsync(300001);await loadPlayers();expect(fetch).toHaveBeenCalledOnce();
    cache.match.mockResolvedValue(null);fetch.mockResolvedValue(new Response(JSON.stringify({x:{full_name:'Receiver',injury_status:null}})));
    expect((await loadPlayers({maxAgeMs:300000})).x.i).toBeNull();expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('allows retry after a failed availability read',async()=>{
    const {loadPlayers,fetch}=await setup();fetch.mockRejectedValueOnce(Error('Offline'));
    await expect(loadPlayers({maxAgeMs:300000})).rejects.toThrow('Offline');
    expect((await loadPlayers({maxAgeMs:300000})).x.i).toBe('Out');expect(fetch).toHaveBeenCalledTimes(2);
  });
});
