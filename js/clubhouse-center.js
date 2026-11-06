import {requestedMatchup,markStoryTarget} from './story-destinations.js';
import {viewingMatchup,setViewingMatchup} from './matchup-view-context.js';
import {banterMemoryMarkup} from './banter-memory-ui.js';
import {leaguePanel} from './game-day-panels.js';
import {esc} from './ui.js';
import {mountPlayerWeekDetails} from './player-week-details.js';
import {loadPlayerWeekDetails} from './player-week-detail-data.js';
import {mountLiveFootball} from './live-football.js';
import {loadGameDayMoments} from './game-day-moments.js';
import {recordChasesMarkup,mountRecordChases} from './record-chases.js';
import {syncLeadMarkers} from './game-day-moment-effects.js';
import {mountMatchupFinish} from './matchup-finish.js';
import {matchupReceiptData,shareMatchupReceipt} from './game-day-matchup-share.js';
import {buildGameDay} from './game-day-model.js';
import {matchupLineupHtml} from './game-day-lineup-comparison.js';
import {clubhouseDuelHtml} from './clubhouse-duel.js';
import {clubhouseGameMetrics,clubhouseMatchupOrder,initialClubhouseMatchup} from './clubhouse-center-model.js';
import {clubhouseScoreboardHtml,clubhousePulseHtml,clubhouseTeamStatsHtml,clubhousePositionStatsHtml,clubhouseScoreStripHtml} from './clubhouse-center-ui.js';
import {patchGameDay} from './game-day-dom.js';
import {mountPlayerSpotlight} from './player-spotlight.js';
import {mountScoreVfx} from './score-vfx.js';
import {animateScoreChanges} from './game-day-score-motion.js';
import {loadWeeklyStats,sleeper} from './sleeper.js';
import {currentMember} from './members.js';
import {readPageChoice,savePageChoice} from './page-disclosure.js';
import {accentOf} from './identity-rules.js';
import {mountClubhousePolish} from './clubhouse-polish.js';
import {animateUi} from './ui-motion.js';
import {mountSwipeTabs} from './swipe-tabs.js';

