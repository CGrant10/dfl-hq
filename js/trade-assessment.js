import {tradeConfidence} from './trade-confidence.js';
const num=value=>Number.isFinite(Number(value))?Number(value):0;

// Price, roster fit, and evidence remain separate throughout the workspace.
export function tradeAssessment(result){
 if(!result)return null;
 const evidence=result.projectionEvidence,confidence=tradeConfidence(result);
 const high=Math.max(num(result.valueToA),num(result.valueToB),1);
 const fairness=Number.isFinite(Number(result.fairness))?num(result.fairness):Math.min(num(result.valueToA),num(result.valueToB))/high*100;
 const edge=(num(result.valueToA)-num(result.valueToB))/high*100;
 const weeklyA=num(result.weeklyDeltaA),weeklyB=num(result.weeklyDeltaB);
 const fitA=result.rosterImpactA==null?weeklyA+num(result.depthDeltaA)*.35:num(result.rosterImpactA);
 const fitB=result.rosterImpactB==null?weeklyB+num(result.depthDeltaB)*.35:num(result.rosterImpactB);
 const flags=[];
 if(evidence?.missing?.length)flags.push('Missing projections');
 if(evidence?.injuries?.length)flags.push('Injury risk');
 if(evidence?.stale?.length)flags.push('Stale inputs');
 if(evidence?.fallback?.length)flags.push('Production fallback');
 if(evidence?.expert?.required&&evidence.expert.status!=='Fresh')flags.push('Expert feed unavailable');
 if(evidence?.expert?.required&&evidence.expert.missing?.length)flags.push('Expert coverage gap');
 if(evidence?.expert?.required&&(evidence.expert.disagreements?.length||evidence.expert.split?.length))flags.push('Rank disagreement');
 if(evidence?.thinSamples?.length)flags.push('Limited samples');
 const needsReview=!!(flags.length||confidence?.needsReview);
 const fairAvailability=!evidence?.injuries?.length||evidence.injuries.every(name=>{
  const players=evidence.players?.filter(p=>p.name===name)||[];
  return players.length&&players.every(p=>!p.isOut&&/^(questionable|q)$/i.test(p.injuryStatus||''));
 });
 const fairInputs=!evidence?.missing?.length&&!evidence?.fallback?.length&&!evidence?.stale?.length&&fairAvailability;
 const fairFit=Math.min(fitA,fitB)>=-.75&&Math.min(weeklyA,weeklyB)>=-1;
 const supported=!needsReview&&(!confidence||confidence.level==='strong');
 const netEdge=(num(result.valueToA)-num(result.rosterCostA)-num(result.valueToB))/high*100;
 const clearsBand=result.incomingEvidence&&result.outgoingEvidence?result.incomingEvidence.low-num(result.rosterCostA)>result.outgoingEvidence.high:netEdge>=12;
 const receivesQb=(result.incomingPositionsA||result.incomingPositions?.[0])?.includes('QB');
 const tier=fairness>=90&&fairFit&&fairInputs?'fair':netEdge>=12&&clearsBand&&supported&&!receivesQb&&!result.comparableStarPremium&&fitA>=-.25?'steal':'aggressive';
 let value;
 if(evidence?.missing?.length)value={tone:'even',headline:'Projection gap',who:null};
 else if(fairness>=90)value={tone:'even',headline:'Balanced',who:null};
 else if(needsReview)value={tone:'even',headline:'Review needed',who:null};
 else if(confidence&&confidence.level!=='strong'||result.incomingEvidence&&result.outgoingEvidence&&fairness>=72&&result.incomingEvidence.low<=result.outgoingEvidence.high&&result.outgoingEvidence.low<=result.incomingEvidence.high)value={tone:'even',headline:'Close call',who:null};
 else value={tone:fairness>=72?'slight':fairness>=55?'clear':'lopsided',headline:fairness>=72?'Slight edge':fairness>=55?'Clear value edge':'FLEECE',who:edge>0?'a':'b'};
 return {fairness,edge,fitA,fitB,weeklyA,weeklyB,tier,value,needsReview,flags,confidence};
}
