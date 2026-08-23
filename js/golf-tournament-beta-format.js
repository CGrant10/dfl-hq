export const BETA_TEAM_SIZE = 6;
export const BETA_PAIRS_MATCHES = 3;
export const BETA_SINGLES_MATCHES = 6;

export function betaCaptainChoices(team, participants = []) {
  return participants.filter(person => person.member_id != null && String(person.team_id) === String(team?.id));
}

export function betaFormatStatus({ teams = [], participants = [], rounds = [] } = {}) {
  const counts = teams.map(team => participants.filter(person => String(person.team_id) === String(team.id)).length);
  const captainsReady = teams.length === 2 && teams.every(team => team.captain_member_id != null
    && betaCaptainChoices(team, participants).some(person => String(person.member_id) === String(team.captain_member_id)));
  const pairs = rounds.find(entry => entry.round?.format === "pairs");
  const singles = rounds.find(entry => entry.round?.format === "singles" && entry.battles?.every(battle => battle.sides?.every(side => side.team_id != null)));
  const pairsReady = pairs?.battles?.length === BETA_PAIRS_MATCHES
    && pairs.battles.every(battle => battle.sides?.length === 2 && battle.sides.every(side => side.players?.length === 2));
  const singlesReady = singles?.battles?.length === BETA_SINGLES_MATCHES
    && singles.battles.every(battle => battle.sides?.length === 2 && battle.sides.every(side => side.players?.length === 1));
  return {
    teamsReady: teams.length === 2 && counts.length === 2 && counts.every(count => count === BETA_TEAM_SIZE),
    captainsReady,
    counts,
    pairs,
    singles,
    pairsReady: Boolean(pairsReady),
    singlesReady: Boolean(singlesReady),
    ready: teams.length === 2 && counts.every(count => count === BETA_TEAM_SIZE) && captainsReady && Boolean(pairsReady) && Boolean(singlesReady),
  };
}

export const betaRoundName = format => format === "pairs" ? "Round 1 · 2v2" : "Round 2 · Singles";
export const betaMatchCount = format => format === "pairs" ? BETA_PAIRS_MATCHES : BETA_SINGLES_MATCHES;
export const betaSeatsPerSide = format => format === "pairs" ? 2 : 1;
