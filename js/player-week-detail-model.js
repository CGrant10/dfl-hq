import {spotlightStats} from './player-spotlight-model.js';
import {esc} from './ui.js';
const short={pass_yd:'pass yd',pass_td:'pass TD',pass_int:'INT',rush_yd:'rush yd',rush_td:'rush TD',rec:'rec',rec_yd:'rec yd',rec_td:'rec TD',fgm:'FG',xpm:'XP',fgm_lng:'long',sack:'sacks',int:'INT',fum_rec:'FR',def_td:'def TD',def_st_td:'ST TD',pts_allow:'allowed'};
export function playerWeekStatLine(player,bundle,{season,week,compact=false}={}) {
 if(player.empty)return '';
 if(player.state==='upcoming')return 'Yet to play';
 const stats=spotlightStats(player,bundle?.data||[],{season,week});
 if(!stats.items.length)return player.state==='upcoming'?'Yet to play':bundle?.error?'Stats unavailable':bundle?.loading?'Loading stats…':'No box score yet';
 // Keep touchdowns in the line even when a player also has rushing/receiving stats.
 const priorities={QB:['pass_yd','pass_td','pass_int','rush_yd'],RB:['rush_yd','rec','rec_yd','rush_td','rec_td'],WR:['rec','rec_yd','rec_td','rush_yd','rush_td'],TE:['rec','rec_yd','rec_td'],K:['fgm','xpm','fgm_lng'],DEF:['sack','int','pts_allow','fum_rec','def_td','def_st_td']};
 let items=stats.items.filter(s=>!(s.value===0&&['rush_td','rec_td','fum_rec','def_td','def_st_td'].includes(s.key)));
 if(compact){
  const receiver=['WR','TE'].includes(player.position);
  items=items.filter(s=>!(s.value===0&&(s.key==='rush_yd'&&player.position!=='RB'||['rec','rec_yd'].includes(s.key)&&!receiver)));
  if(['RB','WR','TE'].includes(player.position)){
   const touchdowns=items.filter(s=>['rush_td','rec_td'].includes(s.key)).reduce((sum,s)=>sum+s.value,0);
   items=items.filter(s=>!['rush_td','rec_td'].includes(s.key));
   if(touchdowns)items.push({key:receiver?'rec_td':'rush_td',value:touchdowns});
  }
 }
 return items.sort((a,b)=>(priorities[player.position]||[]).indexOf(a.key)-(priorities[player.position]||[]).indexOf(b.key)).map(s=>`${s.value} ${compact&&['WR','TE'].includes(player.position)&&s.key==='rec_yd'?'yd':compact&&['RB','WR','TE'].includes(player.position)&&['rec_td','rush_td'].includes(s.key)?'TD':short[s.key]||s.label}`).join(' · ');
}

const numeric=value=>value!=null&&value!==''&&Number.isFinite(Number(value))?Number(value):null;
export function indexPlayerWeeks(weeks=[],{season,week}={}) {
 return weeks.filter(b=>Number.isInteger(Number(b.week))&&Number(b.week)>0&&Number(b.week)<=Number(week)).map(bundle=>{
  const byId=new Map((bundle.data||[]).filter(row=>Number(row.season)===Number(season)&&Number(row.week)===Number(bundle.week)&&row.season_type==='regular').map(row=>[String(row.player_id),row]));
  return {...bundle,byId,error:!!bundle.error||Number(bundle.week)<Number(week)&&!byId.size};
 });
}
export function playerWeekDetail(player,weeks=[],{season,week,completed=false}={}) {
 const current=weeks.find(b=>Number(b.week)===Number(week)),row=current?.byId.get(String(player.id));
 const line=playerWeekStatLine(player,{...current,data:row?[row]:[],loading:!current},{season,week,compact:true});
 const included=weeks.filter(b=>Number(b.week)<Number(week)||(completed||player.state==='final')&&Number(b.week)===Number(week));
 const expected=Math.max(0,Number(week)-1)+(completed||player.state==='final'?1:0);
 let total=0,games=0,missing=included.length!==expected,stale=false;
 for(const bundle of included){
  if(bundle.error||bundle.loading)missing=true;
  stale ||= !!bundle.stale;
  const stats=bundle.byId.get(String(player.id))?.stats;
  // Bye weeks and DNPs are not games; a real zero-point appearance is.
  if(!(numeric(stats?.gp)>0))continue;
  const points=numeric(stats.pts_ppr);if(points===null){missing=true;continue}
  total+=points;games++;
 }
 return {line:current?.stale&&row?`${line} · cached`:line,average:!missing&&games?total/games:null,games,stale};
}
export function playerWeekDetailHtml(player,{line='',average=null,games=0,stale=false}={}) {
 if(!player||player.empty)return '';
 const value=average===null?'—':average.toFixed(1),label=average===null?'Season PPR average unavailable':`Season average: ${value} PPR points per completed game, ${games} game${games===1?'':'s'}${stale?', last available stats':''}`;
 return `<span class="gd-player-week-detail" data-player-week-detail="${esc(`${player.roster}:${player.id}`)}" data-player-week-position="${esc(player.position||'')}"><span class="gd-player-week-line">${esc(line||'Loading stats…')}</span><span class="gd-player-week-average" aria-label="${esc(label)}">${value} PPR/g${stale&&average!==null?' · cached':''}</span></span>`;
}
