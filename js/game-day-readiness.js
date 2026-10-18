import {esc} from './ui.js';
import {lineupRescuePlan} from './lineup-alert-model.js';

export function starterWarnings(lineup=[],{completed=false,now=Date.now()}={}) {
  const plans=lineupRescuePlan({lineup},{completed,now});
  return lineup.flatMap(player=>{
    const plan=plans.find(p=>p.player===player);if(!plan)return [];
    return [{...player,reason:player.empty?'Empty slot':plan.severity==='questionable'?'Questionable':plan.status,tone:plan.severity==='out'?'danger':'caution'}];
  });
}

export function lineupCheckHtml(sides=[],{completed=false,now=Date.now()}={}) {
  const groups=sides.map(team=>({team,warnings:starterWarnings(team.lineup,{completed,now}),rescues:lineupRescuePlan(team,{completed,now})})).filter(group=>group.warnings.length);
  if(!groups.length)return '';
  const all=groups.flatMap(group=>group.warnings),empty=all.filter(p=>p.empty).length,flags=all.length-empty;
  const summary=[empty?`${empty} open slot${empty===1?'':'s'}`:'',flags?`${flags} status flag${flags===1?'':'s'}`:''].filter(Boolean).join(' · ');
  const urgent=groups.some(g=>g.rescues.some(r=>r.actionable&&r.severity==='out'&&Number.isFinite(Date.parse(r.player.kickoff))&&Date.parse(r.player.kickoff)-now<=90*60000));
  return `<details class="gd-lineup-check" data-lineup-check${urgent?' open':''}><summary><span>Lineup check</span><small>${esc(summary)}</small></summary><div>${groups.map(({team,warnings,rescues})=>`<section><strong>${esc(team.name)}</strong><ul>${warnings.map(p=>{const rescue=rescues.find(r=>r.player.id===p.id);return `<li data-warning-tone="${p.tone}"><span><b>${esc(p.empty?`${p.slot||'Starter'} slot`:p.name)}</b><small>${esc([p.empty?'':p.slot,kickoffLabel(p.kickoff)].filter(Boolean).join(' · '))}</small>${rescue?.actionable?`<small class="gd-rescue">${rescue.backup?`Backup: ${esc(rescue.backup.name)}${rescue.severity==='questionable'?(rescue.lateCover?' · late-game cover':' · kicks off earlier'):''}`:'No healthy, unlocked bench backup'} · set changes in Sleeper</small>`:''}</span><em>${esc(p.reason)}</em></li>`}).join('')}</ul></section>`).join('')}</div></details>`;
}

export function kickoffLabel(value) {
  const date=new Date(value);
  return value&&Number.isFinite(date.getTime())?date.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'';
}
