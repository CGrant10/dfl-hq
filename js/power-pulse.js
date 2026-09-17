import { esc } from "./ui.js";
import { REGULAR_SEASON_WEEKS, projectSeason } from "./season-outlook.js";
import { buildLeaguePowerRankings, leaguePowerRankingsCard } from "./league-trajectory.js";

const teamName = team => team?.team_name || team?.ownerName || `Team ${team?.roster_id || ""}`;
const signed = value => value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "EVEN";

function comparisonRows(standings, season) {
  const all = (standings || []).filter(row => row?.sleeper_user_id && Number(row.rank) > 0);
  const current = all.filter(row => Number(row.season) === Number(season) && Number(row.wins || 0) + Number(row.losses || 0) + Number(row.ties || 0) > 0);
  if (current.length) return { rows: current, label: "VS STANDINGS" };
  const previousSeason = Math.max(...all.map(row => Number(row.season)).filter(value => value < Number(season)));
  return Number.isFinite(previousSeason)
    ? { rows: all.filter(row => Number(row.season) === previousSeason), label: `VS ${previousSeason}` }
    : { rows: [], label: "PRESEASON" };
}

/** Turn the Analyzer's ranking into the small, honest Home summary. */
export function powerPulseView({ analysis, meSleeperId = null, standings = [] } = {}) {
  if (analysis?.state !== "ready" || !analysis.teams?.length) return null;
  const teams = analysis.teams;
  const focus = teams.find(team => meSleeperId && String(team.sleeper_user_id) === String(meSleeperId)) || teams[0];
  const comparison = comparisonRows(standings, analysis.projectionSeason);
  const baseline = new Map(comparison.rows.map(row => [String(row.sleeper_user_id), Number(row.rank)]));
  const scores = teams.map(team => Number(team.lineup?.score || 0));
  const low = Math.min(...scores), high = Math.max(...scores);
  const ratings = Object.fromEntries(teams.map(team => {
    const score = Number(team.lineup?.score || 0);
    const rating = high === low ? 100 : 78 + ((score - low) / (high - low)) * 22;
    return [team.id, rating.toFixed(1)];
  }));
  const movement = team => {
    const oldRank = baseline.get(String(team.sleeper_user_id));
    return Number.isFinite(oldRank) ? oldRank - Number(team.rank) : null;
  };
  /*
    A PROJECTED RECORD BEATS A BIGGEST MOVER.

    "Biggest riser" answered a question nobody asked on the home page - it was
    about somebody else's team, measured against last season's standings, and
    it went stale the moment the model settled. What a manager wants at a
    glance is where their own season is heading.
  */
  const projections = projectSeason({
    teams: teams.map(team => ({ id: String(team.id), mean: team.lineup?.weeklyPoints })),
    playoffTeams: Number(analysis.league?.playoff_teams) || 8,
  });
  const record = projections.get(String(focus.id)) || null;
  const powerRankings = buildLeaguePowerRankings({
    teams,
    matchups: analysis.matchups || [],
    weeks: REGULAR_SEASON_WEEKS,
  });
  return {
    record,
    weeks: REGULAR_SEASON_WEEKS,
    season: analysis.projectionSeason,
    teams: teams.slice(0, 5),
    allTeams: teams,
    focus,
    movement: movement(focus),
    movementLabel: comparison.label,
    ratings,
    powerRankings,
  };
}

export function powerPulseShell(season = null) {
  return `<section class="block season-field power-pulse" data-power-pulse>
    <div class="card pp-card pp-loading" aria-busy="true">
      <div><strong>POWER PULSE</strong><span>${season ? `${esc(String(season))} MODEL` : "BUILDING MODEL"}</span></div>
      <p>Reading every roster and current projection…</p>
    </div>
  </section>`;
}

export function powerPulseCard(view) {
  if (!view?.teams?.length) return "";
  const focusHref = view.focus.sleeper_user_id
    ? `#/analyzer?owner=${encodeURIComponent(view.focus.sleeper_user_id)}`
    : `#/analyzer?team=${encodeURIComponent(view.focus.id)}`;
  const focusMovement = view.movement == null ? "NEW MODEL" : `${signed(view.movement)} ${view.movementLabel}`;
  const record = view.record;
  const rankings = leaguePowerRankingsCard(view.powerRankings, view.focus.id);
  return `<div class="card pp-card">
    <header class="pp-head"><div><svg class="ico-sm" aria-hidden="true"><use href="#i-record"></use></svg><strong>POWER PULSE</strong></div><span>${esc(String(view.season || "CURRENT"))} MODEL</span></header>
    <div class="pp-deck" data-pp-deck>
      <div class="pp-deck-viewport">
        <section class="pp-deck-panel is-active" data-pp-panel="0" role="tabpanel" aria-label="Your outlook">
          <div class="pp-overview">
            <div class="pp-body">
              <div class="pp-focus"><small>YOUR POWER RANK</small><strong>#${esc(String(view.focus.rank))}</strong><span>${esc(focusMovement)}</span></div>
              <ol class="pp-ranks">${view.teams.map(team => `<li class="${team.id === view.focus.id ? "is-me" : ""}"><b>${esc(String(team.rank))}</b><span>${esc(teamName(team))}</span><strong>${esc(view.ratings?.[team.id] || "—")}</strong></li>`).join("")}</ol>
              <div class="pp-record">
                <small>PROJECTED RECORD</small>
                <strong>${record ? `${record.wins}-${record.losses}` : "—"}</strong>
                <span>${record
                  ? `${Math.round(record.playoffOdds * 100)}% playoffs · ${Math.round(record.titleOdds * 100)}% title`
                  : `over ${view.weeks} weeks`}</span>
              </div>
            </div>
            <footer class="pp-foot"><p><svg class="ico-sm" aria-hidden="true"><use href="#i-moment"></use></svg><span><strong>${esc(view.focus.strength || "Roster")} is the best unit</strong> · ${view.focus.need ? `${esc(view.focus.need)} is the clearest starting need` : "no urgent starting-lineup need"}</span></p><a class="btn ghost small" href="${focusHref}">Open Team Analyzer</a></footer>
          </div>
        </section>
        <section class="pp-deck-panel" data-pp-panel="1" role="tabpanel" aria-label="League power rankings" aria-hidden="true" inert>
          ${rankings}
        </section>
      </div>
      <nav class="pp-deck-controls" aria-label="Power Pulse cards">
        <div role="tablist" aria-label="Choose Power Pulse card">
          <button type="button" role="tab" aria-selected="true" data-pp-deck-go="0">Your outlook</button>
          <button type="button" role="tab" aria-selected="false" data-pp-deck-go="1">League ranks</button>
        </div>
        <button class="pp-deck-pause" type="button" data-pp-deck-pause aria-label="Pause rotating cards">
          <svg class="ico-sm" aria-hidden="true"><use href="#i-pause"></use></svg><span data-pp-pause-label>Pause</span>
        </button>
      </nav>
      <div class="pp-deck-progress" aria-hidden="true"><i></i></div>
    </div>
  </div>`;
}

