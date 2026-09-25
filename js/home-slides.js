/*
  home-slides.js - the two Home stories that became stage slides.

  Home used to carry a second rotating surface above the broadcast stage: a
  tabbed dashboard with My Week, Power Ranks, Next Move and Report. Two of
  those four drew the same views as the POWER RANKINGS and WEEKLY REPORT
  sections a scroll below them, so the dashboard was retired and the stage
  took its place. The trade alert and the auto-scout had nowhere else to go,
  so they are expressed here as deck items instead of bespoke panels - which
  means they inherit the stage's entrance, dwell clock, arrows, dots and
  swipe handling rather than carrying a second rotation system.

  This is a separate module from pages/home.js so the mapping can be tested
  without standing up Supabase: nothing in here reads the network.
*/
import { P } from "./broadcast-order.js";

/*
  THE TRADE ALERT AND THE NEXT MOVE, AS STAGE SLIDES.

  These two used to be panels in the tabbed dashboard, built as their own
  bespoke markup. The dashboard is retired, so they are expressed the way
  everything else on the stage is expressed: as deck items. That means they
  inherit the entrance animation, the dwell clock, the arrows, the dots and
  the swipe handling for free, instead of carrying a second rotation system.

  They are `pinned` because they do not come from a generator - they are
  built here from data that only lands after the first paint - and
  editorialStage() would otherwise have no rule that keeps them.
*/
function signed(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : number < 0 ? "−" : ""}${Math.abs(number).toFixed(1)}`;
}

export function tradeAlertSlide(alert) {
  if (!alert) return null;
  const call = alert.headline || (alert.balanced ? "BALANCED" : alert.winner ? `${alert.winner} WINS` : "REVIEW NEEDED");
  const reason = alert.reason?.title || alert.limitations?.[0] || "The completed trade is ready for league review.";
  const delta = (alert.lineupDeltas || [])[0];
  return {
    source: "auto", pinned: true, id: "trade-alert", generator: "tradeAlert",
    kind: "trade", treatment: "stat", temporal: "recent",
    priority: P.RECENT + 40, dwell: 8000,
    kicker: `BREAKING TRADE · ${alert.week ? `WEEK ${alert.week}` : "COMPLETED"}`,
    figure: alert.fairness == null ? null : `${alert.fairness}%`,
    headline: call,
    subtitle: delta ? `${reason} ${delta.teamName} ${signed(delta.weekly)}/wk.` : reason,
    href: alert.href || "#/trade",
  };
}

export function nextMoveSlide(move) {
  if (!move) return null;
  const target = move.trade?.player?.name || move.waiver?.player?.name;
  if (!target) return null;
  const lane = move.trade
    ? `Ask ${move.trade.team?.name || "a rival"} about ${move.trade.player.name}.`
    : `${move.waiver.player.name} is unrostered.`;
  return {
    source: "auto", pinned: true, id: "next-move", generator: "nextMove",
    kind: "move", treatment: "announcement", temporal: "upcoming",
    priority: P.MINE - 10, dwell: 8000,
    kicker: `WEEK ${move.week} · AUTO-SCOUT`,
    headline: "Your next move",
    subtitle: move.need.urgent ? `${move.need.position} need` : `${move.need.position} upgrade`,
    body: lane,
    href: move.mine?.sleeper_user_id
      ? `#/analyzer?owner=${encodeURIComponent(move.mine.sleeper_user_id)}` : "#/analyzer",
  };
}

/*
  WHICH WEEK THE MATCHUP SLIDE IS ABOUT.

  Sleeper rolls its own state into the new week as soon as Monday Night
  Football ends, so state.week is already "next week" while the league is
  still reading the completed box scores. home-clubhouse's aftermathReportWeek()
  keeps the REPORT on the last final week until another week replaces it.

  The matchup turns over immediately with Sleeper on Tuesday. The completed
  report remains on the prior completed week, so Home can show both the
  receipts and the next opponent instead of spending every surface looking back in
  every surface.
*/
export function currentMatchupWeek(week) {
  return Math.max(1, Number(week) || 1);
}

