import {beforeEach,describe,expect,it,vi} from 'vitest';
import {contrast} from './team-theme.js';
const state=vi.hoisted(()=>{
 const storage=new Map(),tokens=new Map(),attrs=new Map();
 const watch={matches:false,addEventListener:vi.fn()};
 globalThis.window={matchMedia:()=>watch};
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const el={style:{setProperty:(k,v)=>tokens.set(k,v)},setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 globalThis.document={documentElement:el,body:el,querySelector:()=>null};
 return {storage,tokens,attrs,watch,remote:null,member:null};
});
vi.mock('./members.js',()=>({currentMember:()=>state.member}));
vi.mock('./supabase.js',()=>({db:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{theme_mode:state.remote}})})})}),rpc:vi.fn(async()=>({}))})}));
import {activeMode,applyTheme,modeOptions,normalizeMode,pinMode,savedMode,saveMode,syncThemeFromMember} from './theme.js';
beforeEach(()=>{state.storage.clear();state.tokens.clear();state.watch.matches=false;state.member=null;state.remote=null;pinMode();});
describe('canonical theme preferences',()=>{
 it('offers each base palette once',()=>{
  expect(modeOptions().map(o=>o.id)).toEqual(['system','dark','light','fairway']);
  expect(savedMode()).toBe('dark');
 });
 it.each([['medicine','dark'],['medicine-light','light']])('keeps a locally saved %s appearance as %s',(old,mode)=>{
  localStorage.setItem('dfl.mode',old);applyTheme();
  expect(savedMode()).toBe(mode);expect(activeMode()).toBe(mode);expect(localStorage.getItem('dfl.mode')).toBe(mode);
  expect(state.attrs.get('data-mode')).toBe(mode);
 });
 it.each([['medicine','dark'],['medicine-light','light']])('accepts a synced legacy %s choice without restoring a duplicate',(old,mode)=>{
  state.member={id:'fixture'};state.remote=old;
  return syncThemeFromMember().then(()=>{expect(savedMode()).toBe(mode);expect(state.attrs.get('data-palette')).toBe(mode);});
 });
 it('follows the phone and restores the chosen palette after a pinned page',()=>{
  saveMode('system');expect(activeMode()).toBe('light');state.watch.matches=true;applyTheme();expect(activeMode()).toBe('dark');
  pinMode('fairway');expect(activeMode()).toBe('fairway');expect(savedMode()).toBe('system');pinMode();expect(activeMode()).toBe('dark');
 });
 it('keeps club themes and rejects unknown preferences',()=>{
  expect(normalizeMode('team:KC')).toBe('team:KC');expect(normalizeMode('team:invalid')).toBeNull();expect(normalizeMode('invalid')).toBeNull();
 });
});
describe('Medicine Wheel theme colors',()=>{
 it.each(['dark','light'])('%s uses Medicine fills and readable text on every base surface',mode=>{
  saveMode(mode);
  expect(state.tokens.get('--accent-fill')).toBe('#C8102E');
  expect(state.tokens.get('--accent-2-fill')).toBe(mode==='dark'?'#EFC94C':'#8A5A00');
  for(const ink of ['--text','--muted','--body-text','--accent','--accent-2']){
   for(const surface of ['--bg','--bg-2','--bg-3','--hover']){
    expect(contrast(state.tokens.get(ink),state.tokens.get(surface)),`${mode} ${ink} on ${surface}`).toBeGreaterThanOrEqual(4.5);
   }
  }
  expect(contrast(state.tokens.get('--on-accent'),state.tokens.get('--accent-fill'))).toBeGreaterThanOrEqual(4.5);
  expect(state.tokens.get('color-scheme')).toBe(mode);
 });
});
