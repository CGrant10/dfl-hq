// Shared by the browser and the scheduled publisher. No DOM, storage or fetches.
export const POWER_MODEL_VERSION = 'dfl-power-v1';
export const POWER_WEIGHTS = Object.freeze({allPlay:.6,recent:.3,record:.1});
const clamp=n=>Math.max(0,Math.min(1,n));
const finite=n=>n!=null&&n!==''&&Number.isFinite(Number(n));
const round=n=>Math.round(n*100)/100;
const key=n=>String(n??'');
const median=values=>{const v=[...values].sort((a,b)=>a-b),m=Math.floor(v.length/2);return v.length%2?v[m]:(v[m-1]+v[m])/2;};
const name=t=>t.team_name||t.ownerName||`Team ${t.roster_id??t.id}`;
const percentRank=(value,values)=>values.length<2?.5:(values.filter(v=>v<value).length+(values.filter(v=>v===value).length-1)/2)/(values.length-1);

export function powerBanter(row,board){
 const n=board.rows.length,played=row.games??row.history.length;
 if(!played)return 'New season. Everybody’s a fucking contender in their own head.';
 if(row.wins>=Math.ceil(played*.7)&&row.scoringRank>Math.ceil(n*.65))return `${row.record}, #${row.scoringRank} in scoring. You lucky bastard.`;
 if(row.allPlayRate>=.65&&row.wins<row.losses)return `${Math.round(row.allPlayRate*100)}% all-play wins. The schedule’s been a bastard.`;
 if(row.streak<=-3)return `${Math.abs(row.streak)} straight losses. Same fucking excuses.`;
 if(row.movement>=2)return `Up ${row.movement} spots. Somebody finally woke the fuck up.`;
 if(row.movement<=-2)return `Down ${Math.abs(row.movement)} spots. That shit leaves a mark.`;
 if(row.rank===1)return `#1 in power. Now back that shit up.`;
 if(row.recentRate>=.7)return 'The last three weeks have been a fucking problem.';
 if(row.scoringRank===n)return 'Last in scoring. The scoreboard keeps the fucking receipts.';
 return `${row.record}. The points have the final fucking say.`;
}

