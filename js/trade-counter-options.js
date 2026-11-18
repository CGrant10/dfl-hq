import {safeBalancedTrade,tradeAdjustedImpacts,tradeSafeguards} from './trade-roster-context.js';
const n=value=>Number(value)||0;
const signature=deal=>JSON.stringify([deal.sends.map(ids=>[...ids].sort()),Object.entries(deal.destinations).sort(([a],[b])=>a.localeCompare(b))]);
const edits=(row,original)=>row.sends.reduce((sum,ids,i)=>sum+ids.filter(id=>!original.sends[i].includes(id)).length+original.sends[i].filter(id=>!ids.includes(id)).length,0);
export function counterCoreCost(row,original,pool){
 const starters=new Set(original.parties[0].lineup?.starters?.map(p=>String(p.id))||[]);
 const best=[...original.parties[0].playerIds].sort((a,b)=>n(pool.get(b)?.tradeValue)-n(pool.get(a)?.tradeValue)).slice(0,3);
 return row.sends[0].reduce((sum,id)=>sum+(starters.has(id)||best.includes(id)?n(pool.get(id)?.tradeValue):0),0)
  +n(tradeSafeguards(row.result)[0]?.penalty)*50;
}
// Show distinct, fully re-evaluated options; never manufacture three duplicates.
export function chooseCounterOptions(rows,original,pool,limit=3){
 const unique=[...new Map(rows.map(row=>[signature(row),row])).values()].filter(row=>signature(row)!==signature(original));
 const balanced=unique.filter(row=>safeBalancedTrade(row.result));
 const fairScore=row=>n(row.result.netFairness??row.result.fairness)+Math.min(0,...tradeAdjustedImpacts(row.result))*12;
 const bestScore=Math.max(-Infinity,...unique.map(fairScore));
 const candidates=balanced.length?balanced:unique.filter(row=>fairScore(row)>=bestScore-5);
 const improvement=row=>n(row.result.windowDeltas?.[0]??row.result.weeklyDeltas?.[0]??row.result.weeklyDeltaA)-n(tradeSafeguards(row.result)[0]?.penalty)+n(tradeSafeguards(row.result)[0]?.gain);
 const remaining=new Set(candidates),selected=[];
 const take=(label,compare)=>{
  if(!remaining.size||selected.length>=limit)return;
  const row=[...remaining].sort(compare)[0];remaining.delete(row);
  selected.push({...row,counterLabel:label,counterKind:safeBalancedTrade(row.result)?'fair':'closest'});
 };
 take(balanced.length?'Closest fair counter':'Closest available',(a,b)=>edits(a,original)-edits(b,original)||fairScore(b)-fairScore(a));
 take('Best team improvement',(a,b)=>improvement(b)-improvement(a)||fairScore(b)-fairScore(a)||edits(a,original)-edits(b,original));
 take('Keep your core',(a,b)=>counterCoreCost(a,original,pool)-counterCoreCost(b,original,pool)||fairScore(b)-fairScore(a)||edits(a,original)-edits(b,original));
 const core=selected.find(row=>row.counterLabel==='Keep your core');
 if(core&&counterCoreCost(core,original,pool)>counterCoreCost(original,original,pool))core.counterLabel='Different package';
 const best=selected.find(row=>row.counterLabel==='Best team improvement');
 if(best&&n(best.result.windowDeltas?.[0]??best.result.weeklyDeltas?.[0]??best.result.weeklyDeltaA)<=.1)best.counterLabel='Best available fit';
 return selected;
}
