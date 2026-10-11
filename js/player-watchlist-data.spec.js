import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
const mocks=vi.hoisted(()=>({rpc:vi.fn(),member:'1'}));
vi.mock('./supabase.js',()=>({db:()=>({rpc:mocks.rpc})}));
vi.mock('./members.js',()=>({getMemberId:()=>mocks.member}));
import {readPlayerWatchlist} from './player-watchlist-data.js';
let saved;
beforeEach(()=>{saved=new Map();mocks.member='1';vi.clearAllMocks();vi.stubGlobal('localStorage',{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)});vi.stubGlobal('dispatchEvent',vi.fn());vi.stubGlobal('CustomEvent',class{constructor(type,options){this.type=type;this.detail=options.detail}});mocks.rpc.mockResolvedValue({data:[],error:null})});
afterEach(()=>vi.unstubAllGlobals());
describe('watchlist device capabilities',()=>{
 it('creates a random capability and reuses it only for that selected member',async()=>{await readPlayerWatchlist();const first=mocks.rpc.mock.calls[0][1];expect(first.secret).toMatch(/^[a-f0-9]{64}$/);await readPlayerWatchlist();expect(mocks.rpc.mock.calls[1][1].secret).toBe(first.secret);mocks.member='2';await readPlayerWatchlist();expect(mocks.rpc.mock.calls[2][1].secret).not.toBe(first.secret)});
 it('requires a selected member and never uses the notification token',async()=>{mocks.member='';await expect(readPlayerWatchlist()).rejects.toThrow('Choose');expect(mocks.rpc).not.toHaveBeenCalled();mocks.member='1';await readPlayerWatchlist();expect([...saved.keys()]).toEqual(['dfl.player-watchlist.1'])});
 it('does not send a stale member mutation or expose a late previous-member result',async()=>{mocks.member='2';await expect(readPlayerWatchlist({memberId:'1',action:'add',player:'p'})).rejects.toThrow('changed');expect(mocks.rpc).not.toHaveBeenCalled();mocks.member='1';mocks.rpc.mockImplementation(async()=>{mocks.member='2';return {data:[{player_id:'p'}],error:null}});await expect(readPlayerWatchlist()).rejects.toThrow('changed')});
 it('announces successful changes but not reads or failures',async()=>{await readPlayerWatchlist();expect(dispatchEvent).not.toHaveBeenCalled();await readPlayerWatchlist({action:'add',player:'p'});expect(dispatchEvent).toHaveBeenCalledOnce();mocks.rpc.mockResolvedValue({data:null,error:{message:'Unavailable'}});await expect(readPlayerWatchlist({action:'remove',player:'p'})).rejects.toThrow('Unavailable');expect(dispatchEvent).toHaveBeenCalledOnce()});
 it('rejects malformed stored credentials and non-array responses',async()=>{saved.set('dfl.player-watchlist.1',JSON.stringify({secret:'bad',device:'bad'}));await expect(readPlayerWatchlist()).rejects.toThrow('key unavailable');expect(mocks.rpc).not.toHaveBeenCalled();saved.clear();mocks.rpc.mockResolvedValue({data:null,error:null});await expect(readPlayerWatchlist()).rejects.toThrow('unavailable')});
});
