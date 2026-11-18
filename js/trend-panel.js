// =====================================================================
// trend-panel.js - the multi-season record, drawn
// ---------------------------------------------------------------------
// IT LOADS AFTER THE REPORT, NEVER DURING IT.
//
// Three completed seasons is three Sleeper stat maps at roughly 1.8MB
// each - but loadSeasonStats caches for a week, so that is one fetch per
// device per week rather than one per visit. The folded section loads on
// demand, after the main report. Current production reuses the player pool.
//
// The sparkline is inline SVG rather than a chart library: three to five
// points do not need one, and a 40KB dependency to draw four line
// segments is a poor trade on a page already carrying player maps.
// =====================================================================

import { loadSeasonStats, loadTrendingPlayers } from "./sleeper.js";
import { buildHistories, marketSignal, withCurrentSeason } from "./player-history.js";
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
const WORD = { rising: "Rising", falling: "Falling", steady: "Steady" };

let cache = null;

async function load(season) {
  // Cache raw season maps, never a first team's roster/scoring-specific result.
  // The live player pool is supplied afresh on every analyzer render.
  if (cache?.season === season && Date.now() - cache.at < 5 * 60 * 1000) return cache.promise;
  const years = Array.from({ length: HISTORY_SEASONS }, (_, i) => season - 1 - i);
  const promise = Promise.all([
    Promise.all(years.map(year => loadSeasonStats(year)
      .then(res => ({ year, stats: res.data || {} }))
      .catch(() => ({ year, stats: {} })))),
    loadTrendingPlayers({ hours: 48, limit: 300 }).catch(() => null),
  ]).then(([stats, trending]) => ({ stats, trending }));
  cache = { season, at: Date.now(), promise };
  return promise;
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
    aria-label="${series.map(s => `${s.year}${s.inProgress?` so far, ${s.games} games`:""}: ${s.perGame.toFixed(1)} a game`).join(", ")}">
    ${series.length > 1 ? `<polyline points="${points.join(" ")}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    <circle cx="${last[0]}" cy="${last[1]}" r="2.6" fill="currentColor"/>
  </svg>`;
}

function row(player, history, trending) {
  const market = marketSignal(player.id, trending);
  const tone = TONE[history.direction];
  const seasons = history.seasons;
  const latest = seasons.at(-1);
  const label = history.direction !== "insufficient" ? WORD[history.direction]
    : history.current ? (history.current.games < 3 ? "Early sample" : "This season")
    : seasons.length ? "1 season recorded" : "No games recorded";
  return `<li class="tp-row is-${tone}">
    <div class="tp-who">
      <b>${esc(player.name)}</b>
      <small>${esc(player.position)} · ${esc(player.nflTeam)}</small>
    </div>
    <div class="tp-spark-wrap">${sparkline(seasons)}</div>
    <div class="tp-read">
      <span class="tp-dir">${esc(label)}</span>
      <small>${seasons.length
        ? `${seasons.map(s => `${s.year} ${s.perGame.toFixed(1)}`).join(" · ")} per game`
        : "—"}</small>
    </div>
    <div class="tp-tags">
      ${history.volatility != null && history.volatility >= VOLATILE_SHARE
        ? `<span class="tp-tag is-swing" title="Best and worst seasons are ${history.swing.toFixed(1)} points a game apart, on a ${history.mean.toFixed(1)} average">Volatile</span>` : ""}
      ${history.availability != null && history.availability < .72
        ? `<span class="tp-tag is-risk" title="Averaged ${Math.round(history.availability * 17)} of 17 games">Missed time</span>` : ""}
      ${market ? `<span class="tp-tag is-${market.tone}">${esc(market.label)}</span>` : ""}
      ${latest ? `<span class="tp-latest">${latest.inProgress?`${latest.games} games · ${latest.points.toFixed(1)} pts`:`${latest.points.toFixed(0)} pts ${latest.year}`}</span>` : ""}
    </div>
  </li>`;
}

export async function renderTrendPanel(host, { team, pool, season, scoringSettings }) {
  if (!host || host.dataset.loaded === "1") return;
  host.dataset.loaded = "1";
  host.innerHTML = `<p class="tp-loading">Reading player production…</p>`;

  const players = (team.playerIds || []).map(id => pool.get(String(id))).filter(Boolean);
  try {
    const { stats, trending } = await load(season);
    const histories = buildHistories({ playerIds: players.map(p => p.id), statsBySeason: stats, scoringSettings });
    const ranked = players
      .map(player => ({ player, history: withCurrentSeason(histories.get(String(player.id)), player, season) }))
      .filter(entry => entry.history)
      .sort((a, b) => (b.history.slope ?? -99) - (a.history.slope ?? -99));

    host.innerHTML = `
      <p class="tp-intro">${esc(season)} production + prior seasons · points per game</p>
      <ul class="tp-list">${ranked.map(({ player, history }) => row(player, history, trending)).join("")}</ul>`;
  } catch (error) {
    host.dataset.loaded = "";
    host.innerHTML = `<p class="tp-loading">Could not read the season history. ${esc(error.message || "")}</p>`;
  }
}

/** Load season history when its section opens, including a remembered open state. */
export function wireTrendPanel(root, options) {
  if (!root || root.dataset.loaded === "1") return;
  const section=root.closest('details');
  const start=()=>{if(root.isConnected)void renderTrendPanel(root,options).catch(()=>{})};
  if(section){section.addEventListener('toggle',()=>{if(section.open)start()});if(section.open)start()}
  else start();
}
