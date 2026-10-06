import {mountGameDay} from "../game-day.js";
import {disclosure,wirePageDisclosures} from "../page-disclosure.js";
import {loadClubhouseWeek,loadWeeklyRosters} from "../weekly-clubhouse-data.js";
// =====================================================================
// Home - the league's front page.
// ---------------------------------------------------------------------
// This was a crest, a nav strip and three lists of database rows. It now
// leads with whatever is actually happening, because that is the only
// question a front page has to answer:
//
//   THE STAGE     the DFL Broadcast billboard. Curated commissioner slides,
//                 genuinely important live competition, and league lore.
//                 Routine utility belongs to the league desk and its pages.
//   THE SNAPSHOT  three visible figures - your record, the leader and dues -
//                 each a link to where it came from.
//   THE CREED     DRAFT * GOLF * SIN * FOLD, still the navigation.
//   NEWS          announcements as news cards rather than table rows.
//
// The stage is deliberately the only place on this page allowed a big
// number, and the crest sits in an identity block at the bottom: the splash
// carries the brand on launch, so repeating it at full size above the fold
// made the page an About screen.
// =====================================================================
import { db, configured } from "../supabase.js";
import { activityLine, ACTIVITY_RPC, ACTIVITY_MISSING } from "../activity.js";
import { esc, fmtDate, fmtWhen, fmtShort, money, errorBox, toast } from "../ui.js";
import { APP_VERSION, LEAGUE_FOUNDED } from "../config.js";
import { checkForUpdate } from "../update.js";
import { promptInstall, isInstalled } from "../install.js";
import { currentMember, loadMemberDirectory } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { loadSettings, saveSetting, KEY_LOGO, broadcastOff } from "../settings.js";
import { loadLore } from "../lore.js";
import { broadcastContext, buildDeck, loadGolfDay, loadBroadcastItems, loadBroadcastOverrides } from "../broadcast-deck.js";
import {homeBroadcastDeck,homeLeagueFile,homeLeagueTools,homeNewspaperMasthead,wireHomeNewspaperSections} from "../home-presentation.js";
import { renderStage, startStage } from "../broadcast-stage.js";
import { presenceHtml, presenceNow, onPresence } from "../presence.js";
import { loadWall, wallCard, wireWall } from "../member-wall.js";
import { draftView, draftCard } from "../draft-order.js";
import { loadDraftOrder } from "../draft-order-data.js";
import { powerPulseView } from "../power-pulse.js";
import { factOfTheDay, funFacts } from "../funfacts.js";
import { buildClubhouseWeekly, homeRivalryStory } from "../home-clubhouse.js";
import { buildHomeWeekOutlook, HOME_OUTLOOK_POSITIONS } from "../home-week-outlook.js";
import { buildNextMove } from "../next-move.js";
import { weekHasStarted } from "../league-trajectory.js";
import { teamPortrait } from "../team-presentation.js";
import { startAssembly } from "../scroll-assembly.js";
import { matchupFirst, currentMatchupWeek, nextMoveSlide, playoffPictureSlide, tradeAlertSlide, weekSlateSlide } from "../home-slides.js";
import { buildLeagueStakes } from "../league-stakes.js";
import { loadTradeAlerts, tradeAlertViewModel } from "../trade-alerts.js";
import { playerIdentity } from "../player-presentation.js";
import { playerLiveState } from "../live-score.js";
import { loadLeagueState } from "../league-state.js";
import { buildWeeklyBriefing } from "../weekly-briefing.js";
import { buildAftermath } from "../aftermath-share.js";
import { weeklySignalChanges } from "../weekly-signal-changes.js";
import {loadNflInjuries} from "../injury-report-data.js";
import {buildInjuryReport,injuryReportSlides} from "../injury-report-model.js";
import {mountInjuryReport} from "../injury-report-ui.js";
import { loadPickemBoard, homePickemMarkup } from "../sportsbook-pickem.js";

let stage = null;
let generation = 0;
let dropAssembly = null;
let dropPresence = null;
let deferredStops = [];

async function loadHomeBootstrap(today) {
  const [bundled, bootstrapMembers, bootstrapDues] = await Promise.all([
    db().rpc("home_bootstrap", { home_today: today }),
    loadMemberDirectory().then(data => ({ data, error: null })),
    db().from("finance_payments").select("season,amount_due,amount_paid"),
  ]);
  if (!bundled.error && bundled.data) {
    if (bootstrapMembers.error || bootstrapDues.error) throw bootstrapMembers.error || bootstrapDues.error;
    return { ...bundled.data, members: bootstrapMembers.data || [], dues: bootstrapDues.data || [] };
  }
  /* Backward-compatible during rollout: the app remains usable between the
     code deployment and the database migration. */
  const [events, announcements, polls, leagues, members, golf, dues, standings, golfDone] = await Promise.all([
    db().from("events").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(3),
    db().from("announcements").select("*").order("created_at", { ascending: false }).limit(3),
    db().from("polls").select("*").eq("active", true).order("created_at", { ascending: false }).limit(3),
    db().from("sleeper_leagues").select("season,status,champion_user_id").order("season", { ascending: false }),
    Promise.resolve(bootstrapMembers),
    db().from("golf_outings").select("id,name,course,event_date,event_time,status").neq("status", "final").order("event_date", { ascending: true }).limit(1),
    Promise.resolve(bootstrapDues),
    db().from("sleeper_standings").select("season,sleeper_user_id,wins,losses,ties,rank,points_for"),
    db().from("golf_outings").select("id,name,finalized_at").not("finalized_at", "is", null).order("finalized_at", { ascending: false }).limit(5),
  ]);
  const error = events.error || announcements.error || polls.error || leagues.error || members.error || golf.error || dues.error || standings.error || golfDone.error;
  if (error) throw error;
  return { events: events.data || [], announcements: announcements.data || [], polls: polls.data || [], leagues: leagues.data || [],
    members: members.data || [], golf: golf.data || [], dues: dues.data || [], standings: standings.data || [], golf_done: golfDone.data || [] };
}

function rankMove(value) {
  const move = Number(value) || 0;
  if (!move) return `<span class="is-even">—</span>`;
  return `<span class="${move > 0 ? "is-up" : "is-down"}"><svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"></use></svg>${Math.abs(move)}</span>`;
}

/*
  A FACE, OR THE NEXT BEST THING.

  This used to fall back to the DFL mark, which meant that until somebody
  uploaded a photo every row on the board carried the identical crest - an
  avatar column that told the reader nothing and cost twelve image requests
  to say it. Initials at least distinguish one row from the next, and they
  are what the profile chooser and the wall already draw for a member with
  no picture.

  Uploaded photos are public by design: members carries a `public read`
  policy, so one member's picture shows on everybody's board, and only the
  member themselves can set it (dfl_update_profile resolves the row from the
  request, not from an argument).
*/
function memberAvatar(team, members, cls) {
  const member = (members || []).find(row => String(row.sleeper_user_id) === String(team?.sleeper_user_id));
  return teamPortrait({ ...team, identity: team?.identity || member || null }, { className: `${cls} home-rank-initials` });
}


