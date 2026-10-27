import {describe,it,expect,vi} from 'vitest';
import {runTradeWatch} from '../supabase/functions/trade-watch/handler.ts';
const now=Date.parse('2026-10-27T18:00:00Z');
const trade={transaction_id:'deal-1',type:'trade',status:'complete',roster_ids:[1,2],adds:{a:2,b:1},drops:{a:1,b:2},created:now-60000};
function fixture({saved=[],rows=[trade],enabled=true,claim=true}={}){
 const writes=[],config={sleeper_league_id:'league',auto_sync_enabled:enabled};
 const admin={from:table=>({select:()=>({eq:()=>({single:async()=>({data:config,error:null})}),in:async()=>({data:saved,error:null})}),update:patch=>{
  writes.push(patch);const q={eq:()=>q,or:()=>q,select:async()=>({data:claim?[{id:1}]:[],error:null}),then:(a,b)=>Promise.resolve({error:null}).then(a,b)};return q;
 }})};
 const sleeper=vi.fn(async path=>path==='/state/nfl'?{season:'2026',week:8}:path==='/league/league'?{season:'2026',settings:{leg:8},total_rosters:2}:path.endsWith('/transactions/7')?[]:path.endsWith('/transactions/8')?rows:path.endsWith('/users')?[{user_id:'a'},{user_id:'b'}]:path.endsWith('/rosters')?[{roster_id:1,players:['b']},{roster_id:2,players:['a']}]:null);
 const capture=vi.fn(async()=>({created:1,notified:1}));
 return {admin,sleeper,capture,writes,now};
}
describe('independent Sleeper trade watch',()=>{
 it('detects a completed trade between games without a full sync',async()=>{
  const f=fixture();expect(await runTradeWatch(f)).toMatchObject({ok:true,week:8,tradeAlerts:{created:1,notified:1}});
  expect(f.capture).toHaveBeenCalledWith(expect.objectContaining({transactions:[trade],transactionWeeks:{'deal-1':8},season:2026,week:8}));
  expect(f.sleeper.mock.calls.every(([path])=>!path.includes('matchups')&&!path.includes('projections'))).toBe(true);
  expect(f.writes.at(-1)).toMatchObject({last_trade_watch_checked_at:new Date(now).toISOString(),last_trade_watch_error:''});
 });
 it('avoids roster, analyzer and notification work for already delivered trades',async()=>{
  const f=fixture({saved:[{sleeper_transaction_id:'deal-1',breaking_active:true,notification_message_id:12}]});
  expect(await runTradeWatch(f)).toMatchObject({tradeAlerts:{created:0,notified:0}});expect(f.capture).not.toHaveBeenCalled();expect(f.sleeper.mock.calls.some(([path])=>/rosters|users/.test(path))).toBe(false);
 });
 it('retries a receipt whose phone notification has not succeeded',async()=>{
  const f=fixture({saved:[{sleeper_transaction_id:'deal-1',breaking_active:true,notification_message_id:null}]});await runTradeWatch(f);expect(f.capture).toHaveBeenCalledOnce();
 });
 it('never treats a pending transaction as a completed trade',async()=>{
  const f=fixture({rows:[{...trade,status:'pending'}]});expect(await runTradeWatch(f)).toMatchObject({completedTrades:0});expect(f.capture).not.toHaveBeenCalled();
 });
 it('covers the previous week at rollover and deduplicates overlapping provider rows',async()=>{
  const f=fixture(),load=f.sleeper.getMockImplementation();f.sleeper.mockImplementation(path=>path.endsWith('/transactions/7')?Promise.resolve([{...trade,transaction_id:'older'},trade]):load(path));await runTradeWatch(f);
  expect(f.capture.mock.calls[0][0]).toMatchObject({transactionWeeks:{older:7,'deal-1':8}});expect(f.capture.mock.calls[0][0].transactions).toHaveLength(2);
 });
 it('dry run is strictly read-only, including no lock, receipt or push',async()=>{
  const f=fixture();expect(await runTradeWatch({...f,dryRun:true})).toMatchObject({dryRun:true,workPending:true,weeks:[7,8]});expect(f.writes).toEqual([]);expect(f.capture).not.toHaveBeenCalled();
 });
 it('respects the existing automatic-sync switch and overlapping run claim',async()=>{
  const off=fixture({enabled:false});expect(await runTradeWatch(off)).toMatchObject({skipped:'disabled'});expect(off.sleeper).not.toHaveBeenCalled();
  const busy=fixture({claim:false});expect(await runTradeWatch(busy)).toMatchObject({skipped:'cadence'});expect(busy.sleeper).not.toHaveBeenCalled();
 });
 it('fails closed on partial transactions, retains the failure and permits a later retry',async()=>{
  const f=fixture({rows:null});await expect(runTradeWatch(f)).rejects.toThrow('Incomplete Sleeper transactions');expect(f.capture).not.toHaveBeenCalled();expect(f.writes.at(-1).last_trade_watch_error).toContain('Incomplete');
 });
 it('rejects old-season and incomplete ownership before creating receipts',async()=>{
  for(const scenario of ['old','roster']){const f=fixture(),load=f.sleeper.getMockImplementation();f.sleeper.mockImplementation(path=>path==='/league/league'&&scenario==='old'?Promise.resolve({season:'2025'}):path.endsWith('/rosters')?Promise.resolve([]):load(path));await expect(runTradeWatch(f)).rejects.toThrow();expect(f.capture).not.toHaveBeenCalled()}
 });
});
