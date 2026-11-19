import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {forceUpdate} from './update.js';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const boot=html.slice(html.indexOf('<script>',html.indexOf('id="splash"'))+8,html.indexOf('</script>',html.indexOf('id="splash"')));
const version=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
function launch(marker,{blocked=false,off=false}={}){
 const classes=new Set(),nodes=new Map(),events=new Map(),timers=[],store=new Map(),styles=new Map();
 if(marker)store.set('dfl.update.reboot',JSON.stringify(marker));
 const storage={getItem:key=>{if(blocked)throw Error('blocked');return key.includes('gameday-motion')&&off?'off':store.get(key)||null},setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)};
 const el={parentNode:true,dataset:{},insertAdjacentHTML:vi.fn(),classList:{add:(...names)=>names.forEach(n=>classes.add(n))},setAttribute(){},getAttribute:()=>2017,style:{setProperty:(k,v)=>styles.set(k,v)},querySelector:s=>{if(!nodes.has(s))nodes.set(s,{textContent:''});return nodes.get(s)},addEventListener:(n,fn)=>events.set(n,fn),remove(){this.parentNode=false}};
 const document={baseURI:'https://example.test/dfl-hq/',hidden:false,addEventListener:(n,fn)=>events.set(n,fn),removeEventListener:n=>events.delete(n),documentElement:{dataset:{appBoot:"loading"},removeAttribute(name){if(name==='data-app-boot')delete this.dataset.appBoot}},getElementById:()=>el,querySelector:()=>({content:version})};
 const window={addEventListener:(n,fn)=>events.set(n,fn)};
 vm.runInNewContext(boot,{document,window,sessionStorage:storage,localStorage:storage,location:{search:'',hash:'#/clubhouse'},Date,URL,performance:{now:()=>0},setTimeout:(fn,ms)=>timers.push({fn,ms})});
 return {el,classes,store,styles,document,visibility:()=>events.get('visibilitychange')?.(),failed:()=>events.get('dfl:app-failed')?.({type:'dfl:app-failed'}),ready:()=>events.get('dfl:app-ready')?.({type:'dfl:app-ready'}),advance:ms=>{for(const timer of timers.filter(t=>t.ms<=ms))timer.fn();},flush:()=>{for(const timer of timers.splice(0).sort((a,b)=>a.ms-b.ms))timer.fn();}};
}
afterEach(()=>vi.unstubAllGlobals());
describe('reboot handoff',()=>{
 it('keeps soft opening and round-logo content and completes on actual readiness',()=>{
  const f=launch(null);
  expect(f.classes.has('has-soft-halo')).toBe(true);
  expect(f.el.insertAdjacentHTML).not.toHaveBeenCalled();
  expect(f.el.innerHTML).toBeUndefined();
  expect(f.styles.has('--update-gate-artwork')).toBe(false);
  expect(f.classes.has('is-system-ready')).toBe(false);
  f.ready();f.flush();expect(f.classes.has('is-system-ready')).toBe(true);
 });
 it('does not announce readiness on a slow-route fallback',()=>{
  const f=launch(null);f.flush();expect(f.classes.has('is-system-ready')).toBe(false);
 });
 it('consumes the current release marker once and waits for a real route paint',()=>{
  const f=launch({at:Date.now(),startedAt:Date.now()-1800,version});
  expect(f.classes.has('is-rebooting')).toBe(true);
  expect(f.store.has('dfl.update.reboot')).toBe(false);
  expect(f.classes.has('is-system-ready')).toBe(false);
  expect(f.styles.has('--stadium-wave-offset')).toBe(false);
  f.document.hidden=true;f.visibility();expect(f.el.dataset.updateHidden).toBe('true');
  f.document.hidden=false;f.visibility();expect(f.el.dataset.updateHidden).toBe('false');
  f.ready();f.flush();
  expect(f.classes.has('is-system-ready')).toBe(true);
  expect(f.document.documentElement.dataset.appBoot).toBeUndefined();
  expect(f.el.querySelector('.update-gate__status').textContent).toBe('SYSTEM READY');
 });
 it('keeps the update plate across a slow route, with recovery instead of old chrome',()=>{
  const f=launch({at:Date.now(),version});f.advance(1600);
  expect(f.el.parentNode).toBe(true);expect(f.classes.has('is-ready')).toBe(false);
  expect(f.document.documentElement.dataset.appBoot).toBe('loading');
  f.flush();expect(f.el.querySelector('.update-gate__button').outerHTML).toContain('RETRY UPDATE');
  expect(f.classes.has('is-system-ready')).toBe(false);
  expect(f.el.querySelector('.update-gate__status').textContent).not.toBe('SYSTEM READY');
 });
 it('reveals an actual connection failure without claiming that the app is ready',()=>{
  const f=launch({at:Date.now(),version});f.failed();f.flush();
  expect(f.classes.has('is-ready')).toBe(true);expect(f.classes.has('is-system-ready')).toBe(false);
  expect(f.document.documentElement.dataset.appBoot).toBe('loading');
 });
 it.each([{at:Date.now()-100000,version},{at:Date.now()+100000,version},{at:Date.now(),version:'0.0.1'}])('ignores an expired, future or mismatched marker: %j',marker=>{
  const f=launch(marker);expect(f.classes.has('is-rebooting')).toBe(false);expect(f.store.has('dfl.update.reboot')).toBe(false);
 });
 it('opens normally with blocked storage and respects an early motion-off preference',()=>{
  expect(()=>launch(null,{blocked:true})).not.toThrow();
  expect(launch(null,{off:true}).document.documentElement.dataset.uiMotion).toBe('off');
 });
 it('does not delay the refresh for animation and keeps the current route',async()=>{
  const calls=[];
  vi.stubGlobal('document',{documentElement:{dataset:{dflBundle:version}},querySelector:()=>null,getElementById:()=>({dataset:{version}})});
  vi.stubGlobal('localStorage',{getItem:()=>null});
  vi.stubGlobal('sessionStorage',{setItem:(key,value)=>calls.push([key,JSON.parse(value)])});
  vi.stubGlobal('performance',{getEntriesByType:()=>[]});vi.stubGlobal('navigator',{});
  const replace=vi.fn();vi.stubGlobal('location',{href:'https://example.test/dfl-hq/#/clubhouse',origin:'https://example.test',pathname:'/dfl-hq/',hash:'#/clubhouse',replace});
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true})));
  await expect(forceUpdate()).resolves.toBe(true);
  expect(calls[0][0]).toBe('dfl.update.reboot');expect(calls[0][1].version).toBe(version);
  expect(replace).toHaveBeenCalledWith(expect.stringMatching(/^\/dfl-hq\/\?u=\d+#\/clubhouse$/));
 });
});
