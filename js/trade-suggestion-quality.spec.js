import {it,expect} from 'vitest';
import {compareTradeSuggestions} from './trade-suggestion-quality.js';
const offer=(size,score=100,extra={})=>({sendA:Array.from({length:size-1},(_,i)=>String(i)),sendB:['r'],score,fairness:92,utility:{group:4,score:22},...extra});
it('ranks a simpler comparable deal before a padded package without changing its grade',()=>{
 const small=offer(3),large=offer(8,500),before=structuredClone([small,large]);expect([large,small].sort(compareTradeSuggestions)).toEqual([small,large]);expect([small,large]).toEqual(before);
});
it('preserves materially better fit, quality, price and lower risk ahead of simplicity',()=>{
 const small=offer(2);for(const extra of [{utility:{group:5,score:22}},{utility:{group:4,score:45}},{fairness:100}])expect(compareTradeSuggestions(offer(8,100,extra),small)).toBeLessThan(0);
 expect(compareTradeSuggestions(offer(2,100,{projectionEvidence:{injuries:['r']}}),offer(4))).toBeGreaterThan(0);
});
it('sorts two- and three-team packages consistently without pairwise threshold cycles',()=>{
 const rows=Array.from({length:12},(_,i)=>offer(2+i%7,100+i,{fairness:85+i,utility:{group:3+i%2,score:18+i}}));rows.push({...offer(6),sends:[['a'],['b','c'],['d']]});
 const sorted=[...rows].sort(compareTradeSuggestions);for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++)expect(compareTradeSuggestions(sorted[i],sorted[j])).toBeLessThanOrEqual(0);
});
