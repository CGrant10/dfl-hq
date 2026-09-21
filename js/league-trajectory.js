// =====================================================================
// league-trajectory.js - weekly power rankings for Home's Power Pulse
// ---------------------------------------------------------------------
// The first version drew twelve lines across fourteen weeks. Accurate, but
// it made the reader decode a transit map to answer a simple question:
// where is everybody now, and who moved? This keeps the same honest inputs
// and turns each completed week into a compact ranking board instead.
// =====================================================================

import { esc } from "./ui.js";

const DEFAULT_WEEKS = 14;
const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const key = value => value == null ? "" : String(value);
const label = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;

function teamForSide(row, side, byUser, byRoster) {
  return byUser.get(key(row?.[`user${side}`])) || byRoster.get(key(row?.[`roster${side}`])) || null;
}

function ranked(teams, valueOf) {
  return [...teams].sort((a, b) => valueOf(b) - valueOf(a) || num(a.rank) - num(b.rank));
}

function boardRows(ordered, previous, state, weeklyScores) {
  return ordered.map((team, index) => {
    const id = key(team.id), rank = index + 1;
    const record = state.get(id) || { wins: 0, losses: 0, ties: 0, points: 0, games: 0 };
    const oldRank = previous.get(id) || rank;
    return {
      id,
      name: label(team),
      rank,
      previousRank: oldRank,
      movement: oldRank - rank,
      record: `${record.wins}-${record.losses}${record.ties ? `-${record.ties}` : ""}`,
      weeklyScore: weeklyScores.get(id) ?? null,
      pointsPerGame: record.games ? record.points / record.games : null,
    };
  });
}

/**
 * Produce one power-ranking board for the current roster model and each
 * completed week. The baseline deliberately is not called "preseason": the
 * analyzer sees today's rosters, so trades can change it during the year.
 *
 * Once games begin, weekly power rank uses completed results only: cumulative
 * points scored (70%) and win percentage (30%). The live week is deliberately
 * absent until Sleeper advances on Tuesday.
 */
export function buildLeaguePowerRankings({ teams = [], matchups = [], currentWeek = null, weeks = DEFAULT_WEEKS } = {}) {
  const live = teams.filter(team => team?.id != null && Number.isFinite(Number(team?.lineup?.weeklyPoints)));
  if (live.length < 2) return null;

  const byUser = new Map(live.filter(team => team.sleeper_user_id != null).map(team => [key(team.sleeper_user_id), team]));
  const byRoster = new Map(live.filter(team => team.roster_id != null).map(team => [key(team.roster_id), team]));
  const state = new Map(live.map(team => [key(team.id), { wins: 0, losses: 0, ties: 0, points: 0, games: 0 }]));
  const initial = [...live].sort((a, b) => num(a.rank) - num(b.rank));
  let previous = new Map(initial.map((team, index) => [key(team.id), index + 1]));
  const boards = [{
    week: 0,
    label: "Roster model",
    comparison: "current roster baseline",
    rows: boardRows(initial, previous, state, new Map()),
  }];

  const rows = matchups.filter(row => row?.score1 != null && row?.score2 != null
    && Number(row?.week) > 0 && Number(row?.week) <= weeks
    && Number.isFinite(Number(row.score1)) && Number.isFinite(Number(row.score2)));

  /*
    A WEEK IN PROGRESS IS NOT A WEEK PLAYED.

    sync.js writes a week as soon as ANYBODY has points in it, so from the
    first Thursday-night kickoff the current week is in the table with five
    of its six fixtures sitting at something-to-zero. Counting that as a
    played week gave every team a second W or L off a game that had not
    happened: the board read 2-0 on the Friday of week 2.

    A week counts once every fixture in it has a score on BOTH sides. That
    needs no clock and no league calendar - the rows say it themselves - and
    it settles the moment the last game ends.

    The one thing it cannot tell apart is a real 0.00, which would hold a
    finished week out of the board. A fantasy lineup scoring exactly zero
    across every starter does not happen; a forfeit recorded as 0-0 would,
    and would need its own handling if the league ever books one.
  */
  const weekRows = new Map();
  for (const row of rows) {
    const week = Number(row.week);
    if (!weekRows.has(week)) weekRows.set(week, []);
    weekRows.get(week).push(row);
  }
  const playedWeeks = [...weekRows.entries()]
    /* Scores can be non-zero on every side by Sunday night even though
       Monday players remain. Sleeper advancing to the next week is the
       authoritative boundary: the live week can never create a W/L. */
    .filter(([week, group]) => weekIsFinal(group)
      && (!Number.isFinite(Number(currentWeek)) || Number(currentWeek) < 1 || week < Number(currentWeek)))
    .map(([week]) => week)
    .sort((a, b) => a - b);
  let previousWeek = 0;
  for (const week of playedWeeks) {
    const weeklyScores = new Map();
    for (const row of rows.filter(item => Number(item.week) === week)) {
      const a = teamForSide(row, 1, byUser, byRoster), b = teamForSide(row, 2, byUser, byRoster);
      if (!a || !b || key(a.id) === key(b.id)) continue;
      const sa = num(row.score1), sb = num(row.score2);
      const aa = state.get(key(a.id)), bb = state.get(key(b.id));
      weeklyScores.set(key(a.id), sa); weeklyScores.set(key(b.id), sb);
      aa.points += sa; aa.games += 1;
      bb.points += sb; bb.games += 1;
      if (sa > sb) { aa.wins += 1; bb.losses += 1; }
      else if (sb > sa) { bb.wins += 1; aa.losses += 1; }
      else { aa.ties += 1; bb.ties += 1; }
    }

    const totals = live.map(team => state.get(key(team.id)).points);
    const low = Math.min(...totals), high = Math.max(...totals);
    const power = team => {
      const record = state.get(key(team.id));
      const scoring = high === low ? .5 : (record.points - low) / (high - low);
      const result = record.games ? (record.wins + record.ties * .5) / record.games : .5;
      return scoring * .7 + result * .3;
    };
    const order = ranked(live, power);
    const currentRows = boardRows(order, previous, state, weeklyScores);
    boards.push({
      week,
      label: `Week ${week}`,
      comparison: previousWeek ? `vs Week ${previousWeek}` : "vs roster model",
      rows: currentRows,
    });
    previous = new Map(currentRows.map(row => [row.id, row.rank]));
    previousWeek = week;
  }

  return { latestWeek: playedWeeks.at(-1) || 0, boards };
}