/** The always-visible standings board from the approved Home composition. */
export function homeRankingsCard(view, members = []) {
  const rankings = view?.powerRankings;
  const board = rankings?.boards?.at(-1);
  if (!board?.rows?.length) return `<section class="home-rankings-card is-loading"><strong>Power rankings</strong><p>Run a Sleeper sync to build the weekly board.</p></section>`;
  const focus = board.rows.find(row => String(row.id) === String(view.focus?.id)) || board.rows[0];
  const teamFor = row => view.allTeams?.find(team => String(team.id) === String(row.id));
  const visible = board.rows.slice(0, 3);
  const showFocus = focus && !visible.some(row => String(row.id) === String(focus.id));
  const row = (item, index, mine = false) => `<li class="${mine ? "is-me" : ""} ${index >= 3 && !mine ? "is-rank-collapsed" : ""}" data-assemble>
    <b>${esc(String(item.rank))}</b>${memberAvatar(teamFor(item), members, "home-rank-face")}
    <span><strong>${esc(item.name)}</strong></span><em>${esc(item.record)}</em>${rankMove(item.movement)}
  </li>`;
  return `<section class="home-rankings-card">
    <header><h2 class="section-title">Power rankings</h2><a class="home-text-action" href="#/analyzer">${esc(board.label)} of ${esc(String(view.weeks || 14))}<svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></header>
    <div class="home-rank-head"><span>Rank</span><span>Team</span><span>Record</span><span>Move</span></div>
    <ol>${board.rows.slice(0, 3).map((item, index) => row(item, index, String(item.id) === String(focus.id))).join("")}${showFocus ? `<li class="home-rank-ellipsis" aria-hidden="true">•••</li>` : ""}${board.rows.slice(3).map((item, offset) => row(item, offset + 3, String(item.id) === String(focus.id))).join("")}</ol>
    <button class="home-rank-all" type="button" data-home-rank-toggle aria-expanded="false"><span>View all ${board.rows.length}</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button>
  </section>`;
}

function wireHomeRankings(root) {
  const card = root?.querySelector?.(".home-rankings-card");
  const toggle = card?.querySelector?.("[data-home-rank-toggle]");
  if (!card || !toggle) return;
  toggle.addEventListener("click", () => {
    const expanded = !card.classList.contains("is-expanded");
    card.classList.toggle("is-expanded", expanded);
    toggle.setAttribute("aria-expanded", String(expanded));
    toggle.querySelector("span").textContent = expanded ? "Show top teams" : `View all ${card.querySelectorAll("ol > li:not(.home-rank-ellipsis)").length}`;
  });
}

/*
  NO ICON. Each column used to open with a 34px glyph in its own grid track,
  which bought nothing - three different marks that all read as "a fact about
  the week" - and cost a third of the narrowest column's width. Losing it
  gives the words the whole column, which is the only thing in here anybody
  reads.
*/
function outlookPlayerRow(player, index) {
  const matchup = player.matchup ? ` · ${player.matchup.tone} vs ${player.matchup.opponent}`
    : player.opponent ? ` · vs ${player.opponent}` : "";
  const state = playerLiveState(player);
  const source = player.scoreSource === "actual" ? "ACTUAL" : "PROJ";
  return `<li><b>${index + 1}</b>${playerIdentity(player, { detail: `${player.nflTeam || "FA"} · ${player.ownerName}${matchup}` })}<em class="is-${player.scoreSource} is-${state.key}"><strong data-live-key="player:${esc(player.id)}" data-live-score="${Number(player.points).toFixed(1)}" data-live-state="${state.key}">${Number(player.points).toFixed(1)}</strong><small>${state.label} · ${source}</small></em></li>`;
}

function playerScoreLine(player) {
  const state = playerLiveState(player);
  const source = `${state.label} · ${player.scoreSource === "actual" ? "ACTUAL" : "PROJ"}`;
  const matchup = player.matchup ? `${player.matchup.tone} vs ${player.matchup.opponent}` : `vs ${player.opponent || "TBD"}`;
  return `${Number(player.points).toFixed(1)} · ${source} · ${matchup}`;
}

