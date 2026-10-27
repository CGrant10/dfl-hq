import {headToHead,weeklyHeadlineSlide} from './home-slides.js';
const finite=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n));
const receiptLink=(model,game)=>`#/clubhouse?season=${model.season}&week=${model.week}&tab=matchups&matchup=${encodeURIComponent(game.id)}`;
const eligibleGame=g=>g.sides?.length===2&&g.sides.every(t=>t&&finite(t.score));

/** Edition copy uses scored games and dated receipts, never projected wins. */
export function homeLeadStory({deck=[],model=null,history=[],archive=null,now=new Date()}={}){
 const games=(model?.games||[]).filter(eligibleGame);
 const live=games.filter(g=>g.sides.some(t=>Number(t.live)>0));
 if(!model?.completed&&live.length){
  const game=[...live].sort((a,b)=>Math.abs(a.sides[0].score-a.sides[1].score)-Math.abs(b.sides[0].score-b.sides[1].score)||Number(a.isMine)-Number(b.isMine))[0];
  const margin=Math.abs(game.sides[0].score-game.sides[1].score);
  return {storyKey:`live:${model.season}:${model.week}:${game.id}`,headline:margin===0?'Dead even.':`${margin.toFixed(2)} apart.`,subtitle:margin<10?'Clench, fuckers.':'Still time for chaos.',body:`${game.sides.map(t=>t.name).join(' vs ')} · still playing.`,kicker:`LIVE · WEEK ${model.week}`,href:receiptLink(model,game),actionLabel:'Watch matchup'};
 }
 const trade=deck.find(s=>s.tradeStory&&Number.isFinite(Date.parse(s.occurredAt))&&Date.parse(s.occurredAt)<=Number(now)&&Number(now)-Date.parse(s.occurredAt)<=72*3600000);
 if(trade){const players=(trade.tradeStory.packages||[]).flatMap(p=>p.players||[]);const star=[...players].sort((a,b)=>(Number(b.value)||0)-(Number(a.value)||0))[0];return {storyKey:trade.key||trade.id,sourceKey:trade.key||trade.id,headline:'Deal done.',subtitle:'Talk your shit.',body:star?.name?`${star.name} switched sides in a ${trade.tradeStory.packages.length}-team deal.`:trade.headline,kicker:trade.kicker,href:trade.href,actionLabel:'Open receipt'};}
 if(model?.completed&&games.length){
  const margins=games.map(game=>({game,margin:Math.abs(game.sides[0].score-game.sides[1].score)})).filter(r=>r.margin>0);
  const close=[...margins].filter(r=>r.margin<3).sort((a,b)=>a.margin-b.margin)[0];
  const big=[...margins].sort((a,b)=>b.margin-a.margin)[0];
  const story=close||big;
  if(story){const {game,margin}=story,[a,b]=game.sides,winner=Number(a.score)>Number(b.score)?a:b,loser=winner===a?b:a;
   return {storyKey:`final:${model.season}:${model.week}:${game.id}`,headline:`${margin.toFixed(2)} points.`,subtitle:close?'Lucky bastard.':margin>=30?'Fucking buried.':'Keep the receipt.',body:`${winner.name} beat ${loser.name}.`,kicker:`FINAL · ${model.season} · WEEK ${model.week}`,href:receiptLink(model,game),actionLabel:'Open the aftermath'};
  }
 }
 const mine=model?.games?.find(g=>g.isMine);
 if(mine?.sides?.length===2){
  const [a,b]=mine.sides;
  const past=history.filter(g=>Number(g.season)<Number(model.season)||Number(g.season)===Number(model.season)&&Number(g.week)<Number(model.week));
  const h2h=headToHead({matchups:past,meSleeperId:a.uid,oppSleeperId:b.uid});
  if(h2h?.streak?.count>=2){const holder=h2h.streak.holder==='me'?a:b;
   return {storyKey:`rivalry:${model.season}:${model.week}:${mine.id}`,headline:`${h2h.streak.count} straight.`,subtitle:'End this shit.',body:`${holder.name} owns the last ${h2h.streak.count} meetings.`,kicker:`THE REMATCH · WEEK ${model.week}`,href:receiptLink(model,mine),actionLabel:'Open rivalry matchup'};
  }
 }
 if(archive?.headline&&archive.headline.length<=85)return {storyKey:`archive:${archive.key||archive.id}`,sourceKey:archive.key||archive.id,headline:'On the record.',subtitle:'Still fucking counts.',body:archive.headline,kicker:'DFL ARCHIVE',href:archive.href||'#/history',actionLabel:'Open the record'};
 return null;
}

