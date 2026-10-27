import {esc} from './ui.js';
import {mountReplayMedia} from './replay-media.js';
import {replayGameContext} from './replay-context.js';
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
 let game='',pageSearch='',gameCenter=null,browserMode='clips',layout=null,media=null,modeRequest=0,replayContext=null,centerGame='',browseScroll=0;
 const posterError=event=>{
  const image=event.target;if(image.tagName!=='IMG'||image.dataset.posterFallback)return;
  try{const url=new URL(image.src),source=url.hostname==='a.espncdn.com'&&url.pathname==='/combiner/i'?highlightThumbnail(url.searchParams.get('img')):null;
   if(source){image.dataset.posterFallback='1';image.src=source}
  }catch{/* Keep the fixed poster frame if a publisher image is unavailable. */}
 };
 const current=()=>!stopped&&root.isConnected&&active(),motion=()=>readPageChoice('gameday-motion',['on','off'],'on')==='on'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stopVideo=()=>media?.release();
 const close=({animated=false}={})=>{
  modeRequest++;media?.pause();gameCenter?.pause();if(!dialog?.open){stopVideo();return}
  const target=opener?.isConnected?opener.getBoundingClientRect():null,box=dialog.getBoundingClientRect();
  const transform=target&&target.width&&target.top<innerHeight&&target.bottom>0?`translate(${(target.x+target.width/2-box.x-box.width/2)*.2}px,${(target.y+target.height/2-box.y-box.height/2)*.2}px) scale(.92)`:'translateY(10px) scale(.97)';
  const screen=dialog.querySelector('[data-reel-screen]'),frame=screen.getBoundingClientRect(),visible=target&&target.width&&target.top<innerHeight&&target.bottom>0;
  const frameTransform=visible?`translate(${target.x+target.width/2-frame.x-frame.width/2}px,${target.y+target.height/2-frame.y-frame.height/2}px) scale(${Math.min(1,target.width/frame.width)})`:transform;
  exitUi(dialog,()=>{stopVideo();dialog.close()},{immediate:!animated||!motion(),surface:screen,duration:230,transform:frameTransform});
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
  dialog.querySelector('[data-reel-game-state]').textContent=nflGame?`WEEK ${context.week}`:replayContext&&centerGame===clip.game_id?`WEEK ${replayContext.week}`:'NFL';
  dialog.querySelector('[data-reel-source]').href=clip.source_url;
  dialog.querySelector('[data-reel-count]').textContent=index>=0?`${index+1} / ${valid.length}`:`${valid.length} found`;
  dialog.querySelector('[data-reel-previous]').disabled=index<=0;dialog.querySelector('[data-reel-next]').disabled=!valid.length||index===valid.length-1;
  const next=valid[index+1],upNext=dialog.querySelector('[data-reel-up-next]');upNext.disabled=!next;
  upNext.innerHTML=next?`<img src="${esc(highlightPosterUrl(next.thumbnail_url,320))}" alt=""><span><small>Up next · ${esc(next.game_label)}</small><strong>${esc(next.headline)}</strong></span><b aria-hidden="true">→</b>`:'<span><small>Reel complete</small><strong>Browse more highlights</strong></span>';
  dialog.querySelector('[data-reel-people-label]').textContent=playerOptions().find(p=>p.key===player)?.name||'All players';
  patchGameDay(dialog.querySelector('[data-reel-players]'),reelPlayersMarkup(playerOptions(),player,visibleClips().length,'watch'));
  patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup(valid,selected));
  patchGameDay(dialog.querySelector('[data-reel-game]'),reelGameOptions(visibleClips(),game));
  if(replace){
   stopVideo();dialog.querySelector('[data-reel-error]').hidden=true;
   const screen=dialog.querySelector('[data-reel-screen]');
   if(clip.video_url){
    screen.style.setProperty('--reel-poster',`url(${JSON.stringify(highlightPosterUrl(clip.thumbnail_url))})`);media.show(clip);
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
 const choose=(id,{align=true}={})=>{
  if(!browseRows().some(clip=>clip.id===id))return;
  selected=id;drawPlayer(true);if(align)scrollQueue();
 };
 const setBrowserMode=async mode=>{
  browserMode=mode;const ticket=++modeRequest;
  for(const button of dialog.querySelectorAll('[data-reel-mode]'))button.setAttribute('aria-pressed',String(button.dataset.reelMode===mode));
  dialog.querySelector('[data-reel-clip-browser]').hidden=mode!=='clips';dialog.querySelector('[data-reel-game-browser]').hidden=mode==='clips';
  if(mode==='clips'){gameCenter?.pause();return}
  layout?.browse();const clip=visibleClips().find(c=>c.id===selected),host=dialog.querySelector('[data-reel-game-browser]');
  try{
   const target=game||clip?.game_id,context=getContext();
   if(!gameCenter||!replayContext||centerGame!==target){
    gameCenter?.stop();gameCenter=null;host.innerHTML='<p class="nfl-center-status">Loading game…</p>';
    const edition=await replayGameContext({...clip,game_id:target},context);if(ticket!==modeRequest||!current()||!dialog.open)return;
    replayContext=edition;gameCenter?.stop();gameCenter=null;centerGame=target;
   }
   if(!gameCenter){
    host.replaceChildren();gameCenter=mountNflGameCenter(host,{embedded:true,initialMode:mode==='stats'?'fantasy':'plays',getContext:()=>({...replayContext,players:getPlayers().map(p=>Number(replayContext.week)===Number(getContext()?.week)?p:{...p,points:null,owner:'',isMine:false})}),active:()=>current()&&dialog.open&&browserMode!=='clips',getClips:visibleClips,initialGame:centerGame,onGameChange:id=>{centerGame=id;game=id},onClip:id=>{player='';search='';dialog.querySelector('[data-reel-search]').value='';choose(id);layout?.watch();void setBrowserMode('clips')}});
   }else{gameCenter.setMode(mode==='stats'?'fantasy':'plays');void gameCenter.refresh()}
  }catch{if(ticket===modeRequest&&current()){host.innerHTML='<p class="nfl-center-empty">Game unavailable. <button type="button" class="linkbtn" data-reel-game-retry>Try again</button></p>'}}
 };
 const setup=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='home-reel-player';dialog.setAttribute('aria-labelledby','home-reel-player-title');
  dialog.innerHTML='<header><span class="reel-network" aria-hidden="true">DFL <b>REPLAY</b></span><h2 id="home-reel-player-title" tabindex="-1">Weekend reel</h2><span data-reel-count></span><a class="home-reel-source-link" data-reel-source aria-label="Watch this clip on ESPN" target="_blank" rel="noopener noreferrer">ESPN <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M7 17 17 7M7 7h10v10"/></svg></a><button type="button" class="linkbtn" data-reel-close aria-label="Close highlights">×</button></header><div class="home-reel-view"><div class="home-reel-stage"><div class="reel-stadium-lights" aria-hidden="true"></div><div class="reel-scorebug"><span data-reel-game-score></span><small data-reel-game-state></small><b>REPLAY</b></div><div class="home-reel-screen" data-reel-screen></div><div class="reel-caption-row"><div class="home-reel-player-copy"><div class="reel-now-row"><small data-reel-context></small></div><h3 data-reel-headline></h3><p data-reel-error role="status" hidden>Clip unavailable here. Open it on ESPN.</p></div><nav class="home-reel-player-controls" aria-label="Reel playback"><button type="button" class="btn ghost" data-reel-previous aria-label="Previous clip">←</button><button type="button" class="btn" data-reel-next aria-label="Next clip">→</button></nav></div><button type="button" class="reel-up-next" data-reel-up-next></button></div><section class="home-reel-browser" aria-label="Find highlights and NFL plays"><div class="reel-splitter"><button type="button" data-reel-layout="watch" aria-pressed="true">Watch</button><span data-reel-resize role="separator" aria-label="Resize video and clip browser" aria-orientation="horizontal" tabindex="0"><i aria-hidden="true"></i></span><button type="button" data-reel-layout="browse" aria-pressed="false">Browse</button></div><div class="reel-browser-modes" role="group" aria-label="Replay studio view"><button type="button" data-reel-mode="clips" aria-pressed="true">Clips</button><button type="button" data-reel-mode="plays" aria-pressed="false">Live plays</button><button type="button" data-reel-mode="stats" aria-pressed="false">Stats</button></div><div class="reel-clip-browser" data-reel-clip-browser><label class="reel-game-label">Game<select data-reel-game></select></label><div class="reel-search-row"><label for="home-reel-search" class="sr-only">Search players or plays</label><input id="home-reel-search" data-reel-search type="search" maxlength="80" placeholder="Find clips" autocomplete="off"><button type="button" class="linkbtn" data-reel-clear aria-label="Clear highlight filters">Clear</button></div><details class="reel-people-picker"><summary>Players <span data-reel-people-label>All players</span></summary><div class="home-reel-players" data-reel-players role="group" aria-label="Filter clips by player"></div></details><ol class="home-reel-queue" data-reel-queue aria-label="Choose a highlight"></ol></div><div class="reel-game-browser" data-reel-game-browser hidden></div></section></div>';
  const filterPlayer=value=>{dialog.querySelector('.reel-people-picker').open=false;player=value;search='';dialog.querySelector('[data-reel-search]').value='';paint();const rows=browseRows();if(rows.length)choose(rows[0].id)};

  document.body.append(dialog);layout=mountReplayLayout(dialog,{motion,onSnap:index=>{if(index===0)dialog.querySelector('.reel-people-picker').open=false;if(index>0)requestAnimationFrame(()=>{const queue=dialog?.querySelector('[data-reel-queue]');if(queue)queue.scrollTop=browseScroll})}});media=mountReplayMedia(dialog.querySelector('[data-reel-screen]'),{motion,onEnded:()=>{if(!current()||!dialog.open)return;const rows=browseRows(),index=rows.findIndex(row=>row.id===selected);if(rows[index+1]&&!dialog.querySelector('[data-reel-search]').matches(':focus'))choose(rows[index+1].id)},onError:()=>{if(current()&&dialog.open)dialog.querySelector('[data-reel-error]').hidden=false}});dialog.addEventListener('error',posterError,true);
  dialog.addEventListener('click',event=>{
   if(!event.target.closest('.reel-people-picker'))dialog.querySelector('.reel-people-picker').open=false;
   const button=event.target.closest('button');if(!button)return;
   if(button.dataset.reelMode){void setBrowserMode(button.dataset.reelMode);return}
   if(button.hasAttribute('data-reel-game-retry')){void setBrowserMode(browserMode);return}
   if(button.hasAttribute('data-reel-up-next')){const rows=browseRows(),index=rows.findIndex(row=>row.id===selected);if(rows[index+1])choose(rows[index+1].id);return}
   if(button.hasAttribute('data-reel-player-filter')){filterPlayer(button.dataset.reelPlayerFilter);return}
   if(button.hasAttribute('data-reel-clear')){player='';game='';search='';dialog.querySelector('[data-reel-search]').value='';paint();dialog.querySelector('[data-reel-players]').scrollLeft=0;scrollQueue();return}
   if(button.hasAttribute('data-reel-close')){close({animated:true});return}
   if(button.dataset.reelChoose){browseScroll=dialog.querySelector('[data-reel-queue]').scrollTop;layout?.watch();choose(button.dataset.reelChoose,{align:false});return}
   const valid=browseRows(),index=valid.findIndex(clip=>clip.id===selected),step=button.hasAttribute('data-reel-next')?1:button.hasAttribute('data-reel-previous')?-1:0;
   if(step&&valid[index+step])choose(valid[index+step].id);
  });
  dialog.addEventListener('change',event=>{if(event.target.matches('[data-reel-game]')){game=event.target.value;drawPlayer();dialog.querySelector('[data-reel-queue]').scrollTop=0}});
  dialog.querySelector('[data-reel-search]').addEventListener('focus',()=>{dialog.querySelector('.reel-people-picker').open=false});
  dialog.addEventListener('input',event=>{if(event.target.matches('[data-reel-search]')){search=event.target.value.slice(0,80);drawPlayer()}});
  dialog.addEventListener('keydown',event=>{if(browserMode!=='clips'||event.target.closest('input,textarea,select,video')||!['ArrowLeft','ArrowRight'].includes(event.key))return;const rows=browseRows(),index=rows.findIndex(clip=>clip.id===selected),clip=rows[index+(event.key==='ArrowRight'?1:-1)];if(clip){event.preventDefault();choose(clip.id)}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();const picker=dialog.querySelector('.reel-people-picker');if(picker.open)picker.open=false;else close({animated:true})});
  dialog.querySelector('[data-reel-queue]').addEventListener('scroll',()=>{if(dialog.dataset.reelSnap!=='watch')browseScroll=dialog.querySelector('[data-reel-queue]').scrollTop},{passive:true});
  dialog.addEventListener('close',()=>{if(dialog.open)return;cancelUiExit(dialog);stopVideo();stopViewport();cancelUiMotion(dialog);if(current())(opener?.isConnected?opener:root.querySelector('[data-home-reel-open],[data-home-reel-search]'))?.focus({preventScroll:true})});
 };
 const open=(id,source)=>{
  clips=visibleClips();search='';const rows=browseRows();if(!rows.length){paint();return}
  opener=source;setup();browseScroll=0;dialog.querySelector('h2').textContent=typeof title==='function'?title():title;cancelUiExit(dialog);selected=id||rows[0].id;dialog.querySelector('[data-reel-search]').value='';
  dialog.showModal();stopViewport();stopViewport=fitDialogToViewport(dialog)||(()=>{});layout.reset();drawPlayer(true);scrollQueue(true);const people=dialog.querySelector('[data-reel-players]'),person=people.querySelector('[aria-pressed="true"]');people.scrollLeft=player&&person?Math.max(0,person.offsetLeft-people.offsetLeft-people.clientWidth/2+person.clientWidth/2):0;dialog.querySelector('h2').focus({preventScroll:true});
  setBrowserMode('clips');
  if(motion()){const sourceBox=source?.querySelector('img')?.getBoundingClientRect()||source?.getBoundingClientRect(),screen=dialog.querySelector('[data-reel-screen]'),box=screen.getBoundingClientRect();animateUi(dialog,[{opacity:0},{opacity:1}],{duration:180});if(sourceBox)animateUi(screen,[{transform:`translate(${sourceBox.x+sourceBox.width/2-box.x-box.width/2}px,${sourceBox.y+sourceBox.height/2-box.y-box.height/2}px) scale(${Math.max(.2,Math.min(1,sourceBox.width/box.width))})`,borderRadius:'10px'},{transform:'none',borderRadius:'0px'}],{duration:320,easing:'cubic-bezier(.18,.8,.2,1)'})}
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
 return {openClip(id){if(!visibleClips().some(c=>c.id===String(id)))return false;player='';game='';search='';open(String(id),root.querySelector(`[data-home-reel-clip="${id}"]`)||root.querySelector('[data-home-reel-open]'));return true},updatePlayers:()=>paint(),refresh:()=>refreshRows().catch(()=>{if(current())paint()}),close:()=>close(),reset(){request++;clips=[];player='';game='';pageSearch='';search='';close();paint()},stop(){stopped=true;request++;clearTimeout(expiryTimer);modeRequest++;observer?.disconnect();loop.stop();root.removeEventListener('error',posterError,true);root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);document.removeEventListener('visibilitychange',hidden);stopViewport();layout?.stop();media?.stop();gameCenter?.stop();close();dialog?.remove()}};
}
