export const PERFORMANCE_LIMITS = Object.freeze({
  app_ready: 2500,
  largest_contentful_paint: 2500,
  cumulative_layout_shift: .1,
  interaction_latency: 200,
  route_render: 1000,
  route_module: 800,
  route_content: 700,
  long_task: 200,
});

export function performanceFindings(rows = []) {
  return rows.map(row => ({ ...row, limit: PERFORMANCE_LIMITS[row.metric] }))
    .filter(row => Number.isFinite(row.limit) && Number(row.p75) > row.limit)
    .sort((a, b) => (Number(b.p75) / b.limit) - (Number(a.p75) / a.limit));
}
