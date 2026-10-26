import {loadHomeHighlights} from './home-highlight-data.js';
import {activeHighlightClips,highlightSession,highlightThumbnail} from './home-highlight-model.js';
import {homeHighlightMarkup,reelQueueMarkup,highlightPosterUrl} from './home-highlight-ui.js';
import {patchGameDay} from './game-day-dom.js';
import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {readPageChoice} from './page-disclosure.js';
import {animateUi,cancelUiMotion,exitUi,cancelUiExit} from './ui-motion.js';
import {fitDialogToViewport} from './dialog-viewport.js';

export function mountHomeHighlights(root,{active=()=>root.isConnected,load=loadHomeHighlights,now=()=>Date.now()}={}){
 let stopped=false,nearby=typeof IntersectionObserver==='undefined',clips=[],selected='',dialog=null,opener=null,expiryTimer=null,stopViewport=()=>{},request=0;
 const posterError=event=>{
  const image=event.target;if(image.tagName!=='IMG'||image.dataset.posterFallback)return;
  try{const url=new URL(image.src),source=url.hostname==='a.espncdn.com'&&url.pathname==='/combiner/i'?highlightThumbnail(url.searchParams.get('img')):null;
   if(source){image.dataset.posterFallback='1';image.src=source}
  }catch{/* Keep the fixed poster frame if a publisher image is unavailable. */}
 };
 const current=()=>!stopped&&root.isConnected&&active(),motion=()=>readPageChoice('gameday-motion',['on','off'],'on')==='on'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const close=({animated=false}={})=>{if(dialog?.open){if(animated)exitUi(dialog,()=>dialog.close(),{immediate:!motion(),duration:150});else{cancelUiExit(dialog);dialog.close()}}};
 const visibleClips=()=>activeHighlightClips(clips,now());
 const drawPlayer=(replace=false)=>{
  if(!dialog?.open)return;
  const valid=visibleClips(),index=valid.findIndex(clip=>clip.id===selected),clip=valid[index];if(!clip){close();return}
  dialog.querySelector('[data-reel-headline]').textContent=clip.headline;
  dialog.querySelector('[data-reel-context]').textContent=clip.game_label+' · ESPN';
  dialog.querySelector('[data-reel-count]').textContent=`${index+1} / ${valid.length}`;
  dialog.querySelector('[data-reel-previous]').disabled=index===0;dialog.querySelector('[data-reel-next]').disabled=index===valid.length-1;
  patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup(valid,selected));
  if(replace){
   const link=document.createElement('a');link.href=clip.source_url;link.target='_blank';link.rel='noopener noreferrer';link.className='home-reel-source-play';
   link.setAttribute('aria-label',`Watch ${clip.headline} on ESPN`);
   const image=document.createElement('img');image.src=highlightPosterUrl(clip.thumbnail_url);image.alt='';
   const label=document.createElement('span');label.innerHTML='Watch clip on ESPN <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M7 7h10v10"/></svg>';link.append(image,label);
   dialog.querySelector('[data-reel-screen]').replaceChildren(link);
   if(motion())animateUi(link,[{opacity:.4},{opacity:1}],{duration:180});
  }
 };
 const choose=id=>{
  if(!visibleClips().some(clip=>clip.id===id))return;
  selected=id;drawPlayer(true);
  const queue=dialog.querySelector('[data-reel-queue]'),button=queue.querySelector(`[data-reel-choose="${id}"]`);
  queue.scrollTo({left:Math.max(0,button.offsetLeft-queue.offsetLeft-queue.clientWidth/2+button.clientWidth/2),behavior:motion()?'smooth':'instant'});
 };
 const setup=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='home-reel-player';dialog.setAttribute('aria-labelledby','home-reel-player-title');
  dialog.innerHTML='<header><h2 id="home-reel-player-title" tabindex="-1">GameDay reel</h2><span data-reel-count></span><button type="button" class="linkbtn" data-reel-close>Close</button></header><div class="home-reel-screen" data-reel-screen></div><div class="home-reel-player-copy"><small data-reel-context></small><h3 data-reel-headline></h3></div><nav class="home-reel-player-controls" aria-label="Reel playback"><button type="button" class="btn ghost" data-reel-previous>Previous</button><button type="button" class="btn" data-reel-next>Next clip →</button></nav><div class="home-reel-queue" data-reel-queue role="group" aria-label="Choose a highlight"></div>';
  document.body.append(dialog);dialog.addEventListener('error',posterError,true);
  dialog.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-reel-close')){close({animated:true});return}
   if(button.dataset.reelChoose){choose(button.dataset.reelChoose);return}
   const valid=visibleClips(),index=valid.findIndex(clip=>clip.id===selected),step=button.hasAttribute('data-reel-next')?1:button.hasAttribute('data-reel-previous')?-1:0;
   if(step&&valid[index+step])choose(valid[index+step].id);
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();close({animated:true})});
  dialog.addEventListener('close',()=>{stopViewport();cancelUiMotion(dialog);if(current()&&opener?.isConnected)opener.focus({preventScroll:true})});
 };
 const open=(id,source)=>{
  clips=visibleClips();if(!clips.length){paint();return}
  opener=source;setup();cancelUiExit(dialog);selected=id||clips[0].id;
  dialog.showModal();stopViewport=fitDialogToViewport(dialog);drawPlayer(true);dialog.querySelector('h2').focus({preventScroll:true});
  if(motion())animateUi(dialog,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.75,.25,1)'});
 };
 const scheduleExpiry=()=>{
  clearTimeout(expiryTimer);const deadline=Math.min(highlightSession(now()).expiresAt,...clips.map(clip=>Date.parse(clip.expires_at)));
  expiryTimer=setTimeout(()=>{if(current()){paint();void loop.request(true)}},Math.max(1,deadline-now()+20));
 };
 const paint=()=>{
  if(!current())return;
  clips=visibleClips();patchGameDay(root,homeHighlightMarkup(clips,now()));drawPlayer();scheduleExpiry();
 };
 const loop=mountLiveScoreRefresh({active:()=>current()&&nearby,interval:120000,refresh:async()=>{
  const token=++request,rows=await load({now:now()});if(!current()||token!==request)return;
  clips=activeHighlightClips(rows,now());paint();
 },onError:()=>{if(current())paint()}});
 const click=event=>{const button=event.target.closest('[data-home-reel-open],[data-home-reel-clip]');if(button)open(button.dataset.homeReelClip,button)};
 const hidden=()=>{if(!document.hidden&&current())paint()};
 root.addEventListener('error',posterError,true);root.addEventListener('click',click);document.addEventListener('visibilitychange',hidden);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{nearby=entries.some(entry=>entry.isIntersecting);if(nearby)loop.wake()},{rootMargin:'120px 0px'});observer?.observe(root);
 loop.start();scheduleExpiry();
 return {refresh:()=>loop.request(true),stop(){stopped=true;request++;clearTimeout(expiryTimer);observer?.disconnect();loop.stop();root.removeEventListener('error',posterError,true);root.removeEventListener('click',click);document.removeEventListener('visibilitychange',hidden);stopViewport();close();dialog?.remove()}};
}
