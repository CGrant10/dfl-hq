import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({users:vi.fn(),rows:[{id:1,sleeper_user_id:'a',display_name:'Owner',team_name:'Old profile',active:true}]}));
vi.mock('./supabase.js',()=>({configured:true,db:()=>({from:table=>{
 const result=table==='members'?mocks.rows:table==='sleeper_leagues'?[{sleeper_league_id:'current',season:2026}]:[{season:2026,sleeper_user_id:'a',team_name:'Synced team'}];
 const b={select:()=>b,order:()=>b,limit:()=>b,then:(resolve,reject)=>Promise.resolve({data:result,error:null}).then(resolve,reject)};return b;
}})}));
vi.mock('./sleeper.js',()=>({sleeper:{users:mocks.users}}));
vi.mock('./store.js',()=>({setUsername:vi.fn()}));
import {loadMemberDirectory,clearMemberDirectoryCache,currentMember,selectMember} from './members.js';
beforeEach(()=>{clearMemberDirectoryCache();mocks.users.mockReset();mocks.users.mockResolvedValue([{user_id:'a',metadata:{team_name:'Current team '}}]);vi.stubGlobal('localStorage',{setItem:vi.fn(),getItem:vi.fn()});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('shared current-name directory',()=>{
 it('shares a cold request and refreshes a rename after one minute',async()=>{
  vi.useFakeTimers();const [a,b]=await Promise.all([loadMemberDirectory(),loadMemberDirectory()]);expect(a).toBe(b);expect(a[0].team_name).toBe('Current team');expect(mocks.users).toHaveBeenCalledTimes(1);
  mocks.users.mockResolvedValue([{user_id:'a',metadata:{team_name:'Renamed team'}}]);expect((await loadMemberDirectory())[0].team_name).toBe('Current team');
  vi.advanceTimersByTime(60001);expect((await loadMemberDirectory())[0].team_name).toBe('Renamed team');expect(mocks.users).toHaveBeenCalledTimes(2);
 });
 it('updates the selected member when names refresh',async()=>{
  selectMember(mocks.rows[0]);await loadMemberDirectory();expect(currentMember().team_name).toBe('Current team');expect(mocks.rows[0].team_name).toBe('Old profile');
 });
 it('keeps the newest synced name on a current-feed failure',async()=>{
  mocks.users.mockRejectedValue(new Error('feed unavailable'));expect((await loadMemberDirectory())[0].team_name).toBe('Synced team');
 });
});
