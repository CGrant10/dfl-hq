import {WEEKLY_STARTERS,FLEX_ELIGIBLE} from './weekly-outlook.js';
const id=String;
export function legalWeeklyLineup(starters,weekly){
 const players=starters.map(p=>weekly.get(id(p)));
 const positions=Object.entries(WEEKLY_STARTERS).flatMap(([p,n])=>Array(n).fill(p)).concat('FLEX');
 if(players.length!==positions.length||players.some(p=>!p)||new Set(starters.map(id)).size!==starters.length)return false;
 const assign=(i,used)=>{if(i===positions.length)return true;for(let j=0;j<players.length;j++){if(used.has(j)||!(positions[i]==='FLEX'?FLEX_ELIGIBLE.has(players[j].position):players[j].position===positions[i]))continue;used.add(j);if(assign(i+1,used))return true;used.delete(j)}return false};return assign(0,new Set());
}
export function lineupProjection(starters,weekly){
 let total=0;for(const playerId of starters){const p=weekly.get(id(playerId));if(!p||p.points==null)return null;total+=!p.hasGame||p.isOut?0:p.points}return total;
}
export function simulateSwap({starters=[],roster=[],outId,inId,weekly,opponentStarters=[]}){
 const base=starters.map(id),owned=new Set(roster.map(id));outId=id(outId);inId=id(inId);
 if(!base.includes(outId)||base.includes(inId)||!owned.has(inId))return{error:'Choose a starter and a player from your bench.'};
 const incoming=weekly.get(inId);if(!incoming||incoming.points==null)return{error:'No published projection for this bench player.'};
 if(!incoming.hasGame||incoming.isOut)return{error:'This bench player has no game or is listed out.'};
 const next=base.map(p=>p===outId?inId:p);if(!legalWeeklyLineup(next,weekly))return{error:'That swap would leave an illegal lineup. Choose a player eligible for the open position.'};
 const before=lineupProjection(base,weekly),after=lineupProjection(next,weekly),opponent=opponentStarters.length?lineupProjection(opponentStarters,weekly):null;
 if(before===null||after===null)return{error:'A starter is missing a projection, so a full lineup comparison is unavailable.'};
 return{before,after,delta:after-before,opponent,beforeMargin:opponent===null?null:before-opponent,afterMargin:opponent===null?null:after-opponent,next};
}
export function strategyLesson({week,roster=[],starters=[],weekly}){
 const all=roster.map(p=>weekly.get(id(p))).filter(Boolean),starting=new Set(starters.map(id)),risky=all.find(p=>starting.has(p.id)&&p.isRisky);
 const lessons=[
  {title:'Keep the flex flexible',body:'Use dedicated RB and WR slots for earlier games when possible, leaving a later RB, WR or TE in flex. That gives you more replacement options if late injury news arrives.',example:all.find(p=>FLEX_ELIGIBLE.has(p.position)),action:'Check kickoff times in Sleeper before moving slots.'},
  {title:'A close projection is a close call',body:'Small projected differences carry uncertainty. Compare injuries, opportunity and matchup context before treating a fraction of a point as a firm start/sit decision.',example:all.find(p=>!starting.has(p.id)&&p.hasGame&&!p.isOut),action:'Try a swap in the lineup lab and compare the projected change.'},
  {title:'Protect against late scratches',body:'For a questionable starter, identify an eligible backup with a game that has not started. A high projection is useful only if the player takes the field.',example:risky||all.find(p=>p.isRisky),action:risky?`Monitor ${risky.name} and keep an eligible backup available.`:'Review the injury tags before kickoff.'},
  {title:'Plan the bye before the waiver rush',body:'Look one or two weeks ahead for thin positions and overlapping byes. Filling a bench gap early can save you from an emergency trade.',example:all.find(p=>p.position==='QB')||all[0],action:'Check upcoming byes in Sleeper, then use Trade to explore depth.'},
  {title:'Trade from strength',body:'An upgrade helps most when it reaches your starting lineup. Compare both teams’ positions and what they can replace before paying with depth you still need.',example:all.find(p=>!starting.has(p.id)),action:'Use Trade to compare starting-lineup value on both sides.'},
  {title:'Know when you need upside',body:'If your matchup projects behind, consider players with a plausible larger role or touchdown opportunity. When favored, prioritize reliable opportunity. A projection alone does not establish floor or ceiling.',example:all.find(p=>p.hasGame&&!p.isOut),action:'Compare the matchup margin in the lineup lab, then review player news.'},
 ];const lesson=lessons[((week-1)%lessons.length+lessons.length)%lessons.length];return{...lesson,example:lesson.example?`${lesson.example.name} · ${lesson.example.position}${lesson.example.opponent?` vs ${lesson.example.opponent}`:''}`:null};
}
