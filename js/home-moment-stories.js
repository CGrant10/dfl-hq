import {dailyBroadcast} from './daily-broadcast.js';
import {homeWeekPhase} from './home-week-flow.js';
import {homeLeagueStory} from './home-lead-story.js';
const valid=n=>n!==null&&n!==undefined&&String(n).trim()!==''&&Number.isFinite(Number(n))&&Number(n)>=0;
const offensive=p=>['QB','RB','WR','TE'].includes(p?.position);
const hash=text=>[...text].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
const copy={
 bench:['Hell of a fucking spectator.','Bench points. Zero fucking help.','Nice seat for a monster game.','Your bench wants a new manager.'],
 close:['Check the fucking decimals.','A loss that ruins your Tuesday.','That decimal is a personal attack.','One more catch. Tough shit.'],
 blowout:['A public ass-whipping.','Hope lasted until kickoff.','The scoreboard filed a complaint.','Absolutely fucking buried.'],
 carry:['Carrying the whole fucking operation.','One man. A shitload of points.','Somebody came to fucking play.'],
 liveclose:['Nobody breathe.','This shit is going to the wire.','Every fucking decimal counts.'],
};
const href=(season,week,id,owner)=>`#/clubhouse?season=${season}&week=${week}&tab=matchups${id&&id!=='undefined'?'&matchup='+encodeURIComponent(id):owner?'&owner='+encodeURIComponent(owner):''}`;

/** Only actual offensive player scores and confirmed final matchups make roasts. */
export function homeMomentStories({edition={},report=null,meSleeperId=null,now=new Date()}={}){
 const {model,history=[]}=edition,phase=homeWeekPhase(edition,Number(now));
 if(!model||['error','offline','checking'].includes(model.scoreStatus))return [];
 if(!model.completed&&(!Number.isFinite(Number(model.checkedAt))||Number(now)-Number(model.checkedAt)>150000||Number(model.checkedAt)>Number(now)+300000))return [];
 const started=['live','between','settling'].includes(phase.key);
 const advanced=Number(phase.week)>Number(model.week);
 if(advanced&&started)return [];
 const year=Number(model.season),week=Number(model.week);
 if(!Number.isInteger(year)||!Number.isInteger(week)||week<1||week>18)return [];
 const date=dailyBroadcast(now).date,stories=[],seen=new Set();
 const add=(type,identity,details)=>{
  const id=`league-moment:${year}:${week}:${type}:${identity}`;
  if(seen.has(id))return;seen.add(id);
  stories.push({id,key:id,source:'auto',generator:'leagueMoment',kind:'league-story',treatment:'stat',
   temporal:'final',priority:700,pinned:true,dwell:4200,storySignal:type,
   kicker:`${year} · WEEK ${week} · ${{bench:'BENCH RECEIPT',close:'CLOSE CALL',blowout:'BEATDOWN',carry:'HEAVY LIFTING',liveclose:'STILL LIVE'}[type]}`,
   headline:copy[type][hash(id+date)%copy[type].length],...details});
 };
 const games=(model.games||[]).filter(g=>g.sides?.length===2);
 if(started&&!model.completed){
  for(const game of games){
   for(const team of game.sides){
    const p=(team.starters||team.lineup||[]).filter(p=>!p.empty&&offensive(p)&&['live','final'].includes(p.state)&&valid(p.points)&&Number(p.points)>=30&&p.name).sort((a,b)=>Number(b.points)-Number(a.points))[0];
    if(p&&team.name)add('carry',`${team.uid||team.roster}:${p.id}`,{figure:Number(p.points).toFixed(2),figureLabel:p.state==='final'?'Final points':'Points · live',subtitle:`${p.name} · ${team.name}`,temporal:p.state==='final'?'final':'live',href:href(year,week,game.id)+'&player='+encodeURIComponent(p.id),actionLabel:'View player',momentPriority:3});
   }
   if(game.isMine||game.sides.some(t=>!valid(t.score))||!game.sides.some(t=>(t.starters||t.lineup||[]).some(p=>!p.empty&&p.state==='live')))continue;
   const margin=Math.abs(Number(game.sides[0].score)-Number(game.sides[1].score));
   if(margin<=3&&game.sides.reduce((sum,t)=>sum+Number(t.score),0)>=120)add('liveclose',String(game.id),{figure:margin.toFixed(2),figureLabel:'Points apart · live',subtitle:game.sides.map(t=>t.name).join(' vs '),temporal:'live',href:href(year,week,game.id),actionLabel:'Watch matchup',momentPriority:2});
  }
 }
 for(const game of games)for(const team of game.sides){
  const players=(team.bench||[]).filter(p=>!p.empty&&offensive(p)&&p.state==='final'&&valid(p.points)&&Number(p.points)>=25&&p.name&&team.name)
   .sort((a,b)=>Number(b.points)-Number(a.points));
  if(players[0]){const p=players[0];add('bench',`${team.uid||team.roster}:${p.id||p.name}`,{
   figure:Number(p.points).toFixed(2),figureLabel:'On the bench',subtitle:`${p.name} · ${team.name}`,
   href:href(year,week,game.id)+'&player='+encodeURIComponent(p.id),actionLabel:'Open the matchup',momentPriority:3});}
 }
 let finalReport=null;
 if(model.completed&&games.length&&games.every(g=>g.sides.every(t=>valid(t.score)))){
  finalReport={final:true,season:year,week,games:games.map(game=>{
   const [a,b]=[...game.sides].sort((a,b)=>Number(b.score)-Number(a.score));
   return {id:game.id,winner:{uid:a.uid,name:a.name,value:Number(a.score)},loser:{uid:b.uid,name:b.name,value:Number(b.score)}};
  })};
 }else if(report?.final&&Number(report.season)===year&&Number(report.week)>=week-1&&Number(report.week)<=week&&!started)finalReport=report;
 if(finalReport){
  const verified=homeLeagueStory(finalReport,{history,season:year,week,meSleeperId});
  if(verified?.storySignal)stories.push({...verified,id:`league-moment:${verified.storyKey}`,key:`league-moment:${verified.storyKey}`,generator:'leagueMoment',momentPriority:4});
  for(const game of finalReport.games||[]){
   const a=game.winner,b=game.loser;
   if(!a?.name||!b?.name||!valid(a.value)||!valid(b.value)||Number(a.value)<=Number(b.value)
    ||meSleeperId&&[a.uid,b.uid].some(id=>String(id)===String(meSleeperId)))continue;
   const margin=Number(a.value)-Number(b.value),type=margin<=5?'close':margin>=30?'blowout':null;
   if(!type)continue;
   // The report may describe the previous completed week, so retain its date.
   const season=finalReport.season,round=finalReport.week,id=`league-moment:${season}:${round}:${type}:${a.uid}:${b.uid}`;
   if(seen.has(id))continue;seen.add(id);
   stories.push({id,key:id,source:'auto',generator:'leagueMoment',kind:'league-story',treatment:'stat',pinned:true,temporal:'final',priority:700,dwell:4200,
    storySignal:type,momentPriority:type==='close'?2:1,kicker:`${season} · WEEK ${round} · ${type==='close'?'CLOSE CALL':'BEATDOWN'}`,
    headline:copy[type][hash(id+date)%copy[type].length],sides:[a,b].map((t,i)=>({name:t.name,score:Number(t.value).toFixed(2),up:i===0,down:i===1})),
    href:href(season,round,game.id,a.uid),actionLabel:'View matchup'});
  }
 }
 return stories.sort((a,b)=>b.momentPriority-a.momentPriority||a.id.localeCompare(b.id));
}

