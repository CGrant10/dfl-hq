import { esc } from './ui.js';
import { ANALYZER_UNITS } from './team-analyzer.js';

// A quick view of the same league-relative grades in the full position report.
export function scoutingSummary(team, leagueSize) {
  const units = ANALYZER_UNITS.map(position => {
    const unit = team.positionGrades?.[position];
    const hasRank = Number.isFinite(unit?.percentile);
    const width = hasRank ? Math.round(Math.max(0, Math.min(1, unit.percentile)) * 100) : 0;
    const grade = unit?.grade || '—';
    const rank = unit?.leagueRank ? `${unit.leagueRank} / ${unit.leagueSize || leagueSize}` : 'Unranked';
    return `<div class="scout-unit" role="listitem"><small>${position}</small><strong>${esc(grade)}</strong><span class="scout-meter" aria-hidden="true"><i style="width:${width}%"></i></span><span class="scout-rank">${esc(rank)}</span></div>`;
  }).join('');
  return `<section class="scout-summary" aria-label="Roster scouting summary">
    <header><div><small>ROSTER SCOUT</small><h2>Position strength</h2></div><div class="scout-overall"><strong>${esc(team.overallGrade || '—')}</strong><small>OVERALL</small></div></header>
    <div class="scout-units" role="list" aria-label="Position grades and league ranks">${units}</div>
    <footer><span>${esc(team.strength || 'No rated strength')}<small>STRONGEST UNIT</small></span><button type="button" data-ta-jump="units">Full report <span aria-hidden="true">→</span></button></footer>
  </section>`;
}
