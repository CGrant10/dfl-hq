import {suggestTrades,suggestMultiTeamTrades} from './team-analyzer.js';

// Both surfaces use the existing model, including all league/player evidence.
export function runTradeOfferQuery({teams,pool},query) {
  const {partyIds,...options}=query;
  if(partyIds?.length>2) {
    const parties=partyIds.map(id=>teams.find(team=>String(team.id)===String(id)));
    if(parties.some(team=>!team))throw Error('Trading team unavailable');
    return suggestMultiTeamTrades({...options,parties,pool});
  }
  return suggestTrades({...options,teams,pool});
}
