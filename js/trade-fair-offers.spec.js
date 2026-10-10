import {describe,it,expect} from 'vitest';
import {suggestTrades,suggestMultiTeamTrades,tradeSuggestionTier} from './team-analyzer.js';
import {tradeConfidence} from './trade-confidence.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
const balanced=(evidence={})=>({fairness:94,valueToA:94,valueToB:100,rosterImpactA:3,rosterImpactB:.1,weeklyDeltaA:3,weeklyDeltaB:.1,
 projectionEvidence:{missing:[],fallback:[],injuries:[],stale:[],thinSamples:[],expert:{required:true,status:'Fresh',missing:[],disagreements:[],split:[]},...evidence}});
describe('fair offer discovery',()=>{
 it('allows different roster gains on a balanced exchange without lowering the value bar',()=>{
  expect(tradeSuggestionTier(balanced())).toBe('fair');
  expect(tradeSuggestionTier({...balanced(),fairness:89})).toBe('aggressive');
  expect(tradeSuggestionTier({...balanced(),rosterImpactB:-.8})).toBe('aggressive');
  expect(tradeSuggestionTier({...balanced(),weeklyDeltaB:-1.1})).toBe('aggressive');
 });
 it.each(['disagreements','split'])('separates expert %s from asset balance while retaining review',field=>{
  const r=balanced(),offer=balanced({expert:{...r.projectionEvidence.expert,[field]:['Player']}});
  expect(tradeSuggestionTier(offer)).toBe('fair');
  expect(tradeConfidence(offer)).toMatchObject({level:'mixed',needsReview:true});
 });
 it('keeps limited samples visible as review on an otherwise balanced offer',()=>{
  const r=balanced({thinSamples:['Rookie']});expect(tradeSuggestionTier(r)).toBe('fair');
  expect(tradeConfidence(r).needsReview).toBe(true);
 });
 it.each(['missing','fallback','injuries','stale'])('does not call %s player inputs fair',field=>{
  expect(tradeSuggestionTier(balanced({[field]:['Player']}))).toBe('aggressive');
 });
 it('withholds fair for unavailable expert evidence or an unmatched player',()=>{
  const r=balanced();
  for(const expert of [{...r.projectionEvidence.expert,status:'Stale'},{...r.projectionEvidence.expert,missing:['Player']}]){
   expect(tradeSuggestionTier(balanced({expert}))).toBe('aggressive');
  }
 });
 it('spends the Fair search budget on fair offers and respects small limits',()=>{
  const {teams,pool}=tradeReviewFixture(),args={teams,pool,teamId:teams[0].id,partnerId:teams[1].id,intent:'fair',maxPlayers:2};
  const available=suggestTrades({...args,limit:200}).filter(o=>o.tier==='fair');
  expect(available.length).toBeGreaterThan(8);
  const offers=suggestTrades({...args,limit:8});
  expect(offers).toHaveLength(8);expect(offers.every(o=>o.tier==='fair')).toBe(true);
  expect(suggestTrades({...args,limit:1})).toHaveLength(1);
  expect(suggestTrades({...args,limit:0})).toEqual([]);
 });
 it('requires fair value for every participant, not just the first owner',()=>{
  const teams=['a','b','c'].map(id=>({id,playerIds:[id]}));
  const pool=new Map(teams.map((t,i)=>[t.id,{id:t.id,name:t.id,position:'WR',expectedPoints:200,tradeValue:i===1?70:100}]));
  const offers=suggestMultiTeamTrades({parties:teams,pool,maxPlayers:3,intent:'fair'});
  expect(offers).toHaveLength(1);expect(offers[0].partyBalances[0]).toBe(100);
  expect(offers[0].fairness).toBe(70);expect(offers[0].tier).toBe('aggressive');
 });
 it('prioritizes genuinely balanced multi-team offers before applying the result limit',()=>{
  const {teams,pool}=tradeReviewFixture(),args={parties:teams.slice(0,3),pool,maxPlayers:6,intent:'fair'};
  const available=suggestMultiTeamTrades({...args,limit:80}).filter(o=>o.tier==='fair');
  expect(available.length).toBeGreaterThan(0);
  const offers=suggestMultiTeamTrades({...args,limit:Math.min(4,available.length)});
  expect(offers.every(o=>o.tier==='fair')).toBe(true);
  expect(offers.every(o=>o.partyBalances.every(n=>n>=90)&&o.rosterImpacts.every(n=>n>=-.75)&&o.weeklyDeltas.every(n=>n>=-1))).toBe(true);
 });
});
