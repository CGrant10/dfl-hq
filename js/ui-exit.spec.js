import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelUiExit, cancelUiMotion, exitUi } from './ui-motion.js';

describe('dismissal lifecycle', () => {
  let node, animation;
  beforeEach(() => {
    vi.stubGlobal('document', { visibilityState:'visible' });
    vi.stubGlobal('matchMedia', () => ({ matches:false }));
    vi.stubGlobal('getComputedStyle', () => ({ opacity:'1', transform:'none' }));
    vi.stubGlobal('localStorage', { getItem:() => null });
    node = { isConnected:true, dataset:{}, closest:() => null, contains:target => target === node,
      animate:vi.fn(() => {
        let resolve, reject;
        const finished = new Promise((yes, no) => { resolve=yes; reject=no; });
        animation = { effect:{ target:node }, finished, finish:() => { resolve(); animation.onfinish?.(); }, cancel:vi.fn(() => reject(new Error('cancelled'))) };
        return animation;
      }) };
  });
  afterEach(async () => { cancelUiExit(node); cancelUiMotion(); await Promise.resolve(); vi.unstubAllGlobals(); });

  it('keeps the surface present until the exit completes, despite repeated Escape', async () => {
    const complete = vi.fn();
    exitUi(node, complete); exitUi(node, complete);
    expect(node.dataset.uiClosing).toBe('1');
    expect(complete).not.toHaveBeenCalled();
    expect(node.animate).toHaveBeenCalledTimes(1);
    animation.finish(); await Promise.resolve();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(node.dataset.uiClosing).toBeUndefined();
  });

  it('does not let an old dismissal close a reopened surface', async () => {
    const complete = vi.fn();
    exitUi(node, complete); cancelUiExit(node);
    await Promise.resolve();
    expect(complete).not.toHaveBeenCalled();
    expect(node.dataset.uiClosing).toBeUndefined();
  });

  it('finishes immediately when a route change interrupts dismissal', async () => {
    const complete = vi.fn();
    exitUi(node, complete); exitUi(node, complete, { immediate:true });
    await Promise.resolve();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(node.dataset.uiClosing).toBeUndefined();
  });

  it('settles exactly once when a preference or visibility change cancels motion', async () => {
    const complete = vi.fn();
    exitUi(node, complete); cancelUiMotion();
    await Promise.resolve();
    expect(complete).toHaveBeenCalledTimes(1);
    expect(node.dataset.uiClosing).toBeUndefined();
  });

  it('dismisses synchronously for reduced motion or Motion off', () => {
    const complete = vi.fn();
    vi.stubGlobal('matchMedia', () => ({ matches:true }));
    exitUi(node, complete);
    vi.stubGlobal('matchMedia', () => ({ matches:false }));
    vi.stubGlobal('localStorage', { getItem:key => key.endsWith('gameday-motion') ? 'off' : null });
    exitUi(node, complete);
    expect(complete).toHaveBeenCalledTimes(2);
    expect(node.animate).not.toHaveBeenCalled();
  });
});
