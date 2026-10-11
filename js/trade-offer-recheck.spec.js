import {describe,it,expect} from 'vitest';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
import {evaluateTradeDeal} from './trade-workspace.js';
import {recheckTradeOffer} from './trade-offer-recheck.js';
import {tradeSuggestionTier} from './team-analyzer.js';
const fixture=()=>{const {teams,pool}=tradeReviewFixture();return {teams,pool,deal:evaluateTradeDeal(teams.slice(0,3),[['1-1','1-3'],['2-1'],['3-3']],pool,{'1-1':'2','1-3':'3','2-1':'1','3-3':'1'})};};
describe('fresh trade sharing',()=>{
 it('regrades all legs and preserves split recipients and latest team names',()=>{const f=fixture(),teams=f.teams.map(t=>({...t,team_name:'Current '+t.id})),review=recheckTradeOffer(f.deal,f.pool,teams,f.pool);expect(review.status).toBe('ready');expect(review.deal.destinations).toEqual(f.deal.destinations);expect(review.deal.parties[0].team_name).toBe('Current 1');});
 it('blocks a selected player who moved to another roster',()=>{const f=fixture(),teams=f.teams.map(t=>({...t,playerIds:t.playerIds.filter(id=>id!=='1-1')}));teams[1].playerIds.push('1-1');expect(recheckTradeOffer(f.deal,f.pool,teams,f.pool).status).toBe('invalid');});
 it('requires review for a new injury or reserve designation',()=>{const f=fixture(),pool=new Map(f.pool);pool.set('2-1',{...pool.get('2-1'),injuryStatus:'Out',isOut:true});expect(recheckTradeOffer(f.deal,f.pool,f.teams,pool).status).toBe('changed');});
 it('requires review when a formerly injured player is healthy again',()=>{const f=fixture(),previous=new Map(f.pool);previous.set('2-1',{...previous.get('2-1'),injuryStatus:'Questionable',isRisky:true});expect(recheckTradeOffer(f.deal,previous,f.teams,f.pool).status).toBe('changed');});
 it('requires review when expert support becomes stale even if prices and the Fair tier stay unchanged',()=>{
  const f=fixture(),previous=new Map([...f.pool].map(([id,p])=>[id,{...p,expertFeedStatus:'Fresh',expert:{rank:20},expertSource:'FantasyPros',expertCount:8}]));
  const pool=new Map([...previous].map(([id,p])=>[id,{...p,expertFeedStatus:'Stale'}]));
  const deal=evaluateTradeDeal(f.teams.slice(0,2),[['1-4'],['2-4']],previous);
  const review=recheckTradeOffer(deal,previous,f.teams,pool);
  expect(review.deal.result.fairness).toBe(deal.result.fairness);
  expect(tradeSuggestionTier(deal.result)).toBe('fair');
  expect(tradeSuggestionTier(review.deal.result)).toBe('fair');
  expect(review.status).toBe('changed');
 });
});
