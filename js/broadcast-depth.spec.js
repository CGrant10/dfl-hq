import { afterEach, describe, expect, it, vi } from 'vitest';
import { mountBroadcastDepth } from './broadcast-depth.js';
import { animateUi, cancelUiMotion } from './ui-motion.js';
vi.mock('./ui-motion.js', () => ({ animateUi:vi.fn(), cancelUiMotion:vi.fn() }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });
function fixture() {
  const win = new EventTarget(), doc = new EventTarget(), reduced = new EventTarget(), styles = new Map(), frames = new Map();
  doc.hidden = false; doc.documentElement = { dataset:{ uiMotion:'on' } };
  let intersection, tick = 0, top = 100;
  const observer = { observe:vi.fn(), disconnect:vi.fn() };
  const sheen = { className:'', setAttribute:vi.fn(), remove:vi.fn() };
  doc.createElement = () => sheen;
  const root = { dataset:{presentation:'editorial'}, isConnected:true, append:vi.fn(), style:{setProperty:(k,v)=>styles.set(k,v), removeProperty:k=>styles.delete(k)}, getBoundingClientRect:()=>({top,height:300}) };
  vi.stubGlobal('window',win); vi.stubGlobal('document',doc); vi.stubGlobal('innerHeight',800);
  vi.stubGlobal('matchMedia',()=>reduced);
  vi.stubGlobal('IntersectionObserver',class { constructor(cb) { intersection=cb; return observer; } });
  vi.stubGlobal('requestAnimationFrame',cb=>{frames.set(++tick,cb);return tick;});
  vi.stubGlobal('cancelAnimationFrame',id=>frames.delete(id));
  const control=mountBroadcastDepth(root);
  return {root,win,doc,reduced,observer,sheen,styles,frames,control,see:(on)=>intersection([{isIntersecting:on}]),scroll:(value)=>{top=value;win.dispatchEvent(new Event('scroll'));},flush:()=>{const work=[...frames.values()];frames.clear();work.forEach(cb=>cb());}};
}
describe('broadcast decorative depth lifecycle', () => {
  it('coalesces visible scroll work into one frame and does nothing at rest', () => {
    const f=fixture();f.see(true);f.flush();const before=f.styles.get('--bx-depth-y');
    f.scroll(-100);f.scroll(-110);expect(f.frames.size).toBe(1);f.flush();
    expect(f.styles.get('--bx-depth-y')).not.toBe(before);expect(f.frames.size).toBe(0);
    f.scroll(-10000);f.flush();expect(f.styles.get('--bx-depth-y')).toBe('4.00px');
  });
  it('never animates or schedules work for offscreen stories', () => {
    const f=fixture();f.scroll(50);f.control.enter();expect(f.frames.size).toBe(0);expect(animateUi).not.toHaveBeenCalled();
    f.see(true);f.flush();f.see(false);expect(f.styles.has('--bx-depth-y')).toBe(false);expect(f.root.dataset.depthActive).toBeUndefined();
  });
  it('clears art offsets and finite sweeps for motion off, hidden tabs and reduced motion', () => {
    const f=fixture();f.see(true);f.flush();f.control.enter();expect(animateUi).toHaveBeenCalledOnce();
    f.doc.documentElement.dataset.uiMotion='off';f.win.dispatchEvent(new Event('dfl:ui-motion-change'));
    expect(f.frames.size).toBe(0);expect(f.styles.has('--bx-depth-y')).toBe(false);f.control.enter();expect(animateUi).toHaveBeenCalledOnce();
    f.doc.documentElement.dataset.uiMotion='on';f.doc.hidden=true;f.doc.dispatchEvent(new Event('visibilitychange'));f.scroll(0);expect(f.frames.size).toBe(0);
    f.doc.hidden=false;f.reduced.matches=true;f.reduced.dispatchEvent(new Event('change'));f.control.enter();expect(animateUi).toHaveBeenCalledOnce();
    expect(cancelUiMotion).toHaveBeenCalledWith(f.sheen);
  });
  it('removes its overlay and listeners and ignores late observer callbacks on stop', () => {
    const f=fixture();f.see(true);expect(f.frames.size).toBe(1);f.control.stop();
    expect(f.frames.size).toBe(0);expect(f.sheen.remove).toHaveBeenCalledOnce();expect(f.observer.disconnect).toHaveBeenCalledOnce();
    f.see(true);f.scroll(0);f.control.enter();expect(f.frames.size).toBe(0);expect(animateUi).not.toHaveBeenCalled();
  });
});
