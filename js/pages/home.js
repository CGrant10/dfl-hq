// =====================================================================
// Home - the league's front page.
// ---------------------------------------------------------------------
// This was a crest, a nav strip and three lists of database rows. It now
// leads with whatever is actually happening, because that is the only
// question a front page has to answer:
//
//   THE HERO      context-aware. A golf event that is not final wins,
//                 because during golf week golf IS the league. Otherwise
//                 the member's own matchup, with the score big. Out of
//                 season and with nothing live, the crest and the record.
//   THE SNAPSHOT  four figures - your rank, the leader, what is owed,
//                 what is open - each a link to where it came from.
//   THE CREED     DRAFT * GOLF * SIN * FOLD, still the navigation.
//   NEWS          announcements as news cards rather than table rows.
//
// The hero is deliberately the only place on this page allowed a big
// number, and the crest has moved to an identity block at the bottom: the
// splash carries the brand on launch, so repeating it at full size above
// the fold made the page an About screen.
// =====================================================================
import { db, configured } from "../supabase.js";
import { esc, fmtDate, relDate, fmtShort, money, errorBox, toast } from "../ui.js";
import { APP_VERSION, LEAGUE_FOUNDED } from "../config.js";
import { checkForUpdate } from "../update.js";
import { promptInstall, isInstalled } from "../install.js";
import { currentMember } from "../members.js";
import { addControl, editControls, wireInline, canEdit, visible, hiddenClass } from "../inline.js";
import { loadSettings, saveSetting, KEY_LOGO } from "../settings.js";
import { battleResult, dayPoints } from "../golf-battle.js";

function installHelp(){const ua=navigator.userAgent;if(/iphone|ipad|ipod/i.test(ua))return "In Safari: Share, then Add to Home Screen";if(/android/i.test(ua))return "Chrome menu (⋮), then Install app";return "Chrome menu (⋮) → Cast, save and share → Install page as app"}

