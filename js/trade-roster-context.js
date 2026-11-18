const n=value=>Number.isFinite(Number(value))?Number(value):0;
const rate=p=>n(p?.tradePerGame??p?.expectedPerGame??n(p?.expectedPoints)/17);
const usable=p=>p&&!p.outForSeason&&!p.isOut&&rate(p)>0;
const slots={RB:2,WR:2,TE:1};
const round=value=>Math.round(value*100)/100;

// Roster-specific insurance stays separate from a player's market price.
export function tradeRosterContext(original,next,pool,{before,after}={}){
 const old=new Set(original.map(String)),kept=new Set(next.map(String));
 const players=ids=>[...ids].map(id=>pool.get(id)).filter(Boolean);
 const previous=players(old),current=players(kept),depth=[],lostHandcuffs=[],gainedHandcuffs=[];
 let depthPenalty=0;
 for(const [position,count] of Object.entries(slots)){
  const cover=roster=>roster.filter(p=>p.position===position&&usable(p)).sort((a,b)=>rate(b)-rate(a));
  const was=cover(previous),now=cover(current);
  const reserves=list=>Math.max(0,list.length-count);
  const from=reserves(was),to=reserves(now),oldReserve=was[count],newReserve=now[count];
  // Ignore expendable fringe bodies; recognize a usable last reserve.
  if(to<from&&oldReserve&&rate(oldReserve)>=4&&n(oldReserve.tradeValue)>=5){
   const gap=Math.max(0,rate(oldReserve)-rate(newReserve));
   const penalty=Math.min(1.5,(to===0?.5:.15)+gap*.1)*({RB:1,WR:.6,TE:.25}[position]);
   depth.push({position,before:from,after:to,availableBefore:was.length,availableAfter:now.length,penalty:round(penalty)});depthPenalty+=penalty;
  }
 }
 const pair=p=>p.position==='RB'&&p.handcuffForId&&usable(p)&&!pool.get(String(p.handcuffForId))?.outForSeason&&pool.get(String(p.handcuffForId))?.nflTeam===p.nflTeam;
 for(const backup of previous.filter(pair)){
  const starter=pool.get(String(backup.handcuffForId));
  if(old.has(String(starter.id))&&kept.has(String(starter.id))&&!kept.has(String(backup.id)))lostHandcuffs.push({playerId:backup.id,starterId:starter.id,penalty:starter.isOut||starter.isRisky?1.75:1});
 }
 for(const backup of current.filter(pair)){
  if(kept.has(String(backup.handcuffForId))&&!(old.has(String(backup.id))&&old.has(String(backup.handcuffForId))))gainedHandcuffs.push({playerId:backup.id,starterId:backup.handcuffForId});
 }
 const penalty=round(Math.min(3.5,depthPenalty+lostHandcuffs.reduce((sum,p)=>sum+p.penalty,0)));
 const gain=Math.min(.6,gainedHandcuffs.length*.4);
 const incoming=current.filter(p=>!old.has(String(p.id)));
 const starterIds=new Set((after?.starters||[]).map(p=>String(p.id)));
 const needPositions=new Set(Object.entries(slots).filter(([position,count])=>previous.filter(p=>p.position===position&&usable(p)).length<=count).map(([p])=>p));
 const fillsNeed=incoming.some(p=>needPositions.has(p.position)&&starterIds.has(String(p.id)));
 return {depth,lostHandcuffs,gainedHandcuffs,penalty,gain,fillsNeed,weeklyGain:before&&after?round((after.starterPoints-before.starterPoints)/17):null};
}
export function tradeSafeguards(result){return Array.isArray(result?.rosterSafeguards)?result.rosterSafeguards:[];}
export function tradeAdjustedImpacts(result){
 const raw=result.rosterImpacts||[result.rosterImpactA??n(result.weeklyDeltaA)+n(result.depthDeltaA)*.35,result.rosterImpactB??n(result.weeklyDeltaB)+n(result.depthDeltaB)*.35];
 return raw.map((value,i)=>n(value)-n(tradeSafeguards(result)[i]?.penalty)+n(tradeSafeguards(result)[i]?.gain));
}
export function worthwhileTradeCoverage(result,{firstOnly=false}={}){
 const weekly=result.windowDeltas||result.weeklyDeltas||[result.weeklyDeltaA,result.weeklyDeltaB];
 return tradeSafeguards(result).every((context,i)=>firstOnly&&i>0||!context.lostHandcuffs?.length||context.gainedHandcuffs?.length
  ||n(weekly[i])>Math.max(.75,n(context.penalty)*.65));
}
export function safeBalancedTrade(result){
 const weekly=result.windowDeltas||result.weeklyDeltas||[result.weeklyDeltaA,result.weeklyDeltaB];
 return result.fairness>=90&&(result.netFairness??result.fairness)>=90&&!result.projectionEvidence?.missing?.length
  &&worthwhileTradeCoverage(result)&&tradeAdjustedImpacts(result).every(value=>value>=-.75)&&weekly.every(value=>n(value)>=-1)
  &&!result.cutIncomingA?.length&&!result.cutIncomingB?.length&&!result.cutIncoming?.some(ids=>ids.length);
}
