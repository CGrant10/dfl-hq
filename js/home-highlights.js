import {replayWindowMarkup} from './replay-window.js';
import {replayIcon} from './replay-icons.js';
import {replayGameEntries,replayGameObservation,mountReplayGames} from './replay-games.js';
import {applyViewingMatchup} from './matchup-view-context.js';
import {dockReplay,isReplayDocked,restoreReplayDock,detachReplayDock,closeReplayDock} from './replay-dock.js';
import {readJourneyChoice,writeJourneyChoice} from './journey-memory.js';
import {esc} from './ui.js';
import {mountReplayMedia} from './replay-media.js';
import {replayGameContext} from './replay-context.js';
import {mountReplayLayout} from './replay-layout.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {activeHighlightClips,highlightSession,highlightThumbnail} from './home-highlight-model.js';
import {homeHighlightMarkup,reelQueueMarkup,reelPlayersMarkup,highlightPosterUrl,reelGameOptions,replayScoreMarkup} from './home-highlight-ui.js';
import {mountNflGameCenter} from './nfl-game-center.js';
import {nflCenterGames,nflObservedGame} from './nfl-game-center-model.js';
import {highlightPlayerOptions,browseHighlightClips} from './highlight-browse-model.js';
import {patchGameDay} from './game-day-dom.js';
import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {readPageChoice} from './page-disclosure.js';
import {animateUi,cancelUiMotion,exitUi,cancelUiExit} from './ui-motion.js';
import {fitDialogToViewport} from './dialog-viewport.js';
import {mountSheetDrag,exitSheet} from './sheet-drag.js';

