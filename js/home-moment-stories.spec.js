import {describe,it,expect} from 'vitest';
import {homeMomentStories,selectHomeMoment,createHomeMomentEdition} from './home-moment-stories.js';
import {homeBroadcastDeck} from './home-presentation.js';
const now=new Date('2026-10-28T17:00:00Z');
const bench={id:'wr1',name:'Bench Receiver',position:'WR',points:31.42,state:'final'};
const game=(id,a,b,extra={})=>({id,sides:[{uid:'a'+id,name:'Alpha '+id,score:a,bench:[]},{uid:'b'+id,name:'Bravo '+id,score:b,bench:[]}],...extra});
const edition=(games,extra={})=>({model:{season:2026,week:8,completed:true,scoreStatus:'ready',checkedAt:+now,games,...extra}});
const memory=()=>{const rows=new Map();return{getItem:k=>rows.get(k)||null,setItem:(k,v)=>rows.set(k,v)}};
const stories=()=>homeMomentStories({edition:edition([game('close',111.04,111),game('wide',140,80)]),now});
describe('league moments carry receipts',()=>{
 it('uses exact final scores, current team names and matchup links; one template stays stable that day',()=>{
  const rows=stories();expect(rows.map(r=>r.storySignal)).toEqual(['close','blowout']);
  expect(rows[0].sides).toMatchObject([{name:'Alpha close',score:'111.04'},{name:'Bravo close',score:'111.00'}]);
  expect(rows[0].href).toContain('week=8&tab=matchups&matchup=close');expect(stories()).toEqual(rows);
 });
 it('only roasts finished offensive bench scores, without claiming they changed the winner',()=>{
  const g=game('bench',100,90);g.sides[0].bench=[bench,{...bench,id:'lb',position:'LB',points:60},{...bench,id:'live',points:40,state:'live'}];
  const rows=homeMomentStories({edition:edition([g],{completed:false}),now});
  expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({storySignal:'bench',figure:'31.42',figureLabel:'On the bench',subtitle:'Bench Receiver · Alpha bench'});
  expect(rows[0].href).toContain('matchup=bench');expect(JSON.stringify(rows)).not.toMatch(/would have won|cost.*win|60.00|40.00/);
 });
 it('does not turn ongoing games, null totals, ties or forecasts into final losses',()=>{
  expect(homeMomentStories({edition:edition([game('x',150,60)],{completed:false,live:true}),now})).toEqual([]);
  expect(homeMomentStories({edition:edition([game('x',null,100)]),now})).toEqual([]);
  expect(homeMomentStories({edition:edition([game('x',100,100)]),now})).toEqual([]);
 });
 it('avoids repeating the member scoreboard and ignores offline data and previous-week moments after new kickoff',()=>{
  const g=game('mine',150,50,{isMine:true});expect(homeMomentStories({edition:edition([g]),meSleeperId:'amine',now})).toEqual([]);
  expect(homeMomentStories({edition:edition([g],{scoreStatus:'offline'}),now})).toEqual([]);
  g.sides[0].bench=[bench];expect(homeMomentStories({edition:edition([g],{completed:false,checkedAt:+now-160000}),now})).toEqual([]);
  const next={...edition([g]),leagueState:{season:2026,currentWeek:9},openingWeek:9,openingNfl:{payload:{events:[{status:{type:{state:'in'}}}]}}};
  expect(homeMomentStories({edition:next,now})).toEqual([]);
 });
 it('keeps a previous completed report explicitly dated and never invents an exact matchup ID',()=>{
  const report={final:true,season:2026,week:7,games:[{winner:{uid:'a',name:'Winner',value:100},loser:{uid:'b',name:'Loser',value:99.4}}]};
  const rows=homeMomentStories({edition:edition([],{completed:false}),report,now});
  expect(rows[0].kicker).toContain('WEEK 7');expect(rows[0].href).toBe('#/clubhouse?season=2026&week=7&tab=matchups');
 });
});
describe('restrained banter rotation',()=>{
 it('rotates different actual events across visits and suppresses exhausted events for 20 hours',()=>{
  const storage=memory(),rows=stories(),first=selectHomeMoment(rows,{storage,now}),second=selectHomeMoment(rows,{storage,now});
  expect(first.id).not.toBe(second.id);expect(selectHomeMoment(rows,{storage,now})).toBeNull();
  expect(selectHomeMoment(rows,{storage,now:new Date(+now+21*3600000)})).not.toBeNull();
 });
 it('caps each Chicago day at three moments even when more fresh stories exist',()=>{
  const storage=memory(),rows=[...stories(),...stories().map(s=>({...s,id:s.id+'new'}))];
  for(let i=0;i<3;i++)expect(selectHomeMoment(rows,{storage,now})).not.toBeNull();
  expect(selectHomeMoment(rows,{storage,now})).toBeNull();
 });
 it('preserves its selection through refresh and removes a corrected fact instead of swapping in another roast',()=>{
  const controller=createHomeMomentEdition({storage:memory(),now:()=>now});
  const source=edition([game('close',111.04,111),game('wide',140,80)]),first=controller.update({edition:source});
  expect(controller.update({edition:source})).toEqual(first);
  source.model.games.shift();expect(controller.update({edition:source})).toBeNull();
 });
 it('leaves the first broadcast card independent and shows only one selected supporting moment',()=>{
  const controller=createHomeMomentEdition({storage:memory(),now:()=>now}),selected=controller.update({edition:edition([game('x',111.04,111)])});
  const deck=homeBroadcastDeck([selected],{now});expect(deck[0].homeFeature).toBe(true);expect(deck[0].href).toBeNull();expect(deck[1].id).toBe(selected.id);
 });
 it('handles corrupt or blocked browser storage and scopes rotation to the league',()=>{
  expect(()=>selectHomeMoment(stories(),{now,storage:{getItem(){throw Error('blocked')},setItem(){throw Error('blocked')}}})).not.toThrow();
  const storage=memory();selectHomeMoment(stories(),{now,storage,scope:'one'});expect(selectHomeMoment(stories(),{now,storage,scope:'two'}).id).toBe(stories()[0].id);
 });
});
