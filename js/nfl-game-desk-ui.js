import {esc} from './ui.js';
import {nflFantasyMarkup} from './nfl-fantasy-ui.js';
import {nflFantasySides} from './nfl-game-center-model.js';

// Clubhouse's full game page shares one score, field, box score and play feed.
// The small replay browser keeps its existing focused presentation.
export function nflGameDeskMarkup({uid,games,gameId,observed,selected,summary,checked,error,loading,showRefresh,online,filter,fantasy,teams,context,statsExpanded,field,score,playRows}){
 const more=nflFantasySides(fantasy,teams).some(side=>side.players.length>2);
 const status=!online?'Offline · reconnecting when available.':error?(summary?'Update unavailable · showing the last game.':'Game details unavailable. Try Refresh.'):!games.length?(loading?'Loading NFL games…':'No NFL games available for this week.'):loading&&!summary?'Loading game details…':checked?observed?.state==='in'?'Live':observed?.state==='post'?'Final':'Scheduled':'';
 return `<div class="nfl-center-tools">
  <div class="nfl-center-picker"><label for="${uid}-game"><span class="sr-only">NFL game</span><select id="${uid}-game" data-nfl-center-game ${games.length?'':'disabled'}>${!games.length?`<option>${loading?'Loading games…':'No games this week'}</option>`:''}${games.map(g=>`<option value="${g.id}" ${g.id===gameId?'selected':''}>${esc(g.id===gameId?g.label:`${g.label} · ${g.status}`)}</option>`).join('')}</select></label><button type="button" class="linkbtn" data-nfl-center-refresh aria-label="Refresh NFL game" aria-busy="${loading&&showRefresh}" ${loading&&showRefresh?'disabled':''}><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M16 8a6 6 0 1 0 0 5M16 3v5h-5"/></svg></button></div>
  ${selected?`<nav class="nfl-center-jumps" aria-label="On this game"><button type="button" data-nfl-center-mode="plays" aria-controls="${uid}-plays" ${!summary?'disabled':''}>Plays ↓</button><button type="button" data-nfl-center-mode="fantasy" aria-controls="${uid}-stats" ${!summary?'disabled':''}>Stats ↓</button></nav>`:''}
 </div>${score}<p class="nfl-center-status${selected&&summary&&checked&&!error&&online?' is-quiet':''}" role="status">${status}</p>
 <div class="nfl-center-body" data-nfl-center-body aria-busy="${loading&&!summary}">
  ${selected?field:''}<div class="nfl-live-grid"${selected?'':' hidden'}>
   <section class="nfl-live-stats" id="${uid}-stats" data-nfl-section="fantasy" tabindex="-1" aria-labelledby="${uid}-stats-title"><header class="nfl-section-head"><h3 id="${uid}-stats-title">Fantasy stats</h3></header>
    <div id="${uid}-stat-rows" data-nfl-stats-rows>${nflFantasyMarkup(fantasy,teams,{uid,loading:loading&&!summary,error,season:context?.season,week:context?.week,state:observed?.state,limit:statsExpanded?Infinity:2,showScores:false})}</div>
    ${more?`<button type="button" class="nfl-stats-expand" data-nfl-stats-expand aria-expanded="${statsExpanded}" aria-controls="${uid}-stat-rows">${statsExpanded?'Fewer players':`All ${fantasy.length} players`}<svg class="ico-sm" aria-hidden="true"><use href="#i-chev-right"/></svg></button>`:''}
   </section>
   <section class="nfl-live-plays" id="${uid}-plays" data-nfl-section="plays" tabindex="-1" aria-labelledby="${uid}-plays-title"><header class="nfl-section-head"><h3 id="${uid}-plays-title">Play-by-play</h3>${selected?`<label class="nfl-center-filter"><span class="sr-only">Show plays</span><select data-nfl-center-filter aria-label="Filter NFL plays"><option value="all" ${filter==='all'?'selected':''}>All plays</option><option value="scoring" ${filter==='scoring'?'selected':''}>Scoring</option><option value="big" ${filter==='big'?'selected':''}>Big plays</option></select></label>`:''}</header>
    <ol class="nfl-center-plays" aria-label="NFL play-by-play, latest first">${playRows||((!loading||summary)&&!error?`<li class="nfl-center-empty">${selected?.state==='pre'?'Kickoff is coming. Plays appear once the game starts.':'No plays available for this view yet.'}</li>`:'')}</ol>
   </section>
  </div>
 </div><button type="button" class="nfl-latest" data-nfl-latest hidden></button>`;
}