export function mountHomeHighlights(root,{active=()=>root.isConnected,load=loadHomeHighlights,now=()=>Date.now(),markup=homeHighlightMarkup,title='Weekend reel',previewLayout='rail',getPlayers=()=>[],getContext=()=>null}={}){
 if(previewLayout==='feature'){
  root.setAttribute('aria-busy','true');
  root.innerHTML='<section class="home-highlight-reel home-reel-feature"><header><h2>Weekend reel</h2></header><div class="home-reel-feature-skeleton" aria-hidden="true"><span></span><span></span><span></span></div></section>';
 }
 let stopped=false,nearby=typeof IntersectionObserver==='undefined',clips=[],selected='',dialog=null,opener=null,expiryTimer=null,stopViewport=()=>{},request=0,player='',search='',playerCache={key:'',options:[]};
 let returnPoint=null,sheetDrag=null,clipReturn=null;const replayObservations=new Map();
 let game='',kind='',gameStrip=null,pageSearch='',gameCenter=null,browserMode='clips',layout=null,media=null,modeRequest=0,replayContext=null,centerGame='',browseScroll=0;
 const posterError=event=>{
  const image=event.target;if(image.tagName!=='IMG'||image.hasAttribute('data-poster-source')||image.dataset.posterFallback)return;
  try{const url=new URL(image.src),source=url.hostname==='a.espncdn.com'&&url.pathname==='/combiner/i'?highlightThumbnail(url.searchParams.get('img')):null;
   if(source){image.dataset.posterFallback='1';image.src=source}
  }catch{/* Keep the fixed poster frame if a publisher image is unavailable. */}
 };
 const current=()=>!stopped&&root.isConnected&&active(),motion=()=>readPageChoice('gameday-motion',['on','off'],'on')==='on'&&document.documentElement.dataset.uiMotion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 const stopVideo=()=>{if(!isReplayDocked(media))media?.release()};
 const close=({animated=false}={})=>{
  modeRequest++;if(isReplayDocked(media))return;media?.pause();gameCenter?.pause();if(!dialog?.open){stopVideo();return}
  if(dialog.dataset.sheetMoving){exitSheet(dialog,()=>{sheetDrag.reset();stopVideo();dialog.close()},{immediate:!animated||!motion()});return;}
  const target=opener?.isConnected?opener.getBoundingClientRect():null,box=dialog.getBoundingClientRect();
  const transform=target&&target.width&&target.top<innerHeight&&target.bottom>0?`translate(${(target.x+target.width/2-box.x-box.width/2)*.2}px,${(target.y+target.height/2-box.y-box.height/2)*.2}px) scale(.92)`:'translateY(10px) scale(.97)';
  const screen=dialog.querySelector('[data-reel-screen]'),frame=screen.getBoundingClientRect(),visible=target&&target.width&&target.top<innerHeight&&target.bottom>0;
  const frameTransform=visible?`translate(${target.x+target.width/2-frame.x-frame.width/2}px,${target.y+target.height/2-frame.y-frame.height/2}px) scale(${Math.min(1,target.width/frame.width)})`:transform;
  exitUi(dialog,()=>{stopVideo();dialog.close()},{immediate:!animated||!motion(),surface:screen,duration:230,transform:frameTransform});
 };
 const visibleClips=()=>activeHighlightClips(clips,now());
 const replayEntries=()=>{const context=getContext();return replayGameEntries(visibleClips(),context).map(g=>{const observed=replayObservations.get(g.id);return observed?nflObservedGame(g.state==='replay'?{...g,state:'pre'}:g,observed,context?.season):g})};
 const replayCaption=(clip,entries)=>[clip.game_label,entries.find(e=>e.id===clip.game_id)?.status==='Replay'?'':entries.find(e=>e.id===clip.game_id)?.status].filter(Boolean).join(' · ');
 const playerOptions=()=>{
  const rows=visibleClips(),roster=getPlayers()||[],key=JSON.stringify([rows.map(c=>[c.id,c.headline,c.game_label]),roster.map(p=>[p.id,p.name,p.nflTeam,p.position])]);
  if(key!==playerCache.key)playerCache={key,options:highlightPlayerOptions(rows,roster)};
  if(player&&!playerCache.options.some(option=>option.key===player))player='';
  return playerCache.options;
 };
 const browseRows=()=>browseHighlightClips(visibleClips(),{player,players:playerOptions(),query:search}).filter(c=>(!game||c.game_id===game)&&(!kind||c.kind===kind));
 const drawPlayer=(replace=false)=>{
  if(!dialog?.open||isReplayDocked(media))return;
  const all=visibleClips(),valid=browseRows();let clip=all.find(clip=>clip.id===selected);
  if(!clip&&valid.length){selected=valid[0].id;clip=valid[0];replace=true}
  const entries=replayEntries();gameStrip?.update(entries,game||clip?.game_id||'');
  for(const button of dialog.querySelectorAll('[data-reel-kind]'))button.setAttribute('aria-pressed',String(button.dataset.reelKind===kind));
  if(!clip){
   if(!all.length){close();return}
   const entry=entries.find(e=>e.id===game);stopVideo();dialog.querySelector('[data-reel-screen]').innerHTML='<div class="replay-no-clips"><strong>No clips for this game yet.</strong><button type="button" class="linkbtn" data-reel-mode="plays">Follow the plays</button></div>';
   dialog.querySelector('[data-reel-headline]').textContent=entry?.label||'NFL replay';dialog.querySelector('[data-reel-context]').textContent=entry?.status||'';dialog.querySelector('[data-reel-count]').textContent='No clips';dialog.querySelector('[data-reel-source]').hidden=true;dialog.querySelector('[data-reel-minimize]').hidden=true;
   dialog.querySelectorAll('[data-reel-previous],[data-reel-next]').forEach(b=>b.disabled=true);patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup([],''));return;
  }
  const index=valid.findIndex(row=>row.id===selected);dialog.querySelector('[data-reel-source]').hidden=false;
  dialog.querySelector('[data-reel-headline]').textContent=clip.headline;
  dialog.querySelector('[data-reel-context]').textContent=replayCaption(clip,entries);
  layout?.refresh();if(gameCenter&&browserMode!=='clips')gameCenter.updateContext();
  const context=getContext(),nflGame=context?.nflPayload?nflCenterGames(context.nflPayload,context.season,context.week).find(g=>g.id===clip.game_id):null;
  patchGameDay(dialog.querySelector('[data-reel-game-score]'),replayScoreMarkup(nflGame,clip.game_label));
  dialog.querySelector('[data-reel-game-state]').textContent=nflGame?`WEEK ${context.week}`:replayContext&&centerGame===clip.game_id?`WEEK ${replayContext.week}`:'NFL';
  dialog.querySelector('[data-reel-source]').href=clip.source_url;
  dialog.querySelector('[data-reel-count]').textContent=index>=0?`${index+1} / ${valid.length}`:`${valid.length} found`;
  for(const button of dialog.querySelectorAll('[data-reel-mode]')){const mode=button.dataset.reelMode;button.textContent=clipReturn&&browserMode==='clips'&&clipReturn.mode===mode?(mode==='plays'?'Back to play':'Back to stats'):{clips:'Clips',plays:'Plays',stats:'Fantasy'}[mode];}
  dialog.querySelector('[data-reel-previous]').disabled=index<=0;dialog.querySelector('[data-reel-next]').disabled=!valid.length||index===valid.length-1;
  const next=valid[index+1],upNext=dialog.querySelector('[data-reel-up-next]');upNext.disabled=!next;
  upNext.innerHTML=next?`<img src="${esc(highlightPosterUrl(next.thumbnail_url,320))}" alt=""><span><small>Up next · ${esc(next.game_label)}</small><strong>${esc(next.headline)}</strong></span><b aria-hidden="true">→</b>`:'<span><small>Reel complete</small><strong>Browse more highlights</strong></span>';
  dialog.querySelector('[data-reel-people-label]').textContent=playerOptions().find(p=>p.key===player)?.name||'All players';
  patchGameDay(dialog.querySelector('[data-reel-players]'),reelPlayersMarkup(playerOptions(),player,visibleClips().length,'watch'));
  patchGameDay(dialog.querySelector('[data-reel-queue]'),reelQueueMarkup(valid,selected,{playing:dialog.dataset.reelPlaying==='true'}));
  patchGameDay(dialog.querySelector('[data-reel-game]'),reelGameOptions(visibleClips(),game));
  if(replace){
   stopVideo();dialog.querySelector('[data-reel-error]').hidden=true;
   const screen=dialog.querySelector('[data-reel-screen]');
   dialog.querySelector('[data-reel-minimize]').hidden=!clip.video_url;
   if(clip.video_url){
    const poster=dialog.querySelector(`[data-reel-choose="${CSS.escape(clip.id)}"] img`)?.currentSrc;
    media.show(clip,{poster});
    if(motion())animateUi(dialog.querySelector('.home-reel-player-copy'),[{opacity:.6,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:180});
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
  if(clipReturn&&clipReturn.id!==id)clipReturn=null;
  selected=id;drawPlayer(true);if(align)scrollQueue();
 };
 const setBrowserMode=async mode=>{
  browserMode=mode;dialog.dataset.replayMode=mode;const ticket=++modeRequest;dialog.style.setProperty('--reel-mode',String({clips:0,plays:1,stats:2}[mode]));
  for(const button of dialog.querySelectorAll('[data-reel-mode]'))button.setAttribute('aria-pressed',String(button.dataset.reelMode===mode));
  dialog.querySelector('.reel-grid-heading').hidden=mode!=='clips';dialog.querySelector('[data-reel-clip-browser]').hidden=mode!=='clips';dialog.querySelector('[data-reel-game-browser]').hidden=mode==='clips';
  if(mode==='clips'){gameCenter?.pause();drawPlayer();return}
  layout?.browse();const clip=visibleClips().find(c=>c.id===selected),host=dialog.querySelector('[data-reel-game-browser]');
  try{
   const target=game||clip?.game_id,context=getContext();
   if(!gameCenter||!replayContext||centerGame!==target){
    gameCenter?.stop();gameCenter=null;host.innerHTML='<p class="nfl-center-status">Loading game…</p>';
    const edition=await replayGameContext({...clip,game_id:target},context);if(ticket!==modeRequest||!current()||!dialog.open)return;
    replayContext=edition;gameCenter?.stop();gameCenter=null;centerGame=target;
   }
   if(!gameCenter){
    host.replaceChildren();gameCenter=mountNflGameCenter(host,{embedded:true,desk:true,restoreChoice:false,onSummary:(g,result)=>{replayObservations.set(g.id,replayGameObservation(result.summary));const entries=replayEntries(),clip=visibleClips().find(c=>c.id===selected);gameStrip?.update(entries,game||clip?.game_id||'');if(clip)dialog.querySelector('[data-reel-context]').textContent=replayCaption(clip,entries)},initialMode:mode==='stats'?'fantasy':'plays',getContext:()=>({...replayContext,playerDirectory:getContext()?.playerDirectory||replayContext.playerDirectory,players:getPlayers().map(p=>Number(replayContext.week)===Number(getContext()?.week)?p:{...p,points:null,owner:'',isMine:false})}),active:()=>current()&&dialog.open&&browserMode!=='clips',getClips:visibleClips,initialGame:centerGame,onGameChange:id=>{centerGame=id;game=id;kind='';player='';search='';clipReturn=null;dialog.querySelector('[data-reel-search]').value='';selected=visibleClips().find(c=>c.game_id===id)?.id||'';drawPlayer(true)},onClip:id=>{clipReturn={id,mode:browserMode};player='';kind='';search='';dialog.querySelector('[data-reel-search]').value='';choose(id);layout?.watch();void setBrowserMode('clips')}});
   }else{gameCenter.setMode(mode==='stats'?'fantasy':'plays');gameCenter.resume()}
   if(clipReturn?.mode===mode){const clip=clipReturn.id;clipReturn=null;drawPlayer();requestAnimationFrame(()=>{if(current()&&dialog.open&&browserMode===mode)dialog.querySelector(`[data-nfl-center-clip="${CSS.escape(clip)}"]`)?.focus({preventScroll:true})});}
  }catch{if(ticket===modeRequest&&current()){host.innerHTML='<p class="nfl-center-empty">Game unavailable. <button type="button" class="linkbtn" data-reel-game-retry>Try again</button></p>'}}
 };
 const setup=()=>{
  if(dialog)return;
  dialog=document.createElement('dialog');dialog.className='home-reel-player';dialog.dataset.replayWindow='broadcast';dialog.setAttribute('aria-labelledby','home-reel-player-title');
  dialog.innerHTML=replayWindowMarkup();
  const filterPlayer=value=>{dialog.querySelector('.reel-people-picker').open=false;player=value;kind='';remember();search='';dialog.querySelector('[data-reel-search]').value='';paint();const rows=browseRows();if(rows.length)choose(rows[0].id)};

  document.body.append(dialog);
  const switchGame=id=>{game=id;kind='';player='';search='';clipReturn=null;dialog.querySelector('[data-reel-search]').value='';remember();const rows=browseRows();selected=rows[0]?.id||'';drawPlayer(true);dialog.querySelector('[data-reel-queue]').scrollTop=0;if(browserMode!=='clips')void setBrowserMode(browserMode)};
  gameStrip=mountReplayGames(dialog.querySelector('[data-replay-game-strip]'),{select:switchGame,active:()=>current()&&dialog.open,motion});
  layout=mountReplayLayout(dialog,{motion,onSnap:index=>{if(index===0)dialog.querySelector('.reel-people-picker').open=false;if(index>0)requestAnimationFrame(()=>{const queue=dialog?.querySelector('[data-reel-queue]');if(queue)queue.scrollTop=browseScroll})}});media=mountReplayMedia(dialog.querySelector('[data-reel-screen]'),{motion,onEnded:()=>{if(!current()||!dialog.open)return;const rows=browseRows(),index=rows.findIndex(row=>row.id===selected);if(rows[index+1]&&!dialog.querySelector('[data-reel-search]').matches(':focus'))choose(rows[index+1].id)},onError:()=>{if(current()&&dialog.open)dialog.querySelector('[data-reel-error]').hidden=false},onPlaying:playing=>{if(!dialog)return;dialog.dataset.reelPlaying=String(playing);const badge=dialog.querySelector('.reel-playing');if(badge)badge.textContent=playing?'Playing':'Selected'}});dialog.addEventListener('error',posterError,true);
  dialog.addEventListener('click',event=>{
   if(!event.target.closest('.reel-people-picker'))dialog.querySelector('.reel-people-picker').open=false;
   if(event.target.closest('[data-player-card]')){media?.pause();return;}
   const button=event.target.closest('button');if(!button)return;
   if(button.hasAttribute('data-reel-kind')){kind=button.dataset.reelKind;drawPlayer();dialog.querySelector('[data-reel-queue]').scrollTop=0;return}
   if(button.hasAttribute('data-reel-tools')){layout.browse();dialog.querySelector('[data-reel-search]').focus();return}
   if(button.dataset.reelMode){void setBrowserMode(button.dataset.reelMode);return}
   if(button.hasAttribute('data-reel-game-retry')){void setBrowserMode(browserMode);return}
   if(button.hasAttribute('data-reel-up-next')){const rows=browseRows(),index=rows.findIndex(row=>row.id===selected);if(rows[index+1])choose(rows[index+1].id);return}
   if(button.hasAttribute('data-reel-player-filter')){filterPlayer(button.dataset.reelPlayerFilter);return}
   if(button.hasAttribute('data-reel-clear')){player='';game='';kind='';search='';remember();dialog.querySelector('[data-reel-search]').value='';paint();dialog.querySelector('[data-reel-players]').scrollLeft=0;scrollQueue();return}
   if(button.hasAttribute('data-reel-minimize')){
    const clip=visibleClips().find(c=>c.id===selected);if(!clip)return;
    gameCenter?.pause();modeRequest++;
    if(dockReplay({screen:dialog.querySelector('[data-reel-screen]'),media,clip,restore:()=>{if(!current())return;dialog.showModal();stopViewport();stopViewport=fitDialogToViewport(dialog)||(()=>{});layout.reset();dialog.querySelector('[data-reel-minimize]').focus({preventScroll:true})}}))dialog.close();return;
   }
   if(button.hasAttribute('data-reel-close')){close({animated:true});return}
   if(button.dataset.reelChoose){browseScroll=dialog.querySelector('[data-reel-queue]').scrollTop;layout?.watch();choose(button.dataset.reelChoose,{align:false});return}
   const valid=browseRows(),index=valid.findIndex(clip=>clip.id===selected),step=button.hasAttribute('data-reel-next')?1:button.hasAttribute('data-reel-previous')?-1:0;
   if(step&&valid[index+step])choose(valid[index+step].id);
  });
  dialog.addEventListener('change',event=>{if(event.target.matches('[data-reel-game]')){event.target.value?switchGame(event.target.value):(game='',kind='',remember(),drawPlayer())}});
  dialog.querySelector('[data-reel-search]').addEventListener('focus',()=>{dialog.querySelector('.reel-people-picker').open=false});
  dialog.addEventListener('input',event=>{if(event.target.matches('[data-reel-search]')){search=event.target.value.slice(0,80);drawPlayer()}});
  dialog.addEventListener('keydown',event=>{if(browserMode!=='clips'||event.target.closest('input,textarea,select,video')||!['ArrowLeft','ArrowRight'].includes(event.key))return;const rows=browseRows(),index=rows.findIndex(clip=>clip.id===selected),clip=rows[index+(event.key==='ArrowRight'?1:-1)];if(clip){event.preventDefault();choose(clip.id)}});
  dialog.addEventListener('cancel',event=>{event.preventDefault();const picker=dialog.querySelector('.reel-people-picker');if(picker.open)picker.open=false;else close({animated:true})});
  dialog.querySelector('[data-reel-queue]').addEventListener('scroll',()=>{if(dialog.dataset.reelSnap!=='watch')browseScroll=dialog.querySelector('[data-reel-queue]').scrollTop},{passive:true});
  sheetDrag=mountSheetDrag(dialog,{handle:dialog.querySelector('header'),dismiss:()=>close({animated:true}),onStart:()=>{cancelUiMotion(dialog);cancelUiMotion(dialog.querySelector('[data-reel-screen]'))}});
  dialog.addEventListener('close',()=>{if(dialog.open)return;sheetDrag.reset();cancelUiExit(dialog);stopVideo();stopViewport();cancelUiMotion(dialog);if(current()&&!isReplayDocked(media)){
    const target=opener?.isConnected?opener:root.querySelector('[data-home-reel-open],[data-home-reel-search]');
    if(returnPoint&&target===opener&&target.getClientRects().length)window.scrollBy({top:target.getBoundingClientRect().top-returnPoint.top,behavior:'instant'});
    target?.focus({preventScroll:true});returnPoint=null;
   }});
 };
 const open=(id,source,{returnToGame=false}={})=>{
  kind='';clips=visibleClips();search='';const rows=browseRows();if(!rows.length){paint();return}
  opener=source;clipReturn=null;returnPoint=source?.isConnected?{top:source.getBoundingClientRect().top}:null;setup();applyViewingMatchup(dialog,returnToGame?source:null);
  const closeButton=dialog.querySelector('[data-reel-close]');closeButton.innerHTML=returnToGame?'Back':replayIcon('x-lg');closeButton.setAttribute('aria-label',returnToGame?'Back to game':'Close highlights');if(isReplayDocked(media))restoreReplayDock(media);else closeReplayDock();browseScroll=0;dialog.querySelector('h2').textContent='DFL REPLAY';cancelUiExit(dialog);selected=id||rows[0].id;dialog.querySelector('[data-reel-search]').value='';
  dialog.showModal();stopViewport();stopViewport=fitDialogToViewport(dialog)||(()=>{});layout.reset();drawPlayer(true);scrollQueue(true);const people=dialog.querySelector('[data-reel-players]'),person=people.querySelector('[aria-pressed="true"]');people.scrollLeft=player&&person?Math.max(0,person.offsetLeft-people.offsetLeft-people.clientWidth/2+person.clientWidth/2):0;dialog.querySelector('h2').focus({preventScroll:true});
  setBrowserMode('clips');
  if(motion()){const sourceBox=source?.querySelector('img')?.getBoundingClientRect()||source?.getBoundingClientRect(),screen=dialog.querySelector('[data-reel-screen]'),box=screen.getBoundingClientRect();animateUi(dialog,[{opacity:0},{opacity:1}],{duration:180});if(sourceBox?.width&&sourceBox.height&&sourceBox.bottom>0&&sourceBox.top<innerHeight&&sourceBox.right>0&&sourceBox.left<innerWidth)animateUi(screen,[{transform:`translate(${sourceBox.x+sourceBox.width/2-box.x-box.width/2}px,${sourceBox.y+sourceBox.height/2-box.y-box.height/2}px) scale(${Math.max(.2,Math.min(1,sourceBox.width/box.width))})`,borderRadius:'10px'},{transform:'none',borderRadius:'0px'}],{duration:300,easing:'cubic-bezier(.2,.75,.25,1)'});animateUi(dialog.querySelector('.home-reel-browser'),[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{delay:60,duration:220})}
 };
 const scheduleExpiry=()=>{
  clearTimeout(expiryTimer);const session=highlightSession(now()),deadline=Math.min(session.active?session.expiresAt:session.nextOpensAt,...clips.map(clip=>Date.parse(clip.expires_at)));
  expiryTimer=setTimeout(()=>{if(current()){paint();void loop.request(true)}},Math.max(1,deadline-now()+20));
 };
 const paint=()=>{
  if(!current())return;
  clips=visibleClips();const options=playerOptions(),rows=browseHighlightClips(clips,{player,players:options,query:pageSearch}).filter(c=>!game||c.game_id===game);patchGameDay(root,markup(rows,now(),{players:options,player,total:clips.length,game,games:clips,query:pageSearch,layout:previewLayout}));drawPlayer();scheduleExpiry();
 };
 const refreshRows=async()=>{
  const token=++request,rows=await load({now:now()});if(!current()||token!==request)return;
  clips=activeHighlightClips(rows,now());if(savedBrowse){player=String(savedBrowse.player||'');game=String(savedBrowse.game||'');pageSearch=String(savedBrowse.pageSearch||'').slice(0,80);savedBrowse=null}root.removeAttribute('aria-busy');paint();
 };
 const loop=mountLiveScoreRefresh({active:()=>current()&&nearby,interval:120000,refresh:refreshRows,onError:()=>{if(current()){root.removeAttribute('aria-busy');paint()}}});
 const remember=()=>writeJourneyChoice('reel:'+title,{player,game,pageSearch});
 let savedBrowse=previewLayout==='feature'?null:readJourneyChoice(root,'reel:'+title);
 const change=event=>{if(event.target.matches('[data-home-reel-game]')){game=event.target.value;remember();paint()}};
 const input=event=>{if(event.target.matches('[data-home-reel-search]')){pageSearch=event.target.value.slice(0,80);remember();paint()}};
 const click=event=>{const filter=event.target.closest('[data-reel-player-filter]');if(filter){player=filter.dataset.reelPlayerFilter;remember();paint();return}const button=event.target.closest('[data-home-reel-open],[data-home-reel-clip]');if(button)open(button.dataset.homeReelClip,button)};
 const hidden=()=>{if(document.hidden)dialog?.querySelector('video')?.pause();else if(current())paint()};
 root.addEventListener('error',posterError,true);root.addEventListener('click',click);root.addEventListener('change',change);root.addEventListener('input',input);document.addEventListener('visibilitychange',hidden);
 const observer=typeof IntersectionObserver==='undefined'?null:new IntersectionObserver(entries=>{nearby=entries.some(entry=>entry.isIntersecting);if(nearby)loop.wake()},{rootMargin:'120px 0px'});observer?.observe(root);
 loop.start();scheduleExpiry();
 return {filterPlayer(id,query=''){player=String(id||'');pageSearch=String(query||'').slice(0,80);remember();paint()},openClip(id,options={}){if(!visibleClips().some(c=>c.id===String(id)))return false;player='';game='';search='';open(String(id),options.source||root.querySelector(`[data-home-reel-clip="${id}"]`)||root.querySelector('[data-home-reel-open]'),options);return true},updatePlayers:()=>paint(),refresh:()=>refreshRows().catch(()=>{if(current())paint()}),close:()=>close(),reset(){request++;clips=[];player='';game='';pageSearch='';search='';close();paint()},stop(){stopped=true;request++;sheetDrag?.stop();clearTimeout(expiryTimer);modeRequest++;observer?.disconnect();loop.stop();root.removeEventListener('error',posterError,true);root.removeEventListener('click',click);root.removeEventListener('change',change);root.removeEventListener('input',input);document.removeEventListener('visibilitychange',hidden);stopViewport();gameStrip?.stop();layout?.stop();if(isReplayDocked(media))detachReplayDock(media);else media?.stop();gameCenter?.stop();close();dialog?.remove()}};
}
