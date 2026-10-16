import {describe,it,expect} from 'vitest';
import {comparisonPlayer,comparisonCandidates} from './player-compare-model.js';
const row=(week,stats,extra={})=>({player_id:'a',season:2026,season_type:'regular',week,stats,...extra});
function fixture(){return {analysis:{liveWeek:6,projectionSeason:2026,league:{scoring_settings:{rec:1,rec_yd:.1,rec_td:6}},nflSchedule:new Map([['JAX',{key:'live',opponent:'TEN'}]])},players:new Map([['a',{id:'a',name:'Alpha Receiver',position:'WR',nflTeam:'JAC',tradeValue:70,expertFeedStatus:'Fresh',expert:{rank:10,positionRank:5}}],['b',{id:'b',name:'Beta Back',position:'RB',nflTeam:'BUF',tradeValue:90}],['c',{id:'c',name:'Gamma Receiver',position:'WR',nflTeam:'SEA',modelSource:'unrated'}]]),owners:new Map([['a','Bayou Bombers']]),weekly:new Map([['a',{hasGame:true,points:18.4,opponent:'TEN'}]]),weeks:[],projectionsStale:false}}
describe('two-player comparison evidence',()=>{
 it('scores completed games with actual league settings and keeps a played zero',()=>{
  const d=fixture();d.weeks=[{week:4,data:[row(4,{gp:1,rec:5,rec_yd:100,rec_td:1})]},{week:5,data:[row(5,{gp:1,rec:0,rec_yd:0,rec_td:0})]}];
  expect(comparisonPlayer(d,'a')).toMatchObject({projection:18.4,average:10.5,range:[0,21],recent:[{week:4,points:21},{week:5,points:0}]});
 });
 it('excludes partial current games until the NFL game is final',()=>{
  const d=fixture();d.weeks=[{week:6,data:[row(6,{gp:1,rec:10,rec_yd:200})]}];
  expect(comparisonPlayer(d,'a').recent).toEqual([]);d.analysis.nflSchedule.get('JAX').key='final';
  expect(comparisonPlayer(d,'a').recent).toEqual([{week:6,points:30}]);
 });
 it('does not turn stale, bye, absent, wrong-season or postseason rows into scores',()=>{
  const d=fixture();d.weeks=[{week:1,stale:true,data:[row(1,{gp:1,rec:9})]},{week:2,data:[row(2,{gp:0,rec:0})]},{week:3,data:[row(3,{gp:1,rec:8},{season:2025})]},{week:4,data:[row(4,{gp:1,rec:4},{season_type:'post'})]},{week:5,data:[]}];
  expect(comparisonPlayer(d,'a')).toMatchObject({average:null,range:null,recent:[]});
 });
 it('requires two real games for an average or range and keeps the latest four',()=>{
  const d=fixture();d.weeks=[{week:5,data:[row(5,{gp:1,rec:3})]}];expect(comparisonPlayer(d,'a').average).toBeNull();
  d.weeks=[1,2,3,4,5].map(week=>({week,data:[row(week,{gp:1,rec:week})]}));expect(comparisonPlayer(d,'a').recent.map(x=>x.week)).toEqual([2,3,4,5]);
 });
 it('leaves unscorable games and missing projections unknown',()=>{
  const d=fixture();d.analysis.league.scoring_settings=null;d.weeks=[{week:5,data:[row(5,{gp:1,rec:3})]}];
  expect(comparisonPlayer(d,'a').recent).toEqual([]);expect(comparisonPlayer(d,'c')).toMatchObject({projection:null,tradeValue:null});
  d.weekly.set('c',{hasGame:false,scheduleKnown:true,points:0});expect(comparisonPlayer(d,'c')).toMatchObject({projection:null,bye:true});
 });
 it('shows only fresh expert ranks, and does not substitute DFL model ranks',()=>{
  const d=fixture();expect(comparisonPlayer(d,'a').expert).toEqual({rank:10,positionRank:5});
  d.players.get('a').expertFeedStatus='Stale';expect(comparisonPlayer(d,'a').expert).toBeNull();expect(comparisonPlayer(d,'missing')).toBeNull();
 });
 it('searches by name, team and current owner while excluding the other selection',()=>{
  const d=fixture();expect(comparisonCandidates(d,{query:'bayou alpha'}).map(p=>p.id)).toEqual(['a']);
  expect(comparisonCandidates(d,{position:'WR',exclude:'a'}).map(p=>p.id)).toEqual(['c']);
  expect(comparisonCandidates(d).map(p=>p.id)).toEqual(['a','b','c']);
 });
 it('finds familiar player names without requiring apostrophes or hyphens',()=>{
  const d=fixture();d.players.get('a').name='Ja’Marr Chase';d.players.get('b').name='Amon-Ra St. Brown';
  expect(comparisonCandidates(d,{query:'jamarr'}).map(p=>p.id)).toEqual(['a']);
  expect(comparisonCandidates(d,{query:'amonra'}).map(p=>p.id)).toEqual(['b']);
 });
});
