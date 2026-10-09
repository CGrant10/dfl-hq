import {buildGameDay} from './game-day-model.js';
import {matchupLineupHtml} from './game-day-lineup-comparison.js';
import {clubhousePlayerStatLine} from './clubhouse-center-model.js';
import {clubhouseScoreboardHtml,clubhousePulseHtml,clubhouseTeamStatsHtml,clubhousePositionStatsHtml} from './clubhouse-center-ui.js';
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
export function mountClubhouseCenter(root,week,{active=()=>root.isConnected,loadStats=loadWeeklyStats,loadLeague=id=>sleeper.league(id)}={}) {
 stopCurrent?.();
 let stopped=false,last=null,model=null,stats={loading:true},statsBusy=false,statsChecked=0,statsRequest=0,statsTimer=null,slots=null,vfx=null,fxCard=null,stopScores=()=>{};
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),current=()=>!stopped&&root.isConnected&&active();
 let motion=readPageChoice('gameday-motion',['on','off'],'on')==='on';
 const scope=`clubhouse-matchup-${week.season}-${week.week}`;
 const make=(data={})=>buildGameDay({week,members:week.members,memberId:currentMember()?.id,rows:week.games.flatMap(g=>[g.left,g.right].map(t=>({roster_id:t.roster,points:t.score,starters:[]}))),...data,...(slots?{rosterPositions:slots}:{})});
 model=make();
 const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('matchup');
 let selected=model.games.find(g=>g.id===requested)?.id||readPageChoice(scope,model.games.map(g=>g.id),(model.games.find(g=>g.isMine)||model.games[0])?.id);
 const selectedGame=()=>model.games.find(g=>g.id===selected),cardOf=id=>root.querySelector(`[data-clubhouse-matchup="${CSS.escape(id)}"] .clubhouse-matchup-card`);
 const polish=mountClubhousePolish(root,{getMotion:()=>motion,active:current});
 const stopAnimations=()=>{stopScores();stopScores=()=>{};polish.stopTransient()};
 const spotlight=mountPlayerSpotlight(root,{getModel:()=>model,getMotion:()=>motion});
 const setMotion=()=>{
  root.querySelector('.clubhouse-page').dataset.motion=motion?'on':'off';
  for(const card of root.querySelectorAll('.clubhouse-matchup-card'))card.dataset.motion=motion?'on':'off';
  const button=root.querySelector('[data-clubhouse-motion]');if(button){button.textContent=`Motion ${motion?'on':'off'}`;button.setAttribute('aria-pressed',String(motion))}
  if(!motion||reduced.matches)stopAnimations();polish.motionChanged();spotlight.setMotion(motion);
 };
 const enter=card=>polish.enter(card);
 const paintActive=()=>{
  const game=selectedGame(),card=game&&cardOf(game.id);if(!card)return;
  stopScores();stopScores=()=>{};
  card.style.setProperty('--clubhouse-left',accentOf(game.sides[0].identity));card.style.setProperty('--clubhouse-right',accentOf(game.sides[1].identity));
  for(const [i,side] of ['left','right'].entries()){
   const surface=card.querySelector(`[data-score-${side}]`)?.closest('.clubhouse-game-side');if(surface){surface.dataset.gamedayTeam=game.sides[i].roster;surface.querySelector('.clubhouse-remaining')?.classList.add('home-team-progress')}
  }
  const lines=new Map(game.sides.flatMap(t=>[...t.lineup,...t.bench]).map(p=>[`${p.roster}:${p.id}`,clubhousePlayerStatLine(p,stats,model)]));
  const lineup=card.querySelector('[data-clubhouse-lineup]');if(lineup)patchGameDay(lineup,last?matchupLineupHtml(game,{statLines:lines}):'<p class="clubhouse-stat-status">Checking the starting lineups…</p>');
  const teamStats=card.querySelector('[data-clubhouse-team-stats]');if(teamStats)patchGameDay(teamStats,last?clubhouseTeamStatsHtml(game,model.completed):'');
  const position=card.querySelector('[data-clubhouse-position-stats]');if(position)patchGameDay(position,last?clubhousePositionStatsHtml(game,model.completed):'');
  if(fxCard!==card){vfx?.stop();fxCard=card;vfx=mountScoreVfx(card)}
  vfx?.refresh();setMotion();spotlight.update();
 };
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
  stopAnimations();selected=id;savePageChoice(scope,id);
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('matchup',id);try{history.replaceState(null,'',location.hash.split('?')[0]+'?'+params)}catch{/* Matchup browsing also works in previews that restrict history. */}
  paintBoard();paintActive();const card=cardOf(id);enter(card);
  const heading=card?.querySelector('header');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});if(scroll)heading.scrollIntoView({behavior:motion&&!reduced.matches?'smooth':'instant',block:'start'})}
 };
 const click=event=>{
  const game=event.target.closest('[data-clubhouse-game]');if(game){choose(game.dataset.clubhouseGame);return}
  if(event.target.closest('[data-clubhouse-motion]')){motion=!motion;savePageChoice('gameday-motion',motion?'on':'off');setMotion();return}
 };
 const onRoute=()=>{if(!active())stop()};
 const onReduce=()=>{if(reduced.matches)stopAnimations()};
 const onVisibility=()=>{if(document.visibilityState!=='visible')stopAnimations()};
 const stop=()=>{if(stopped)return;stopped=true;statsRequest++;clearTimeout(statsTimer);stopAnimations();polish.stop();vfx?.stop();spotlight.stop();root.removeEventListener('click',click);window.removeEventListener('hashchange',onRoute);reduced.removeEventListener('change',onReduce);document.removeEventListener('visibilitychange',onVisibility)};
 root.addEventListener('click',click);window.addEventListener('hashchange',onRoute);reduced.addEventListener('change',onReduce);document.addEventListener('visibilitychange',onVisibility);
 paintBoard();paintActive();stopCurrent=stop;
 // Box scores and league slot metadata load independently of the score feed.
 void readStats();void loadLeague(week.leagueId).then(league=>{if(current()&&Array.isArray(league?.roster_positions)){slots=league.roster_positions;if(last){model=make(last);paintActive()}}}).catch(()=>{});
 let entered=false;
 return {
  update(data){if(!current())return;stopAnimations();const previous=last?model.snapshot:null;last={rows:data.rows,players:data.players,nfl:data.nfl?{teams:data.nfl}:null};model=make(last);paintBoard();paintActive();const card=cardOf(selected);if(!entered){entered=true;enter(card)}if(previous&&card)stopScores=animateScoreChanges(card,{previous,model,motion,gameId:selected,feedback:true});void readStats(data.force)},
  fail(){if(!current())return;stopAnimations();if(!last)for(const host of root.querySelectorAll('[data-clubhouse-lineup]'))host.innerHTML='<p class="clubhouse-stat-status">Lineups unavailable. Refresh scores to retry.</p>'},
  stop,
 };
}