const moveLabel = movement => movement > 0 ? `+${movement}` : movement < 0 ? `−${Math.abs(movement)}` : "—";
const moveTone = movement => movement > 0 ? "up" : movement < 0 ? "down" : "even";

function rankingBoard(board, focusId, index) {
  return `<ol class="pp-board-grid" data-pp-week-board="${index}" data-week-label="${esc(board.label)}" data-week-comparison="${esc(board.comparison)}" ${index ? "hidden" : ""}>
    ${board.rows.map((row, rowIndex) => `<li class="pp-board-row ${key(row.id) === key(focusId) ? "is-me" : ""}" style="--pp-row:${rowIndex}">
      <b class="pp-board-rank">${row.rank}</b>
      <span class="pp-board-team"><strong>${esc(row.name)}</strong><small>${esc(row.record)}${row.pointsPerGame == null ? "" : ` · ${row.pointsPerGame.toFixed(1)} PPG`}</small></span>
      <span class="pp-board-move is-${moveTone(row.movement)}"><b>${moveLabel(row.movement)}</b><small>from ${row.previousRank}</small></span>
    </li>`).join("")}
  </ol>`;
}

/** The ranking slide. Week switching is wired with the outer Power Pulse deck. */
export function leaguePowerRankingsCard(rankings, focusId = null) {
  if (!rankings?.boards?.length) return "";
  const latestIndex = rankings.boards.length - 1;
  const latest = rankings.boards[latestIndex];
  const focus = latest.rows.find(row => key(row.id) === key(focusId));
  return `<section class="pp-power-board" data-pp-rankings data-week-index="${latestIndex}">
    <header class="pp-board-head">
      <div><small>WEEKLY POWER RANKINGS</small><strong>${esc(latest.label)}</strong></div>
      <p>${focus ? `<b>${esc(focus.name)}</b> sits #${focus.rank} · ${moveLabel(focus.movement)} ${esc(latest.comparison)}` : "Results meet the roster model."}</p>
    </header>
    <div class="pp-week-nav">
      <button type="button" data-pp-week-prev aria-label="Previous ranking week">‹</button>
      <span><b data-pp-week-label>${esc(latest.label)}</b><small data-pp-week-comparison>${esc(latest.comparison)}</small></span>
      <button type="button" data-pp-week-next aria-label="Next ranking week" disabled>›</button>
    </div>
    <div class="pp-board-viewport" data-pp-board-viewport>
      ${rankings.boards.map((board, index) => rankingBoard(board, focusId, index)).join("")}
    </div>
    <p class="pp-board-note">Rank uses completed results only: total points (70%) and record (30%). It updates after Sleeper advances the week on Tuesday.</p>
  </section>`;
}

/*
  IS THIS WEEK OVER? ONE DEFINITION, FOR EVERY READER.

  sync.js writes a week into sleeper_matchups the moment ANYBODY has points
  in it, so the table cannot be read as "these are the weeks that happened".
  From the first Thursday kickoff the live week is present with most of its
  fixtures at something-to-zero, and a reader that treats a row's existence
  as a result gets a week that has not been played.

  The rule lives here because it was briefly written twice - once for the
  rankings board and once for the Home matchup cards - and two readers
  inferring the same thing separately is how they end up disagreeing. A sync
  should only ever add to what the app knows; the app is what has to be
  careful about when a week is finished, and this is where it decides.

  Finished means every fixture has a score on BOTH sides. It needs no clock
  and no league calendar - the rows say it themselves - and it settles the
  moment the last game ends.
*/
export function weekIsFinal(rows) {
  const group = rows || [];
  return group.length > 0
    && group.every(row => Number(row.score1) > 0 && Number(row.score2) > 0);
}

/** Has anybody in this week kicked off? Started is not the same as finished. */
export function weekHasStarted(rows) {
  return (rows || []).some(row => Number(row.score1) > 0 || Number(row.score2) > 0);
}

/*
  Two letters, and a word boundary beats the first two characters: "Da
  Nickers" is DN, not DA. A single-word name keeps its first two.

  Emoji are stripped first, and that is not cosmetic: team names in this
  league genuinely start with them, and an emoji is a surrogate PAIR - taking
  [0] of one splits it and renders a broken glyph. Array.from walks code
  points rather than code units for the same reason.
*/
export function teamInitials(name) {
  const words = String(name || "?")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  const letters = words.length >= 2
    ? Array.from(words[0])[0] + Array.from(words[1])[0]
    : Array.from(words[0]).slice(0, 2).join("");
  return letters.toUpperCase();
}
