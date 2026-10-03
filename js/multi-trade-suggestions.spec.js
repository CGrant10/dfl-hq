import { describe, it, expect } from "vitest";
import { suggestMultiTeamTrades, evaluateMultiTeamTrade } from "./team-analyzer.js";
const pool = new Map();
const parties = ['a', 'b', 'c'].map((id, index) => {
  const playerIds = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE'].map((position, n) => {
    const pid = `${id}${n}`;
    pool.set(pid, { id: pid, name: pid, position, tradeValue: 50 + n, expectedPoints: 210 + n * 10 + index });
    return pid;
  });
  return { id, playerIds };
});
describe('generated multi-team trades', () => {
  it('honors every owner, anchors, circular destinations and the total player cap', () => {
    const offers = suggestMultiTeamTrades({ parties, pool, maxPlayers: 5, sendAnchorIds: ['a1'], receiveAnchorIds: ['c1'] });
    expect(offers.length).toBeGreaterThan(0);
    for (const offer of offers) {
      expect(offer.sends[0]).toContain('a1');
      expect(offer.sends[2]).toContain('c1');
      expect(offer.sends.flat().length).toBeLessThanOrEqual(5);
      offer.sends.forEach((ids, i) => ids.forEach(id => expect(parties[i].playerIds).toContain(id)));
      expect(offer.weeklyDeltas).toEqual(evaluateMultiTeamTrade({ teams: parties, sends: offer.sends, pool }).weeklyDeltas);
    }
  });
  it('rejects duplicate parties and players anchored to the wrong owner', () => {
    expect(suggestMultiTeamTrades({ parties: [parties[0], parties[0], parties[2]], pool })).toEqual([]);
    expect(suggestMultiTeamTrades({ parties, pool, receiveAnchorIds: ['b1'] })).toEqual([]);
  });
  it('honors explicit outgoing and return package sizes', () => {
    const offers = suggestMultiTeamTrades({ parties, pool, maxPlayers: 6, sendCount: '2', receiveCount: '2' });
    expect(offers.length).toBeGreaterThan(0);
    offers.forEach(o => { expect(o.sends[0]).toHaveLength(2); expect(o.sends[2]).toHaveLength(2); });
  });
});
