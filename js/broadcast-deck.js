/* =====================================================================
   broadcast-deck.js - what the DFL is about to put on the big screen
   ---------------------------------------------------------------------
   This module answers ONE question: given everything the app knows right
   now, what should the stage show, in what order?

   It renders nothing. It has no timers. It touches no DOM. That is the
   whole point of keeping it separate: the deck can be verified in a console
   against the live database without a pixel moving.

   IT HAS NO DOMAIN OPINIONS EITHER.

   Every fact here is asked of the module that owns it:

     is golf live?          golf-battle.js  outingState()
     what are the scores?   golf-battle.js  dayPoints() / battleResult()
     is fantasy current?    lore.js         fantasyState()
     who won a season?      lore.js         leagues + namer()
     what are the records?  lore.js         moments()
     what is somebody
       called?              lore.js         namer()

   If a generator below ever needs a number that is not already computed
   somewhere else, that is a signal the calculation belongs in the domain
   module and not in here. There is no second golf scorer and no second
   fantasy-results engine in this file, and there must never be.

   TEMPORAL HONESTY IS THE HOUSE RULE.

   Every item carries a `temporal` - live, upcoming, recent, final,
   historical or none - and it comes from a resolver, never from "this row
   has the newest timestamp so it must be current". A generator that cannot
   establish its own temporal state returns nothing at all. Nothing in here
   is allowed to imply that a completed season is happening now: the
   fantasy kicker always carries the year, and a week number is only ever
   printed beside the season it belongs to.
   ===================================================================== */

import { esc, fmtDate, relDate, money } from "./ui.js";
import { LEAGUE_FOUNDED } from "./config.js";
import { db } from "./supabase.js";
import { battleResult, dayPoints, outingState, marginLabel } from "./golf-battle.js";
import { namer, moments, titleGame, fantasyState, latestPlayedWeek } from "./lore.js";
import { dayMood } from "./marquee.js";

// --------------------------------------------------------------- priority

/*
  The ranking, and the numbers are a vocabulary rather than a calculation:
  a live event outranks a champion because the league cares more about what
  is happening than about what happened, not because 900 is bigger than 400.
*/
export const P = {
  FEATURED: 1000,
  LIVE:      900,
  RECENT:    700,
  MINE:      650,
  UPCOMING:  600,
  ACTIVITY:  500,   // open poll, fresh announcement
  CHAMPION:  400,   // always eligible - league identity, never drops out
  STAT:      300,
  HISTORY:   200,
  IDENTITY:  100,   // the floor. Always present, so a deck is never empty.
};

/** How long each treatment sits on screen. Tunable; not adaptive in v1. */
export const DWELL = {
  scoreboard: 8000,
  champion:   7000,
  announcement: 9000,
  event:      6000,
  stat:       5000,
  hero:       7000,
};

const DAY = 86400000;

/* Decay rather than a cliff: a nine-day-old announcement should still
   outrank the record book, just not by as much as it did on day one. */
const decay = (ageDays, windowDays) =>
  Math.max(0.4, 1 - Math.max(0, ageDays) / windowDays);

const daysBetween = (a, b) => (a - b) / DAY;

function item(o) {
  return {
    source: "auto",
    temporal: "none",
    dwell: DWELL[o.treatment] || 6000,
    kicker: "", headline: "", subtitle: "", body: "",
    image: null, href: null, sides: null, figure: null,
    ...o,
  };
}

// ------------------------------------------------------------- the context

/**
 * Everything the generators are allowed to read, gathered once.
 *
 * `home` is the shape pages/home.js already fetches, passed in rather than
 * re-queried - the stage lives on that page and there is no reason for the
 * same rows to cross the network twice.
 *
 * `lore` may be null. That is the two-phase load: the stage paints from
 * home's own data immediately, and history items join the deck when
 * loadLore() lands. Nothing waits.
 */
export function broadcastContext({ home, lore = null, golfDay = null, member = null, now = Date.now() }) {
  const leagues = lore?.leagues || home?.leagues || [];
  return {
    now,
    member,
    lore,
    name: lore ? namer(lore) : null,
    events: home?.events || [],
    announcements: home?.announcements || [],
    polls: home?.polls || [],
    members: home?.members || [],
    standings: home?.standings || [],
    dues: home?.dues || [],
    leagues,
    golfRow: home?.golfRow || null,
    golfDay,                                   // rounds+battles, or null
    fantasy: lore ? fantasyState(lore, now) : null,
    seasonNumber: new Date(now).getFullYear() - LEAGUE_FOUNDED + 1,
  };
}