/** A living current-week forecast: games, player leaders, and your lineup. */
export function homeWeeklyDigest(outlook, briefing = null, report = null, changes = [], { loading = false } = {}) {
  if (!outlook) return `<section class="home-weekly-digest is-loading"><header><h2>Week ahead</h2></header><p${loading ? ' role="status"' : ''}>${loading ? "Building this week's matchup and Start/Sit model…" : "Weekly projections are unavailable. Check your matchup and lineup in Analyzer."}</p>${loading ? '' : '<a class="linkbtn home-text-action" href="#/analyzer"><span>Open Analyzer</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a>'}</section>`;
  const swaps = outlook.startSit?.swaps || [];
  const alarms = outlook.startSit?.alarms || [];
  const gameRow = game => `<article class="${game.isMine ? "is-mine" : ""}" data-assemble><div><small>${esc(game.story || game.confidence)}</small><strong>${esc(game.winner.name)}</strong><span>over ${esc(game.loser.name)} by ${game.margin.toFixed(1)}</span></div><p><b>${Number(game.winner.projection).toFixed(1)}</b><em>–</em><span>${Number(game.loser.projection).toFixed(1)}</span></p></article>`;
  const predictions = outlook.predictions || [];
  const firstGames = predictions.slice(0, 3);
  const moreGames = predictions.slice(3);
  return `<section class="home-weekly-digest">
    <header><div><small>WEEK ${esc(outlook.week)} · LIVE MODEL</small><h2>Week ahead</h2></div><a class="home-text-action" href="#/analyzer"><span>Full Start / Sit</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></header>
    <nav class="home-week-tabs" role="tablist" aria-label="Week Ahead views">
      <button id="home-week-tab-brief" type="button" role="tab" aria-controls="home-week-panel-brief" aria-selected="true" data-week-tab="brief">Briefing</button>
      <button id="home-week-tab-picks" type="button" role="tab" aria-controls="home-week-panel-picks" aria-selected="false" data-week-tab="picks">Predictions</button>
      <button id="home-week-tab-players" type="button" role="tab" aria-controls="home-week-panel-players" aria-selected="false" data-week-tab="players">Top Players</button>
      <button id="home-week-tab-startsit" type="button" role="tab" aria-controls="home-week-panel-startsit" aria-selected="false" data-week-tab="startsit">Start / Sit${alarms.length || swaps.length ? `<b>${alarms.length + swaps.length}</b>` : ""}</button>
    </nav>
    <div class="home-week-panels">
      <section id="home-week-panel-brief" class="home-outlook-block home-week-brief" role="tabpanel" aria-labelledby="home-week-tab-brief" data-week-panel="brief">
        <div class="home-outlook-title"><div><small>PERSONAL INTELLIGENCE</small><h3>${esc(briefing?.title || "WEEKLY BRIEFING")}</h3></div><a class="home-text-action" href="#/stakes"><span>Playoff race</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></div>
        <strong class="home-brief-headline">${esc(briefing?.headline || "Your week is taking shape")}</strong>
        <div class="home-brief-grid">
          <article><small>MATCHUP</small><span>${esc(briefing?.matchup || "Sleeper matchup pending")}</span></article>
          <article><small>PLAYOFF PATH</small><strong>${esc(briefing?.playoff || "Model pending")}</strong><span>${esc(briefing?.playoffDetail || "Sync the league to build your path.")}</span></article>
          <article><small>LINEUP CALL</small><span>${esc(briefing?.lineup || "Checking your starters")}</span></article>
          <article><small>NEXT MOVE</small><span>${esc(briefing?.action || "Keep the roster ready")}</span></article>
        </div>
        ${report ? `<aside class="home-tuesday-receipt"><div><small>LAST WEEK · FINAL</small><strong>${esc(report.title)}</strong><span>${esc(report.highlights?.[0]?.title || "League receipts ready")} · ${esc(report.highlights?.[0]?.detail || "")}</span></div><a class="btn small" href="#/clubhouse?season=${report.season}&amp;week=${report.week}">Open &amp; share recap</a></aside>` : ""}
        ${changes.length ? `<aside class="home-signal-changes"><small>CHANGED SINCE LAST SYNC</small>${changes.slice(0, 3).map(change => `<span class="is-${change.impact}"><strong>${esc(change.name)}</strong><em>${esc(change.detail)}</em></span>`).join("")}</aside>` : ""}
      </section>
      <section id="home-week-panel-picks" class="home-outlook-block home-outlook-games" role="tabpanel" aria-labelledby="home-week-tab-picks" data-week-panel="picks" hidden><div class="home-outlook-title"><div><small>CURRENT FORECAST</small><h3>WHO TAKES THE WEEK</h3></div><span>${predictions.length} MATCHUPS</span></div>
        <div>${firstGames.map(gameRow).join("") || `<p class="home-outlook-empty">Matchups will appear when Sleeper publishes the slate.</p>`}</div>
        ${moreGames.length ? `<details class="home-outlook-more"><summary>VIEW ALL ${predictions.length} MATCHUPS</summary><div>${moreGames.map(gameRow).join("")}</div></details>` : ""}
      </section>
      <section id="home-week-panel-players" class="home-outlook-block home-outlook-players" role="tabpanel" aria-labelledby="home-week-tab-players" data-week-panel="players" hidden><div class="home-outlook-title"><div><small>PLAYER FORECAST</small><h3>TOP 3 BY POSITION</h3></div><span>ACTUAL / PROJ</span></div>
        <nav class="home-position-tabs" aria-label="Player position">${HOME_OUTLOOK_POSITIONS.map((position, index) => `<button type="button" data-position-tab="${position}" aria-pressed="${index === 0}">${position}</button>`).join("")}</nav>
        <div>${HOME_OUTLOOK_POSITIONS.map((position, index) => `<section data-position-panel="${position}" ${index === 0 ? "" : "hidden"}><header><strong>${position}</strong><small>ACTUAL / PROJ</small></header><ol>${(outlook.leaders[position] || []).map(outlookPlayerRow).join("") || `<li class="is-empty">No projection</li>`}</ol></section>`).join("")}</div>
      </section>
      <section id="home-week-panel-startsit" class="home-outlook-block home-outlook-startsit" role="tabpanel" aria-labelledby="home-week-tab-startsit" data-week-panel="startsit" hidden><div class="home-outlook-title"><div><small>YOUR LINEUP</small><h3>START / SIT</h3></div><span>${esc(outlook.startSit?.teamName || "YOUR TEAM")}</span></div>
        ${alarms.length ? `<div class="home-outlook-alarms">${alarms.map(alarm => `<p><b>FIX IT</b><strong>${esc(alarm.player.name)}</strong><span>${esc(alarm.reason)}</span></p>`).join("")}</div>` : ""}
        ${swaps.length ? `<div class="home-outlook-swaps">${swaps.map(swap => `<article data-assemble><div class="is-start"><small>START</small><strong>${esc(swap.start.name)}</strong><span>${esc(playerScoreLine(swap.start))}</span></div><b>+${Number(swap.gain).toFixed(1)}</b><div class="is-sit"><small>SIT</small><strong>${esc(swap.sit.name)}</strong><span>${esc(playerScoreLine(swap.sit))}</span></div></article>`).join("")}</div>`
          : `<p class="home-outlook-clean"><strong>${outlook.startSit?.lineupIsSet ? "NO MOVE WORTH FORCING" : "SET YOUR LINEUP"}</strong><span>${outlook.startSit?.lineupIsSet ? "The model sees no bench swap worth at least 1.5 points right now." : "Submit a lineup and the model will flag meaningful swaps."}</span></p>`}
        <footer><span>Injuries, opponent difficulty and DFL scoring included.</span><a href="#/analyzer">Open full Start/Sit</a></footer>
      </section>
    </div>
  </section>`;
}

export function homeWeeklyFocus(outlook,briefing=null,{loading=false}={}){
 if(!outlook)return `<section class="card home-week-focus"><header><small>YOUR WEEK</small><h2 class="section-title">Your next move</h2></header><p${loading?' role="status"':''}>${loading?'Checking your lineup…':'Review your starters and matchup before kickoff.'}</p>${loading?'':'<div class="home-focus-links"><a class="btn ghost" href="#/analyzer"><span>Review lineup</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a><a class="clubhouse-text-link home-text-action" href="#/clubhouse?tab=matchups"><span>Matchup talk</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></div>'}</section>`;
 const alarms=outlook.startSit?.alarms||[],lineup=briefing?.lineup||(outlook.startSit?.lineupIsSet?'No lineup move worth forcing':'Set your lineup');
 return `<section class="card home-week-focus"><header><small>WEEK ${esc(outlook.week)} · YOUR WEEK</small><h2 class="section-title">Your next move</h2></header>${alarms.length?`<div class="home-outlook-alarms">${alarms.map(alarm=>`<p><strong>${esc(alarm.player.name)}</strong><span>${esc(alarm.reason)}</span></p>`).join('')}</div>`:''}<p class="home-focus-action">${esc(lineup)}</p><div class="home-focus-links"><a class="btn ghost" href="#/analyzer"><span>Review lineup</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a><a class="clubhouse-text-link home-text-action" href="#/clubhouse?tab=matchups"><span>Matchup talk</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></div></section>`;
}

function wireHomeWeekHub(root) {
  const setWeekPanel = name => {
    root.querySelectorAll("[data-week-tab]").forEach(button => button.setAttribute("aria-selected", String(button.dataset.weekTab === name)));
    root.querySelectorAll("[data-week-panel]").forEach(panel => { panel.hidden = panel.dataset.weekPanel !== name; });
  };
  root.querySelectorAll("[data-week-tab]").forEach(button => button.addEventListener("click", () => setWeekPanel(button.dataset.weekTab)));
  root.querySelectorAll("[data-position-tab]").forEach(button => button.addEventListener("click", () => {
    const position = button.dataset.positionTab;
    root.querySelectorAll("[data-position-tab]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    root.querySelectorAll("[data-position-panel]").forEach(panel => { panel.hidden = panel.dataset.positionPanel !== position; });
  }));

}

export function leave() {
  try { stage?.stop(); } catch (err) { console.warn(err); }
  stage = null;
  try { dropPresence?.(); } catch { }
  dropPresence = null;
  try { dropAssembly?.(); } catch { }
  dropAssembly = null;
  deferredStops.forEach(stop => { try { stop(); } catch {} });
  deferredStops = [];
}

function whenNear(node, task) {
  if (!node) return () => {};
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    observer?.disconnect();
    Promise.resolve().then(task).catch(error => console.warn("deferred Home section unavailable", error));
  };
  let observer = null;
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) run();
    }, { rootMargin: "700px 0px" });
    observer.observe(node);
  } else {
    queueMicrotask(run);
  }
  return () => { done = true; observer?.disconnect(); };
}

