import {it,expect} from 'vitest';
import {startSitContent,startSitSummary} from './start-sit-ui.js';
it('distinguishes unavailable data, missing slots, unset and a held lineup',()=>{
 expect(startSitSummary({lineupIsSet:true,unknownStarters:[{name:'Pending'}]})).toBe('Projections pending');
 expect(startSitSummary({lineupIsSet:true,emptySlots:['RB']})).toBe('Finish your lineup');
 expect(startSitSummary({lineupIsSet:false})).toBe('Set your lineup');
 expect(startSitSummary({lineupIsSet:true})).toBe('Hold your lineup');
 expect(startSitContent({lineupIsSet:true,unknownStarters:[{name:'Pending'}]})).not.toContain('No clear upgrade');
});
it('shows an actionable injury replacement once and keeps actual scores out of the projection label',()=>{
 const out={id:'out',name:'Inactive',position:'RB',points:0},start={id:'in',name:'Replacement',position:'RB',points:12};
 const html=startSitContent({lineupIsSet:true,alarms:[{player:out,reason:'listed Out'}],swaps:[{in:start,out,gain:12,urgent:true}]});
 expect(html).toContain('Replace now');expect(html).not.toContain('no projected replacement');expect(html).toContain('START');expect(html).toContain('BENCH');
});
it('uses a later injury backup and escapes names in move instructions',()=>{
 const start={id:'1',name:'<Start>',position:'RB',points:20,isRisky:true},out={id:'2',name:'Sit',position:'RB',points:10};
 const html=startSitContent({lineupIsSet:true,swaps:[{in:start,out,gain:10,backup:{name:'<Backup>',points:12},reassign:[{player:{name:'<Flex>'},to:'RB'}]}]});
 expect(html).toContain('&lt;Backup&gt;');expect(html).toContain('Set &lt;Flex&gt; at RB');expect(html).not.toContain('<Start>');
});