const uid=value=>value!==null&&value!==undefined&&String(value).trim()?String(value):null;
const points=value=>['number','string'].includes(typeof value)&&finite(value)&&Number(value)>=0&&String(value).trim()!==''?Number(value):null;

// Only completed, dated receipts before this report can establish a run.
// Collapse identical repeated syncs; a conflicting receipt cannot prove a fact.
function pastReceipts(history,season,week){
 const receipts=new Map();
 for(const row of history){
  const year=Number(row.season),round=Number(row.week),a=uid(row.user1),b=uid(row.user2),left=points(row.score1),right=points(row.score2);
  if(!Number.isInteger(year)||year<2017||!Number.isInteger(round)||round<1||round>18||year>season||year===season&&round>=week||!a||!b||a===b)continue;
  const sides=[{uid:a,score:left},{uid:b,score:right}].sort((x,y)=>x.uid.localeCompare(y.uid));
  const key=`${year}:${round}:${sides[0].uid}:${sides[1].uid}`,next={season:year,week:round,sides,...(left===null||right===null||left===0&&right===0?{ambiguous:true}:{})};
  if(!receipts.has(key))receipts.set(key,next);
  else if(JSON.stringify(receipts.get(key))!==JSON.stringify(next))receipts.set(key,{...next,ambiguous:true});
 }
 return [...receipts.values()].filter(Boolean).sort((a,b)=>a.season-b.season||a.week-b.week);
}
const hasTeam=(game,id)=>game.sides.some(side=>side.uid===id);
const outcome=(game,id)=>{const side=game.sides.find(side=>side.uid===id),other=game.sides.find(side=>side.uid!==id);return !game.ambiguous&&side&&other?Math.sign(side.score-other.score):0;};

/** One supporting story, never a second personal scoreboard or a new opener.
 * Incomplete history falls back to the already-verified weekly result slide.
 */
