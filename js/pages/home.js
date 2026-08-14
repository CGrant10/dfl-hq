// =====================================================================
// Home - the league's front page.
// ---------------------------------------------------------------------
// This was a crest, a nav strip and three lists of database rows. It now
// leads with whatever is actually happening, because that is the only
// question a front page has to answer:
//
//   THE STAGE     the DFL Broadcast billboard. What it shows is ranked by
//                 broadcast-deck.js, drawn by broadcast-stage.js, and every
//                 item carries an explicit temporal state so nothing on this
//                 screen can imply that a finished season is happening now.
//   THE SNAPSHOT  four figures - your rank, the leader, what is owed,
//                 what is open - each a link to where it came from.
//   THE CREED     DRAFT * GOLF * SIN * FOLD, still the navigation.
//   NEWS          announcements as news cards rather than table rows.
//
// The stage is deliberately the only place on this page allowed a big
// number, and the crest sits in an identity block at the bottom: the splash
// carries the brand on launch, so repeating it at full size above the fold
// made the page an About screen.
// =====================================================================
import { db, configured } from "../supabase.js";
import { esc, fmtDate, fmtWhen, relDate, fmtShort, money, errorBox, toast } from "../ui.js";
import { APP_VERSION, LEAGUE_FOUNDED } from "../config.js";
import { checkForUpdate } from "../update.js";
import { promptInstall, isInstalled } from "../install.js";
import { currentMember } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { loadSettings, saveSetting, KEY_LOGO, broadcastOff } from "../settings.js";
import { loadLore } from "../lore.js";
import { broadcastContext, buildDeck, loadGolfDay, loadBroadcastItems } from "../broadcast-deck.js";
import { renderStage, startStage } from "../broadcast-stage.js";
import { window_ as newsWindow, changesSince, whatsNewStrip, wireWhatsNew, markSeen } from "../whatsnew.js";

/*
  THE RUNNING STAGE.

  Module-level because there must only ever be one. render() is called again
  by the inline editors and the crest picker, and the router calls leave() on
  the way out - both have to be able to stop the timer that the previous
  render started, or the front page ends up with two clocks advancing the
  same element and a setTimeout still firing on the calendar screen.
*/
let stage = null;
/* Bumped by every render. loadLore() can take a second, so a phase 2 that
   resolves after the page was re-rendered (inline edit, crest change) would
   otherwise hand a stale deck to the new stage. */
let generation = 0;

/** Called by the router when this page is left. */
export function leave() {
  try { stage?.stop(); } catch (err) { console.warn(err); }
  stage = null;
}

function installHelp(){const ua=navigator.userAgent;if(/iphone|ipad|ipod/i.test(ua))return "In Safari: Share, then Add to Home Screen";if(/android/i.test(ua))return "Chrome menu (⋮), then Install app";return "Chrome menu (⋮) → Cast, save and share → Install page as app"}

