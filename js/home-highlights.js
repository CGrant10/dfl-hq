import {mountReplayLayout} from './replay-layout.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {activeHighlightClips,highlightSession,highlightThumbnail} from './home-highlight-model.js';
import {homeHighlightMarkup,reelQueueMarkup,reelPlayersMarkup,highlightPosterUrl,reelGameOptions} from './home-highlight-ui.js';
import {mountNflGameCenter} from './nfl-game-center.js';
import {nflCenterGames} from './nfl-game-center-model.js';
import {highlightPlayerOptions,browseHighlightClips} from './highlight-browse-model.js';
import {patchGameDay} from './game-day-dom.js';
import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {readPageChoice} from './page-disclosure.js';
import {animateUi,cancelUiMotion,exitUi,cancelUiExit} from './ui-motion.js';
import {fitDialogToViewport} from './dialog-viewport.js';

export function mountHomeHighlights(root,{active=()=>root.isConnected,load=loadHomeHighlights,now=()=>Date.now(),markup=homeHighlightMarkup,title='Weekend reel',getPlayers=()=>[],getContext=()=>null}={}){
 let stopped=false,nearby=typeof IntersectionObserver==='undefined',clips=[],selected='',dialog=null,opener=null,expiryTimer=null,stopViewport=()=>{},request=0,player='',search='',playerCache={key:'',options:[]};
 let game='',pageSearch='',gameCenter=null,browserMode='clips',layout=null;
 const posterError=event=>{
  const image=event.target;if(image.tagName!=='IMG'||image.dataset.posterFallback)return;
  try{const url=new URL(image.src),source=url.hostname==='a.espncdn.com'&&url.pathname==='/combiner/i'?highlightThumbnail(url.searchParams.get('img')):null;
   if(source){image.dataset.posterFallback='1';image.src=source}
  }catch{/* Keep the fixed poster frame if a publisher image is unavailable. */}
 };
 const current=()=>!stopped&&root.isConnected&&active(),motion=()=>readPageChoice('gameday-motion',['on','off'],'on')==='on'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stopVideo=()=>{const video=dialog?.querySelector('video');if(video){video.pause();video.removeAttribute('src');video.load()}};
 const close=({animated=false}={})=>{
  dialog?.querySelector('video')?.pause();gameCenter?.pause();if(!dialog?.open){stopVideo();return}
  const target=opener?.isConnected?opener.getBoundingClientRect():null,box=dialog.getBoundingClientRect();
  const transform=target&&target.width&&target.top<innerHeight&&target.bottom>0?`translate(${(target.x+target.width/2-box.x-box.width/2)*.2}px,${(target.y+target.height/2-box.y-box.height/2)*.2}px) scale(.92)`:'translateY(10px) scale(.97)';
  exitUi(dialog,()=>{stopVideo();dialog.close()},{immediate:!animated||!motion(),duration:210,transform});
 };
 const visibleClips=()=>activeHighlightClips(clips,now());
 const playerOptions=()=>{
  const rows=visibleClips(),roster=getPlayers()||[],key=JSON.stringify([rows.map(c=>[c.id,c.headline,c.game_label]),roster.map(p=>[p.id,p.name,p.nflTeam,p.position])]);
  if(key!==playerCache.key)playerCache={key,options:highlightPlayerOptions(rows,roster)};
  if(player&&!playerCache.options.some(option=>option.key===player))player='';
  return playerCache.options;
 };
 const browseRows=()=>browseHighlightClips(visibleClips(),{player,players:playerOptions(),query:search}).filter(c=>!game||c.game_id===game);
 const drawPlayer=(replace=false)=>{
  if(!dialog?.open)return;
  const valid=browseRows(),index=valid.findIndex(clip=>clip.id===selected),clip=visibleClips().find(clip=>clip.id===selected);if(!clip){close();return}
  dialog.querySelector('[data-reel-headline]').textContent=clip.headline;
  dialog.querySelector('[data-reel-context]').textContent=clip.game_label+' · ESPN';
  const context=getContext(),nflGame=context?.nflPayload?nflCenterGames(context.nflPayload,context.season,context.week).find(g=>g.id===clip.game_id):null;
  dialog.querySelector('[data-reel-game-score]').textContent=nflGame?.label||clip.game_label;
  dialog.querySelector('[data-reel-game-state]').textContent=context?.week?`WEEK ${context.week}`:'NFL';
  dialog.querySelector('[data-reel-source]').href=clip.source_url;
  dialog.querySelector('[data-reel-count]').textContent=index>=0?`${index+1} / ${valid.length}`:`${valid.length} found`;
  dialog.querySelector('[data-reel-previous]').disabled=index<=0;dialog.querySelector('[data-reel-next]').disabled=!valid.length||index===valid.length-1;
  patchGameDay(dialog.querySelector('[data-reel-players]'),reelPlayersMarkup(playerOptions(),player,visibleClips().length,'watch'));
  patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup(valid,selected));
  patchGameDay(dialog.querySelector('[data-reel-game]'),reelGameOptions(visibleClips(),game));
  if(replace){
   stopVideo();dialog.querySelector('[data-reel-error]').hidden=true;
   const screen=dialog.querySelector('[data-reel-screen]');
   if(clip.video_url){
    const video=document.createElement('video');video.controls=true;video.playsInline=true;video.preload='none';video.poster=highlightPosterUrl(clip.thumbnail_url);video.src=clip.video_url;
    video.setAttribute('aria-label',clip.headline);
    video.addEventListener('error',()=>{if(current()&&dialog.open&&screen.firstElementChild===video&&video.hasAttribute('src'))dialog.querySelector('[data-reel-error]').hidden=false});
    video.addEventListener('ended',()=>{if(!current()||!dialog.open||screen.firstElementChild!==video)return;const rows=browseRows(),i=rows.findIndex(row=>row.id===selected);if(i>=0&&rows[i+1]&&!dialog.querySelector('[data-reel-search]').matches(':focus'))choose(rows[i+1].id)});
    screen.replaceChildren(video);if(motion())animateUi(screen,[{opacity:.5},{opacity:1}],{duration:180});void video.play().catch(()=>{/* Native controls remain available if autoplay needs another tap. */});
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
  if(button)queue.scrollTo({top:Math.max(0,queue.scrollTop+button.getBoundingClientRect().top-queue.getBoundingClientRect().top-Math.max(0,(queue.clientHeight-button.clientHeight)/2)),behavior:!immediate&&motion()?'smooth':'instant'});
 };
 const choose=id=>{
  if(!browseRows().some(clip=>clip.id===id))return;
  selected=id;drawPlayer(true);scrollQueue();
 };
 const setBrowserMode=mode=>{browserMode=mode;if(mode==='game')layout?.browse();for(const button of dialog.querySelectorAll('[data-reel-mode]'))button.setAttribute('aria-pressed',String(button.dataset.reelMode===mode));dialog.querySelector('[data-reel-clip-browser]').hidden=mode!=='clips';dialog.querySelector('[data-reel-game-browser]').hidden=mode!=='game';if(mode==='game'){const clip=visibleClips().find(c=>c.id===selected),context=getContext();if(context?.season&&context?.week){if(!gameCenter)gameCenter=mountNflGameCenter(dialog.querySelector('[data-reel-game-browser]'),{getContext:()=>({...getContext(),players:getPlayers()}),active:()=>current()&&dialog.open&&browserMode==='game',getClips:visibleClips,onClip:id=>{game='';player='';search='';dialog.querySelector('[data-reel-search]').value='';choose(id);layout?.watch();setBrowserMode('clips')},initialGame:game||clip?.game_id});else gameCenter.selectGame(game||clip?.game_id)}else dialog.querySelector('[data-reel-game-browser]').textContent='Open Clubhouse to browse this week’s NFL games.'}else gameCenter?.pause()};
 const setup=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='home-reel-player';dialog.setAttribute('aria-labelledby','home-reel-player-title');
  dialog.innerHTML='<header><span class="reel-network" aria-hidden="true">DFL <b>REPLAY</b></span><h2 id="home-reel-player-title" tabindex="-1">Weekend reel</h2><span data-reel-count role="status"></span><button type="button" class="linkbtn" data-reel-close>Close</button></header><div class="home-reel-view"><div class="home-reel-stage"><div class="reel-stadium-lights" aria-hidden="true"></div><div class="reel-scorebug"><span data-reel-game-score></span><small data-reel-game-state></small><b>REPLAY</b></div><div class="home-reel-screen" data-reel-screen></div><div class="home-reel-player-copy"><div class="reel-now-row"><small data-reel-context></small></div><h3 data-reel-headline></h3><p data-reel-error role="status" hidden>Clip unavailable here. Open it on ESPN.</p></div><nav class="home-reel-player-controls" aria-label="Reel playback"><button type="button" class="btn ghost" data-reel-previous>← Previous</button><a class="home-reel-source-link" data-reel-source aria-label="Watch this clip on ESPN" target="_blank" rel="noopener noreferrer">ESPN <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M7 7h10v10"/></svg></a><button type="button" class="btn" data-reel-next>Next clip →</button></nav></div><div class="reel-splitter"><button type="button" data-reel-layout="watch" aria-pressed="false">Watch</button><span data-reel-resize role="separator" aria-label="Resize video and clip browser" aria-orientation="horizontal" tabindex="0"><i aria-hidden="true"></i></span><button type="button" data-reel-layout="browse" aria-pressed="false">Browse</button></div><section class="home-reel-browser" aria-label="Find highlights and NFL plays"><div class="reel-browser-modes" role="group" aria-label="Replay studio view"><button type="button" data-reel-mode="clips" aria-pressed="true">Clips</button><button type="button" data-reel-mode="game" aria-pressed="false">NFL game center</button></div><div class="reel-clip-browser" data-reel-clip-browser><label class="reel-game-label">Game<select data-reel-game></select></label><div class="reel-search-row"><label for="home-reel-search" class="sr-only">Search players or plays</label><input id="home-reel-search" data-reel-search type="search" maxlength="80" placeholder="Find clips" autocomplete="off"><button type="button" class="linkbtn" data-reel-clear aria-label="Clear highlight filters">Clear</button></div><div class="home-reel-players" data-reel-players role="group" aria-label="Filter clips by player"></div><ol class="home-reel-queue" data-reel-queue aria-label="Choose a highlight"></ol></div><div class="reel-game-browser" data-reel-game-browser hidden></div></section></div>';
  const filterPlayer=value=>{player=value;search='';dialog.querySelector('[data-reel-search]').value='';paint();const rows=browseRows();if(rows.length)choose(rows[0].id)};

  document.body.append(dialog);layout=mountReplayLayout(dialog,{motion});dialog.addEventListener('error',posterError,true);
  dialog.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.reelMode){setBrowserMode(button.dataset.reelMode);return}
   if(button.hasAttribute('data-reel-player-filter')){filterPlayer(button.dataset.reelPlayerFilter);return}
   if(button.hasAttribute('data-reel-clear')){player='';game='';search='';dialog.querySelector('[data-reel-search]').value='';paint();dialog.querySelector('[data-reel-players]').scrollLeft=0;scrollQueue();return}
   if(button.hasAttribute('data-reel-close')){close({animated:true});return}
   if(button.dataset.reelChoose){layout?.watch();choose(button.dataset.reelChoose);return}
   const valid=browseRows(),index=valid.findIndex(clip=>clip.id===selected),step=button.hasAttribute('data-reel-next')?1:button.hasAttribute('data-reel-previous')?-1:0;
   if(step&&valid[index+step])choose(valid[index+step].id);
  });
  dialog.addEventListener('change',event=>{if(event.target.matches('[data-reel-game]')){game=event.target.value;drawPlayer();dialog.querySelector('[data-reel-queue]').scrollTop=0}});
  dialog.addEventListener('input',event=>{if(event.target.matches('[data-reel-search]')){search=event.target.value.slice(0,80);drawPlayer()}});
  dialog.addEventListener('keydown',event=>{if(browserMode!=='clips'||event.target.closest('input,textarea,select,video')||!['ArrowLeft','ArrowRight'].includes(event.key))return;const rows=browseRows(),index=rows.findIndex(clip=>clip.id===selected),clip=rows[index+(event.key==='ArrowRight'?1:-1)];if(clip){event.preventDefault();choose(clip.id)}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();close({animated:true})});
  dialog.addEventListener('close',()=>{if(dialog.open)return;cancelUiExit(dialog);stopVideo();stopViewport();cancelUiMotion(dialog);if(current())(opener?.isConnected?opener:root.querySelector('[data-home-reel-open],[data-home-reel-search]'))?.focus({preventScroll:true})});
 };
 const open=(id,source)=>{
  clips=visibleClips();search='';const rows=browseRows();if(!rows.length){paint();return}
  opener=source;setup();dialog.querySelector('h2').textContent=typeof title==='function'?title():title;cancelUiExit(dialog);selected=id||rows[0].id;dialog.querySelector('[data-reel-search]').value='';
  dialog.showModal();stopViewport();stopViewport=fitDialogToViewport(dialog)||(()=>{});layout.reset();drawPlayer(true);scrollQueue(true);const people=dialog.querySelector('[data-reel-players]'),person=people.querySelector('[aria-pressed="true"]');people.scrollLeft=player&&person?Math.max(0,person.offsetLeft-people.offsetLeft-people.clientWidth/2+person.clientWidth/2):0;dialog.querySelector('h2').focus({preventScroll:true});
  setBrowserMode('clips');
  if(motion()){const sourceBox=source?.getBoundingClientRect(),box=dialog.getBoundingClientRect(),dx=sourceBox?sourceBox.x+sourceBox.width/2-box.x-box.width/2:0,dy=sourceBox?sourceBox.y+sourceBox.height/2-box.y-box.height/2:12;animateUi(dialog,[{opacity:0,transform:`translate(${dx*.35}px,${dy*.35}px) scale(.9)`},{opacity:1,transform:'none'}],{duration:320,easing:'cubic-bezier(.18,.8,.2,1)'})}
 };
 const scheduleExpiry=()=>{
  clearTimeout(expiryTimer);const session=highlightSession(now()),deadline=Math.min(session.active?session.expiresAt:session.nextOpensAt,...clips.map(clip=>Date.parse(clip.expires_at)));
  expiryTimer=setTimeout(()=>{if(current()){paint();void loop.request(true)}},Math.max(1,deadline-now()+20));
 };
 const paint=()=>{
  if(!current())return;
  clips=visibleClips();const options=playerOptions(),rows=browseHighlightClips(clips,{player,players:options,query:pageSearch}).filter(c=>!game||c.game_id===game);patchGameDay(root,markup(rows,now(),{players:options,player,total:clips.length,game,games:clips,query:pageSearch}));drawPlayer();scheduleExpiry();
 };
 const refreshRows=async()=>{
  const token=++request,rows=await load({now:now()});if(!current()||token!==request)return;
  clips=activeHighlightClips(rows,now());paint();
 };
 const loop=mountLiveScoreRefresh({active:()=>current()&&nearby,interval:120000,refresh:refreshRows,onError:()=>{if(current())paint()}});
 const change=event=>{if(event.target.matches('[data-home-reel-game]')){game=event.target.value;paint()}};
 const input=event=>{if(event.target.matches('[data-home-reel-search]')){pageSearch=event.target.value.slice(0,80);paint()}};
 const click=event=>{const filter=event.target.closest('[data-reel-player-filter]');if(filter){player=filter.dataset.reelPlayerFilter;paint();return}const button=event.target.closest('[data-home-reel-open],[data-home-reel-clip]');if(button)open(button.dataset.homeReelClip,button)};
 const hidden=()=>{if(document.hidden)dialog?.querySelector('video')?.pause();else if(current())paint()};
 root.addEventListener('error',posterError,true);root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);document.addEventListener('visibilitychange',hidden);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{nearby=entries.some(entry=>entry.isIntersecting);if(nearby)loop.wake()},{rootMargin:'120px 0px'});observer?.observe(root);
 loop.start();scheduleExpiry();
 return {openClip(id){if(!visibleClips().some(c=>c.id===String(id)))return false;player='';game='';search='';open(String(id),root.querySelector(`[data-home-reel-clip="${id}"]`)||root.querySelector('[data-home-reel-open]'));return true},updatePlayers:()=>paint(),refresh:()=>refreshRows().catch(()=>{if(current())paint()}),close:()=>close(),reset(){request++;clips=[];player='';game='';pageSearch='';search='';close();paint()},stop(){stopped=true;request++;clearTimeout(expiryTimer);observer?.disconnect();loop.stop();root.removeEventListener('error',posterError,true);root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);document.removeEventListener('visibilitychange',hidden);stopViewport();layout?.stop();gameCenter?.stop();close();dialog?.remove()}};
}
