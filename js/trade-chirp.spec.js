import {expect,it} from 'vitest';
import {tradeDealChirp,tradeDecisionMarkup} from './trade-decision-ui.js';
const deal={valueToA:100,valueToB:100,fairness:100,weeklyDeltaA:-2,weeklyDeltaB:1,depthDeltaA:0,projectionEvidence:{expert:{required:true,status:'Fresh'},players:[]}};
it('ties the trade chirp to supported projected lineup impact',()=>{
 expect(tradeDealChirp(deal)).toContain('Projected starters get worse');
 expect(tradeDealChirp({...deal,weeklyDeltaA:4})).toContain('Projected upgrade');
 expect(tradeDealChirp({...deal,weeklyDeltaA:0})).toBe('');
});
it('withholds trash talk when projections or expert support are uncertain',()=>{
 for(const projectionEvidence of [null,{expert:{required:true,status:'Unavailable'}},{expert:{required:true,status:'Fresh'},injuries:['Player']},{expert:{required:true,status:'Fresh'},missing:['Player']}])expect(tradeDealChirp({...deal,projectionEvidence})).toBe('');
});
it('keeps every risk accessible while limiting the default row to one flag',()=>{
 const html=tradeDecisionMarkup({...deal,projectionEvidence:{missing:['A'],injuries:['B'],stale:['C']}},new Map());
 expect(html).toContain('<span>Missing projections</span>');expect(html).toContain('<summary>+2 more</summary>');expect(html).toContain('Injury risk');expect(html).toContain('Stale inputs');expect(html).not.toContain('td-deal-chirp');
});
