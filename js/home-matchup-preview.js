import {readPageChoice} from './page-disclosure.js';
import {buildGameDay} from './game-day-model.js';
import {loadClubhouseIndex,loadClubhouseWeek,loadWeeklyRosters} from './weekly-clubhouse-data.js';
import {loadPlayers,sleeper} from './sleeper.js';
import {loadNflGameDay} from './nfl-game-day.js';
import {loadLeagueState} from './league-state.js';
import {loadLatestLeagueResults,reconcileLeagueResults} from './league-results.js';
import {loadLore} from './lore.js';
import {buildRecordArchive} from './record-chases-model.js';
import {gameDayOpeningWeek} from './game-day-disclosure.js';
import {homeGameDayMatchup,homeGameDayPhase} from './home-presentation.js';
import {syncHomePrimaryAction} from './home-primary-action.js';
import {syncLeadMarkers} from './game-day-moment-effects.js';
import {animateScoreChanges} from './game-day-score-motion.js';
import {patchGameDay} from './game-day-dom.js';
import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {mountScoreFreshness} from './score-freshness.js';

// Home is a compact score reference. Clubhouse owns the interactive live room.
export function mountHomeMatchupPreview(root,{members,member,active,standings=[],weekly=null,onModel=null}){
 let stopped=false,model=null,forecast=null,players={},leagueId='',leaguePromise=null,stopMotion=()=>{};
 const current=()=>!stopped&&root.isConnected&&active(),owner=root.closest('.home-personal-desk')||root;
 root.innerHTML='<section class="gameday-card" data-gameday-card><header><div><h2 data-gameday-week>Checking your matchup</h2></div><div class="gameday-controls"><span class="home-game-phase" data-home-game-phase></span></div></header><div data-gameday-content aria-busy="true"><div class="gameday-loading home-matchup-loading" aria-hidden="true"><span></span><span></span></div></div><p class="sr-only" data-gameday-freshness role="status"></p><p class="home-matchup-recovery" data-gameday-recovery role="status" hidden><span data-gameday-recovery-message></span><button type="button" class="linkbtn" data-gameday-retry>Retry</button></p></section>';
 const card=root.querySelector('[data-gameday-card]'),content=root.querySelector('[data-gameday-content]'),status=root.querySelector('[data-gameday-freshness]'),recovery=root.querySelector('[data-gameday-recovery]'),retry=root.querySelector('[data-gameday-retry]');
 const freshness=mountScoreFreshness(status,{onChange:values=>{if(model)Object.assign(model,{scoreStatus:values.state,checkedAt:values.checkedAt??model.checkedAt,nflAvailable:values.nflAvailable??model.nflAvailable,playersAvailable:values.playersAvailable??model.playersAvailable})}});
 const paint=()=>{
  if(!current()||!model)return;stopMotion();
  const phase=homeGameDayPhase(model),mine=model.games.find(game=>game.isMine);
  root.querySelector('[data-gameday-week]').textContent=`Week ${model.week}`;
  root.querySelector('[data-home-game-phase]').textContent=phase.label;card.dataset.phase=phase.key;
  if(mine)owner.dataset.clubhouseHref=`#/clubhouse?season=${model.season}&week=${model.week}&tab=matchups&matchup=${encodeURIComponent(mine.id)}`;
  syncHomePrimaryAction(owner,phase.key);
  patchGameDay(content,homeGameDayMatchup(model,forecast)||'<p>Choose your league profile to see your matchup. <a href="#/profile">Open profile</a></p>');syncLeadMarkers(card,model);
 };
 Promise.resolve(weekly).then(value=>{if(current()){forecast=value;paint()}}).catch(()=>{});
 const refresh=async(force=false)=>{
  if(!current())return;retry.disabled=true;freshness.update({state:'checking'});
  try{
   const index=await loadClubhouseIndex({force});if(!index[0])throw Error('No synced week');
   const stored=await loadClubhouseWeek(index[0].season,index[0].week,{force}),state=await loadLeagueState({force}).catch(()=>null);
   const advanced=Number(state?.season)===Number(stored.season)&&stored.week<state.currentWeek,week={...stored,completed:stored.completed||advanced},openingWeek=gameDayOpeningWeek(week,state);
   if(leagueId!==week.leagueId){leagueId=week.leagueId;leaguePromise=sleeper.league(leagueId)}
   const results=await Promise.allSettled([loadWeeklyRosters(week.leagueId,week.week,{maxAgeMs:force?0:60000}),loadPlayers({maxAgeMs:300000}),loadNflGameDay(week.season,week.week,{force}),leaguePromise,loadLore({force}),advanced?loadLatestLeagueResults(week.leagueId,week.season,state.currentWeek,{force}):null,openingWeek!==Number(week.week)?loadNflGameDay(week.season,openingWeek,{force}):null,week.completed?[]:sleeper.rosters(week.leagueId)]);
   if(!current())return;if(results[0].status!=='fulfilled'||!results[0].value.length)throw Error('Scores unavailable');
   const value=i=>results[i].status==='fulfilled'?results[i].value:null,nfl=value(2);players=value(1)||players;
   const next=buildGameDay({week,rows:value(0),players,nfl,members,memberId:member?.id,rosters:value(7)||[],...(Array.isArray(value(3)?.roster_positions)?{rosterPositions:value(3).roster_positions}:{})});
   next.standings=reconcileLeagueResults({season:week.season,teams:next.games.flatMap(g=>g.sides.map(t=>({...t,roster_id:t.roster,sleeper_user_id:t.uid}))),standings,snapshot:value(5)}).standings;
   next.checkedAt=Date.now();next.snapshot.checkedAt=next.checkedAt;next.scoreStatus='ready';next.nflAvailable=!!nfl;next.playersAvailable=!!value(1);next.recordArchive=value(4)?buildRecordArchive(value(4),{season:next.season,week:next.week}):null;
   const previous=model?.season===next.season&&model?.week===next.week?model.snapshot:null;model=next;paint();
   onModel?.({model,history:value(4)?.matchups||[],leagueState:state,openingWeek,openingNfl:openingWeek===Number(week.week)?nfl:value(6)});
   if(previous)stopMotion=animateScoreChanges(card,{previous,model,feedback:true,motion:readPageChoice('gameday-motion',['on','off'],'on')==='on'});
   recovery.hidden=true;content.removeAttribute('aria-busy');freshness.update({state:navigator.onLine===false?'offline':'ready',checkedAt:next.checkedAt,nflAvailable:!!nfl,playersAvailable:!!value(1),completed:week.completed});return true;
  }catch{if(current()){freshness.update({state:navigator.onLine===false?'offline':'error'});recovery.hidden=false;root.querySelector('[data-gameday-recovery-message]').textContent=model?'Refresh unavailable. Showing the last checked scores.':'Your matchup couldn’t load. Try again.';content.removeAttribute('aria-busy');if(!model)content.innerHTML=''}return false}
  finally{if(current())retry.disabled=false}
 };
 const loop=mountLiveScoreRefresh({refresh,active:current,interval:()=>model?.live?20000:60000,onOffline:()=>{freshness.update({state:'offline'});recovery.hidden=false;root.querySelector('[data-gameday-recovery-message]').textContent=model?'Offline. Showing the last checked scores.':'Offline. Reconnect to load your matchup.'}});
 const retryClick=()=>void loop.request(true);retry.addEventListener('click',retryClick);loop.start();
 return()=>{stopped=true;loop.stop();freshness.stop();stopMotion();retry.removeEventListener('click',retryClick)};
}
