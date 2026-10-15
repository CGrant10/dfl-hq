import {afterEach,describe,expect,it,vi} from 'vitest';
import {mountRouteWarmup} from './performance-policy.js';
const environment=()=>({setTimeout,clearTimeout,requestIdleCallback:fn=>setTimeout(fn,0),cancelIdleCallback:clearTimeout,navigator:{connection:{effectiveType:'4g'}}});
afterEach(()=>vi.useRealTimers());
describe('route warmup yields to visible work',()=>{
 it('waits for the initial route and its Home model before downloading other pages',async()=>{
  vi.useFakeTimers();let ready=false;const warm=vi.fn(),stop=mountRouteWarmup({win:environment(),doc:{hidden:false},ready:()=>ready,warm});
  await vi.advanceTimersByTimeAsync(5000);expect(warm).not.toHaveBeenCalled();ready=true;
  await vi.advanceTimersByTimeAsync(2000);expect(warm.mock.calls.map(c=>c[0])).toEqual(['trade','clubhouse']);stop();
 });
 it('downloads one destination at a time and rechecks readiness between pages',async()=>{
  vi.useFakeTimers();let ready=true,release;const warm=vi.fn(()=>new Promise(resolve=>{release=resolve})),stop=mountRouteWarmup({win:environment(),doc:{hidden:false},ready:()=>ready,warm});
  await vi.advanceTimersByTimeAsync(1100);expect(warm).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(5000);expect(warm).toHaveBeenCalledTimes(1);
  ready=false;release();await vi.advanceTimersByTimeAsync(1000);expect(warm).toHaveBeenCalledTimes(1);ready=true;await vi.advanceTimersByTimeAsync(1000);expect(warm.mock.calls.map(c=>c[0])).toEqual(['trade','clubhouse']);stop();release();
 });
 it.each([{hidden:true},{saveData:true},{effectiveType:'3g'}])('skips background or constrained connections (%j)',async policy=>{
  vi.useFakeTimers();const win=environment();Object.assign(win.navigator.connection,policy);const warm=vi.fn();mountRouteWarmup({win,doc:{hidden:!!policy.hidden},ready:()=>true,warm});await vi.runAllTimersAsync();expect(warm).not.toHaveBeenCalled();
 });
 it('stops when the page is left, even if a download finishes later',async()=>{
  vi.useFakeTimers();let release;const warm=vi.fn(()=>new Promise(resolve=>{release=resolve})),stop=mountRouteWarmup({win:environment(),doc:{hidden:false},ready:()=>true,warm});await vi.advanceTimersByTimeAsync(1100);stop();release();await vi.runAllTimersAsync();expect(warm).toHaveBeenCalledTimes(1);
 });
 it('bounds retries when startup never completes',async()=>{
  vi.useFakeTimers();const warm=vi.fn();mountRouteWarmup({win:environment(),doc:{hidden:false},ready:()=>false,warm});await vi.runAllTimersAsync();expect(warm).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0);
 });
});
