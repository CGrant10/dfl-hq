import { describe, it, expect } from 'vitest';
import { parseStake, estimatedReturn } from './sportsbook-slip.js';

describe('sportsbook stake and return', () => {
  it('rejects decimals, negative values, pasted text and over-budget stakes', () => {
    for (const input of ['1.5', '-50', '50 SIN', '1e2', '0', '', '101']) expect(parseStake(input, 100)).toBeNull();
    expect(parseStake(' 50 ', 100)).toBe(50);
  });
  it('matches the database floor rule for positive and negative American odds', () => {
    expect(estimatedReturn(50, -150)).toBe(83);
    expect(estimatedReturn(50, 150)).toBe(125);
    expect(estimatedReturn(50, -110)).toBe(95);
    expect(estimatedReturn(50, 100)).toBe(100);
    expect(estimatedReturn(50, 0)).toBeNull();
  });
});