function installHelp(){const ua=navigator.userAgent;if(/iphone|ipad|ipod/i.test(ua))return "In Safari: Share, then Add to Home Screen";if(/android/i.test(ua))return "Chrome menu (⋮), then Install app";return "Chrome menu (⋮) → Cast, save and share → Install page as app"}

const STAGE_UTILITY = new Set(["events", "poll", "news", "dues"]);
function editorialStage(ctx, { custom = [], off = new Set(), overrides = new Map() } = {}) {
  // GameDay owns the personal matchup in every phase of the week.
  const ranked = buildDeck(ctx, { custom, off: new Set([...off, "myMatchup"]), overrides, max: 20 });
  const picked = matchupFirst(ranked.filter((it) => {
    if (it.source === "manual" || it.pinned) return true;
    if (STAGE_UTILITY.has(it.generator)) return false;
    if ((it.generator === "golf" || it.generator === "fantasy") && it.temporal === "upcoming") return false;
    return true;
  }));
  if (picked.length) return picked;
  return ranked.filter((it) => it.generator === "identity").slice(0, 1);
}

function tradePackageLine(pkg) {
  const players = (pkg.players || []).map(player => player.name).filter(Boolean);
  const shown = players.slice(0, 3);
  const extra = players.length - shown.length;
  return `<span><b>${esc(pkg.teamName)}</b><em>${esc(shown.join(" + ") || "No rated players")}${extra > 0 ? ` +${extra} more` : ""}</em></span>`;
}

/** A persistent record of league deals. Breaking coverage may end; the result
 * belongs on Home until newer trades replace it, just like a real transaction
 * wire rather than a temporary notification. */
export function homeTradeWire(alerts) {
  if (alerts == null) return `<section class="home-trade-wire is-loading"><header><h2>TRADE WIRE</h2><small>DFLYZER VERDICTS</small></header><p>Checking the league wire…</p></section>`;
  const recent = (alerts || []).slice(0, 1);
  const tradeRow = alert => {
    const outcome = alert.outcome || { grade: "Review", tone: "review", detail: "Model review needed" };
    const teams = alert.teams.map(team => team.teamName).filter(Boolean);
    const matchup = teams.length > 1 ? `${teams[0]} ↔ ${teams[1]}` : teams[0] || "Completed trade";
    const verdict = outcome.winner ? `${outcome.winner} beat ${outcome.loser}` : matchup;
    return `<a class="home-trade-item is-${esc(outcome.tone)}" href="${esc(alert.href || "#/trade")}" data-assemble>
      <div class="home-trade-call"><small>${alert.week ? `WEEK ${esc(alert.week)}` : "COMPLETED"}</small><strong>${esc(outcome.grade)}</strong><em>${outcome.closeness == null ? "MODEL REVIEW" : `${esc(outcome.closeness)}% BALANCED`}</em></div>
      <div class="home-trade-deal"><h3>${esc(verdict)}</h3><div>${alert.packages.slice(0, 2).map(tradePackageLine).join("")}</div><p>${esc(outcome.detail)}</p></div>
      <svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"></use></svg>
    </a>`;
  };
  return `<section class="home-trade-wire">
    <header><h2>Trade wire</h2><a class="home-text-action" href="#/trade"><span>All receipts</span> <svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></header>
    ${recent.length ? `<div class="home-trade-list">${recent.map(tradeRow).join("")}</div>` : `<div class="home-trade-empty"><strong>The wire is quiet.</strong><span>Completed Sleeper trades will land here after the next sync.</span></div>`}
  </section>`;
}

/* Sleeper supplies the current league fixtures before the first score sync.
   The broadcast slate and weekly model share those fixtures; GameDay owns
   the personal matchup view. */
async function weekAheadSlide({ analysis, weekly, meSleeperId }) {
  if (!weekly?.week || !meSleeperId || analysis?.state !== "ready") return null;
  const week = currentMatchupWeek(weekly.week);
  /* The report owns the completed week on Tuesday; this surface owns the new
     week as soon as Sleeper advances it. */
  if (week !== Number(weekly.week)) return null;
  const leagueId = analysis.league?.sleeper_league_id;
  if (!leagueId) return null;
  const weekRows = (analysis.matchups || []).filter(row => Number(row.week) === week);
  const weekStarted = weekHasStarted(weekRows);
  /* This function only runs for Sleeper's current week. Non-zero scores on
     every side Sunday night do not make it final while Monday players remain;
     keep the league slate until Sleeper advances the week. */

  let raw;
  try {
    const { sleeper } = await import("../sleeper.js");
    raw = await sleeper.matchups(leagueId, week);
  } catch (err) { console.warn("matchup preview unavailable", err); return null; }
  if (!Array.isArray(raw) || !raw.length) return null;

  const teamFor = rosterId => analysis.teams.find(team => String(team.roster_id) === String(rosterId));
  const projectionOf = uid => {
    const row = (weekly.teams || []).find(team => String(team.sleeper_user_id) === String(uid));
    return Number.isFinite(Number(row?.projection)) ? Number(row.projection) : null;
  };
  const syncedScoreOf = uid => {
    const row = weekRows.find(item => String(item.user1) === String(uid) || String(item.user2) === String(uid));
    if (!row) return null;
    const value = String(row.user1) === String(uid) ? row.score1 : row.score2;
    return Number.isFinite(Number(value)) ? Number(value) : null;
  };
  const actualOf = uid => {
    const synced = syncedScoreOf(uid);
    if (synced != null) return synced;
    const row = (weekly.teams || []).find(team => String(team.sleeper_user_id) === String(uid));
    return Number.isFinite(Number(row?.actual)) ? Number(row.actual) : null;
  };
  const side = row => {
    const team = teamFor(row.roster_id);
    if (!team) return null;
    const weeklyTeam = (weekly.teams || []).find(item => String(item.sleeper_user_id) === String(team.sleeper_user_id));
    return {
      sleeper_user_id: team.sleeper_user_id,
      name: team.team_name || team.ownerName || "Unnamed",
      ownerName: team.ownerName || "",
      identity: team.identity || null,
      projection: projectionOf(team.sleeper_user_id),
      actual: actualOf(team.sleeper_user_id),
      played: Number(weeklyTeam?.played) || 0,
      remaining: Number(weeklyTeam?.remaining) || 0,
      complete: Boolean(weeklyTeam?.complete),
    };
  };

  /* Sleeper returns one row per ROSTER; a fixture is the two rows sharing a
     matchup_id. Grouping once keeps league fixtures consistent for the slate and weekly model. */
  const fixtures = [];
  const byMatchup = new Map();
  for (const row of raw) {
    if (row?.matchup_id == null) continue;            // bye / unmatched
    const key = String(row.matchup_id);
    if (!byMatchup.has(key)) byMatchup.set(key, []);
    byMatchup.get(key).push(row);
  }
  for (const [, pair] of byMatchup) {
    if (pair.length !== 2) continue;
    const a = side(pair[0]), b = side(pair[1]);
    if (a && b) fixtures.push({ a, b });
  }
  if (!fixtures.length) return null;

  const slides = [];
  slides.push(weekSlateSlide({ fixtures, season: weekly.season, week, meSleeperId, live: weekStarted }));
  return { slides: slides.filter(Boolean), fixtures };
}