/**
 * The golf day, in the shape dayPoints() and outingState() both expect.
 *
 * Same five reads pages/home.js golfHero() performs. When the stage
 * replaces that hero, home stops doing its own copy and this becomes the
 * only one - the duplication is deliberate and temporary so that step 2
 * changes nothing on screen.
 */
export async function loadGolfDay(outingId) {
  const [roundsRes, matchesRes, teamsRes] = await Promise.all([
    db().from("golf_rounds").select("id,round_number,name,format,holes,scoring")
        .eq("outing_id", outingId).order("round_number"),
    db().from("golf_matches").select("id,round_id").eq("outing_id", outingId),
    db().from("golf_teams").select("id,name,color,sort_order").eq("outing_id", outingId).order("sort_order"),
  ]);
  if (roundsRes.error || matchesRes.error || teamsRes.error) return null;

  const matchIds = (matchesRes.data || []).map((m) => m.id);
  let sides = [], scores = [];
  if (matchIds.length) {
    const s = await db().from("golf_match_sides").select("id,match_id,team_id,slot").in("match_id", matchIds);
    if (s.error) return null;
    sides = s.data || [];
    if (sides.length) {
      const sc = await db().from("golf_match_scores").select("side_id,hole,strokes")
                   .in("side_id", sides.map((x) => x.id));
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
    battles: (matchesRes.data || [])
      .filter((m) => String(m.round_id) === String(round.id))
      .map((m) => {
        const mine = sides.filter((s) => String(s.match_id) === String(m.id))
                          .sort((a, b) => a.slot - b.slot);
        return {
          sides: mine,
          result: mine.length === 2
            ? battleResult(byHole.get(String(mine[0].id)) || new Map(),
                           byHole.get(String(mine[1].id)) || new Map(),
                           Number(round.holes) || 9,
                           round.scoring === "match" ? "match" : "strokes")
            : null,
        };
      }),
  }));

  return { rounds, teams: teamsRes.data || [] };
}

// ---------------------------------------------------------- the generators
//
// Every one is (ctx) => item[]. An empty array is the correct answer far
// more often than not, and it is how sparse data degrades into a shorter
// deck rather than into a broken screen.

function golfItems(ctx) {
  const o = ctx.golfRow;
  if (!o) return [];
  const day = ctx.golfDay;
  const st = outingState(o, day?.rounds || []);
  const when = o.event_date ? fmtDate(o.event_date) : "";
  const sub = [o.course, when].filter(Boolean).join(" · ");
  const href = `#/golf?id=${o.id}`;

  /* Two teams and a points total is the only shape that can be a
     scoreboard. Anything else - four teams, none set up - is an event. */
  const teams = day?.teams?.length === 2 ? day.teams : null;
  if (teams && (st.state === "live" || st.state === "complete" || st.state === "final")) {
    const { total } = dayPoints(day.rounds);
    const values = teams.map((t) => total.get(String(t.id)) || 0);
    const leaderIdx = values[0] === values[1] ? -1 : (values[0] > values[1] ? 0 : 1);
    return [item({
      kind: "golf", treatment: "scoreboard",
      temporal: st.state === "live" ? "live" : st.state === "final" ? "final" : "recent",
      priority: st.state === "live" ? P.LIVE : P.RECENT,
      kicker: o.name, headline: "DFL Golf", subtitle: sub, href,
      sides: teams.map((t, i) => ({
        name: t.name || "Team", score: values[i], colour: t.color || "",
        up: leaderIdx === i, down: leaderIdx > -1 && leaderIdx !== i,
      })),
      /* The day's mood when the numbers have earned one, the count when they
         have not. dayMood() only speaks if a real gap justifies it. */
      /* moodText is the drama slot and dayMood() only speaks when a real gap
         justifies it; whereText is the fact underneath. */
      moodText: dayMood(values, st.decided, st.total),
      whereText: `${st.decided} of ${st.total} decided`,
    })];
  }

  // Not scoreable yet: it is a date on the calendar.
  return [item({
    kind: "golf", treatment: "event", temporal: "upcoming", priority: P.UPCOMING,
    kicker: "DFL Golf", headline: o.name, subtitle: sub, href,
    body: o.event_date ? relDate(o.event_date) : "",
  })];
}

