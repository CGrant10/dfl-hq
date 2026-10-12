import {tradeConfidence} from "./trade-confidence.js";
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;

export function verdictFor(result) {
  if (!result) return null;
  if (result.projectionEvidence?.missing?.length) return { tone: 'even', headline: 'Projection gap', who: null };
  const confidence=tradeConfidence(result);
  if(confidence?.needsReview)return {tone:'even',headline:'Review needed',who:null};
  if(result.projectionEvidence?.stale?.length||result.projectionEvidence?.injuries?.length)return {tone:'even',headline:'Review needed',who:null};
  const gap = num(result.valueToA) - num(result.valueToB);
  const fairness = num(result.fairness);
  const incoming=result.incomingEvidence,outgoing=result.outgoingEvidence;
  if(incoming&&outgoing&&fairness>=72&&fairness<88&&incoming.low<=outgoing.high&&outgoing.low<=incoming.high)
    return {tone:'even',headline:'Close call',who:null};
  if (fairness >= 88) return { tone: "even", headline: "Balanced", who: null };
  if(confidence&&confidence.level!=='strong')return {tone:'even',headline:'Close call',who:null};
  const who = gap > 0 ? "a" : "b";
  if (fairness >= 72) return { tone: "slight", headline: "Slight edge", who };
  /* The middle band is a meaningful value edge, not automatically a fleece.
     A team may rationally pay this premium to turn depth into starting points. */
  if (fairness >= 55) return { tone: "clear", headline: "Clear value edge", who };
  return { tone: "lopsided", headline: "FLEECE", who };
}

