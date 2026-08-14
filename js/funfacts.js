/* =====================================================================
   funfacts.js - "Did you know?"
   ---------------------------------------------------------------------
   Real facts about the DFL, derived from the matchup rows the app has
   already loaded. Nothing here is written by hand and nothing is made up.

   IT COMPUTES NOTHING ITSELF. Every figure comes from lore.js - best(),
   margin(), toSides(), streaks(), headToHead(), the standings. That is
   the same house rule the broadcast deck follows: there is one fantasy
   stats engine in this app and this is not it. If a fact below needs a
   number lore.js cannot produce, the number belongs in lore.js.

   ONE FACT A DAY, AND THE SAME ONE FOR EVERYBODY.

   The fact is chosen by the DATE, not at random:

     index = days since the epoch, modulo the number of facts

   which means every member opening the app on the same day sees the same
   fact, it changes at local midnight, and a shared fact still matches
   what the group sees when they open the app. Math.random() would give
   all three of those away for nothing.

   EVERY FACT CARRIES ITS SEASON. A record with no year attached reads as
   something that happened recently, and most of these did not.
   ===================================================================== */

import {
  namer, toSides, played, margin, best, winnerSide, loserSide, streaks, titleGame, spanLabel,
} from "./lore.js";

const DAY = 86400000;