export async function render(view) {
  leave();
  const mine = ++generation;
  if (!configured) { view.innerHTML = setupNotice(); return; }
  const today = new Date().toISOString().slice(0, 10);
  /* These reads do not depend on the core dashboard rows. Starting them now
     removes an entire network waterfall from Home without changing its data. */
  const injuryPromise = loadNflInjuries().catch(()=>null);
  const manualPromise = loadBroadcastItems();
  const overridesPromise = loadBroadcastOverrides();
  const lorePromise = loadLore();
  const pickemPromise = loadPickemBoard().catch(error => {
    console.warn("pick'em card unavailable", error);
    return { available: false };
  });
  let bootstrap, settings;
  try { [bootstrap, settings] = await Promise.all([loadHomeBootstrap(today), loadSettings()]); }
  catch (error) { view.innerHTML = errorBox(error); return; }
  const events = { data: bootstrap.events || [] }, announcements = { data: bootstrap.announcements || [] };
  const polls = { data: bootstrap.polls || [] }, leagues = { data: bootstrap.leagues || [] };
  const dues = { data: bootstrap.dues || [] }, standings = { data: bootstrap.standings || [] };
  const memberRows = bootstrap.members || [];
  const golfRow = (bootstrap.golf || [])[0] || null;
  const me = currentMember();
  const myMember = me ? memberRows.find((m) => String(m.id) === String(me.id)) : null;

  const [golfDay, manual, overrides] = await Promise.all([
    golfRow ? loadGolfDay(golfRow.id) : null,
    manualPromise,
    overridesPromise,
  ]);
  const homeData = {
    events: events.data || [], announcements: announcements.data || [],
    polls: polls.data || [], leagues: leagues.data || [], members: memberRows,
    dues: dues.data || [], standings: standings.data || [], golfRow,
  };
  const fallbackDeck = editorialStage(
    broadcastContext({ home: homeData, golfDay, member: me }),
    { custom: manual, off: broadcastOff(), overrides },
  );


  /*
    THE ORDER IS THE EDIT.

    The broadcast and live scores lead, then the reader's next lineup action.
    Forecasts expand within Your week; standings and league news follow.
    Archive stories come after current information, then the Wall closes.
    Draft, League Feed and the Wall still load as the reader approaches them.
    The Wall closes the newspaper; a compact identity and update footer follows.

    UPCOMING AND OPEN POLLS ARE GONE FROM THE MARKUP. They were rendered
    here and then hidden with a positional `display:none` in
    splash-loading.css - the data was still fetched, the DOM still built,
    and the admin "Add" buttons still wired, all to be painted over. The
    snapshot already carries both facts, and
    Calendar and Polls each have their own add control, so deleting the
    sections loses nothing and takes the CSS hack with it.
  */
  view.innerHTML = `<div id="home-wrap">
    <h1 class="sr-only">DFL HQ</h1>
    ${homeNewspaperMasthead({ founded: LEAGUE_FOUNDED })}
    <div class="home-frontpage">
    <section class="home-broadcast is-loading" aria-label="League broadcast">
      <div class="home-broadcast-loading" role="status"><span></span><strong>Loading league broadcast</strong></div>
    </section>
    <div data-home-gameday-slot></div>
    </div>
    <section class="home-week-desk" aria-label="Your week">
    <div data-home-focus-slot>${homeWeeklyFocus(null,null,{loading:true})}</div>
    <div data-home-pickem-slot></div>
    ${homeLeagueTools()}
    ${disclosure("home-week","Plan your week","Projections, player outlook and Start / Sit",`<div data-home-report-slot>${homeWeeklyDigest(null,null,null,[],{loading:true})}</div>`)}
    </section>
    <section class="home-league-desk" aria-label="Around the league">
    <div data-home-rankings-slot>${homeRankingsCard(null)}</div>
    ${announcements.data?.[0] ? `<section class="home-weekly-clubhouse card"><div><small>LEAGUE NEWS</small><h2>${esc(announcements.data[0].title)}</h2><p>${esc(String(announcements.data[0].body || announcements.data[0].content || "Catch the latest league news.").slice(0,160))}</p></div><button type="button" class="linkbtn home-text-action" data-open-home-news><span>Read league news</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button></section>` : ""}
    ${disclosure("home-league","More from the league","News, trades and league updates",`
    ${snapshot({ leagues: leagues.data || [], members: memberRows, myMember, standings: standings.data || [], dues: dues.data || [], polls: polls.data || [] })}
    <div data-home-trade-slot>${homeTradeWire(null)}</div>
    <div data-draft-slot></div>
    <div data-home-feed-slot class="home-deferred-slot">${homeLeagueFeed(announcements.data || [], null)}</div>`)}
    </section>
    <div data-home-lore-slot>${homeLeagueFile()}</div>
    <section class="home-banter" aria-label="League banter"><div data-wall-slot class="home-deferred-slot"></div></section>
    ${identity(leagues.data || [], memberRows, settings.get(KEY_LOGO))}
    <p class="dfl-alive" data-alive>${presenceHtml(presenceNow())}</p>
    <p class="version-line">DFL HQ v${esc(APP_VERSION)} · <button class="linkbtn" id="check-update">Check for updates</button>${isInstalled() ? "" : ` · <button class="linkbtn" id="install-app">Install app</button>`}</p>
  </div>`;

  /* Projection data is intentionally second paint. One shared request feeds
     both the cold open and Power Pulse, so making Home livelier does not make
     it fetch the entire Sleeper model twice. */
  const analysisPromise = import("../team-analyzer-data.js").then(({ loadAnalyzerData }) => loadAnalyzerData());
  const tradeAlertsPromise = loadTradeAlerts({ limit: 12 }).catch(err => {
    console.warn("trade wire unavailable", err);
    return [];
  });
  const weeklyPromise = analysisPromise.then(async analysis => {
    if (analysis?.state !== "ready") return null;
    const { loadTrendingPlayers, loadWeeklyProjections, loadWeeklyStats } = await import("../sleeper.js");
    const state = await loadLeagueState();
    const season = Number(state?.season) || analysis.projectionSeason;
    const week = Number(state?.currentWeek) || 1;
    const [projections, actual, trending] = await Promise.all([
      loadWeeklyProjections(season, week), loadWeeklyStats(season, week), loadTrendingPlayers(),
    ]);
    const built = buildClubhouseWeekly({
      analysis, rows: projections?.data || [], actualRows: actual?.data || [], season, week,
      fetchedAt: Math.max(projections?.fetchedAt || 0, actual?.fetchedAt || 0),
    });
    return built ? { ...built, trending } : null;
  }).catch(err => { console.warn("clubhouse weekly projections unavailable", err); return null; });
  const aftermathWeeklyPromise = analysisPromise.then(async analysis => {
    if (analysis?.state !== "ready") return null;
    const state = await loadLeagueState(),season=Number(state?.season)||analysis.projectionSeason,week=Number(state?.completedWeek)||0;
    if (!week) return null;
    const data=await loadClubhouseWeek(season,week);if(!data.completed)return null;
    const [raw,players]=await Promise.all([loadWeeklyRosters(data.leagueId,week),import("../sleeper.js").then(mod=>mod.loadPlayers())]);
    const owners=new Map(data.games.flatMap(g=>[[String(g.roster1),g.user1],[String(g.roster2),g.user2]]));
    return {season,week,teams:raw.filter(row=>owners.has(String(row.roster_id))).map(row=>{
      const uid=owners.get(String(row.roster_id)),member=memberRows.find(m=>String(m.sleeper_user_id)===String(uid)),starters=new Set((row.starters||[]).map(String));
      const performance=([id,points])=>({name:players[id]?.n||`Player ${id}`,points:Number(points),owner:member?.team_name||member?.display_name||"Team",position:players[id]?.p,nflTeam:players[id]?.t});
      const scores=Object.entries(row.players_points||{}).filter(([,points])=>points!=null&&Number.isFinite(Number(points)));
      return {sleeper_user_id:uid,team_name:member?.team_name||member?.display_name,actual:Number(row.points),complete:row.points!=null&&Number.isFinite(Number(row.points))&&!!row.players_points,starterScores:scores.filter(([id])=>starters.has(id)).map(performance),benchScores:scores.filter(([id])=>!starters.has(id)).map(performance)};
    })};
  }).catch(err => { console.warn("Completed week report unavailable", err); return null; });
  deferredStops.push(mountGameDay(view.querySelector("[data-home-gameday-slot]"),{members:memberRows,member:myMember,standings:standings.data||[],active:()=>mine===generation&&view.isConnected&&location.hash.startsWith("#/home")}));
  // Archive stories load independently of the live weekly model.
  lorePromise.then(got => {
    if (mine !== generation || !view.isConnected || got?.error) return;
    const slot = view.querySelector('[data-home-lore-slot]');
    if (slot) slot.innerHTML = homeLeagueFile({
      fact: factOfTheDay(got, new Date()),
      facts: funFacts(got),
      rivalry: homeRivalryStory({ lore: got, uid: myMember?.sleeper_user_id, members: memberRows }),
    });
  }).catch(error => console.warn('League archive unavailable', error));
  wirePageDisclosures(view);
  view.querySelector('[data-open-home-news]')?.addEventListener('click',()=>{const more=view.querySelector('[data-page-detail="home-league"]');more.open=true;const feed=view.querySelector('[data-home-feed-slot]');feed?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});
  wireHomeNewspaperSections(view);
  wireInline(view.querySelector("#home-wrap"), () => render(view));
  pickemPromise.then(board => {
    if (mine !== generation || !view.isConnected) return;
    const slot = view.querySelector("[data-home-pickem-slot]");
    if (slot) slot.innerHTML = homePickemMarkup(board, esc);
  });

  /* Lower-page social and draft data no longer compete with the broadcast,
     rankings and weekly model. Each starts only as its slot approaches the
     viewport, and redraws only its own slot. */
  const redrawWall = async () => {
    const slot = view.querySelector("[data-wall-slot]");
    if (!slot) return;
    try {
      slot.innerHTML = wallCard(await loadWall(3), { compact: true });
      wireWall(slot, redrawWall);
    } catch (err) {
      console.warn("wall unavailable", err);
      slot.innerHTML = "";
    }
  };
  const wallSlot = view.querySelector("[data-wall-slot]");
  deferredStops.push(whenNear(wallSlot, redrawWall));

  const feedSlot = view.querySelector("[data-home-feed-slot]");
  deferredStops.push(whenNear(feedSlot, async () => {
    let activity = null;
    try {
      const { data, error } = await db().rpc(ACTIVITY_RPC, { row_limit: 6 });
      if (error) throw error;
      activity = data || [];
    } catch (error) {
      if (!ACTIVITY_MISSING.test(error?.message || "")) console.warn("activity feed unavailable", error);
      activity = [];
    }
    if (mine !== generation || !feedSlot?.isConnected) return;
    feedSlot.innerHTML = homeLeagueFeed(announcements.data || [], activity);
    wireHomeLeagueFeed(feedSlot);
  }));
  wireHomeLeagueFeed(feedSlot);

  const draftSlot = view.querySelector("[data-draft-slot]");
  deferredStops.push(whenNear(draftSlot, async () => {
    const draft = await loadDraftOrder();
    if (mine !== generation || !draftSlot?.isConnected) return;
    const panel = draftCard(draftView({
      draft: draft?.draft || null, slots: draft?.slots || [], picks: draft?.picks || [],
      members: memberRows, meSleeperId: myMember?.sleeper_user_id || null,
      leagueStatus: leagues.data?.[0]?.status || "",
    }));
    draftSlot.innerHTML = panel || "";
  }));

  const alive = view.querySelector("[data-alive]");
  if (alive) {
    dropPresence?.();
    dropPresence = onPresence((p) => { alive.innerHTML = presenceHtml(p); });
  }
  wireCrest(view);
  /* The band is on the page from the first paint; the rows and the report
     arrive with the async fill below and re-bind there. */
  dropAssembly = startAssembly(view);

  let lore = null;
  let custom = manual;
  /* Slides built from data that only arrives after the first paint - the
     trade alert and the auto-scout. Kept beside `custom` rather than mixed
     into it so a refresh() that reloads the commissioner's hand-written
     items cannot drop them. */
  let liveSlides = [];
  let injuryReport=null,injuryAnalysis=null;
  const injuryUi=mountInjuryReport(view,{getReport:()=>injuryReport,onOpen:()=>stage?.suspend('injury-report',true),onClose:()=>stage?.suspend('injury-report',false),refresh:async()=>{const data=await loadNflInjuries({force:true});if(mine!==generation||!view.isConnected)return;injuryReport=buildInjuryReport(data.payload,{analysis:injuryAnalysis,now:data.checkedAt});stage?.update(build(golfDayNow));injuryUi.update()}});
  deferredStops.push(()=>injuryUi.stop());
  let golfDayNow = golfDay;
  let homeBroadcastWeek = null;
  const off = broadcastOff();
  const build = (day) => homeBroadcastDeck(editorialStage(
    broadcastContext({ home: homeData, lore, golfDay: day, member: me }),
    { custom: [...custom, ...liveSlides, ...injuryReportSlides(injuryReport)].filter(Boolean), off, overrides },
  ), {week: homeBroadcastWeek});
  const refresh = async () => {
    const [day, fresh] = await Promise.all([
      golfRow ? loadGolfDay(golfRow.id) : null,
      loadBroadcastItems(),
    ]);
    custom = fresh;
    golfDayNow = day;
    return build(day);
  };

  const updateInjuries=async()=>{
    if(document.visibilityState!=='visible'||mine!==generation||!injuryAnalysis)return;
    try{const data=await loadNflInjuries();if(mine!==generation||!view.isConnected)return;injuryReport=buildInjuryReport(data.payload,{analysis:injuryAnalysis,now:data.checkedAt});stage?.update(build(golfDayNow));injuryUi.update()}catch{/* Keep the last checked report and its timestamp. */}
  };
  const injuryTimer=setInterval(()=>void updateInjuries(),5*60*1000);
  document.addEventListener('visibilitychange',updateInjuries);
  deferredStops.push(()=>{clearInterval(injuryTimer);document.removeEventListener('visibilitychange',updateInjuries)});

  const startHomeStage = deck => {
    if (mine !== generation || !view.isConnected) return;
    const host = view.querySelector(".home-broadcast");
    if (!host) return;
    const ordered = homeBroadcastDeck(deck, {week: homeBroadcastWeek});
    try { stage?.stop(); } catch {}
    host.classList.remove("is-loading");
    host.innerHTML = renderStage(ordered, { editorial: true });
    const root = host.querySelector("[data-bx-stage]");
    if (root) stage = startStage(root, ordered, { refresh });
  };

  Promise.all([analysisPromise, lorePromise, weeklyPromise, aftermathWeeklyPromise, tradeAlertsPromise, injuryPromise]).then(async ([analysis, got, weekly, aftermathWeekly, tradeAlerts, injuries]) => {
    if (mine !== generation) return;
    if (!view.isConnected) return;
    homeBroadcastWeek=weekly?.week || null;
    injuryAnalysis=analysis;
    if(injuries)injuryReport=buildInjuryReport(injuries.payload,{analysis,now:injuries.checkedAt});
    lore = got?.error ? null : got;
    const aheadData = await weekAheadSlide({
      analysis, weekly, meSleeperId: myMember?.sleeper_user_id || null,
    }) || { slides: [], fixtures: [] };
    const pulse = powerPulseView({
      analysis, meSleeperId: myMember?.sleeper_user_id || null,
      standings: analysis?.standings?.length ? analysis.standings : standings.data || [], currentWeek: weekly?.week || analysis?.liveWeek || null,
    });
    if (pulse?.stakes) pulse.stakes = buildLeagueStakes({
      teams: analysis.teams, standings: analysis.standings?.length ? analysis.standings : standings.data || [], projections: pulse.projections,
      fixtures: aheadData.fixtures, season: analysis.projectionSeason, week: weekly?.week,
      playoffTeams: Number(analysis.league?.playoff_teams) || 8,
    });
    const outlook = buildHomeWeekOutlook({
      analysis, weekly, fixtures: aheadData.fixtures, stakes: pulse?.stakes,
      meSleeperId: myMember?.sleeper_user_id || null,
    });
    const move = buildNextMove({ analysis, weekly, trending: weekly?.trending, meSleeperId: myMember?.sleeper_user_id || null });
    const briefing = buildWeeklyBriefing({ outlook, stakes: pulse?.stakes, move,
      meSleeperId: myMember?.sleeper_user_id || null });
    const completedReport = buildAftermath({ lore: got?.error ? null : got, members: memberRows, weekly: aftermathWeekly });
    const signalChanges = weeklySignalChanges(weekly);
    const tradeViews = tradeAlerts.map(tradeAlertViewModel).filter(Boolean);
    const seasonTradeViews = tradeViews.filter(alert => !analysis?.projectionSeason
      || Number(alert.season) === Number(analysis.projectionSeason));
    const tradeAlert = tradeViews.find(alert => alert.breakingActive
      && Date.parse(alert.occurredAt || "") >= Date.now() - 30 * 24 * 60 * 60 * 1000) || null;

    /* The two standing sections. POWER RANKINGS and WEEK AHEAD each own
       their own place on the page, which is exactly why the retired
       dashboard's "Power Ranks" and "Report" tabs were removed: they drew
       the same two views from the same two objects, one scroll apart. */
    const focusSlot=view.querySelector("[data-home-focus-slot]");
    if(focusSlot)focusSlot.innerHTML=homeWeeklyFocus(outlook,briefing);
    const homeRankingsSlot = view.querySelector("[data-home-rankings-slot]");
    const homeReportSlot = view.querySelector("[data-home-report-slot]");
    const homeTradeSlot = view.querySelector("[data-home-trade-slot]");
    if (homeRankingsSlot) {
      homeRankingsSlot.innerHTML = homeRankingsCard(pulse, memberRows);
      wireHomeRankings(homeRankingsSlot);
    }
    if (homeReportSlot) {
      homeReportSlot.innerHTML = homeWeeklyDigest(outlook, briefing, completedReport, signalChanges);
      wireHomeWeekHub(homeReportSlot);
    }
    if (homeTradeSlot) homeTradeSlot.innerHTML = homeTradeWire(seasonTradeViews);
    /* Both slots just replaced their contents, so the parts the driver was
       holding are detached. Re-bind against what is actually on the page. */
    try { dropAssembly?.(); } catch { }
    dropAssembly = startAssembly(view);

    /* What the dashboard carried that nothing else does: the completed-trade
       verdict and the auto-scout. Both go to the stage as slides. */
    const ahead = aheadData.slides;
    const extras = [...ahead, playoffPictureSlide(pulse?.stakes, myMember?.sleeper_user_id), tradeAlertSlide(tradeAlert), nextMoveSlide(move)].filter(Boolean);
    if (extras.length) {
      liveSlides = extras;
    }
    /* Commit the carousel once, after every startup source has contributed.
       The broadcast starts in editorial order instead of showing partial decks
       replace one another as they load. */
    startHomeStage(build(golfDayNow));
  }).catch((err) => {
    console.warn("clubhouse unavailable", err);
    if (mine === generation && view.isConnected) {
      const focus = view.querySelector("[data-home-focus-slot]");
      const report = view.querySelector("[data-home-report-slot]");
      if (focus) focus.innerHTML = homeWeeklyFocus(null);
      if (report) report.innerHTML = homeWeeklyDigest(null);
    }
    startHomeStage(fallbackDeck);
  });
  view.querySelector("#install-app")?.addEventListener("click", async () => {
    const outcome = await promptInstall();
    if (outcome === "unavailable") toast(installHelp(), true);
  });
  view.querySelector("#check-update").addEventListener("click", async (e) => {
    const btn = e.target; btn.disabled = true; btn.textContent = "Checking…";
    try { const { stale, latest } = await checkForUpdate(true); if (!stale) toast(`Up to date (v${latest})`); }
    catch (err) { toast("Could not check for updates", true); console.warn(err); }
    btn.disabled = false; btn.textContent = "Check for updates";
  });
}

