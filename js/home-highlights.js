import {loadHomeHighlights} from './home-highlight-data.js';
import {activeHighlightClips,highlightSession,highlightThumbnail} from './home-highlight-model.js';
import {homeHighlightMarkup,reelQueueMarkup,highlightPosterUrl} from './home-highlight-ui.js';
import {patchGameDay} from './game-day-dom.js';
import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {readPageChoice} from './page-disclosure.js';
import {animateUi,cancelUiMotion,exitUi,cancelUiExit} from './ui-motion.js';
import {fitDialogToViewport} from './dialog-viewport.js';

export function mountHomeHighlights(root,{active=()=>root.isConnected,load=loadHomeHighlights,now=()=>Date.now(),markup=homeHighlightMarkup,title='Weekend reel'}={}){
 let stopped=false,nearby=typeof IntersectionObserver==='undefined',clips=[],selected='',dialog=null,opener=null,expiryTimer=null,stopViewport=()=>{},request=0;
 const posterError=event=>{
  const image=event.target;if(image.tagName!=='IMG'||image.dataset.posterFallback)return;
  try{const url=new URL(image.src),source=url.hostname==='a.espncdn.com'&&url.pathname==='/combiner/i'?highlightThumbnail(url.searchParams.get('img')):null;
   if(source){image.dataset.posterFallback='1';image.src=source}
  }catch{/* Keep the fixed poster frame if a publisher image is unavailable. */}
 };
 const current=()=>!stopped&&root.isConnected&&active(),motion=()=>readPageChoice('gameday-motion',['on','off'],'on')==='on'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stopVideo=()=>{const video=dialog?.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load()}};
 const close=({animated=false}={})=>{stopVideo();if(dialog?.open){if(animated)exitUi(dialog,()=>dialog.close(),{immediate:!motion(),duration:150});else{cancelUiExit(dialog);dialog.close()}}};
 const visibleClips=()=>activeHighlightClips(clips,now());
 const drawPlayer=(replace=false)=>{
  if(!dialog?.open)return;
  const valid=visibleClips(),index=valid.findIndex(clip=>clip.id===selected),clip=valid[index];if(!clip){close();return}
  dialog.querySelector('[data-reel-headline]').textContent=clip.headline;
  dialog.querySelector('[data-reel-context]').textContent=clip.game_label+' · ESPN';
  dialog.querySelector('[data-reel-source]').href=clip.source_url;
  dialog.querySelector('[data-reel-count]').textContent=`${index+1} / ${valid.length}`;
  dialog.querySelector('[data-reel-previous]').disabled=index===0;dialog.querySelector('[data-reel-next]').disabled=index===valid.length-1;
  patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup(valid,selected));
  if(replace){
   stopVideo();dialog.querySelector('[data-reel-error]').hidden=true;
   const screen=dialog.querySelector('[data-reel-screen]');
   if(clip.video_url){
    const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';video.poster=highlightPosterUrl(clip.thumbnail_url);video.src=clip.video_url;
    video.setAttribute('aria-label',clip.headline);
    video.addEventListener('error',()=>{if(current()&&dialog.open&&screen.firstElementChild===video&&video.hasAttribute('src'))dialog.querySelector('[data-reel-error]').hidden=false});
    video.addEventListener('ended',()=>{if(!current()||!dialog.open||screen.firstElementChild!==video)return;const rows=visibleClips(),i=rows.findIndex(row=>row.id===selected);if(i>=0&&rows[i+1])choose(rows[i+1].id)});
    screen.replaceChildren(video);void video.play().catch(()=>{/* Native controls remain available if autoplay needs another tap. */});
    return;
   }
   const link=document.createElement('a');link.href=clip.source_url;link.target='_blank';link.rel='noopener noreferrer';link.className='home-reel-source-play';
   link.setAttribute('aria-label',`Watch ${clip.headline} on ESPN`);
   const image=document.createElement('img');image.src=highlightPosterUrl(clip.thumbnail_url);image.alt='';
   const label=document.createElement('span');label.innerHTML='Watch clip on ESPN <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M7 7h10v10"/></svg>';link.append(image,label);
   screen.replaceChildren(link);
   if(motion())animateUi(link,[{opacity:.4},{opacity:1}],{duration:180});
  }
 };
 const scrollQueue=(immediate=false)=>{
  const queue=dialog.querySelector('[data-reel-queue]'),button=queue.querySelector(`[data-reel-choose="${selected}"]`);
  if(button)queue.scrollTo({left:Math.max(0,button.offsetLeft-queue.offsetLeft-queue.clientWidth/2+button.clientWidth/2),behavior:!immediate&&motion()?'smooth':'instant'});
 };
 const choose=id=>{
  if(!visibleClips().some(clip=>clip.id===id))return;
  selected=id;drawPlayer(true);scrollQueue();
 };
 const setup=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='home-reel-player';dialog.setAttribute('aria-labelledby','home-reel-player-title');
  dialog.innerHTML='<header><h2 id="home-reel-player-title" tabindex="-1">Weekend reel</h2><span data-reel-count></span><button type="button" class="linkbtn" data-reel-close>Close</button></header><div class="home-reel-screen" data-reel-screen></div><div class="home-reel-player-copy"><small data-reel-context></small><h3 data-reel-headline></h3><p data-reel-error role="status" hidden>Clip unavailable here.</p><a class="home-reel-source-link" data-reel-source target="_blank" rel="noopener noreferrer">Watch on ESPN <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M7 7h10v10"/></svg></a></div><nav class="home-reel-player-controls" aria-label="Reel playback"><button type="button" class="btn ghost" data-reel-previous>Previous</button><button type="button" class="btn" data-reel-next>Next clip →</button></nav><div class="home-reel-queue" data-reel-queue role="group" aria-label="Choose a highlight"></div>';
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
  opener=source;setup();dialog.querySelector('h2').textContent=typeof title==='function'?title():title;cancelUiExit(dialog);selected=id||clips[0].id;
  dialog.showModal();stopViewport=fitDialogToViewport(dialog);drawPlayer(true);scrollQueue(true);dialog.querySelector('h2').focus({preventScroll:true});
  if(motion())animateUi(dialog,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.75,.25,1)'});
 };
 const scheduleExpiry=()=>{
  clearTimeout(expiryTimer);const session=highlightSession(now()),deadline=Math.min(session.active?session.expiresAt:session.nextOpensAt,...clips.map(clip=>Date.parse(clip.expires_at)));
  expiryTimer=setTimeout(()=>{if(current()){paint();void loop.request(true)}},Math.max(1,deadline-now()+20));
 };
 const paint=()=>{
  if(!current())return;
  clips=visibleClips();patchGameDay(root,markup(clips,now()));drawPlayer();scheduleExpiry();
 };
 const loop=mountLiveScoreRefresh({active:()=>current()&&nearby,interval:120000,refresh:async()=>{
  const token=++request,rows=await load({now:now()});if(!current()||token!==request)return;
  clips=activeHighlightClips(rows,now());paint();
 },onError:()=>{if(current())paint()}});
 const click=event=>{const button=event.target.closest('[data-home-reel-open],[data-home-reel-clip]');if(button)open(button.dataset.homeReelClip,button)};
 const hidden=()=>{if(document.hidden)dialog?.querySelector('video')?.pause();else if(current())paint()};
 root.addEventListener('error',posterError,true);root.addEventListener('click',click);document.addEventListener('visibilitychange',hidden);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{nearby=entries.some(entry=>entry.isIntersecting);if(nearby)loop.wake()},{rootMargin:'120px 0px'});observer?.observe(root);
 loop.start();scheduleExpiry();
 return {refresh:()=>loop.request(true),close:()=>close(),reset(){request++;clips=[];close();paint()},stop(){stopped=true;request++;clearTimeout(expiryTimer);observer?.disconnect();loop.stop();root.removeEventListener('error',posterError,true);root.removeEventListener('click',click);document.removeEventListener('visibilitychange',hidden);stopViewport();close();dialog?.remove()}};
}
