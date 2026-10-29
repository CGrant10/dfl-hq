import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
const arrow='<svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg>';
const short=value=>{const text=String(value||'').trim();return text.length<=110?text:text.slice(0,107).replace(/\s+\S*$/,'')+'…'};
const marks={award:'M5 4h10v5a5 5 0 0 1-10 0V4Zm0 1H2v3a4 4 0 0 0 4 4m9-7h3v3a4 4 0 0 1-4 4m-4 2v4m-4 0h8',trade:'M3 6h14m-4-4 4 4-4 4M17 14H3m4-4-4 4 4 4',result:'M3 17V9h4v8m3 0V3h4v14m3 0v-5',rivalry:'m3 3 14 14M3 17 17 3m-5 0h5v5M3 12v5h5',metric:'M3 17h14M5 13l4-5 4 2 4-7',season:'M5 2v4m10-4v4M3 8h14M3 4h14v14H3z',news:'M3 3h14v14H3zM6 6h8M6 9h8M6 12h3m3 0h2',scout:'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12Zm4 0 4 4',injury:'M7 2h6v5h5v6h-5v5H7v-5H2V7h5z'};
const mark=kind=>`<svg class="bx-brief-mark" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${marks[kind]||marks.news}"/></svg>`;
const art=src=>`<span class="bx-brief-art" aria-hidden="true"><img src="${esc(src)}" alt="" decoding="async"></span>`;
const footer=(text,detail='')=>`<span class="bx-brief-action">${detail?`<span class="bx-brief-detail">${detail}</span>`:''}<span>${esc(text)} ${arrow}</span></span>`;
export function renderBroadcastBrief(item){
 if(!item)return '';
 let kind='news',heading=item.headline||'',body='',media='',detail='',action=item.actionLabel||'Open story',href=item.href||'',tag=href?'a':'section';
 if(item.treatment==='champion'){
  kind='award';const chip=item.variant==='chip';media=art(`assets/dfl-daily-${chip?'chip-eater':'champion'}.webp`);
  body='';action=chip?'The wall of shame':'The title ledger';href=href||'#/history';tag='a';
 }else if(item.kind==='trade'&&item.tradeStory?.packages?.length){
  kind='trade';heading=item.tradeStory.outcome?.displayGrade||item.tradeStory.outcome?.grade||'Trade receipt';action='Open receipt';
  body=`<div class="bx-brief-packages" style="--bx-parties:${Math.min(3,item.tradeStory.packages.length)}">${item.tradeStory.packages.slice(0,3).map(pkg=>`<div class="bx-brief-package"><small title="${esc(pkg.teamName)}">${esc(pkg.teamName)} sends</small>${pkg.players?.[0]?playerPortrait(pkg.players[0]):''}<strong>${esc(pkg.players?.[0]?.name||'Trade package')}${pkg.players?.length>1?` <span>+${pkg.players.length-1}</span>`:''}</strong></div>`).join('')}</div>`;
  if(item.tradeStory.packages.length>3)detail=`${item.tradeStory.packages.length}-team trade`;
  if(item.figure!==null&&item.figure!==undefined&&String(item.figure).trim())detail=`<b>${esc(item.figure)}${typeof item.figure==='number'?'%':''}</b> ${esc(item.tradeStory.balanceLabel||'value balance')}${detail?' · '+detail:''}`;
 }else if(item.sides?.length===2){
  kind='result';action=item.kind==='golf'?'Open golf day':'View matchup';body=`<div class="bx-brief-scores">${item.sides.map(s=>`<div${s.up?' class="is-winner"':''}><strong>${esc(s.name)}</strong><b>${esc(s.score)}</b></div>`).join('')}</div>`;
  const scores=item.sides.map(s=>s.score===null||s.score===undefined||String(s.score).trim()===''?NaN:Number(s.score));
  if(item.kind!=='golf'&&item.temporal==='final'&&scores.every(Number.isFinite))detail=`<b>${Math.abs(scores[0]-scores[1]).toFixed(2)}</b> pt margin`;
 }else if(item.treatment==='injuries'){
  kind='injury';heading='Injury watch';tag='section';href='';action='Full injury report';
  body=`<div class="bx-brief-injuries">${(item.players||[]).slice(0,2).map(p=>`<div><strong>${esc(p.name)}</strong><b>${esc(p.tag||p.availability)}</b></div>`).join('')||'<p>No injury updates available.</p>'}</div>`;
 }else if(item.storyKind==='rivalry'){
  kind='rivalry';heading=item.headline||'The rivalry';body=`<div class="bx-brief-rivals">${(item.storyNames||[]).map(n=>`<strong>${esc(n)}</strong>`).join('<span>vs</span>')}</div>${item.storySeries?`<b class="bx-brief-series" aria-label="Series ${esc(item.storySeries)}">${esc(item.storySeries)}</b>`:''}`;action='Open the ledger';
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
 const title=`<h2 class="bx-head">${esc(heading)}</h2>`,content=body?`<div class="bx-brief-body">${body}</div>`:'';
 return `<${tag} class="bx-slide bx-brief bx-brief-${kind}${kind==='award'&&item.variant==='chip'?' bx-brief-chip':''}${media?' bx-brief-with-art':''}"${href?` href="${esc(href)}"`:''}${kind==='trade'?` aria-label="${esc(heading+'. '+item.tradeStory.packages.map(p=>p.teamName+' sends '+(p.players||[]).map(player=>player.name).join(', ')).join('. '))}"`:''}><span class="bx-kicker">${mark(kind)}${esc(item.kicker)}${phase?` <span class="bx-brief-phase">· ${esc(phase)}</span>`:''}</span>${kind==='result'?content+title:title+content}${media}${kind==='injury'?`<button type="button" class="bx-brief-action" data-open-injury-report>${esc(action)} ${arrow}</button>`:href?footer(action,detail):''}</${tag}>`;
}
