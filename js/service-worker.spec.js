import { afterEach, describe, expect, it, vi } from "vitest";
import { activeAppWorker } from "./service-worker.js";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("non-blocking device notification lookup", () => {
  it('does not warm optional assets before readiness or while the phone is backgrounded',async()=>{
    vi.useFakeTimers();vi.resetModules();
    const win=new EventTarget(),doc=new EventTarget(),sw=new EventTarget(),postMessage=vi.fn();doc.hidden=false;
    sw.register=async()=>({active:{postMessage}});
    vi.stubGlobal('window',win);vi.stubGlobal('document',doc);vi.stubGlobal('location',{protocol:'https:'});vi.stubGlobal('navigator',{serviceWorker:sw,connection:{effectiveType:'4g'}});
    const {registerAppWorker}=await import('./service-worker.js');await registerAppWorker();await vi.advanceTimersByTimeAsync(6000);
    expect(postMessage.mock.calls.some(([m])=>m.type==='DFL_CACHE_EXTRAS')).toBe(false);
    win.dispatchEvent(new Event('dfl:app-ready'));await vi.advanceTimersByTimeAsync(5000);
    expect(postMessage).toHaveBeenCalledWith({type:'DFL_CACHE_EXTRAS'});
    doc.hidden=true;doc.dispatchEvent(new Event('visibilitychange'));expect(postMessage).toHaveBeenLastCalledWith({type:'DFL_CACHE_PAUSE'});
  });
  it('handles registration finishing after the first page is already ready',async()=>{
    vi.useFakeTimers();vi.resetModules();let finish;
    const win=new EventTarget(),doc=new EventTarget(),sw=new EventTarget(),postMessage=vi.fn();doc.hidden=false;sw.register=()=>new Promise(resolve=>finish=resolve);
    vi.stubGlobal('window',win);vi.stubGlobal('document',doc);vi.stubGlobal('location',{protocol:'https:'});vi.stubGlobal('navigator',{serviceWorker:sw});
    const {registerAppWorker}=await import('./service-worker.js');const pending=registerAppWorker();win.dispatchEvent(new Event('dfl:app-ready'));finish({active:{postMessage}});await pending;await vi.advanceTimersByTimeAsync(5000);
    expect(postMessage).toHaveBeenCalledWith({type:'DFL_CACHE_EXTRAS'});
  });
  it('tolerates an unavailable registration without leaving a crashing ready listener',async()=>{
    vi.resetModules();const win=new EventTarget(),doc=new EventTarget(),sw=new EventTarget();sw.register=async()=>undefined;
    vi.stubGlobal('window',win);vi.stubGlobal('document',doc);vi.stubGlobal('location',{protocol:'https:'});vi.stubGlobal('navigator',{serviceWorker:sw});
    const {registerAppWorker}=await import('./service-worker.js');await registerAppWorker();expect(()=>win.dispatchEvent(new Event('dfl:app-ready'))).not.toThrow();
  });
  it("returns without waiting for ready in a fresh browser", async () => {
    const ready = vi.fn(() => new Promise(() => {}));
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => undefined, get ready() { return ready(); } } });
    expect(await activeAppWorker()).toBeNull();
    expect(ready).not.toHaveBeenCalled();
  });
  it("reads an existing active registration", async () => {
    const registration = { active: {}, pushManager: {} };
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: async () => registration } });
    expect(await activeAppWorker()).toBe(registration);
  });
  it("bounds even a stalled registration lookup", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", { serviceWorker: { getRegistration: () => new Promise(() => {}) } });
    const result = activeAppWorker({ timeoutMs: 50 });
    await vi.advanceTimersByTimeAsync(50);
    expect(await result).toBeNull();
  });
  it("handles browsers without service workers", async () => {
    vi.stubGlobal("navigator", {});
    expect(await activeAppWorker()).toBeNull();
  });
});
