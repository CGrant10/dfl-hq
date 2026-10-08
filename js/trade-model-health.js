const number = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const AUDIT_KEY = "dfl.trade.recommendationAudit.v1";

function auditRows(storage = localStorage) {
  try { const rows = JSON.parse(storage.getItem(AUDIT_KEY) || "[]"); return Array.isArray(rows) ? rows : []; } catch { return []; }
}

export function recordTradeRecommendation({ season = null, week = null, teamId, partnerId, sendA = [], sendB = [], weeklyDelta = 0 }, pool, storage = localStorage) {
  const baseline = ids => ids.map(id => { const player = pool.get(String(id)) || {}; return { id: String(id), points: Number(player.currentPoints) || 0, games: Number(player.currentGames) || 0 }; });
  const row = { at: new Date().toISOString(), season, week, teamId: String(teamId), partnerId: String(partnerId), sendA: baseline(sendA), sendB: baseline(sendB), weeklyDelta: Number(weeklyDelta) || 0 };
  const rows = auditRows(storage).filter(item => JSON.stringify([item.teamId, item.partnerId, item.sendA?.map(p => p.id), item.sendB?.map(p => p.id)]) !== JSON.stringify([row.teamId, row.partnerId, row.sendA.map(p => p.id), row.sendB.map(p => p.id)]));
  storage.setItem(AUDIT_KEY, JSON.stringify([row, ...rows].slice(0, 80)));
  return row;
}

export function recommendationOutcomes(pool, storage = localStorage, sharedRows = []) {
  const normalizedShared = (sharedRows || []).map(row => ({ at: row.created_at, season: row.season, week: row.week,
    teamId: row.team_id, partnerId: row.partner_id, sendA: row.send_snapshot || [], sendB: row.receive_snapshot || [],
    weeklyDelta: Number(row.projected_weekly_delta) || 0 }));
  const rows = normalizedShared.length ? normalizedShared : auditRows(storage);
  const graded = rows.map(row => {
    const gained = side => (side || []).reduce((sum, old) => sum + Math.max(0, (Number(pool.get(String(old.id))?.currentPoints) || 0) - (Number(old.points) || 0)), 0);
    const games = side => (side || []).reduce((sum, old) => sum + Math.max(0, (Number(pool.get(String(old.id))?.currentGames) || 0) - (Number(old.games) || 0)), 0);
    const actualDelta = gained(row.sendB) - gained(row.sendA), advanced = games(row.sendA) + games(row.sendB);
    return advanced ? { ...row, actualDelta, correct: Math.sign(actualDelta) === Math.sign(Number(row.weeklyDelta) || 0) || Math.abs(actualDelta) < 1 } : null;
  }).filter(Boolean);
  return { tracked: rows.length, graded: graded.length, hitRate: graded.length ? Math.round(graded.filter(row => row.correct).length / graded.length * 100) : null };
}

export function tradeModelHealth(pool) {
  const players = [...(pool?.values?.() || [])];
  const rostered = players.filter(player => ["QB", "RB", "WR", "TE"].includes(player.position));
  const projected = rostered.filter(player => player.modelSource ? player.modelSource === 'projection' : number(player.expectedPerGame) != null);
  const live = rostered.filter(player => Number(player.currentGames) > 0);
  const recent = rostered.filter(player => Number(player.recentGames) >= 2 && number(player.recentAverage) != null);
  const injured = rostered.filter(player => player.injuryStatus || player.isOut || player.isRisky);
  const differences = recent.map(player => ({ id: player.id, name: player.name, position: player.position,
    expected: number(player.tradePerGame??player.expectedPerGame) || 0, recent: number(player.recentAverage) || 0,
    gap: Math.abs((number(player.tradePerGame??player.expectedPerGame) || 0) - (number(player.recentAverage) || 0)) }))
    .sort((a, b) => b.gap - a.gap);
  const meanGap = differences.length ? differences.reduce((sum, row) => sum + row.gap, 0) / differences.length : null;
  const coverage = rostered.length ? projected.length / rostered.length : 0;
  const grade = coverage >= .95 && live.length >= Math.min(80, rostered.length * .45) ? "LIVE" : coverage >= .8 ? "READY" : "LIMITED";
  return { grade, players: rostered.length, projectionCoverage: Math.round(coverage * 100), liveSamples: live.length,
    recentSamples: recent.length, injured: injured.length, meanGap, disagreements: differences.slice(0, 5) };
}

export function tradeModelHealthMarkup(health, esc = value => String(value)) {
  const audit = health.accountability || {};
  return `<details class="trade-model-health"><summary><span><small>MODEL CHECK</small><strong>Trade intelligence</strong></span><b>${esc(health.grade)}</b></summary><div><p><small>PROJECTION COVERAGE</small><strong>${health.projectionCoverage}%</strong></p><p><small>LIVE SAMPLES</small><strong>${health.liveSamples}</strong></p><p><small>TRACKED CALLS</small><strong>${audit.tracked || 0}</strong></p><p><small>OBSERVED DIRECTION</small><strong>${audit.hitRate == null ? "—" : `${audit.hitRate}%`}</strong></p></div><p>Sources: Sleeper projections and DFL-scored results. Expert consensus is not connected. Observed direction compares exchanged players’ accumulated points after a saved call; it does not measure lineup impact or calibrated model accuracy.</p>${health.meanGap == null ? "" : `<section><small>BIGGEST MODEL / FORM DISAGREEMENTS</small>${health.disagreements.map(row => `<span><b>${esc(row.name)}</b><em>${row.expected.toFixed(1)} model · ${row.recent.toFixed(1)} recent</em></span>`).join("")}</section>`}</details>`;
}