export async function render(view) {
  if (!configured) { view.innerHTML = setupNotice(); return; }
  const today = new Date().toISOString().slice(0, 10);
  const [events, announcements, polls, leagues, members, golf, dues, standings] = await Promise.all([
    db().from("events").select("*").gte("event_date", today).order("event_date", { ascending: true }).limit(3),
    db().from("announcements").select("*").order("created_at", { ascending: false }).limit(3),
    db().from("polls").select("*").eq("active", true).order("created_at", { ascending: false }).limit(3),
    db().from("sleeper_leagues").select("season, champion_user_id").order("season", { ascending: false }),
    db().from("members").select("id, display_name, team_name, sleeper_user_id"),
    db().from("golf_outings").select("id,name,course,event_date,status").neq("status", "final").order("event_date", { ascending: true }).limit(1),
    db().from("finance_payments").select("season,amount_due,amount_paid"),
    db().from("sleeper_standings").select("season,sleeper_user_id,wins,losses,ties,rank,points_for"),
  ]);
  const firstError = events.error || announcements.error || polls.error;
  if (firstError) { view.innerHTML = errorBox(firstError); return; }

  const settings = await loadSettings();
  const memberRows = members.data || [];
  const golfRow = (golf.data || [])[0] || null;
  const me = currentMember();
  const myMember = me ? memberRows.find((m) => String(m.id) === String(me.id)) : null;

  /* The hero's data is fetched AFTER the page's, and only the kind the hero
     is actually going to use - there is no sense reading a season of matchups
     during golf week, or a tournament in November. */
  const hero = await heroBlock({ golfRow, leagues: leagues.data || [], members: memberRows, myMember, events: events.data || [], settings });

  view.innerHTML = `<div id="home-wrap">
    ${anniversary()}
    ${hero}
    ${snapshot({ leagues: leagues.data || [], members: memberRows, myMember, standings: standings.data || [], dues: dues.data || [], polls: polls.data || [] })}
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
  wireCrest(view);
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
  DFL LANGUAGE.

  Only ever derived from a real number, never decoration - a beatdown has to
  actually be a beatdown. Kept out of finances and admin entirely.
*/
function golfMood(values, done, total) {
  const gap = Math.abs(values[0] - values[1]);
  if (!done) return "";
  if (done === total) return gap >= 4 ? "ABSOLUTE BEATDOWN" : gap === 0 ? "SPLIT DOWN THE MIDDLE" : "";
  if (gap >= 3) return "RUNNING AWAY WITH IT";
  if (gap === 0) return "DEAD EVEN";
  return "";
}
function matchupMood(a, b, played) {
  if (!played) return "";
  const gap = Math.abs(a - b);
  if (gap >= 40) return "ABSOLUTE BEATDOWN";
  if (gap <= 3) return "COMING DOWN TO THE WIRE";
  return "";
}

/*
  THE ANNIVERSARY BANNER.

  2026 is the tenth season, and a tenth season is the one thing on this page
  that outranks whatever is happening today - so it sits above the hero rather
  than in the sign-off at the foot, where it used to be a single grey line.

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

// ------------------------------------------------------------- the hero

async function heroBlock(ctx) {
  return (ctx.golfRow ? await golfHero(ctx.golfRow) : "")
      || (ctx.myMember?.sleeper_user_id ? await matchupHero(ctx) : "")
      || quietHero(ctx);
}

/*
  A live golf event. Same points as the tournament board, read from the same
  arithmetic in golf-battle.js so the front page can never disagree with the
  board it links to.
*/
async function golfHero(outing) {
  try {
    const [roundsRes, matchesRes, teamsRes] = await Promise.all([
      db().from("golf_rounds").select("id,round_number,name,format,holes,scoring").eq("outing_id", outing.id).order("round_number"),
      db().from("golf_matches").select("id,round_id").eq("outing_id", outing.id),
      db().from("golf_teams").select("id,name,color,sort_order").eq("outing_id", outing.id).order("sort_order"),
    ]);
    if (roundsRes.error || matchesRes.error || teamsRes.error) return "";
    const teams = teamsRes.data || [];
    const matchIds = (matchesRes.data || []).map((m) => m.id);
    let sides = [], scores = [];
    if (matchIds.length) {
      const sidesRes = await db().from("golf_match_sides").select("id,match_id,team_id,slot").in("match_id", matchIds);
      if (sidesRes.error) return "";
      sides = sidesRes.data || [];
      if (sides.length) {
        const sc = await db().from("golf_match_scores").select("side_id,hole,strokes").in("side_id", sides.map((s) => s.id));
        scores = sc.error ? [] : (sc.data || []);
      }
    }
    const byHole = new Map();
    for (const row of scores) {
      const k = String(row.side_id);
      if (!byHole.has(k)) byHole.set(k, new Map());
      byHole.get(k).set(Number(row.hole), Number(row.strokes));
    }
    const rounds = (roundsRes.data || []).map((round) => ({
      round,
      battles: (matchesRes.data || []).filter((m) => String(m.round_id) === String(round.id)).map((m) => {
        const mine = sides.filter((s) => String(s.match_id) === String(m.id)).sort((a, b) => a.slot - b.slot);
        return {
          sides: mine,
          result: mine.length === 2
            ? battleResult(byHole.get(String(mine[0].id)) || new Map(), byHole.get(String(mine[1].id)) || new Map(),
                Number(round.holes) || 9, round.scoring === "match" ? "match" : "strokes")
            : null,
        };
      }),
    }));
    const all = rounds.flatMap((r) => r.battles).filter((b) => b.sides.length === 2);
    const done = all.filter((b) => b.result?.complete).length;
    const live = done > 0 && done < all.length;
    if (teams.length !== 2) {
      return heroShell({ kicker: "DFL GOLF", live: false, title: outing.name,
        sub: [outing.course, outing.event_date ? fmtDate(outing.event_date) : ""].filter(Boolean).join(" · "),
        body: `<p class="fp-sub">Teams have not been set yet.</p>`, href: `#/golf?id=${outing.id}`, cta: "Set up the event" });
    }
    const { total } = dayPoints(rounds);
    const values = teams.map((t) => total.get(String(t.id)) || 0);
    const mood = golfMood(values, done, all.length);
    const state = !all.length ? "Not started yet"
      : done === all.length ? (mood || "Final")
      : values[0] === values[1] ? `All square · ${done} of ${all.length} decided`
      : `${mood ? mood + " · " : ""}${teams[values[0] > values[1] ? 0 : 1].name} lead · ${done} of ${all.length} decided`;
    return heroShell({
      kicker: "DFL GOLF", live, title: outing.name,
      sub: [outing.course, outing.event_date ? fmtDate(outing.event_date) : ""].filter(Boolean).join(" · "),
      body: scoreBand(teams.map((t, i) => ({
        name: t.name, value: values[i], colour: t.color,
        down: values[i] < values[1 - i],
      }))),
      state, href: `#/golf?id=${outing.id}`, cta: "Open the board",
    });
  } catch { return ""; }
}

