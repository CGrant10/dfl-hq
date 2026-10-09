// Qualitative evidence support. This is not a calibrated probability of winning.
export function tradeConfidence(result){
 const evidence=result?.projectionEvidence;
 // Existing stored receipts retain their original grade and interpretation.
 if(!evidence?.expert?.required)return null;
 const reasons=[],review=[];
 const add=(text,needsReview=false)=>{reasons.push(text);if(needsReview)review.push(text)};
 if(evidence.missing?.length)add(`Missing projections for ${evidence.missing.join(', ')}.`,true);
 if(evidence.stale?.length)add(`Stale model inputs for ${evidence.stale.join(', ')}.`,true);
 if(evidence.expert.status!=='Fresh')add(`Expert rankings: ${evidence.expert.status.toLowerCase()}; excluded from values.`,true);
 else if(evidence.expert.missing?.length)add(`No safe expert match for ${evidence.expert.missing.join(', ')}.`,true);
 if(evidence.injuries?.length)add(`Availability is uncertain for ${evidence.injuries.join(', ')}.`,true);
 if(evidence.fallback?.length)add(`Production fallback for ${evidence.fallback.join(', ')}.`,true);
 if(evidence.expert.disagreements?.length)add(`DFL forecast and expert rank disagree on ${evidence.expert.disagreements.join(', ')}.`,true);
 if(evidence.expert.split?.length)add(`Experts are split on ${evidence.expert.split.join(', ')}.`,true);
 if(evidence.thinSamples?.length)add(`Limited completed-game samples for ${evidence.thinSamples.join(', ')}.`,true);
 const incoming=Array.isArray(result.incomingEvidence)?result.incomingEvidence[0]:result.incomingEvidence;
 const outgoing=Array.isArray(result.outgoingEvidence)?result.outgoingEvidence[0]:result.outgoingEvidence;
 const fairness=result.partyBalances?.[0]??result.fairness;
 const overlaps=incoming&&outgoing&&incoming.low<=outgoing.high&&outgoing.low<=incoming.high;
 if(overlaps&&fairness<88)add('The value ranges overlap; the apparent edge may disappear.');
 const limited=evidence.missing?.length||evidence.stale?.length||evidence.expert.status!=='Fresh'||evidence.expert.missing?.length;
 const level=limited?'limited':reasons.length?'mixed':'strong';
 return {level,label:level==='strong'?'Strong support':level==='mixed'?'Mixed support':'Limited support',needsReview:review.length>0,reasons:reasons.length?reasons:['Fresh expert rankings and DFL inputs support this estimate.'],source:evidence.expert.source,updatedAt:evidence.expert.updatedAt,experts:evidence.expert.experts};
}
export function confidenceMarkup(result,esc=value=>String(value)){
 const confidence=tradeConfidence(result);if(!confidence)return '';
 return `<section class="td-confidence is-${confidence.level}" data-trade-confidence="${confidence.level}" aria-label="Verdict confidence"><header><span>VERDICT CONFIDENCE</span><strong>${esc(confidence.label)}</strong></header><p>${esc(confidence.reasons[0])}</p><small>Evidence quality, not a win probability.</small></section>`;
}
