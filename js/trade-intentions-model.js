export const INTENTION_POSITIONS=['QB','RB','WR','TE'];
export const INTENTION_LABELS={available:'Available',listening:'Listening',keeping:'Keeping'};
export const INTENTION_MAX_AGE=21*86400000;
const key=t=>String(t?.id??'');

// Intentions are manager statements, never inputs to player price or verdicts.
export function tradeIntentionContext(rows,teams,{season,leagueId,now=Date.now()}={}){
 const context={};
 for(const row of rows||[]){
  if(Number(row.season)!==Number(season)||String(row.league_id)!==String(leagueId))continue;
  const age=now-Date.parse(row.updated_at),team=teams.find(t=>key(t)===String(row.roster_id));
  if(!team||!Number.isFinite(age)||age< -60000||age>INTENTION_MAX_AGE)continue;
  const owned=new Set(team.playerIds.map(String));
  context[key(team)]={players:Object.fromEntries(Object.entries(row.players||{}).filter(([id,status])=>owned.has(id)&&Object.hasOwn(INTENTION_LABELS,status))),
   needs:[...new Set((row.needs||[]).filter(p=>INTENTION_POSITIONS.includes(p)))]};
 }
 return context;
}
export function intentionPlayerAllowed(team,id,context={},required=[]){
 return context[key(team)]?.players?.[String(id)]!=='keeping'||required.map(String).includes(String(id));
}
export function offerManagerFit(parties,sends,receives,starters,pool,context={}){
 let score=0;const notes=[];
 parties.forEach((team,i)=>{
  const pref=context[key(team)];if(!pref)return;
  const statuses=(sends[i]||[]).map(id=>pref.players?.[String(id)]);
  const keeping=statuses.includes('keeping'),available=statuses.includes('available'),listening=statuses.includes('listening');
  score+=keeping?-3:available?2:listening?1:0;
  if(i>0&&keeping)notes.push('Requested player · Keeping');
  else if(i>0&&available)notes.push('Listed player');
  else if(i>0&&listening)notes.push('Manager is listening');
  const incoming=new Set((receives[i]||[]).map(String)),starting=new Set((starters?.[i]||[]).map(String));
  const fills=pref.needs.filter(position=>[...incoming].some(id=>starting.has(id)&&pool.get(id)?.position===position));
  if(fills.length){score+=2;notes.push(i===0?'Matches your stated needs':`Wants ${fills.join(' / ')}`);}
 });
 return {score,notes:[...new Set(notes)].slice(0,3)};
}
