const n=value=>Number.isFinite(Number(value))?Number(value):0;
const cap=value=>Math.max(-5,Math.min(8,n(value)));

export function tradeLineupFitLabel(deltas){
 const gains=deltas.map(n),many=gains.length>2;
 if(gains.every(v=>v>.1))return many?'Helps every lineup':'Helps both lineups';
 if(gains.every(v=>v<-.1))return many?'Every lineup loses':'Both lineups lose';
 if(gains[0]<-.1)return 'Your lineup loses';
 if(gains.slice(1).some(v=>v<-.1))return many?'A partner’s lineup loses':'Their lineup loses';
 if(gains[0]>.1)return 'Your lineup improves';
 if(gains.slice(1).some(v=>v>.1))return many?'A partner’s lineup improves':'Their lineup improves';
 return 'Starters stay even';
}

// Starter gains come first. A pile of bench value cannot hide a damaged
// lineup, and an exact-price lateral swap is not automatically useful.
export function tradeSuggestionQuality(result){
 const weekly=result.windowDeltas||result.weeklyDeltas||[result.weeklyDeltaA,result.weeklyDeltaB];
 const fit=result.windowDeltas||result.rosterImpacts||[result.rosterImpactA??result.weeklyDeltaA,result.rosterImpactB??result.weeklyDeltaB];
 const gains=weekly.map(n),impacts=fit.map(n),least=Math.min(...gains),leastFit=Math.min(...impacts);
 const group=least<-.75||leastFit<-.75?0:gains.every(v=>v>.1)?4:impacts.every(v=>v>.1)&&least>=-.1?3:gains.some(v=>v>.1)&&least>=-.1?2:gains[0]>.1&&gains.reduce((a,b)=>a+b,0)>.2?1.5:1;
 const risk=result.projectionEvidence;
 const riskCount=['missing','stale','fallback','injuries'].reduce((sum,key)=>sum+(risk?.[key]?.length||0),0);
 return {group,score:Math.min(...impacts.map(cap))*12+gains.map(cap).reduce((a,b)=>a+b,0)*5+impacts.map(cap).reduce((a,b)=>a+b,0)*2-riskCount*2};
}

const packageSize=offer=>Array.isArray(offer.sends)?offer.sends.reduce((n,ids)=>n+ids.length,0):(offer.sendA?.length||0)+(offer.sendB?.length||0);
const riskCount=offer=>['missing','stale','fallback','injuries'].reduce((n,key)=>n+(offer.projectionEvidence?.[key]?.length||0),0);
export function compareTradeSuggestions(a,b){
 const qa=a.utility||tradeSuggestionQuality(a),qb=b.utility||tradeSuggestionQuality(b);
 // Fixed bands keep sorting transitive. Simplicity only breaks a comparable
 // fit/price band; a materially stronger lineup still wins its higher band.
 return qb.group-qa.group
  ||Math.floor(qb.score/10)-Math.floor(qa.score/10)
  ||Math.floor(n(b.fairness)/10)-Math.floor(n(a.fairness)/10)
  ||riskCount(a)-riskCount(b)||packageSize(a)-packageSize(b)
  ||n(b.score)-n(a.score)||n(b.fairness)-n(a.fairness);
}

export function tradePartnerFit(mine,other,offer,pool){
 if(n(offer.weeklyDeltaA)<=.1||n(offer.weeklyDeltaB)<=.1)return '';
 const fills=(ids,need,starters)=>(ids||[]).some(id=>pool.get(String(id))?.position===need&&starters?.includes(String(id)));
 if(!['RB','WR','TE','QB'].includes(mine?.need)||!['RB','WR','TE','QB'].includes(other?.need))return '';
 if(fills(offer.sendB,mine.need,offer.startingIncomingA)&&fills(offer.sendA,other.need,offer.startingIncomingB))return `You add ${mine.need} help · They add ${other.need} help`;
 return '';
}
