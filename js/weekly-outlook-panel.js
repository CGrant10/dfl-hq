import {startSitContent} from './start-sit-ui.js';
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

import {mountPlayerWatchlist} from './player-watchlist-ui.js';
import {mountAdviceReceipts} from "./advice-receipts-ui.js";
import { mountLineupLab } from "./lineup-lab-ui.js";
import {mountRosterCoach} from './roster-coach-ui.js';
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
  return `<span class="wo-chip is-${matchup.tone}" title="${esc(matchup.opponent)} are projected to allow the ${matchup.rank}${matchup.rank === 1 ? "st" : matchup.rank === 2 ? "nd" : matchup.rank === 3 ? "rd" : "th"} most of ${matchup.count}">vs ${esc(matchup.opponent)} · ${esc(matchup.tone)}</span>`;
}

function statusTag(player) {
  if (!player) return "";
  if (player.hasGame===false&&player.scheduleKnown!==false) return `<span class="wo-tag is-out">No game</span>`;
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

function markup({ week, team, advice, trending, defense, stale, showScore }) {
  const max = Math.max(...advice.lineup.slots.map(slot => slot.score || 0), 1);
  const total=advice.completeEstimate?`${pts(advice.bestTotal)} projected`:'Partial projections';
  return `<section class="wo-panel wo-startsit">
    <header class="wo-head"><div><small>WEEK ${esc(week)} · ${esc(team)}</small><h2>Start / Sit</h2></div>
    ${showScore&&advice.completeEstimate?`<div class="wo-projection"><strong>${pts(advice.bestTotal)}</strong><small>Lineup · proj.</small></div>`:''}</header>
    ${startSitContent(advice)}
    ${disclosure("analyzer-week-lineup","View projected lineup",total,`<div class="wo-block"><ul class="wo-lineup">${advice.lineup.slots.map(slot=>lineupRow(slot,max,trending,defense)).join('')}</ul></div>`)}
    <p class="ss-source">Sleeper weekly projections · League scoring${stale?' · Cached data':''}</p>
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

  const pool = buildWeeklyPool(projections?.data||[], data.league?.scoring_settings || null,{players:data.pool,schedule:Number(data.liveWeek)===week?data.nflSchedule:null});
  const defense = defenseDifficulty(pool);
  const advice = startSitAdvice({
    playerIds: team.playerIds || [],
    starterIds: team.starters || team.lineup?.starterIds || [],
    weekly: pool,
    defense,
    rosterPositions:data.league?.roster_positions,stale:!!projections.stale,
  });
  if (!host.isConnected || host.drawGeneration !== token) return;
  host.stopWatchlist?.();
  host.innerHTML = markup({
    week,
    team: team.team_name || team.ownerName || "Your team",
    advice, trending, defense, stale: projections.stale,
    showScore: !!host.closest('[data-route="analyzer"]'),
  });
  const watch=document.createElement('div');host.append(watch);host.stopWatchlist=mountPlayerWatchlist(watch,{data,season,week});
  if(new URLSearchParams(location.hash.split('?')[1]||'').get('watchlist')==='1'&&!host.dataset.watchJumped){host.dataset.watchJumped='1';watch.querySelector('.player-watchlist')?.scrollIntoView({block:'start'});}
  const coach=document.createElement('div');host.append(coach);mountRosterCoach(coach,{data,team,season,week});
  const receipts=document.createElement('div');host.append(receipts);mountAdviceReceipts(receipts,{leagueId:data.league.sleeper_league_id,season,week,rosterId:team.id,history:true,teamNames:new Map(data.teams.map(t=>[String(t.id),t.team_name||t.ownerName]))});
  const game=(data.matchups||[]).find(g=>Number(g.season)===season&&Number(g.week)===week&&[g.roster1,g.roster2].map(String).includes(String(team.id)));
  const opponent=game?data.teams.find(t=>String(t.id)===String(String(game.roster1)===String(team.id)?game.roster2:game.roster1)):null;
  const lab=document.createElement('div');lab.innerHTML=disclosure("analyzer-tools","Try a lineup swap or read this week’s strategy","Lineup lab and weekly lesson",'<div data-lab-tools></div>');host.append(lab);mountLineupLab(lab.querySelector("[data-lab-tools]"),{team,opponent,weekly:pool,week,season,defense,fetchedAt:projections.fetchedAt,stale:projections.stale});
  wirePageDisclosures(host);
}

let activeWatchHost=null;
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
  if(activeWatchHost!==host)activeWatchHost?.stopWatchlist?.();
  activeWatchHost=host;
  void draw(host).catch(() => { host.stopWatchlist?.();host.innerHTML = ""; });
  return true;
}

export function mountWeeklyOutlook() {
  const enter = async (name) => {
    if (name !== "analyzer") { activeWatchHost?.stopWatchlist?.();activeWatchHost=null;return; }
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