export function homeLeagueStory(report,{history=[],season,week,meSleeperId=null,editionDate=''}={}){
 const base=weeklyHeadlineSlide(report,{season,week,meSleeperId});
 if(!base)return null;
 const games=report.games.filter(game=>game.winner.value>game.loser.value&&uid(game.winner.uid)&&uid(game.loser.uid)
  &&(!meSleeperId||![game.winner.uid,game.loser.uid].some(id=>String(id)===String(meSleeperId))));
 const editionDay=Date.parse(String(editionDate).slice(0,10)+'T12:00:00Z');
 if(editionDate&&Number.isFinite(editionDay)){
  // Rotate actual completed matchups, preserving the proven headline on its day.
  const lead=homeLeagueStory(report,{history,season,week,meSleeperId}),pairs=new Set();
  const candidates=[lead,...games.map(game=>{
   const margin=game.winner.value-game.loser.value;
   return {...base,storyKey:`matchup-file:${report.season}:${report.week}:${game.winner.uid}`,
    kicker:`${report.season} · WEEK ${report.week} · MATCHUP FILE`,
    headline:margin<=5?'Way too fucking close.':margin>=30?'Keep the group chat receipts.':'Somebody had to take the L.',
    figure:margin.toFixed(2),figureLabel:'Winning margin',
    subtitle:`${game.winner.name} ${game.winner.value.toFixed(2)} · ${game.loser.name} ${game.loser.value.toFixed(2)}`,
    sides:[game.winner,game.loser].map((s,i)=>({name:s.name,score:s.value.toFixed(2),up:i===0,down:i===1}))};
  })].filter(story=>{const key=JSON.stringify(story.sides.map(s=>[s.name,s.score]).sort());if(pairs.has(key))return false;pairs.add(key);return true});
  return candidates[((Math.floor(editionDay/86400000)%candidates.length)+candidates.length)%candidates.length];
 }
 const past=pastReceipts(history,report.season,report.week),signals=[];
 const story=(game,type,priority,figure,figureLabel,headline,subject=game.winner.uid)=>signals.push({game,type,priority,figure,figureLabel,headline,subject:String(subject)});
 const run=(id,sign)=>{
  let length=1;
  for(let round=report.week-1;round>=1;round--){
   const played=past.filter(row=>row.season===report.season&&row.week===round&&hasTeam(row,id));
   if(played.length!==1||outcome(played[0],id)!==sign)break;
   length++;
  }
  return length;
 };
 for(const game of games){
  const winner=String(game.winner.uid),loser=String(game.loser.uid);
  const meetings=past.filter(row=>hasTeam(row,winner)&&hasTeam(row,loser));let owned=0;
  // More than one pairing in the same NFL week is ambiguous, not a streak.
  for(let i=meetings.length-1;i>=0;i--){
   const row=meetings[i];
   if(meetings.some((other,j)=>j!==i&&other.season===row.season&&other.week===row.week)||outcome(row,winner)!==-1)break;
   owned++;
  }
  if(owned>=3)story(game,'revenge',4,String(owned),'H2H streak ended','The ownership papers got shredded.');
  const losses=run(loser,-1),wins=run(winner,1);
  if(losses>=3)story(game,'losing-run',2,String(losses),'Straight losses','This roster is a fucking crime scene.',loser);
  if(wins>=4)story(game,'winning-run',1,String(wins),'Straight wins','Still winning. Still insufferable.');
 }
 // A season-high claim requires every earlier week and the complete field.
 // A partial sync can still supply streaks, but cannot establish a record.
 const field=report.games.flatMap(game=>[uid(game.winner.uid),uid(game.loser.uid)]);
 const completeField=field.every(Boolean)&&new Set(field).size===field.length;
 const completePast=completeField&&report.week>=3&&Array.from({length:report.week-1},(_,index)=>{
  const rows=past.filter(row=>row.season===report.season&&row.week===index+1),ids=rows.flatMap(row=>row.sides.map(side=>side.uid));
  return !rows.some(row=>row.ambiguous)&&ids.length===field.length&&new Set(ids).size===field.length&&field.every(id=>ids.includes(id));
 }).every(Boolean);
 if(completePast){
  const previousHigh=Math.max(...past.filter(row=>row.season===report.season).flatMap(row=>row.sides.map(side=>side.score)));
  const currentHigh=Math.max(...report.games.flatMap(game=>[game.winner.value,game.loser.value]));
  const record=games.find(game=>game.winner.value===currentHigh&&currentHigh>previousHigh);
  if(record)story(record,'season-high',3,currentHigh.toFixed(2),'Season high','The bar just got fucking raised.');
 }
 const chosen=signals.sort((a,b)=>b.priority-a.priority||Number(b.figure)-Number(a.figure)||String(a.game.winner.uid).localeCompare(String(b.game.winner.uid)))[0];
 if(!chosen)return base;
 const {game,type,figure,figureLabel,headline}=chosen;
 const labels={'revenge':'RIVALRY RECEIPT','season-high':'NEW SEASON HIGH','losing-run':'THE LOSING STREAK','winning-run':'ON A RUN'};
 return {...base,storyKey:`weekly:${report.season}:${report.week}:${type}:${game.winner.uid}`,storySignal:type,
  kicker:`${report.season} · WEEK ${report.week} · ${labels[type]}`,figure,figureLabel,headline,
  subtitle:`${game.winner.name} ${game.winner.value.toFixed(2)} · ${game.loser.name} ${game.loser.value.toFixed(2)}`,
  sides:[game.winner,game.loser].map((side,index)=>({name:side.name,score:side.value.toFixed(2),up:index===0,down:index===1,
   subject:String(side.uid)===chosen.subject,subjectLabel:labels[type]}))};
}
