import {tradeSuggestionTier} from './team-analyzer.js';
import {evaluateTradeDeal} from './trade-workspace.js';
import {tradeConfidence} from './trade-confidence.js';

const availability = player => JSON.stringify([player?.injuryStatus || '', player?.playerStatus || '', !!player?.isOut, !!player?.isRisky,!!player?.outForSeason,player?.automaticTradeEligible, player?.nflTeam || player?.team || '']);
export function recheckTradeOffer(deal, previousPool, teams, pool) {
  const parties = deal.parties.map(party => teams.find(team => String(team.id) === String(party.id)));
  if (parties.some(party => !party) || deal.sends.some((ids, index) => ids.some(id =>
    !pool.has(String(id)) || !parties[index].playerIds.map(String).includes(String(id))))) return {status: 'invalid', deal: null};
  const refreshed = evaluateTradeDeal(parties, deal.sends, pool, deal.destinations);
  if (!refreshed) return {status: 'invalid', deal: null};
  const playersChanged = deal.sends.flat().some(id => availability(previousPool.get(String(id))) !== availability(pool.get(String(id)))
    || Math.abs(Number(previousPool.get(String(id))?.tradeValue) - Number(pool.get(String(id))?.tradeValue)) >= .5);
  const ratingChanged = Math.abs(refreshed.result.fairness - deal.result.fairness) >= 1
    || tradeSuggestionTier(refreshed.result) !== tradeSuggestionTier(deal.result);
  const support=result=>{const c=tradeConfidence(result);return JSON.stringify(c?[c.level,c.needsReview,c.reasons]:null)};
  const evidenceChanged=support(refreshed.result)!==support(deal.result);
  return {status: playersChanged || ratingChanged || evidenceChanged ? 'changed' : 'ready', deal: refreshed};
}
