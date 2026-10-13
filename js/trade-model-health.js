const number = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
const AUDIT_KEY = "dfl.trade.recommendationAudit.v1";
import {expertSourceMarkup} from './expert-rankings-model.js';
import {optimalLineup} from './team-analyzer.js';

function auditRows(storage = localStorage) {
  try { const rows = JSON.parse(storage.getItem(AUDIT_KEY) || "[]"); return Array.isArray(rows) ? rows : []; } catch { return []; }
}

export function recordTradeRecommendation({ season = null, week = null, teamId, partnerId, sendA = [], sendB = [], weeklyDelta = 0, lineupAudit = null }, pool, storage = localStorage) {
  const baseline = ids => ids.map(id => { const player = pool.get(String(id)) || {}; return { id: String(id), points: Number(player.currentPoints) || 0, games: Number(player.currentGames) || 0 }; });
  const row = { at: new Date().toISOString(), season, week, teamId: String(teamId), partnerId: String(partnerId), sendA: baseline(sendA), sendB: baseline(sendB), weeklyDelta: Number(weeklyDelta) || 0 };
  // Existing JSON snapshots carry the point-in-time roster; no new RPC/schema.
  if(lineupAudit&&row.sendA.length)row.sendA[0].lineupAudit=lineupAudit;
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
    const audit=row.sendA?.[0]?.lineupAudit;
    // Older package totals cannot establish starting-lineup accuracy.
    if(audit?.version!==2||!Array.isArray(audit.before)||!Array.isArray(audit.after)||!row.season||!row.week)return null;
    const players=new Map(pool);for(const p of pool.values())for(const option of p.waiverOptions||[])players.set(option.id,option);
    const ids=[...new Set([...audit.before,...audit.after])];
    const samples=Array.from({length:Math.min(4,Math.max(0,17-Number(row.week)))},(_,i)=>Number(row.week)+i+1).map(week=>{
      const actual=new Map();
      for(const id of ids){
        const p=players.get(id),sample=p?.scoreHistory?.find(s=>Number(s.season)===Number(row.season)&&Number(s.week)===week);
        if(!sample||!audit.positions?.[id])return null;
        actual.set(id,{id,name:id,position:audit.positions[id],expectedPoints:Number(sample.points)*17,tradeValue:0});
      }
      return optimalLineup(audit.after,actual).weeklyPoints-optimalLineup(audit.before,actual).weeklyPoints;
    }).filter(delta=>delta!==null);
    if(!samples.length)return null;
    const actualDelta=samples.reduce((a,b)=>a+b,0)/samples.length;
    return {...row,actualDelta,correct:Math.sign(actualDelta)===Math.sign(Number(row.weeklyDelta)||0)||Math.abs(actualDelta)<1};
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
    recentSamples: recent.length, injured: injured.length, meanGap, disagreements: differences.slice(0, 5),
    expertConsensus:{status:rostered[0]?.expertFeedStatus||'not connected',source:'FantasyPros',updatedAt:rostered[0]?.expertUpdatedAt||0,experts:rostered[0]?.expertCount||0},expertCoverage:rostered.length?Math.round(rostered.filter(p=>p.expertWeight>0).length/rostered.length*100):0 };
}

export function tradeModelHealthMarkup(health, esc = value => String(value), compact = false) {
  const audit = health.accountability || {};
  return `<details class="trade-model-health"><summary><span><small>MODEL CHECK</small><strong>Trade intelligence</strong></span><b>${esc(health.grade)}</b></summary><div><p><small>PROJECTION COVERAGE</small><strong>${health.projectionCoverage}%</strong></p><p><small>LIVE SAMPLES</small><strong>${health.liveSamples}</strong></p><p><small>TRACKED CALLS</small><strong>${audit.tracked || 0}</strong></p><p><small>OBSERVED LINEUP DIRECTION</small><strong>${audit.hitRate == null ? "—" : `${audit.hitRate}%`}</strong></p></div>${compact?`<p>Expert coverage · ${health.expertCoverage||0}%</p>`:`<p>Sources: Sleeper projections and DFL-scored results. ${health.expertCoverage||0}% of rated rostered players have a fresh expert match. Observed direction compares optimized legal starting lineups over the same completed future weeks. It is not calibrated model accuracy.</p>`}${expertSourceMarkup(health.expertConsensus,esc,compact)}${health.meanGap == null ? "" : `<section><small>BIGGEST MODEL / FORM DISAGREEMENTS</small>${health.disagreements.map(row => `<span><b>${esc(row.name)}</b><em>${row.expected.toFixed(1)} model · ${row.recent.toFixed(1)} recent</em></span>`).join("")}</section>`}</details>`;
}
