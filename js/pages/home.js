// =====================================================================
// Home - the league's front page.
// ---------------------------------------------------------------------
// This was a crest, a nav strip and three lists of database rows. It now
// leads with whatever is actually happening, because that is the only
// question a front page has to answer:
//
//   THE STAGE     the DFL Broadcast billboard. Curated commissioner slides,
//                 genuinely important live competition, and league lore.
//                 Routine utility belongs to the BottomLine and its pages.
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
import { activityCard, ACTIVITY_RPC, ACTIVITY_MISSING } from "../activity.js";
import { esc, fmtDate, fmtWhen, fmtShort, money, errorBox, toast } from "../ui.js";
import { APP_VERSION, LEAGUE_FOUNDED } from "../config.js";
import { checkForUpdate } from "../update.js";
import { promptInstall, isInstalled } from "../install.js";
import { currentMember } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { loadSettings, saveSetting, KEY_LOGO, broadcastOff } from "../settings.js";
import { loadLore } from "../lore.js";
import { broadcastContext, buildDeck, loadGolfDay, loadBroadcastItems, loadBroadcastOverrides } from "../broadcast-deck.js";
import { renderStage, startStage } from "../broadcast-stage.js";
import { window_ as newsWindow, changesSince, whatsNewStrip, wireWhatsNew, markSeen } from "../whatsnew.js";
import { presenceHtml, presenceNow, onPresence } from "../presence.js";
import { loadWall, wallCard, wireWall } from "../member-wall.js";
import { draftView, draftCard } from "../draft-order.js";
import { loadDraftOrder } from "../draft-order-data.js";
import { powerPulsePanel, powerPulseView } from "../power-pulse.js";
import { aftermathReportWeek, buildClubhouseWeekly, clubhouseCard, clubhouseView, clubhouseWeekCard, wireClubhouse } from "../home-clubhouse.js";
import { buildNextMove, nextMovePanel } from "../next-move.js";
import { loadLatestTradeAlert } from "../trade-alerts.js";

let stage = null;
let generation = 0;
let dropPresence = null;
let dropDashboard = null;

export function homeDashboardShell() {
  const tabs = ["My Week", "Power Ranks", "Next Move", "Report"];
  return `<section class="home-dashboard" data-home-dashboard aria-label="League dashboard">
    <nav class="hd-tabs" role="tablist" aria-label="Dashboard cards">${tabs.map((label, index) => `<button type="button" role="tab" aria-selected="${index === 0}" tabindex="${index === 0 ? 0 : -1}" data-hd-go="${index}">${label}</button>`).join("")}</nav>
    <div class="hd-viewport">
      ${tabs.map((label, index) => `<section class="hd-panel ${index === 0 ? "is-active" : ""}" role="tabpanel" data-hd-panel="${index}" aria-label="${label}" aria-hidden="${index !== 0}" ${index ? "inert" : ""}><div class="hd-loading"><span></span><strong>${index === 0 ? "READING YOUR WEEK" : `BUILDING ${label.toUpperCase()}`}</strong></div></section>`).join("")}
    </div>
    <footer class="hd-controls"><div class="hd-dots" aria-hidden="true">${tabs.map((_, index) => `<i class="${index === 0 ? "is-active" : ""}"></i>`).join("")}</div><button type="button" data-hd-pause aria-label="Pause rotating dashboard"><svg class="ico-sm" aria-hidden="true"><use href="#i-pause"></use></svg><span class="sr-only" data-hd-pause-label>Pause</span></button></footer>
    <div class="hd-progress" aria-hidden="true"><i></i></div>
  </section>`;
}

