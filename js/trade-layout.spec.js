import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { tradeDeskMarkup } from "./trade-desk.js";

const mine = { id: "mine", team_name: "My Team", playerIds: [] };
const theirs = { id: "theirs", team_name: "Their Team", playerIds: [] };
const teams = [mine, theirs];
const pool = new Map();

describe("trade analyzer layout", () => {
  it("opens the trade builder first and renders its result immediately below", () => {
    const markup = tradeDeskMarkup(mine, teams, pool, { memberIds: [], sends: [new Set(), new Set()] });

    expect(markup).toContain('<details class="td-builder" open>');
    expect(markup).toContain("Build your trade");
    expect(markup.indexOf('class="td-builder"')).toBeLessThan(markup.indexOf("data-td-verdict"));
  });

  it("renders the generated Trade Board before the custom analyzer", () => {
    const source = readFileSync(new URL("./pages/trade.js", import.meta.url), "utf8");

    expect(source).toContain('<section class="tb-board">');
    expect(source).toContain('class="ta-report-section td-custom"');
    expect(source.indexOf('${tradeLab(team, data.teams, data.pool, shop)}')).toBeLessThan(source.indexOf('class="ta-report-section td-custom"'));
    expect(source).toContain('openTiers: new Set()');
    expect(source).toContain('data-tb-max');
    expect(source).toContain('data-tb-add-anchor="send"');
    expect(source).toContain('data-tb-add-anchor="receive"');
    expect(source).toContain('class="tb-workbench-card"');
    expect(source).toContain('class="tb-offers-card"');
    expect(source).toContain('class="section-copy"');
  });

  it("scrolls a loaded suggestion to its analysis result", () => {
    const source = readFileSync(new URL("./pages/trade.js", import.meta.url), "utf8");

    expect(source).toContain('body.querySelector("[data-td-verdict]")?.scrollIntoView');
    expect(source).not.toContain('body.querySelector("[data-trade-desk]")?.scrollIntoView');
  });

  it("lazy-renders the large custom roster builder only when it is opened", () => {
    const source = readFileSync(new URL("./pages/trade.js", import.meta.url), "utf8");

    expect(source).toContain('shop.customOpen ? `<div class="ta-section-body">');
    expect(source).toContain('shop.offerCache ||= new Map()');
    expect(source).toContain('Up to 8 players');
  });

  it("does not silently target the other team's most valuable player", () => {
    const source = readFileSync(new URL("./pages/trade.js", import.meta.url), "utf8");

    expect(source).toContain("shop.receiveAnchors = [];");
    expect(source).not.toContain("shop.receiveAnchors = theirPlayers[0]");
  });
});
