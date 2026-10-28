import {describe,it,expect} from 'vitest';
import {matchupTimeline,timelinePlayHref,timelineMarkup} from './matchup-timeline.js';
import {banterMemory} from './banter-memory.js';
import {multigameRows,defaultGamePins,reconcileGamePins} from './multigame-model.js';
import {tradeOpportunities,scoutSnapshot,readScoutBaseline} from './trade-opportunities.js';
const sides=[{roster:'1',uid:'a',name:'Alpha'},{roster:'2',uid:'b',name:'Bravo'}],game={id:'5',sides};
const lead=(key,at,roster='1')=>({key,at,kind:'lead',roster,matchupId:'5',text:'Alpha moves ahead',recap:{sides:[{team_name:'Alpha',points:40},{team_name:'Bravo',points:36}]}});
describe('recorded matchup timeline',()=>{
 it('orders actual moments, drops duplicates and refuses unrelated or incomplete scores',()=>{
  const a=lead('2',20),b=lead('1',10);
  expect(matchupTimeline([a,b,a,{...a,key:'wrong',matchupId:'6'},{...a,key:'bad',recap:{sides:[{points:null},{}]}}],game).map(m=>m.key)).toEqual(['1','2']);
  expect(matchupTimeline([a],game,{filter:'plays'})).toEqual([]);
 });
 it('does not invent an opening score or a continuous comeback curve',()=>{
  const html=timelineMarkup([lead('2',20)],game);expect(html).toContain('Saved ');expect(html).toContain('40.00');expect(html).not.toContain('<svg');
 });
 it('uses exact active clips and falls back to the actual game play',()=>{
  const m={...lead('3',20),kind:'touchdown',eventKey:'nfl:123:9:1',recap:{play:{gameId:'123',id:'9'}}},model={season:2026,week:7};
  expect(timelinePlayHref(m,model)).toMatchObject({video:false});expect(timelinePlayHref(m,model).href).toContain('nflGame=123');
  expect(timelinePlayHref(lead('1',10),model)).toBeNull();
 });
});
describe('banter with real memory',()=>{
 const model={season:2026,week:7,completed:false};
 const h=(week,score1=110,score2=80)=>({season:2026,week,user1:'a',user2:'b',roster1:1,roster2:2,score1,score2});
 it('deduplicates records and excludes current/future games from past streaks',()=>{
  const rows=[h(4),h(5),h(6),h(6),h(7,0,200),h(8,0,200)];
  const facts=banterMemory(model,game,{history:rows});expect(facts.find(f=>f.type==='Rivalry file').fact).toContain('3');expect(facts.some(f=>f.type==='Season file')).toBe(false);expect(facts.every(f=>f.href.startsWith('#/'))).toBe(true);
 });
 it('ties stop streaks and unrelated identities never earn a rivalry roast',()=>{
  expect(banterMemory(model,game,{history:[h(4),h(5,80,80),h(6)]}).some(f=>f.type==='Rivalry file')).toBe(false);
  expect(banterMemory(model,game,{history:[{...h(4),user1:'x',user2:'y'}]})).toEqual([]);
 });
 it('bench regret requires a final, actual scores and a legal starting slot',()=>{
  const p=(id,position,points)=>({id,name:id,position,points,slotType:position});
  const g={...game,sides:[{...sides[0],lineup:[p('starter','TE',0)],bench:[p('qb','QB',40),p('wr','WR',30)]},sides[1]]};
  expect(banterMemory({...model,completed:true},g)).toEqual([]);
  g.sides[0].lineup[0].slotType='FLEX';expect(banterMemory({...model,completed:true},g)[0].fact).toContain('30.00');expect(banterMemory(model,g)).toEqual([]);
 });
 it('trade memory preserves trade-day uncertainty and historical identity',()=>{
  const trade={transactionId:'9',season:2026,week:6,status:'graded',outcome:{grade:'Value edge'},teams:[{rosterId:'1',sleeper_user_id:'a'}],teamValues:[{rosterId:'1',sent:80,received:30}]};
  const f=banterMemory(model,game,{trades:[trade]});expect(f[0].fact).toContain('trade-day estimate');expect(f[0].href).toBe('#/trade?tx=9');
  expect(banterMemory(model,game,{trades:[{...trade,outcome:{needsReview:true}}]})).toEqual([]);expect(banterMemory(model,game,{trades:[{...trade,week:null}]})).toEqual([]);expect(banterMemory(model,game,{trades:[{...trade,teams:[{rosterId:'1'}]}]})).toEqual([]);
  expect(banterMemory(model,game,{trades:[{...trade,teams:[{rosterId:'1',sleeper_user_id:'someone-else'}]}]})).toEqual([]);
 });
});
describe('a bounded multigame desk',()=>{
 const event=(id,state='in')=>({id,date:'2026-10-25T17:00:00Z',status:{type:{state,shortDetail:'Q3'}},competitions:[{competitors:[{homeAway:'away',team:{abbreviation:'NO'},score:'0'},{homeAway:'home',team:{abbreviation:'PIT'},score:'14'}]}]});
 const payload={season:{year:2026,type:2},week:{number:7},events:[event('1'),event('2'),event('3','post'),event('4','pre')]};
 it('keeps zero scores and uses only the requested edition and named offensive players',()=>{
  const context={season:2026,week:7,players:[{id:'other',name:'Other receiver',position:'WR',nflTeam:'NO',points:99},{id:'p',name:'Chris Olave',position:'WR',nflTeam:'NO',isMine:true},{position:'DEF',nflTeam:'NO'}]};
  const rows=multigameRows(payload,context);expect(rows[0].sides[0].score).toBe(0);expect(rows[0].players).toHaveLength(2);expect(rows[0].players[0].isMine).toBe(true);expect(multigameRows(payload,{...context,week:8})).toEqual([]);
 });
 it('limits pinning to three valid unique games and retains an intentional empty desk',()=>{
  const rows=multigameRows(payload,{season:2026,week:7});expect(defaultGamePins(rows)).toHaveLength(3);expect(reconcileGamePins(['1','1','2','3','4','invalid'],rows)).toEqual(['1','2','3']);expect(reconcileGamePins([],rows)).toEqual([]);
 });
});
describe('opportunity scout quality gates',()=>{
 const mine={id:'1',need:'WR',playerIds:['a']},other={id:'2',team_name:'Partner',playerIds:['b']};
 const pool=new Map([['a',{id:'a',name:'Send',position:'RB',tradeValue:50}],['b',{id:'b',name:'Get',position:'WR',tradeValue:51}]]);
 const offer={other,sendA:['a'],sendB:['b'],fairness:98,valueToA:51,valueToB:50,weeklyDeltaA:1,weeklyDeltaB:.5,startingIncomingA:['b'],projectionEvidence:{missing:[],injuries:[],stale:[],fallback:[]}};
 const scout=(rows,extra={})=>tradeOpportunities(rows,{mine,pool,...extra});
 it('requires a real two-way starter upgrade with supported value',()=>{
  expect(scout([offer])).toHaveLength(1);
  for(const change of [{requiredDropsA:['extra']},{rosterImpactB:-1},{weeklyDeltaB:-.1},{weeklyDeltaA:0},{fairness:70},{projectionEvidence:{injuries:['Get']}},{sendA:['wrong-owner']}])expect(scout([{...offer,...change}])).toEqual([]);
 });
 it('never promotes an IR or season-ending player or a manager’s Keeping player',()=>{
  const injured=new Map(pool);injured.set('b',{...pool.get('b'),injuryStatus:'IR'});expect(scout([offer],{pool:injured})).toEqual([]);
  expect(scout([offer],{intentions:{'2':{players:{b:'keeping'}}}})).toEqual([]);
 });
 it('caps partner repetition and labels changes only against a valid baseline',()=>{
  const previous=scoutSnapshot([mine,other],pool,100);pool.set('b',{...pool.get('b'),tradeValue:55});
  expect(scout([offer,offer],{previous})).toHaveLength(1);expect(scout([offer],{previous})[0].signals).toContain('Value moved');
  expect(readScoutBaseline('me',2026,{getItem:()=>JSON.stringify(previous)},15*86400000)).toBeNull();
 });
});
