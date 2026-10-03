import { describe, expect, it } from "vitest";
import { SHARE_INK, shareTeamInk, TEAM_INKS, newTeamColor, teamInk } from "./brand-ink.js";

describe("the Medicine identity replaces Golf's own brand", () => {
  it("hands out Medicine inks to new teams, in order", () => {
    expect(newTeamColor(0)).toBe(TEAM_INKS[0]);
    expect(newTeamColor(1)).toBe(TEAM_INKS[1]);
    expect(newTeamColor(6)).toBe(TEAM_INKS[0]);          // wraps
    expect(newTeamColor(-1)).toBe(TEAM_INKS[1]);
    expect(newTeamColor(undefined)).toBe(TEAM_INKS[0]);
  });

  it("translates every one of the six old Golf colours", () => {
    const legacy = ["#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf"];
    legacy.forEach((old, i) => {
      expect(teamInk(old, 99)).toBe(TEAM_INKS[i]);
      expect(teamInk(old.toUpperCase(), 99)).toBe(TEAM_INKS[i]);
    });
  });

  it("keeps the translated teams distinguishable from each other", () => {
    const legacy = ["#2fbf5f", "#4aa3ff", "#f0a742", "#e0574a", "#b07cf0", "#3ecfcf"];
    const mapped = legacy.map((c) => teamInk(c));
    expect(new Set(mapped).size).toBe(legacy.length);
  });

  it("passes a colour somebody chose by hand straight through", () => {
    expect(teamInk("#123456")).toBe("#123456");
    expect(teamInk("#ABC")).toBe("#abc");
  });

  it("falls back on the index when a team has no colour at all", () => {
    expect(teamInk(null, 2)).toBe(TEAM_INKS[2]);
    expect(teamInk("", 3)).toBe(TEAM_INKS[3]);
    expect(teamInk("var(--accent)", 1)).toBe(TEAM_INKS[1]);
    expect(teamInk(undefined)).toBe(TEAM_INKS[0]);
  });

  it("never returns anything but a usable colour", () => {
    for (const input of [null, "", "nonsense", "#fff", "#2fbf5f", 42]) {
      expect(teamInk(input, 0)).toMatch(/^#[0-9a-f]{3,8}$/i);
    }
  });

  it("holds the share palette in ONE place, as fixed values", () => {
    expect(SHARE_INK.BG).toBe("#0b0b0c");
    expect(SHARE_INK.INK).toBe("#f4f2ee");
    expect(SHARE_INK.BRAND_RED).toBe("#C8102E");
    expect(SHARE_INK.BRAND_YELLOW).toBe("#EFC94C");
    /* Constants, not the live theme: nothing here may read the DOM. */
    for (const v of Object.values(SHARE_INK)) expect(v).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe('shared Medicine team defaults',()=>{
 it('replaces the generated blue marker without changing stored or custom team identity',()=>{
 expect(shareTeamInk(null,3)).toBe(SHARE_INK.CHARCOAL);
 expect(shareTeamInk('#e0574a',3)).toBe(SHARE_INK.CHARCOAL);
 expect(teamInk('#e0574a',3)).toBe('#5A82D6');
 expect(shareTeamInk('#123456',3)).toBe('#123456');
 expect(new Set(Array.from({length:6},(_,i)=>shareTeamInk(null,i))).size).toBe(6);
 });
});

describe('shared image readability',()=>{
 it('keeps every body and status text ink above WCAG AA contrast on its exported surface',()=>{
 const luminance=hex=>{const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722};
 for(const bg of [SHARE_INK.BG,SHARE_INK.CARD,SHARE_INK.CARD_2])for(const ink of [SHARE_INK.INK,SHARE_INK.MUTED,SHARE_INK.ACCENT,SHARE_INK.GOLD,SHARE_INK.OK])expect((luminance(ink)+.05)/(luminance(bg)+.05)).toBeGreaterThanOrEqual(4.5);
 expect((luminance(SHARE_INK.GOLD)+.05)/(luminance(SHARE_INK.GOLD_WASH)+.05)).toBeGreaterThanOrEqual(4.5);
 expect((luminance(SHARE_INK.ACCENT)+.05)/(luminance(SHARE_INK.RED_WASH)+.05)).toBeGreaterThanOrEqual(4.5);
 });
});
