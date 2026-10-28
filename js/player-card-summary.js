import {playerGameGroups} from './player-game-model.js';
import {esc} from './ui.js';

const finite=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;
export function playerSeasonAverage(bundle,id){
 const stats=bundle?.data?.[String(id)],games=finite(stats?.gp),points=finite(stats?.pts_ppr);
 return games>0&&points!==null?{value:points/games,games,stale:!!bundle.stale}:null;
}
export function playerGameHeadline(game,position){
 if(!game||game.state==='Yet to play')return '';
 const stats=new Map(playerGameGroups(game).flatMap(group=>group.items.map(item=>[item.key,item.value])));
 const fields={QB:[['pass_yd','pass yd'],['pass_td','pass TD'],['pass_int','INT'],['rush_yd','rush yd']],RB:[['rush_yd','rush yd'],['rec','rec'],['rec_yd','rec yd']],WR:[['rec','rec'],['rec_yd','yd']],TE:[['rec','rec'],['rec_yd','yd']],K:[['fgm','FG'],['xpm','XP']],DEF:[['sack','sacks'],['int','INT'],['pts_allow','allowed']]};
 const parts=(fields[position]||[]).flatMap(([key,label])=>stats.has(key)?[`${stats.get(key)} ${label}`]:[]);
 if(['RB','WR','TE'].includes(position)){
  const td=['rec_td','rush_td'].reduce((total,key)=>total+(stats.get(key)||0),0);if(td)parts.push(`${td} TD`);
 }
 return parts.join(' · ');
}
export function playerAverageMarkup(average){
 return `<span class="player-card-season-average"${average?'':' hidden'}>${average?`<strong>${esc(average.value.toFixed(1))}</strong><small>Season PPR/g${average.stale?' · cached':''}</small>`:'<strong>—</strong><small>Season PPR/g</small>'}</span>`;
}