export function anniversary() {
  const number = new Date().getFullYear() - LEAGUE_FOUNDED + 1;
  if (number < 2 || number % 10 !== 0) return "";
  // Keep the approved ten-season artwork together, including its four-color
  // signature. Later milestones retain their accurate, generated heading.
  if (number === 10 && LEAGUE_FOUNDED === 2017) {
    return `<aside class="dfl-anniv dfl-anniv--editorial" role="note" data-assemble>
      <img class="dfl-anniv-art" src="assets/anniversary-ten.webp" width="2172" height="724" alt="10th anniversary season — ${LEAGUE_FOUNDED}–${new Date().getFullYear()}." decoding="async" fetchpriority="high">
    </aside>`;
  }
  return `<aside class="dfl-anniv" role="note" data-assemble>
    <span class="dfl-anniv-copy"><i class="dfl-anniv-branch is-left" aria-hidden="true"></i><span class="dfl-anniv-words"><strong>${esc(ordinal(number))} Anniversary<br>Season</strong><small>${LEAGUE_FOUNDED} — ${new Date().getFullYear()}</small></span><i class="dfl-anniv-branch is-right" aria-hidden="true"></i></span>
    <span class="dfl-anniv-tag">Same guys. Higher stakes. Bigger bragging rights.</span>
  </aside>`;
}

