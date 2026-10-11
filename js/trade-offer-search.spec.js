import {afterEach,describe,it,expect,vi} from 'vitest';
import {createTradeOfferSearch} from './trade-offer-search.js';
afterEach(()=>vi.useRealTimers());
function setup(options={}) {
  const workers=[];
  const makeWorker=()=>{const worker={postMessage:vi.fn(),terminate:vi.fn()};workers.push(worker);return worker;};
  return {workers,search:createTradeOfferSearch({teams:[{id:'1'}],pool:new Map()}, {makeWorker,...options})};
}
describe('background trade searches',()=>{
  it('uploads the snapshot once and reuses a settled worker without changing results',async()=>{
    const {workers,search}=setup(),first=search.run({intent:'fair'}),worker=workers[0];
    expect(worker.postMessage.mock.calls.map(([m])=>m.type)).toEqual(['init','search']);
    worker.onmessage({data:{id:1,offers:[{tier:'fair',sendA:['p']}]}});await expect(first).resolves.toEqual([{tier:'fair',sendA:['p']}]);
    const second=search.run({intent:'steal'});expect(workers).toHaveLength(1);expect(worker.postMessage.mock.calls.map(([m])=>m.type)).toEqual(['init','search','search']);
    worker.onmessage({data:{id:2,offers:[]}});await expect(second).resolves.toEqual([]);search.stop();
  });
  it('terminates outdated computations and ignores their late responses',async()=>{
    const {workers,search}=setup(),first=search.run({partnerId:'2'}),cancelled=expect(first).rejects.toMatchObject({name:'AbortError'});
    const second=search.run({partnerId:'3'});await cancelled;expect(workers[0].terminate).toHaveBeenCalledOnce();
    let settled=false;second.then(()=>{settled=true});workers[0].onmessage({data:{id:1,offers:[{wrong:true}]}});await Promise.resolve();expect(settled).toBe(false);
    workers[1].onmessage({data:{id:2,offers:[{correct:true}]}});await expect(second).resolves.toEqual([{correct:true}]);search.stop();
  });
  it('allows retry after worker failure without falling back to a blocking calculation',async()=>{
    const {workers,search}=setup(),first=search.run({});workers[0].onerror();await expect(first).rejects.toThrow('Try again');
    const next=search.run({});expect(workers).toHaveLength(2);workers[1].onmessage({data:{id:2,offers:[]}});await next;search.stop();
  });
  it('cleans up timed-out and disposed workers and cannot be restarted after disposal',async()=>{
    vi.useFakeTimers();const {workers,search}=setup({timeoutMs:100}),first=search.run({}),timeout=expect(first).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(100);await timeout;expect(workers[0].terminate).toHaveBeenCalledOnce();
    const next=search.run({}),cancelled=expect(next).rejects.toMatchObject({name:'AbortError'});search.stop();await cancelled;
    expect(workers[1].terminate).toHaveBeenCalledOnce();await expect(search.run({})).rejects.toMatchObject({name:'AbortError'});expect(vi.getTimerCount()).toBe(0);
  });
});
