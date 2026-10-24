const numeric=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))?Number(v):null;
const groups=[['Passing',[['pass_cmp','Completions'],['pass_att','Attempts'],['pass_yd','Passing yards'],['pass_td','Passing TDs'],['pass_int','Interceptions'],['pass_sack','Sacks taken']]],['Rushing',[['rush_att','Carries'],['rush_yd','Rushing yards'],['rush_td','Rushing TDs'],['rush_lng','Longest run']]],['Receiving',[['rec','Receptions'],['rec_tgt','Targets'],['rec_yd','Receiving yards'],['rec_td','Receiving TDs'],['rec_air_yd','Air yards'],['rec_yar','Yards after catch'],['rec_lng','Longest catch']]],['Kicking',[['fgm','Field goals'],['fga','FG attempts'],['xpm','Extra points'],['xpa','XP attempts'],['fgm_lng','Longest FG']]],['Defense',[['sack','Sacks'],['int','Interceptions'],['fum_rec','Fumble recoveries'],['def_td','Defensive TDs'],['def_st_td','Special teams TDs'],['pts_allow','Points allowed']]],['Ball security',[['fum','Fumbles'],['fum_lost','Fumbles lost']]]];
export function playerGame(model,week=model.week){
 const row=(model.recent||[]).find(r=>Number(r.week)===Number(week));if(!row)return null;
 const current=Number(week)===Number(model.week),points=current?numeric(model.points):numeric(row.points);
 return {...row,week:Number(row.week),points,current,state:row.stale?'Cached':current?({live:'Live',final:'Final',upcoming:'Yet to play',unknown:'Recorded'}[model.state]||'Recorded'):points!==null?'Recorded':'Unavailable',stats:row.stats||(current?model.stats:null)||{items:[]}};
}
export function playerGameGroups(game){
 if(!game)return [];
 const raw=game.rawStats||{},items=game.stats?.items||[],known=new Map(items.filter(s=>s.key).map(s=>[s.key,s]));
 const result=groups.map(([label,fields])=>({label,items:fields.flatMap(([key,name])=>{const value=numeric(raw[key]??known.get(key)?.value);return value===null?[]:[{key,label:name,value}]})})).filter(g=>g.items.length);
 const used=new Set(result.flatMap(g=>g.items.map(s=>s.key))),extra=items.filter(s=>!used.has(s.key)&&numeric(s.value)!==null);
 if(extra.length)result.push({label:'Game stats',items:extra});return result;
}
export function playerGameShareSpec(model,game){
 if(!game||numeric(game.points)===null||game.state==='Yet to play')return null;
 const points=Number(game.points).toFixed(2),opponent=game.opponent?`vs ${game.opponent}`:'',p={...model.player,nflTeam:game.gameTeam||model.player.nflTeam};
 return {kind:'Player performance',context:`${model.season} / WEEK ${String(game.week).padStart(2,'0')}`,headline:`${points}\nPOINTS.`,summary:p.name,status:game.state,photoHeadline:p.name,photoCaption:`Week ${game.week} · ${points} points${opponent?' · '+opponent:''}`,players:/^\d+$/.test(p.id)&&!['DEF','DST','D/ST'].includes(p.position)?[p]:[],results:[{label:p.name,value:points}],sections:[{label:[p.position,p.nflTeam,opponent].filter(Boolean).join(' · '),rows:playerGameGroups(game).flatMap(g=>g.items.map(s=>({name:s.label,value:String(s.value)})))}],footer:'DFL · League scoring'};
}
