import {describe, expect, it, vi} from 'vitest';
import {captureTradeReceipts, isRecentTrade} from './trade-alert-capture.js';
import {buildTradeAlertSnapshot} from './trade-receipt-model.js';
const now = Date.parse('2026-10-12T13:00:00Z');
const transaction = (over = {}) => ({transaction_id:'new-trade',type:'trade',status:'complete',roster_ids:[1,2],
  drops:{a:1,b:2},adds:{a:2,b:1},draft_picks:[],waiver_budget:[],created:now-3600000,...over});
const currentRosters = [{roster_id:1,players:['b']},{roster_id:2,players:['a']}];
const pool = new Map([['a',{id:'a',name:'Alpha Player',position:'WR',tradeValue:40,expectedPoints:240}],
  ['b',{id:'b',name:'Bravo Player',position:'RB',tradeValue:35,expectedPoints:230}]]);
function fixture(saved = []) {
  const rows = saved.map(row => ({...row}));
  const database = {from: table => {
    expect(table).toBe('trade_alerts');
    return {
      select: columns => ({in: (_, ids) => {
        const subset = rows.filter(row => ids.includes(row.sleeper_transaction_id));
        if(columns==='sleeper_transaction_id')return Promise.resolve({data:subset,error:null});
        return {eq: () => ({is: async () => ({data:subset.filter(row=>row.breaking_active!==false&&!row.notification_message_id),error:null})})};
      }}),
      insert: row => ({select: () => ({single: async () => {
        if(rows.some(old=>old.sleeper_transaction_id===row.sleeper_transaction_id))return {data:null,error:{code:'23505'}};
        const saved={id:rows.length+1,breaking_active:true,...row};rows.push(saved);return {data:saved,error:null};
      }})}),
    };
  }};
  const notifyTradeAlert=vi.fn(async alert=>{rows.find(row=>row.sleeper_transaction_id===alert.sleeper_transaction_id).notification_message_id=123});
  const loadAnalyzer=vi.fn(async()=>({state:'ready',teams:[{id:'1',team_name:'Alpha'},{id:'2',team_name:'Bravo'}],pool}));
  return {rows,database,notifyTradeAlert,loadAnalyzer};
}
const run=(f,over={})=>captureTradeReceipts({transactions:[transaction()],currentRosters,season:2026,week:5,now,...f,...over});

describe('manual and scheduled trade capture',()=>{
  it('retains the original transaction week during a rollover watch',async()=>{
    const f=fixture();await run(f,{week:6,transactionWeeks:{'new-trade':5}});expect(f.rows[0].week).toBe(5);
  });
  it('notifies a recent trade already recorded by the background ownership sync',async()=>{
    const f=fixture();const result=await run(f,{priorTransactions:[{sleeper_transaction_id:'new-trade',status:'complete'}]});
    expect(result).toMatchObject({created:1,backfilled:0,notified:1});
    expect(f.rows[0]).toMatchObject({breaking_active:true,notification_message_id:123});
    expect(f.rows[0].pre_trade_rosters[0].player_ids).toEqual(['a']);
  });
  it('does not notify historical trades even on a first installation',async()=>{
    const f=fixture();expect(await run(f,{transactions:[transaction({created:now-2*86400000})]})).toMatchObject({created:1,backfilled:1,notified:0});
    expect(f.rows[0].breaking_active).toBe(false);expect(f.notifyTradeAlert).not.toHaveBeenCalled();
  });
  it('retries a failed phone notification on an unchanged sync without regrading',async()=>{
    const f=fixture();f.notifyTradeAlert.mockRejectedValueOnce(Error('Provider unavailable'));
    expect(await run(f)).toMatchObject({created:1,notified:0});
    expect(await run(f)).toMatchObject({created:0,notified:1});
    expect(await run(f)).toMatchObject({created:0,notified:0});
    expect(f.loadAnalyzer).toHaveBeenCalledTimes(1);expect(f.notifyTradeAlert).toHaveBeenCalledTimes(2);
  });
  it('never relaunches dismissed coverage or resends a linked alert',async()=>{
    const f=fixture([{sleeper_transaction_id:'new-trade',breaking_active:false,notification_message_id:null}]);
    expect(await run(f)).toMatchObject({created:0,notified:0});expect(f.notifyTradeAlert).not.toHaveBeenCalled();expect(f.loadAnalyzer).not.toHaveBeenCalled();
  });
  it('delivers saved pending alerts even if another missing receipt cannot load its model',async()=>{
    const f=fixture([{sleeper_transaction_id:'saved',breaking_active:true}]);f.loadAnalyzer.mockRejectedValue(Error('Stats unavailable'));
    expect(await run(f,{transactions:[transaction(),transaction({transaction_id:'saved'})]})).toMatchObject({created:0,notified:1});
    expect(f.rows).toHaveLength(1);
  });
  it('replays a waiver between trades to recover valid pre-trade ownership',async()=>{
    const f=fixture();const rows=[transaction({transaction_id:'first',created:now-7200000}),
      {transaction_id:'waiver',type:'free_agent',status:'complete',created:now-5400000,adds:{c:1},drops:{b:1}},
      transaction({transaction_id:'second',created:now-3600000,drops:{c:1,a:2},adds:{c:2,a:1}})];
    f.loadAnalyzer.mockResolvedValue({state:'ready',teams:[],pool:new Map([...pool,['c',{id:'c',name:'Waiver Player',position:'WR',tradeValue:30,expectedPoints:200}]])});
    await run(f,{transactions:rows,currentRosters:[{roster_id:1,players:['a']},{roster_id:2,players:['c']}]});
    expect(f.rows).toHaveLength(2);expect(f.rows[0].analysis_status).toBe('graded');expect(f.rows[1].analysis_status).toBe('graded');
    expect(f.rows[1].pre_trade_rosters[0].player_ids).toContain('c');
  });
  it('records unsupported picks without inventing a complete balance or suppressing the alert',async()=>{
    const f=fixture();await run(f,{transactions:[transaction({draft_picks:[{season:2027,round:1}]})]});
    expect(f.rows[0]).toMatchObject({analysis_status:'partial',verdict:null});expect(f.rows[0].result).not.toBeNull();expect(f.notifyTradeAlert).toHaveBeenCalledTimes(1);
  });
  it('uses acceptance time when a trade offer was created days earlier',()=>{
    expect(isRecentTrade(transaction({created:now-3*86400000,status_updated:now-60000}),now)).toBe(true);
  });
  it('bounds news recency and rejects invalid/future timestamps',()=>{
    expect(isRecentTrade(transaction(),now)).toBe(true);
    for(const created of [0,null,'invalid',now+3600000,now-86400001])expect(isRecentTrade({created},now)).toBe(false);
  });
});

