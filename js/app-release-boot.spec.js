import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {afterEach,describe,it,expect,vi} from 'vitest';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const scripts=[...html.matchAll(/<script(?: type="module")?>([\s\S]*?)<\/script>/g)].map(match=>match[1]);
const guard=scripts.find(code=>code.includes('window.dflShellReady ='));
const entry=scripts.find(code=>code.includes('await import("./js/app.js")'));
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url))).version;
function fixture({release=version,reply=true,update=vi.fn(async()=>{})}={}){
 const listeners=new EventTarget(),saved=new Map(),boot=vi.fn(),button={},splash={remove:vi.fn()};
 const view={innerHTML:'',querySelector:()=>button};
 const worker=(value,respond=true)=>({postMessage(data,ports){if(respond)queueMicrotask(()=>ports[0].peer.onmessage?.({data:{release:value}}));}});
 class Channel{constructor(){this.port1={onmessage:null,close(){}};this.port2={peer:this.port1,close(){}};}}
 const serviceWorker={controller:worker(release,reply),getRegistration:async()=>({update}),
  addEventListener:(...args)=>listeners.addEventListener(...args),removeEventListener:(...args)=>listeners.removeEventListener(...args)};
 const env={window:{},navigator:{serviceWorker},document:{createElement:()=>({}),head:{append:vi.fn()},querySelector:()=>({content:version}),getElementById:id=>id==='view'?view:splash},
  localStorage:{setItem:(key,value)=>saved.set(key,value)},MessageChannel:Channel,setTimeout,clearTimeout,console,boot,
  location:{pathname:'/dfl-hq/',hash:'#/trade',replace:vi.fn()},Promise};
 runInNewContext(guard,env);
 const start=()=>runInNewContext(`(async()=>{${entry.replace('import("./js/app.js")','boot()').replace('import("./js/collapse.js")','Promise.resolve()')}})()`,env);
 return {env,saved,boot,button,view,splash,update,start,activate(){serviceWorker.controller=worker(version);listeners.dispatchEvent(new Event('controllerchange'));}};
}
afterEach(()=>vi.useRealTimers());
describe('release-coherent app startup',()=>{
 it('boots immediately with the correct controlling worker, including offline',async()=>{
  const f=fixture();await f.start();expect(f.boot).toHaveBeenCalledTimes(1);expect(f.update).not.toHaveBeenCalled();expect(f.env.document.head.append).toHaveBeenCalledWith({rel:'modulepreload',href:'js/pages/trade.js'});
 });
 it('keeps every app import paused after the older updater gives up at five seconds',async()=>{
  vi.useFakeTimers();const f=fixture({release:'1.379.0',reply:false}),started=f.start();
  await vi.advanceTimersByTimeAsync(6500);expect(f.boot).not.toHaveBeenCalled();expect(f.saved.has('dfl.shell.release')).toBe(false);
  f.activate();await started;expect(f.boot).toHaveBeenCalledTimes(1);expect(f.saved.get('dfl.shell.release')).toBe(version);
 });
 it('offers retry instead of booting mismatched assets when worker update fails',async()=>{
  vi.useFakeTimers();const f=fixture({release:'1.379.0',reply:false,update:vi.fn(async()=>{throw Error('Offline')})}),started=f.start();
  await vi.advanceTimersByTimeAsync(300);await started;
  expect(f.boot).not.toHaveBeenCalled();expect(f.view.innerHTML).toContain('Retry update');expect(f.splash.remove).toHaveBeenCalled();
  f.button.onclick();expect(f.env.location.replace).toHaveBeenCalledWith(expect.stringMatching(/^\/dfl-hq\/\?u=\d+#\/trade$/));
 });
 it('bounds a stalled worker update without loading an older app under a newer label',async()=>{
  vi.useFakeTimers();const f=fixture({release:'1.379.0',reply:false,update:vi.fn(()=>new Promise(()=>{}))}),started=f.start();
  await vi.advanceTimersByTimeAsync(31000);await started;
  expect(f.boot).not.toHaveBeenCalled();expect(f.view.innerHTML).toContain('Finish updating');
 });
});
