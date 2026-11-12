import {esc} from './ui.js';
import {nflStatsMarkup} from './nfl-stats-ui.js';
import {replayGamesMarkup} from './replay-games.js';
import {replayIcon} from './replay-icons.js';
import {nflFantasyMarkup} from './nfl-fantasy-ui.js';

// Separate views share the same game, score and current data.
export function nflGameDeskMarkup({uid,mode,embedded=false,games,gameId,observed,selected,summary,checked,error,loading,showRefresh,online,filter,fantasy,teams,context,field,score,playRows,boxTeam}){
 const index=games.findIndex(g=>g.id===gameId);
 const modes=selected?`<div class="nfl-center-modes" ${embedded?'hidden':''} role="group" aria-label="NFL game view" style="--nfl-mode:${{stats:0,plays:1,fantasy:2}[mode]||0}"><i aria-hidden="true"></i><button type="button" data-nfl-center-mode="stats" aria-controls="${uid}-view" aria-pressed="${mode==='stats'}" aria-label="NFL box score">Stats</button><button type="button" data-nfl-center-mode="plays" aria-controls="${uid}-view" aria-pressed="${mode==='plays'}" aria-label="Play-by-play">Plays</button><button type="button" data-nfl-center-mode="fantasy" aria-controls="${uid}-view" aria-pressed="${mode==='fantasy'}" aria-label="Fantasy stats">Fantasy</button></div>`:'';
 const status=!online?'Offline · reconnecting when available.':error?(summary?'Update unavailable · showing the last game.':'Game details unavailable. Try Refresh.'):!games.length?(loading?'Loading NFL games…':'No NFL games available for this week.'):loading&&!summary?'Loading game details…':checked?observed?.state==='in'?'Live':observed?.state==='post'?'Final':'Scheduled':'';
 return `<div class="nfl-center-tools"${embedded?' hidden':''}>
 <div class="nfl-center-game-rail" id="${uid}-game-rail" data-nfl-center-rail>${replayGamesMarkup(games.map(g=>g.id===gameId?observed||g:g),gameId,{idPrefix:uid+'-pick',compact:true})}</div><button type="button" class="linkbtn nfl-gamecast-refresh" data-nfl-center-refresh aria-label="Refresh NFL game" aria-busy="${loading&&showRefresh}" ${loading&&showRefresh?'disabled':''}>${replayIcon('arrow-clockwise')||replayIcon('chevron-right')}</button>
 </div><p class="nfl-center-status${selected&&summary&&checked&&!error&&online?' is-quiet':''}" role="status">${status}</p>
 <div class="nfl-game-window"><div class="nfl-game-stage" data-nfl-game-stage>
 <div class="nfl-game-hero">${selected&&(!embedded||mode==='plays')?field:''}${score}</div>${modes}
 <div class="nfl-center-body" id="${uid}-view" data-nfl-center-body aria-busy="${loading&&!summary}">
  <div class="nfl-live-grid"${selected?'':' hidden'}>
   ${mode==='stats'?`<section class="nfl-live-boxscore" data-nfl-section="stats">${nflStatsMarkup(summary,teams,{uid,club:boxTeam})}</section>`:mode==='fantasy'?`
   <section class="nfl-live-stats" id="${uid}-stats" data-nfl-section="fantasy" tabindex="-1" aria-labelledby="${uid}-stats-title"><header class="nfl-section-head"><h3 id="${uid}-stats-title">Fantasy stats</h3><small>PPR</small></header>
    <div id="${uid}-stat-rows" data-nfl-stats-rows>${nflFantasyMarkup(fantasy,teams,{uid,loading:loading&&!summary,error,season:context?.season,week:context?.week,state:observed?.state,showScores:false,checkedAt:checked,leagueCheckedAt:context?.checkedAt})}</div>
   </section>
   `:`
   <section class="nfl-live-plays" id="${uid}-plays" data-nfl-section="plays" tabindex="-1" aria-labelledby="${uid}-plays-title"><header class="nfl-section-head"><h3 id="${uid}-plays-title">Play-by-play</h3>${selected?`<label class="nfl-center-filter"><span class="sr-only">Show plays</span><select data-nfl-center-filter aria-label="Filter NFL plays"><option value="all" ${filter==='all'?'selected':''}>All plays</option><option value="scoring" ${filter==='scoring'?'selected':''}>Scoring</option><option value="big" ${filter==='big'?'selected':''}>Big plays</option></select></label>`:''}</header>
    <ol class="nfl-center-plays" aria-label="NFL play-by-play, latest first">${playRows||((!loading||summary)&&!error?`<li class="nfl-center-empty">${selected?.state==='pre'?'Kickoff is coming. Plays appear once the game starts.':'No plays available for this view yet.'}</li>`:'')}</ol>
   </section>
   `}
  </div>
 </div></div></div><button type="button" class="nfl-latest" data-nfl-latest hidden></button>`;
}
