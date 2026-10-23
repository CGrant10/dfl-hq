import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {teamPortrait} from './team-presentation.js';
import {accentOf} from './identity-rules.js';
import {animateUi,cancelUiMotion,cancelUiExit} from './ui-motion.js';
import {enterSheet,exitSheet,mountSheetDrag} from './sheet-drag.js';
import {fitDialogToViewport} from './dialog-viewport.js';
import {mountSwipeTabs} from './swipe-tabs.js';

export function momentRecapFrames(items=[],matchupId=null){
 const unique=new Map(items.filter(m=>m&&['lead','big','surge'].includes(m.kind)&&Number.isFinite(m.at)&&m.text&&(matchupId==null||m.matchupId===String(matchupId))).map(m=>[String(m.key),m]));
 const moments=[...unique.values()].sort((a,b)=>a.at-b.at||String(a.key).localeCompare(String(b.key),undefined,{numeric:true})).slice(-8);
 if(!moments.length)return [];
 return [...moments.map(m=>({...m,title:m.kind==='lead'?'Lead change':m.kind==='surge'?'Scoring surge':'Big day'})),{key:'recap:close',kind:'close',title:'Receipts saved.',text:'Talk your shit. The numbers are right here.'}];
}
export function momentRecapFrame(frame){
 const art=frame.player?playerPortrait(frame.player):frame.team?teamPortrait(frame.team):'<span class="recap-finish" aria-hidden="true">DFL</span>';
 const facts=frame.recap,known=v=>typeof v==='number'&&Number.isFinite(v),fmt=v=>v.toFixed(2);
 const faceoff=frame.kind==='lead'&&facts?.sides?.length===2&&facts.sides.every(t=>known(t.points));
 const player=frame.player&&known(facts?.points),surge=frame.kind==='surge';
 const chirp=faceoff?'New lead. New shit to talk.':player?surge?'That’s a hell of a swing.':facts.points>=30?'Somebody came to fuck shit up.':'Carrying the lineup. And the conversation.':'';
 const content=faceoff?`<div class="moment-recap-faceoff">${facts.sides.map(t=>`<section class="${t.leading?'is-leading':''}" style="--recap-team:${esc(accentOf(t.identity))}">${teamPortrait(t)}<strong>${esc(t.team_name)}</strong><b>${fmt(t.points)}</b></section>`).join('')}</div><h3>${esc(frame.team?.team_name||'The lead')} moves ahead.</h3>`
  :player?`<div class="moment-recap-spotlight"><div class="moment-recap-art">${art}</div><div class="moment-recap-stat"><strong>${surge&&known(facts.delta)?'+'+fmt(facts.delta):fmt(facts.points)}</strong><span>${surge?'Since previous sync':'Fantasy points'}</span></div></div><h3>${esc(frame.player.name)}</h3>${frame.team?`<p class="moment-recap-owner">${esc(frame.team.team_name)}</p>`:''}${surge&&known(facts.before)?`<div class="moment-recap-score-path" aria-label="Fantasy points before and after the saved sync"><span><small>Before</small><b>${fmt(facts.before)}</b></span><i aria-hidden="true">→</i><span><small>After</small><b>${fmt(facts.points)}</b></span></div>`:''}`
  :`<div class="moment-recap-art">${art}</div><h3>${esc(frame.text)}</h3>`;
 return `<article class="moment-recap-frame is-${esc(frame.kind)}" style="--recap-team:${esc(accentOf(frame.team?.identity))}"><small>${esc(frame.title)}</small>${content}${faceoff||player?`<span class="sr-only">${esc(frame.text)}</span>`:''}${chirp?`<p class="moment-recap-chirp">${esc(chirp)}</p>`:''}${frame.at?`<time datetime="${new Date(frame.at).toISOString()}">Observed ${esc(new Date(frame.at).toLocaleString(undefined,{weekday:'short',hour:'numeric',minute:'2-digit'}))}</time>`:''}</article>`;
}
export function mountMomentRecap({getMotion=()=>true,returnFocus=()=>null}={}){
 const dialog=document.createElement('dialog');dialog.className='gd-moment-recap';dialog.setAttribute('aria-labelledby','moment-recap-title');
 dialog.innerHTML='<header><span class="dfl-sheet-grip" aria-hidden="true"></span><h2 id="moment-recap-title" tabindex="-1">GameDay recap</h2><button type="button" class="linkbtn" data-recap-close>Close</button></header><div class="moment-recap-progress" role="group" aria-label="Recap moments"></div><div class="moment-recap-deck" data-recap-frame></div><p class="moment-recap-count"></p><p class="sr-only" role="status" aria-atomic="true" data-recap-announcement></p><footer><button type="button" class="btn ghost" data-recap-back>Back</button><button type="button" class="btn" data-recap-play>Play</button><button type="button" class="btn ghost" data-recap-next>Next</button></footer>';
 document.body.append(dialog);let frames=[],index=0,playing=false,timer=0,opener=null,stopped=false,stopViewport=()=>{},stopSwipe=()=>{};
 const deck=dialog.querySelector('[data-recap-frame]'),progress=dialog.querySelector('.moment-recap-progress');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const pause=()=>{playing=false;clearTimeout(timer);dialog.querySelector('[data-recap-play]').textContent=index===frames.length-1?'Replay':'Play'};
 const schedule=()=>{clearTimeout(timer);if(playing&&dialog.open&&!document.hidden)timer=setTimeout(()=>step(1),4500)};
 const draw=(direction=0)=>{
  const panels=[...deck.querySelectorAll(':scope > [data-recap-index]')];
  panels.forEach((panel,i)=>{panel.hidden=i!==index});
  progress.querySelectorAll('button').forEach((button,i)=>{button.setAttribute('aria-pressed',String(i===index));button.classList.toggle('is-seen',i<=index)});
  dialog.querySelector('.moment-recap-count').textContent=`${index+1} of ${frames.length}`;
  dialog.querySelector('[data-recap-announcement]').textContent=`Moment ${index+1} of ${frames.length}. ${frames[index].title}. ${frames[index].text}`;
  const back=dialog.querySelector('[data-recap-back]'),next=dialog.querySelector('[data-recap-next]'),focused=document.activeElement;back.disabled=index===0;next.disabled=index===frames.length-1;
  if(focused===back&&back.disabled||focused===next&&next.disabled)dialog.querySelector('[data-recap-play]').focus({preventScroll:true});
  const panel=panels[index];
  if(direction&&!panel.dataset.uiSwipeSettling)animateUi(panel,[{opacity:.35,transform:`translateX(${direction*20}px)`},{opacity:1,transform:'none'}],{duration:280,motion:getMotion()});
  deck.scrollTop=0;
  if(index===frames.length-1)pause();else dialog.querySelector('[data-recap-play]').textContent=playing?'Pause':'Play';schedule();
 };
 const go=next=>{const previous=index;index=Math.max(0,Math.min(frames.length-1,next));draw(Math.sign(index-previous))};
 const step=direction=>go(index+direction);
 const resetSwipe=()=>{stopSwipe();stopSwipe=mountSwipeTabs(deck,progress,{getButtons:()=>[...progress.querySelectorAll('button')],getPanel:()=>deck.querySelector(`:scope > [data-recap-index="${index}"]`),getPanelForButton:button=>deck.querySelector(`:scope > [data-recap-index="${button.dataset.recapGo}"]`),selected:button=>button.getAttribute('aria-pressed')==='true',accepts:()=>dialog.open&&!dialog.dataset.uiClosing&&getMotion()&&!reduced.matches,activate:button=>{pause();go(Number(button.dataset.recapGo))}})};
 const close=({immediate=false}={})=>{pause();stopSwipe();cancelUiMotion(deck);exitSheet(dialog,()=>{drag.reset();dialog.close()},{immediate})};
 const drag=mountSheetDrag(dialog,{handle:dialog.querySelector('header'),dismiss:()=>close(),onStart:()=>{pause();resetSwipe()}});
 dialog.addEventListener('click',event=>{
  event.stopPropagation();if(event.target===dialog||event.target.closest('[data-recap-close]'))close();
  else if(event.target.closest('[data-recap-go]')){resetSwipe();pause();go(Number(event.target.closest('[data-recap-go]').dataset.recapGo))}
  else if(event.target.closest('[data-recap-back],[data-recap-next]')){resetSwipe();pause();step(event.target.closest('[data-recap-back]')?-1:1)}
  else if(event.target.closest('[data-recap-play]')){resetSwipe();if(playing){pause();return}if(index===frames.length-1)index=0;playing=true;draw()}
 });
 deck.addEventListener('pointerdown',pause,{passive:true});
 dialog.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();resetSwipe();pause();step(event.key==='ArrowLeft'?-1:1)}});
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('close',()=>{if(dialog.open)return;pause();cancelUiMotion(dialog);cancelUiExit(dialog);stopViewport();if(!stopped)(opener?.isConnected?opener:returnFocus())?.focus({preventScroll:true})});
 const interrupt=()=>{dialog.dataset.motion=getMotion()?'on':'off';if(document.hidden||!getMotion()||reduced.matches){pause();cancelUiMotion(dialog)}};
 document.addEventListener('visibilitychange',interrupt);window.addEventListener('dfl:ui-motion-change',interrupt);reduced.addEventListener('change',interrupt);
 return {open(items,matchupId=null){if(stopped)return;const next=momentRecapFrames(items,matchupId);if(!next.length)return;stopSwipe();cancelUiExit(dialog);drag.reset();cancelUiMotion(dialog);stopViewport();frames=next;if(!dialog.contains(document.activeElement))opener=document.activeElement;index=0;pause();dialog.dataset.motion=getMotion()?'on':'off';deck.innerHTML=frames.map((frame,i)=>momentRecapFrame(frame).replace('<article ',`<article data-recap-index="${i}"${i?' hidden':''} `)).join('');progress.innerHTML=frames.map((frame,i)=>`<button type="button" data-recap-go="${i}" aria-label="Moment ${i+1}: ${esc(frame.title)}" aria-pressed="${i===0}"><i aria-hidden="true"></i></button>`).join('');draw();resetSwipe();if(!dialog.open)dialog.showModal();stopViewport=fitDialogToViewport(dialog)||(()=>{});enterSheet(dialog,{motion:getMotion()});dialog.querySelector('h2').focus({preventScroll:true})},stop(){stopped=true;pause();stopSwipe();drag.stop();stopViewport();cancelUiMotion(dialog);cancelUiExit(dialog);dialog.close();dialog.remove();document.removeEventListener('visibilitychange',interrupt);window.removeEventListener('dfl:ui-motion-change',interrupt);reduced.removeEventListener('change',interrupt)}};
}
