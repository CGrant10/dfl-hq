import {nflCenterGames,nflCenterPlays} from './nfl-game-center-model.js';
import {footballTeam} from './live-football-model.js';
import {nflPlayPresentation,nflPlayNameIndex} from './nfl-play-presentation.js';
export function multigameRows(payload,context,summaries=new Map()){
 return nflCenterGames(payload,context?.season,context?.week).map(game=>{
  const entry=summaries.get(game.id),summary=entry?.summary;
  const latest=nflCenterPlays(summary).at(-1),presentation=latest&&nflPlayPresentation(latest,nflPlayNameIndex(summary));
  const people=(context.players||[]).filter(p=>!p.empty&&['QB','RB','WR','TE'].includes(p.position)&&game.sides.some(s=>s.code===footballTeam(p.nflTeam))).sort((a,b)=>Number(b.isMine===true)-Number(a.isMine===true)||Number(b.isOpponent===true)-Number(a.isOpponent===true)||(typeof b.points==='number'?b.points:0)-(typeof a.points==='number'?a.points:0));
  return {...game,players:people,latest:presentation?.headline||'',playId:latest?.id||'',failed:!!entry?.failed};
 });
}
export function defaultGamePins(games){
 return [...games].sort((a,b)=>Number(b.state==='in')-Number(a.state==='in')||Number(b.players.some(p=>p.isMine))-Number(a.players.some(p=>p.isMine))||b.players.length-a.players.length||Date.parse(a.date)-Date.parse(b.date)).slice(0,3).map(g=>g.id);
}
export function reconcileGamePins(saved,games){return [...new Set((Array.isArray(saved)?saved:defaultGamePins(games)).map(String))].filter(id=>games.some(g=>g.id===id)).slice(0,3)}