function fantasyItems(ctx) {
  const f = ctx.fantasy;
  if (!f || f.state === "none" || !ctx.lore) return [];

  /* UPCOMING seasons get a season card and NEVER a week number - there is
     no week to have an opinion about before a draft. */
  if (f.state === "upcoming") {
    return [item({
      /* Weaker than a dated event on purpose: "we have not drafted" is a
         state of affairs, and a real date on the calendar beats it. */
      kind: "fantasy", treatment: "event", temporal: "upcoming", priority: P.UPCOMING - 120,
      kicker: "DFL Fantasy", headline: `${f.season} Season`,
      subtitle: f.status === "drafting" ? "Drafting now" : "Not drafted yet",
      href: "#/history",
    })];
  }

  /*
    The title game of the newest completed season. This is the honest
    "recent fantasy result": it names the season and the week, and it is
    labelled FINAL rather than dressed up as this week's game.
  */
  const t = titleGame(ctx.lore, f.season);
  if (t && ctx.name) {
    const champ = ctx.name(t.champUser, t.season, t.champRoster);
    const runner = ctx.name(t.runnerUser, t.season, t.runnerRoster);
    return [item({
      kind: "fantasy", treatment: "scoreboard",
      temporal: f.state === "live" ? "live" : "final",
      priority: f.state === "live" ? P.LIVE : P.RECENT * decay(
        daysBetween(ctx.now, Date.parse(ctx.lore.syncedAt || 0) || ctx.now), 120),
      kicker: `${t.season} · Week ${t.week}`,
      headline: "The final",
      moodText: "", whereText: `${champ.label} by ${t.margin.toFixed(2)}`,
      href: "#/history",
      sides: [
        { name: champ.label, score: t.champScore.toFixed(2), up: true },
        { name: runner.label, score: t.runnerScore.toFixed(2), down: true },
      ],
    })];
  }
  return [];
}

/* The viewer's own most recent matchup. Dated, always. */
function myMatchupItem(ctx) {
  if (!ctx.member || !ctx.lore || !ctx.name) return [];
  const me = ctx.members.find((m) => String(m.id) === String(ctx.member.id));
  const uid = me?.sleeper_user_id;
  if (!uid) return [];

  /* The newest season that has actually been PLAYED, not simply the newest
     season on record. 2026 exists and is pre-draft, so asking for "the
     latest season" gets a year with no games in it and this returns nothing
     - which is honest but useless. The last week somebody actually played is
     a real result worth showing, and the kicker carries its year so nobody
     mistakes it for this week. */
  const seasons = [...new Set(ctx.leagues.map((l) => Number(l.season) || 0))]
    .sort((a, b) => b - a);
  let season = 0, week = 0;
  for (const y of seasons) {
    const w = latestPlayedWeek(ctx.lore, y);
    if (w) { season = y; week = w; break; }
  }
  if (!season || !week) return [];

  const row = ctx.lore.matchups.find((m) =>
    Number(m.season) === season && Number(m.week) === week &&
    (String(m.user1) === String(uid) || String(m.user2) === String(uid)));
  if (!row) return [];

  const iAmOne = String(row.user1) === String(uid);
  const mine  = { u: iAmOne ? row.user1 : row.user2, r: iAmOne ? row.roster1 : row.roster2,
                  s: Number(iAmOne ? row.score1 : row.score2) || 0 };
  const theirs = { u: iAmOne ? row.user2 : row.user1, r: iAmOne ? row.roster2 : row.roster1,
                   s: Number(iAmOne ? row.score2 : row.score1) || 0 };

  /* Only the season fantasyState() is actually talking about can be live.
     A 2025 result is FINAL even while 2026 is in season. */
  const state = (ctx.fantasy?.state === "live" && ctx.fantasy.season === season) ? "live" : "final";
  return [item({
    kind: "mine", treatment: "scoreboard", temporal: state,
    priority: P.MINE,
    kicker: `${season} · Week ${week}`,
    headline: "Your matchup",
    moodText: "",
    whereText: mine.s === theirs.s ? "Tied"
      : `${mine.s > theirs.s ? "You" : ctx.name(theirs.u, season, theirs.r).label} by ${Math.abs(mine.s - theirs.s).toFixed(2)}`,
    href: "#/profile",
    sides: [
      { name: ctx.name(mine.u, season, mine.r).label, score: mine.s.toFixed(2), up: mine.s > theirs.s, down: mine.s < theirs.s },
      { name: ctx.name(theirs.u, season, theirs.r).label, score: theirs.s.toFixed(2), up: theirs.s > mine.s, down: theirs.s < mine.s },
    ],
  })];
}

