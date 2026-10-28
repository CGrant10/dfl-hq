import {expect,it} from 'vitest';
import {offerLineupMarkup} from './trade-offer-preview.js';
import {evaluateTradeDeal,lineupPreviewsFor} from './trade-workspace.js';
import {lineupSlotChanges} from './trade-workspace-ui.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';

it('matches the legal before/after lineups rather than treating every incoming player as a starter',()=>{
 const {teams,pool}=tradeReviewFixture(),parties=teams.slice(0,2),sends=[['1-4'],['2-1']];
 const deal=evaluateTradeDeal(parties,sends,pool),html=offerLineupMarkup({other:parties[1],sendA:sends[0],sendB:sends[1]},parties[0],pool);
 expect(html).toContain('Rest-of-season starters');
 const changes=lineupPreviewsFor(deal,pool).flatMap(lineupSlotChanges);
 expect((html.match(/class="tb-preview-slot"/g)||[]).length).toBe(changes.length);
 for(const change of changes){if(change.before)expect(html).toContain(`data-player-card="${change.before.id}"`);if(change.after)expect(html).toContain(`data-player-card="${change.after.id}"`);}
});
it('honors explicit three-team routes and includes every participating team',()=>{
 const {teams,pool}=tradeReviewFixture(),parties=teams.slice(0,3),sends=[['1-4','1-3'],['2-6'],['3-3']],destinations={'1-4':'3','1-3':'2','2-6':'1','3-3':'1'};
 const deal=evaluateTradeDeal(parties,sends,pool,destinations),html=offerLineupMarkup({...deal.result,parties,sends,destinations},parties[0],pool);
 expect((html.match(/<section>/g)||[]).length).toBe(3);
 for(const delta of deal.result.weeklyDeltas)expect(html).toContain(`${delta>0?'+':delta<0?'−':''}${Math.abs(delta).toFixed(1)} pts/wk`);
 for(const change of lineupPreviewsFor(deal,pool).flatMap(lineupSlotChanges))if(change.after)expect(html).toContain(`data-player-card="${change.after.id}"`);
 expect(offerLineupMarkup({parties,sends,destinations:{...destinations,'3-3':'99'}},parties[0],pool)).toContain('Rosters changed');
});
it('refuses transferred players and escapes names in an otherwise valid offer',()=>{
 const {teams,pool}=tradeReviewFixture(),offer={other:teams[1],sendA:['1-4'],sendB:['2-1']};
 pool.set('2-1',{...pool.get('2-1'),name:'<img src=x onerror=alert(1)>'});
 expect(offerLineupMarkup(offer,teams[0],pool)).toContain('&lt;img');
 teams[1].playerIds=teams[1].playerIds.filter(id=>id!=='2-1');
 expect(offerLineupMarkup(offer,teams[0],pool)).toContain('Rosters changed');
});
