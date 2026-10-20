// =====================================================================
// league-trajectory.js - weekly power rankings for Home's Power Pulse
// ---------------------------------------------------------------------
// The first version drew twelve lines across fourteen weeks. Accurate, but
// it made the reader decode a transit map to answer a simple question:
// where is everybody now, and who moved? This keeps the same honest inputs
// and turns each completed week into a compact ranking board instead.
// =====================================================================

import { esc } from "./ui.js";

import {buildPowerBoards} from './league-power-model.js';
const key=value=>String(value??'');
export const buildLeaguePowerRankings=buildPowerBoards;

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
    <p class="pp-board-note">Completed results, recent scoring and available lineup strength. Weekly editions publish after Sleeper advances the week.</p>
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