function eventItems(ctx) {
  const out = [];
  const today = new Date(ctx.now).toISOString().slice(0, 10);
  for (const e of ctx.events) {
    if (!e.event_date) continue;
    const days = Math.round(daysBetween(Date.parse(e.event_date + "T12:00:00"), ctx.now));
    if (days < 0) continue;                       // eventList already shows past ones
    const isToday = e.event_date === today;
    out.push(item({
      kind: "event", treatment: "event",
      temporal: isToday ? "live" : "upcoming",
      priority: isToday ? P.LIVE : (days <= 7 ? P.UPCOMING + 50 : P.UPCOMING) * decay(0, 1),
      kicker: isToday ? "Today" : "Next up",
      headline: e.title, subtitle: fmtDate(e.event_date),
      body: e.description || relDate(e.event_date),
      href: "#/calendar",
    }));
  }
  return out.slice(0, 2);
}

function pollItem(ctx) {
  const p = (ctx.polls || [])[0];
  if (!p) return [];
  return [item({
    kind: "poll", treatment: "stat", temporal: "live", priority: P.ACTIVITY,
    kicker: "Open poll", figure: String(ctx.polls.length),
    headline: ctx.polls.length === 1 ? "Poll open" : "Polls open",
    subtitle: p.question, href: "#/polls",
  })];
}

function newsItem(ctx) {
  const a = (ctx.announcements || [])[0];
  if (!a) return [];
  const age = daysBetween(ctx.now, Date.parse(a.created_at) || ctx.now);
  if (age > 21) return [];
  return [item({
    kind: "news", treatment: "announcement", temporal: "recent",
    priority: P.ACTIVITY * decay(age, 21),
    kicker: "From the commissioner", headline: a.title || "Announcement",
    body: a.content || "", subtitle: fmtDate(a.created_at), href: "#/home",
  })];
}

/* The current champion. Always eligible - league identity does not expire
   because something else is happening today. */
function championItem(ctx) {
  if (!ctx.name) return [];
  const l = ctx.leagues.find((x) => x.champion_user_id || x.champion_roster_id);
  if (!l) return [];
  const who = ctx.name(l.champion_user_id, l.season, l.champion_roster_id);
  const orphan = !who.memberId && who.sub === "account deleted" && /^Roster \d+$/.test(who.label);
  return [item({
    kind: "champion", treatment: "champion", temporal: "final", priority: P.CHAMPION,
    kicker: `${l.season} DFL Champion`,
    headline: orphan ? `The ${l.season} champion` : who.label,
    subtitle: orphan ? `${who.label} — the Sleeper account was deleted` : (who.sub || ""),
    href: "#/history",
  })];
}

function pastChampionItems(ctx) {
  if (!ctx.name) return [];
  const withChamps = ctx.leagues.filter((l) => l.champion_user_id || l.champion_roster_id);
  return withChamps.slice(1, 4).map((l) => {
    const who = ctx.name(l.champion_user_id, l.season, l.champion_roster_id);
    return item({
      kind: "past", treatment: "champion", temporal: "historical", priority: P.HISTORY,
      kicker: `${l.season} Champion`, headline: who.label, subtitle: who.sub || "",
      href: "#/history",
    });
  });
}

function recordItems(ctx) {
  if (!ctx.lore) return [];
  const picks = moments(ctx.lore)
    .filter((m) => ["high", "blowout", "nailbiter", "streak", "heartbreak"].includes(m.kind))
    .slice(0, 3);
  return picks.map((m) => item({
    kind: "record", treatment: "stat", temporal: "historical", priority: P.HISTORY,
    kicker: m.kind === "high" ? "Highest week ever" : "From the record book",
    figure: m.figure != null ? String(m.figure).slice(0, 7) : null,
    headline: m.headline, subtitle: m.detail, href: "#/history",
  }));
}

function seasonStatItem(ctx) {
  return [item({
    kind: "season", treatment: "stat", temporal: "none", priority: P.STAT,
    figure: String(ctx.seasonNumber), headline: "Seasons",
    kicker: "DFL", subtitle: `${LEAGUE_FOUNDED} → ${new Date(ctx.now).getFullYear()}`,
    href: "#/history",
  })];
}

function duesItem(ctx) {
  const season = (ctx.dues || []).reduce((a, r) => Math.max(a, Number(r.season) || 0), 0);
  const owed = (ctx.dues || []).filter((r) => Number(r.season) === season)
    .reduce((t, r) => t + Math.max(0, (Number(r.amount_due) || 0) - (Number(r.amount_paid) || 0)), 0);
  if (!owed) return [];
  return [item({
    kind: "dues", treatment: "stat", temporal: "none", priority: P.STAT - 50,
    figure: money(owed), headline: "Owed", kicker: "League fees", href: "#/finances",
  })];
}