function signed(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : number < 0 ? "−" : ""}${Math.abs(number).toFixed(1)}`;
}

function tradeAlertPanel(alert) {
  if (!alert) return "";
  const packageRows = (alert.packages || []).map(pkg => `<section class="hd-trade-side">
    <small>${esc(pkg.teamName)} SENT</small>
    ${(pkg.players || []).map(player => `<div><span><strong>${esc(player.name)}</strong><small>${esc([player.position, player.nflTeam].filter(Boolean).join(" · "))}</small></span><b>${Math.round(Number(player.value) || 0)}</b></div>`).join("") || `<p>No rated players</p>`}
  </section>`).join("");
  const call = alert.balanced ? "BALANCED" : alert.winner ? `${alert.winner} WINS` : "REVIEW NEEDED";
  const reason = alert.reason?.title || alert.limitations?.[0] || "The completed trade is ready for league review.";
  return `<article class="hd-trade-alert">
    <header><span>DFL TRADE ALERT</span><small>${alert.season ? `${esc(alert.season)} · ` : ""}${alert.week ? `WEEK ${esc(alert.week)}` : "COMPLETED"}</small></header>
    <h2>${esc(call)}</h2>
    <div class="hd-trade-packages">${packageRows}</div>
    <div class="hd-trade-verdict">
      <p><strong>${alert.fairness == null ? "MODEL REVIEW" : `${alert.fairness}% BALANCE`}</strong><span>${esc(reason)}</span></p>
      ${(alert.lineupDeltas || []).slice(0, 2).map(delta => `<small>${esc(delta.teamName)} <b>${signed(delta.weekly)} / wk</b></small>`).join("")}
    </div>
    <a class="btn ghost small" href="${esc(alert.href)}">View the full receipt</a>
  </article>`;
}

function wireHomeDashboard(root) {
  if (!root) return () => {};
  const panels = [...root.querySelectorAll("[data-hd-panel]")];
  const tabs = [...root.querySelectorAll("[data-hd-go]")];
  const dots = [...root.querySelectorAll(".hd-dots i")];
  const pause = root.querySelector("[data-hd-pause]");
  const pauseLabel = root.querySelector("[data-hd-pause-label]");
  const pauseIcon = pause?.querySelector("use");
  const progress = root.querySelector(".hd-progress i");
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  let active = 0, timer = null, hover = false, focus = false, manual = reduced, touchX = null;
  const stopped = () => manual || hover || focus || globalThis.document?.hidden;
  const resetProgress = () => {
    if (!progress) return;
    progress.style.animation = "none";
    void progress.offsetWidth;
    progress.style.animation = "";
  };
  const paintPause = () => {
    root.classList.toggle("is-paused", stopped());
    if (pauseLabel) pauseLabel.textContent = manual ? "Play" : "Pause";
    if (pause) pause.setAttribute("aria-label", manual ? "Play rotating dashboard" : "Pause rotating dashboard");
    if (pauseIcon) pauseIcon.setAttribute("href", manual ? "#i-play" : "#i-pause");
  };
  const show = next => {
    active = (Number(next) + panels.length) % panels.length;
    panels.forEach((panel, index) => {
      const selected = index === active;
      panel.classList.toggle("is-active", selected);
      panel.setAttribute("aria-hidden", String(!selected));
      panel.inert = !selected;
    });
    tabs.forEach((tab, index) => {
      const selected = index === active;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    dots.forEach((dot, index) => dot.classList.toggle("is-active", index === active));
    resetProgress();
  };
  const schedule = () => {
    clearTimeout(timer); timer = null; paintPause();
    if (reduced || stopped() || panels.length < 2) return;
    timer = setTimeout(() => { show(active + 1); schedule(); }, 9000);
  };
  const click = event => {
    const tab = event.target.closest("[data-hd-go]");
    if (tab) { show(tab.dataset.hdGo); schedule(); return; }
    if (event.target.closest("[data-hd-pause]")) { manual = !manual; schedule(); return; }
    const rankings = event.target.closest("[data-pp-rankings]");
    const direction = event.target.closest("[data-pp-week-prev]") ? -1 : event.target.closest("[data-pp-week-next]") ? 1 : 0;
    if (!rankings || !direction) return;
    const boards = [...rankings.querySelectorAll("[data-pp-week-board]")];
    const index = Math.max(0, Math.min(boards.length - 1, (Number(rankings.dataset.weekIndex) || 0) + direction));
    rankings.dataset.weekIndex = String(index);
    boards.forEach((board, boardIndex) => { board.hidden = boardIndex !== index; });
    const board = boards[index];
    const label = rankings.querySelector("[data-pp-week-label]");
    const comparison = rankings.querySelector("[data-pp-week-comparison]");
    if (label) label.textContent = board?.dataset.weekLabel || "Roster model";
    if (comparison) comparison.textContent = board?.dataset.weekComparison || "current roster baseline";
    const prev = rankings.querySelector("[data-pp-week-prev]");
    const nextButton = rankings.querySelector("[data-pp-week-next]");
    if (prev) prev.disabled = index === 0;
    if (nextButton) nextButton.disabled = index === boards.length - 1;
    manual = true; schedule();
  };
  const visibility = () => schedule();
  root.addEventListener("click", click);
  root.addEventListener("mouseenter", () => { hover = true; schedule(); });
  root.addEventListener("mouseleave", () => { hover = false; schedule(); });
  root.addEventListener("focusin", () => { focus = true; schedule(); });
  root.addEventListener("focusout", event => { if (!root.contains(event.relatedTarget)) { focus = false; schedule(); } });
  root.addEventListener("touchstart", event => { touchX = event.touches?.[0]?.clientX ?? null; }, { passive: true });
  root.addEventListener("touchend", event => {
    if (touchX == null) return;
    const delta = (event.changedTouches?.[0]?.clientX ?? touchX) - touchX;
    touchX = null;
    if (Math.abs(delta) > 45) { show(active + (delta < 0 ? 1 : -1)); schedule(); }
  }, { passive: true });
  globalThis.document?.addEventListener("visibilitychange", visibility);
  show(0); schedule();
  return () => { clearTimeout(timer); root.removeEventListener("click", click); globalThis.document?.removeEventListener("visibilitychange", visibility); };
}

export function leave() {
  try { stage?.stop(); } catch (err) { console.warn(err); }
  stage = null;
  try { dropPresence?.(); } catch { }
  dropPresence = null;
  try { dropDashboard?.(); } catch { }
  dropDashboard = null;
}

function installHelp(){const ua=navigator.userAgent;if(/iphone|ipad|ipod/i.test(ua))return "In Safari: Share, then Add to Home Screen";if(/android/i.test(ua))return "Chrome menu (⋮), then Install app";return "Chrome menu (⋮) → Cast, save and share → Install page as app"}

const STAGE_UTILITY = new Set(["events", "poll", "news", "dues"]);
function editorialStage(ctx, { custom = [], off = new Set(), overrides = new Map() } = {}) {
  const ranked = buildDeck(ctx, { custom, off, overrides, max: 20 });
  const picked = ranked.filter((it) => {
    if (it.source === "manual") return true;
    if (STAGE_UTILITY.has(it.generator)) return false;
    if ((it.generator === "golf" || it.generator === "fantasy") && it.temporal === "upcoming") return false;
    if (it.generator === "myMatchup" && it.temporal !== "live") return false;
    return true;
  }).slice(0, 8);
  if (picked.length) return picked;
  return ranked.filter((it) => it.generator === "identity").slice(0, 1);
}

export async function render(view) {
  leave();
  const mine = ++generation;
  if (!configured) { view.innerHTML = setupNotice(); return; }
  const today = new Date().toISOString().slice(0, 10);
  /* These reads do not depend on the core dashboard rows. Starting them now
     removes an entire network waterfall from Home without changing its data. */
  const manualPromise = loadBroadcastItems();
  const overridesPromise = loadBroadcastOverrides();
  const activityPromise = (async () => {
    try {
      const { data, error } = await db().rpc(ACTIVITY_RPC, { row_limit: 8 });
      if (error) throw error;
      return data || [];
    } catch (err) {
      return ACTIVITY_MISSING.test(err?.message || "") ? null : [];
    }
  })();
  const wallPromise = loadWall().catch((err) => { console.warn("wall unavailable", err); return null; });
  const draftPromise = loadDraftOrder();
  const [events, announcements, polls, leagues, members, golf, dues, standings, golfDone] = await Promise.all([
    db().from("events").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(3),
    db().from("announcements").select("*").order("created_at", { ascending: false }).limit(3),
    db().from("polls").select("*").eq("active", true).order("created_at", { ascending: false }).limit(3),
    db().from("sleeper_leagues").select("season,status,champion_user_id").order("season", { ascending: false }),
    /* Only the four columns this page reads. Not loadMembers(), which filters
       to active members - the owner count and the historical champion lookup
       both need people who have since left. */
    db().from("members").select("id,display_name,team_name,sleeper_user_id"),
    db().from("golf_outings").select("id,name,course,event_date,event_time,status").neq("status", "final").order("event_date", { ascending: true }).limit(1),
    db().from("finance_payments").select("season,amount_due,amount_paid"),
    db().from("sleeper_standings").select("season,sleeper_user_id,wins,losses,ties,rank,points_for"),
    db().from("golf_outings").select("id,name,finalized_at").not("finalized_at", "is", null)
        .order("finalized_at", { ascending: false }).limit(5),
  ]);
  const firstError = events.error || announcements.error || polls.error;
  if (firstError) { view.innerHTML = errorBox(firstError); return; }

  const settings = await loadSettings();
  const memberRows = members.data || [];
  const golfRow = (golf.data || [])[0] || null;
  const me = currentMember();
  const myMember = me ? memberRows.find((m) => String(m.id) === String(me.id)) : null;

  const [golfDay, manual, overrides, activity, wall, draft] = await Promise.all([
    golfRow ? loadGolfDay(golfRow.id) : null,
    manualPromise,
    overridesPromise,
    activityPromise,
    wallPromise,
    draftPromise,
  ]);
  const homeData = {
    events: events.data || [], announcements: announcements.data || [],
    polls: polls.data || [], leagues: leagues.data || [], members: memberRows,
    dues: dues.data || [], standings: standings.data || [], golfRow,
  };
  const deck1 = editorialStage(broadcastContext({ home: homeData, golfDay, member: me }), { custom: manual, off: broadcastOff(), overrides });

  const wn = newsWindow();
  const changes = wn.firstRun ? [] : changesSince({
    announcements: announcements.data || [], events: events.data || [],
    polls: polls.data || [], syncedAt: null,
    golf: golfDone.data || [], leagues: leagues.data || [], broadcast: manual,
  }, wn.since);
  if (wn.firstRun) markSeen(new Date(), leagues.data || []);
  const strip = whatsNewStrip(changes, wn.since);

  /* The feed is its own read rather than part of the Promise.all above: it is
     the newest thing on the page and the one most likely to be missing, so a
     league that has not run the migration must not have it fail beside the
     announcements. activityFeed() returns null in that case and the section is
     simply not drawn. */
  /* The feed and the Wall are read together and kept off the Promise.all
     above for the same reason: each depends on a migration a league may not
     have run, and neither is allowed to take the front page down. Both
     resolve to null when their table is absent, and null draws nothing. */
  /* Null all the way through when there is no draft, no order, or a draft
     that finished long enough ago to be history rather than news. */
  const leagueStatus = leagues.data?.[0]?.status || "";
  const draftEvidence = {
    draft: draft?.draft || null,
    slots: draft?.slots || [],
    picks: draft?.picks || [],
    members: memberRows,
    meSleeperId: myMember?.sleeper_user_id || null,
    leagueStatus,
  };
  const draftPanel = draftCard(draftView(draftEvidence));

  /*
    THE ORDER IS THE EDIT.

    Stage, then three figures, then the four IN-SEASON doors: what is happening,
    where the reader stands, and the weekly football work. The draft board follows the doors, and
    only while there is a draft to care about - see draftView() in
    js/draft-order.js, which returns null the rest of the year. The Wall sits directly under the doors
    because it is the only part of this page that changes because somebody
    did something, and burying a posting surface under two static lists is
    how a wall dies. The commissioner and the activity feed follow; the
    crest closes the page, since the splash already carries the brand.

    UPCOMING AND OPEN POLLS ARE GONE FROM THE MARKUP. They were rendered
    here and then hidden with a positional `display:none` in
    splash-loading.css - the data was still fetched, the DOM still built,
    and the admin "Add" buttons still wired, all to be painted over. The
    snapshot, the doors and the BottomLine already carry both facts, and
    Calendar and Polls each have their own add control, so deleting the
    sections loses nothing and takes the CSS hack with it.
  */
  view.innerHTML = `<div id="home-wrap">
    <h1 class="sr-only">DFL HQ</h1>
    ${anniversary()}
    ${homeDashboardShell()}
    ${snapshot({ leagues: leagues.data || [], members: memberRows, myMember, standings: standings.data || [], dues: dues.data || [], polls: polls.data || [] })}
    ${strip}
    ${seasonDoors(dues.data)}
    ${draftPanel}
    <div data-wall-slot>${wallCard(wall)}</div>
    <div class="home-lower">
      <section class="block"><h2 class="section-title">Words from the Commissioner<a class="section-link" href="#/calendar">Calendar →</a></h2>
        ${newsList(announcements.data)}${adminRow(addControl("announcements", "Add announcement"))}</section>
      ${activityCard(activity)}
    </div>
    <section class="home-broadcast-secondary" aria-label="League broadcast">${renderStage(deck1)}</section>
    ${identity(leagues.data || [], memberRows, settings.get(KEY_LOGO))}
    <p class="dfl-alive" data-alive>${presenceHtml(presenceNow())}</p>
    <p class="version-line">DFL HQ v${esc(APP_VERSION)} · <button class="linkbtn" id="check-update">Check for updates</button>${isInstalled() ? "" : ` · <button class="linkbtn" id="install-app">Install app</button>`}</p>
  </div>`;
  dropDashboard = wireHomeDashboard(view.querySelector("[data-home-dashboard]"));

  /* Projection data is intentionally second paint. One shared request feeds
     both the cold open and Power Pulse, so making Home livelier does not make
     it fetch the entire Sleeper model twice. */
  const analysisPromise = import("../team-analyzer-data.js").then(({ loadAnalyzerData }) => loadAnalyzerData());
  const tradeAlertPromise = loadLatestTradeAlert({ hours: 72 }).catch(err => {
    console.warn("trade alert unavailable", err);
    return null;
  });
  const weeklyPromise = analysisPromise.then(async analysis => {
    if (analysis?.state !== "ready") return null;
    const { loadNflState, loadTrendingPlayers, loadWeeklyProjections, loadWeeklyStats } = await import("../sleeper.js");
    const state = await loadNflState();
    const season = Number(state?.data?.season) || analysis.projectionSeason;
    const week = Number(state?.data?.week) || 1;
    const [projections, actual, trending] = await Promise.all([
      loadWeeklyProjections(season, week), loadWeeklyStats(season, week), loadTrendingPlayers(),
    ]);
    const built = buildClubhouseWeekly({
      analysis, rows: projections?.data || [], actualRows: actual?.data || [], season, week,
      fetchedAt: Math.max(projections?.fetchedAt || 0, actual?.fetchedAt || 0),
    });
    return built ? { ...built, trending } : null;
  }).catch(err => { console.warn("clubhouse weekly projections unavailable", err); return null; });
  /* Sleeper rolls its state into the new week after Monday Night Football.
     Tuesday's report card must look backward without dragging the lineup and
     waiver tools backward with it, so Aftermath gets its own completed-week
     bundle while every other dashboard feature keeps the current week. */
  const aftermathWeeklyPromise = Promise.all([analysisPromise, weeklyPromise]).then(async ([analysis, current]) => {
    if (!current) return current;
    const reportWeek = aftermathReportWeek(current.week);
    if (reportWeek === current.week) return current;
    const { loadWeeklyProjections, loadWeeklyStats } = await import("../sleeper.js");
    const [projections, actual] = await Promise.all([
      loadWeeklyProjections(current.season, reportWeek), loadWeeklyStats(current.season, reportWeek),
    ]);
    return buildClubhouseWeekly({
      analysis, rows: projections?.data || [], actualRows: actual?.data || [],
      season: current.season, week: reportWeek,
      fetchedAt: Math.max(projections?.fetchedAt || 0, actual?.fetchedAt || 0),
    });
  }).catch(err => { console.warn("aftermath report week unavailable", err); return null; });
  wireInline(view.querySelector("#home-wrap"), () => render(view));
  wireWhatsNew(view, leagues.data || []);

  /*
    THE WALL REDRAWS ITSELF, NOT THE PAGE. A new post used to re-render all
    of home, which restarts the broadcast stage mid-slide and re-runs every
    query on the page. Repainting just the slot keeps the stage running.
  */
  const redrawWall = async () => {
    const slot = view.querySelector("[data-wall-slot]");
    if (!slot) return;
    try {
      slot.innerHTML = wallCard(await loadWall());
      wireWall(slot, redrawWall);
    } catch (err) {
      console.warn("wall unavailable", err);
      slot.innerHTML = "";
    }
  };
  const wallSlot = view.querySelector("[data-wall-slot]");
  if (wallSlot) wireWall(wallSlot, redrawWall);

  const alive = view.querySelector("[data-alive]");
  if (alive) {
    dropPresence?.();
    dropPresence = onPresence((p) => { alive.innerHTML = presenceHtml(p); });
  }
  wireCrest(view);

  let lore = null;
  let custom = manual;
  const off = broadcastOff();
  const build = (day) => editorialStage(broadcastContext({ home: homeData, lore, golfDay: day, member: me }), { custom, off, overrides });
  const refresh = async () => {
    const [day, fresh] = await Promise.all([
      golfRow ? loadGolfDay(golfRow.id) : null,
      loadBroadcastItems(),
    ]);
    custom = fresh;
    return build(day);
  };

  const root = view.querySelector("[data-bx-stage]");
  if (root) stage = startStage(root, deck1, { refresh });

  const lorePromise = loadLore();
  lorePromise.then((got) => {
    if (got?.error || !got) return;
    lore = got;
    if (mine !== generation) return;
    if (!view.querySelector("[data-bx-stage]")) return;
    stage?.update(build(golfDay));
  }).catch((err) => console.warn("broadcast: lore unavailable", err));

  Promise.all([analysisPromise, lorePromise, weeklyPromise, aftermathWeeklyPromise, tradeAlertPromise]).then(([analysis, got, weekly, aftermathWeekly, tradeAlert]) => {
    if (mine !== generation) return;
    const dashboard = view.querySelector("[data-home-dashboard]");
    if (!dashboard?.isConnected) return;
    const clubhouse = clubhouseView({
      analysis, lore: got?.error ? null : got, members: memberRows,
      meSleeperId: myMember?.sleeper_user_id || null,
      standings: standings.data || [],
      weekly, aftermathWeekly,
    });
    const pulse = powerPulseView({ analysis, meSleeperId: myMember?.sleeper_user_id || null, standings: standings.data || [] });
    const move = buildNextMove({ analysis, weekly, trending: weekly?.trending, meSleeperId: myMember?.sleeper_user_id || null });
    const weekSlot = dashboard.querySelector('[data-hd-panel="0"]');
    const pulseSlot = dashboard.querySelector('[data-hd-panel="1"]');
    const moveSlot = dashboard.querySelector('[data-hd-panel="2"]');
    const reportSlot = dashboard.querySelector('[data-hd-panel="3"]');
    if (weekSlot) weekSlot.innerHTML = clubhouseWeekCard(clubhouse) || `<div class="hd-empty"><strong>YOUR WEEK</strong><p>Your matchup will appear after the next Sleeper sync.</p></div>`;
    if (pulseSlot) pulseSlot.innerHTML = powerPulsePanel(pulse) || `<div class="hd-empty"><strong>POWER RANKS</strong><p>Run a Sleeper sync to build the league board.</p></div>`;
    if (moveSlot) {
      moveSlot.innerHTML = tradeAlertPanel(tradeAlert) || nextMovePanel(move) || `<div class="hd-empty"><strong>NEXT MOVE</strong><p>No urgent starting-lineup move surfaced this week.</p><a class="btn ghost small" href="#/analyzer">Open Team Analyzer</a></div>`;
      if (tradeAlert) {
        const tab = dashboard.querySelector('[data-hd-go="2"]');
        if (tab) tab.textContent = "Trade Alert";
      }
    }
    if (reportSlot) {
      reportSlot.innerHTML = clubhouseCard(clubhouse) || `<div class="hd-empty"><strong>WEEKLY REPORT</strong><p>The full report unlocks when every matchup is final.</p></div>`;
      if (clubhouse?.aftermath?.final) wireClubhouse(reportSlot, clubhouse);
    }
  }).catch((err) => {
    console.warn("clubhouse unavailable", err);
    view.querySelector("[data-home-dashboard]")?.classList.add("has-error");
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
  return `<aside class="dfl-anniv" role="note">
    <img src="icons/crest-512.webp" alt="" aria-hidden="true">
    <span class="dfl-anniv-copy"><strong>${esc(ordinal(number))} Anniversary Season</strong><small>${LEAGUE_FOUNDED} — ${new Date().getFullYear()}</small></span>
    <span class="dfl-anniv-tag">Same guys.<br>Higher stakes.<br>Bigger bragging rights.</span>
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
  return `<div class="fp-snap">${cells.map((c) =>
    `<a href="${c.href}"><b>${esc(c.value)}</b><small>${esc(c.label)}</small></a>`).join("")}</div>`;
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

function seasonDoors(dues){
  const rows=dues||[];
  const season=rows.reduce((a,r)=>Math.max(a,Number(r.season)||0),0);
  const owed=rows.filter(r=>Number(r.season)===season)
    .reduce((t,r)=>t+Math.max(0,(Number(r.amount_due)||0)-(Number(r.amount_paid)||0)),0);
  const doors=[
    ["TRADE","analyzer","Analyze rosters"],
    ["RULES","rules","League handbook"],
    ["FACTS","facts","Records & rivalries"],
    ["FEES","finances",owed?money(owed):"Settled"],
  ];
  return `<nav class="creed-doors">${doors.map(([word,route,sub],i)=>
    `<a class="cdoor cd-${i}" href="#/${route}"><span class="cd-word">${word}</span><span class="cd-sub">${esc(sub)}</span></a>`
  ).join("")}</nav>`;
}
function adminRow(control){return control?`<div class="row-end">${control}</div>`:""}
function setupNotice(){return `<header class="page-head"><h1>Almost there</h1></header><div class="card note"><h3 class="card-heading">Connect Supabase</h3><div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.\n\nThe README walks through both steps.</div></div>`}