/** "A and B", "A, B and C" - a list a person would read out loud. */
function listOf(names) {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Facts are cheap to build but not free; one build per lore load. */
let cached = null;
let cachedFor = null;

/**
 * Every fact the current data supports.
 *
 * A fact that cannot be established returns nothing rather than a
 * guess, so a sparse league gets a short list instead of a wrong one.
 *
 * @returns {Array<{id,headline,detail,season,figure,kind}>}
 */
export function funFacts(lore) {
  if (!lore || !lore.matchups?.length) return [];
  if (cached && cachedFor === lore) return cached;

  const name = namer(lore);
  const who = (u, s, r) => name(u, s, r).label;
  const games = lore.matchups.filter(played);
  const out = [];
  const add = (id, kind, headline, detail, season, figure) => {
    if (!headline || !detail) return;
    out.push({ id, kind, headline, detail, season, figure });
  };

  // ---- the closest game ever ------------------------------------------
  const decided = games.filter((m) => margin(m) > 0);
  const closest = best(decided, (m) => -margin(m));
  if (closest) {
    const w = winnerSide(closest), l = loserSide(closest);
    add("closest", "nailbiter",
      `The closest game in DFL history was decided by ${margin(closest).toFixed(2)} points.`,
      `${who(w.user, closest.season, w.roster)} ${w.score.toFixed(2)} – ${l.score.toFixed(2)} ${who(l.user, closest.season, l.roster)}, ${closest.season} Week ${closest.week}.`,
      closest.season, margin(closest).toFixed(2));
  }

  // ---- the biggest beating --------------------------------------------
  const blow = best(decided, margin);
  if (blow) {
    const w = winnerSide(blow), l = loserSide(blow);
    add("blowout", "blowout",
      `The biggest blowout in league history was ${margin(blow).toFixed(2)} points.`,
      `${who(w.user, blow.season, w.roster)} put ${w.score.toFixed(2)} on ${who(l.user, blow.season, l.roster)} in ${blow.season} Week ${blow.week}.`,
      blow.season, margin(blow).toFixed(2));
  }

  // ---- the best and worst weeks anybody has had ------------------------
  const sides = toSides(games).filter((s) => s.score > 0);
  const high = best(sides, (s) => s.score);
  if (high) {
    add("high", "high",
      `The highest score ever put up in the DFL is ${high.score.toFixed(2)}.`,
      `${who(high.user, high.season, high.roster)} did it in ${high.season} Week ${high.week}.`,
      high.season, high.score.toFixed(2));
  }
  const low = best(sides, (s) => -s.score);
  if (low) {
    add("low", "low",
      `The lowest score anybody has survived a week with is ${low.score.toFixed(2)}.`,
      `${who(low.user, low.season, low.roster)}, ${low.season} Week ${low.week}. It happens to everybody.`,
      low.season, low.score.toFixed(2));
  }

  // ---- streaks ---------------------------------------------------------
  const runs = streaks(sides);
  /* streaks() calls the length `run`, and `from`/`to` are the side rows
     themselves rather than labels - spanLabel() is the function that turns
     that pair into "2021 · Wk 3-9". Both were guessed wrong the first time
     and produced "undefined games". */
  const bestWin = best(runs.filter((r) => r.win), (r) => r.win.run);
  if (bestWin?.win) {
    const span = spanLabel(bestWin.win.from, bestWin.win.to);
    add("streak", "streak",
      `The longest winning streak in DFL history is ${bestWin.win.run} games.`,
      `${who(bestWin.user)} ran it off${span ? `, ${span}` : ""}.`,
      bestWin.win.from?.season ?? null, bestWin.win.run);
  }
  const worstLoss = best(runs.filter((r) => r.loss), (r) => r.loss.run);
  if (worstLoss?.loss) {
    const span = spanLabel(worstLoss.loss.from, worstLoss.loss.to);
    add("skid", "streak",
      `The longest losing streak anybody has sat through is ${worstLoss.loss.run} games.`,
      `${who(worstLoss.user)}${span ? `, ${span}` : ""}. Character building.`,
      worstLoss.loss.from?.season ?? null, worstLoss.loss.run);
  }

  // ---- the league as a whole -------------------------------------------
  const seasons = [...new Set(games.map((m) => Number(m.season)))].sort();
  if (seasons.length > 1) {
    const points = sides.reduce((a, s) => a + s.score, 0);
    add("total", "volume",
      `The DFL has scored ${Math.round(points).toLocaleString()} fantasy points.`,
      `Across ${games.length.toLocaleString()} games and ${seasons.length} seasons, ${seasons[0]} to ${seasons[seasons.length - 1]}.`,
      null, Math.round(points));

    const avg = points / sides.length;
    add("average", "volume",
      `The average DFL score is ${avg.toFixed(2)} points.`,
      `Anything over that has beaten the league's own history. Most weeks it will not be enough.`,
      null, avg.toFixed(2));
  }

  // ---- the finals ------------------------------------------------------
  const finals = [];
  for (const l of lore.leagues) {
    const t = titleGame(lore, l.season);
    if (t) finals.push(t);
  }
  const tightest = best(finals, (t) => -t.margin);
  if (tightest) {
    add("final", "title",
      `The closest DFL final was decided by ${tightest.margin.toFixed(2)} points.`,
      `${who(tightest.champUser, tightest.season, tightest.champRoster)} beat ${who(tightest.runnerUser, tightest.season, tightest.runnerRoster)} ${tightest.champScore.toFixed(2)} – ${tightest.runnerScore.toFixed(2)} in the ${tightest.season} final.`,
      tightest.season, tightest.margin.toFixed(2));
  }

  // ---- repeat champions -------------------------------------------------
  const titles = new Map();
  for (const l of lore.leagues) {
    if (!l.champion_user_id) continue;
    titles.set(l.champion_user_id, (titles.get(l.champion_user_id) || 0) + 1);
  }
  /*
    TIES ARE THE NORMAL CASE IN A SMALL LEAGUE, and the first cut of this
    ignored them: it sorted, took the top row and said "more than anybody
    else in the league's history". Klutch Sports Group and DaGrapeApes
    both have two, so that fact was simply false - and a fun fact that is
    wrong about who is winning is worse than no fun fact.

    So the count is what gets ranked, and EVERYBODY holding it is named.
  */
  const topCount = Math.max(0, ...titles.values());
  if (topCount > 1) {
    const holders = [...titles.entries()].filter(([, n]) => n === topCount).map(([u]) => who(u));
    add("dynasty", "title",
      holders.length === 1
        ? `${holders[0]} has won the DFL ${topCount} times.`
        : `${listOf(holders)} have each won the DFL ${topCount} times.`,
      holders.length === 1
        ? `More than anybody else in the league's history.`
        : `They are tied at the top — nobody in the DFL has more.`,
      null, topCount);
  }

  cached = out;
  cachedFor = lore;
  return out;
}

/**
 * Today's fact.
 *
 * Deterministic from the date, so every member sees the same one and a
 * shared fact matches what the group finds when they open the app. The
 * date is the LOCAL one - the fact turns over at midnight where you are,
 * which is what "today's fact" means to a person.
 */
export function factOfTheDay(lore, when = new Date()) {
  const all = funFacts(lore);
  if (!all.length) return null;
  const local = new Date(when.getFullYear(), when.getMonth(), when.getDate());
  const dayIndex = Math.floor(local.getTime() / DAY);
  return all[((dayIndex % all.length) + all.length) % all.length];
}

/** The sentence that gets shared. Kept here so the page and the stage agree. */
export function factLine(fact) {
  if (!fact) return "";
  return `DFL HQ — Did you know?\n\n${fact.headline}\n${fact.detail}`;
}
