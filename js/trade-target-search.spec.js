import {it,expect} from 'vitest';
import {targetedTradePackages} from './trade-target-search.js';
import {packageValue} from './trade-player-evidence.js';
import {evaluateTrade} from './team-analyzer.js';
const pool=new Map([
 ...[40,30,25,20].map((tradeValue,i)=>({id:`q${i}`,position:'QB',tradeValue,oneQbValueFactor:.35})),
 ...[39,23,12,9,5].map((tradeValue,i)=>({id:`w${i}`,position:'WR',tradeValue})),
 {id:'other-format',position:'QB',tradeValue:17},
].map(p=>[p.id,p]));
const players=[...pool.values()];
const combos=(ids,count)=>!count?[[]]:ids.flatMap((id,i)=>combos(ids.slice(i+1),count-1).map(rest=>[id,...rest]));
it('finds the discounted QB package near a target rather than a misleading raw sum',()=>{
 const rows=targetedTradePackages(players,3,['q0'],pool,[55]);
 expect(packageValue(rows[0],pool)).toBe(55);
 expect(rows[0]).toEqual(expect.arrayContaining(['q0','q1','w3']));
 expect(rows[0].reduce((sum,id)=>sum+pool.get(id).tradeValue,0)).toBe(79);
});
it('matches exhaustive price neighborhoods across cardinalities, locks and non-additive QB saturation',()=>{
 const subset=players.slice(0,8),ids=subset.map(p=>p.id);
 for(const locked of [[],['q0'],['q1','q2']])for(let size=Math.max(1,locked.length);size<=5;size++){
  const possible=combos(ids.filter(id=>!locked.includes(id)),size-locked.length).map(ids=>[...locked,...ids]);
  for(const target of [0,26,48,71,100,180]){
   const rows=targetedTradePackages(subset,size,locked,pool,[target],80);
   const closest=Math.min(...possible.map(ids=>Math.abs(packageValue(ids,pool)-target)));
   expect(Math.abs(packageValue(rows[0],pool)-target)).toBeCloseTo(closest);
   for(const ids of rows){expect(ids).toHaveLength(size);expect(new Set(ids).size).toBe(size);expect(ids).toEqual(expect.arrayContaining(locked));}
  }
 }
});
it('keeps a bounded, deduplicated result and respects impossible requests',()=>{
 const rows=targetedTradePackages(players,5,['q0'],pool,[50,51,52],9);
 expect(rows.length).toBeLessThanOrEqual(9);expect(new Set(rows.map(ids=>[...ids].sort().join(','))).size).toBe(rows.length);
 expect(targetedTradePackages(players,1,['q0','q1'],pool,[50])).toEqual([]);
 expect(targetedTradePackages(players,11,[],pool,[50])).toEqual([]);
 expect(targetedTradePackages(players,1,['q0'],pool,[50],0)).toEqual([]);
});
it('quotes the same whole package price as the final trade check',()=>{
 const priced=new Map([...pool].map(([id,p])=>[id,{...p,expectedPoints:p.position==='QB'?340:204,tradePerGame:p.position==='QB'?20:12,modelSource:'projection'}]));
 const ids=targetedTradePackages([...priced.values()].filter(p=>p.id!=='w0'),3,['q0'],priced,[55])[0];
 const result=evaluateTrade({teamA:{id:'a',playerIds:['w0']},teamB:{id:'b',playerIds:ids},sendA:['w0'],sendB:ids,pool:priced});
 expect(result.valueToA).toBe(packageValue(ids,priced));expect(result.valueToA).toBe(55);
});
