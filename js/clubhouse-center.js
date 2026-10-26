import {mountLiveFootball} from './live-football.js';
import {mountMatchupHighlights} from './matchup-highlights.js';
import {recordChasesMarkup,mountRecordChases} from './record-chases.js';
import {syncLeadMarkers} from './game-day-moment-effects.js';
import {mountMatchupFinish} from './matchup-finish.js';
import {matchupReceiptData,shareMatchupReceipt} from './game-day-matchup-share.js';
import {buildGameDay} from './game-day-model.js';
import {matchupLineupHtml} from './game-day-lineup-comparison.js';
import {clubhousePlayerStatLine,clubhouseGameMetrics} from './clubhouse-center-model.js';
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
 let stopped=false,last=null,model=null,stats={loading:true},statsBusy=false,statsChecked=0,statsRequest=0,statsTimer=null,slots=null,vfx=null,fxCard=null,stopScores=()=>{};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),current=()=>!stopped&&root.isConnected&&active();
 let motion=readPageChoice('gameday-motion',['on','off'],'on')==='on';
 const scope=`clubhouse-matchup-${week.season}-${week.week}`;
 const make=(data={})=>({...buildGameDay({week,members:week.members,memberId:currentMember()?.id,rows:week.games.flatMap(g=>[g.left,g.right].map(t=>({roster_id:t.roster,points:t.score,starters:[]}))),...data,...(slots?{rosterPositions:slots}:{})}),recordArchive:week.recordArchive??null});
 model=make();
 const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('matchup');
 let selected=model.games.find(g=>g.id===requested)?.id||readPageChoice(scope,model.games.map(g=>g.id),(model.games.find(g=>g.isMine)||model.games[0])?.id);
 const selectedGame=()=>model.games.find(g=>g.id===selected),cardOf=id=>root.querySelector(`[data-clubhouse-matchup="${CSS.escape(id)}"] .clubhouse-matchup-card`);
 const football=mountLiveFootball(root,{getModel:()=>model,getGameId:()=>selected,getHost:()=>cardOf(selected)?.querySelector('[data-clubhouse-lineup]'),getMotion:()=>motion,active:()=>current()&&!root.querySelector('#clubhouse-panel-matchups')?.hidden});
 const recordWatch=mountRecordChases(root,{getModel:()=>last?model:null,getGame:selectedGame,getMotion:()=>motion});
 const highlights=mountMatchupHighlights(root,{getModel:()=>last?model:null,getGame:selectedGame,getPlayers:()=>last?.players||{},getHost:()=>{const card=cardOf(selected),lineup=card?.querySelector('[data-clubhouse-lineup]');let host=card?.querySelector('[data-clubhouse-highlights]');if(!host&&lineup){host=document.createElement('div');host.dataset.clubhouseHighlights='';lineup.before(host)}return host},getMotion:()=>motion,active:()=>current()&&!root.querySelector('#clubhouse-panel-matchups')?.hidden});
 const finish=mountMatchupFinish(root,{getModel:()=>last?model:null,getGame:selectedGame,getSurface:()=>cardOf(selected),getMotion:()=>motion,getOwner:()=>currentMember()?.id,allowAuto:()=>autoFinish,onShare:async()=>{await highlights.update();return shareMatchupReceipt(matchupReceiptData(model,{gameId:selected,moments:highlights.items()}))}});
 const polish=mountClubhousePolish(root,{getMotion:()=>motion,active:current});
 const stopAnimations=()=>{recordWatch.motionChanged();finish.cancel();stopScores();stopScores=()=>{};polish.stopTransient()};
 const spotlight=mountPlayerSpotlight(root,{getModel:()=>model,getMotion:()=>motion});
 const setMotion=()=>{
  root.querySelector('.clubhouse-page').dataset.motion=motion?'on':'off';
  for(const card of root.querySelectorAll('.clubhouse-matchup-card'))card.dataset.motion=motion?'on':'off';
  const button=root.querySelector('[data-clubhouse-motion]');if(button){button.textContent=`Motion ${motion?'on':'off'}`;button.setAttribute('aria-pressed',String(motion))}
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
  const lines=new Map(game.sides.flatMap(t=>[...t.lineup,...t.bench]).map(p=>[`${p.roster}:${p.id}`,clubhousePlayerStatLine(p,stats,model)]));
  const lineup=card.querySelector('[data-clubhouse-lineup]');if(lineup)patchGameDay(lineup,'<div data-football-panel></div>'+(last?matchupLineupHtml(game,{statLines:lines,completed:model.completed}):'<p class="clubhouse-stat-status">Checking the starting lineups…</p>'));
  const records=card.querySelector('[data-clubhouse-records]');if(records)patchGameDay(records,recordChasesMarkup(model,game));recordWatch.update();
  const teamStats=card.querySelector('[data-clubhouse-team-stats]');if(teamStats)patchGameDay(teamStats,last?clubhouseTeamStatsHtml(game,model.completed):'');
  const position=card.querySelector('[data-clubhouse-position-stats]');if(position)patchGameDay(position,last?clubhousePositionStatsHtml(game,model.completed):'');
  if(fxCard!==card){vfx?.stop();fxCard=card;vfx=mountScoreVfx(card)}
  vfx?.refresh();setMotion();spotlight.update();finish.update();void football.update();void highlights.update();
 };
 const archiveReady=event=>{const detail=event.detail;if(!current()||detail?.season!==week.season||detail.week!==week.week)return;week.recordArchive=detail.archive;model.recordArchive=detail.archive;paintActive()};
 root.addEventListener('dfl:record-archive-ready',archiveReady);
 const paintBoard=()=>{
  const board=root.querySelector('[data-clubhouse-scoreboard]');if(board)patchGameDay(board,clubhouseScoreboardHtml(model,selected));
  for(const pulse of root.querySelectorAll('[data-clubhouse-pulse]'))patchGameDay(pulse,clubhousePulseHtml(model));
  for(const section of root.querySelectorAll('[data-clubhouse-matchup]'))section.hidden=section.dataset.clubhouseMatchup!==selected;
 };
 const readStats=async(force=false)=>{
  if(statsBusy||!current()||!force&&Date.now()-statsChecked<60000)return;
  statsBusy=true;const token=++statsRequest;
  try{const bundle=await Promise.race([loadStats(week.season,week.week,{maxAgeMs:force?0:60000}),new Promise((_,reject)=>{statsTimer=setTimeout(()=>reject(Error('Box scores timed out')),12000)})]);if(!current()||token!==statsRequest)return;stats={...bundle,loading:false};statsChecked=Date.now()}
  catch{if(!current()||token!==statsRequest)return;stats={...stats,loading:false,error:true};statsChecked=Date.now()}
  finally{clearTimeout(statsTimer);statsTimer=null;if(current()&&token===statsRequest){statsBusy=false;const state=root.querySelector('[data-clubhouse-stats-state]');if(state)state.textContent=stats.error?stats.data?.length?'Box scores could not refresh. Showing the last checked stats.':'Player box scores unavailable. Try Refresh scores.':stats.stale?'Player box scores use the last cached update.':'';const players=new Map(model.games.flatMap(g=>g.sides.flatMap(t=>[...t.lineup,...t.bench])).map(p=>[`${p.roster}:${p.id}`,p]));for(const line of cardOf(selected)?.querySelectorAll('[data-clubhouse-stat-key]')||[]){const p=players.get(line.dataset.clubhouseStatKey);if(p)line.textContent=clubhousePlayerStatLine(p,stats,model)}vfx?.refresh()}}
 };
 const choose=(id,{scroll=true}={})=>{
  if(!model.games.some(g=>g.id===id)||id===selected)return;
  const direction=Math.sign(model.games.findIndex(g=>g.id===id)-model.games.findIndex(g=>g.id===selected));
  stopAnimations();selected=id;savePageChoice(scope,id);
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('matchup',id);try{history.replaceState(history.state,'',location.hash.split('?')[0]+'?'+params)}catch{/* Matchup browsing also works in previews that restrict history. */}
  paintBoard();paintActive();const card=cardOf(id);if(!model.completed)enter(card,{direction});
  const heading=card?.querySelector('header');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});if(scroll)heading.scrollIntoView({behavior:motion&&!reduced.matches?'smooth':'instant',block:'start'})}
 };
 const click=event=>{
  const game=event.target.closest('[data-clubhouse-game]');if(game){choose(game.dataset.clubhouseGame);return}
  if(event.target.closest('[data-clubhouse-motion]')){motion=!motion;savePageChoice('gameday-motion',motion?'on':'off');setMotion();return}
 };
 const onRoute=()=>{if(!active())stop()};
 const onReduce=()=>{if(reduced.matches)stopAnimations()};
 const onVisibility=()=>{if(document.visibilityState!=='visible')stopAnimations()};
 const stop=()=>{if(stopped)return;stopped=true;root.removeEventListener('dfl:record-archive-ready',archiveReady);recordWatch.stop();football.stop();highlights.stop();statsRequest++;clearTimeout(statsTimer);stopAnimations();finish.stop();polish.stop();vfx?.stop();spotlight.stop();root.removeEventListener('click',click);window.removeEventListener('hashchange',onRoute);reduced.removeEventListener('change',onReduce);document.removeEventListener('visibilitychange',onVisibility)};
 root.addEventListener('click',click);window.addEventListener('hashchange',onRoute);reduced.addEventListener('change',onReduce);document.addEventListener('visibilitychange',onVisibility);
 paintBoard();paintActive();stopCurrent=stop;
 // Box scores and league slot metadata load independently of the score feed.
 void readStats();void loadLeague(week.leagueId).then(league=>{if(current()&&Array.isArray(league?.roster_positions)){slots=league.roster_positions;if(last){model=make(last);model.checkedAt=last.checkedAt;model.scoreStatus='ready';model.nflAvailable=!!last.nfl||week.completed;model.playersAvailable=!!last.players;model.snapshot.checkedAt=last.checkedAt;paintActive()}}}).catch(()=>{});
 let entered=false;
 return {
  update(data){if(!current())return;stopAnimations();const previous=last?model.snapshot:null;last={rows:data.rows,rosters:data.rosters||[],players:data.players,nfl:data.nfl?{teams:data.nfl,payload:data.nflPayload,fetchedAt:data.nflFetchedAt}:null,checkedAt:Date.now()};model=make(last);model.checkedAt=last.checkedAt;model.scoreStatus='ready';model.nflAvailable=!!last.nfl||week.completed;model.playersAvailable=!!last.players;model.snapshot.checkedAt=last.checkedAt;paintBoard();paintActive();const card=cardOf(selected);if(!entered){entered=true;if(!model.completed)enter(card)}if(previous&&card&&!model.completed)stopScores=animateScoreChanges(card,{previous,model,motion,gameId:selected,feedback:true});void readStats(data.force)},
  fail(){if(!current())return;stopAnimations();if(!last)for(const host of root.querySelectorAll('[data-clubhouse-lineup]'))host.innerHTML='<p class="clubhouse-stat-status">Lineups unavailable. Refresh scores to retry.</p>'},
  stop,
 };
}
