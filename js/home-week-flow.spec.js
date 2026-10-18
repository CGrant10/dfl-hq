import {describe,it,expect} from 'vitest';
import {homeWeekPhase,homeWeekReceipt,homeLeagueRace} from './home-week-flow.js';
const now=Date.parse('2026-10-18T16:00:00Z');
const event=(state,kickoff=now+3600000)=>({state,kickoff});
const base={season:2026,week:6,completed:false,live:false};
const side=(name,score,state='live')=>({name,score,starters:[{state}]});
describe('Home follows the actual league week',()=>{
 it('leads with decisions before kickoff and league action once the week starts',()=>{
  expect(homeWeekPhase({model:{...base,events:[event('upcoming')]}},now)).toMatchObject({key:'pregame',order:['plan','live','recap']});
  expect(homeWeekPhase({model:{...base,events:[event('live')]}},now)).toMatchObject({key:'live',order:['live','plan','recap']});
  expect(homeWeekPhase({model:{...base,events:[event('final'),event('upcoming')]}},now)).toMatchObject({key:'between',order:['live','plan','recap']});
 });
 it('does not infer a final week from one finished game or an overdue pregame feed',()=>{
  expect(homeWeekPhase({model:{...base,events:[event('upcoming',now)]}},now).key).toBe('between');
  expect(homeWeekPhase({model:{...base,events:[event('final')]}},now).key).toBe('settling');
  expect(homeWeekPhase({model:{...base,completed:true}},now)).toMatchObject({key:'final',order:['recap','live','plan']});
  expect(homeWeekPhase({model:{...base,events:[]}},now).key).toBe('unknown');
 });
 it('does not let the saved final slate hide the next active week',()=>{
  const edition={model:{...base,completed:true},leagueState:{season:2026,currentWeek:7},openingWeek:7,openingNfl:{payload:{events:[{date:'2026-10-22T23:00:00Z',status:{type:{state:'pre'}}}]}}};
  expect(homeWeekPhase(edition,now)).toMatchObject({key:'pregame',week:7});
  expect(homeWeekPhase({...edition,openingNfl:null},now).key).toBe('unknown');
  expect(homeWeekPhase({...edition,openingNfl:{payload:{events:[{status:{type:{state:'in'}}}]}}},now).key).toBe('live');
 });
});
describe('Home league action is compact and factual',()=>{
 it('orders close actual matchups, excludes the personal scoreboard, unstarted teams and missing totals',()=>{
  const game=(id,a,b,extra={})=>({id,sides:[a,b],...extra});
  const html=homeLeagueRace({...base,games:[
   game('mine',side('Me',100),side('Opponent',101),{isMine:true}),
   game('wide',side('Wide',130),side('Other',100)),
   game('close',side('<Closest>',99.99),side('Close rival',100)),
   game('pregame',side('Not started',0,'upcoming'),side('Not started either',0,'upcoming')),
   game('missing',side('Missing',null),side('Known',100)),
  ]});
  expect(html).not.toContain('>Me<');expect(html).not.toContain('Not started');expect(html).not.toContain('Missing');
  expect(html.indexOf('&lt;Closest&gt;')).toBeLessThan(html.indexOf('>Wide<'));
  expect(html).toContain('0.01-point gap');expect(html).toContain('matchup=close');expect(html).not.toContain('Projected');
  expect(homeLeagueRace({...base,completed:true,games:[]})).toBe('');
 });
 it('shows final receipts only from confirmed complete results and retains score precision',()=>{
  const model={...base,games:[{sides:[side('Alpha',110.04),side('Beta',110)]}]};
  expect(homeWeekReceipt({model})).toBe('');
  const html=homeWeekReceipt({model:{...model,completed:true}});
  expect(html).toContain('110.04');expect(html).toContain('0.04 points');expect(html).toContain('tab=recap');expect(html).toContain('fuck');
  expect(homeWeekReceipt({model:{...model,completed:true,games:[{sides:[side('Alpha',null),side('Beta',110)]}]}})).toBe('');
 });
 it('keeps last week dated separately, chooses the latest final, and handles ties without inventing a loser',()=>{
  const report={final:true,season:2026,week:5,games:[{winner:{name:'Old winner',value:100},loser:{name:'Old rival',value:80}}]};
  expect(homeWeekReceipt({model:base,report})).toContain('Week 5 receipts');
  const model={...base,completed:true,games:[{sides:[side('A & B',110),side('Tied',110)]}]};
  const html=homeWeekReceipt({model,report});
  expect(html).toContain('Week 6 receipts');expect(html).toContain('Joint high score');expect(html).toContain('Dead even');expect(html).toContain('A &amp; B');
  expect(html).not.toContain('Old winner');expect(html).not.toContain('lost');
 });
});
