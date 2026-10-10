import { describe, it, expect } from 'vitest';
import { playerFormChart, playerFormHtml } from './player-form.js';

describe('recorded player form', () => {
  it('keeps weeks chronological and splits the chart at missing scores', () => {
    const chart = playerFormChart([{ week:5, points:20 }, { week:3, points:10 }, { week:4, points:null }]);
    expect(chart.points.map(p => p.week)).toEqual([3,4,5]);
    expect(chart.segments.map(s => s.map(p => p.week))).toEqual([[3],[5]]);
    expect(chart.points[1].y).toBeNull();
  });
  it('plots zero and negative scores on the correct sides of the zero baseline', () => {
    const chart = playerFormChart([{ week:1, points:-4 }, { week:2, points:0 }, { week:3, points:20 }]);
    expect(chart.points[0].y).toBeGreaterThan(chart.baseline);
    expect(chart.points[1].y).toBe(chart.baseline);
    expect(chart.points[2].y).toBeLessThan(chart.baseline);
    expect(chart.points.every(p => p.y >= 8 && p.y <= 72)).toBe(true);
  });
  it('does not invent zero values or a trend when scores are unavailable', () => {
    const chart = playerFormChart([{ week:1, points:null }, { week:2, points:NaN }, { week:3, points:Infinity }]);
    expect(chart.available).toBe(false);
    expect(chart.segments).toEqual([]);
    const html = playerFormHtml({ recent:chart.points, season:2026, week:3, state:'unknown' });
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('0.00');
    expect(html).toContain('Weekly scores unavailable.');
  });
  it('keeps an all-zero series finite and uses exact readable values alongside the decorative chart', () => {
    const recent = [{ week:1, points:0 }, { week:2, points:0 }, { week:3, points:0, stale:true }];
    expect(playerFormChart(recent).points.every(p => Number.isFinite(p.y))).toBe(true);
    const html = playerFormHtml({ recent, season:2026, week:3, state:'live' });
    expect(html).toContain('aria-hidden="true"');
    expect(html.match(/0\.00/g)).toHaveLength(3);
    expect(html).toContain('Last available');
    expect(html).not.toContain('<small data-player-form-current-state>Live</small>');
  });
  it('labels the current week as live without treating a partial score as final', () => {
    const html = playerFormHtml({ recent:[{ week:4, points:22.235 }, { week:5, points:6.5 }], season:2026, week:5, state:'live' });
    expect(html).toContain('22.23');
    expect(html).toContain('6.50<small data-player-form-current-state>Live</small>');
    expect(html).not.toContain('Final');
    expect(playerFormChart([]).available).toBe(false);
  });
});