/*
  THE WEEK AHEAD, BEFORE ANYBODY HAS SCORED.

  The myMatchup generator reads sleeper_matchups, and sync.js refuses to write
  a week until somebody has points in it ("not played yet"), so between
  Thursday and the first whistle there is no row for the game about to be
  played - which is exactly when the reader most wants to see it. The pairing
  therefore comes straight from Sleeper and the numbers from the weekly
  projection bundle Home already loads for the auto-scout.

  Scores here are PROJECTIONS, and the slide says so rather than dressing
  them up as a result: the kicker reads PREVIEW and the margin line is
  phrased as an expectation.
*/
export function matchupPreviewSlide({ pairing, weekly, meSleeperId, season, week, matchups = [] } = {}) {
  if (!pairing?.mine || !pairing?.theirs || !meSleeperId) return null;
  const projectionOf = id => {
    const team = (weekly?.teams || []).find(row => String(row.sleeper_user_id) === String(id));
    return Number.isFinite(Number(team?.projection)) ? Number(team.projection) : null;
  };
  const mine = projectionOf(pairing.mine.sleeper_user_id);
  const theirs = projectionOf(pairing.theirs.sleeper_user_id);
  if (mine == null || theirs == null) return null;
  const spread = Math.abs(mine - theirs);
  const favoured = mine === theirs ? null : (mine > theirs ? pairing.mine : pairing.theirs);
  return {
    source: "auto", pinned: true, id: "matchup-preview", generator: "matchupPreview",
    kind: "mine", treatment: "scoreboard", temporal: "upcoming",
    priority: P.MINE + 20, dwell: 8000,
    kicker: `${season} · Week ${week} · Preview`,
    headline: "Your matchup",
    /* The story goes in the mood slot and the arithmetic in the where slot -
       the stage gives a scoreboard exactly those two lines, and the history
       is the reason to care about the fixture. */
    moodText: matchupStory({
      h2h: headToHead({ matchups, meSleeperId, oppSleeperId: pairing.theirs.sleeper_user_id }),
      theirsName: pairing.theirs.name,
    }),
    whereText: favoured
      ? `${favoured === pairing.mine ? "You" : favoured.name} projected by ${spread.toFixed(2)}`
      : "Projected dead even",
    href: "#/analyzer",
    sides: [
      { name: pairing.mine.name, score: mine.toFixed(2), up: mine > theirs, down: mine < theirs },
      { name: pairing.theirs.name, score: theirs.toFixed(2), up: theirs > mine, down: theirs < mine },
    ],
  };
}

/*
  THE ALL-TIME LEDGER BETWEEN TWO TEAMS.

  sleeper_matchups is the only record of who has beaten whom, and it stores a
  row per fixture per week, so the head-to-head is a filter rather than a
  stored total. Rows with no score on either side are skipped: a fixture that
  exists but has not been played is not a result, and counting it would give
  everybody a phantom tie.

  Chronological order matters for the streak, and season/week is the only
  ordering available - sleeper_matchups has no timestamp.
*/
export function headToHead({ matchups = [], meSleeperId, oppSleeperId } = {}) {
  if (!meSleeperId || !oppSleeperId) return null;
  const games = [];
  for (const row of matchups) {
    const left = String(row.user1) === String(meSleeperId) && String(row.user2) === String(oppSleeperId);
    const right = String(row.user2) === String(meSleeperId) && String(row.user1) === String(oppSleeperId);
    if (!left && !right) continue;
    const mine = Number(left ? row.score1 : row.score2) || 0;
    const theirs = Number(left ? row.score2 : row.score1) || 0;
    if (!mine && !theirs) continue;
    games.push({ season: Number(row.season) || 0, week: Number(row.week) || 0, mine, theirs });
  }
  if (!games.length) return { meetings: 0, wins: 0, losses: 0, ties: 0, streak: null };
  games.sort((a, b) => a.season - b.season || a.week - b.week);
  let wins = 0, losses = 0, ties = 0;
  for (const g of games) {
    if (g.mine > g.theirs) wins++; else if (g.mine < g.theirs) losses++; else ties++;
  }
  /* Walk back from the most recent result while the winner stays the same. A
     tie ends a streak rather than extending it - nobody is "on a run" of
     draws. */
  const last = games.at(-1);
  let streak = null;
  if (last.mine !== last.theirs) {
    const holder = last.mine > last.theirs ? "me" : "them";
    let count = 0;
    for (let i = games.length - 1; i >= 0; i--) {
      const g = games[i];
      if (g.mine === g.theirs) break;
      if ((g.mine > g.theirs ? "me" : "them") !== holder) break;
      count++;
    }
    streak = { holder, count };
  }
  return { meetings: games.length, wins, losses, ties, streak, last };
}

