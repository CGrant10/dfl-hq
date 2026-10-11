import {beforeEach,describe,it,expect,vi} from 'vitest';
const wire=vi.hoisted(()=>({rows:[],live:[],queryError:null,liveError:false,calls:[]}));
vi.mock('./supabase.js',()=>({db:()=>({from:table=>{
 wire.calls.push(['from',table]);const builder={};for(const key of ['select','eq','gte','lte','in','order','limit'])builder[key]=(...args)=>{wire.calls.push([key,...args]);return builder};
 builder.then=(resolve,reject)=>Promise.resolve({data:wire.rows,error:wire.queryError}).then(resolve,reject);return builder;
}})}));
vi.mock('./sleeper.js',()=>({sleeper:{transactions:vi.fn(async()=>{if(wire.liveError)throw Error('Offline');return wire.live})}}));
import {loadWaiverHistory,clearWaiverHistoryCache,WAIVER_HISTORY_LIMIT} from './waiver-history-data.js';
import {sleeper} from './sleeper.js';
const input={leagueId:'DFL',season:2026,week:6};
beforeEach(()=>{clearWaiverHistoryCache();vi.clearAllMocks();wire.rows=[];wire.live=[];wire.queryError=null;wire.liveError=false;wire.calls=[]});
describe('recent waiver history boundary',()=>{
 it('scopes stored data to this season and four weeks, bounds rows and shares in-flight work',async()=>{
  const [a,b]=await Promise.all([loadWaiverHistory(input),loadWaiverHistory(input)]);expect(a).toBe(b);expect(sleeper.transactions).toHaveBeenCalledTimes(1);
  expect(wire.calls).toEqual(expect.arrayContaining([['eq','season',2026],['gte','week',3],['lte','week',6],['limit',WAIVER_HISTORY_LIMIT+1]]));
  clearWaiverHistoryCache();await loadWaiverHistory(input);expect(sleeper.transactions).toHaveBeenCalledTimes(2);
 });
 it('lets current live transaction state replace older saved copies without double counting',async()=>{
  wire.rows=[{sleeper_transaction_id:'one',status:'complete',details:{}}];wire.live=[{transaction_id:'one',status:'pending',type:'waiver',leg:6,created:1}];
  const result=await loadWaiverHistory(input);expect(result.state).toBe('ready');expect(result.transactions).toHaveLength(1);expect(result.transactions[0]).toMatchObject({status:'pending',season:2026,week:6});
 });
 it('marks truncated or partially failed data explicitly and does not block roster advice',async()=>{
  wire.rows=Array.from({length:WAIVER_HISTORY_LIMIT+1},(_,i)=>({sleeper_transaction_id:String(i)}));const capped=await loadWaiverHistory(input);
  expect(capped.state).toBe('partial');expect(capped.transactions).toHaveLength(WAIVER_HISTORY_LIMIT);
  clearWaiverHistoryCache();wire.queryError={message:'Unavailable'};wire.live=[{transaction_id:'live',leg:6,type:'free_agent',status:'complete'}];
  const live=await loadWaiverHistory(input);expect(live.state).toBe('partial');expect(live.transactions).toHaveLength(1);
  clearWaiverHistoryCache();wire.liveError=true;expect(await loadWaiverHistory(input)).toMatchObject({state:'unavailable',transactions:[]});
 });
});
