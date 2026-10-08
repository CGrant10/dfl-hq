// Destinations use stable team/player IDs, so adding a member cannot redirect a deal.
export function tradeTransfers(teams=[],sends=[],destinations=null){
 if(teams.length<2||teams.length!==sends.length||teams.some(t=>!t||!Array.isArray(t.playerIds))||new Set(teams.map(t=>String(t.id))).size!==teams.length)return null;
 const indexes=new Map(teams.map((t,i)=>[String(t.id),i])),seen=new Set(),receives=teams.map(()=>[]),routes={};
 if(sends.some(ids=>!Array.isArray(ids)&&!(ids instanceof Set)))return null;
 const packages=sends.map(ids=>[...ids].map(String));
 for(let i=0;i<teams.length;i++){
  if(!packages[i].length)return null;
  const owned=new Set(teams[i].playerIds.map(String));
  for(const id of packages[i]){
   if(!owned.has(id)||seen.has(id))return null;seen.add(id);
   const to=destinations==null?String(teams[(i+1)%teams.length].id):String(destinations[id]??'');
   if(!indexes.has(to)||indexes.get(to)===i)return null;
   routes[id]=to;receives[indexes.get(to)].push(id);
  }
 }
 if(receives.some(ids=>!ids.length))return null;
 return {sends:packages,receives,destinations:routes};
}

export function reconcileTradeDestinations(teams=[],sends=[],destinations={}){
 const routes={};
 teams.forEach((team,i)=>{for(const raw of sends[i]||[]){const id=String(raw),existing=String(destinations?.[id]??'');
  routes[id]=teams.some(t=>String(t.id)===existing&&String(t.id)!==String(team.id))?existing:teams.length>2&&Object.hasOwn(destinations||{},id)?'':String(teams[(i+1)%teams.length]?.id??'');
 }});
 return routes;
}

export function tradePerspective(result){
 if(!Array.isArray(result?.values))return result;
 const last=result.values.length-1,others=values=>result.receives?(values||[]).slice(1).reduce((sum,v)=>sum+Number(v||0),0):values?.[last];
 return {...result,fairness:result.partyBalances?.[0]??result.fairness,valueToA:result.values[0],valueToB:result.outgoingValues?.[0]??result.values[1],
  incomingEvidence:result.incomingEvidence?.[0],outgoingEvidence:result.outgoingEvidence?.[0],comparableStarPremium:Array.isArray(result.comparableStarPremium)?result.comparableStarPremium[0]:result.comparableStarPremium,
  weeklyDeltaA:result.weeklyDeltas[0],weeklyDeltaB:others(result.weeklyDeltas),depthDeltaA:result.depthDeltas?.[0],depthDeltaB:others(result.depthDeltas),
  rosterImpactA:result.rosterImpacts?.[0],rosterImpactB:others(result.rosterImpacts),usefulIncomingA:result.usefulIncoming?.[0],surplusIncomingA:result.surplusIncoming?.[0],cutIncomingA:result.cutIncoming?.[0]};
}
