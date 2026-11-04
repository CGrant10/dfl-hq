import {packageValue} from './trade-player-evidence.js';

// Exact cardinality bounds: additional one-QB players are not additive. For
// each possible QB count, monotonic pricing makes the cheapest/dearest subset
// the bound. Cache suffixes once instead of enumerating roster combinations.
function packageBounds(ids,suffix,count,pool){
 if(!count){const value=packageValue(ids,pool);return [value,value];}
 let low=Infinity,high=-Infinity;
 for(let q=Math.max(0,count-suffix.other.length);q<=Math.min(count,suffix.qbs.length);q++){
  const other=count-q;
  low=Math.min(low,packageValue([...ids,...suffix.qbs.slice(0,q)],pool)+suffix.low[other]);
  high=Math.max(high,packageValue([...ids,...(q?suffix.qbs.slice(-q):[])],pool)+suffix.high[other]);
 }
 return [low,high];
}

// A bounded beam aimed at price neighborhoods, alongside the broad sampler.
export function targetedTradePackages(players,size,required,pool,targets=[],cap=50){
 const locked=[...new Set(required.map(String))],needed=size-locked.length;
 if(needed<0||!targets.length||cap<=0)return [];
 if(!needed)return [locked];
 const options=players.map(p=>String(p.id)).filter(id=>!locked.includes(id));
 if(needed>options.length)return [];
 const suffixes=options.map((_,index)=>{
  const qbs=[],other=[];
  for(const id of options.slice(index+1)){
   const p=pool.get(id);(p?.position==='QB'&&p.oneQbValueFactor!=null?qbs:other).push(id);
  }
  const byPrice=(a,b)=>(Number(pool.get(a)?.tradeValue)||0)-(Number(pool.get(b)?.tradeValue)||0);
  qbs.sort(byPrice);other.sort(byPrice);
  const sums=rows=>rows.reduce((s,id)=>[...s,s.at(-1)+(Number(pool.get(id)?.tradeValue)||0)],[0]);
  return {qbs,other,low:sums(other),high:sums([...other].reverse())};
 });
 const result=new Map(),perTarget=Math.max(4,Math.floor(cap/targets.length));
 for(const target of targets){
  let beam=[{ids:locked,value:packageValue(locked,pool),last:-1}];
  for(let step=0;step<needed;step++){
   const remaining=needed-step-1;
   beam=beam.flatMap(row=>options.slice(row.last+1,options.length-remaining).map((id,j)=>{const ids=[...row.ids,id];return {ids,value:packageValue(ids,pool),last:row.last+1+j};}))
    .map(row=>{
     const [low,high]=packageBounds(row.ids,suffixes[row.last],remaining,pool);
     return {...row,gap:target<low?low-target:target>high?target-high:0};
    }).sort((a,b)=>a.gap-b.gap||Math.abs(a.value-target*(step+1)/needed)-Math.abs(b.value-target*(step+1)/needed)||a.last-b.last).slice(0,Math.max(24,perTarget*2));
  }
  for(const row of beam.sort((a,b)=>Math.abs(a.value-target)-Math.abs(b.value-target)).slice(0,perTarget))result.set([...row.ids].sort().join(','),row.ids);
 }
 return [...result.values()].slice(0,cap);
}

export function tradeGoalScore(result,goal='best',pool=new Map()){
 const gain=Number(result.weeklyDeltaA)||0;
 const incoming=result.sendB||result.receives?.[0]||[];
 const starters=result.startingIncomingA||result.startingIncoming?.[0]||[];
 if(goal==='starter')return gain>0?gain*18:-30;
 if(goal==='consolidate')return result.sendA?.length>incoming.length&&starters.length?12+gain*15:-25;
 if(['RB','WR','TE','QB'].includes(goal))return incoming.some(id=>pool.get(String(id))?.position===goal)?gain*12+8:-40;
 return gain*6;
}
