import {describe,expect,it,vi,afterEach} from 'vitest';
import {captureScheduledTrades} from '../supabase/functions/sync-sleeper/trade-alerts.ts';
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  const saved={sleeper_transaction_id:'tx-auto',analysis_status:'graded',teams:[{team_name:'Alpha'},{team_name:'Bravo'}],
    result:{fairness:80,projectionEvidence:{injuries:['Injured player']}},verdict:{who:null,headline:'Review needed'},breaking_active:true,notification_message_id:null};
  const update=vi.fn();
  const admin={from:()=>({select:columns=>({in:()=>columns==='sleeper_transaction_id'?Promise.resolve({data:[saved],error:null})
    :{eq:()=>({is:async()=>({data:saved.notification_message_id?[]:[saved],error:null})})}}),
    update:row=>{update(row);return{eq:()=>({is:async()=>{Object.assign(saved,row);return{error:null}}})}},
  })};
  const options={admin,league:{},users:[],rosters:[],transactions:[{transaction_id:'tx-auto',type:'trade',status:'complete',roster_ids:[1,2],adds:{a:2,b:1},drops:{a:1,b:2},created:Date.now()}],season:2026,week:5,url:'https://example.test',cronToken:'fixture-cron-token'};
  return{saved,update,options};
}
describe('scheduled trade alert integration',()=>{
  it('sends a pending saved receipt through the existing server notification API, once',async()=>{
    const f=fixture(),fetch=vi.fn(async()=>Response.json({ok:true,messageId:45}));vi.stubGlobal('fetch',fetch);
    expect(await captureScheduledTrades(f.options)).toMatchObject({created:0,notified:1});
    const [url,options]=fetch.mock.calls[0];expect(url).toBe('https://example.test/functions/v1/send-notification');
    expect(options.headers['x-dfl-cron-token']).toBe('fixture-cron-token');
    expect(JSON.parse(options.body)).toMatchObject({category:'trades',audience:'all',sourceKey:'trade:tx-auto',targetUrl:'#/trade?tx=tx-auto'});
    expect(JSON.parse(options.body).body).toContain('80% balance · Injury flags');
    expect(f.update).toHaveBeenCalledWith(expect.objectContaining({notification_message_id:45}));
    expect(await captureScheduledTrades(f.options)).toMatchObject({created:0,notified:0});expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('keeps notification linkage empty when delivery fails, allowing the next poll to retry',async()=>{
    const f=fixture(),fetch=vi.fn(async()=>Response.json({error:'Provider unavailable'},{status:503}));vi.stubGlobal('fetch',fetch);
    expect(await captureScheduledTrades(f.options)).toMatchObject({notified:0});expect(f.update).not.toHaveBeenCalled();
    fetch.mockResolvedValue(Response.json({ok:true,messageId:46}));expect(await captureScheduledTrades(f.options)).toMatchObject({notified:1});
  });
});
