// Names are presentation. Owner IDs, historical scores and stored receipts stay intact.
const clean=value=>String(value??'').trim();
const key=value=>clean(value).normalize('NFKC').toLocaleLowerCase().replace(/\s+/g,' ');
export function currentTeamMembers(members=[],users=[],rosters=[]){
 const live=new Map(users.map(u=>[String(u.user_id),u]));
 const latest=new Map();
 for(const r of [...rosters].sort((a,b)=>Number(b.season)-Number(a.season)))if(r.sleeper_user_id&&!latest.has(String(r.sleeper_user_id)))latest.set(String(r.sleeper_user_id),r);
 return members.map(m=>{
  if(!m.sleeper_user_id)return m;
  const u=live.get(String(m.sleeper_user_id)),r=latest.get(String(m.sleeper_user_id));
  const name=clean(u?.metadata?.team_name)||clean(u?.display_name)||clean(r?.team_name)||clean(m.team_name)||clean(m.display_name);
  const aliases=[...new Set([m.team_name,m.display_name,u?.metadata?.team_name,u?.display_name,...rosters.filter(r=>String(r.sleeper_user_id)===String(m.sleeper_user_id)).map(r=>r.team_name)].map(clean).filter(Boolean))];
  return {...m,team_name:name,team_name_aliases:aliases,team_roster_ids:rosters.filter(r=>String(r.sleeper_user_id)===String(m.sleeper_user_id)&&r.roster_id!=null).map(r=>({season:Number(r.season),roster_id:String(r.roster_id)}))};
 });
}
export function currentTeamMember(label,members=[],identity={}){
 const uid=identity.sleeper_user_id??identity.user_id,mid=identity.member_id;
 if(uid!=null){const m=members.find(m=>String(m.sleeper_user_id)===String(uid));if(m)return m;}
 if(mid!=null){const m=members.find(m=>String(m.id)===String(mid));if(m)return m;}
 if(identity.roster_id!=null&&identity.season!=null){const matches=members.filter(m=>(m.team_roster_ids||[]).some(r=>r.season===Number(identity.season)&&r.roster_id===String(identity.roster_id)));if(matches.length===1)return matches[0];}
 const wanted=key(label);if(!wanted)return null;
 const matches=members.filter(m=>[m.team_name,m.display_name,...(m.team_name_aliases||[])].some(alias=>key(alias)===wanted));
 return matches.length===1?matches[0]:null;
}
export function currentTeamLabel(label,members=[],identity={}){
 const m=currentTeamMember(label,members,identity);
 return clean(m?.team_name)||clean(m?.display_name)||clean(label);
}
export function currentMatchupTitle(title,members=[]){
 const parts=String(title||'').split(/\s+(?:vs\.?|v\.?|@|at)\s+/i);
 return parts.length===2?parts.map(p=>currentTeamLabel(p,members)).join(' vs '):title;
}
export function currentTradeNames(alert,members=[]){
 if(!alert)return alert;
 const teams=(alert.teams||[]).map(t=>({...t,team_name:currentTeamLabel(t.team_name,members,{...t,season:alert.season})||t.team_name}));
 const winner=teams.find(t=>String(t.roster_id)===String(alert.verdict?.winner_roster_id));
 return {...alert,teams,verdict:alert.verdict?{...alert.verdict,winner_team_name:winner?.team_name||currentTeamLabel(alert.verdict.winner_team_name,members)||alert.verdict.winner_team_name}:alert.verdict};
}
export function currentSportsbookNames(data,members=[]){
 const fantasy=m=>m?.category==='Fantasy'||/^matchup:/.test(String(m?.auto_key||''));
 const marketById=new Map((data.markets||[]).map(m=>[String(m.id),m]));
 const markets=(data.markets||[]).map(m=>fantasy(m)?{...m,title:currentMatchupTitle(m.title,members)}:m);
 const outcomes=(data.outcomes||[]).map(o=>fantasy(marketById.get(String(o.market_id)))?{...o,label:currentTeamLabel(o.label,members,o)}:o);
 const leg=l=>fantasy(marketById.get(String(l.market_id)))||l.category==='Fantasy'?{...l,label:currentTeamLabel(l.label,members,l),market:currentMatchupTitle(l.market,members)}:l;
 const bets=(data.bets||[]).map(b=>{
  let legs=b.legs;if(typeof legs==='string'){try{legs=JSON.parse(legs)}catch{return b;}}
  return Array.isArray(legs)?{...b,legs:legs.map(leg)}:b;
 });
 const trends=(data.trends||[]).map(t=>{
  const market=marketById.get(String(t.market_id)),outcome=outcomes.find(o=>String(o.id)===String(t.outcome_id));
  return fantasy(market)?{...t,outcome_label:outcome?.label||currentTeamLabel(t.outcome_label,members),market_title:currentMatchupTitle(t.market_title,members)}:t;
 });
 const recap=data.recap?{...data.recap}:data.recap;
 if(recap)for(const field of ['biggestWinner','worstBeat','longestParlay','mostProfitable','funniestFailure'])if(recap[field])recap[field]={...recap[field],team_name:currentTeamLabel(recap[field].team_name||recap[field].display_name,members,recap[field])};
 return {...data,markets,outcomes,bets,trends,recap};
}
