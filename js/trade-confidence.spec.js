import {describe,it,expect} from 'vitest';
import {tradeConfidence,confidenceMarkup} from './trade-confidence.js';
import {verdictFor,recommendationFor,tradeReasons} from './trade-desk.js';
import {tradeSuggestionTier,evaluateMultiTeamTrade,evaluateTrade} from './team-analyzer.js';
import {dealCardData,dealCardText} from './trade-card.js';
const result=(evidence={})=>({valueToA:100,valueToB:35,fairness:35,weeklyDeltaA:2,weeklyDeltaB:0,rosterImpactA:2,rosterImpactB:0,incomingPositionsA:['WR'],incomingEvidence:{low:90,high:110},outgoingEvidence:{low:30,high:40},projectionEvidence:{missing:[],fallback:[],injuries:[],stale:[],thinSamples:[],players:[],expert:{required:true,status:'Fresh',source:'FantasyPros',updatedAt:Date.UTC(2026,9,8),experts:8,missing:[],disagreements:[],split:[]},...evidence}});
describe('confidence and conservative verdicts',()=>{
 it('allows a strong call only when fresh evidence and sensitivity ranges agree',()=>{
  const r=result();expect(tradeConfidence(r)).toMatchObject({level:'strong',needsReview:false});expect(tradeSuggestionTier(r)).toBe('steal');expect(recommendationFor(r).action).toBe('ACCEPT');
 });
 it.each(['Stale','Unavailable','Season mismatch','Scoring mismatch'])('withholds strong labels for %s expert evidence',status=>{
  const base=result(),r=result({expert:{...base.projectionEvidence.expert,status}});
  expect(tradeConfidence(r)).toMatchObject({level:'limited',needsReview:true});expect(tradeSuggestionTier(r)).toBe('aggressive');expect(verdictFor(r).headline).toBe('Review needed');expect(recommendationFor(r).action).toBe('REVIEW');
  const reasons=tradeReasons(r,{team_name:'A'},{team_name:'B'},new Map(),[],[]);expect(reasons[0].title).toBe('Hold the victory lap.');expect(JSON.stringify(reasons)).not.toContain('committing the robbery');
 });
 it.each(['injuries','thinSamples','fallback','stale'])('requires review for %s even when the raw value gap looks large',field=>{
  const r=result({[field]:['Player']});expect(tradeConfidence(r).needsReview).toBe(true);expect(recommendationFor(r).action).toBe('REVIEW');expect(tradeSuggestionTier(r)).not.toBe('steal');
 });
 it.each(['missing','disagreements','split'])('flags expert %s explicitly',field=>{
  const r=result(),next=result({expert:{...r.projectionEvidence.expert,[field]:['Player']}});expect(tradeConfidence(next).needsReview).toBe(true);expect(verdictFor(next).who).toBeNull();
 });
 it('calls overlapping estimates close without a false probability or robbery roast',()=>{
  const r={...result(),incomingEvidence:{low:50,high:120},outgoingEvidence:{low:30,high:60}};
  expect(tradeConfidence(r)).toMatchObject({level:'mixed',needsReview:false});expect(verdictFor(r).headline).toBe('Close call');expect(recommendationFor(r).action).toBe('NEGOTIATE');expect(tradeSuggestionTier(r)).not.toBe('steal');
  expect(confidenceMarkup(r)).toContain('Evidence quality, not a win probability');
 });
 it('keeps all incoming QBs out of Steal and leaves existing frozen receipts unchanged',()=>{
  expect(tradeSuggestionTier({...result(),incomingPositionsA:['WR','QB']})).not.toBe('steal');
  const legacy={...result(),projectionEvidence:{missing:[],fallback:[],injuries:[],stale:[]}};expect(tradeConfidence(legacy)).toBeNull();expect(verdictFor(legacy).headline).toBe('FLEECE');
 });
 it('checks all parties in a routed three-team deal, including a stale third party',()=>{
  const players=['a','b','c'].map((id,i)=>[id,{id,name:id,position:'WR',expectedPoints:200+i*20,tradePerGame:12+i,tradeValue:40+i*5,modelSource:'projection',expertFeedStatus:i===2?'Stale':'Fresh',expert:{rank:10+i},expertSource:'FantasyPros',expertCount:8,expertUpdatedAt:Date.UTC(2026,9,8)}]);
  const teams=['a','b','c'].map(id=>({id,playerIds:[id]}));
  const r=evaluateMultiTeamTrade({teams,sends:[['a'],['b'],['c']],destinations:{a:'c',b:'a',c:'b'},pool:new Map(players)});
  expect(r.receives).toEqual([['b'],['c'],['a']]);expect(tradeConfidence(r)).toMatchObject({level:'limited',needsReview:true});
  expect(tradeConfidence(r).reasons.join(' ')).toContain('stale');
 });
 it('does not silently grade an owned player missing from the rated pool as free value',()=>{
  const pool=new Map([['known',{id:'known',name:'Known',position:'WR',expectedPoints:200,tradeValue:50,modelSource:'projection'}]]);
  const r=evaluateTrade({teamA:{playerIds:['missing']},teamB:{playerIds:['known']},sendA:['missing'],sendB:['known'],pool});
  expect(r.projectionEvidence.missing).toEqual(['Unrated player missing']);expect(verdictFor(r).headline).toBe('Projection gap');expect(recommendationFor(r).action).toBe('REVIEW');expect(tradeSuggestionTier(r)).not.toBe('steal');
 });
 it('carries the same evidence support and source date into shared receipt data',()=>{
  const r=result({injuries:['Injured player']}),verdict=verdictFor(r),recommendation=recommendationFor(r);
  const card=dealCardData({result:r,parties:[{team_name:'A'},{team_name:'B'}],sends:[[],[]],pool:new Map(),verdict,recommendation,remarks:tradeReasons(r,{team_name:'A'},{team_name:'B'},new Map(),[],[])});
  expect(card.confidence.level).toBe('mixed');expect(card.call).toBe('REVIEW');expect(card.remarks.at(-1).copy).toContain('FantasyPros PPR ROS');expect(dealCardText(card)).toContain('Mixed support');expect(dealCardText(card)).not.toContain('Hit accept');
 });
});
