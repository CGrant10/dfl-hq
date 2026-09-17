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
  const call = alert.balanced ? "BALANCED" : alert.winner ? `${alert.winner} WINS` : "REVIEW NEEDED";
  const reason = alert.reason?.title || alert.limitations?.[0] || "The completed trade is ready for league review.";
  const delta = (alert.lineupDeltas || [])[0];
  return {
    source: "auto", pinned: true, id: "trade-alert", generator: "tradeAlert",
    kind: "trade", treatment: "stat", temporal: "recent",
    priority: P.RECENT + 40, dwell: 8000,
    kicker: `DFL TRADE ALERT · ${alert.week ? `WEEK ${alert.week}` : "COMPLETED"}`,
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
  still reading Tuesday's box scores. home-clubhouse's aftermathReportWeek()
  holds the REPORT back for that reason, but only on Tuesday.

  The matchup wants a slightly longer tail: Tuesday and Wednesday still
  belong to the week just played - that is when people argue about it - and
  from Thursday, when the first game kicks off, the slide should be about the
  week ahead instead of the week behind.
*/
export function currentMatchupWeek(week, now = new Date()) {
  const current = Math.max(1, Number(week) || 1);
  const day = now instanceof Date ? now.getDay() : -1;
  return (day === 2 || day === 3) ? Math.max(1, current - 1) : current;
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
export function matchupPreviewSlide({ pairing, weekly, meSleeperId, season, week } = {}) {
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
    moodText: "",
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
