import {nflCenterGames,nflCenterPlays,nflSummaryMatches,nflObservedGame} from './nfl-game-center-model.js';
import {footballTeam} from './live-football-model.js';
import {nflPlayPresentation,nflPlayNameIndex} from './nfl-play-presentation.js';
export function multigameRows(payload,context,summaries=new Map()){
 return nflCenterGames(payload,context?.season,context?.week).map(game=>{
  const entry=summaries.get(game.id),summary=nflSummaryMatches(entry?.summary,game,context?.season)?entry.summary:null;

  const latest=nflCenterPlays(summary).at(-1),presentation=latest&&nflPlayPresentation(latest,nflPlayNameIndex(summary));
  const people=(context.players||[]).filter(p=>!p.empty&&['QB','RB','WR','TE'].includes(p.position)&&game.sides.some(s=>s.code===footballTeam(p.nflTeam))).sort((a,b)=>Number(b.isMine===true)-Number(a.isMine===true)||Number(b.isOpponent===true)-Number(a.isOpponent===true)||(typeof b.points==='number'?b.points:0)-(typeof a.points==='number'?a.points:0));
  return {...nflObservedGame(game,summary,context?.season),players:people,latest:presentation?.headline||'',playId:latest?.id||'',failed:!!entry?.failed};
 });
}
