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

it('uses the same current injury evidence when the server grades a newly synced trade',async()=>{
 const rows=[];
 const admin={from:()=>({select:columns=>({in:(_key,ids)=>columns==='sleeper_transaction_id'?Promise.resolve({data:rows.filter(r=>ids.includes(r.sleeper_transaction_id)),error:null}):{eq:()=>({is:async()=>({data:rows.filter(r=>r.breaking_active&&!r.notification_message_id),error:null})})}}),insert:row=>({select:()=>({single:async()=>{rows.push({id:1,breaking_active:true,notification_message_id:null,...row});return{data:rows[0],error:null}}})}),update:patch=>({eq:()=>({is:async()=>{Object.assign(rows[0],patch);return{error:null}}})})})};
 const projections=[{player_id:'dead',stats:{rec:300,adp_ppr:1}},{player_id:'healthy',stats:{rec:120,adp_ppr:30}}];
 vi.stubGlobal('fetch',vi.fn(async url=>{
  if(url.endsWith('/send-notification'))return Response.json({ok:true,messageId:123});
  if(url.endsWith('/players/nfl'))return Response.json({dead:{full_name:'Receiver',position:'WR',team:'BUF',injury_status:'IR',status:'Inactive'},healthy:{full_name:'Healthy receiver',position:'WR',team:'MIA',status:'Active'}});
  if(url.includes('/projections/'))return Response.json(projections);
  if(url.endsWith('/nfl/injuries'))return Response.json({injuries:[{injuries:[{date:'2026-10-26T10:00:00Z',status:'Injured Reserve',details:{returnDate:'2027-02-15'},athlete:{displayName:'Receiver',position:{abbreviation:'WR'},team:{abbreviation:'BUF'}}}]}]});
  if(url.includes('/v1/stats/nfl/regular/'))return Response.json({});
  if(url.includes('/stats/nfl/2026/'))return Response.json([]);
  if(url.includes('/scoreboard?'))return Response.json({events:[]});
  if(url.includes('expert-ros-ppr.json'))return Response.json(null);
  throw Error('Unexpected fixture request: '+url);
 }));
 const result=await captureScheduledTrades({admin,league:{scoring_settings:{rec:1}},users:[{user_id:'one',display_name:'Alpha'},{user_id:'two',display_name:'Bravo'}],rosters:[{roster_id:1,owner_id:'one',players:['healthy']},{roster_id:2,owner_id:'two',players:['dead']}],transactions:[{transaction_id:'season-ended',type:'trade',status:'complete',roster_ids:[1,2],adds:{dead:2,healthy:1},drops:{dead:1,healthy:2},created:Date.now()}],season:2026,week:8,url:'https://example.test',cronToken:'fixture-cron-token'});
 expect(result).toMatchObject({created:1,notified:1});expect(rows[0].result.valueToA).toBeGreaterThan(0);expect(rows[0].result.valueToB).toBe(0);expect(rows[0].result.projectionEvidence.players.find(p=>p.id==='dead')).toMatchObject({outForSeason:true,availabilitySource:'ESPN'});
});
