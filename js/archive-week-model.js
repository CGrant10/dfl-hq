import {weeklyRoasts} from './weekly-roasts.js';
const numeric=v=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const positive=v=>Number.isInteger(Number(v))&&Number(v)>0;
const cents=v=>Math.round(v*100);
export function archiveWeekOptions(index=[]){
 const seen=new Set();return index.filter(r=>r.completed===true&&positive(r.season)&&Number(r.season)>=2010&&Number(r.season)<=2100&&positive(r.week)&&Number(r.week)<=18).map(r=>({season:Number(r.season),week:Number(r.week)})).filter(r=>{const key=`${r.season}:${r.week}`;if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>b.season-a.season||b.week-a.week);
}
export function archivePriorRecords(lore,index,season,week){
 const records=new Map();if(lore.archiveComplete!==true)return records;
 const finals=new Set(archiveWeekOptions(index).filter(w=>w.season===season&&w.week<week).map(w=>w.week)),seen=new Set();
 if([...finals].some(w=>!(lore.matchups||[]).some(g=>Number(g.season)===season&&Number(g.week)===w)))return records;
 for(const g of lore.matchups||[]){
  if(Number(g.season)!==season||!finals.has(Number(g.week))||!positive(g.roster1)||!positive(g.roster2)||Number(g.roster1)===Number(g.roster2))continue;
  const key=`${g.week}:${[Number(g.roster1),Number(g.roster2)].sort((a,b)=>a-b).join(':')}`;if(seen.has(key))continue;seen.add(key);
  const a=numeric(g.score1),b=numeric(g.score2);
  for(const [roster,score,against] of [[g.roster1,a,b],[g.roster2,b,a]]){const r=records.get(String(roster))||{wins:0,losses:0,ties:0,known:true};if(score===null||against===null)r.known=false;else if(cents(score)===cents(against))r.ties++;else if(score>against)r.wins++;else r.losses++;records.set(String(roster),r)}
 }
 return records;
}
export function buildArchiveWeek(data,{name=(uid,_season,roster)=>({label:`Roster ${roster}`,memberId:null}),records=new Map()}={}){
 const games=[],seen=new Set();let duplicate=false;
 for(const row of data.games||[]){
  if(!positive(row.matchup_id)||seen.has(String(row.matchup_id))){duplicate=true;continue}seen.add(String(row.matchup_id));
  const side=(uid,roster,score)=>({...name(uid,Number(data.season),roster),roster,score:numeric(score),record:records.get(String(roster))||null});
  const left=side(row.user1,row.roster1,row.score1),right=side(row.user2,row.roster2,row.score2),scored=left.score!==null&&right.score!==null&&positive(row.roster1)&&positive(row.roster2)&&Number(row.roster1)!==Number(row.roster2),delta=scored?cents(left.score)-cents(right.score):null;
  const winner=scored&&delta!==0?(delta>0?left:right):null,loser=winner?(winner===left?right:left):null;
  const conflict=row.winner_roster_id!=null&&(!winner||Number(row.winner_roster_id)!==Number(winner.roster));
  games.push({...row,left,right,scored:scored&&!conflict,tied:scored&&!conflict&&delta===0,winner:conflict?null:winner,loser:conflict?null:loser,margin:scored&&!conflict?Math.abs(delta)/100:null,total:scored&&!conflict?(cents(left.score)+cents(right.score))/100:null});
 }
 const complete=data.completed===true&&games.length>0&&!duplicate&&games.every(g=>g.scored),margins=complete?games.map(g=>g.margin):[],min=Math.min(...margins),max=Math.max(...margins),close=complete?games.filter(g=>g.margin===min):[],blowout=complete&&max>0?games.filter(g=>g.margin===max):[];
 const receipt=complete?weeklyRoasts({...data,games:games.map(g=>({...g,left:{...g.left,name:g.left.label},right:{...g.right,name:g.right.label}}))})[0]:null;
 const decided=games.find(g=>g.winner),roast=receipt?.text||(complete?(decided?`${decided.winner.label} beat ${decided.loser.label} by ${decided.margin.toFixed(2)}. Talk your shit. The scoreboard backs it up.`:'Nobody won. Nobody lost. Everybody gets to argue about this shit.'):null);
 return {season:Number(data.season),week:Number(data.week),games,complete,close,blowout,roast};
}