/** The rankings-only slide used inside Home's primary dashboard deck. */
export function powerPulsePanel(view) {
  if (!view?.teams?.length) return "";
  const rankings = leaguePowerRankingsCard(view.powerRankings, view.focus.id);
  if (rankings) return rankings;
  return `<section class="pp-power-board pp-power-fallback">
    <header class="pp-board-head"><div><small>POWER RANKINGS</small><strong>${esc(String(view.season || "CURRENT"))} MODEL</strong></div></header>
    <ol class="pp-ranks">${view.teams.map(team => `<li class="${team.id === view.focus.id ? "is-me" : ""}"><b>${esc(String(team.rank))}</b><span>${esc(teamName(team))}</span><strong>${esc(view.ratings?.[team.id] || "—")}</strong></li>`).join("")}</ol>
  </section>`;
}

/** Mount the two-card Power Pulse deck and the historical week picker. */
export function wirePowerPulse(root) {
  const deck = root?.querySelector?.("[data-pp-deck]");
  if (!deck) return () => {};
  const panels = [...deck.querySelectorAll("[data-pp-panel]")];
  const tabs = [...deck.querySelectorAll("[data-pp-deck-go]")];
  const pause = deck.querySelector("[data-pp-deck-pause]");
  const pauseLabel = deck.querySelector("[data-pp-pause-label]");
  const pauseIcon = pause?.querySelector("use");
  const progress = deck.querySelector(".pp-deck-progress i");
  const reduced = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  let active = 0, timer = null, hovering = false, focused = false, manualPaused = reduced;

  const stopped = () => manualPaused || hovering || focused || globalThis.document?.hidden;
  const resetProgress = () => {
    if (!progress) return;
    progress.style.animation = "none";
    void progress.offsetWidth;
    progress.style.animation = "";
  };
  const paintPause = () => {
    const paused = stopped();
    deck.classList.toggle("is-paused", paused);
    if (pauseLabel) pauseLabel.textContent = manualPaused ? "Play" : "Pause";
    if (pause) pause.setAttribute("aria-label", manualPaused ? "Play rotating cards" : "Pause rotating cards");
    if (pauseIcon) pauseIcon.setAttribute("href", manualPaused ? "#i-play" : "#i-pause");
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = null;
    paintPause();
    if (reduced || stopped() || panels.length < 2) return;
    timer = setTimeout(() => {
      show((active + 1) % panels.length);
      schedule();
    }, 9000);
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
    resetProgress();
  };

  const onClick = event => {
    const go = event.target.closest("[data-pp-deck-go]");
    if (go) { show(Number(go.dataset.ppDeckGo)); schedule(); return; }
    if (event.target.closest("[data-pp-deck-pause]")) {
      manualPaused = !manualPaused;
      schedule();
      return;
    }
    const rankings = event.target.closest("[data-pp-rankings]");
    const direction = event.target.closest("[data-pp-week-prev]") ? -1
      : event.target.closest("[data-pp-week-next]") ? 1 : 0;
    if (!rankings || !direction) return;
    const boards = [...rankings.querySelectorAll("[data-pp-week-board]")];
    const current = Number(rankings.dataset.weekIndex) || 0;
    showWeek(rankings, boards, current + direction);
    manualPaused = true;
    schedule();
  };
  const showWeek = (rankings, boards, next) => {
    const index = Math.max(0, Math.min(boards.length - 1, Number(next) || 0));
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
  };

  deck.addEventListener("click", onClick);
  deck.addEventListener("mouseenter", () => { hovering = true; schedule(); });
  deck.addEventListener("mouseleave", () => { hovering = false; schedule(); });
  deck.addEventListener("focusin", () => { focused = true; schedule(); });
  deck.addEventListener("focusout", event => {
    if (!deck.contains(event.relatedTarget)) { focused = false; schedule(); }
  });
  const onVisibility = () => schedule();
  globalThis.document?.addEventListener("visibilitychange", onVisibility);

  const rankings = deck.querySelector("[data-pp-rankings]");
  if (rankings) {
    const boards = [...rankings.querySelectorAll("[data-pp-week-board]")];
    showWeek(rankings, boards, Number(rankings.dataset.weekIndex));
  }
  show(0);
  schedule();
  return () => {
    clearTimeout(timer);
    deck.removeEventListener("click", onClick);
    globalThis.document?.removeEventListener("visibilitychange", onVisibility);
  };
}
