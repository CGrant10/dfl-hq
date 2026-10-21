import {describe,it,expect} from 'vitest';
import {resetTradeSearch,tradeSearchRestricted} from './trade-draft.js';
import {tradeAssessment} from './trade-assessment.js';
import {tradeOfferEmptyCopy} from './trade-workspace-ui.js';
describe('trade search restrictions and honest empty results',()=>{
 it('clears every saved search restriction without discarding the manual deal',()=>{
  const manual={sends:[new Set(['owned']),new Set(['wanted'])]},shop={partnerId:'2',memberIds:['3'],sendAnchors:['a'],receiveAnchors:['b'],sendCount:'3',receiveCount:'1',maxPlayers:4,goal:'QB',horizon:'next4',mode:'manual',setupOpen:true};
  expect(tradeSearchRestricted(shop)).toBe(true);resetTradeSearch(shop);
  expect(shop).toMatchObject({partnerId:'all',memberIds:[],sendAnchors:[],receiveAnchors:[],sendCount:'any',receiveCount:'any',maxPlayers:8,goal:'best',horizon:'season',intent:'fair',mode:'offers',setupOpen:false});
  expect(tradeSearchRestricted(shop)).toBe(false);expect([...manual.sends[0]]).toEqual(['owned']);
  resetTradeSearch(shop,{intent:'steal'});expect(shop.intent).toBe('steal');expect([...shop.openTiers]).toEqual(['steal']);
 });
 const result={fairness:70,valueToA:100,valueToB:70,weeklyDeltaA:2,incomingPositionsA:['WR'],incomingEvidence:{low:85,high:115},outgoingEvidence:{low:60,high:80},projectionEvidence:{missing:[],injuries:[],fallback:[],stale:[]}};
 it('keeps a real value edge Steal and identifies why an uncertain lookalike cannot qualify',()=>{
  expect(tradeAssessment(result)).toMatchObject({tier:'steal',stealBlockers:[]});
  const uncertain={...result,incomingEvidence:{low:65,high:115},projectionEvidence:{...result.projectionEvidence,injuries:['Player']}};
  expect(tradeAssessment(uncertain)).toMatchObject({tier:'aggressive',stealBlockers:['Injury risk','Overlapping value ranges']});
  const copy=tradeOfferEmptyCopy('steal',[],[uncertain]);expect(copy).toContain('injury uncertainty');expect(copy).toContain('overlapping player values');
 });
 it('never calls a similar-star premium or incoming QB a Steal',()=>{
  for(const override of [{comparableStarPremium:true},{incomingPositionsA:['QB']}])expect(tradeAssessment({...result,...override}).tier).toBe('aggressive');
 });
});

describe('compact Steal discovery in a crowded league search',()=>{
 it('finds evidence-supported two-for-two offers before broad shape sampling discards them',async()=>{
  const {readFileSync}=await import('node:fs');
  const {suggestTrades,tradeSuggestionTier,isPlausibleTradeSuggestion}=await import('./team-analyzer.js');
  const f=JSON.parse(readFileSync(new URL('../tools/fixtures/trade-steal-discovery.json',import.meta.url),'utf8'));
  const pool=new Map(f.players.map(p=>[p.id,p]));
  const offers=suggestTrades({...f,pool,intent:'steal',limit:132}),steals=offers.filter(o=>o.tier==='steal');
  expect(steals.length).toBeGreaterThanOrEqual(15);
  // This compact offer was excluded by the old shape budget although it
  // clears the unchanged full model. IDs and owners are anonymized.
  const rescued=steals.find(o=>o.other.id==='t6'&&o.sendA.includes('p89')&&o.sendA.includes('p86')&&o.sendB.includes('p14')&&o.sendB.includes('p5'));
  expect(rescued).toBeTruthy();
  for(const offer of steals){
   expect(tradeSuggestionTier(offer)).toBe('steal');expect(isPlausibleTradeSuggestion(offer)).toBe(true);
   expect(tradeAssessment(offer).stealBlockers).toEqual([]);
   expect(offer.incomingEvidence.low-offer.rosterCostA).toBeGreaterThan(offer.outgoingEvidence.high);
   expect(offer.incomingPositionsA).not.toContain('QB');
  }
  expect(new Set(steals.map(o=>JSON.stringify([o.other.id,[...o.sendA].sort(),[...o.sendB].sort()]))).size).toBe(steals.length);
 },20000);
});