function loreItems(ctx) {
  const rows = (ctx.lore?.manual || []).filter((h) => /moment|award|record/i.test(h.category || ""));
  return rows.slice(0, 2).map((h) => item({
    kind: "lore", treatment: "announcement", temporal: "historical", priority: P.HISTORY,
    kicker: `${h.year} · ${h.category}`, headline: h.winner || h.category,
    body: h.notes || "", href: "#/history",
  }));
}

function arenaItem(ctx) {
  const results = ctx.lore?.arenaResults || [];
  const events = ctx.lore?.arenaEvents || [];
  const byMember = new Map((ctx.members || []).map((m) => [String(m.id), m]));
  for (const ev of events) {
    const w = results.find((r) => String(r.event_id) === String(ev.id) && r.place === 1);
    if (!w) continue;
    const m = byMember.get(String(w.member_id));
    return [item({
      kind: "arena", treatment: "champion", temporal: "historical", priority: P.HISTORY,
      kicker: "DFL Arena", headline: m?.display_name || "Somebody",
      subtitle: ev.name || "", href: `#/arena?id=${ev.id}`,
    })];
  }
  return [];
}

/* THE FLOOR. Returns an item unconditionally, which is what makes an empty
   deck impossible and the "sparse database" case a shorter show rather than
   a broken screen. */
function identityItem(ctx) {
  const n = ctx.seasonNumber;
  const decade = n > 1 && n % 10 === 0;
  return [item({
    kind: "identity", treatment: "hero", temporal: "none", priority: P.IDENTITY,
    kicker: decade ? `${n}th Anniversary Season` : "DFL HQ",
    headline: "Draft · Golf · Sin · Fold",
    subtitle: "Forged by sinners. Fueled by rivalries.",
    href: "#/history",
  })];
}

export const GENERATORS = [
  ["golf", golfItems],
  ["fantasy", fantasyItems],
  ["myMatchup", myMatchupItem],
  ["events", eventItems],
  ["poll", pollItem],
  ["news", newsItem],
  ["champion", championItem],
  ["pastChampions", pastChampionItems],
  ["records", recordItems],
  ["seasonStat", seasonStatItem],
  ["dues", duesItem],
  ["lore", loreItems],
  ["arena", arenaItem],
  ["identity", identityItem],
];

// ------------------------------------------------------------------- deck

/**
 * Rank everything and take the top slice.
 *
 * @param {object} ctx        from broadcastContext()
 * @param {object} [opts]
 * @param {Set}    [opts.off] generator ids the commissioner has switched off
 * @param {number} [opts.max] deck size
 */
export function buildDeck(ctx, { off = new Set(), max = 8, custom = [] } = {}) {
  const out = [];
  for (const [id, gen] of GENERATORS) {
    if (off.has(id)) continue;
    /* A generator that throws contributes nothing. One bad row must not
       blank the stage - the floor generator is the last line of defence and
       it cannot do its job if an earlier throw takes the whole build out. */
    try {
      for (const it of gen(ctx) || []) out.push({ ...it, generator: id });
    } catch (err) {
      console.warn(`broadcast: ${id} failed`, err);
    }
  }
  for (const c of custom) out.push(c);

  out.sort((a, b) => (b.priority || 0) - (a.priority || 0));

  const picked = diversify(out, max);

  /* THE FLOOR, enforced here rather than hoped for. The identity generator
     always produces an item, but ranking can slice it off when eight better
     things exist - which is correct. What must never happen is an EMPTY
     deck, so if nothing survived, identity is put back. */
  if (!picked.length) picked.push(...identityItem(ctx));

  /* A stable id so the rotation can remember what it has shown without
     holding a reference to the object. */
  return picked.map((it, i) => ({ ...it, id: it.id ?? `${it.generator || it.source}:${i}` }));
}

/*
  RANKED, BUT NOT THREE OF THE SAME THING IN A ROW.

  Straight priority order put three "upcoming event" cards back to back -
  the golf outing, the fantasy season and draft night - which reads as one
  long card rather than as three. So the pick is greedy: take the best
  remaining item whose treatment is not already the last two on the list,
  and fall back to the best remaining if that is the only option left.

  Priority still decides almost everything; this only breaks up runs.
*/
function diversify(ranked, max) {
  const pool = [...ranked];
  const out = [];
  while (pool.length && out.length < max) {
    const recent = out.slice(-2).map((x) => x.treatment);
    const sameRun = recent.length === 2 && recent[0] === recent[1];
    const i = sameRun ? pool.findIndex((x) => x.treatment !== recent[0]) : 0;
    out.push(pool.splice(i > -1 ? i : 0, 1)[0]);
  }
  return out;
}
