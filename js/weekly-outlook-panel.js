import {disclosure,wirePageDisclosures} from "./page-disclosure.js";
// =====================================================================
// weekly-outlook-panel.js - the week view on top of the Team Analyzer
// ---------------------------------------------------------------------
// The season report is a good answer to a question nobody asks on a
// Saturday. This puts the week in front of it: what is wrong with the
// lineup right now, what it costs, and what to do about it.
//
// IT MOUNTS ITSELF, and it mounts OUTSIDE [data-ta-body].
//
// analyzer.js redraws its whole report with body.innerHTML on every team
// change. Anything rendered inside that element is destroyed on the next
// redraw, and anything that re-inserts itself afterwards is racing a file
// somebody else is actively editing. Sitting as a sibling just before it
// means the redraws cannot touch this panel and this panel never touches
// them - no edit to analyzer.js, no conflict with work in flight there.
//
// The team selector is read rather than duplicated, so the week view is
// always showing the same team as the report underneath it.
// =====================================================================

import { mountLineupLab } from "./lineup-lab-ui.js";
import { onRoute } from "./router.js";
import { loadAnalyzerData } from "./team-analyzer-data.js";
import { loadTrendingPlayers, loadWeeklyProjections } from "./sleeper.js";
import { loadLeagueState } from "./league-state.js";
import { buildWeeklyPool, defenseDifficulty, matchupNote, startSitAdvice } from "./weekly-outlook.js";
import { ensureStylesheet } from "./lazy-css.js";
import { esc } from "./ui.js";
import { playerLiveState } from "./live-score.js";

const HOST = "data-weekly-outlook";
const pts = value => (Number.isFinite(value) ? value.toFixed(1) : "—");

// Both data sources own their cache TTLs; avoid keeping a stale session promise.
const analyzer = () => loadAnalyzerData();
const weekly = (season, week) => loadWeeklyProjections(season, week);

function chip(matchup) {
  if (!matchup) return "";
  return `<span class="wo-chip is-${matchup.tone}" title="${esc(matchup.opponent)} concede the ${matchup.rank}${matchup.rank === 1 ? "st" : matchup.rank === 2 ? "nd" : matchup.rank === 3 ? "rd" : "th"} most of ${matchup.count}">vs ${esc(matchup.opponent)} · ${esc(matchup.tone)}</span>`;
}

function statusTag(player) {
  if (!player) return "";
  if (!player.hasGame) return `<span class="wo-tag is-out">No game</span>`;
  if (player.isOut) return `<span class="wo-tag is-out">${esc(player.injuryStatus || "Out")}</span>`;
  if (player.isRisky) return `<span class="wo-tag is-risk">${esc(player.injuryStatus)}</span>`;
  return "";
}

function trendTag(id, trending) {
  const adds = trending?.adds?.get(String(id)) || 0;
  const drops = trending?.drops?.get(String(id)) || 0;
  if (adds >= 1000) return `<span class="wo-tag is-hot">+${Math.round(adds / 1000)}k adds</span>`;
  if (drops >= 1000) return `<span class="wo-tag is-cold">−${Math.round(drops / 1000)}k drops</span>`;
  return "";
}

function swapCard(swap, trending) {
  return `<li class="wo-swap ${swap.urgent ? "is-urgent" : ""}">
    <div class="wo-swap-verdict">
      <span class="wo-swap-badge">${swap.urgent ? "MUST" : `+${pts(swap.gain)}`}</span>
      <small>${swap.urgent ? "cannot play" : "projected gain"}</small>
    </div>
    <div class="wo-swap-move">
      <div class="wo-side is-in">
        <small>START</small>
        <strong>${esc(swap.in.name)}</strong>
        <span class="wo-meta">${esc(swap.in.position)} · ${pts(swap.in.points)} pts ${chip(swap.matchupIn)} ${trendTag(swap.in.id, trending)}</span>
      </div>
      <div class="wo-side is-out">
        <small>BENCH</small>
        <strong>${esc(swap.out.name)}</strong>
        <span class="wo-meta">${esc(swap.out.position)} · ${pts(swap.out.points)} pts ${statusTag(swap.out)} ${chip(swap.matchupOut)}</span>
      </div>
    </div>
  </li>`;
}

