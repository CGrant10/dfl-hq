import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const wire=vi.hoisted(()=>({response:null,reads:0}));
vi.mock('./supabase.js',()=>({db:()=>({from:()=>{wire.reads++;const q={select:()=>q,eq:()=>q,maybeSingle:()=>q,abortSignal:async()=>wire.response};return q}})}));
import {loadCompactPlayers} from './player-directory-data.js';
const payload=()=>Object.fromEntries(Array.from({length:1000},(_,i)=>[String(i+1),{n:'Player '+i,p:['QB','RB','WR','TE','K'][i%5],fp:[],t:'BUF'}]));
beforeEach(()=>{wire.reads=0;wire.response={data:{players:payload(),fetched_at:new Date(Date.now()-30000).toISOString()},error:null}});
afterEach(()=>vi.restoreAllMocks());
it('uses the compact source without resetting the provider freshness timestamp',async()=>{
 const data=await loadCompactPlayers(300000);expect(data.players['1'].n).toBe('Player 0');expect(data.fetchedAt).toBe(Date.parse(wire.response.data.fetched_at));
});
it('bypasses the compact source for an explicit force refresh',async()=>{expect(await loadCompactPlayers(0)).toBeNull();expect(wire.reads).toBe(0)});
it('falls back when missing, stale, future, malformed or unavailable',async()=>{
 for(const response of [{data:null,error:null},{data:{...wire.response.data,fetched_at:new Date(Date.now()-301000).toISOString()}},{data:{...wire.response.data,fetched_at:new Date(Date.now()+10000).toISOString()}},{data:{...wire.response.data,players:{}}},{error:{message:'Unavailable'}}]){wire.response=response;expect(await loadCompactPlayers(300000)).toBeNull()}
});
