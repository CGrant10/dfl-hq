import {describe,it,expect,vi,afterEach} from 'vitest';
import {assessExpertRankings,matchExpertRankings,EXPERT_MAX_AGE_MS} from './expert-rankings-model.js';
import {buildPlayerPool} from './team-analyzer.js';
const now=Date.UTC(2026,9,9),rows=Array.from({length:110},(_,i)=>({name:`Filler ${i}`,position:'WR',team:'DET',rank:i+1,positionRank:i+1,minRank:i+1,maxRank:i+2,stdDev:1}));
const payload=(changes={})=>({schemaVersion:1,source:'FantasyPros',kind:'rest-of-season',scoring:'ppr',season:2026,experts:8,updatedAt:now-3600000,fetchedAt:now,players:rows,...changes});
const assess=data=>assessExpertRankings(data,{season:2026,scoring:'ppr',now});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('external ROS opinions',()=>{
 it('requires a real fresh consensus for the matching season and scoring',()=>{
  expect(assess(payload())).toMatchObject({usable:true,status:'Fresh',experts:8});
  expect(assess(payload({updatedAt:now-EXPERT_MAX_AGE_MS-1}))).toMatchObject({usable:false,status:'Stale'});
  expect(assess(payload({season:2025}))).toMatchObject({usable:false,status:'Season mismatch'});
  expect(assessExpertRankings(payload(),{season:2026,scoring:'half_ppr',now})).toMatchObject({usable:false,status:'Scoring mismatch'});
  expect(assess(payload({experts:1})).usable).toBe(false);expect(assess(payload({fetchedAt:now+86400000})).usable).toBe(false);
  expect(assess(payload({players:rows.slice(0,20)})).usable).toBe(false);
 });
 it('matches verified names, suffixes and NFL team aliases without guessing ambiguous players',()=>{
  const players=[{id:'cook',name:'James Cook',position:'RB',nflTeam:'BUF'},{id:'brown',name:'Marquise Brown',position:'WR',nflTeam:'PHI'},{id:'hunter',name:'Travis Hunter',position:'WR',nflTeam:'JAX'}];
  const feed={status:'Fresh',players:[{name:'James Cook III',position:'RB',team:'BUF'},{name:'Hollywood Brown',position:'WR',team:'PHI'},{name:'Travis Hunter',position:'WR',team:'JAC'}]};
  expect([...matchExpertRankings(players,feed).keys()]).toEqual(['cook','brown','hunter']);
  expect(matchExpertRankings([...players,{...players[0],id:'other-cook'}],feed).has('cook')).toBe(false);
  expect(matchExpertRankings(players,{...feed,players:[...feed.players,feed.players[0]]}).has('cook')).toBe(false);
  expect(matchExpertRankings([{...players[0],nflTeam:'NYJ'}],feed).size).toBe(0);
 });
 it('includes dual WR eligibility and bounds expert influence without changing DFL lineup points',()=>{
  const input={rosters:Array.from({length:12},()=>({players:['hunter','wr','qb']})),players:{hunter:{n:'Travis Hunter',p:'DB',fp:['DB','WR'],t:'JAX'},wr:{n:'Receiver',p:'WR',t:'DET'},qb:{n:'Quarterback',p:'QB',t:'BUF'}},projections:[{player_id:'hunter',stats:{rec:170}},{player_id:'wr',stats:{rec:200}},{player_id:'qb',stats:{pass_yd:4500,pass_td:35}}],scoringSettings:{rec:1,pass_yd:.04,pass_td:4}};
  const ranks=[{name:'Travis Hunter',position:'WR',team:'JAC',rank:30,positionRank:12,minRank:28,maxRank:32,stdDev:1},{name:'Receiver',position:'WR',team:'DET',rank:1,positionRank:1,minRank:1,maxRank:1,stdDev:0},{name:'Quarterback',position:'QB',team:'BUF',rank:50,positionRank:5,minRank:48,maxRank:52,stdDev:1}];
  const feed=assess(payload({players:[...rows,...ranks]})),plain=buildPlayerPool(input),withExperts=buildPlayerPool({...input,expertRankings:feed});
  expect(withExperts.get('hunter')).toMatchObject({position:'WR',expertWeight:.15,expert:{rank:30}});
  for(const [id,p] of withExperts){expect(p.expectedPoints).toBe(plain.get(id).expectedPoints);expect(p.tradePerGame).toBe(plain.get(id).tradePerGame);expect(Math.abs(p.tradeValue-plain.get(id).tradeValue)).toBeLessThanOrEqual(15);}
  const stale=buildPlayerPool({...input,expertRankings:{...feed,status:'Stale',usable:false}});expect(stale.get('hunter').tradeValue).toBe(plain.get('hunter').tradeValue);expect(stale.get('hunter').expertWeight).toBe(0);
  expect(withExperts.get('qb').oneQbValueFactor).toBe(plain.get('qb').oneQbValueFactor);
 });
 it('falls back to the published app snapshot and rechecks season and age on cached reads',async()=>{
  vi.useFakeTimers();vi.setSystemTime(now);vi.stubGlobal('fetch',vi.fn(async url=>{if(String(url).startsWith('https://raw.'))throw new Error('offline');return {ok:true,json:async()=>payload()}}));
  vi.resetModules();const {loadExpertRankings}=await import('./expert-rankings-data.js');
  expect((await loadExpertRankings({season:2026})).status).toBe('Fresh');expect((await loadExpertRankings({season:2025})).status).toBe('Season mismatch');
  vi.setSystemTime(now+EXPERT_MAX_AGE_MS+1);expect((await loadExpertRankings({season:2026})).status).toBe('Stale');
 });
 it('limits a stalled source request so a working snapshot can finish loading',async()=>{
  vi.useFakeTimers();vi.setSystemTime(now);vi.stubGlobal('fetch',vi.fn((url,{signal})=>String(url).startsWith('https://raw.')?new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new Error('timeout')))) :Promise.resolve({ok:true,json:async()=>payload()})));
  vi.resetModules();const {loadExpertRankings}=await import('./expert-rankings-data.js');const loading=loadExpertRankings({season:2026});await vi.advanceTimersByTimeAsync(2501);
  expect((await loading).status).toBe('Fresh');expect(vi.getTimerCount()).toBe(0);
 });
});
