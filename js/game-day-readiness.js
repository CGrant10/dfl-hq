import {esc} from './ui.js';
import {lineupRescuePlan} from './lineup-alert-model.js';

export function starterWarnings(lineup=[],{completed=false}={}) {
  if(completed)return [];
  return lineup.flatMap(player=>{
    if(player.empty)return [{...player,reason:'Empty slot',tone:'danger'}];
    if(!['upcoming','unknown'].includes(player.state))return [];
    const reserve=/^(ir|injured reserve|pup|suspended)$/i.test(player.availabilityStatus||'')?player.availabilityStatus:'';
    const status=String(reserve||player.injuryStatus||'').trim();
    if(/^(out|ir|injured reserve|pup|suspended|doubtful)$/i.test(status))return [{...player,reason:status,tone:'danger'}];
    if(/^(questionable|q)$/i.test(status))return [{...player,reason:'Questionable',tone:'caution'}];
    return [];
  });
}

export function lineupCheckHtml(sides=[],{completed=false}={}) {
  const groups=sides.map(team=>({team,warnings:starterWarnings(team.lineup,{completed}),rescues:lineupRescuePlan(team,{completed})})).filter(group=>group.warnings.length);
  if(!groups.length)return '';
  const all=groups.flatMap(group=>group.warnings),empty=all.filter(p=>p.empty).length,flags=all.length-empty;
  const summary=[empty?`${empty} open slot${empty===1?'':'s'}`:'',flags?`${flags} status flag${flags===1?'':'s'}`:''].filter(Boolean).join(' · ');
  return `<details class="gd-lineup-check" data-lineup-check><summary><span>Lineup check</span><small>${esc(summary)}</small></summary><div>${groups.map(({team,warnings,rescues})=>`<section><strong>${esc(team.name)}</strong><ul>${warnings.map(p=>{const rescue=rescues.find(r=>r.player.id===p.id);return `<li data-warning-tone="${p.tone}"><span><b>${esc(p.empty?`${p.slot||'Starter'} slot`:p.name)}</b><small>${esc([p.empty?'':p.slot,kickoffLabel(p.kickoff)].filter(Boolean).join(' · '))}</small>${rescue?.actionable?`<small class="gd-rescue">${rescue.backup?`Backup: ${esc(rescue.backup.name)}${rescue.severity==='questionable'?(rescue.lateCover?' · late-game cover':' · kicks off earlier'):''}`:'No healthy, unlocked bench backup'} · set changes in Sleeper</small>`:''}</span><em>${esc(p.reason)}</em></li>`}).join('')}</ul></section>`).join('')}</div></details>`;
}

export function kickoffLabel(value) {
  const date=new Date(value);
  return value&&Number.isFinite(date.getTime())?date.toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}):'';
}
