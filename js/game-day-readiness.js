import {esc} from './ui.js';
import {sleeperAction} from './sleeper-links.js';
import {lineupRescuePlan} from './lineup-alert-model.js';

export function starterWarnings(lineup=[],{completed=false,now=Date.now()}={}) {
  const plans=lineupRescuePlan({lineup},{completed,now});
  return lineup.flatMap(player=>{
    const plan=plans.find(p=>p.player===player);if(!plan)return [];
    return [{...player,reason:player.empty?'Empty slot':plan.severity==='questionable'?'Questionable':plan.status,tone:plan.severity==='out'?'danger':'caution'}];
  });
}

export function lineupCheckHtml(sides=[],{completed=false,now=Date.now(),leagueId=null,compact=false}={}) {
  const groups=sides.map(team=>({team,warnings:starterWarnings(team.lineup,{completed,now}),rescues:lineupRescuePlan(team,{completed,now})})).filter(group=>group.warnings.length);
  if(!groups.length)return '';
  const all=groups.flatMap(group=>group.warnings),empty=all.filter(p=>p.empty).length,byes=all.filter(p=>p.state==='bye').length,flags=all.length-empty-byes;
  const summary=[empty?`${empty} open slot${empty===1?'':'s'}`:'',byes?`${byes} on bye`:'',flags?`${flags} status flag${flags===1?'':'s'}`:''].filter(Boolean).join(' · ');
  const urgent=groups.some(g=>g.rescues.some(r=>r.actionable&&r.severity==='out'&&Number.isFinite(r.deadline)&&r.deadline>now&&r.deadline-now<=90*60000));
  return `<details class="gd-lineup-check" data-lineup-check${urgent?' open':''}><summary><span${compact?' class="sr-only"':''}>Lineup check</span><small>${esc(summary)}</small></summary><div>${groups.map(({team,warnings,rescues})=>`<section><strong title="${esc(team.name)}">${esc(team.name)}</strong><ul>${warnings.map(p=>{const rescue=rescues.find(r=>r.player.id===p.id);return `<li data-warning-tone="${p.tone}"><span><b title="${esc(p.empty?`${p.slot||'Starter'} slot`:p.name)}">${esc(p.empty?`${p.slot||'Starter'} slot`:p.name)}</b><small>${esc([p.empty?'':p.slot,kickoffLabel(p.kickoff)].filter(Boolean).join(' · '))}</small>${rescue?.actionable?`<span class="gd-rescue">${rescue.backup?`<span class="gd-rescue-label">${rescue.severity==='questionable'?'Cover':Number.isFinite(rescue.backup.projection)?'Start':'Backup'}</span><strong title="${esc(rescue.backup.name)}">${esc(rescue.backup.name)}</strong><small>${esc([rescue.backup.position,Number.isFinite(rescue.backup.projection)?`${rescue.backup.projection.toFixed(1)} proj.`:'',kickoffLabel(rescue.backup.kickoff),rescue.severity==='questionable'&&!rescue.lateCover?'earlier kickoff':''].filter(Boolean).join(' · '))}</small>`:'<small>No available bench replacement</small>'}</span>`:''}</span><em>${esc(p.reason)}</em></li>`}).join('')}</ul></section>`).join('')}${sleeperAction(leagueId,'roster',{label:'Set lineup in Sleeper'})}</div></details>`;
}

export function kickoffLabel(value) {
  const date=new Date(value);
  return value&&Number.isFinite(date.getTime())?date.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'';
}
