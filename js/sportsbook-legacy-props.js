const nameKey=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const stats={passing_yards:'pass_yd',passing_touchdowns:'pass_td',rushing_yards:'rush_yd',receiving_yards:'rec_yd',receiving_receptions:'rec',receptions:'rec'};

// Resolve only supported historical props with an unambiguous player and final game.
// Missing stats are not a zero; unsupported provider scoring stays ungraded.
export function legacyPropResult(market,{players,rows,games}){
 if(!String(market.provider_key||'').startsWith('sgo:')||market.category!=='Player Props')return null;
 const key=Object.keys(stats).find(key=>String(market.provider_market_id||'').startsWith(key+'-'));
 if(!key)return null;
 const name=String(market.title||'').split(' · ')[0];
 const kickoff=Date.parse(market.closes_at),club=value=>String(value||'').replace(/_NFL$/,'').toUpperCase();
 const matches=Object.entries(players||{}).filter(([,p])=>nameKey(p.n||p.full_name)===nameKey(name)).flatMap(([id,player])=>{
  const team=club(player.t||player.team),matching=(games||[]).filter(g=>Math.abs(Date.parse(g.starts_at)-kickoff)<60000&&[g.home_team_id,g.away_team_id].map(club).includes(team));
  if(matching.length!==1||matching[0].status!=='final')return [];
  const raw=(rows||[]).find(row=>String(row.player_id)===id)?.stats?.[stats[key]];
  return raw!=null&&String(raw).trim()!==''&&Number.isFinite(Number(raw))&&Number(raw)>=0?[Number(raw)]:[];
 });
 if(matches.length!==1)return null;
 const score=matches[0],line=Number(market.provider_line);
 if(!Number.isFinite(line))return null;
 return {provider_key:market.provider_key,final_score:score,winner_side:score===line?'void':score>line?'over':'under',void_market:score===line};
}
