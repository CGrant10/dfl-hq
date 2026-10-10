import { afterEach, describe, expect, it, vi } from 'vitest';
import { animateUi } from './ui-motion.js';
import { finishLoadingContent, playerCardPlaceholder } from './loading-presentation.js';
import { routePlaceholder } from './route-placeholder.js';

vi.mock('./ui-motion.js', () => ({ animateUi: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });
function host(overrides = {}) {
  vi.stubGlobal('innerHeight', 844);
  return { dataset: { contentState: 'loading' }, removeAttribute: vi.fn(), isConnected: true,
    closest: () => null, getClientRects: () => [{}], getBoundingClientRect: () => ({ top: 100, bottom: 300 }), ...overrides };
}
describe('deferred content handoff', () => {
  it('reveals once and leaves later live updates steady', () => {
    const node = host();
    finishLoadingContent(node); finishLoadingContent(node);
    expect(node.dataset.contentState).toBe('ready');
    expect(node.removeAttribute).toHaveBeenCalledExactlyOnceWith('aria-busy');
    expect(animateUi).toHaveBeenCalledExactlyOnceWith(node, [{ opacity: .65 }, { opacity: 1 }], { duration: 160 });
  });
  it.each([
    { isConnected: false }, { closest: () => ({}) }, { getClientRects: () => [] },
    { getBoundingClientRect: () => ({ top: 900, bottom: 1000 }) },
    { getBoundingClientRect: () => ({ top: -300, bottom: 0 }) },
  ])('finishes without a reveal when content is not visible: %j', overrides => {
    const node = host(overrides); finishLoadingContent(node);
    expect(node.dataset.contentState).toBe('ready'); expect(animateUi).not.toHaveBeenCalled();
  });
});
describe('truthful loading placeholders', () => {
  it('escapes known player identity and shows no invented score or real portrait', () => {
    const html = playerCardPlaceholder('<img src=x onerror=alert(1)>');
    expect(html).toContain('&lt;img'); expect(html).not.toContain('<img');
    expect(html).toContain('role="status"'); expect(html).not.toContain('dfl-player-portrait');
    expect(html).not.toMatch(/Fantasy points|Week \d|0\.00|Healthy/);
  });
  it('uses distinct geometry for everyday destinations without interactive fake controls', () => {
    const variants = ['home','clubhouse','sportsbook','trade','analyzer','wall','notifications'].map(routePlaceholder);
    expect(new Set(variants).size).toBe(7);
    for (const html of variants) { expect(html).toContain('aria-hidden="true"'); expect(html).not.toMatch(/<button|<input|<select|tabindex/); }
    expect(routePlaceholder('home')).toContain('loading-broadcast');
    expect(routePlaceholder('trade')).toContain('loading-packages');
    expect(routePlaceholder('wall')).toContain('loading-composer');
  });
  it.each(['__proto__', 'constructor', '<script>'])('uses the safe Home fallback for %s', name => {
    expect(routePlaceholder(name)).toContain('Loading The Clubhouse');
  });
});
