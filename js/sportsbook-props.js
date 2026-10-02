const keyFor = memberId => `dfl.sportsbook.propFavorites.${memberId || "guest"}`;

export function readPropFavorites(memberId, storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(keyFor(memberId)) || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch { return new Set(); }
}

export function togglePropFavorite(memberId, propKey, storage = globalThis.localStorage) {
  const favorites = readPropFavorites(memberId, storage);
  const key = String(propKey || "");
  if (!key) return favorites;
  if (favorites.has(key)) favorites.delete(key); else favorites.add(key);
  try { storage?.setItem(keyFor(memberId), JSON.stringify([...favorites])); } catch {}
  return favorites;
}

const token = (note, name) => String(note || "").match(new RegExp(`(?:^| · )${name} ([^·]+)`, "i"))?.[1]?.trim() || "";

export function propMarketMeta(market = {}, outcomes = [], matchupName = "") {
  const [player = "Player", stat = "Prop"] = String(market.title || "").split("·").map(value => value.trim());
  const note = String(market.lore_note || "");
  const matchup = matchupName || note.split(" · Book consensus")[0].trim() || "NFL props";
  const books = Number(note.match(/(?:^| · )(\d+) books?\b/i)?.[1]) || 0;
  const providerKey = String(market.provider_key || "");
  const prices = outcomes.map(outcome => Number(outcome.odds_american)).filter(Number.isFinite);
  return {
    key: providerKey || String(market.id || ""),
    player,
    stat,
    matchup,
    position: token(note, "POS").toUpperCase(),
    team: token(note, "TEAM").toUpperCase(),
    books,
    source: providerKey.startsWith("sleeper-import:") ? "sleeper" : "sportsbooks",
    sourceLabel: providerKey.startsWith("sleeper-import:") ? "Sleeper line" : books ? `Best of ${books} books` : "Best available",
    updatedAt: Date.parse(market.provider_updated_at || market.updated_at || "") || 0,
    bestPrice: prices.length ? Math.max(...prices) : -Infinity,
  };
}

export function propMatches(meta, filters = {}) {
  const query = String(filters.query || "").trim().toLowerCase();
  const haystack = `${meta.player} ${meta.stat} ${meta.team} ${meta.matchup}`.toLowerCase();
  return (!query || haystack.includes(query))
    && (!filters.stat || meta.stat.toLowerCase().includes(String(filters.stat).toLowerCase()))
    && (!filters.position || meta.position === String(filters.position).toUpperCase())
    && (!filters.team || meta.team === String(filters.team).toUpperCase())
    && (!filters.game || meta.matchup === filters.game)
    && (!filters.source || meta.source === filters.source)
    && (!filters.favorites || filters.favoriteKeys?.has(meta.key));
}

export function sortPropRows(rows = [], mode = "player") {
  const copy = [...rows];
  return copy.sort((a, b) => {
    if (mode === "updated") return b.meta.updatedAt - a.meta.updatedAt || a.meta.player.localeCompare(b.meta.player);
    if (mode === "price") return b.meta.bestPrice - a.meta.bestPrice || a.meta.player.localeCompare(b.meta.player);
    if (mode === "stat") return a.meta.stat.localeCompare(b.meta.stat) || a.meta.player.localeCompare(b.meta.player);
    return a.meta.player.localeCompare(b.meta.player) || String(a.meta.stat || "").localeCompare(String(b.meta.stat || ""));
  });
}

export function propGameNames(markets){
 return new Map(markets.filter(m=>m.category==="Game Totals"&&m.provider_event_id).map(m=>[String(m.provider_event_id),String(m.title||"").split("·")[0].trim()]));
}
