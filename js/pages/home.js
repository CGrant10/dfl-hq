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
import { currentMember, loadMemberDirectory } from "../members.js";
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
import { powerPulseView } from "../power-pulse.js";
import { aftermathReportWeek, buildClubhouseWeekly, clubhouseView } from "../home-clubhouse.js";
import { buildNextMove } from "../next-move.js";
import { teamInitials, weekHasStarted } from "../league-trajectory.js";
import { startAssembly } from "../scroll-assembly.js";
import { currentMatchupWeek, matchupPreviewSlide, nextMoveSlide, tradeAlertSlide, weekSlateSlide } from "../home-slides.js";
import { loadActiveTradeAlert } from "../trade-alerts.js";
import { loadLeagueState } from "../league-state.js";

let stage = null;
let generation = 0;
let dropAssembly = null;
let suppressMyMatchup = false;
let dropPresence = null;

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
  const photo = member?.profile_image;
  if (photo) return `<img class="${cls}" src="${esc(photo)}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;
  const name = member?.team_name || member?.display_name || team?.team_name || "?";
  return `<span class="${cls} home-rank-initials" aria-hidden="true">${esc(teamInitials(name))}</span>`;
}


/** The always-visible standings board from the approved Home composition. */
export function homeRankingsCard(view, members = []) {
  const rankings = view?.powerRankings;
  const board = rankings?.boards?.at(-1);
  if (!board?.rows?.length) return `<section class="home-rankings-card is-loading"><strong>POWER RANKINGS</strong><p>Run a Sleeper sync to build the weekly board.</p></section>`;
  const focus = board.rows.find(row => String(row.id) === String(view.focus?.id)) || board.rows[0];
  const leader = board.rows[0];
  const teamFor = row => view.allTeams?.find(team => String(team.id) === String(row.id));
  const visible = board.rows.slice(0, 3);
  const showFocus = focus && !visible.some(row => String(row.id) === String(focus.id));
  const row = (item, index, mine = false) => `<li class="${mine ? "is-me" : ""} ${index >= 3 && !mine ? "is-rank-collapsed" : ""}" data-assemble>
    <b>${esc(String(item.rank))}</b>${memberAvatar(teamFor(item), members, "home-rank-face")}
    <span><strong>${esc(item.name)}</strong></span><em>${esc(item.record)}</em>${rankMove(item.movement)}
  </li>`;
  return `<section class="home-rankings-card">
    <header><h2>POWER RANKINGS</h2><a href="#/analyzer">${esc(board.label)} OF ${esc(String(view.weeks || 14))}<svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"></use></svg></a></header>
    <div class="home-rank-summary">
      <div><small>YOUR RANK</small><strong>#${esc(String(focus.rank))}</strong>${rankMove(focus.movement)}</div>
      <div class="home-rank-leader">${memberAvatar(teamFor(leader), members, "home-rank-face")}<span><small>LEAGUE LEADER</small><strong>${esc(leader.name)}</strong><em>#1&nbsp; | &nbsp;${esc(leader.record)}</em></span></div>
    </div>
    <div class="home-rank-head"><span>RANK</span><span>TEAM</span><span>RECORD</span><span>MOVE</span></div>
    <ol>${board.rows.slice(0, 3).map((item, index) => row(item, index, String(item.id) === String(focus.id))).join("")}${showFocus ? `<li class="home-rank-ellipsis" aria-hidden="true">•••</li>` : ""}${board.rows.slice(3).map((item, offset) => row(item, offset + 3, String(item.id) === String(focus.id))).join("")}</ol>
    <button class="home-rank-all" type="button" data-home-rank-toggle aria-expanded="false"><span>View all ${board.rows.length}</span><svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"></use></svg></button>
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
function digestItem(label, title, detail) {
  return `<article data-assemble><small>${esc(label)}</small><strong>${esc(title)}</strong><span>${esc(detail)}</span></article>`;
}