function form(row) {
  const games = (row.wins || 0) + (row.losses || 0) + (row.ties || 0);
  if (!games) return "Your record";
  const pct = ((row.wins || 0) + (row.ties || 0) / 2) / games;
  if (pct >= 0.7) return "Rolling";
  if (pct >= 0.55) return "Playoff bound";
  if (pct >= 0.45) return "On the bubble";
  return "Your record";
}

function snapshot({ leagues, members, myMember, standings, dues, polls }) {
  const season = standings.reduce((a, r) => Math.max(a, Number(r.season) || 0), 0);
  const rows = standings.filter((r) => Number(r.season) === season);
  const nameOf = (uid) => {
    const m = members.find((x) => String(x.sleeper_user_id) === String(uid));
    return m?.team_name || m?.display_name || "—";
  };
  const ranked = [...rows].filter((r) => r.rank != null).sort((a, b) => a.rank - b.rank);
  const leader = ranked[0];
  const meRow = myMember ? rows.find((r) => String(r.sleeper_user_id) === String(myMember.sleeper_user_id)) : null;

  const dueSeason = dues.reduce((a, r) => Math.max(a, Number(r.season) || 0), 0);
  const owed = dues.filter((r) => Number(r.season) === dueSeason)
    .reduce((t, r) => t + Math.max(0, (Number(r.amount_due) || 0) - (Number(r.amount_paid) || 0)), 0);

  const cells = [
    meRow ? { label: form(meRow), value: `${meRow.wins}-${meRow.losses}${meRow.ties ? `-${meRow.ties}` : ""}`, href: "#/profile" }
          : { label: "Owners", value: String(members.length), href: "#/profile" },
    leader ? { label: `${season} leader`, value: nameOf(leader.sleeper_user_id), href: "#/history" }
           : { label: "Titles on record", value: String(leagues.filter((l) => l.champion_user_id).length), href: "#/history" },
    { label: "Owed", value: owed ? money(owed) : "Settled", href: "#/finances" },
    { label: "Polls open", value: String((polls || []).length), href: "#/polls" },
  ];
  return `<section class="home-league-snapshot" aria-labelledby="home-snapshot-title"><h2 id="home-snapshot-title">League at a glance</h2><div class="fp-snap">${cells.map((c) =>
    `<a href="${c.href}"><b>${esc(c.value)}</b><small>${esc(c.label)}</small></a>`).join("")}</div></section>`;
}

