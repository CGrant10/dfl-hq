import {banterMemoryMarkup} from './banter-memory-ui.js';
import {leaguePanel} from './game-day-panels.js';
import {esc} from './ui.js';
import {mountPlayerWeekDetails} from './player-week-details.js';
import {loadPlayerWeekDetails} from './player-week-detail-data.js';
import {mountLiveFootball} from './live-football.js';
import {mountMatchupHighlights} from './matchup-highlights.js';
import {recordChasesMarkup,mountRecordChases} from './record-chases.js';
import {syncLeadMarkers} from './game-day-moment-effects.js';
import {mountMatchupFinish} from './matchup-finish.js';
import {matchupReceiptData,shareMatchupReceipt} from './game-day-matchup-share.js';
import {buildGameDay} from './game-day-model.js';
import {matchupLineupHtml} from './game-day-lineup-comparison.js';
import {clubhouseGameMetrics} from './clubhouse-center-model.js';
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

let stopCurrent=null;
export function mountClubhouseCenter(root,week,{active=()=>root.isConnected,loadStats=loadWeeklyStats,loadLeague=id=>sleeper.league(id),autoFinish=true}={}) {
 stopCurrent?.();
 let stopped=false,last=null,model=null,slots=null,vfx=null,leaderVfx=null,fxCard=null,stopScores=()=>{},leaderFilter='all',includeBench=false;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),current=()=>!stopped&&root.isConnected&&active();
 let motion=readPageChoice('gameday-motion',['on','off'],'on')==='on';
 const scope=`clubhouse-matchup-${week.season}-${week.week}`;
 const make=(data={})=>({...buildGameDay({week,members:week.members,memberId:currentMember()?.id,rows:week.games.flatMap(g=>[g.left,g.right].map(t=>({roster_id:t.roster,points:t.score,starters:[]}))),...data,...(slots?{rosterPositions:slots}:{})}),recordArchive:week.recordArchive??null});
 model=make();
 const routeParams=new URLSearchParams(location.hash.split('?')[1]||''),requested=routeParams.get('matchup')||model.games.find(g=>g.sides.some(s=>String(s.roster)===routeParams.get('roster')))?.id;
 let selected=model.games.find(g=>g.id===requested)?.id||readPageChoice(scope,model.games.map(g=>g.id),(model.games.find(g=>g.isMine)||model.games[0])?.id);
 const selectedGame=()=>model.games.find(g=>g.id===selected),cardOf=id=>root.querySelector(`[data-clubhouse-matchup="${CSS.escape(id)}"] .clubhouse-matchup-card`);
 const football=mountLiveFootball(root,{getModel:()=>model,getGameId:()=>selected,getHost:()=>cardOf(selected)?.querySelector('[data-clubhouse-lineup]'),getMotion:()=>motion,active:()=>current()&&!root.querySelector('#clubhouse-panel-matchups')?.hidden});
 const recordWatch=mountRecordChases(root,{getModel:()=>last?model:null,getGame:selectedGame,getMotion:()=>motion});
 const highlights=mountMatchupHighlights(root,{getModel:()=>last?model:null,getGame:selectedGame,getPlayers:()=>last?.players||{},getHost:()=>{const card=cardOf(selected),lineup=card?.querySelector('[data-clubhouse-lineup]');let host=card?.querySelector('[data-clubhouse-highlights]');if(!host&&lineup){host=document.createElement('div');host.dataset.clubhouseHighlights='';lineup.before(host)}return host},getMotion:()=>motion,active:()=>current()&&!root.querySelector('#clubhouse-panel-matchups')?.hidden});
 const finish=mountMatchupFinish(root,{getModel:()=>last?model:null,getGame:selectedGame,getSurface:()=>cardOf(selected),getMotion:()=>motion,getOwner:()=>currentMember()?.id,allowAuto:()=>autoFinish,onShare:async()=>{const target=selected,sharedModel=model;await highlights.update();if(!current()||selected!==target)return;return shareMatchupReceipt(matchupReceiptData(sharedModel,{gameId:target,moments:highlights.items()}))}});
 const polish=mountClubhousePolish(root,{getMotion:()=>motion,active:current});
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
  stopScores();stopScores=()=>{};
  card.style.setProperty('--clubhouse-left',accentOf(game.sides[0].identity));card.style.setProperty('--clubhouse-right',accentOf(game.sides[1].identity));
  const {lead}=clubhouseGameMetrics(game,model.completed);
  const scoreStrip=card.querySelector('[data-clubhouse-score-strip]');if(scoreStrip)patchGameDay(scoreStrip,clubhouseScoreStripHtml(game,model.completed));
  for(const [i,side] of ['left','right'].entries()){
   const total=card.querySelector(`[data-score-${side}] [data-matchup-score-value]`),value=game.sides[i].score==null?'—':Number(game.sides[i].score).toFixed(2);if(total&&total.textContent!==value)total.textContent=value;
   const surface=card.querySelector(`[data-score-${side}]`)?.closest('.clubhouse-game-side');if(surface){surface.dataset.lead=String(lead?.side===side);const badge=surface.querySelector('.clubhouse-score-lead');if(badge){badge.textContent=lead?.side===side?lead.label:'';badge.setAttribute('aria-hidden',String(lead?.side!==side))}surface.dataset.gamedayTeam=game.sides[i].roster;surface.querySelector('.clubhouse-remaining')?.classList.add('home-team-progress')}
  }
  syncLeadMarkers(card,model,selected);

  let memory=card.querySelector('[data-banter-memory]');if(!memory){memory=document.createElement('div');memory.dataset.banterMemory='';card.querySelector('[data-clubhouse-lineup]')?.before(memory)}if(memory)patchGameDay(memory,banterMemoryMarkup(model,game,{history:week.chirpHistory||[],trades:week.memoryTrades||[]}));
  const lineup=card.querySelector('[data-clubhouse-lineup]');if(lineup)patchGameDay(lineup,'<div data-football-panel></div>'+(last?matchupLineupHtml(game,{completed:model.completed}):'<p class="clubhouse-stat-status">Checking the starting lineups…</p>'));
  const records=card.querySelector('[data-clubhouse-records]');if(records)patchGameDay(records,recordChasesMarkup(model,game));recordWatch.update();
  const teamStats=card.querySelector('[data-clubhouse-team-stats]');if(teamStats)patchGameDay(teamStats,last?clubhouseTeamStatsHtml(game,model.completed):'');
  const position=card.querySelector('[data-clubhouse-position-stats]');if(position)patchGameDay(position,last?clubhousePositionStatsHtml(game,model.completed):'');
  if(fxCard!==card){vfx?.stop();fxCard=card;vfx=mountScoreVfx(card)}
  vfx?.refresh();setMotion();spotlight.update();finish.update();void football.update();void highlights.update();void details.update();root.dispatchEvent(new CustomEvent('dfl:clubhouse-context'));
 };
 const paintLeaders=()=>{
  const host=root.querySelector('[data-clubhouse-leaders]');if(!host||root.querySelector('#clubhouse-panel-leaders')?.hidden)return;
  host.dataset.motion=motion?'on':'off';patchGameDay(host,leaguePanel(model,{filter:leaderFilter,includeBench}));
  if(!leaderVfx)leaderVfx=mountScoreVfx(host);else leaderVfx.refresh();
  const nfl=root.querySelector('[data-clubhouse-nfl-scoreboard]');if(nfl)patchGameDay(nfl,model.events.length?`<details class="clubhouse-nfl-scoreboard"><summary>NFL scoreboard · ${model.events.length} games</summary><ul>${model.events.map(event=>`<li><strong>${event.teams.map(team=>esc(team.name)+(team.score==null?'':` ${Number(team.score)}`)).join(' · ')}</strong><span>${esc(event.label||event.state)}</span></li>`).join('')}</ul></details>`:'');
  void details.update();
 };
 const archiveReady=event=>{const detail=event.detail;if(!current()||detail?.season!==week.season||detail.week!==week.week)return;week.recordArchive=detail.archive;model.recordArchive=detail.archive;paintActive()};
 root.addEventListener('dfl:record-archive-ready',archiveReady);
 const paintBoard=()=>{
  const board=root.querySelector('[data-clubhouse-scoreboard]');if(board)patchGameDay(board,clubhouseScoreboardHtml(model,selected));
  for(const pulse of root.querySelectorAll('[data-clubhouse-pulse]'))patchGameDay(pulse,clubhousePulseHtml(model));
  for(const section of root.querySelectorAll('[data-clubhouse-matchup]'))section.hidden=section.dataset.clubhouseMatchup!==selected;
 };
 const choose=(id,{scroll=true}={})=>{
  if(!model.games.some(g=>g.id===id)||id===selected)return;
  const direction=Math.sign(model.games.findIndex(g=>g.id===id)-model.games.findIndex(g=>g.id===selected));
  stopAnimations();selected=id;savePageChoice(scope,id);
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('matchup',id);params.delete('moment');try{history.replaceState(history.state,'',location.hash.split('?')[0]+'?'+params)}catch{/* Matchup browsing also works in previews that restrict history. */}
  paintBoard();paintActive();const card=cardOf(id);if(!model.completed)enter(card,{direction});
  const heading=card?.querySelector('header');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});if(scroll)heading.scrollIntoView({behavior:motion&&!reduced.matches?'smooth':'instant',block:'start'})}
 };
 const click=event=>{
  const game=event.target.closest('[data-clubhouse-game]');if(game){choose(game.dataset.clubhouseGame);return}
  const filter=event.target.closest('[data-league-filter]');if(filter){leaderFilter=filter.dataset.leagueFilter;paintLeaders();return}
  if(event.target.closest('[data-clubhouse-motion]')){motion=!motion;savePageChoice('gameday-motion',motion?'on':'off');setMotion();return}
 };
 const change=event=>{if(event.target.matches('[data-league-bench]')){includeBench=event.target.checked;paintLeaders()}};
 const onTab=event=>{if(event.detail?.tab==='leaders')paintLeaders();else if(event.detail?.tab==='matchups'){void football.update();void highlights.update()}};
 const onRoute=()=>{if(!active())stop()};
 const onReduce=()=>{if(reduced.matches)stopAnimations()};
 const onVisibility=()=>{if(document.visibilityState!=='visible')stopAnimations()};
 const stop=()=>{if(stopped)return;stopped=true;root.removeEventListener('dfl:record-archive-ready',archiveReady);recordWatch.stop();football.stop();highlights.stop();details.stop();stopAnimations();finish.stop();polish.stop();vfx?.stop();leaderVfx?.stop();spotlight.stop();root.removeEventListener('change',change);root.removeEventListener('dfl:clubhouse-tab',onTab);root.removeEventListener('click',click);window.removeEventListener('hashchange',onRoute);reduced.removeEventListener('change',onReduce);document.removeEventListener('visibilitychange',onVisibility)};
 root.addEventListener('change',change);root.addEventListener('dfl:clubhouse-tab',onTab);root.addEventListener('click',click);window.addEventListener('hashchange',onRoute);reduced.addEventListener('change',onReduce);document.addEventListener('visibilitychange',onVisibility);
 paintBoard();paintActive();paintLeaders();stopCurrent=stop;
 // Box scores and league slot metadata load independently of the score feed.
 void loadLeague(week.leagueId).then(league=>{if(current()&&Array.isArray(league?.roster_positions)){slots=league.roster_positions;if(last){model=make(last);model.checkedAt=last.checkedAt;model.scoreStatus='ready';model.nflAvailable=!!last.nfl||week.completed;model.playersAvailable=!!last.players;model.snapshot.checkedAt=last.checkedAt;paintActive()}}}).catch(()=>{});
 let entered=false;
 return {
  getModel:()=>model,getGame:selectedGame,
  update(data){if(!current())return;stopAnimations();const previous=last?model.snapshot:null;last={rows:data.rows,rosters:data.rosters||[],players:data.players,nfl:data.nfl?{teams:data.nfl,payload:data.nflPayload,fetchedAt:data.nflFetchedAt}:null,checkedAt:Date.now()};model=make(last);model.checkedAt=last.checkedAt;model.scoreStatus='ready';model.nflAvailable=!!last.nfl||week.completed;model.playersAvailable=!!last.players;model.snapshot.checkedAt=last.checkedAt;paintBoard();paintActive();paintLeaders();const card=cardOf(selected);if(!entered){entered=true;if(!model.completed)enter(card)}if(previous&&card&&!model.completed)stopScores=animateScoreChanges(card,{previous,model,motion,gameId:selected,feedback:true});void details.update({force:!!data.force})},
  fail(){if(!current())return;stopAnimations();if(!last)for(const host of root.querySelectorAll('[data-clubhouse-lineup]'))host.innerHTML='<p class="clubhouse-stat-status">Lineups unavailable. Refresh scores to retry.</p>'},
  stop,
 };
}
