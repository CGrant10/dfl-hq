import {loadHomeHighlights} from './home-highlight-data.js';
import {activeHighlightClips,highlightSession,highlightThumbnail} from './home-highlight-model.js';
import {homeHighlightMarkup,reelQueueMarkup,reelPlayersMarkup,highlightPosterUrl} from './home-highlight-ui.js';
import {highlightPlayerOptions,browseHighlightClips} from './highlight-browse-model.js';
import {patchGameDay} from './game-day-dom.js';
import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {readPageChoice} from './page-disclosure.js';
import {animateUi,cancelUiMotion,exitUi,cancelUiExit} from './ui-motion.js';
import {fitDialogToViewport} from './dialog-viewport.js';

export function mountHomeHighlights(root,{active=()=>root.isConnected,load=loadHomeHighlights,now=()=>Date.now(),markup=homeHighlightMarkup,title='Weekend reel',getPlayers=()=>[]}={}){
 let stopped=false,nearby=typeof IntersectionObserver==='undefined',clips=[],selected='',dialog=null,opener=null,expiryTimer=null,stopViewport=()=>{},request=0,player='',search='',playerCache={key:'',options:[]};
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
 const playerOptions=()=>{
  const rows=visibleClips(),roster=getPlayers()||[],key=JSON.stringify([rows.map(c=>[c.id,c.headline,c.game_label]),roster.map(p=>[p.id,p.name,p.nflTeam,p.position])]);
  if(key!==playerCache.key)playerCache={key,options:highlightPlayerOptions(rows,roster)};
  if(player&&!playerCache.options.some(option=>option.key===player))player='';
  return playerCache.options;
 };
 const browseRows=()=>browseHighlightClips(visibleClips(),{player,players:playerOptions(),query:search});
 const drawPlayer=(replace=false)=>{
  if(!dialog?.open)return;
  const valid=browseRows(),index=valid.findIndex(clip=>clip.id===selected),clip=visibleClips().find(clip=>clip.id===selected);if(!clip){close();return}
  dialog.querySelector('[data-reel-headline]').textContent=clip.headline;
  dialog.querySelector('[data-reel-context]').textContent=clip.game_label+' · ESPN';
  dialog.querySelector('[data-reel-source]').href=clip.source_url;
  dialog.querySelector('[data-reel-count]').textContent=index>=0?`${index+1} / ${valid.length}`:`${valid.length} found`;
  dialog.querySelector('[data-reel-previous]').disabled=index<=0;dialog.querySelector('[data-reel-next]').disabled=!valid.length||index===valid.length-1;
  patchGameDay(dialog.querySelector('[data-reel-players]'),reelPlayersMarkup(playerOptions(),player,visibleClips().length,'watch'));
  patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup(valid,selected));
  if(replace){
   stopVideo();dialog.querySelector('[data-reel-error]').hidden=true;
   const screen=dialog.querySelector('[data-reel-screen]');
   if(clip.video_url){
    const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';video.poster=highlightPosterUrl(clip.thumbnail_url);video.src=clip.video_url;
    video.setAttribute('aria-label',clip.headline);
    video.addEventListener('error',()=>{if(current()&&dialog.open&&screen.firstElementChild===video&&video.hasAttribute('src'))dialog.querySelector('[data-reel-error]').hidden=false});
    video.addEventListener('ended',()=>{if(!current()||!dialog.open||screen.firstElementChild!==video)return;const rows=browseRows(),i=rows.findIndex(row=>row.id===selected);if(i>=0&&rows[i+1]&&!dialog.querySelector('[data-reel-search]').matches(':focus'))choose(rows[i+1].id)});
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
  if(button)queue.scrollTo({top:Math.max(0,queue.scrollTop+button.getBoundingClientRect().top-queue.getBoundingClientRect().top-(queue.clientHeight-button.clientHeight)/2),behavior:!immediate&&motion()?'smooth':'instant'});
 };
 const choose=id=>{
  if(!browseRows().some(clip=>clip.id===id))return;
  selected=id;drawPlayer(true);scrollQueue();
 };
 const setup=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='home-reel-player';dialog.setAttribute('aria-labelledby','home-reel-player-title');
  dialog.innerHTML='<header><h2 id="home-reel-player-title" tabindex="-1">Weekend reel</h2><span data-reel-count role="status"></span><button type="button" class="linkbtn" data-reel-close>Close</button></header><div class="home-reel-view"><div class="home-reel-stage"><div class="home-reel-screen" data-reel-screen></div><div class="home-reel-player-copy"><div class="reel-now-row"><small data-reel-context></small></div><h3 data-reel-headline></h3><p data-reel-error role="status" hidden>Clip unavailable here. Open it on ESPN.</p></div><nav class="home-reel-player-controls" aria-label="Reel playback"><button type="button" class="btn ghost" data-reel-previous>← Previous</button><a class="home-reel-source-link" data-reel-source aria-label="Watch this clip on ESPN" target="_blank" rel="noopener noreferrer">ESPN <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M7 7h10v10"/></svg></a><button type="button" class="btn" data-reel-next>Next clip →</button></nav></div><section class="home-reel-browser" aria-label="Find highlight clips"><div class="reel-search-row"><label for="home-reel-search" class="sr-only">Search players or plays</label><input id="home-reel-search" data-reel-search type="search" maxlength="80" placeholder="Search players or plays" autocomplete="off"><button type="button" class="linkbtn" data-reel-clear aria-label="Clear highlight filters">Clear</button></div><div class="home-reel-players" data-reel-players role="group" aria-label="Filter clips by player"></div><ol class="home-reel-queue" data-reel-queue aria-label="Choose a highlight"></ol></section></div>';
  const filterPlayer=value=>{player=value;search='';dialog.querySelector('[data-reel-search]').value='';paint();const rows=browseRows();if(rows.length)choose(rows[0].id)};

  document.body.append(dialog);dialog.addEventListener('error',posterError,true);
  dialog.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-reel-player-filter')){filterPlayer(button.dataset.reelPlayerFilter);return}
   if(button.hasAttribute('data-reel-clear')){player='';search='';dialog.querySelector('[data-reel-search]').value='';paint();dialog.querySelector('[data-reel-players]').scrollLeft=0;scrollQueue();return}
   if(button.hasAttribute('data-reel-close')){close({animated:true});return}
   if(button.dataset.reelChoose){choose(button.dataset.reelChoose);return}
   const valid=browseRows(),index=valid.findIndex(clip=>clip.id===selected),step=button.hasAttribute('data-reel-next')?1:button.hasAttribute('data-reel-previous')?-1:0;
   if(step&&valid[index+step])choose(valid[index+step].id);
  });
  dialog.addEventListener('input',event=>{if(event.target.matches('[data-reel-search]')){search=event.target.value.slice(0,80);drawPlayer()}});
  dialog.addEventListener('keydown',event=>{if(event.target.closest('input,textarea,select,video')||!['ArrowLeft','ArrowRight'].includes(event.key))return;const rows=browseRows(),index=rows.findIndex(clip=>clip.id===selected),clip=rows[index+(event.key==='ArrowRight'?1:-1)];if(clip){event.preventDefault();choose(clip.id)}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close({animated:true})});
  dialog.addEventListener('close',()=>{stopViewport();cancelUiMotion(dialog);if(current())(opener?.isConnected?opener:root.querySelector('[data-home-reel-open]'))?.focus({preventScroll:true})});
 };
 const open=(id,source)=>{
  clips=visibleClips();search='';const rows=browseRows();if(!rows.length){paint();return}
  opener=source;setup();dialog.querySelector('h2').textContent=typeof title==='function'?title():title;cancelUiExit(dialog);selected=id||rows[0].id;dialog.querySelector('[data-reel-search]').value='';
  dialog.showModal();stopViewport=fitDialogToViewport(dialog)||(()=>{});drawPlayer(true);scrollQueue(true);const people=dialog.querySelector('[data-reel-players]'),person=people.querySelector('[aria-pressed="true"]');people.scrollLeft=player&&person?Math.max(0,person.offsetLeft-people.offsetLeft-people.clientWidth/2+person.clientWidth/2):0;dialog.querySelector('h2').focus({preventScroll:true});
  if(motion())animateUi(dialog,[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'cubic-bezier(.2,.75,.25,1)'});
 };
 const scheduleExpiry=()=>{
  clearTimeout(expiryTimer);const session=highlightSession(now()),deadline=Math.min(session.active?session.expiresAt:session.nextOpensAt,...clips.map(clip=>Date.parse(clip.expires_at)));
  expiryTimer=setTimeout(()=>{if(current()){paint();void loop.request(true)}},Math.max(1,deadline-now()+20));
 };
 const paint=()=>{
  if(!current())return;
  clips=visibleClips();const options=playerOptions(),rows=browseHighlightClips(clips,{player,players:options});patchGameDay(root,markup(rows,now(),{players:options,player,total:clips.length}));drawPlayer();scheduleExpiry();
 };
 const loop=mountLiveScoreRefresh({active:()=>current()&&nearby,interval:120000,refresh:async()=>{
  const token=++request,rows=await load({now:now()});if(!current()||token!==request)return;
  clips=activeHighlightClips(rows,now());paint();
 },onError:()=>{if(current())paint()}});
 const click=event=>{const filter=event.target.closest('[data-reel-player-filter]');if(filter){player=filter.dataset.reelPlayerFilter;paint();return}const button=event.target.closest('[data-home-reel-open],[data-home-reel-clip]');if(button)open(button.dataset.homeReelClip,button)};
 const hidden=()=>{if(document.hidden)dialog?.querySelector('video')?.pause();else if(current())paint()};
 root.addEventListener('error',posterError,true);root.addEventListener('click',click);document.addEventListener('visibilitychange',hidden);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{nearby=entries.some(entry=>entry.isIntersecting);if(nearby)loop.wake()},{rootMargin:'120px 0px'});observer?.observe(root);
 loop.start();scheduleExpiry();
 return {updatePlayers:()=>paint(),refresh:()=>loop.request(true),close:()=>close(),reset(){request++;clips=[];player='';search='';close();paint()},stop(){stopped=true;request++;clearTimeout(expiryTimer);observer?.disconnect();loop.stop();root.removeEventListener('error',posterError,true);root.removeEventListener('click',click);document.removeEventListener('visibilitychange',hidden);stopViewport();close();dialog?.remove()}};
}