/* The member's own matchup, latest week of the latest season that has one. */
async function matchupHero(ctx) {
  try {
    const season = ctx.leagues.reduce((a, l) => Math.max(a, Number(l.season) || 0), 0);
    if (!season) return "";
    const mine = ctx.myMember.sleeper_user_id;
    const res = await db().from("sleeper_matchups")
      .select("season,week,user1,score1,user2,score2,winner_roster_id,roster1,roster2")
      .eq("season", season).or(`user1.eq.${mine},user2.eq.${mine}`)
      .order("week", { ascending: false }).limit(1).maybeSingle();
    if (res.error || !res.data) return "";
    const m = res.data;
    const iAmOne = String(m.user1) === String(mine);
    const nameOf = (uid) => {
      const row = ctx.members.find((x) => String(x.sleeper_user_id) === String(uid));
      return row?.team_name || row?.display_name || "TBD";
    };
    const a = { name: nameOf(iAmOne ? m.user1 : m.user2), value: Number(iAmOne ? m.score1 : m.score2) || 0 };
    const b = { name: nameOf(iAmOne ? m.user2 : m.user1), value: Number(iAmOne ? m.score2 : m.score1) || 0 };
    const played = a.value > 0 || b.value > 0;
    a.down = a.value < b.value; b.down = b.value < a.value;
    return heroShell({
      kicker: `WEEK ${m.week}`, live: false, title: "Your matchup",
      sub: `${season} season`,
      body: scoreBand([a, b], 1),
      state: !played ? "Yet to play" : a.value === b.value ? "Tied"
        : `${matchupMood(a.value, b.value, played) ? matchupMood(a.value, b.value, played) + " · " : ""}${a.value > b.value ? a.name : b.name} by ${Math.abs(a.value - b.value).toFixed(1)}`,
      /* Not League history: a matchup CTA should land where that matchup
         lives on, which is the owner's own season page. */
      href: "#/profile", cta: "Your season",
    });
  } catch { return ""; }
}

/* Nothing live: the crest, the season number and who holds the title. */
function quietHero(ctx) {
  const number = new Date().getFullYear() - LEAGUE_FOUNDED + 1;
  const latest = ctx.leagues.find((l) => l.champion_user_id);
  const champ = latest ? ctx.members.find((m) => String(m.sleeper_user_id) === String(latest.champion_user_id)) : null;
  const next = (ctx.events || [])[0];
  return heroShell({
    kicker: `${ordinal(number)} SEASON`, live: false,
    title: champ ? `${champ.team_name || champ.display_name} hold the title` : "DFL HQ",
    sub: champ && latest ? `Champions, ${latest.season}` : "Forged by sinners. Fueled by rivalries.",
    body: next ? `<div class="fp-state"><span>Next up</span><span class="badge closed">${esc(next.title)} · ${esc(relDate(next.event_date))}</span></div>` : "",
    href: "#/history", cta: "The record book",
  });
}

function heroShell({ kicker, live, title, sub, body, state, href, cta }) {
  return `<section class="fp-hero">
    <div class="fp-kicker">${live ? `<span class="badge live">Live</span>` : ""}<span>${esc(kicker)}</span></div>
    <h1 class="fp-title">${esc(title)}</h1>
    ${sub ? `<p class="fp-sub">${esc(sub)}</p>` : ""}
    ${body || ""}
    ${state ? `<div class="fp-state">${esc(state)}</div>` : ""}
    <a class="fp-cta" href="${href}">${esc(cta)} <span aria-hidden="true">→</span></a>
  </section>`;
}

/* Two sides, the figures big, the trailing side dimmed rather than crossed
   out - the winner should be obvious without the loser being decorated. */
function scoreBand(sides, decimals = 0) {
  return `<div class="fp-score">
    ${sides.map((s, i) => `<div class="fp-side ${s.down ? "is-down" : ""}" style="--racer:${esc(s.colour || "")}">
      <b>${decimals ? Number(s.value).toFixed(decimals) : s.value}</b>
      <span>${esc(s.name)}</span></div>`)
      .join(`<div class="fp-vs">vs</div>`)}
  </div>`;
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
    { label: "Outstanding", value: owed ? money(owed) : "Settled", href: "#/finances" },
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
function eventList(allRows){const rows=visible("events",allRows);if(!rows.length)return `<div class="state"><span class="state-title">Nothing scheduled</span><span>No events on the calendar yet.</span></div>`;return rows.map(e=>`<article class="card event ${hiddenClass("events",e)}"><div class="event-when"><span class="event-date">${esc(fmtDate(e.event_date))}</span><span class="badge open">${esc(relDate(e.event_date))}</span></div><h3 class="card-heading">${esc(e.title)}</h3>${e.description?`<div class="card-body">${esc(e.description)}</div>`:""}${editControls("events",e)}</article>`).join("")}
function pollList(allRows){const rows=visible("polls",allRows);if(!rows.length)return `<div class="state"><span class="state-title">No polls open</span><span>Nothing to vote on right now.</span></div>`;return rows.map(p=>`<a class="card linkcard ${hiddenClass("polls",p)}" href="#/polls"><h3 class="card-heading">${esc(p.question)}</h3><span class="card-cta">Cast your vote →</span></a>${editControls("polls",p,{compact:true})}`).join("")}
function setupNotice(){return `<header class="page-head"><h1>Almost there</h1></header><div class="card note"><h3 class="card-heading">Connect Supabase</h3><div class="card-body">Open <strong>js/config.js</strong> and paste in your Supabase project URL and anon key, then run <strong>schema.sql</strong> in the Supabase SQL editor.\n\nThe README walks through both steps.</div></div>`}
