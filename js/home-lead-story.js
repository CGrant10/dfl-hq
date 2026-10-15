import {headToHead} from './home-slides.js';
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