function newsList(allRows) {
  const rows = visible("announcements", allRows);
  if (!rows.length) return `<div class="state"><span class="state-title">Nothing yet</span><span>The commissioner has been quiet.</span></div>`;
  return `<div class="fp-news">${rows.map((a) => `<article class="${hiddenClass("announcements", a)}">
    <time>${esc(fmtShort(a.created_at))}</time>
    <h4>${esc(a.title)}</h4>
    <p>${esc(a.content)}</p>
    ${editControls("announcements", a)}</article>`).join("")}</div>`;
}

function homeLeagueFeed(announcements = [], activity = null) {
  const lines = (activity || []).filter(row => row.as_commissioner !== true).map(row => activityLine(row));
  const activityMarkup = activity == null
    ? `<p class="home-feed-state" role="status">Loading activity…</p>`
    : lines.length
      ? `<ul class="act-list">${lines.map(line => `<li class="act-row"><span class="act-who">${line.memberId ? `<a class="plainlink" href="#/profile?id=${esc(line.memberId)}">${esc(line.who)}</a>` : esc(line.who)}</span><span class="act-what">${esc(line.text)}</span><span class="act-when">${esc(line.when)}</span></li>`).join("")}</ul>`
      : `<p class="home-feed-state">No recent member activity.</p>`;
  return `<section class="block home-league-feed">
    <h2 class="section-title">League feed<a class="section-link home-text-action" href="#/calendar"><span>Calendar</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></h2>
    <nav class="home-feed-tabs" role="tablist" aria-label="League feed views">
      <button id="home-feed-tab-news" type="button" role="tab" aria-controls="home-feed-panel-news" aria-selected="true" data-feed-tab="news">Commissioner</button>
      <button id="home-feed-tab-activity" type="button" role="tab" aria-controls="home-feed-panel-activity" aria-selected="false" data-feed-tab="activity">Activity</button>
    </nav>
    <div id="home-feed-panel-news" class="home-feed-panel" role="tabpanel" aria-labelledby="home-feed-tab-news" data-feed-panel="news">${newsList(announcements)}${adminRow(addControl("announcements", "Add announcement"))}</div>
    <div id="home-feed-panel-activity" class="home-feed-panel" role="tabpanel" aria-labelledby="home-feed-tab-activity" data-feed-panel="activity" hidden>${activityMarkup}</div>
  </section>`;
}

function wireHomeLeagueFeed(root) {
  root?.querySelectorAll?.("[data-feed-tab]").forEach(button => button.addEventListener("click", () => {
    const name = button.dataset.feedTab;
    root.querySelectorAll("[data-feed-tab]").forEach(item => item.setAttribute("aria-selected", String(item === button)));
    root.querySelectorAll("[data-feed-panel]").forEach(panel => { panel.hidden = panel.dataset.feedPanel !== name; });
  }));
}

function identity(leagues, members, logo) {
  const number = new Date().getFullYear() - LEAGUE_FOUNDED + 1;
  return `<section class="hero">
    <img class="hero-crest ${logo ? "" : "is-crest"}" src="${esc(logo || "icons/crest-512.webp")}" alt="DFL league crest" ${logo ? "" : `width="512" height="341"`}>
    ${canEdit() ? `<div class="crest-tools"><input type="file" id="logo-file" accept="image/*" class="hidden"><button class="btn ghost small" id="logo-pick">Change crest</button>${logo ? `<button class="btn ghost small" id="logo-reset">Use default</button>` : ""}</div>` : ""}
    <p class="hero-creed">Forged by sinners.<br>Fueled by rivalries.<br>Defined by champions.</p>
    <p class="hero-line">${esc(ordinal(number))} season${members.length ? ` · ${members.length} owners` : ""}</p>
  </section>`;
}

const CREST_SIZE=256,MAX_UPLOAD=12*1024*1024;function wireCrest(view){const pick=view.querySelector("#logo-pick"),file=view.querySelector("#logo-file"),reset=view.querySelector("#logo-reset");if(!pick||!file)return;pick.addEventListener("click",()=>file.click());reset?.addEventListener("click",async()=>{if(!confirm("Go back to the built-in crest?"))return;try{await saveSetting(KEY_LOGO,"");toast("Crest reset");render(view)}catch(err){toast(err.message||"Could not reset the crest",true)}});file.addEventListener("change",async()=>{const chosen=file.files?.[0];if(!chosen)return;if(!chosen.type.startsWith("image/")){toast("That is not an image",true);return}if(chosen.size>MAX_UPLOAD){toast("That image is too large",true);return}pick.disabled=true;pick.textContent="Working…";try{await saveSetting(KEY_LOGO,await toSquarePng(chosen,CREST_SIZE));toast("Crest updated");render(view)}catch(err){toast(err.message||"Could not read that image",true);pick.disabled=false;pick.textContent="Change crest"}})}
async function toSquarePng(fileObj,size){const bitmap=await createImageBitmap(fileObj);try{const side=Math.min(bitmap.width,bitmap.height),canvas=document.createElement("canvas");canvas.width=canvas.height=size;canvas.getContext("2d").drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);return canvas.toDataURL("image/png")}finally{bitmap.close?.()}}
function ordinal(n){const r=n%100;if(r>=11&&r<=13)return `${n}th`;return n+(["th","st","nd","rd"][n%10]||"th")}

function adminRow(control){return control?`<div class="row-end">${control}</div>`:""}
function setupNotice(){return `<header class="page-head"><h1>Almost there</h1></header><div class="card note"><h3 class="card-heading">Connect Supabase</h3><div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.\n\nThe README walks through both steps.</div></div>`}
