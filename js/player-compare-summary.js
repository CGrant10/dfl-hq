import {esc} from './ui.js';
import {comparisonPlayer,comparisonEdge} from './player-compare-model.js';
const fmt=n=>n!=null&&Number.isFinite(Number(n))?Number(n).toFixed(1):'—';
const availability=p=>p.player.isOut||/\b(IR|OUT|PUP|DOUBTFUL)\b/i.test(p.injury);
export function comparisonMetricsMarkup(data,left,right,{tab='week',week=data.analysis.liveWeek,logOpen=false}={}){
 const pair=[comparisonPlayer(data,left,{week}),comparisonPlayer(data,right,{week})];if(pair.some(p=>!p))return '';
 const [a,b]=pair,same=a.player.position===b.player.position,safe=same&&!pair.some(availability),paired=fn=>pair.map(fn);
 const row=(label,values,{highlight=false,threshold=.5,lower=false,feature=false,notes=[],prefix='',delta=false}={})=>{
  const edge=comparisonEdge(...values,{enabled:highlight,threshold,lower});
  return `<div class="pc-compare-row${feature?' is-featured':''}"><span>${esc(label)}</span>${values.map((value,i)=>`<b${edge?.side===i?' class="is-edge"':''}>${esc(value==null?'—':typeof value==='number'?prefix+fmt(value):value)}${edge?.side===i&&delta?`<em class="pc-compare-gap" aria-label="${fmt(edge.amount)} ${label==='DFL value /100'?'value points':'fantasy points'} higher">+${fmt(edge.amount)}</em>`:''}${notes[i]?`<small>${esc(notes[i])}</small>`:''}</b>`).join('')}</div>`;
 };
 if(tab==='trade'){
  const source=data.analysis.expertConsensus,at=source?.updatedAt?new Date(source.updatedAt).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'';
  return `<h3>Rest of season</h3>${row('DFL value /100',paired(p=>p.tradeValue),{highlight:safe,threshold:2,feature:true,delta:true})}${row('FantasyPros overall',paired(p=>p.expert?`#${p.expert.rank}`:null))}${row('FantasyPros position',paired(p=>p.expert?`${p.player.position}${p.expert.positionRank}`:null))}<p class="pc-compare-source">FantasyPros ROS · ${esc(source?.status||'Unavailable')}${at?` · ${esc(at)}`:''}</p>`;
 }
 const scoring={ppr:'Full PPR',half_ppr:'Half PPR',std:'Standard'}[data.analysis.leagueFormat?.scoring]||'League scoring';
 const historical=a.historical,projectionFresh=!data.projectionsStale;
 const game=p=>p.bye?'No game':p.opponent?`vs ${p.opponent}`:p.gameState==='final'?'Final':p.gameState==='live'?'Live':'—';
 const kickoff=p=>{if(['live','final'].includes(p.gameState))return p.gameState==='live'?'Live':'Final';const at=Date.parse(p.kickoff);return Number.isFinite(at)?new Date(at).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):''};
 const sample=p=>`${p.recent.length} game${p.recent.length===1?'':'s'}${p.recent.length?` · W${p.recent[0].week}${p.recent.length>1?'–'+p.recent.at(-1).week:''}`:''}`;
 const weeks=[...new Set(pair.flatMap(p=>p.recent.map(r=>r.week)))].sort((x,y)=>y-x);
 const history=weeks.map(w=>row(`Week ${w}`,pair.map(p=>p.recent.find(r=>r.week===w)?.points??null))).join('');
 return `<h3>${esc(String(a.season))} · Week ${esc(String(week))} · ${esc(scoring)}</h3>${row(historical?'Scored':'Projection',paired(p=>historical?p.points:p.projection),{highlight:safe&&(historical?!pair.some(p=>p.stale):projectionFresh),feature:true,delta:true})}${!historical&&pair.some(p=>p.points!==null&&['live','final'].includes(p.gameState))?row('Scored',paired(p=>p.points)):''}${row('Matchup',paired(game),{notes:paired(kickoff)})}${row('Recent average',paired(p=>p.average),{highlight:same,notes:paired(sample),delta:true})}<details class="pc-compare-log"${logOpen?' open':''}><summary>Recent game log <i aria-hidden="true"></i></summary><div>${row('Low–high',paired(p=>p.range?`${fmt(p.range[0])}–${fmt(p.range[1])}`:null))}<div class="pc-compare-history">${history||'<p>No completed sample.</p>'}</div></div></details><p class="pc-compare-source">Sleeper · League scoring${historical&&pair.some(p=>p.stale)?' · Cached box scores':!historical&&data.projectionsStale?' · Cached projections':''}${!same?' · Different positions':''}</p>`;
}