/*
  ONE LINE OF HISTORY FOR THE PREVIEW.

  The stage gives a scoreboard two slots under the scores: the mood line and
  the "where" line. The projection margin already owns the second, so this is
  what goes in the first - the reason to care about the fixture rather than
  the arithmetic of it.

  A streak is the better story when there is one, because it is about the
  fixture's direction; the series total is the fallback, and a first meeting
  says so plainly rather than printing 0-0.
*/
export function matchupStory({ h2h, theirsName = "They" } = {}) {
  if (!h2h || !h2h.meetings) return "First time you have met.";
  const { wins, losses, ties, streak } = h2h;
  const series = ties
    ? `${wins}-${losses}-${ties}`
    : `${wins}-${losses}`;
  if (streak && streak.count >= 2) {
    return streak.holder === "me"
      ? `You have taken the last ${streak.count}. Series ${series}.`
      : `${theirsName} has taken the last ${streak.count}. Series ${series}.`;
  }
  if (wins > losses) return `You lead the series ${series}.`;
  if (losses > wins) return `${theirsName} leads the series ${losses}-${wins}${ties ? `-${ties}` : ""}.`;
  return `All square at ${series}.`;
}

/*
  EVERY FIXTURE IN THE WEEK, NOT JUST YOURS.

  The preview above answers "who am I playing"; this answers "what is
  everybody else doing", which is the other half of a Thursday. Same data,
  same projections - the difference is only that this one does not filter to
  the reader.

  League order is kept as Sleeper returns it and the reader's own game is
  flagged rather than promoted, so the card reads the same shape every week.
*/
export function weekSlateSlide({ fixtures = [], season, week, meSleeperId, live = false } = {}) {
  /*
    LIVE PER FIXTURE, NOT PER CARD.

    On the Friday of a week exactly one game has been played, so a card that
    switched wholesale to live scores showed one real result and five rows of
    0.0 - less use than the projections it replaced. A fixture shows its
    actual scores once THAT fixture has started and its projection until
    then, which is the only reading where every row on the card is worth
    something.
  */
  const started = fixture => (Number(fixture.a?.actual) || 0) !== 0
    || (Number(fixture.b?.actual) || 0) !== 0;
  const rows = fixtures.map(fixture => {
    const a = fixture.a, b = fixture.b;
    if (!a || !b) return null;
    const useActual = live && started(fixture);
    if (!useActual && (a.projection == null || b.projection == null)) return null;
    const av = useActual ? Number(a.actual) || 0 : a.projection;
    const bv = useActual ? Number(b.actual) || 0 : b.projection;
    if (av == null || bv == null) return null;
    return {
      mine: String(a.sleeper_user_id) === String(meSleeperId)
        || String(b.sleeper_user_id) === String(meSleeperId),
      a: { name: a.name, score: av.toFixed(1), up: av > bv },
      b: { name: b.name, score: bv.toFixed(1), up: bv > av },
    };
  }).filter(Boolean);
  /* One fixture is the reader's own game with extra steps - the preview slide
     already says it better. Two is the smallest number that reads as a slate. */
  if (rows.length < 2) return null;
  return {
    source: "auto", pinned: true, id: "week-slate", generator: "weekSlate",
    kind: "league", treatment: "slate", temporal: "upcoming",
    priority: P.MINE + 10, dwell: 9000,
    kicker: `${season} · Week ${week}`,
    headline: "Around the league",
    subtitle: live ? "Live" : "Projected",
    href: "#/analyzer",
    fixtures: rows,
  };
}