/** The compact three-hit weekly report shown directly on Home. */
export function homeWeeklyDigest(view) {
  const report = view?.aftermath;
  let items = [];
  if (report?.final) {
    const bench = report.bench;
    const close = report.closest;
    const starter = report.players?.starters?.[0];
    if (bench) items.push(["BENCH CRIME", bench.name, `${Number(bench.value).toFixed(1)} pts wasted on the bench.`]);
    if (close) items.push(["CLOSEST ESCAPE", close.winner, `Won by ${Number(close.margin).toFixed(1)}. No room to breathe.`]);
    if (starter) items.push(["TOP STARTER", starter.name, `${Number(starter.points).toFixed(1)} pts. Carried the squad.`]);
  }
  if (items.length < 3) {
    const fallbacks = (view?.stories || []).filter(story => story?.headline).slice(0, 3);
    items = fallbacks.map((story) => {
      const sides = story.sides || [];
      const matchup = sides.length > 1
        ? `${view?.focusName || sides[0].name} ${sides[0].score}–${sides[1].score} ${sides[1].name}` : null;
      const power = story.key === "power" ? String(story.detail || "").replace(/ in the current roster model\.?/i, "") : null;
      return [story.label, matchup || power || story.headline, matchup ? story.headline : story.detail];
    });
  }
  if (!items.length) return `<section class="home-weekly-digest is-loading"><header><h2>WEEKLY REPORT</h2></header><p>Your report appears after the next Sleeper sync.</p></section>`;
  return `<section class="home-weekly-digest">
    <header><h2>WEEKLY REPORT</h2><small>SAME STORIES. DIFFERENT VICTIMS.</small></header>
    <div>${items.slice(0, 3).map(item => digestItem(...item)).join("")}</div>
  </section>`;
}

export function leave() {
  try { stage?.stop(); } catch (err) { console.warn(err); }
  stage = null;
  try { dropPresence?.(); } catch { }
  dropPresence = null;
  try { dropAssembly?.(); } catch { }
  dropAssembly = null;
}

function installHelp(){const ua=navigator.userAgent;if(/iphone|ipad|ipod/i.test(ua))return "In Safari: Share, then Add to Home Screen";if(/android/i.test(ua))return "Chrome menu (⋮), then Install app";return "Chrome menu (⋮) → Cast, save and share → Install page as app"}

const STAGE_UTILITY = new Set(["events", "poll", "news", "dues"]);
function editorialStage(ctx, { custom = [], off = new Set(), overrides = new Map() } = {}) {
  const ranked = buildDeck(ctx, { custom, off, overrides, max: 20 });
  const picked = ranked.filter((it) => {
    if (it.source === "manual" || it.pinned) return true;
    if (STAGE_UTILITY.has(it.generator)) return false;
    if ((it.generator === "golf" || it.generator === "fantasy") && it.temporal === "upcoming") return false;
    /* myMatchup used to be held back unless the game was LIVE. That made
       sense when the tabbed dashboard carried a permanent "My Week" card and
       a second copy on the stage would have been the same fact twice. The
       dashboard is gone, so this is now the only place the reader's own game
       appears - and a finished game is still the thing they came to see.

       The exception is a week-ahead preview: that is the same fixture looking
       forward, so the backward-looking generator stands down rather than
       putting last week's final beside this week's projection. */
    if (it.generator === "myMatchup" && suppressMyMatchup) return false;
    return true;
  }).slice(0, 8);
  if (picked.length) return picked;
  return ranked.filter((it) => it.generator === "identity").slice(0, 1);
}

/* Home is personal before it is editorial. The deck may rank a live league
   item above this one, but opening Home should land on the signed-in member's
   matchup; the automatic rotation can carry on from there. */
export function personalMatchupFirst(deck = []) {
  const index = deck.findIndex(item => item?.generator === "matchupPreview"
    || item?.generator === "myMatchup" || item?.kind === "mine");
  if (index <= 0) return deck.slice();
  return [deck[index], ...deck.slice(0, index), ...deck.slice(index + 1)];
}

