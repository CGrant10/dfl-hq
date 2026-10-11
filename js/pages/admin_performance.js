import {LEAGUE_HEALTH_LABELS} from '../league-health.js';
import { db } from "../supabase.js";
import { esc, errorBox } from "../ui.js";
import { performanceFindings } from "../performance-findings.js";

const LABELS = {
  app_ready: "App ready",
  largest_contentful_paint: "Largest paint",
  cumulative_layout_shift: "Layout shift",
  interaction_latency: "Interaction latency",
  route_render: "Route render",
  route_module: "Route module",
  route_content: "Route content",
  long_task: "Main-thread stall",
};

const FIX = {
  app_ready: "Reduce startup work and competing requests.", largest_contentful_paint: "Prioritize the first useful card and its images.",
  cumulative_layout_shift: "Reserve dimensions for late content and images.", interaction_latency: "Trim work inside tap and navigation handlers.",
  route_render: "Audit the route’s total data and DOM work.", route_module: "Split or defer route-only code.",
  route_content: "Reduce data waterfalls and render smaller first paint.", long_task: "Break up synchronous rendering on mobile.",
};

const value = (n, unit) => unit === "score" ? Number(n).toFixed(3) : `${Math.round(Number(n))} ms`;

export async function renderPerformancePanel(host) {
  host.innerHTML = `<div class="card"><div class="card-body muted">Loading real-user performance…</div></div>`;
  const [{data,error},reliability]=await Promise.all([
    db().rpc('app_performance_summary',{days_back:14}),
    Promise.resolve(db().rpc('app_reliability_summary')).catch(()=>({error:true})),
  ]);
  if (error) {
    host.innerHTML = `${errorBox(error)}<div class="card note"><div class="card-body">Run <strong>performance_metrics_schema.sql</strong> in Supabase to activate anonymous performance tracking.</div></div>`;
    return;
  }
  const rows = data || [];
  const findings = performanceFindings(rows);
  host.innerHTML = reliabilityMarkup(reliability.data,reliability.error)+`<div class="section-head"><div><h2>Real-user performance</h2><p class="muted">Last 14 days · anonymous 25% session sample</p></div></div>
    <section class="perf-health ${findings.length ? "is-warn" : "is-good"}"><div><small>PERFORMANCE HEALTH</small><strong>${findings.length ? `${findings.length} hotspot${findings.length === 1 ? "" : "s"}` : "Within target"}</strong></div>${findings.length ? `<ol>${findings.slice(0, 5).map(row => `<li><span><b>${esc(row.route)} · ${esc(LABELS[row.metric] || row.metric)}</b><small>${esc(FIX[row.metric] || "Review this route.")}</small></span><strong>${value(row.p75, row.unit)}</strong></li>`).join("")}</ol>` : `<p>No P75 metric is outside the current mobile-friendly target.</p>`}</section>
    <div class="card"><div class="card-body">
      <p class="muted tiny">Measures broad device and network conditions only. No member, team, content, full URL, or persistent browser identity is stored.</p>
      ${rows.length ? `<div class="table-wrap"><table><thead><tr><th>Measure</th><th>Route</th><th>Samples</th><th>Median</th><th>P75</th><th>P95</th></tr></thead><tbody>${rows.map(row => `<tr><td>${esc(LABELS[row.metric] || row.metric)}</td><td>${esc(row.route)}</td><td>${Number(row.samples) || 0}</td><td>${value(row.p50, row.unit)}</td><td>${value(row.p75, row.unit)}</td><td>${value(row.p95, row.unit)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="empty">No sampled sessions yet. Data will appear as members use this release.</div>`}
    </div></div>`;
}

export function reliabilityMarkup(data,error){
 if(error||!data)return '<section class="card"><div class="card-body"><h2>App reliability</h2><p role="status">Reliability checks are unavailable. Try again.</p></div></section>';
 const issues=data.issues||[],wall=data.wall||{},sync=data.sync||{},health=data.leagueHealth;
 const stale=health&&Date.now()-Date.parse(health.checkedAt)>((sync.mode==='live'||sync.mode==='kickoff')?20:150)*60000;
 const healthMarkup=health?`<p role="status"><strong>League checks: ${health.ok?'Passed':'Needs attention'}${stale?' · snapshot overdue':''}</strong> · ${Number(health.rostersChecked)||0}/${Number(health.expectedTeams)||12} rosters · Week ${Number(health.week)||0}</p>${health.issues?.length?`<ul>${health.issues.map(code=>`<li>${esc(LEAGUE_HEALTH_LABELS[code]||'League data needs review')}</li>`).join('')}</ul>`:''}`:'<p>League checks: waiting for the next sync.</p>';
 return `<section class="card"><div class="card-body"><h2>App reliability</h2>${healthMarkup}<p>${sync.enabled?'Background sync on':'Background sync paused'} · ${esc(sync.mode||'waiting for first run')}${sync.checked_at?` · checked ${esc(new Date(sync.checked_at).toLocaleString())}`:''}</p>${sync.error?`<p role="status">Sync needs attention: ${esc(sync.error)}</p>`:''}<p>Wall pushes: ${Number(wall.delivered)||0} delivered · ${Number(wall.pending)||0} queued · ${Number(wall.failed)||0} failed</p>${issues.length?`<div class="table-wrap"><table><thead><tr><th>Issue</th><th>Route</th><th>Source</th><th>Release</th><th>Sessions</th></tr></thead><tbody>${issues.map(row=>`<tr><td>${esc(row.kind.replaceAll('_',' '))}</td><td>${esc(row.route)}</td><td>${esc(row.source)}</td><td>${esc(row.app_version)}</td><td>${Number(row.samples)||0}</td></tr>`).join('')}</tbody></table></div>`:'<p>No reported issues in the last 14 days.</p>'}<p class="muted tiny">Technical categories only. No member, message, request URL or error text is collected.</p></div></section>`;
}
