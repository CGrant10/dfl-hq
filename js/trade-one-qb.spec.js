import {describe,it,expect} from 'vitest';
import {evaluateTrade,evaluateMultiTeamTrade,suggestTrades,suggestMultiTeamTrades,tradeSuggestionTier} from './team-analyzer.js';
import {tradePerspective} from './trade-routing.js';
const clearWin={fairness:60,valueToA:100,valueToB:60,rosterImpactA:1,rosterImpactB:0,
 incomingEvidence:{low:90,high:110},outgoingEvidence:{low:54,high:66}};
function league(qbName='Jared Goff'){
 const pool=new Map();
 const team=(id,pace)=>{
  const playerIds=[];
  for(const [position,values] of Object.entries(pace))values.forEach((points,i)=>{
   const pid=`${id}-${position}-${i}`;playerIds.push(pid);
   pool.set(pid,{id:pid,name:position==='QB'&&i===0?qbName:pid,position,tradePerGame:points,expectedPoints:points*17,
    expectedPerGame:points,tradeValue:40,modelSource:'projection',currentGames:5,consistency:{games:5,variation:.2}});
  });return {id,playerIds};
 };
 const a=team('a',{QB:[17,16],RB:[14,13,12],WR:[20,19.5,19.4,19.3],TE:[12]});
 const b=team('b',{QB:[21,20],RB:[14,13,12],WR:[19,18.5,18,17.5],TE:[12]});
 const c=team('c',{QB:[21,20],RB:[13,12,11],WR:[19,18.5,18,17.5],TE:[12]});
 pool.get('a-WR-0').tradeValue=50;pool.get('b-QB-0').tradeValue=100;
 pool.get('b-RB-0').tradeValue=60;pool.get('c-QB-0').tradeValue=100;
 return {pool,a,b,c};
}
describe('DFL 1QB Steal eligibility',()=>{
 it.each([['QB'],['QB','WR'],['RB','QB'],['WR','TE','QB']])('excludes any incoming QB from a value-winning package (%j)',(...positions)=>{
  expect(tradeSuggestionTier({...clearWin,incomingPositionsA:positions})).toBe('aggressive');
 });
 it.each(['RB','WR','TE'])('still permits a qualified %s value win',position=>{
  expect(tradeSuggestionTier({...clearWin,incomingPositionsA:[position]})).toBe('steal');
 });
 it.each(['Jared Goff','Josh Allen'])('excludes receiving %s even when it clears all numeric value checks',qbName=>{
  const {pool,a,b}=league(qbName),result=evaluateTrade({teamA:a,teamB:b,sendA:['a-WR-0'],sendB:['b-QB-0'],pool});
  expect(result.incomingPositionsA).toEqual(['QB']);
  expect(result.incomingEvidence.low).toBeGreaterThan(result.outgoingEvidence.high);
  expect(result.weeklyDeltaA).toBeGreaterThan(0);
  expect(tradeSuggestionTier({...result,incomingPositionsA:['WR']})).toBe('steal');
  expect(tradeSuggestionTier(result)).toBe('aggressive');
  const offers=suggestTrades({teams:[a,b],teamId:a.id,partnerId:b.id,sendAnchorIds:['a-WR-0'],receiveAnchorIds:['b-QB-0'],pool,intent:'steal',maxPlayers:2,limit:96});
  expect(offers.length).toBeGreaterThan(0);
  expect(offers.every(o=>o.tier!=='steal')).toBe(true);
  expect(offers[0].valueToA).toBe(100); // Labels do not erase elite-QB value.
 });
 it('uses the actual recipient in directed group trades, regardless of member order',()=>{
  const {pool,a,b,c}=league(),sends=[['a-WR-0'],['b-QB-0'],['c-WR-0']],destinations={'a-WR-0':'c','b-QB-0':'a','c-WR-0':'b'};
  const result=evaluateMultiTeamTrade({teams:[a,b,c],sends,destinations,pool});
  expect(tradePerspective(result).incomingPositionsA).toEqual(['QB']);
  expect(tradeSuggestionTier({...clearWin,incomingPositionsA:tradePerspective(result).incomingPositionsA})).toBe('aggressive');
  const reordered=evaluateMultiTeamTrade({teams:[a,c,b],sends:[sends[0],sends[2],sends[1]],destinations,pool});
  expect(tradePerspective(reordered).incomingPositionsA).toEqual(['QB']);
  expect(result.incomingPositions[1]).toEqual(['WR']);
  // Another member getting a QB must not disqualify your own RB/WR/TE return.
  expect(tradeSuggestionTier({...clearWin,incomingPositionsA:result.incomingPositions[1]})).toBe('steal');
 });
 it('keeps circular multi-member QB targets out of Steal offers',()=>{
  const {pool,a,b,c}=league();
  const offers=suggestMultiTeamTrades({parties:[a,b,c],pool,sendAnchorIds:['a-WR-0'],receiveAnchorIds:['c-QB-0'],maxPlayers:3,intent:'steal',limit:96});
  expect(offers.length).toBeGreaterThan(0);
  expect(offers.every(o=>o.receives[0].includes('c-QB-0'))).toBe(true);
  expect(offers.every(o=>o.tier!=='steal')).toBe(true);
 });
});
