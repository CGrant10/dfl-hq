import { describe, expect, it } from 'vitest';
import { motionAllowed } from './ui-motion.js';
import { routePlaceholder } from './route-placeholder.js';

describe('shared motion preferences', () => {
  it('starts enabled and honors each independent reason to suppress motion', () => {
    expect(motionAllowed()).toBe(true);
    for (const options of [{ preference: 'off' }, { reduced: true }, { hidden: true }, { explicit: false }]) {
      expect(motionAllowed(options)).toBe(false);
    }
  });

  it('never lets an explicit request override accessibility or the member preference', () => {
    expect(motionAllowed({ explicit: true, reduced: true })).toBe(false);
    expect(motionAllowed({ explicit: true, preference: 'off' })).toBe(false);
    expect(motionAllowed({ preference: 'on', hidden: true })).toBe(false);
  });
});

describe('route loading handoff', () => {
  it('announces the destination without showing invented league statistics', () => {
    const html = routePlaceholder('sportsbook');
    expect(html).toContain('role="status"');
    expect(html).toContain('Loading Sportsbook');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/\d+ SIN|projected|actual|score/i);
  });

  it('uses known route labels rather than inserting untrusted hash text', () => {
    const html = routePlaceholder('<img src=x onerror=alert(1)>');
    expect(html).toContain('Loading The Clubhouse');
    expect(html).not.toContain('<img');
  });
});
