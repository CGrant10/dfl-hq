import {tradePackageEdits} from './trade-package-edits.js';
import {tradeSuggestionQuality} from './trade-suggestion-quality.js';

const key=row=>JSON.stringify([String(row.other.id),[...row.sendA].sort(),[...row.sendB].sort()]);

export function balanceTradeSuggestions(offers,{mine,pool,shapes,maxPlayers,sendRequired=[],receiveRequired=[],evaluate,budget=120}){
 const seen=new Set(offers.map(key)),groups=new Map(),repaired=[];
 for(const row of offers.filter(row=>row.fairness>=72&&row.fairness<90).sort((a,b)=>b.fairness-a.fairness)){
  const id=String(row.other.id);if(!groups.has(id))groups.set(id,[]);
  const seeds=groups.get(id);if(seeds.length<3&&!seeds.some(s=>s.shape===row.shape))seeds.push(row);
 }
 const perPartner=Math.max(1,Math.floor(budget/Math.max(1,groups.size)));
 let spent=0;
 for(const seeds of groups.values()){
  let partnerSpent=0;
  for(const row of seeds){
   const state={parties:[mine,row.other],sends:[row.sendA,row.sendB],destinations:Object.fromEntries([...row.sendA.map(id=>[id,String(row.other.id)]),...row.sendB.map(id=>[id,String(mine.id)])])};
   const edits=tradePackageEdits(state,pool,{lockedIds:[...sendRequired,...receiveRequired],maxPlayers});
   for(const edit of edits){
    if(spent>=budget||partnerSpent>=perPartner)break;
    const [sendA,sendB]=edit.sends,shape=`${sendA.length}-${sendB.length}`;
    if(edit.proximity<.895||!shapes.has(shape))continue;
    const candidate={other:row.other,sendA,sendB,shape};
    const id=key(candidate);if(seen.has(id))continue;seen.add(id);
    spent++;partnerSpent++;
    const result=evaluate(candidate);
    if(result?.tier==='fair'&&tradeSuggestionQuality(result).group>=Math.max(1,tradeSuggestionQuality(row).group))repaired.push({...result,balancedFrom:{sendA:row.sendA,sendB:row.sendB}});
   }
  }
 }
 return repaired;
}