function lineupRow(slot, max, trending, defense) {
  const player = slot.player;
  const live = playerLiveState(player || { hasGame: false });
  const width = max > 0 && slot.score ? Math.max(4, Math.round(slot.score / max * 100)) : 0;
  /* The board carries the matchup too, not just the swaps: a start you are
     not being told to change is still a start you might want to reconsider. */
  const matchup = player ? matchupNote(player, defense) : null;
  return `<li class="wo-slot">
    <span class="wo-pos">${esc(slot.position)}</span>
    <span class="wo-name">${player ? esc(player.name) : "<em>nobody available</em>"}
      ${player ? `<small>${matchup ? chip(matchup) : player.opponent ? `vs ${esc(player.opponent)}` : "no opponent set"} ${statusTag(player)} ${trendTag(player.id, trending)}</small>` : ""}</span>
    <span class="wo-bar" aria-hidden="true"><i style="width:${width}%"></i></span>
    <span class="wo-pts is-${live.key}"><b>${pts(slot.score)}</b><small>${esc(live.label)}</small></span>
  </li>`;
}

function markup({ week, team, advice, trending, defense, stale }) {
  const max = Math.max(...advice.lineup.slots.map(slot => slot.score || 0), 1);
  const bench = advice.pointsOnBench;
  /* "Optimal" is only true of a lineup that exists. An empty lineup has
     nothing to swap and no alarms either, and would otherwise be congratulated
     for it - the single most misleading thing this panel could say. */
  const unset = !advice.lineupIsSet;
  const clean = !unset && !advice.swaps.length && !advice.alarms.length;
  return `<section class="wo-panel">
    <header class="wo-head">
      <div>
        <small>WEEK ${esc(week)} · THIS WEEK</small>
        <h2>${esc(team)}</h2>
      </div>
      <div class="wo-verdict ${clean ? "is-clean" : unset || bench > 0 ? "is-warn" : ""}">
        <strong>${unset ? "Not set" : clean ? "Lineup is optimal" : pts(bench)}</strong>
        <span>${unset ? "no lineup submitted" : clean ? "nothing to change" : "points on your bench"}</span>
      </div>
    </header>

    ${advice.alarms.length ? `<ul class="wo-alarms">${advice.alarms.map(alarm =>
      `<li><span class="wo-tag is-out">!</span> <strong>${esc(alarm.player.name)}</strong> is in your lineup and ${esc(alarm.reason)}.</li>`).join("")}</ul>` : ""}

    ${advice.swaps.length ? `<div class="wo-block">
      <div class="wo-block-head"><h3>Make ${advice.swaps.length} change${advice.swaps.length === 1 ? "" : "s"}</h3>
        <small>only moves worth more than 1.5 projected points</small></div>
      <div class="wo-move-list"><ul class="wo-swaps">${advice.swaps.slice(0,1).map(swap => swapCard(swap, trending)).join("")}</ul>${advice.swaps.length>1?disclosure("analyzer-more-moves",`View ${advice.swaps.length-1} more lineup moves`,"Other projected upgrades",`<ul class="wo-swaps">${advice.swaps.slice(1).map(swap=>swapCard(swap,trending)).join("")}</ul>`):""}</div>
    </div>` : `<p class="wo-clean">${advice.lineupIsSet
      ? "Every starter is the best legal option at their slot this week."
      : "No lineup submitted yet — the board below is the one to set."}</p>`}

    ${disclosure("analyzer-week-lineup","View full weekly lineup",`${pts(advice.bestTotal)} projected · scoring and data sources`, `    <div class="wo-block">
      <div class="wo-block-head"><h3>Best legal lineup</h3><small>${pts(advice.bestTotal)} projected</small></div>
      <ul class="wo-lineup">${advice.lineup.slots.map(slot => lineupRow(slot, max, trending, defense)).join("")}</ul>
    </div>

    <p class="wo-method">Week ${esc(week)} projections, matchup and injury status from one Sleeper call, scored with the league's own settings. Matchup rates how much each defense is projected to concede this week. A player with no published projection is left out rather than counted as zero. Players who cannot play are excluded; everyone else is ranked on the published number, with injury flags shown rather than quietly subtracted.${stale ? " Showing the last cached copy — the live fetch failed." : ""}</p>`)}
    ${stale?'<p class="wo-method" role="status">Using cached projections after a failed refresh.</p>':""}
  </section>`;
}

async function draw(host) {
  const token = (host.drawGeneration || 0) + 1; host.drawGeneration = token;
  const data = await analyzer();
  if (data.state !== "ready") { host.innerHTML = ""; return; }

  const select = document.querySelector("[data-ta-team-select]");
  const chosen = select?.value;
  const team = data.teams.find(item => String(item.id) === String(chosen)) || data.teams[0];
  if (!team) { host.innerHTML = ""; return; }

  const state = await loadLeagueState().catch(() => null);
  const season = Number(state?.season) || data.projectionSeason;
  const week = Number(state?.currentWeek) || 1;

  const [projections, trending] = await Promise.all([
    weekly(season, week),
    loadTrendingPlayers().catch(() => null),
  ]);
  if (!projections?.data?.length) { host.innerHTML = ""; return; }

  const pool = buildWeeklyPool(projections.data, data.league?.scoring_settings || null);
  const defense = defenseDifficulty(pool);
  const advice = startSitAdvice({
    playerIds: team.playerIds || [],
    starterIds: team.starters || team.lineup?.starterIds || [],
    weekly: pool,
    defense,
  });
  if (!host.isConnected || host.drawGeneration !== token) return;
  host.innerHTML = markup({
    week,
    team: team.team_name || team.ownerName || "Your team",
    advice, trending, defense, stale: projections.stale,
  });
  const game=(data.matchups||[]).find(g=>Number(g.season)===season&&Number(g.week)===week&&[g.roster1,g.roster2].map(String).includes(String(team.id)));
  const opponent=game?data.teams.find(t=>String(t.id)===String(String(game.roster1)===String(team.id)?game.roster2:game.roster1)):null;
  const lab=document.createElement('div');lab.innerHTML=disclosure("analyzer-tools","Try a lineup swap or read this week’s strategy","Lineup lab and weekly lesson",'<div data-lab-tools></div>');host.append(lab);mountLineupLab(lab.querySelector("[data-lab-tools]"),{team,opponent,weekly:pool,week,season,defense,fetchedAt:projections.fetchedAt,stale:projections.stale});
  wirePageDisclosures(host);
}

let selectorBound=false;
function attach() {
  const report = document.querySelector("[data-ta-body]");
  if (!report) return false;
  let host = document.querySelector(`[${HOST}]`);
  if (!host) {
    host = document.createElement("div");
    host.setAttribute(HOST, "");
    /* Before the report, not inside it - see the header. */
    report.parentElement.insertBefore(host, report);
  }
  if(!selectorBound){
    selectorBound=true;
    document.addEventListener("change", event => {
      const currentHost=document.querySelector(`[${HOST}]`);
      if(currentHost&&event.target?.matches?.("[data-ta-team-select]"))void draw(currentHost).catch(()=>{});
    });
  }
  void draw(host).catch(() => { host.innerHTML = ""; });
  return true;
}

export function mountWeeklyOutlook() {
  const enter = async (name) => {
    if (name !== "analyzer") return;
    await ensureStylesheet("css/weekly-outlook.css");
    /* analyzer.js paints a loading shell first and swaps in the real markup
       after its data resolves, so the mount point may not exist yet. */
    if (attach()) return;
    const view = document.getElementById("view");
    if (!view) return;
    const watcher = new MutationObserver(() => { if (attach()) watcher.disconnect(); });
    watcher.observe(view, { childList: true, subtree: true });
    setTimeout(() => watcher.disconnect(), 30000);
  };
  onRoute(enter);
  /* onRoute only fires on the NEXT navigation. Someone who opened the app
     straight onto #/analyzer - a tapped notification, a bookmark - has
     already had theirs, so the current route is checked once here too. */
  const now = (location.hash.split("?")[0] || "").replace(/^#\//, "") || "home";
  if (now === "analyzer") void enter("analyzer");
}