/*
  THE PAIRING FOR A WEEK NOBODY HAS PLAYED YET.

  sync.js will not write a week into sleeper_matchups until somebody has
  points in it, so the fixture for the week ahead is not in the database at
  the moment it matters most. It comes from Sleeper directly here, mapped
  roster -> owner through the analyzer's teams, and is only asked for when a
  preview is actually wanted: a network call on every Home paint to render
  nothing would be a poor trade.
*/
async function weekAheadSlide({ analysis, weekly, meSleeperId, lore }) {
  if (!weekly?.week || !meSleeperId || analysis?.state !== "ready") return null;
  const week = currentMatchupWeek(weekly.week);
  /* The report owns the completed week on Tuesday; this surface owns the new
     week as soon as Sleeper advances it. */
  if (week !== Number(weekly.week)) return null;
  const leagueId = analysis.league?.sleeper_league_id;
  if (!leagueId) return null;
  /*
    THE WEEK BEING PLAYED IS STILL THIS WEEK'S CARD.

    This used to bail the moment any row for the week had a score, which
    meant one Thursday-night kickoff deleted the whole surface - the slate
    and the preview both vanished on the Friday, and all that was left was a
    personal scoreboard reading 16.20 to 0.00. The league slate is wanted
    MORE once the week is under way, not less.

    So nothing is skipped here. What changes is what the cards say: the slate
    switches from projections to live scores (see `live` below), and the
    personal preview stands down for its own fixture once that fixture has
    started, because from then on the myMatchup generator has real numbers
    and says it better.
  */
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
    return {
      sleeper_user_id: team.sleeper_user_id,
      name: team.team_name || team.ownerName || "Unnamed",
      projection: projectionOf(team.sleeper_user_id),
      actual: actualOf(team.sleeper_user_id),
    };
  };

  /* Sleeper returns one row per ROSTER; a fixture is the two rows sharing a
     matchup_id. Grouping once means the slate and the personal preview can
     never disagree about who is playing whom. */
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

  const mineFixture = fixtures.find(fixture =>
    String(fixture.a.sleeper_user_id) === String(meSleeperId)
    || String(fixture.b.sleeper_user_id) === String(meSleeperId));

  const slides = [];
  /* Has the reader's own game started? Their fixture's rows are the only
     ones that decide it - another matchup kicking off on Thursday says
     nothing about theirs. */
  const mineStarted = mineFixture && weekRows.some(row =>
    [row.user1, row.user2].some(uid => String(uid) === String(mineFixture.a.sleeper_user_id)
      || String(uid) === String(mineFixture.b.sleeper_user_id))
    && (Number(row.score1) > 0 || Number(row.score2) > 0));
  if (mineFixture && !mineStarted) {
    const iAmA = String(mineFixture.a.sleeper_user_id) === String(meSleeperId);
    slides.push(matchupPreviewSlide({
      pairing: { mine: iAmA ? mineFixture.a : mineFixture.b, theirs: iAmA ? mineFixture.b : mineFixture.a },
      weekly, meSleeperId, season: weekly.season, week,
      /* The head-to-head is all-time, so it comes from lore's full matchup
         history rather than the analyzer's season-scoped slice. */
      matchups: lore?.matchups || [],
    }));
  }
  slides.push(weekSlateSlide({ fixtures, season: weekly.season, week, meSleeperId, live: weekStarted }));
  return slides.filter(Boolean);
}

