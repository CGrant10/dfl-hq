import { describe, expect, it } from 'vitest';
import { evaluateTrade, suggestTrades, tradeSuggestionTier } from './team-analyzer.js';
import { tradeConfidence } from './trade-confidence.js';
import { tradeOfferEmptyCopy } from './trade-workspace-ui.js';

function balancedAvailability(status = 'Questionable', isOut = false) {
  return { fairness: 94, valueToA: 94, valueToB: 100, weeklyDeltaA: 1, weeklyDeltaB: 0, rosterImpactA: 1, rosterImpactB: 0,
    projectionEvidence: { missing: [], fallback: [], stale: [], injuries: ['Receiver'], players: [{ name: 'Receiver', injuryStatus: status, isOut }],
      expert: { required: true, status: 'Fresh', missing: [], disagreements: [], split: [] } } };
}
describe('supported offer discovery', () => {
  it('explains an impossible incoming-QB Steal without claiming other trades are unavailable', () => {
    expect(tradeOfferEmptyCopy('steal', ['QB'])).toContain('1-QB league');
    expect(tradeOfferEmptyCopy('steal', ['WR'])).toContain('No clear Steal');
    expect(tradeOfferEmptyCopy('fair', ['QB'])).not.toContain('excluded');
  });
  it('shows a balanced questionable-player estimate as Fair while retaining mandatory review', () => {
    const result = balancedAvailability();
    expect(tradeSuggestionTier(result)).toBe('fair');
    expect(tradeConfidence(result)).toMatchObject({ level: 'mixed', needsReview: true });
  });
  it.each(['Out', 'IR', 'PUP', 'Doubtful', '', 'Healthy'])('keeps %s availability out of Fair when flagged as uncertain', status => {
    expect(tradeSuggestionTier(balancedAvailability(status))).toBe('aggressive');
  });
  it('withholds Fair for reserve players, stale evidence, and unverified injury flags', () => {
    expect(tradeSuggestionTier(balancedAvailability('Questionable', true))).toBe('aggressive');
    const result = balancedAvailability();
    expect(tradeSuggestionTier({ ...result, projectionEvidence: { ...result.projectionEvidence, stale: ['Receiver'] } })).toBe('aggressive');
    expect(tradeSuggestionTier({ ...result, projectionEvidence: { ...result.projectionEvidence, players: [] } })).toBe('aggressive');
  });
  it('does not promote a questionable-player value edge into Steal', () => {
    const result = { ...balancedAvailability(), fairness: 60, valueToA: 100, valueToB: 60,
      incomingPositionsA: ['WR'], incomingEvidence: { low: 90, high: 110 }, outgoingEvidence: { low: 50, high: 70 } };
    expect(tradeSuggestionTier(result)).toBe('aggressive');
  });
  it('discovers a useful, balanced swap involving both rosters’ twelfth-ranked players', () => {
    const pool = new Map();
    const teams = ['a','b'].map(id => {
      const players = Array.from({ length: 11 }, (_, i) => ({ id: `${id}-wr-${i}`, name: `${id} receiver ${i}`, position: 'WR', expectedPoints: 250, tradeValue: 80-i }));
      players.push({ id: `${id}-te`, name: `${id} tight end`, position: 'TE', expectedPoints: 200, tradeValue: 40 });
      players.forEach(p => pool.set(p.id, p));
      return { id, playerIds: players.map(p => p.id) };
    });
    const result = evaluateTrade({ teamA: teams[0], teamB: teams[1], sendA: ['a-te'], sendB: ['b-te'], pool });
    expect(tradeSuggestionTier(result)).toBe('fair');
    const offers = suggestTrades({ teams, teamId: 'a', partnerId: 'b', pool, intent: 'fair', shapes: ['1-1'], limit: 200 });
    expect(offers.some(o => o.sendA.includes('a-te') && o.sendB.includes('b-te') && o.tier === 'fair')).toBe(true);
  });
  it('keeps larger full-roster searches bounded, unique, and within the requested shape', () => {
    const pool = new Map();
    const teams = ['a','b'].map(id => {
      const playerIds = Array.from({ length: 18 }, (_, i) => {
        const pid = `${id}-${i}`; pool.set(pid, { id: pid, name: pid, position: ['RB','WR','TE'][i%3], expectedPoints: 200, tradeValue: 30 }); return pid;
      });
      return { id, playerIds, need: 'RB' };
    });
    const offers = suggestTrades({ teams, teamId: 'a', partnerId: 'b', pool, intent: 'fair', maxPlayers: 8, shapes: ['4-4'], limit: 12 });
    expect(offers.length).toBeGreaterThan(0); expect(offers.length).toBeLessThanOrEqual(12);
    for (const offer of offers) {
      expect(new Set(offer.sendA).size).toBe(4); expect(new Set(offer.sendB).size).toBe(4);
      expect(offer.sendA.every(id => teams[0].playerIds.includes(id))).toBe(true);
      expect(offer.sendB.every(id => teams[1].playerIds.includes(id))).toBe(true);
    }
  });
});
