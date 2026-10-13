const value=(ids,pool)=>ids.reduce((sum,id)=>sum+(Number(pool.get(String(id))?.tradeValue)||0),0);

// A bounded beam aimed at price neighborhoods, alongside the broad sampler.
export function targetedTradePackages(players,size,required,pool,targets=[],cap=50){
 const locked=[...new Set(required.map(String))],needed=size-locked.length;
 if(needed<0||!targets.length)return [];
 if(!needed)return [locked];
 const options=players.map(p=>String(p.id)).filter(id=>!locked.includes(id));
 if(needed>options.length)return [];
 const result=new Map(),perTarget=Math.max(4,Math.floor(cap/targets.length));
 for(const target of targets){
  let beam=[{ids:locked,value:value(locked,pool),last:-1}];
  for(let step=0;step<needed;step++){
   const remaining=needed-step-1;
   beam=beam.flatMap(row=>options.slice(row.last+1,options.length-remaining).map((id,j)=>({ids:[...row.ids,id],value:row.value+value([id],pool),last:row.last+1+j})))
    .map(row=>{
     const available=options.slice(row.last+1).map(id=>value([id],pool)).sort((a,b)=>a-b);
     const low=row.value+available.slice(0,remaining).reduce((a,b)=>a+b,0);
     const high=row.value+(remaining?available.slice(-remaining).reduce((a,b)=>a+b,0):0);
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
