import {playerInjuryReport} from './player-availability.js';

const DAY=86400000;
const club=value=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[value]||value);
const position=p=>p?.p||p?.position;
const identity=p=>({name:p?.n||p?.full_name||[p?.first_name,p?.last_name].filter(Boolean).join(' '),nflTeam:club(p?.t||p?.team),position:position(p)});
const fresh=(report,now)=>!!report&&now-report.updatedAt<=14*DAY&&report.updatedAt<=now+300000;
const unavailable=status=>/^(?:out|doubtful|IR|PUP|injured reserve)$/i.test(status||'');
// Semantic changes require a fresh review even if rounded prices stay equal.
export const valueContextKey=player=>JSON.stringify([player?.valueContext?.roleChange||null,!!player?.valueContext?.injurySetback,
 player?.valueContext?.quarterback?.quarterbackId||null,player?.valueContext?.quarterback?.status||null]);

// Infer the established passer from actual attempts on his CURRENT NFL team.
// A backup's injury cannot create a team-wide penalty. Two games led by the
// replacement end this temporary adjustment: those results now inform form.
export function teamQuarterbackContext({players={},weeks=[],injuryIndex=new Map(),season,now=Date.now()}={}){
 const teams=new Map(),result=new Map();
 for(const rows of weeks)for(const row of rows||[]){
  const id=String(row.player_id||''),meta=players[id]||row.player,p=identity(meta),team=club(row.team),attempts=Number(row.stats?.pass_att)||0;
  const date=Date.parse(row.date||'');
  if(p.position!=='QB'||!team||p.nflTeam!==team||attempts<=0||row.stats?.gp===0||season!=null&&Number(row.season)!==Number(season)||row.season_type&&row.season_type!=='regular'||!Number.isFinite(date)||date>now)continue;
  const game=row.game_id||row.date;
  if(!teams.has(team))teams.set(team,new Map());
  const games=teams.get(team);if(!games.has(game))games.set(game,{date,passers:new Map()});
  games.get(game).passers.set(id,{id,meta,attempts});
 }
 for(const [team,games] of teams){
  const recent=[...games.values()].sort((a,b)=>a.date-b.date).slice(-3);
  if(recent.length<2)continue;
  const leaders=recent.map(g=>[...g.passers.values()].sort((a,b)=>b.attempts-a.attempts)[0]);
  const counts=new Map();for(const p of leaders)counts.set(p.id,(counts.get(p.id)||0)+1);
  const starter=[...counts].find(([,count])=>count>=2)?.[0];
  if(!starter)continue;
  const passer=leaders.find(p=>p.id===starter),report=playerInjuryReport(identity(passer.meta),injuryIndex);
  // Use a dated, current report; do not infer a fracture, exact absence, or
  // downgrade from an old catalog tag or a routine questionable designation.
  if(!fresh(report,now)||!unavailable(report.status)||recent.reduce((n,g)=>n+(g.passers.get(starter)?.attempts||0),0)<40)continue;
  if(leaders.slice(-2).every(p=>p.id!==starter))continue;
  // A later full passing workload supersedes old injury news.
  if(recent.some(g=>g.date>report.updatedAt&&(g.passers.get(starter)?.attempts||0)>=15))continue;
  result.set(team,{quarterbackId:starter,quarterbackName:identity(passer.meta).name,status:report.status,updatedAt:report.updatedAt,source:'ESPN',factor:.92});
 }
 return result;
}

// A new setback is factual news, not a lifetime "injury-prone" label. Healthy
// clearance, old reports, historical injuries and speculative news don't count.
export function currentInjurySetback(player,{injuryIndex=new Map(),now=Date.now()}={}){
 const report=playerInjuryReport(player,injuryIndex);
 if(!fresh(report,now)||!/^(?:questionable|doubtful|out|injured reserve|IR|PUP)$/i.test(report.status||''))return null;
 const text=[report.shortComment,report.longComment].filter(Boolean).join(' ');
 const returned=/\breturn(?:ed|ing)?\b.{0,70}\b(?:absence|miss(?:ed|ing)?|injur)/i.test(text)||/\b(?:after|following)\b.{0,45}\babsence\b/i.test(text);
 const setback=/\b(?:new|another|aggravat\w*|reinjur\w*)\b.{0,45}\b(?:injur\w*|hamstring|ankle|knee|shoulder|groin|calf)\b/i.test(text)||/\b(?:suffered|sustained)\b.{0,45}\b(?:hamstring|ankle|knee|shoulder|groin|calf)\b/i.test(text);
 // Reject conditional descriptions instead of turning a feared setback into
 // confirmed news. The ordinary injury designation still applies separately.
 if(!returned||!setback||/\b(?:could|might|may|fear\w*|concern\w*|no|not|avoid\w*|without|denied)\b.{0,30}\b(?:new|another|aggravat\w*|reinjur\w*)/i.test(text))return null;
 return {label:'Injury setback',updatedAt:report.updatedAt,source:'ESPN'};
}

// Three games of opportunity, not three touchdown totals. The median gate
// prevents one huge workload from masquerading as a sustained role change.
export function workloadChange({position,currentGames,recentUsage,priorUsage,usageRows=[],carryWeight=0,depthOrder}={}){
 if(!['RB','WR','TE'].includes(position)||currentGames<5||usageRows.length!==3||!(priorUsage>=2)||recentUsage==null)return null;
 const samples=usageRows.map(r=>r.targets==null||carryWeight&&r.carries==null?null:r.targets+carryWeight*(r.carries||0));
 if(samples.some(v=>v==null))return null;
 const median=[...samples].sort((a,b)=>a-b)[1];
 if(recentUsage>=priorUsage*1.4&&median>=priorUsage*1.3&&recentUsage>=6&&(position!=='RB'||depthOrder===1))return 'expanded';
 if(recentUsage<=priorUsage*.65&&median<=priorUsage*.75&&priorUsage>=6)return 'reduced';
 return null;
}