export async function render(view) {
  leave();
  suppressMyMatchup = false;
  const mine = ++generation;
  if (!configured) { view.innerHTML = setupNotice(); return; }
  const today = new Date().toISOString().slice(0, 10);
  /* These reads do not depend on the core dashboard rows. Starting them now
     removes an entire network waterfall from Home without changing its data. */
  const manualPromise = loadBroadcastItems();
  const overridesPromise = loadBroadcastOverrides();
  const lorePromise = loadLore();
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
    /* The shared directory includes former members; the owner count and the
       historical champion lookup both need people who have since left. */
    loadMemberDirectory().then(data => ({ data, error: null }), error => ({ data: [], error })),
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
  const fallbackDeck = personalMatchupFirst(editorialStage(
    broadcastContext({ home: homeData, golfDay, member: me }),
    { custom: manual, off: broadcastOff(), overrides },
  ));

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
    <section class="home-broadcast is-loading" aria-label="League broadcast">
      <div class="home-broadcast-loading" role="status"><span></span><strong>Loading your matchup</strong></div>
    </section>
    <div data-home-rankings-slot>${homeRankingsCard(null)}</div>
    <div data-home-report-slot>${homeWeeklyDigest(null)}</div>
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
    ${identity(leagues.data || [], memberRows, settings.get(KEY_LOGO))}
    <p class="dfl-alive" data-alive>${presenceHtml(presenceNow())}</p>
    <p class="version-line">DFL HQ v${esc(APP_VERSION)} · <button class="linkbtn" id="check-update">Check for updates</button>${isInstalled() ? "" : ` · <button class="linkbtn" id="install-app">Install app</button>`}</p>
  </div>`;

  /* Projection data is intentionally second paint. One shared request feeds
     both the cold open and Power Pulse, so making Home livelier does not make
     it fetch the entire Sleeper model twice. */
  const analysisPromise = import("../team-analyzer-data.js").then(({ loadAnalyzerData }) => loadAnalyzerData());
  const tradeAlertPromise = loadActiveTradeAlert({ hours: 24 * 30 }).catch(err => {
    console.warn("trade alert unavailable", err);
    return null;
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
  /* Sleeper rolls its state into the new week after Monday Night Football.
     Tuesday's report card must look backward without dragging the lineup and
     waiver tools backward with it, so Aftermath gets its own completed-week
     bundle while every other dashboard feature keeps the current week. */
  const aftermathWeeklyPromise = Promise.all([analysisPromise, weeklyPromise]).then(async ([analysis, current]) => {
    if (!current) return current;
    const reportWeek = (await loadLeagueState()).reportWeek || aftermathReportWeek(current.week);
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
  let golfDayNow = golfDay;
  const off = broadcastOff();
  const build = (day) => personalMatchupFirst(editorialStage(
    broadcastContext({ home: homeData, lore, golfDay: day, member: me }),
    { custom: [...custom, ...liveSlides], off, overrides },
  ));
  const refresh = async () => {
    const [day, fresh] = await Promise.all([
      golfRow ? loadGolfDay(golfRow.id) : null,
      loadBroadcastItems(),
    ]);
    custom = fresh;
    golfDayNow = day;
    return build(day);
  };

  const startHomeStage = deck => {
    if (mine !== generation || !view.isConnected) return;
    const host = view.querySelector(".home-broadcast");
    if (!host) return;
    const ordered = personalMatchupFirst(deck);
    try { stage?.stop(); } catch {}
    host.classList.remove("is-loading");
    host.innerHTML = renderStage(ordered);
    const root = host.querySelector("[data-bx-stage]");
    if (root) stage = startStage(root, ordered, { refresh });
  };

  Promise.all([analysisPromise, lorePromise, weeklyPromise, aftermathWeeklyPromise, tradeAlertPromise]).then(async ([analysis, got, weekly, aftermathWeekly, tradeAlert]) => {
    if (mine !== generation) return;
    if (!view.isConnected) return;
    lore = got?.error ? null : got;
    const clubhouse = clubhouseView({
      analysis, lore: got?.error ? null : got, members: memberRows,
      meSleeperId: myMember?.sleeper_user_id || null,
      standings: standings.data || [],
      weekly, aftermathWeekly,
    });
    const pulse = powerPulseView({
      analysis, meSleeperId: myMember?.sleeper_user_id || null,
      standings: standings.data || [], currentWeek: weekly?.week || null,
    });
    const move = buildNextMove({ analysis, weekly, trending: weekly?.trending, meSleeperId: myMember?.sleeper_user_id || null });

    /* The two standing sections. POWER RANKINGS and WEEKLY REPORT each own
       their own place on the page, which is exactly why the retired
       dashboard's "Power Ranks" and "Report" tabs were removed: they drew
       the same two views from the same two objects, one scroll apart. */
    const homeRankingsSlot = view.querySelector("[data-home-rankings-slot]");
    const homeReportSlot = view.querySelector("[data-home-report-slot]");
    if (homeRankingsSlot) {
      homeRankingsSlot.innerHTML = homeRankingsCard(pulse, memberRows);
      wireHomeRankings(homeRankingsSlot);
    }
    if (homeReportSlot) homeReportSlot.innerHTML = homeWeeklyDigest(clubhouse);
    /* Both slots just replaced their contents, so the parts the driver was
       holding are detached. Re-bind against what is actually on the page. */
    try { dropAssembly?.(); } catch { }
    dropAssembly = startAssembly(view);

    /* What the dashboard carried that nothing else does: the completed-trade
       verdict and the auto-scout. Both go to the stage as slides. */
    const ahead = await weekAheadSlide({ analysis, weekly, meSleeperId: myMember?.sleeper_user_id || null, lore: got?.error ? null : got }) || [];
    const extras = [...ahead, tradeAlertSlide(tradeAlert), nextMoveSlide(move)].filter(Boolean);
    if (extras.length) {
      liveSlides = extras;
      /* A preview and the myMatchup generator are the same fixture from two
         directions - one looking forward, one looking back. Showing both puts
         last week's result next to this week's projection on the same stage,
         so the generator stands down while a preview exists. */
      suppressMyMatchup = ahead.some(slide => slide?.generator === "matchupPreview");
    }
    /* Commit the carousel once, after every startup source has contributed.
       The member sees their matchup first instead of watching partial decks
       replace one another as they load. */
    startHomeStage(build(golfDayNow));
  }).catch((err) => {
    console.warn("clubhouse unavailable", err);
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
