import {describe,it,expect} from 'vitest';
import {rosterNextAction} from './roster-next-action.js';
const now=Date.parse('2026-10-20T16:00:00Z'),outlook={week:7,startSit:{swaps:[]}};
const offer=(id,position,gain,extra={})=>({player:{id,name:id,position},drop:{id:'depth',name:'Depth'},targetWeek:7,score:gain,gains:[{week:7,gain,coverage:0}],...extra});
const base={checkedAt:now,league:{league_id:'1337852874733936640'},plan:{state:'ready',week:7,rosterId:1,offers:[]},rescue:[]};
const select=(coach=base,extra={})=>rosterNextAction({coach,outlook,now,meSleeperId:'u1',...extra});
describe('a purposeful Home next move',()=>{
 it('chooses a meaningful WR gain ahead of a higher-scoring routine kicker stream',()=>{
  const result=select({...base,plan:{...base.plan,offers:[offer('Kicker','K',12),offer('Receiver','WR',4)]}});
  expect(result).toMatchObject({kind:'waiver',text:'Add Receiver · drop Depth · +4.0 projected',url:'https://sleeperbot.app.link/esEa7TDlJN'});
 });
 it('holds depth when only routine streamers or marginal gains remain',()=>{
  expect(select({...base,plan:{...base.plan,offers:[offer('Kicker','K',8),offer('Def','DEF',9),offer('Backup QB','QB',2),offer('WR','WR',1.5)]}}).kind).toBe('hold');
 });
 it('uses an owned healthy backup before recommending any pickup',()=>{
  const result=select({...base,rescue:[{actionable:true,severity:'out',slot:'WR',player:{name:'Out WR',position:'WR'},backup:{name:'Bench WR'}}],plan:{...base.plan,offers:[offer('Free WR','WR',10)]}});
  expect(result).toMatchObject({kind:'lineup',text:'Start Bench WR for Out WR'});
 });
 it('makes room for a returning IR receiver instead of cutting him for a kicker',()=>{
  const result=select({...base,plan:{...base.plan,offers:[offer('Kicker','K',10)],returns:[{player:{name:'Returning WR'},gain:5,needsSpace:true}]}});
  expect(result).toMatchObject({kind:'ir',text:'Make room for Returning WR · IR return',url:'https://sleeperbot.app.link/esEa7TDlJN'});
 });
 it('offers activation without claiming a roster cut when there is space',()=>{
  expect(select({...base,plan:{...base.plan,returns:[{player:{name:'Returning WR'},needsSpace:false}]}}).text).toBe('Activate Returning WR from IR');
 });
 it('still fills a genuinely missing kicker slot without a speculative skill-player cut',()=>{
  const coach={...base,rescue:[{actionable:true,severity:'out',slot:'K',player:{name:'Empty K',position:'K'}}]};
  expect(select(coach).text).toBe('Fill your K slot before kickoff');
  expect(select({...coach,plan:{...base.plan,offers:[offer('Kicker','K',8,{drop:null,gains:[{week:7,gain:8,coverage:1}]})]}})).toMatchObject({kind:'waiver',text:'Add Kicker · +8.0 projected'});
 });
 it('recognizes a confirmed bye gap even when no injury alert is present',()=>{
  const kicker=offer('Kicker','K',8,{drop:{name:'Bye Kicker'},targetWeek:8,gains:[{week:7,gain:8,coverage:1},{week:8,gain:10,coverage:0}]});
  expect(select({...base,plan:{...base.plan,offers:[kicker]}}).text).toBe('Add Kicker · drop Bye Kicker · +8.0 projected');
 });
 it('does not bench a questionable star as if he were ruled out',()=>{
  const coach={...base,rescue:[{actionable:true,severity:'questionable',slot:'WR',player:{name:'Questionable WR'},backup:{name:'Cover WR'}}]};
  expect(select(coach)).toMatchObject({kind:'watch',text:'Watch Questionable WR · keep Cover WR available'});
 });
 it('never repeats stale, future-dated, wrong-week or unavailable drop advice',()=>{
  for(const coach of [{...base,checkedAt:now-120001},{...base,checkedAt:now+1},{...base,plan:{...base.plan,week:6}},{...base,plan:{...base.plan,state:'unavailable'}}])expect(select(coach).kind).toBe('refresh');
 });
 it('requires a larger improvement for a routine one-QB pickup',()=>{
  expect(select({...base,plan:{...base.plan,offers:[offer('QB','QB',4)]}}).kind).toBe('hold');
  expect(select({...base,plan:{...base.plan,offers:[offer('QB','QB',6)]}}).kind).toBe('waiver');
 });
 it('labels an upcoming bye improvement with the correct target week',()=>{
  expect(select({...base,plan:{...base.plan,offers:[offer('RB','RB',0,{targetWeek:8,gains:[{week:7,gain:0},{week:8,gain:8}]})]}}).text).toContain('W8 +8.0 projected');
 });
 it('revalidates a trade target and deep-links the selected team, partner and player',()=>{
  const p={id:'target',name:'Target WR',position:'WR',team:'CHI',hasGame:true,points:18},coach={...base,rosters:[{roster_id:2,players:['target']}],weekly:[{pool:new Map([['target',p]])}],nfl:{teams:new Map([['CHI',{key:'upcoming',kickoff:'2026-10-22T20:00:00Z'}]])}};
  const move={mine:{id:'1'},need:{position:'WR',urgent:true},trade:{player:p,team:{id:'2'}},tradeGain:5};
  expect(select(coach,{move})).toMatchObject({kind:'trade',url:'#/trade?team=1&partner=2&target=target'});
  expect(select({...coach,rosters:[{roster_id:2,players:[]}]},{move}).text).not.toContain('Target WR');
 });
 it('does not reuse a stale swap after its player is moved to IR or kickoff has passed',()=>{
  const start={id:'start',name:'Bench WR',team:'CHI',hasGame:true,points:20},sit={id:'sit',name:'Starting WR',team:'CHI',hasGame:true,points:10};
  const coach={...base,rosters:[{roster_id:1,players:['start','sit'],starters:['sit']}],weekly:[{pool:new Map([['start',start],['sit',sit]])}],nfl:{teams:new Map([['CHI',{key:'upcoming',kickoff:'2026-10-22T20:00:00Z'}]])}};
  const weekly={...outlook,startSit:{swaps:[{start,sit,gain:10}]}};
  expect(select(coach,{outlook:weekly}).kind).toBe('lineup');
  expect(select({...coach,rosters:[{...coach.rosters[0],reserve:['start']}]},{outlook:weekly}).kind).toBe('hold');
  expect(select({...coach,nfl:{teams:new Map([['CHI',{key:'live',kickoff:'2026-10-20T15:00:00Z'}]])}},{outlook:weekly}).kind).toBe('hold');
  const bye={...sit,hasGame:false,scheduleKnown:true};
  expect(select({...coach,weekly:[{pool:new Map([['start',start],['sit',bye]])}]},{outlook:weekly}).text).toBe('Start Bench WR over Starting WR · +20.0 projected');
 });
});
