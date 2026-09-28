import { afterEach, describe, expect, it, vi } from "vitest";
import { experienceSettingsMarkup, hapticsEnabled, setHapticsEnabled, setSoundEnabled, soundEnabled } from "./experience.js";

const store = new Map();
afterEach(() => { store.clear(); vi.unstubAllGlobals(); });

function installStorage() {
  vi.stubGlobal("localStorage", {
    getItem: key => store.has(key) ? store.get(key) : null,
    setItem: (key, value) => store.set(key, String(value)),
  });
}

describe("experience preferences", () => {
  it("keeps sound muted by default and haptics enabled", () => {
    installStorage();
    expect(soundEnabled()).toBe(false);
    expect(hapticsEnabled()).toBe(true);
  });

  it("persists both device preferences", () => {
    installStorage();
    setSoundEnabled(true);
    setHapticsEnabled(false);
    expect(soundEnabled()).toBe(true);
    expect(hapticsEnabled()).toBe(false);
    expect(experienceSettingsMarkup()).toContain("data-experience-sound checked");
    expect(experienceSettingsMarkup()).not.toContain("data-experience-haptics checked");
  });
});

