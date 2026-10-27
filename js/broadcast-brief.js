import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
const arrow='<svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg>';
const short=value=>{const text=String(value||'').trim();return text.length<=110?text:text.slice(0,107).replace(/\s+\S*$/,'')+'…'};
const art=src=>`<span class="bx-brief-art" aria-hidden="true"><img src="${esc(src)}" alt="" decoding="async"></span>`;
const footer=text=>`<span class="bx-brief-action">${esc(text)} ${arrow}</span>`;
export function renderBroadcastBrief(item){
 if(!item)return '';
 let kind='news',heading=item.headline||'',body='',media='',action=item.actionLabel||'Open story',href=item.href||'',tag=href?'a':'section';
 if(item.treatment==='champion'){
  kind='award';const chip=item.variant==='chip';media=art(`assets/dfl-daily-${chip?'chip-eater':'champion'}.webp`);
  body='';action=chip?'The wall of shame':'The title ledger';href=href||'#/history';tag='a';
 }else if(item.kind==='trade'&&item.tradeStory?.packages?.length){
  kind='trade';heading=item.tradeStory.outcome?.displayGrade||item.tradeStory.outcome?.grade||'Trade receipt';action='Open receipt';
  body=`<div class="bx-brief-packages" style="--bx-parties:${Math.min(3,item.tradeStory.packages.length)}">${item.tradeStory.packages.slice(0,3).map(pkg=>`<div class="bx-brief-package"><small title="${esc(pkg.teamName)}">${esc(pkg.teamName)} sends</small>${pkg.players?.[0]?playerPortrait(pkg.players[0]):''}<strong>${esc(pkg.players?.[0]?.name||'Trade package')}${pkg.players?.length>1?` <span>+${pkg.players.length-1}</span>`:''}</strong></div>`).join('')}</div>`;
 }else if(item.sides?.length===2){
  kind='result';action=item.kind==='golf'?'Open golf day':'View matchup';body=`<div class="bx-brief-scores">${item.sides.map(s=>`<div><strong>${esc(s.name)}</strong><b>${esc(s.score)}</b></div>`).join('')}</div>`;
 }else if(item.treatment==='injuries'){
  kind='injury';heading='Injury watch';tag='section';href='';action='Full injury report';
  body=`<div class="bx-brief-injuries">${(item.players||[]).slice(0,2).map(p=>`<div><strong>${esc(p.name)}</strong><b>${esc(p.tag||p.availability)}</b></div>`).join('')||'<p>No injury updates available.</p>'}</div>`;
 }else if(item.storyKind==='rivalry'){
  kind='rivalry';heading='The rivalry';body=`<div class="bx-brief-rivals">${(item.storyNames||[]).map(n=>`<strong>${esc(n)}</strong>`).join('<span>vs</span>')}</div>${item.storySeries?`<b class="bx-brief-series">${esc(item.storySeries)}</b>`:''}`;action='Open the ledger';
 }else if(item.kind==='season'){
  kind='season';heading=item.headline||'Seasons';media=`<strong class="bx-brief-number">${esc(item.figure)}</strong>`;body=`<p>${esc(item.subtitle)}</p>`;action='League archive';
 }else if(item.figure!=null){
  kind='metric';media=`<div class="bx-brief-value" style="--bx-digits:${String(item.figure).length}"><strong>${esc(typeof item.figure==='number'&&!Number.isInteger(item.figure)?item.figure.toFixed(2):item.figure)}</strong>${item.figureLabel?`<small>${esc(item.figureLabel)}</small>`:''}</div>`;body=item.subtitle?`<p>${esc(short(item.subtitle))}</p>`:'';
 }else if(item.generator==='nextMove'&&item.scoutPlayer){
  kind='scout';media=`<span class="bx-brief-art">${playerPortrait(item.scoutPlayer)}</span>`;heading=item.scoutPlayer.name;body=`<p>${esc(short(item.subtitle||item.headline))}</p>`;action='Open Auto Scout';
 }else{
  if(item.image)media=art(item.image);
  body=item.body||item.subtitle?`<p>${esc(short(item.body||item.subtitle))}</p>`:'';
 }
 const phase=(kind==='result'||item.treatment==='event')&&['live','upcoming','final'].includes(item.temporal)&&!new RegExp(item.temporal,'i').test(item.kicker||'')?item.temporal:'';
 return `<${tag} class="bx-slide bx-brief bx-brief-${kind}${media?' bx-brief-with-art':''}"${href?` href="${esc(href)}"`:''}${kind==='trade'?` aria-label="${esc(heading+'. '+item.tradeStory.packages.map(p=>p.teamName+' sends '+(p.players||[]).map(player=>player.name).join(', ')).join('. '))}"`:''}><span class="bx-kicker">${esc(item.kicker)}${phase?` <span class="bx-brief-phase">· ${esc(phase)}</span>`:''}</span><h2 class="bx-head">${esc(heading)}</h2>${body?`<div class="bx-brief-body">${body}</div>`:''}${media}${kind==='injury'?`<button type="button" class="bx-brief-action" data-open-injury-report>${esc(action)} ${arrow}</button>`:href?footer(action):''}</${tag}>`;
}
