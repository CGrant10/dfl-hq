import { describe, expect, it } from "vitest";
import { propMarketMeta, propMatches, readPropFavorites, sortPropRows, togglePropFavorite } from "./sportsbook-props.js";

const memory = () => { const rows = new Map(); return { getItem: key => rows.get(key) || null, setItem: (key, value) => rows.set(key, value) }; };

describe("sportsbook prop discovery", () => {
  it("reads provider metadata without changing the visible matchup", () => {
    const meta = propMarketMeta({ id: 3, title: "Lamar Jackson · Passing yards", provider_key: "sgo:event:odd",
      lore_note: "BAL @ PIT · Book consensus 244.5 · 6 books · real consensus pricing · POS QB · TEAM BAL",
      provider_updated_at: "2026-09-30T12:00:00Z" }, [{ odds_american: -105 }, { odds_american: -115 }]);
    expect(meta).toMatchObject({ player: "Lamar Jackson", stat: "Passing yards", matchup: "BAL @ PIT", position: "QB", team: "BAL", books: 6, bestPrice: -105 });
  });

  it("combines search, roster and favorite filters", () => {
    const meta = { key: "p1", player: "Lamar Jackson", stat: "Passing yards", matchup: "BAL @ PIT", position: "QB", team: "BAL", source: "sportsbooks" };
    expect(propMatches(meta, { query: "lamar", position: "QB", team: "BAL", favorites: true, favoriteKeys: new Set(["p1"]) })).toBe(true);
    expect(propMatches(meta, { position: "RB" })).toBe(false);
  });

  it("persists favorites per member and sorts by best price", () => {
    const storage = memory();
    togglePropFavorite(7, "one", storage);
    expect([...readPropFavorites(7, storage)]).toEqual(["one"]);
    const rows = [{ meta: { player: "A", bestPrice: -120 } }, { meta: { player: "B", bestPrice: 105 } }];
    expect(sortPropRows(rows, "price")[0].meta.player).toBe("B");
  });
});

it('uses the game-total matchup label for older prop rows with only book notes',async()=>{
 const {propGameNames}=await import('./sportsbook-props.js');
 const names=propGameNames([{category:'Game Totals',provider_event_id:'game',title:'Bills @ Patriots · Game total'}]);
 const meta=propMarketMeta({title:'Josh Allen · Passing yards',lore_note:'Book consensus 230 · 4 books',provider_event_id:'game'},[],names.get('game'));
 expect(meta.matchup).toBe('Bills @ Patriots');expect(propMatches(meta,{query:'Patriots'})).toBe(true);
});
