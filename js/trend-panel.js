// =====================================================================
// trend-panel.js - the multi-season record, drawn
// ---------------------------------------------------------------------
// IT LOADS NOTHING UNTIL IT IS OPENED.
//
// Three completed seasons is three Sleeper stat maps at roughly 1.8MB
// each. Paying 5.6MB on every visit to the analyzer - on a phone, on the
// league's data - to fill a section most people scroll past would undo
// the whole point of folding it. The fetch starts on the first open and
// the result is kept for the session.
//
// The sparkline is inline SVG rather than a chart library: three to five
// points do not need one, and a 40KB dependency to draw four line
// segments is a poor trade on a page already carrying player maps.
// =====================================================================

import { loadSeasonStats, loadTrendingPlayers } from "./sleeper.js";
import { buildHistories, marketSignal } from "./player-history.js";
import { esc } from "./ui.js";

/* How far back to look. Four seasons is two slopes' worth of evidence and
   still recent enough to be about this player rather than a different one. */
export const HISTORY_SEASONS = 3;

/*
  Spread as a share of the player's own average.

  Calibrated against a real roster rather than guessed. An absolute
  4-points-a-game rule tagged 73% of it volatile - a label on three players in
  four tells you nothing. At 0.85 the same roster flags 8%, and it flags the
  right ones: Jordan Mason (2.6 -> 9.8 -> 8.1) yes, Drake Maye (13.6 -> 20.8, a
  clean climb on a high base) no. Deliberately strict - a warning that fires
  rarely is one people read.
*/
export const VOLATILE_SHARE = 0.85;

const TONE = { rising: "up", falling: "down", steady: "flat", insufficient: "unknown" };
const WORD = { rising: "Rising", falling: "Falling", steady: "Steady", insufficient: "Not enough history" };

let cache = null;

async function load(season, scoringSettings, playerIds) {
  if (cache) return cache;
  const years = Array.from({ length: HISTORY_SEASONS }, (_, i) => season - 1 - i);
  const [stats, trending] = await Promise.all([
    Promise.all(years.map(year => loadSeasonStats(year)
      .then(res => ({ year, stats: res.data || {} }))
      .catch(() => ({ year, stats: {} })))),
    loadTrendingPlayers({ hours: 48, limit: 300 }).catch(() => null),
  ]);
  cache = {
    histories: buildHistories({ playerIds, statsBySeason: stats, scoringSettings }),
    trending,
    years: stats.filter(s => Object.keys(s.stats).length).map(s => s.year).sort(),
  };
  return cache;
}

/** A sparkline of per-game scoring. Flat when there is one point to draw. */
function sparkline(series) {
  if (!series.length) return "";
  const W = 78, H = 26, pad = 3;
  const rates = series.map(s => s.perGame);
  const min = Math.min(...rates), max = Math.max(...rates);
  const span = max - min || 1;
  const step = series.length > 1 ? (W - pad * 2) / (series.length - 1) : 0;
  const points = series.map((s, i) => {
    const x = pad + i * step;
    const y = H - pad - ((s.perGame - min) / span) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points.at(-1).split(",");
  return `<svg class="tp-spark" viewBox="0 0 ${W} ${H}" role="img"
    aria-label="${series.map(s => `${s.year}: ${s.perGame.toFixed(1)} a game`).join(", ")}">
    ${series.length > 1 ? `<polyline points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="currentColor"/>
  </svg>`;
}

function row(player, history, trending) {
  const market = marketSignal(player.id, trending);
  const tone = TONE[history.direction];
  const seasons = history.seasons;
  const latest = seasons.at(-1);
  return `<li class="tp-row is-${tone}">
    <div class="tp-who">
      <b>${esc(player.name)}</b>
      <small>${esc(player.position)} · ${esc(player.nflTeam)}</small>
    </div>
    <div class="tp-spark-wrap">${sparkline(seasons)}</div>
    <div class="tp-read">
      <span class="tp-dir">${esc(WORD[history.direction])}</span>
      <small>${seasons.length
        ? `${seasons.map(s => `${s.year} ${s.perGame.toFixed(1)}`).join(" · ")} per game`
        : "no completed season on record"}</small>
    </div>
    <div class="tp-tags">
      ${history.volatility != null && history.volatility >= VOLATILE_SHARE
        ? `<span class="tp-tag is-swing" title="Best and worst seasons are ${history.swing.toFixed(1)} points a game apart, on a ${history.mean.toFixed(1)} average">Volatile</span>` : ""}
      ${history.availability != null && history.availability < .72
        ? `<span class="tp-tag is-risk" title="Averaged ${Math.round(history.availability * 17)} of 17 games">Missed time</span>` : ""}
      ${market ? `<span class="tp-tag is-${market.tone}">${esc(market.label)}</span>` : ""}
      ${latest ? `<span class="tp-latest">${latest.points.toFixed(0)} pts ${latest.year}</span>` : ""}
    </div>
  </li>`;
}

export async function renderTrendPanel(host, { team, pool, season, scoringSettings }) {
  if (!host || host.dataset.loaded === "1") return;
  host.dataset.loaded = "1";
  host.innerHTML = `<p class="tp-loading">Reading the last ${HISTORY_SEASONS} completed seasons…</p>`;

  const players = (team.playerIds || []).map(id => pool.get(String(id))).filter(Boolean);
  try {
    const { histories, trending, years } = await load(season, scoringSettings, players.map(p => p.id));
    const ranked = players
      .map(player => ({ player, history: histories.get(String(player.id)) }))
      .filter(entry => entry.history)
      .sort((a, b) => (b.history.slope ?? -99) - (a.history.slope ?? -99));

    host.innerHTML = `
      <p class="tp-intro">Per-game scoring across ${years.length ? years.join(", ") : "the seasons on record"},
        in the league's own scoring. Rate rather than season total, so missed games do not read as decline;
        availability is called out separately.</p>
      <ul class="tp-list">${ranked.map(({ player, history }) => row(player, history, trending)).join("")}</ul>`;
  } catch (error) {
    host.dataset.loaded = "";
    host.innerHTML = `<p class="tp-loading">Could not read the season history. ${esc(error.message || "")}</p>`;
  }
}

/** Fires the load the first time its <details> is opened, and only then. */
export function wireTrendPanel(root, options) {
  const details = root?.closest("details") || root?.parentElement?.closest("details");
  const host = root;
  if (!host) return;
  if (details?.open) { void renderTrendPanel(host, options); return; }
  details?.addEventListener("toggle", () => {
    if (details.open) void renderTrendPanel(host, options);
  }, { once: false });
}
