import {esc} from './ui.js';
import {teamPortrait} from './team-presentation.js';
import {clubhouseGameMetrics,clubhouseLeaguePulse} from './clubhouse-center-model.js';
const pts=v=>v==null?'—':Number(v).toFixed(2);

export function clubhouseScoreboardHtml(model,selected) {
 return `<div class="clubhouse-scoreboard-grid" role="group" aria-label="Choose a league matchup">${model.games.map(game=>{
  const metrics=clubhouseGameMetrics(game,model.completed),on=game.id===selected;
  return `<button type="button" class="clubhouse-scoreboard-game${metrics.pressure?' is-close':''}" data-clubhouse-game="${esc(game.id)}" aria-pressed="${on}" aria-label="View ${esc(game.sides.map(t=>t.name).join(' versus '))}"><span class="clubhouse-mini-phase" data-state="${esc(metrics.phase.key)}">${esc(metrics.pressure?'Close game':metrics.phase.label)}</span>${game.sides.map(t=>`<span class="clubhouse-mini-team${metrics.lead?.side===(game.sides.indexOf(t)?'right':'left')?' is-leading':''}">${teamPortrait({team_name:t.name,identity:t.identity})}<span>${esc(t.name)}</span><b>${metrics.lead?.side===(game.sides.indexOf(t)?'right':'left')?`<span class="sr-only">${metrics.lead.label}: </span>`:''}${pts(t.score)}</b></span>`).join('')}</button>`;
 }).join('')}</div>`;
}

export function clubhousePulseHtml(model) {
 const pulse=clubhouseLeaguePulse(model),entries=[
  {label:model.completed?'Week high score':'High score so far',title:pulse.high?.name||'Waiting for points',detail:pulse.high?`${pts(pulse.high.score)} pts`:'Scores will build here'},
  {label:'Top starter',title:pulse.player?.name||'Waiting for kickoff',detail:pulse.player?`${pts(pulse.player.points)} pts · ${pulse.player.owner}`:'The scoreboard keeps receipts'},
  {label:pulse.close?.pressure?'On a knife edge':'Tightest matchup',title:pulse.close?pulse.close.game.sides.map(t=>t.name).join(' vs '):'Kickoff pending',detail:pulse.close?`${pts(pulse.close.margin)}-point gap`:'No live lead to call yet'},
 ];
 return `<div class="clubhouse-pulse-heading"><small>${model.season} · WEEK ${model.week}</small><strong>${model.completed?'The receipts are in.':pulse.live?`${pulse.live} matchup${pulse.live===1?'':'s'} live. Talk your shit.`:'The boys. The matchups. The receipts.'}</strong></div><div class="clubhouse-pulse-grid">${entries.map(e=>`<article><small>${esc(e.label)}</small><strong>${esc(e.title)}</strong><span>${esc(e.detail)}</span></article>`).join('')}</div>`;
}

export function clubhouseTeamStatsHtml(game,completed=false) {
 const view=clubhouseGameMetrics(game,completed);
 const statusRows=[{label:'Live',key:'live'},{label:'Yet to play',key:'upcoming'},{label:'Finished',key:'finished'}];
 return `<div class="clubhouse-battle-stats${view.pressure?' is-close':''}">${view.pressure?'<span class="clubhouse-pressure-label">CLOSE GAME · Every point is a receipt.</span>':''}<table class="clubhouse-status-table"><caption class="sr-only">Starting-player game status</caption><thead><tr><th scope="col">${esc(game.sides[0].name)}</th><th scope="col"><span class="sr-only">Status</span></th><th scope="col">${esc(game.sides[1].name)}</th></tr></thead><tbody>${statusRows.map(row=>`<tr><td>${view.teams[0][row.key]??'—'}</td><th scope="row">${row.label}</th><td>${view.teams[1][row.key]??'—'}</td></tr>`).join('')}</tbody></table><div class="clubhouse-starter-progress">${view.teams.map(t=>`<div><span class="clubhouse-finish-track" aria-label="${t.finished==null?'Starter completion unavailable':`${t.finished} of ${t.total} starters finished`}">${Array.from({length:t.total},(_,i)=>`<i${i<(t.finished||0)?' class="is-finished"':''}></i>`).join('')}</span></div>`).join('')}</div></div>`;
}

export function clubhousePositionStatsHtml(game,completed=false) {
 const {positional,phase}=clubhouseGameMetrics(game,completed);
 const leader=row=>!['unknown','upcoming'].includes(phase.key)&&row.left!=null&&row.right!=null&&row.left!==row.right?(row.left>row.right?'left':'right'):null;
 return `<details class="clubhouse-position-stats"><summary>Points by position</summary><table><caption class="sr-only">Actual starting-lineup points by position</caption><thead><tr><th scope="col">Position</th>${game.sides.map(t=>`<th scope="col">${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${positional.map(r=>`<tr><th scope="row">${esc(r.label)}</th>${['left','right'].map(side=>`<td${leader(r)===side?' class="is-ahead"':''}>${pts(r[side])}</td>`).join('')}</tr>`).join('')}</tbody></table></details>`;
}
