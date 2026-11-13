import {footballTeam} from './live-football-model.js';
import {nflShortName} from './nfl-stats-model.js';
const clean=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const positionsCache=new WeakMap();
function positionIndex(directory){
 if(!directory||typeof directory!=='object')return new Map();if(positionsCache.has(directory))return positionsCache.get(directory);
 const map=new Map();for(const p of Object.values(directory)){const k=clean(p.n||p.full_name).toLowerCase()+':'+footballTeam(p.t||p.team);map.set(k,map.has(k)?null:p.p||p.position)}positionsCache.set(directory,map);return map;
}
export function nflPlayNameIndex(summary,directory=null){
 const positions=positionIndex(directory);
 const aliases=new Map();
 for(const club of summary?.boxscore?.players||[])for(const group of club.statistics||[])for(const row of group.athletes||[]){
  const athlete=row.athlete,name=clean(athlete?.displayName);if(!name)continue;
  const parts=name.replace(/\s+(jr|sr|ii|iii|iv)\.?$/i,'').split(' ');if(parts.length<2)continue;
  const alias=clean(athlete.shortName)||`${parts[0][0]}.${parts.slice(1).join('')}`;
  const previous=aliases.get(alias);aliases.set(alias,previous&&previous.name!==name?{name:null}:previous||{name,alias,id:/^\d{1,24}$/.test(String(athlete.id||''))?String(athlete.id):'',nflTeam:club.team?.abbreviation||'',position:athlete.position?.abbreviation||positions.get(name.toLowerCase()+':'+footballTeam(club.team?.abbreviation))||({passing:'QB',kicking:'K',punting:'P'}[group.name]||'')});
 }
 return [...aliases.values()].filter(p=>p.name).map(p=>({...p,pattern:new RegExp(`(?<![A-Za-z])(?:${escape(p.alias).replaceAll('\\.','\\.\\s*')}|${escape(p.name).replaceAll(' ','\\s+')})(?![A-Za-z])`,'g')}));
}
// Display names resolve only from a unique official box-score alias. This
// presentation lookup never determines player ownership or notification eligibility.
export function nflPlayPresentation(play,names=[]){
 const offense=clean(play.text).replace(/^(?:\([^)]*\)\s*)+/,'').split('(')[0];
 const found=names.flatMap(person=>{person.pattern.lastIndex=0;const match=person.pattern.exec(offense);return match?[{name:person.name,index:match.index}]:[]}).sort((a,b)=>a.index-b.index);
 const people=[...new Set(found.map(p=>p.name))].slice(0,2),type=String(play.typeId||''),yards=play.yards;
 if(people.length===2&&['24','67'].includes(type)&&/\bpass from\b/i.test(offense))people.reverse();
 const touchdown=!play.voided&&play.score&&['67','68'].includes(type),big=!play.voided&&play.big;
 const label=play.voided?'No play':touchdown?'Touchdown':big?'Big play':play.score&&type==='59'?'Field goal':play.score?'Score':clean(play.typeLabel)||'Play';
 const action=['24','67'].includes(type)?type==='67'?'TD pass':'catch':['5','68'].includes(type)?type==='68'?'TD run':'run':type==='59'?'field goal':'';
 const noGain=yards===0&&!play.score&&['5','24'].includes(type);
 const result=typeof yards==='number'&&Number.isFinite(yards)&&action&&!(type==='59'&&yards===0)?noGain?'No gain':`${yards} yd ${action}`:'';
 return {headline:people.length?people.join(['24','67'].includes(type)?' → ':' · '):label,label,result,kind:play.voided?'play':touchdown?'touchdown':big?'big-play':play.score?'score':'play'};
}

export function nflScoresPlayPresentation(play,names=[]){
 const view=nflPlayPresentation(play,names),text=clean(play.text).replace(/^(?:\([^)]*\)\s*)+/,'').split('(')[0];
 let participants=names.flatMap(p=>{p.pattern.lastIndex=0;const match=p.pattern.exec(text);return match?[{...p,index:match.index}]:[]}).sort((a,b)=>a.index-b.index).slice(0,2);
 if(participants.length===2&&['24','67'].includes(play.typeId)&&/\bpass from\b/i.test(text))participants.reverse();
 const incomplete=/incomplete|incompletion|intercept/i.test(text+' '+play.typeLabel),pass=['3','24','67'].includes(play.typeId)||/pass incompletion/i.test(play.typeLabel||''),athlete=pass&&!incomplete&&participants.length>1?participants[1]:participants[0]||null;
 let action=play.voided?'No play':pass?(incomplete?'incomplete pass':play.score?'TD catch':'catch'):['5','68'].includes(play.typeId)?play.score?'TD run':play.yards===0?'stopped for no gain':'run':/punt/i.test(play.typeLabel)?'punt':/field goal/i.test(play.typeLabel)?'field goal':clean(play.typeLabel);
 const yardage=typeof play.yards==='number'&&!play.voided&&!incomplete&&!(play.yards===0&&!play.score)?play.yards+' yd ':'';
 return {...view,athlete,participants,compactHeadline:athlete?`${nflShortName(athlete.name)} ${yardage}${action}`:view.headline};
}
