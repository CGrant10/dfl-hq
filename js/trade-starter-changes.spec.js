import {expect,it} from 'vitest';
import {lineupSlotChanges,lineupComparisonMarkup} from './trade-workspace-ui.js';
import {evaluateTradeDeal,lineupPreviewsFor} from './trade-workspace.js';
import {tradeReviewFixture} from '../tools/trade-review-fixture.mjs';
it('distinguishes a true starter change from the same starter object being refreshed',()=>{
 const rows=lineupSlotChanges({before:[{slot:'RB1',player:{id:'1'}},{slot:'TE',player:null}],after:[{player:{id:'1',name:'Updated name'}},{player:{id:'2'}}]});
 expect(rows).toEqual([{slot:'TE',before:null,after:{id:'2'}}]);
});
it('shows the same legal roster and required cuts as the existing evaluator, retaining every full lineup',()=>{
 const data=tradeReviewFixture(),teams=data.teams.slice(0,2);
 const deal=evaluateTradeDeal(teams,[['1-4'],['2-1']],data.pool);
 expect(deal).not.toBeNull();
 const previews=lineupPreviewsFor(deal,data.pool),html=lineupComparisonMarkup(deal,data.pool);
 expect(html).toContain('data-td-lineup-impact');expect(html).toContain('Full before &amp; after lineups');
 expect((html.match(/class="td-lineup-slot/g)||[]).length).toBe(previews.length*7);
 for(const p of previews)for(const change of lineupSlotChanges(p))expect(html).toContain(change.after?.name||'Empty slot');
});
