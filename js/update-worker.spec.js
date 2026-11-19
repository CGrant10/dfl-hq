import {afterEach,describe,expect,it,vi} from 'vitest';
import {activateUpdate,forceUpdate} from './update.js';
function fixture({release='1.0.0',update=vi.fn(async()=>{})}={}){
 const target='2.0.0',events=new EventTarget();
 const worker=value=>({postMessage:vi.fn((_data,ports)=>queueMicrotask(()=>ports[0].peer.onmessage?.({data:{release:value}})))});
 class Channel{constructor(){this.port1={onmessage:null,close:vi.fn()};this.port2={peer:this.port1,close:vi.fn()};}}
 const registration={update},workers={controller:worker(release),getRegistration:vi.fn(async()=>registration),addEventListener:vi.fn((...args)=>events.addEventListener(...args)),removeEventListener:vi.fn((...args)=>events.removeEventListener(...args))};
 vi.stubGlobal('MessageChannel',Channel);vi.stubGlobal('navigator',{serviceWorker:workers});
 vi.stubGlobal('document',{getElementById:()=>({dataset:{version:target}}),querySelector:()=>null});
 vi.stubGlobal('localStorage',{getItem:()=>null});const storage={setItem:vi.fn()};vi.stubGlobal('sessionStorage',storage);
 const location={pathname:'/dfl-hq/',hash:'#/sportsbook?product=pickem',replace:vi.fn()};vi.stubGlobal('location',location);
 const fetch=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',fetch);
 return{workers,update,target,location,storage,fetch,activate(value=target){workers.controller=worker(value);events.dispatchEvent(new Event('controllerchange'))}};
}
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()});
describe('update installation handoff',()=>{
 it('does no duplicate old-app downloads and reloads only after the target worker takes control',async()=>{
  vi.useFakeTimers();const f=fixture(),pending=forceUpdate();
  await vi.advanceTimersByTimeAsync(6500);
  expect(f.update).toHaveBeenCalledTimes(1);expect(f.fetch).not.toHaveBeenCalled();expect(f.location.replace).not.toHaveBeenCalled();
  f.activate();await expect(pending).resolves.toBe(true);
  expect(f.location.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/dfl-hq\/\?u=\d+#\/sportsbook\?product=pickem$/));
  expect(JSON.parse(f.storage.setItem.mock.calls[0][1]).version).toBe(f.target);
  expect(f.workers.removeEventListener).toHaveBeenCalled();
 });
 it('skips another update check when the requested worker is already active',async()=>{
  const f=fixture({release:'2.0.0'});await activateUpdate(f.target);expect(f.update).not.toHaveBeenCalled();
 });
 it('does not mistake an intermediate worker for the requested release',async()=>{
  vi.useFakeTimers();const f=fixture(),pending=forceUpdate();await vi.advanceTimersByTimeAsync(10);
  f.activate('1.5.0');await vi.advanceTimersByTimeAsync(10);expect(f.location.replace).not.toHaveBeenCalled();
  f.activate();await pending;expect(f.location.replace).toHaveBeenCalledTimes(1);
 });
 it('keeps the current update gate and draft data on an offline update failure',async()=>{
  const f=fixture({update:vi.fn(async()=>{throw Error('Offline')})});
  await expect(forceUpdate()).rejects.toThrow('Offline');expect(f.location.replace).not.toHaveBeenCalled();expect(f.storage.setItem).not.toHaveBeenCalled();
 });
 it('bounds stalled installation and detaches its listener without reloading old code',async()=>{
  vi.useFakeTimers();const f=fixture({update:vi.fn(()=>new Promise(()=>{}))});
  const failed=expect(activateUpdate(f.target,{timeoutMs:1000})).rejects.toThrow('did not finish');
  await vi.advanceTimersByTimeAsync(1100);await failed;expect(f.location.replace).not.toHaveBeenCalled();expect(f.workers.removeEventListener).toHaveBeenCalled();
 });
 it('lets an unmanaged browser use fresh document navigation without waiting forever for ready',async()=>{
  const f=fixture();f.workers.getRegistration.mockResolvedValue(null);await forceUpdate();expect(f.location.replace).toHaveBeenCalledTimes(1);expect(f.update).not.toHaveBeenCalled();
 });
});