/** One story per visit, at most three featured per Chicago day, 20h per-event cooldown. */
export function selectHomeMoment(stories,{scope='league',now=new Date(),storage}={}){
 if(!stories.length)return null;
 try{storage??=globalThis.localStorage}catch{storage=null}
 const time=Number(now),date=dailyBroadcast(now).date,key='dfl.homeMoments.v1.'+scope;
 let featured=[];
 try{const saved=JSON.parse(storage?.getItem(key)||'[]');if(Array.isArray(saved))featured=saved.filter(r=>typeof r.id==='string'&&Number.isFinite(r.at)&&r.at<=time&&time-r.at<7*86400000).slice(-30)}catch{}
 if(featured.filter(r=>r.date===date).length>=3)return null;
 const eligible=stories.filter(story=>!featured.some(r=>r.id===story.id&&time-r.at<20*3600000));
 const recentTypes=new Set(featured.filter(r=>r.date===date).map(r=>r.type));
 const chosen=eligible.find(s=>!recentTypes.has(s.storySignal))||eligible[0]||null;
 if(chosen)try{storage?.setItem(key,JSON.stringify([...featured,{id:chosen.id,type:chosen.storySignal,at:time,date}].slice(-30)))}catch{}
 return chosen;
}

const visitEditions=new Map();
export function createHomeMomentEdition({scope='league',visitKey=null,storage,now=()=>new Date()}={}){
 const key=visitKey==null?null:scope+':'+visitKey;
 const state=key&&visitEditions.get(key)||{selected:false,id:null};
 if(key){visitEditions.set(key,state);while(visitEditions.size>40)visitEditions.delete(visitEditions.keys().next().value)}
 return {update(context){
  const stories=homeMomentStories({...context,now:now()});
  if(!state.selected&&stories.length){state.id=selectHomeMoment(stories,{scope,storage,now:now()})?.id||null;state.selected=true}
  return state.id?stories.find(story=>story.id===state.id)||null:null;
 }};
}
