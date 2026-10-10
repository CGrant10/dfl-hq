import { esc } from './ui.js';

// A missing score breaks the line. Zero and negative PPR scores remain real points.
export function playerFormChart(recent = []) {
  const rows = [...recent].sort((a, b) => a.week - b.week).map(row => ({
    ...row, points: typeof row.points === 'number' && Number.isFinite(row.points) ? row.points : null,
  }));
  const values = rows.filter(row => row.points !== null).map(row => row.points);
  const low = Math.min(0, ...values), high = Math.max(0, ...values);
  const y = value => 72 - (value - low) / (high - low || 1) * 64;
  const points = rows.map((row, i) => ({ ...row, x: (i + .5) * 300 / rows.length, y: row.points === null ? null : y(row.points) }));
  const segments = [];
  let segment = [];
  for (const point of points) {
    if (point.y === null) { if (segment.length) segments.push(segment); segment = []; }
    else segment.push(point);
  }
  if (segment.length) segments.push(segment);
  return { points, segments, baseline: y(0), available: values.length > 0 };
}

export function playerFormHtml(model) {
  const chart = playerFormChart(model.recent);
  const plot = chart.available ? `<svg class="player-form-chart" viewBox="0 0 300 84" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <line class="player-form-zero" x1="0" x2="300" y1="${chart.baseline}" y2="${chart.baseline}" />
    ${chart.points.map(p => `<line class="player-form-guide" x1="${p.x}" x2="${p.x}" y1="8" y2="76" />`).join('')}
    ${chart.segments.filter(s => s.length > 1).map(s => `<polyline class="player-form-line" points="${s.map(p => `${p.x},${p.y}`).join(' ')}" />`).join('')}
    ${chart.points.filter(p => p.y !== null).map(p => `<circle class="player-form-dot${p.stale ? ' is-stale' : ''}" cx="${p.x}" cy="${p.y}" r="4" />`).join('')}
  </svg>` : '<p class="player-form-empty">Weekly scores unavailable.</p>';
  const state = { live: 'Live', final: 'Final', upcoming: 'Yet to play', unknown: 'Pending' }[model.state];
  return `<section class="player-card-recent" aria-label="Recent fantasy points"><div class="player-form-heading"><h3>Recent form</h3><small>${esc(model.season)} · Fantasy points</small></div>${plot}<dl style="--form-count:${Math.max(1, chart.points.length)}">${chart.points.map(p => `<div><dt>Week ${esc(p.week)}</dt><dd>${p.points === null ? '—' : p.points.toFixed(2)}${p.stale && p.points !== null ? '<small>Last available</small>' : Number(p.week) === Number(model.week) && state ? `<small data-player-form-current-state>${esc(state)}</small>` : ''}</dd></div>`).join('')}</dl></section>`;
}
