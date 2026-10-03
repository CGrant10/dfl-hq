const sets={QB:[['pass_yd','Passing yards'],['pass_td','Passing TDs'],['pass_int','Interceptions'],['rush_yd','Rushing yards']],RB:[['rush_yd','Rushing yards'],['rush_td','Rushing TDs'],['rec','Receptions'],['rec_yd','Receiving yards'],['rec_td','Receiving TDs']],WR:[['rec','Receptions'],['rec_yd','Receiving yards'],['rec_td','Receiving TDs'],['rush_yd','Rushing yards'],['rush_td','Rushing TDs']],TE:[['rec','Receptions'],['rec_yd','Receiving yards'],['rec_td','Receiving TDs']],K:[['fgm','Field goals'],['xpm','Extra points'],['fgm_lng','Longest FG']],DEF:[['sack','Sacks'],['int','Interceptions'],['fum_rec','Fumble recoveries'],['td','Touchdowns'],['pts_allow','Points allowed']]};
export function spotlightStats(player,rows=[],{season,week}={}){
 const row=(Array.isArray(rows)?rows:[]).find(r=>String(r.player_id)===String(player.id)&&Number(r.season)===Number(season)&&Number(r.week)===Number(week)&&r.season_type==='regular');
 if(!row?.stats)return {items:[],updatedAt:null};
 const items=(sets[player.position]||[]).filter(([key])=>row.stats[key]!=null&&Number.isFinite(Number(row.stats[key]))).map(([key,label])=>({key,label,value:Number(row.stats[key])}));
 const updated=Number(row.updated_at)||Number(row.last_modified);return {items,updatedAt:Number.isFinite(updated)&&updated>0?updated:null};
}
