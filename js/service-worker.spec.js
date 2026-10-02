import { afterEach, describe, expect, it, vi } from "vitest";
import { activeAppWorker } from "./service-worker.js";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("non-blocking device notification lookup", () => {
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
