import {beforeEach,it,expect,vi} from 'vitest';
const state=vi.hoisted(()=>({member:1,rpc:vi.fn(),unlocked:vi.fn()}));
vi.mock('./supabase.js',()=>({db:()=>({rpc:state.rpc})}));
vi.mock('./members.js',()=>({getMemberId:()=>state.member}));
vi.mock('./member-lock.js',()=>({verifiedPin:()=>null,markMemberUnlocked:state.unlocked}));
import {tradeIntentionsApi} from './trade-intentions-data.js';
beforeEach(()=>{state.member=1;state.rpc.mockReset();state.unlocked.mockReset();});
const input={season:2026,leagueId:'league',revision:1,players:{a:'available'},needs:['WR']};
it('rejects writes from an absent or changed selected member',async()=>{
 await expect(tradeIntentionsApi(null).save(input)).rejects.toThrow('selected member');
 state.member=2;await expect(tradeIntentionsApi({id:1}).save(input)).rejects.toThrow('selected member');expect(state.rpc).not.toHaveBeenCalled();
});
it('does not accept a successful late save after member switching',async()=>{
 state.rpc.mockImplementation(async()=>{state.member=2;return {data:{revision:2},error:null};});
 await expect(tradeIntentionsApi({id:1}).save(input)).rejects.toThrow('selected member');
});
it('requires an array for league reads and surfaces service failures',async()=>{
 const api=tradeIntentionsApi({id:1});state.rpc.mockResolvedValue({data:null,error:null});await expect(api.list()).rejects.toThrow('Intentions unavailable');
 state.rpc.mockResolvedValue({data:[],error:null});await expect(api.list()).resolves.toEqual([]);
 state.rpc.mockResolvedValue({error:Error('Offline')});await expect(api.list()).rejects.toThrow('Offline');
});
it('uses verified PIN only after successful unlock, without saving it to preferences',async()=>{
 const api=tradeIntentionsApi({id:1});state.rpc.mockResolvedValueOnce({data:false,error:null});await expect(api.unlock('0000')).rejects.toThrow('Wrong');expect(state.unlocked).not.toHaveBeenCalled();
 state.rpc.mockResolvedValueOnce({data:true,error:null});await api.unlock('1234');expect(state.unlocked).toHaveBeenCalledWith(1,'1234');
 state.rpc.mockResolvedValueOnce({data:{revision:2},error:null});await api.save(input);
 expect(state.rpc).toHaveBeenLastCalledWith('trade_intentions_save',{p_season:2026,p_league:'league',p_revision:1,p_players:{a:'available'},p_needs:['WR'],p_pin:'1234'});
});
