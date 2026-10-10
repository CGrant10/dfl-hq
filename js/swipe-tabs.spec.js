import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountSwipeTabs } from './swipe-tabs.js';

afterEach(() => vi.unstubAllGlobals());
function fixture(index = 1) {
  vi.stubGlobal('getSelection', () => '');
  const surface = new EventTarget();
  surface.closest = () => null;
  surface.hasPointerCapture = () => false;
  surface.setPointerCapture = () => {};
  const buttons = Array.from({ length:4 }, (_, i) => ({ getAttribute:() => String(i === index), click:() => { index = i; } }));
  const stop = mountSwipeTabs(surface, { querySelectorAll:() => buttons });
  const send = (type, x, y, extra = {}) => {
    const event = new Event(type, { cancelable:true });
    Object.assign(event, { pointerId:1, pointerType:'touch', isPrimary:true, button:0, clientX:x, clientY:y, ...extra });
    surface.dispatchEvent(event);
    return event;
  };
  const swipe = (dx, dy = 0, extra = {}) => { send('pointerdown', 200, 200, extra); send('pointermove', 200 + dx, 200 + dy, extra); send('pointerup', 200 + dx, 200 + dy, extra); };
  return { surface, stop, send, swipe, selected:() => index };
}
describe('Week Ahead touch navigation', () => {
  it('advances and reverses without wrapping the endpoints', () => {
    const f = fixture(0);
    f.swipe(100); expect(f.selected()).toBe(0);
    f.swipe(-100); expect(f.selected()).toBe(1);
    f.swipe(-100); f.swipe(-100); f.swipe(-100); expect(f.selected()).toBe(3);
    f.swipe(100); expect(f.selected()).toBe(2);
  });
  it('does not navigate on a vertical scroll, short drag, or mouse selection', () => {
    const f = fixture();
    f.swipe(-90, -120); f.swipe(-20); f.swipe(-100, 0, { pointerType:'mouse' });
    expect(f.selected()).toBe(1);
  });
  it('releases a cancelled touch without navigating', () => {
    const f = fixture();
    f.send('pointerdown', 200, 200); f.send('pointermove', 100, 200); f.send('pointercancel', 100, 200); f.send('pointerup', 100, 200);
    expect(f.selected()).toBe(1);
  });
  it('keeps the gesture when implicit capture moves from a child to the panel', () => {
    const f = fixture();
    f.send('pointerdown', 200, 200); f.send('pointermove', 150, 200);
    const lost = new Event('lostpointercapture');
    Object.defineProperty(lost, 'target', { value:{} });
    Object.assign(lost, { pointerId:1 });
    f.surface.dispatchEvent(lost);
    f.send('pointerup', 100, 200);
    expect(f.selected()).toBe(2);
  });
  it('leaves controls, selected text and a second finger alone', () => {
    const f = fixture();
    f.surface.closest = () => ({}); f.swipe(-100); expect(f.selected()).toBe(1);
    f.surface.closest = () => null; vi.stubGlobal('getSelection', () => 'Selected player name'); f.swipe(-100); expect(f.selected()).toBe(1);
    vi.stubGlobal('getSelection', () => ''); f.send('pointerdown', 200, 200); f.send('pointerdown', 100, 200, { isPrimary:false, pointerId:2 }); f.send('pointermove', 100, 200); f.send('pointerup', 100, 200); expect(f.selected()).toBe(1);
  });
  it('suppresses the click after a swipe and cleans up its listeners', () => {
    const f = fixture();
    f.swipe(-100); expect(f.send('click', 100, 200).defaultPrevented).toBe(true);
    f.stop(); f.swipe(-100); expect(f.selected()).toBe(2);
  });
});
