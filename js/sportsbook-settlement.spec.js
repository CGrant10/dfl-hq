import {describe,it,expect,vi} from 'vitest';
import {createSettlementTracker,loadBookAccount,loadBookWallet} from './sportsbook-settlement.js';
const storage=()=>{const rows=new Map();return{getItem:key=>rows.get(key),setItem:(key,value)=>rows.set(key,value)}};
const bet=(id,status)=>({id,status});
describe('live settlement feedback',()=>{
 it('accepts a real zero balance and rejects an incomplete wallet before rendering a book',async()=>{
  const wallet={balance:0,claimable:0,claimable_days:0},client={rpc:vi.fn().mockResolvedValue({data:[wallet]})};expect(await loadBookWallet(client)).toBe(wallet);
  for(const data of [null,[],[null],[{balance:0}],[{...wallet,balance:'500'}]]){client.rpc.mockResolvedValue({data});await expect(loadBookWallet(client)).rejects.toThrow('bankroll could not be loaded')}
  client.rpc.mockResolvedValue({error:Error('offline')});await expect(loadBookWallet(client)).rejects.toThrow('offline');
 });
 it('keeps historical and first-seen results quiet',()=>{const track=createSettlementTracker([bet(1,'won')],storage(),1);expect(track([bet(1,'won'),bet(2,'won')])).toEqual([])});
 it('reports observed results once, including simultaneous wins and voids',()=>{const track=createSettlementTracker([bet(1,'open'),bet(2,'open'),bet(3,'open')],storage(),1);const settled=[bet(1,'won'),bet(2,'lost'),bet(3,'void')];expect(track(settled)).toEqual(settled);expect(track(settled)).toEqual([]);track([bet(1,'open')]);expect(track([bet(1,'won')])).toEqual([])});
 it('does not replay after reload and keeps members separate',()=>{const s=storage();createSettlementTracker([bet(1,'open')],s,1)([bet(1,'won')]);expect(createSettlementTracker([bet(1,'open')],s,1)([bet(1,'won')])).toEqual([]);expect(createSettlementTracker([bet(1,'open')],s,2)([bet(1,'won')])).toHaveLength(1)});
 it('still deduplicates when device storage is unavailable',()=>{const s={getItem(){throw Error()},setItem(){throw Error()}},track=createSettlementTracker([bet(1,'open')],s,1);expect(track([bet(1,'won')])).toHaveLength(1);expect(track([bet(1,'won')])).toEqual([])});
 it('accepts only a complete snapshot for the selected member',async()=>{const account={member_id:1,balance:200,bets:[],ledger:[]},client={rpc:vi.fn().mockResolvedValue({data:account})};expect(await loadBookAccount(client,1)).toBe(account);expect(client.rpc).toHaveBeenCalledWith('sportsbook_my_live_account');await expect(loadBookAccount(client,2)).rejects.toThrow('profile changed');for(const data of [null,{...account,balance:'200'},{...account,bets:null},{...account,ledger:null}]){client.rpc.mockResolvedValue({data});await expect(loadBookAccount(client,1)).rejects.toThrow('unavailable')}client.rpc.mockResolvedValue({error:Error('offline')});await expect(loadBookAccount(client,1)).rejects.toThrow('offline')});
});
