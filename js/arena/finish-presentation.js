import {esc} from '../ui.js';
import {animateUi,cancelUiMotion} from '../ui-motion.js';
import {kitInk} from './racer-kit-model.js';
import {drawCharacterRunner} from './racer-character-art.js';
import {finishTime} from './finish-model.js';

const badge=racer=>`<span class="sr-jersey" aria-label="Racer ${racer.raceNumber}" style="--jersey:${racer.kit.jersey};--jersey-ink:${kitInk(racer.kit.jersey)}">${racer.raceNumber}</span>`;
const identity=racer=>racer.profile?`<a href="#/profile?id=${encodeURIComponent(racer.id)}">${esc(racer.name)}</a>`:`<span>${esc(racer.name)}</span>`;

export function finishMarkup(finish){
 if(!finish)return '';
 return `<header class="sr-finish-heading"><span class="sr-kicker">OFFICIAL ORDER · ${finish.rows.length} RACERS</span><h2>That’s the fucking order.</h2>${finish.margin!==null?`<p class="sr-finish-margin"><span>${finish.photoFinish?'Photo finish':'Winning margin'}</span><strong>${finishTime(finish.margin)}</strong></p>`:''}</header>
 <div class="sr-podium" data-podium-count="${finish.podium.length}" aria-label="Podium">${finish.podium.map(racer=>`<article class="sr-podium-place" data-place="${racer.place}">
 <div class="sr-podium-art" aria-hidden="true"><span class="sr-podium-watermark">${racer.place}</span><canvas width="224" height="244" data-podium-racer="${esc(racer.id)}"></canvas></div>
 <div class="sr-podium-identity"><b>${racer.place===1?'WINNER':`${racer.place===2?'2ND':'3RD'} PLACE`}</b><strong>${identity(racer)}</strong>${badge(racer)}<span class="sr-podium-time">${finishTime(racer.time)}</span></div>
 </article>`).join('')}</div>
 <section class="sr-finish-classification"><header><h3>Finish order</h3><span>TIME / GAP</span></header><ol class="sr-finish-order" aria-label="Official finishing order">${finish.rows.map(racer=>`<li data-finish-racer="${esc(racer.id)}"><b class="sr-finish-place">${racer.place}</b><canvas width="84" height="96" data-finish-art="${esc(racer.id)}" aria-hidden="true"></canvas><div class="sr-finish-name">${identity(racer)}${racer.team?`<small>${esc(racer.team)}</small>`:''}</div><div class="sr-finish-time"><strong>${finishTime(racer.time)}</strong><small>${racer.place===1?'WINNER':racer.gap===null?'—':`+${finishTime(racer.gap)}`}</small></div>${badge(racer)}</li>`).join('')}</ol></section>`;
}

// Static, high-resolution character art is painted once. The reveal animates
// only opacity/transforms, with no race loop or per-frame layout measurement.
export function mountFinishPresentation(host,finish,{motion=()=>true}={}){
 host.innerHTML=finishMarkup(finish);
 const racers=new Map(finish.rows.map(racer=>[racer.id,racer]));
 for(const canvas of host.querySelectorAll('[data-podium-racer],[data-finish-art]')){
  const podium=canvas.hasAttribute('data-podium-racer'),racer=racers.get(canvas.dataset.podiumRacer||canvas.dataset.finishArt);
  drawCharacterRunner(canvas.getContext('2d'),racer.kit,{width:canvas.width,height:canvas.height,identity:racer.id,moving:false,celebrate:podium&&racer.place===1});
 }
 let revealed=false,stopped=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const allowed=()=>motion()&&!reduced.matches&&document.documentElement.dataset.uiMotion!=='off'&&!document.hidden;
 const preference=()=>{if(!allowed())cancelUiMotion(host);};
 reduced.addEventListener('change',preference);window.addEventListener('dfl:ui-motion-change',preference);document.addEventListener('visibilitychange',preference);
 const reveal=()=>{
  if(stopped||revealed||host.hidden||!host.isConnected)return;
  revealed=true;observer?.disconnect();
  const cards=[...host.querySelectorAll('.sr-podium-place')].sort((a,b)=>Number(a.dataset.place)-Number(b.dataset.place));
  cards.forEach((card,index)=>animateUi(card,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}],{duration:420,delay:index*70,fill:'backwards',motion:allowed()}));
  host.querySelectorAll('.sr-finish-order>li').forEach((row,index)=>animateUi(row,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,delay:Math.min(index*20,160),fill:'backwards',motion:allowed()}));
 };
 const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting))reveal()},{threshold:.08}):null;
 observer?.observe(host);if(!observer)reveal();
 return {reveal,stop(){stopped=true;observer?.disconnect();cancelUiMotion(host);reduced.removeEventListener('change',preference);window.removeEventListener('dfl:ui-motion-change',preference);document.removeEventListener('visibilitychange',preference);}};
}
