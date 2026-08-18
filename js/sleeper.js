// =====================================================================
// sleeper.js - a thin wrapper around the public Sleeper API
// ---------------------------------------------------------------------
// Sleeper's read API needs no key and no login, and it allows browser
// requests, so we can call it straight from the page. It is READ ONLY:
// nothing in this app can change anything in Sleeper.
//
// Docs: https://docs.sleeper.com
// =====================================================================

const BASE = "https://api.sleeper.app/v1";

/** GET a Sleeper endpoint and return parsed JSON (or null for 404). */
async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Sleeper API ${res.status} on ${path}`);
  return res.json();
}

export const sleeper = {
  /** Current NFL season / week. */
  state:        ()            => get(`/state/nfl`),
  league:       (id)          => get(`/league/${id}`),
  users:        (id)          => get(`/league/${id}/users`),
  rosters:      (id)          => get(`/league/${id}/rosters`),
  matchups:     (id, week)    => get(`/league/${id}/matchups/${week}`),
  transactions: (id, week)    => get(`/league/${id}/transactions/${week}`),
  winnersBracket: (id)        => get(`/league/${id}/winners_bracket`),
  /*
    THE DRAFT. Two calls: the league's drafts (one per season for DFL), then
    that draft's picks. A pick carries round, pick_no, draft_slot, player_id,
    roster_id and picked_by - picked_by being a Sleeper USER id, the same
    thing members.sleeper_user_id holds, so a pick maps to a member without
    going anywhere near a name.

    Verified against this league: 180 picks per season for 2020-2025, zero
    for 2019 (not drafted on Sleeper) and zero for a draft still in
    pre_draft. An absent draft is a null, not an error.
  */
  drafts:       (id)          => get(`/league/${id}/drafts`),
  draftPicks:   (draftId)     => get(`/draft/${draftId}/picks`),
};

// ---------------------------------------------------------------------
// Player names
// ---------------------------------------------------------------------
// Rosters come back as bare player ids ("4034"). The id -> name map is a
// separate ~5MB download, far too big to pull on every page load, so we
// fetch it only when something actually needs to show names and keep it
// in the Cache API for a week.
// ---------------------------------------------------------------------

const PLAYER_CACHE = "sleeper-players-v1";
const PLAYER_URL   = `${BASE}/players/nfl`;
const WEEK_MS      = 7 * 24 * 60 * 60 * 1000;

let playersPromise = null;

/**
 * Returns a { player_id: {name, position, team} } map.
 * First call may take a few seconds; after that it is instant.
 */
export function loadPlayers() {
  if (playersPromise) return playersPromise;

  playersPromise = (async () => {
    const cache = await caches.open(PLAYER_CACHE);
    const hit = await cache.match(PLAYER_URL);

    if (hit) {
      const age = Date.now() - Number(hit.headers.get("x-fetched-at") || 0);
      if (age < WEEK_MS) return trim(await hit.json());
    }

    const res = await fetch(PLAYER_URL);
    if (!res.ok) throw new Error(`Could not load the Sleeper player list (${res.status})`);
    const raw = await res.json();

    // Store a slimmed copy - the full payload is mostly fields we never use.
    const slim = trim(raw);
    await cache.put(PLAYER_URL, new Response(JSON.stringify(slim), {
      headers: { "Content-Type": "application/json", "x-fetched-at": String(Date.now()) },
    }));
    return slim;
  })();

  return playersPromise;
}

function trim(map) {
  // Already slimmed on the way out of the cache.
  const first = Object.values(map)[0];
  if (first && first.n !== undefined) return map;

  const out = {};
  for (const [id, p] of Object.entries(map)) {
    out[id] = {
      n: p.full_name || `${p.first_name || ""} ${p.last_name || ""}`.trim() || id,
      p: p.position || "",
      t: p.team || "FA",
    };
  }
  return out;
}

/** Friendly name for a player id, once loadPlayers() has resolved. */
export function playerName(players, id) {
  const p = players?.[id];
  return p ? `${p.n} (${p.p} · ${p.t})` : id;
}