describe('completed ownership order',()=>{
 it('replays accepted trades in acceptance order even when their offers were created in the opposite order',async()=>{
  const f=fixture(),p=new Map([...pool,['c',{id:'c',name:'Third Player',position:'WR',tradeValue:30,expectedPoints:200}]]);
  f.loadAnalyzer.mockResolvedValue({state:'ready',teams:[],pool:p});
  const earlier=transaction({transaction_id:'accepted-first',created:now-3600000,status_updated:now-120000,drops:{b:1,a:2},adds:{b:2,a:1}});
  const later=transaction({transaction_id:'created-first',created:now-7200000,status_updated:now-60000,drops:{a:1,c:2},adds:{a:2,c:1}});
  await run(f,{transactions:[later,earlier],currentRosters:[{roster_id:1,players:['c']},{roster_id:2,players:['a','b']}]});
  expect(f.rows.map(r=>r.sleeper_transaction_id)).toEqual(['accepted-first','created-first']);
  expect(f.rows.every(r=>r.analysis_status==='graded')).toBe(true);
  expect(f.rows[0].pre_trade_rosters[0].player_ids).toEqual(['b']);expect(f.rows[1].pre_trade_rosters[0].player_ids).toEqual(['a']);
 });
});

describe('append-only recovery of unsupported synced trades',()=>{
 it('adds routed analysis once without replacing the original receipt or sending another notification',async()=>{
  const tx=transaction({roster_ids:[1,2,3],adds:{a:2,b:3,c:1},drops:{a:1,b:2,c:3}});
  const original={id:18,sleeper_transaction_id:'new-trade',analysis_status:'review',result:null,model_version:'dflyzer-trade-v7-price-fit-risk',limitations:['Multi-team trade: automatic ownership routing is not supported yet.'],notification_message_id:75,breaking_active:true,routing_review:null};
  const rows=[{...original}];
  const database={from:()=>{
   const filters=[];let patch=null;
   const query={select:()=>query,in:(key,ids)=>{filters.push(r=>ids.includes(r[key]));return query},eq:(key,v)=>{filters.push(r=>r[key]===v);return query},is:(key,v)=>{filters.push(r=>(r[key]??null)===v);return query},update:row=>{patch=row;return query},
    then:resolve=>{const matches=rows.filter(r=>filters.every(f=>f(r)));if(patch)matches.forEach(r=>Object.assign(r,patch));return Promise.resolve({data:matches,error:null}).then(resolve)}};
   return query;
  }};
  const loadAnalyzer=vi.fn(async()=>({state:'ready',teams:[],pool:new Map([...pool,['c',{id:'c',name:'Third',position:'WR',tradeValue:25,expectedPoints:200}]])})),notifyTradeAlert=vi.fn();
  const options={reviewUnsupported:true,transactions:[tx],currentRosters:[{roster_id:1,players:['c']},{roster_id:2,players:['a']},{roster_id:3,players:['b']}],database,loadAnalyzer,notifyTradeAlert,season:2026,week:5,now};
  expect(await captureTradeReceipts(options)).toMatchObject({created:0,reviewed:1,notified:0});
  expect(rows[0]).toMatchObject({...original,routing_review:{analysis_status:'graded',result:{destinations:{a:'2',b:'3',c:'1'}}}});
  expect(await captureTradeReceipts(options)).toMatchObject({created:0,notified:0});
  expect(loadAnalyzer).toHaveBeenCalledTimes(1);expect(notifyTradeAlert).not.toHaveBeenCalled();
 });
});
