import { afterEach, describe, expect, it, vi } from "vitest";
import { startAssembly } from "./scroll-assembly.js";

const part = () => ({ classList: { add: vi.fn() } });
const root = parts => ({
  querySelectorAll: vi.fn(() => parts),
  classList: { add: vi.fn(), remove: vi.fn() },
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Home's scroll fade", () => {
  it("reveals once and stops observing instead of reversing on scroll", () => {
    const first = part(), second = part();
    let callback;
    const observe = vi.fn(), unobserve = vi.fn(), disconnect = vi.fn();
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    vi.stubGlobal("IntersectionObserver", class {
      constructor(handler) { callback = handler; }
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    });
    const host = root([first, second]);
    const stop = startAssembly(host);
    expect(host.classList.add).toHaveBeenCalledWith("has-scroll-fade");
    expect(observe).toHaveBeenCalledTimes(2);

    callback([{ target: first, isIntersecting: true }, { target: second, isIntersecting: false }]);
    expect(first.classList.add).toHaveBeenCalledWith("is-scroll-visible");
    expect(second.classList.add).not.toHaveBeenCalled();
    expect(unobserve).toHaveBeenCalledWith(first);

    stop();
    expect(disconnect).toHaveBeenCalled();
    expect(host.classList.remove).toHaveBeenCalledWith("has-scroll-fade");
  });

  it("shows everything without animation when reduced motion is requested", () => {
    const first = part(), second = part();
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    const host = root([first, second]);
    startAssembly(host);
    expect(first.classList.add).toHaveBeenCalledWith("is-scroll-visible");
    expect(second.classList.add).toHaveBeenCalledWith("is-scroll-visible");
    expect(host.classList.add).not.toHaveBeenCalled();
  });
});
