import {afterEach,describe,expect,it,vi} from 'vitest';
import {mountLiveScoreRefresh} from './live-score-refresh.js';

describe('live score catch-up',()=>{
  let loop;
  afterEach(()=>{loop?.stop();vi.useRealTimers()});
  const setup=(options={})=>{
    vi.useFakeTimers();
    const doc=new EventTarget(),win=new EventTarget();
    doc.visibilityState='visible';win.navigator={onLine:true};
    const refresh=vi.fn().mockResolvedValue(undefined),onOffline=vi.fn();
    loop=mountLiveScoreRefresh({doc,win,refresh,onOffline,...options});
    return {doc,win,refresh,onOffline};
  };
  it('refreshes immediately on return, coalesces reconnect signals, and resumes polling',async()=>{
    const {doc,win,refresh}=setup();loop.start();await vi.advanceTimersByTimeAsync(0);
    expect(refresh.mock.calls).toEqual([[false]]);
    doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(120000);expect(refresh).toHaveBeenCalledTimes(1);
    doc.visibilityState='visible';doc.dispatchEvent(new Event('visibilitychange'));win.dispatchEvent(new Event('online'));
    await vi.advanceTimersByTimeAsync(80);expect(refresh.mock.calls).toEqual([[false],[true]]);
    await vi.advanceTimersByTimeAsync(60000);expect(refresh.mock.calls[2]).toEqual([false]);
  });
  it('retains offline state and fetches when connectivity returns',async()=>{
    const {win,refresh,onOffline}=setup();win.navigator.onLine=false;loop.start();
    await vi.advanceTimersByTimeAsync(60000);expect(refresh).not.toHaveBeenCalled();expect(onOffline).toHaveBeenCalledOnce();
    win.navigator.onLine=true;win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);
    expect(refresh).toHaveBeenCalledWith(true);
  });
  it('queues one forced catch-up behind a pending read without overlapping requests',async()=>{
    let release;const refresh=vi.fn().mockImplementationOnce(()=>new Promise(resolve=>{release=resolve})).mockResolvedValue(undefined);
    const {win}=setup({refresh});loop.start();win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);
    win.dispatchEvent(new Event('online'));await vi.advanceTimersByTimeAsync(80);
    expect(refresh).toHaveBeenCalledOnce();release();await vi.advanceTimersByTimeAsync(80);
    expect(refresh.mock.calls).toEqual([[false],[true]]);
  });
  it('does not refresh a disabled panel, catches up when it opens, and handles bfcache restoration',async()=>{
    let enabled=false;const {win,refresh}=setup({enabled:()=>enabled});loop.start();await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(60000);expect(refresh).toHaveBeenCalledOnce();
    enabled=true;loop.wake();await vi.advanceTimersByTimeAsync(80);expect(refresh.mock.calls[1]).toEqual([true]);
    const event=new Event('pageshow');event.persisted=true;win.dispatchEvent(event);await vi.advanceTimersByTimeAsync(80);
    expect(refresh).toHaveBeenCalledTimes(3);
  });
  it('cleans up queued work and listeners when a route closes',async()=>{
    let release;const refresh=vi.fn(()=>new Promise(resolve=>{release=resolve}));
    const {win,doc}=setup({refresh});loop.start();loop.wake();await vi.advanceTimersByTimeAsync(80);loop.stop();release();
    win.dispatchEvent(new Event('online'));doc.dispatchEvent(new Event('visibilitychange'));await vi.advanceTimersByTimeAsync(120000);
    expect(refresh).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
  });
  it('recovers polling after a rejected read and never requests an inactive route',async()=>{
    const refresh=vi.fn().mockRejectedValueOnce(Error('Offline')).mockResolvedValue(undefined),onError=vi.fn();let active=true;
    setup({refresh,onError,active:()=>active});loop.start();await vi.advanceTimersByTimeAsync(60000);
    expect(onError).toHaveBeenCalledOnce();expect(refresh).toHaveBeenCalledTimes(2);
    active=false;loop.wake();await vi.advanceTimersByTimeAsync(120000);expect(refresh).toHaveBeenCalledTimes(2);
  });
});