let stopCurrent=null;
export function mountClubhouseCenter(root,week,{active=()=>root.isConnected,loadStats=loadWeeklyStats,loadLeague=id=>sleeper.league(id),autoFinish=true}={}) {
 stopCurrent?.();
 let stopped=false,last=null,model=null,slots=null,vfx=null,leaderVfx=null,fxCard=null,stopScores=()=>{},stopMatchupSwipe=null,stopHeroSwipe=null,leaderFilter='all',includeBench=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),current=()=>!stopped&&root.isConnected&&active();
 let motion=readPageChoice('gameday-motion',['on','off'],'on')==='on';
 const scope=`clubhouse-matchup-${week.season}-${week.week}`;
 const make=(data={})=>{const next={...buildGameDay({week,members:week.members,memberId:currentMember()?.id,rows:week.games.flatMap(g=>[g.left,g.right].map(t=>({roster_id:t.roster,points:t.score,starters:[]}))),...data,...(slots?{rosterPositions:slots}:{})}),recordArchive:week.recordArchive??null};next.games=clubhouseMatchupOrder(next.games,currentMember()?.id);return next};
 model=make();
 const routeParams=new URLSearchParams(location.hash.split('?')[1]||''),requested=requestedMatchup(model.games,routeParams);
 let selected=initialClubhouseMatchup(model.games,{requested,remembered:readPageChoice(scope,model.games.map(g=>g.id),null)});
 let linkedFocusDone=false,linkedFocusInterrupted=false;const interruptLinkedFocus=()=>{linkedFocusInterrupted=true};
 const selectedGame=()=>model.games.find(g=>g.id===selected),cardOf=id=>root.querySelector(`[data-clubhouse-matchup="${CSS.escape(id)}"] .clubhouse-matchup-card`);
 const duelHost=root.querySelector('[data-clubhouse-duel]');
 const duelFor=id=>duelHost?.querySelector(`[data-clubhouse-duel-game="${CSS.escape(id)}"]`);
 const heroFor=card=>duelFor(card?.closest('[data-clubhouse-matchup]')?.dataset.clubhouseMatchup||selected)?.querySelector('.clubhouse-game-teams')||card?.querySelector('.clubhouse-game-teams');
 const football=mountLiveFootball(root,{getModel:()=>model,getGameId:()=>selected,getHost:()=>cardOf(selected)?.querySelector('[data-clubhouse-lineup]'),getMotion:()=>motion,active:()=>current()&&!root.querySelector('#clubhouse-panel-matchups')?.hidden});
 const recordWatch=mountRecordChases(root,{getModel:()=>last?model:null,getGame:selectedGame,getMotion:()=>motion});
 const finish=mountMatchupFinish(root,{getModel:()=>last?model:null,getGame:selectedGame,getSurface:()=>cardOf(selected),getScoreSurface:()=>heroFor(cardOf(selected)),getMotion:()=>motion,getOwner:()=>currentMember()?.id,allowAuto:()=>autoFinish,onShare:async()=>{const target=selected,sharedModel=model;const {items}=await loadGameDayMoments(sharedModel,last?.players||{},{gameId:target}).catch(()=>({items:[]}));if(!current()||selected!==target)return;return shareMatchupReceipt(matchupReceiptData(sharedModel,{gameId:target,moments:items}))}});
 const polish=mountClubhousePolish(root,{getHero:heroFor,getMotion:()=>motion,active:current});
 const stopAnimations=()=>{recordWatch.motionChanged();finish.cancel();stopScores();stopScores=()=>{};polish.stopTransient()};
 const spotlight=mountPlayerSpotlight(root,{getModel:()=>model,getMotion:()=>motion});
 const details=mountPlayerWeekDetails(root,{getModel:()=>last?model:null,active:current,load:(season,wk,options)=>loadPlayerWeekDetails(season,wk,{...options,load:loadStats}),onState:state=>{const node=root.querySelector('[data-clubhouse-stats-state]');if(node)node.textContent=state.failed?state.available?'Box scores could not refresh. Showing the last checked stats.':'Player box scores unavailable. Try Refresh scores.':state.stale?'Player box scores use the last cached update.':''}});
 const setMotion=()=>{
  root.querySelector('.clubhouse-page').dataset.motion=motion?'on':'off';
  for(const card of root.querySelectorAll('.clubhouse-matchup-card'))card.dataset.motion=motion?'on':'off';
  const button=root.querySelector('[data-clubhouse-motion]');if(button){button.textContent=`Motion ${motion?'on':'off'}`;button.setAttribute('aria-pressed',String(motion))}
  const leaders=root.querySelector('[data-clubhouse-leaders]');if(leaders)leaders.dataset.motion=motion?'on':'off';
  if(!motion||reduced.matches)stopAnimations();polish.motionChanged();finish.motionChanged();football.motionChanged();spotlight.setMotion(motion);
 };
 const enter=(card,options={})=>polish.enter(card,options);
 const paintActive=()=>{
  const game=selectedGame(),card=game&&cardOf(game.id);if(!card)return;
  setViewingMatchup(card,viewingMatchup(model,game));
  const duel=duelFor(game.id);if(duel){patchGameDay(duel,clubhouseDuelHtml(game,model));setViewingMatchup(duel,viewingMatchup(model,game));}
  const scoreRoot=duel||card;
  stopScores();stopScores=()=>{};
  card.style.setProperty('--clubhouse-left',accentOf(game.sides[0].identity));card.style.setProperty('--clubhouse-right',accentOf(game.sides[1].identity));
  const {lead,phase}=clubhouseGameMetrics(game,model.completed),previousPhase=card.dataset.matchupState;
  if(previousPhase!==phase.key){
   card.dataset.matchupState=phase.key;
   if(previousPhase)animateUi((duelFor(selected)||card).querySelector('.clubhouse-matchup-state'),[{opacity:.5,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:200,motion:motion&&!reduced.matches});
  }
  const scoreStrip=card.querySelector('[data-clubhouse-score-strip]');if(scoreStrip)patchGameDay(scoreStrip,clubhouseScoreStripHtml(game,model.completed));
  for(const [i,side] of ['left','right'].entries()){
   const total=scoreRoot.querySelector(`[data-score-${side}] [data-matchup-score-value]`),value=game.sides[i].score==null?'—':Number(game.sides[i].score).toFixed(2);if(total&&total.textContent!==value)total.textContent=value;
   const surface=scoreRoot.querySelector(`[data-score-${side}]`)?.closest('.clubhouse-game-side');if(surface){surface.dataset.lead=String(lead?.side===side);const badge=surface.querySelector('.clubhouse-score-lead');if(badge){badge.textContent=lead?.side===side?lead.label:'';badge.setAttribute('aria-hidden',String(lead?.side!==side))}surface.dataset.gamedayTeam=game.sides[i].roster;surface.querySelector('.clubhouse-remaining')?.classList.add('home-team-progress')}
  }
  syncLeadMarkers(scoreRoot,model,selected);

  let memory=card.querySelector('[data-banter-memory]');if(!memory){memory=document.createElement('div');memory.dataset.banterMemory='';card.querySelector('[data-clubhouse-position-stats]')?.after(memory)}if(memory)patchGameDay(memory,banterMemoryMarkup(model,game,{history:week.chirpHistory||[],trades:week.memoryTrades||[]}));
  const lineup=card.querySelector('[data-clubhouse-lineup]');if(lineup)patchGameDay(lineup,(last?matchupLineupHtml(game,{completed:model.completed,targetsAfter:true,headerControls:!!duelHost}):'<p class="clubhouse-stat-status">Checking the starting lineups…</p>')+'<div data-football-panel></div>');
  const records=card.querySelector('[data-clubhouse-records]');if(records)patchGameDay(records,recordChasesMarkup(model,game));recordWatch.update();
  const teamStats=card.querySelector('[data-clubhouse-team-stats]');if(teamStats)patchGameDay(teamStats,last?clubhouseTeamStatsHtml(game,model.completed):'');
  const position=card.querySelector('[data-clubhouse-position-stats]');if(position)patchGameDay(position,last?clubhousePositionStatsHtml(game,model.completed):'');
  if(fxCard!==card){vfx?.stop();fxCard=card;vfx=mountScoreVfx(card)}
  const linkedPlayer=routeParams.get('player');if(linkedPlayer){const row=card.querySelector(`[data-gameday-player="${CSS.escape(linkedPlayer)}"]`)?.closest('[data-ui-player-row]');if(row&&!linkedFocusDone){linkedFocusDone=true;const bench=row.closest('details');if(bench)bench.open=true;markStoryTarget(row);requestAnimationFrame(()=>{if(current()&&!linkedFocusInterrupted&&root.dataset.routeReturning!=='true'&&!card.closest('[hidden]')){row.scrollIntoView({block:'center',behavior:'instant'});row.focus({preventScroll:true})}})}}
  vfx?.refresh();setMotion();spotlight.update();finish.update();void football.update();void details.update();root.dispatchEvent(new CustomEvent('dfl:clubhouse-context'));
 };
 const paintLeaders=()=>{
  const host=root.querySelector('[data-clubhouse-leaders]');if(!host||root.querySelector('#clubhouse-panel-leaders')?.hidden)return;
  // Reconcile the rows without removing the sibling GPU effects surface.
  // Filters, score refreshes and returning to this tab all repaint the board.
  host.dataset.motion=motion?'on':'off';patchGameDay(host.querySelector('[data-clubhouse-leader-board]'),leaguePanel(model,{filter:leaderFilter,includeBench}));
  if(!leaderVfx)leaderVfx=mountScoreVfx(host);else leaderVfx.refresh();
  const nfl=root.querySelector('[data-clubhouse-nfl-scoreboard]');if(nfl)patchGameDay(nfl,model.events.length?`<details class="clubhouse-nfl-scoreboard"><summary>NFL scoreboard · ${model.events.length} games</summary><ul>${model.events.map(event=>`<li><strong>${event.teams.map(team=>esc(team.name)+(team.score==null?'':` ${Number(team.score)}`)).join(' · ')}</strong><span>${esc(event.label||event.state)}</span></li>`).join('')}</ul></details>`:'');
  void details.update();
 };
 const archiveReady=event=>{const detail=event.detail;if(!current()||detail?.season!==week.season||detail.week!==week.week)return;week.recordArchive=detail.archive;model.recordArchive=detail.archive;paintActive()};
 root.addEventListener('dfl:record-archive-ready',archiveReady);
 let revealedSelection=null,revealFrame=0;
 const revealSelection=()=>{
  if(revealedSelection===selected)return;
  const rail=root.querySelector('.clubhouse-scoreboard-grid'),button=rail?.querySelector('[aria-pressed="true"]');
  if(!rail?.clientWidth||!button)return; // A hidden tab will reveal on activation.
  const r=rail.getBoundingClientRect(),b=button.getBoundingClientRect();
  if(b.left<r.left||b.right>r.right){
   const left=rail.scrollLeft+b.left-r.left-(r.width-b.width)/2;
   if(revealedSelection!==null&&motion&&!reduced.matches&&document.documentElement.dataset.uiMotion!=='off')rail.scrollTo({left,behavior:'smooth'});
   else rail.scrollLeft=left;
  }
  revealedSelection=selected;
 };
 const scheduleReveal=()=>{
  if(revealedSelection===selected||revealFrame)return;
  // The router applies the destination's layout after render returns. Measure
  // the rail in the next frame, not in the preceding Home page's geometry.
  revealFrame=requestAnimationFrame(()=>{revealFrame=0;if(current())revealSelection()});
 };
 let railWidth=0,railBrowsing=false,observedChip=null,chipWidth=0;
 const railHost=root.querySelector('[data-clubhouse-scoreboard]'),browseRail=()=>{railBrowsing=true};
 railHost?.addEventListener('pointerdown',browseRail);railHost?.addEventListener('wheel',browseRail,{passive:true});
 // Scores and web fonts can settle after the rail's first measurement. Watch
 // the selected chip too, without pulling a manually browsed rail back home.
 const chipResize=new ResizeObserver(entries=>{
  const width=entries[0]?.contentRect.width||0;
  if(Math.abs(width-chipWidth)>1){chipWidth=width;if(!railBrowsing){revealedSelection=null;scheduleReveal()}}
 });
 const railResize=new ResizeObserver(entries=>{const width=entries[0]?.contentRect.width||0;if(Math.abs(width-railWidth)>1){railWidth=width;revealedSelection=null;scheduleReveal()}});
 if(railHost)railResize.observe(railHost);
 const paintBoard=()=>{
  const board=root.querySelector('[data-clubhouse-scoreboard]');if(board)patchGameDay(board,clubhouseScoreboardHtml(model,selected,{strip:true}));
  const chip=board?.querySelector('[aria-pressed="true"]');
  if(chip!==observedChip){chipResize.disconnect();observedChip=chip;chipWidth=0;if(chip)chipResize.observe(chip)}
  scheduleReveal();
  for(const pulse of root.querySelectorAll('[data-clubhouse-pulse]'))patchGameDay(pulse,clubhousePulseHtml(model));
  for(const section of root.querySelectorAll('[data-clubhouse-matchup]'))section.hidden=section.dataset.clubhouseMatchup!==selected;
  for(const stage of duelHost?.children||[])stage.hidden=stage.dataset.clubhouseDuelGame!==selected;
 };
 const choose=(id,{scroll=true,entrance=true,fromSwipe=false}={})=>{
  if(!model.games.some(g=>g.id===id)||id===selected)return;
  if(!fromSwipe){stopMatchupSwipe?.cancel();stopHeroSwipe?.cancel()}
  const direction=Math.sign(model.games.findIndex(g=>g.id===id)-model.games.findIndex(g=>g.id===selected));
  stopAnimations();selected=id;railBrowsing=false;savePageChoice(scope,id);
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('matchup',id);params.delete('moment');try{history.replaceState(history.state,'',location.hash.split('?')[0]+'?'+params)}catch{/* Matchup browsing also works in previews that restrict history. */}
  paintBoard();paintActive();const card=cardOf(id);if(entrance&&!model.completed)enter(card,{direction});if(!fromSwipe&&!entrance)polish.land(card,{direction});
  const heading=card?.querySelector('[data-clubhouse-lineup] h3')||card?.querySelector('header');if(heading&&scroll){heading.tabIndex=-1;heading.focus({preventScroll:true});if(scroll)heading.scrollIntoView({behavior:motion&&!reduced.matches?'smooth':'instant',block:'start'})}
 };
 const swipeSurface=root.querySelector('.clubhouse-matchup-list');
 if(swipeSurface){
  // This area pages through matchups; the outer Clubhouse tabs keep their own
  // gesture elsewhere. Nested clips, charts and controls retain native input.
  swipeSurface.dataset.noSwipe='';
  const prepared=new Set();let previewModel=null;
  const sectionFor=id=>root.querySelector(`[data-clubhouse-matchup="${CSS.escape(id)}"]`);
  stopMatchupSwipe=mountSwipeTabs(swipeSurface,null,{
   getButtons:()=>[...root.querySelectorAll('[data-clubhouse-scoreboard] [data-clubhouse-game]')],
   selected:button=>button.dataset.clubhouseGame===selected,
   getPanel:()=>sectionFor(selected),
   getPanelForButton:button=>{
    const id=button?.dataset.clubhouseGame,game=model.games.find(game=>game.id===id),card=game&&cardOf(id);
    if(previewModel!==model){prepared.clear();previewModel=model}
    // Prepare the neighbor from the already loaded model, without fetching a
    // second matchup or mounting its effects while it is only a swipe preview.
    if(card&&id!==selected&&!prepared.has(id)){
     const lineup=card.querySelector('[data-clubhouse-lineup]');if(lineup&&last)patchGameDay(lineup,matchupLineupHtml(game,{completed:model.completed,targetsAfter:true,headerControls:!!duelHost})+'<div data-football-panel></div>');
     const stats=card.querySelector('[data-clubhouse-team-stats]');if(stats&&last)patchGameDay(stats,clubhouseTeamStatsHtml(game,model.completed));
     prepared.add(id);
    }
    return id?sectionFor(id):null;
   },
   activate:button=>{stopHeroSwipe?.cancel();choose(button.dataset.clubhouseGame,{scroll:false,entrance:false,fromSwipe:true})},
   onSettled:button=>{if(button.dataset.clubhouseGame===selected)polish.land(cardOf(selected))},
   accepts:()=>current()&&model.games.length>1&&!root.querySelector('#clubhouse-panel-matchups')?.hidden&&!document.querySelector('dialog[open]'),
   exclude:'button:not(.player-card-trigger):not(.gameday-player-tap),input,select,textarea,summary,form,[contenteditable],canvas,video,[data-home-highlights-slot],[data-nfl-game-center],.table-scroll,.table-wrap,.tabscroll,.gd-watch-reel',
  });
 }
 if(duelHost){
  const prepared=new Set();let previewModel=null;
  stopHeroSwipe=mountSwipeTabs(duelHost,null,{
   getButtons:()=>[...root.querySelectorAll('[data-clubhouse-scoreboard] [data-clubhouse-game]')],
   selected:button=>button.dataset.clubhouseGame===selected,getPanel:()=>duelFor(selected),
   getPanelForButton:button=>{
    const id=button?.dataset.clubhouseGame,stage=id&&duelFor(id),game=model.games.find(g=>g.id===id);
    if(previewModel!==model){prepared.clear();previewModel=model}
    if(stage&&game&&id!==selected&&!prepared.has(id)){patchGameDay(stage,clubhouseDuelHtml(game,model));prepared.add(id)}
    return stage;
   },
   activate:button=>{stopMatchupSwipe?.cancel();choose(button.dataset.clubhouseGame,{scroll:false,entrance:false,fromSwipe:true})},
   onSettled:()=>polish.land(cardOf(selected)),accepts:()=>current()&&model.games.length>1&&!document.querySelector('dialog[open]'),
   exclude:'button,input,select,textarea,summary,[contenteditable]',
  });
 }
 const click=event=>{
  const game=event.target.closest('[data-clubhouse-game]');if(game){choose(game.dataset.clubhouseGame,{scroll:false,entrance:false});return}
  const filter=event.target.closest('[data-league-filter]');if(filter){leaderFilter=filter.dataset.leagueFilter;paintLeaders();return}
  if(event.target.closest('[data-clubhouse-motion]')){stopMatchupSwipe?.cancel();stopHeroSwipe?.cancel();motion=!motion;savePageChoice('gameday-motion',motion?'on':'off');setMotion();return}
 };
 const change=event=>{if(event.target.matches('[data-league-bench]')){includeBench=event.target.checked;paintLeaders()}};
 const stripKey=event=>{
  if(event.altKey||event.ctrlKey||event.metaKey||!event.target.closest('.clubhouse-matchup-strip'))return;
  const index=model.games.findIndex(game=>game.id===selected),key=event.key;
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(key))return;
  event.preventDefault();event.stopPropagation();
  const next=key==='Home'?0:key==='End'?model.games.length-1:index+(key==='ArrowRight'?1:-1),game=model.games[next];
  if(game){choose(game.id,{scroll:false,entrance:false});root.querySelector(`.clubhouse-matchup-strip [data-clubhouse-game="${CSS.escape(game.id)}"]`)?.focus({preventScroll:true})}
 };
 const onTab=event=>{if(event.detail?.tab!=='matchups')stopMatchupSwipe?.cancel();if(event.detail?.tab==='leaders')paintLeaders();else if(event.detail?.tab==='matchups'){scheduleReveal();void football.update();}};
 const onRoute=()=>{if(!active())stop()};
 const onReduce=()=>{if(reduced.matches)stopAnimations()};
 const onVisibility=()=>{if(document.visibilityState!=='visible')stopAnimations()};
 const stop=()=>{if(stopped)return;stopped=true;root.removeEventListener('pointerdown',interruptLinkedFocus);root.removeEventListener('keydown',interruptLinkedFocus);window.removeEventListener('wheel',interruptLinkedFocus);railResize.disconnect();chipResize.disconnect();railHost?.removeEventListener('pointerdown',browseRail);railHost?.removeEventListener('wheel',browseRail);stopMatchupSwipe?.();stopHeroSwipe?.();cancelAnimationFrame(revealFrame);root.removeEventListener('dfl:record-archive-ready',archiveReady);recordWatch.stop();football.stop();details.stop();stopAnimations();finish.stop();polish.stop();vfx?.stop();leaderVfx?.stop();spotlight.stop();root.removeEventListener('keydown',stripKey);root.removeEventListener('change',change);root.removeEventListener('dfl:clubhouse-tab',onTab);root.removeEventListener('click',click);window.removeEventListener('hashchange',onRoute);reduced.removeEventListener('change',onReduce);document.removeEventListener('visibilitychange',onVisibility)};
 root.addEventListener('keydown',stripKey);root.addEventListener('change',change);root.addEventListener('dfl:clubhouse-tab',onTab);root.addEventListener('click',click);window.addEventListener('hashchange',onRoute);reduced.addEventListener('change',onReduce);document.addEventListener('visibilitychange',onVisibility);
 if(routeParams.has('player')){root.addEventListener('pointerdown',interruptLinkedFocus,{once:true});root.addEventListener('keydown',interruptLinkedFocus,{once:true});window.addEventListener('wheel',interruptLinkedFocus,{passive:true,once:true})}
 paintBoard();paintActive();paintLeaders();stopCurrent=stop;
 // Box scores and league slot metadata load independently of the score feed.
 void loadLeague(week.leagueId).then(league=>{if(current()&&Array.isArray(league?.roster_positions)){slots=league.roster_positions;if(last){model=make(last);model.checkedAt=last.checkedAt;model.scoreStatus='ready';model.nflAvailable=!!last.nfl||week.completed;model.playersAvailable=!!last.players;model.snapshot.checkedAt=last.checkedAt;paintActive()}}}).catch(()=>{});
 let entered=false;
 return {
  getModel:()=>model,getGame:selectedGame,getPlayerDirectory:()=>last?.players||null,
  update(data){if(!current())return;stopAnimations();const previous=last?model.snapshot:null;last={rows:data.rows,rosters:data.rosters||[],players:data.players,nfl:data.nfl?{teams:data.nfl,payload:data.nflPayload,fetchedAt:data.nflFetchedAt}:null,checkedAt:Date.now()};model=make(last);model.checkedAt=last.checkedAt;model.scoreStatus='ready';model.nflAvailable=!!last.nfl||week.completed;model.playersAvailable=!!last.players;model.snapshot.checkedAt=last.checkedAt;paintBoard();paintActive();paintLeaders();const card=cardOf(selected);if(!entered){entered=true;if(!model.completed)enter(card)}if(previous&&card&&!model.completed)stopScores=animateScoreChanges(card,{previous,model,motion,gameId:selected,feedback:true,extraRoots:duelFor(selected)?[duelFor(selected)]:[]});void details.update({force:!!data.force})},
  fail(){if(!current())return;stopAnimations();if(!last)for(const host of root.querySelectorAll('[data-clubhouse-lineup]'))host.innerHTML='<p class="clubhouse-stat-status">Lineups unavailable. Refresh scores to retry.</p>'},
  stop,
 };
}