export async function render(view) {
  leave();                                   // a re-render replaces the stage
  const mine = ++generation;
  if (!configured) { view.innerHTML = setupNotice(); return; }
  const today = new Date().toISOString().slice(0, 10);
  const [events, announcements, polls, leagues, members, golf, dues, standings, golfDone] = await Promise.all([
    db().from("events").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(3),
    db().from("announcements").select("*").order("created_at", { ascending: false }).limit(3),
    db().from("polls").select("*").eq("active", true).order("created_at", { ascending: false }).limit(3),
    db().from("sleeper_leagues").select("season, champion_user_id").order("season", { ascending: false }),
    db().from("members").select("id, display_name, team_name, sleeper_user_id"),
    db().from("golf_outings").select("id,name,course,event_date,event_time,status").neq("status", "final").order("event_date", { ascending: true }).limit(1),
    db().from("finance_payments").select("season,amount_due,amount_paid"),
    db().from("sleeper_standings").select("season,sleeper_user_id,wins,losses,ties,rank,points_for"),
    /* Recently finalised outings, for What's New only - the stage reads the
       live outing separately. finalized_at is a real dated event: somebody
       pressed finalise. */
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

  /*
    THE STAGE, IN TWO PHASES, and the order matters.

    Phase 1 builds a deck from the rows THIS PAGE has already fetched. It
    paints immediately - no extra request stands between opening the app and
    seeing something.

    Phase 2 loads lore.js (688 matchup rows) and rebuilds, which is what
    brings your matchup, the record book and past champions in. It is awaited
    AFTER the first paint on purpose: putting it on the critical path would
    make the front page slower than it is today, which is a bad trade for
    slides that are about things that happened years ago.
  */
  /* Both in one round trip. The hand-written slides are part of phase 1
     because a commissioner who posts one expects to see it on the first
     paint, not after lore has finished loading. */
  const [golfDay, manual] = await Promise.all([
    golfRow ? loadGolfDay(golfRow.id) : null,
    loadBroadcastItems(),
  ]);
  const homeData = {
    events: events.data || [], announcements: announcements.data || [],
    polls: polls.data || [], leagues: leagues.data || [], members: memberRows,
    dues: dues.data || [], standings: standings.data || [], golfRow,
  };
  const deck1 = buildDeck(broadcastContext({ home: homeData, golfDay, member: me }), { custom: manual, off: broadcastOff() });

  /*
    WHAT'S NEW sits under the snapshot rather than above the stage: it is a
    footnote about the last few days, and putting it first would push the
    thing that is actually happening below the fold. It is usually "".

    syncedAt comes from lore, which has not loaded yet at this point - so
    the sync line is the one change this strip reports a beat later. It is
    not worth blocking the first paint on.
  */
  const wn = newsWindow();
  const changes = wn.firstRun ? [] : changesSince({
    announcements: announcements.data || [], events: events.data || [],
    polls: polls.data || [], syncedAt: null,
    golf: golfDone.data || [], leagues: leagues.data || [], broadcast: manual,
  }, wn.since);
  /* A first run stamps the champion watermark too, so the NEXT title the
     league wins is announced - without this, a device that has never
     dismissed the strip would never learn what "the champion I already
     knew about" was, and could never report a new one. */
  if (wn.firstRun) markSeen(new Date(), leagues.data || []);
  const strip = whatsNewStrip(changes, wn.since);

  view.innerHTML = `<div id="home-wrap">
    <!--
      Every other route has a visible <h1>. This one leads with the stage,
      whose headline changes every few seconds - making THAT the h1 would
      give the page a heading that rotates, which is worse than none for
      anyone navigating by headings. So the page gets a real h1 that simply
      does not need to be drawn: the crest, the banner and the stage
      already say what this is to anybody who can see it.
    -->
    <h1 class="sr-only">DFL HQ</h1>
    ${anniversary()}
    ${renderStage(deck1)}
    ${snapshot({ leagues: leagues.data || [], members: memberRows, myMember, standings: standings.data || [], dues: dues.data || [], polls: polls.data || [] })}
    ${strip}
    ${creedDoors(events.data, golfRow, polls.data, dues.data)}
    <section class="block"><h2 class="section-title">Latest<a class="section-link" href="#/calendar">Calendar →</a></h2>
      ${newsList(announcements.data)}${adminRow(addControl("announcements", "Add announcement"))}</section>
    <section class="block"><h2 class="section-title">Upcoming<a class="section-link" href="#/calendar">Calendar →</a></h2>
      ${eventList(events.data)}${adminRow(addControl("events", "Add event"))}</section>
    <section class="block"><h2 class="section-title">Open polls<a class="section-link" href="#/polls">Vote →</a></h2>
      ${pollList(polls.data)}${adminRow(addControl("polls", "Add poll"))}</section>
    ${identity(leagues.data || [], memberRows, settings.get(KEY_LOGO))}
    <p class="version-line">DFL HQ v${esc(APP_VERSION)} · <button class="linkbtn" id="check-update">Check for updates</button>${isInstalled() ? "" : ` · <button class="linkbtn" id="install-app">Install app</button>`}</p>
  </div>`;

  wireInline(view.querySelector("#home-wrap"), () => render(view));
  wireWhatsNew(view, leagues.data || []);
  wireCrest(view);

  /*
    START THE CLOCK.

    Everything the stage needs to rebuild itself is closed over here, so the
    refresh callback is the ONLY thing that knows how to get fresh golf
    scores - the engine just calls it and takes a deck back. It re-reads the
    outing rather than the whole page, because a live scorecard is the only
    thing on this screen that changes minute to minute.
  */
  let lore = null;
  let custom = manual;
  /* Read once per render off the warm settings cache, not per slide. */
  const off = broadcastOff();
  const build = (day) => buildDeck(broadcastContext({ home: homeData, lore, golfDay: day, member: me }), { custom, off });
  /* The live poll re-reads the hand-written slides too, so a slide that was
     scheduled to start - or that an admin just published - arrives during a
     golf day without anybody reloading the page. */
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

  /* Phase 2. Nothing above waited for this. It hands the richer deck to the
     running engine instead of replacing the element, so a slide you are
     reading is not ripped out from under you when lore lands. */
  loadLore().then((got) => {
    if (got?.error || !got) return;
    lore = got;
    if (mine !== generation) return;          // a newer render owns the stage now
    if (!view.querySelector("[data-bx-stage]")) return;   // navigated away mid-flight
    stage?.update(build(golfDay));
  }).catch((err) => console.warn("broadcast: lore unavailable", err));
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


/*
  THE HERO IS THE STAGE NOW.

  Everything that used to live here - heroBlock, golfHero, matchupHero,
  quietHero, heroShell, scoreBand, golfMood, matchupMood - has moved rather
  than been deleted. The three hero functions were a priority list wearing an
  || chain:

    golfHero(...) || matchupHero(...) || quietHero(...)

  which is exactly what broadcast-deck.js does with fourteen generators
  instead of three. golfMood became dayMood() in marquee.js, beside the
  match-level mood it always belonged next to. The scoreboard is marquee().

  Nothing was reimplemented on the way across. The golf scores still come
  from dayPoints(), the names from namer(), the temporal state from
  outingState() and fantasyState().
*/

/*
  THE ANNIVERSARY BANNER.

  2026 is the tenth season, and a tenth season is the one thing on this page
  that outranks whatever is happening today - so it sits above the stage
  rather than in the sign-off at the foot, where it used to be a single grey
  line.

  It only exists on a decade year. Every other season this returns nothing at
  all, which is the point: a banner that is always there is furniture.
*/
function anniversary() {
  const number = new Date().getFullYear() - LEAGUE_FOUNDED + 1;
  if (number < 2 || number % 10 !== 0) return "";
  return `<aside class="dfl-anniv" role="note">
    <span class="dfl-anniv-star" aria-hidden="true">&#9733;</span>
    <span class="dfl-anniv-text">${esc(ordinal(number))} Anniversary Season</span>
    <span class="dfl-anniv-star" aria-hidden="true">&#9733;</span>
  </aside>`;
}

// --------------------------------------------------------- the snapshot

/* A record, characterised. Win percentage only - there is no per-week data
   loaded here, so anything about "streaks" would be invented. */
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

// ------------------------------------------------------------- the rest

function newsList(allRows) {
  const rows = visible("announcements", allRows);
  if (!rows.length) return `<div class="state"><span class="state-title">Nothing yet</span><span>The commissioner has been quiet.</span></div>`;
  return `<div class="fp-news">${rows.map((a) => `<article class="${hiddenClass("announcements", a)}">
    <time>${esc(fmtShort(a.created_at))}</time>
    <h4>${esc(a.title)}</h4>
    <p>${esc(a.content)}</p>
    ${editControls("announcements", a)}</article>`).join("")}</div>`;
}

/* The crest, once, at the bottom - the identity block. This is also where the
   commissioner changes it, which is why it stays on the page at all. */
function identity(leagues, members, logo) {
  const number = new Date().getFullYear() - LEAGUE_FOUNDED + 1;
  return `<section class="hero">
    <img class="hero-crest ${logo ? "" : "is-crest"}" src="${esc(logo || "icons/crest-512.png")}" alt="DFL league crest" ${logo ? "" : `width="512" height="341"`}>
    ${canEdit() ? `<div class="crest-tools"><input type="file" id="logo-file" accept="image/*" class="hidden"><button class="btn ghost small" id="logo-pick">Change crest</button>${logo ? `<button class="btn ghost small" id="logo-reset">Use default</button>` : ""}</div>` : ""}
    <p class="hero-creed">Forged by sinners.<br>Fueled by rivalries.<br>Defined by champions.</p>
    <p class="hero-line">${esc(ordinal(number))} season${members.length ? ` · ${members.length} owners` : ""}</p>
  </section>`;
}

const CREST_SIZE=256,MAX_UPLOAD=12*1024*1024;function wireCrest(view){const pick=view.querySelector("#logo-pick"),file=view.querySelector("#logo-file"),reset=view.querySelector("#logo-reset");if(!pick||!file)return;pick.addEventListener("click",()=>file.click());reset?.addEventListener("click",async()=>{if(!confirm("Go back to the built-in crest?"))return;try{await saveSetting(KEY_LOGO,"");toast("Crest reset");render(view)}catch(err){toast(err.message||"Could not reset the crest",true)}});file.addEventListener("change",async()=>{const chosen=file.files?.[0];if(!chosen)return;if(!chosen.type.startsWith("image/")){toast("That is not an image",true);return}if(chosen.size>MAX_UPLOAD){toast("That image is too large",true);return}pick.disabled=true;pick.textContent="Working…";try{await saveSetting(KEY_LOGO,await toSquarePng(chosen,CREST_SIZE));toast("Crest updated");render(view)}catch(err){toast(err.message||"Could not read that image",true);pick.disabled=false;pick.textContent="Change crest"}})}
async function toSquarePng(fileObj,size){const bitmap=await createImageBitmap(fileObj);try{const side=Math.min(bitmap.width,bitmap.height),canvas=document.createElement("canvas");canvas.width=canvas.height=size;canvas.getContext("2d").drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,size,size);return canvas.toDataURL("image/png")}finally{bitmap.close?.()}}
function ordinal(n){const r=n%100;if(r>=11&&r<=13)return `${n}th`;return n+(["th","st","nd","rd"][n%10]||"th")}
/*
  THE CREED IS THE NAVIGATION.

  DRAFT * GOLF * SIN * FOLD is printed on the crest, and it happens to name
  the four things this league does. So it is the way in, rather than a
  decorative line of type above a ten-icon grid. The full list still exists,
  behind More in the tab bar.

  Each door carries one live number, and a door with nothing to say says so
  quietly rather than showing a zero.
*/
function creedDoors(events,golfRow,polls,dues){
  const draft=(events||[]).find(e=>/draft/i.test(e.title||e.name||""));
  const open=(polls||[]).length;
  const rows=dues||[];
  const season=rows.reduce((a,r)=>Math.max(a,Number(r.season)||0),0);
  const owed=rows.filter(r=>Number(r.season)===season)
    .reduce((t,r)=>t+Math.max(0,(Number(r.amount_due)||0)-(Number(r.amount_paid)||0)),0);
  const doors=[
    ["DRAFT","keepers",draft?relDate(draft.event_date):"Keepers"],
    ["GOLF","golf",golfRow?(golfRow.event_date?relDate(golfRow.event_date):"Set up"):"No event"],
    ["SIN","polls",open?`${open} open`:"Quiet"],
    ["FOLD","finances",owed?money(owed):"Settled"],
  ];
  return `<nav class="creed-doors">${doors.map(([word,route,sub],i)=>
    `<a class="cdoor cd-${i}" href="#/${route}"><span class="cd-word">${word}</span><span class="cd-sub">${esc(sub)}</span></a>`
  ).join("")}</nav>`;
}
function adminRow(control){return control?`<div class="row-end">${control}</div>`:""}
function eventList(allRows){const rows=visible("events",allRows);if(!rows.length)return `<div class="state"><span class="state-title">Nothing scheduled</span><span>No events on the calendar yet.</span></div>`;return rows.map(e=>`<article class="card event ${hiddenClass("events",e)}"><div class="event-when"><span class="event-date">${esc(fmtWhen(e.event_date, e.event_time))}</span><span class="badge open">${esc(relDate(e.event_date))}</span></div><h3 class="card-heading">${esc(e.title)}</h3>${e.description?`<div class="card-body">${esc(e.description)}</div>`:""}${editControls("events",e)}</article>`).join("")}
function pollList(allRows){const rows=visible("polls",allRows);if(!rows.length)return `<div class="state"><span class="state-title">No polls open</span><span>Nothing to vote on right now.</span></div>`;return rows.map(p=>`<a class="card linkcard ${hiddenClass("polls",p)}" href="#/polls"><h3 class="card-heading">${esc(p.question)}</h3><span class="card-cta">Cast your vote →</span></a>${editControls("polls",p,{compact:true})}`).join("")}
function setupNotice(){return `<header class="page-head"><h1>Almost there</h1></header><div class="card note"><h3 class="card-heading">Connect Supabase</h3><div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.\n\nThe README walks through both steps.</div></div>`}