/** Complete, identified slates only. Current/live weeks never become results. */
export function buildPowerBoards({teams=[],matchups=[],currentWeek=null,season=null,weeks=14,standings=[],publications=[],weights=POWER_WEIGHTS}={}){
 const active=teams.filter(t=>t?.id!=null);
 if(active.length<2||new Set(active.map(t=>key(t.id))).size!==active.length)return null;
 const byUser=new Map(active.filter(t=>t.sleeper_user_id!=null).map(t=>[key(t.sleeper_user_id),t]));
 const byRoster=new Map(active.map(t=>[key(t.roster_id??t.id),t]));
 const side=(r,n)=>byRoster.get(key(r[`roster${n}`]))||byUser.get(key(r[`user${n}`]));
 const grouped=new Map();
 for(const row of matchups){
  const w=Number(row.week);
  if(season!=null&&row.season!=null&&Number(row.season)!==Number(season)||!Number.isInteger(w)||w<1||w>weeks||!finite(row.score1)||!finite(row.score2))continue;
  if(!grouped.has(w))grouped.set(w,[]);grouped.get(w).push(row);
 }
 const cutoff=Number(currentWeek),complete=[...grouped].filter(([w,rows])=>{
  if(cutoff>0&&w>=cutoff)return false;
  if(!(cutoff>0)&&!rows.every(r=>Number(r.score1)>0&&Number(r.score2)>0))return false;
  const ids=rows.flatMap(r=>[side(r,1),side(r,2)]).filter(Boolean).map(t=>key(t.id));
  return rows.length*2===active.length&&ids.length===active.length&&new Set(ids).size===active.length;
 }).sort((a,b)=>a[0]-b[0]);
 const valid=[];for(const entry of complete){if(entry[0]!==valid.length+1)break;valid.push(entry);}
 const state=new Map(active.map(t=>[key(t.id),{wins:0,losses:0,ties:0,points:0,allWins:0,allTies:0,streak:0,history:[]}]));
 const boards=[];let previous=new Map();
 const forecasts=active.map(t=>t.powerForecast?.complete&&finite(t.powerForecast.points)?Number(t.powerForecast.points):null);
 const rosterReady=forecasts.every(finite);
 const baseline=active.map(t=>finite(t.lineup?.weeklyPoints)?Number(t.lineup.weeklyPoints):null);
 if(!valid.length&&!rosterReady&&!baseline.every(finite))return null;
 const make=(week,latest)=>{
  const games=state.values().next().value.history.length;
  const seasonBaseline=week===0&&!rosterReady&&baseline.every(finite);
  const estimates=seasonBaseline?baseline:forecasts,ready=rosterReady||seasonBaseline;
  const rosterWeight=ready&&(week===0||latest)?games===0?1:games<3?.4:.25:0;
  const rows=active.map((team,i)=>{
   const s=state.get(key(team.id)),h=s.history,possible=h.length*(active.length-1);
   const allPlayRate=possible?(s.allWins+s.allTies*.5)/possible:null;
   const recent=h.slice(-3),recentRate=recent.length?clamp(.5+(recent.reduce((sum,v,i)=>sum+v.relative*(i+1),0)/recent.reduce((sum,_,i)=>sum+i+1,0)-1)*1.25):null;
   const result=h.length?(s.wins+s.ties*.5)/h.length:.5;
   const performance=allPlayRate==null?.5:weights.allPlay*allPlayRate+weights.recent*recentRate+weights.record*result;
   const roster=ready?percentRank(estimates[i],estimates):null;
   return {id:key(team.id),name:name(team),...s,history:h.map(v=>({...v})),record:`${s.wins}-${s.losses}${s.ties?`-${s.ties}`:''}`,
    games:h.length,allPlayRate,allPlayRecord:possible?`${s.allWins}-${possible-s.allWins-s.allTies}${s.allTies?`-${s.allTies}`:''}`:null,
    recentRate,pointsPerGame:h.length?s.points/h.length:null,weeklyScore:h.at(-1)?.points??null,
    forecast:rosterWeight?estimates[i]:null,rosterWeight,performance:round(performance*100),
    score:round((performance*(1-rosterWeight)+(roster??.5)*rosterWeight)*100),rank:0,previousRank:null,movement:0,scoringRank:0};
  }).sort((a,b)=>b.score-a.score||b.points-a.points||a.id.localeCompare(b.id,undefined,{numeric:true}));
  rows.forEach((row,i)=>{row.rank=i+1;row.previousRank=previous.get(row.id)??null;row.movement=row.previousRank==null?0:row.previousRank-row.rank;row.scoringRank=1+rows.filter(r=>r.points>row.points).length;});
  const board={week,label:week?`Week ${week}`:'Roster model',comparison:previous.size?`vs Week ${boards.at(-1)?.week||0}`:'New model',model:POWER_MODEL_VERSION,forecastSource:seasonBaseline?'season-baseline':'weekly',forecastWeek:cutoff>0&&!seasonBaseline?cutoff:null,rosterWeight,published:false,rows};
  const saved=publications.find(p=>Number(p.week)===week&&Number(p.season)===Number(season)&&p.model_version===POWER_MODEL_VERSION);
  if(saved&&validPublication(saved,active,week)){
   board.rows=saved.payload.rows.map(r=>({...r,name:name(active.find(t=>key(t.id)===key(r.id))),history:r.history.map(v=>({...v}))}));
   Object.assign(board,{published:true,publishedAt:saved.published_at,reconstructed:!!saved.payload.reconstructed,forecastWeek:saved.payload.forecastWeek,rosterWeight:saved.payload.rosterWeight});
  }
  board.rows.forEach(r=>{if(!board.published){r.previousRank=previous.get(r.id)??null;r.movement=r.previousRank==null?0:r.previousRank-r.rank;}r.banter=powerBanter(r,board);});
  boards.push(board);previous=new Map(board.rows.map(r=>[r.id,r.rank]));
 };
 make(0,false);previous=new Map();
 for(const [week,rows] of valid){
  const scores=new Map();for(const r of rows){scores.set(key(side(r,1).id),Number(r.score1));scores.set(key(side(r,2).id),Number(r.score2));}
  const mid=median([...scores.values()]);
  for(const row of rows){
   const a=side(row,1),b=side(row,2),pa=Number(row.score1),pb=Number(row.score2);
   for(const [t,points,opponent] of [[a,pa,pb],[b,pb,pa]]){
    const s=state.get(key(t.id)),win=points>opponent,loss=points<opponent;
    s.wins+=Number(win);s.losses+=Number(loss);s.ties+=Number(!win&&!loss);s.points+=points;
    s.streak=win?Math.max(0,s.streak)+1:loss?Math.min(0,s.streak)-1:0;
    const rivals=[...scores].filter(([id])=>id!==key(t.id)).map(([,p])=>p);
    s.allWins+=rivals.filter(p=>points>p).length;s.allTies+=rivals.filter(p=>points===p).length;
    s.history.push({week,points,relative:mid>0?points/mid:1,allPlay:(rivals.filter(p=>points>p).length+rivals.filter(p=>points===p).length*.5)/rivals.length});
   }
  }
  const latest=week===valid.at(-1)?.[0];
  if(latest){
   const official=active.map(t=>standings.find(r=>(key(r.roster_id)===key(t.roster_id??t.id)||t.sleeper_user_id!=null&&key(r.sleeper_user_id)===key(t.sleeper_user_id))&&(season==null||Number(r.season)===Number(season))));
   if(official.every(r=>r&&['wins','losses','ties'].every(k=>Number.isInteger(Number(r[k]))&&Number(r[k])>=0)&&Number(r.wins)+Number(r.losses)+Number(r.ties)===week)&&state.values().next().value.history.length===week){
    active.forEach((t,i)=>{const s=state.get(key(t.id)),r=official[i];s.wins=Number(r.wins);s.losses=Number(r.losses);s.ties=Number(r.ties);});
   }
  }
  make(week,latest);
 }
 // Week zero is a current forecast, never a historical preseason claim.
 if(boards.length>1)boards[1].comparison='New model';
 return {model:POWER_MODEL_VERSION,latestWeek:valid.at(-1)?.[0]||0,boards};
}

export function validPublication(saved,teams,week){
 const p=saved?.payload,rows=p?.rows;
 return p?.model===POWER_MODEL_VERSION&&Number(p.week)===week&&Array.isArray(rows)&&rows.length===teams.length
  &&new Set(rows.map(r=>key(r.id))).size===teams.length&&new Set(rows.map(r=>r.rank)).size===teams.length
  &&rows.every((r,i)=>r.rank===i+1&&teams.some(t=>key(t.id)===key(r.id))&&finite(r.score)&&Number(r.score)>=0&&Number(r.score)<=100
   &&['wins','losses','ties'].every(k=>Number.isInteger(r[k])&&r[k]>=0)&&r.wins+r.losses+r.ties===week
   &&finite(r.allPlayRate)&&r.allPlayRate>=0&&r.allPlayRate<=1&&finite(r.recentRate)&&finite(r.pointsPerGame)
   &&Array.isArray(r.history)&&r.history.length>0&&r.history.every(v=>Number.isInteger(v.week)&&v.week>0&&v.week<=week&&finite(v.points)&&finite(v.relative)));
}
