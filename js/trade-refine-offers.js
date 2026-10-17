import {tradePackageEdits} from './trade-package-edits.js';
import {compareTradeSuggestions} from './trade-suggestion-quality.js';

const key=row=>JSON.stringify([String(row.other.id),[...row.sendA].sort(),[...row.sendB].sort()]);
// Explore nearby legal packages after the broad sampler. Every edited deal
// goes through the full valuation, evidence and roster model before display.
export function refineTradeOffers(offers,{mine,pool,intent,shapes,maxPlayers,sendRequired=[],receiveRequired=[],evaluate,budget=160}){
 if(intent==='fair')return [];
 const seen=new Set(offers.map(key)),groups=new Map(),found=[];
 for(const row of [...offers].sort(compareTradeSuggestions)){
  if(row.fairness<55||row.weeklyDeltaA<-.75||row.weeklyDeltaB< -2.5)continue;
  const partner=String(row.other.id);if(!groups.has(partner))groups.set(partner,[]);
  const seeds=groups.get(partner);if(seeds.length<3&&!seeds.some(s=>s.shape===row.shape))seeds.push(row);
 }
 const perPartner=Math.max(1,Math.floor(budget/Math.max(1,groups.size)));
 let spent=0;
 for(const seeds of groups.values()){
  let partnerSpent=0;
  for(const row of seeds){
   const state={parties:[mine,row.other],sends:[row.sendA,row.sendB],destinations:Object.fromEntries([...row.sendA.map(id=>[id,String(row.other.id)]),...row.sendB.map(id=>[id,String(mine.id)])])};
   const edits=tradePackageEdits(state,pool,{lockedIds:[...sendRequired,...receiveRequired],maxPlayers})
    .map(edit=>{const sums=edit.sends.map(ids=>ids.reduce((n,id)=>n+(Number(pool.get(id)?.tradeValue)||0),0));return {...edit,ratio:sums[1]/Math.max(1,sums[0])};})
    .filter(edit=>edit.ratio>=1.05&&edit.ratio<=2.2&&shapes.has(edit.sends.map(ids=>ids.length).join('-')))
    .sort((a,b)=>Math.abs(a.ratio-(intent==='steal'?1.4:1.15))-Math.abs(b.ratio-(intent==='steal'?1.4:1.15)));
   for(const edit of edits){
    if(spent>=budget||partnerSpent>=perPartner)break;
    const [sendA,sendB]=edit.sends,candidate={other:row.other,sendA,sendB,shape:`${sendA.length}-${sendB.length}`},id=key(candidate);
    if(seen.has(id))continue;seen.add(id);spent++;partnerSpent++;
    const result=evaluate(candidate);
    if(result?.tier===intent)found.push(result);
   }
  }
 }
 return found;
}
