import {esc} from './ui.js';
import {readPageChoice,savePageChoice} from './page-disclosure.js';

const finite=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value));
const validWeek=value=>Number.isInteger(Number(value))&&Number(value)>0&&Number(value)<=18;

/** NFL events, rather than the weekday or a single team's finish, set Home's priority. */
export function homeWeekPhase({model=null,leagueState=null,openingNfl=null,openingWeek=null}={},now=Date.now()){
 if(!model)return {key:'unknown',order:['plan','live','recap'],week:null,season:null};
 const advanced=Number(leagueState?.season)===Number(model.season)&&validWeek(leagueState?.currentWeek)&&Number(leagueState.currentWeek)>Number(model.week);
 const week=advanced?Number(leagueState.currentWeek):Number(model.week),season=Number(model.season);
 const freshSchedule=Number(openingWeek)===week&&Array.isArray(openingNfl?.payload?.events)?openingNfl.payload.events:null;
 const events=freshSchedule?freshSchedule.map(event=>({state:event.status?.type?.completed||event.status?.type?.state==='post'?'final':event.status?.type?.state==='in'?'live':event.status?.type?.state==='pre'?'upcoming':'unknown',kickoff:Date.parse(event.date)})):advanced?[]:model.events||[];
 let key='unknown';
 if(!advanced&&model.completed)key='final';
 else if(events.some(event=>event.state==='live')||!advanced&&model.live)key='live';
 else if(events.length&&events.every(event=>event.state==='final'))key='settling';
 else if(events.some(event=>event.state==='final'||finite(event.kickoff)&&Number(event.kickoff)<=now))key='between';
 else if(events.length&&events.every(event=>event.state==='upcoming'&&finite(event.kickoff)&&Number(event.kickoff)>now))key='pregame';
 return {key,week,season,order:key==='final'?['recap','live','plan']:['live','between','settling'].includes(key)?['live','plan','recap']:['plan','live','recap']};
}

/** Close actual matchups beyond the member's scoreboard; forecasts never enter this list. */
export function homeLeagueRace(model){
 if(!model||model.completed)return '';
 const games=(model.games||[]).filter(game=>!game.isMine&&game.sides?.length===2
   &&game.sides.every(team=>finite(team.score))
   &&game.sides.some(team=>(team.starters||[]).some(player=>['live','final'].includes(player.state)))
   &&game.sides.some(team=>(team.starters||[]).some(player=>!player.empty&&player.state!=='final')))
  .sort((a,b)=>Math.abs(Number(a.sides[0].score)-Number(a.sides[1].score))-Math.abs(Number(b.sides[0].score)-Number(b.sides[1].score))||String(a.id).localeCompare(String(b.id))).slice(0,3);
 if(!games.length)return '';
 const href=game=>'#/clubhouse?season='+encodeURIComponent(model.season)+'&amp;week='+encodeURIComponent(model.week)+'&amp;tab=matchups&amp;matchup='+encodeURIComponent(game.id);
 return '<section class="home-league-race" aria-label="Close league matchups"><header><h2 class="section-title">Around the league</h2></header><ol>'+games.map(game=>'<li><a href="'+href(game)+'">'+game.sides.map(team=>'<span><strong>'+esc(team.name)+'</strong><b>'+Number(team.score).toFixed(2)+'</b></span>').join('')+'<small>'+esc(game.sides.some(team=>(team.starters||[]).some(player=>player.state==='live'))?'Live':'In progress')+' · '+Math.abs(Number(game.sides[0].score)-Number(game.sides[1].score)).toFixed(2)+'-point gap</small></a></li>').join('')+'</ol></section>';
}

/** A small completed-week entry, with the full report and sharing kept in Clubhouse. */
export function homeWeekReceipt({model=null,report=null}={}){
 let games=[],season=null,week=null;
 const current=model?.completed&&(model.games||[]).length&&model.games.every(game=>game.sides?.length===2&&game.sides.every(team=>finite(team.score)));
 if(current&&(!report?.final||Number(model.season)>Number(report.season)||Number(model.season)===Number(report.season)&&Number(model.week)>=Number(report.week))){
  season=model.season;week=model.week;
  games=model.games.map(game=>({sides:game.sides.map(team=>({name:team.name,score:Number(team.score)}))}));
 }else if(report?.final){
  season=report.season;week=report.week;
  games=(report.games||[]).filter(game=>finite(game.winner?.value)&&finite(game.loser?.value)).map(game=>({sides:[{name:game.winner.name,score:Number(game.winner.value)},{name:game.loser.name,score:Number(game.loser.value)}]}));
 }
 if(!games.length||!validWeek(week)||!Number.isFinite(Number(season)))return '';
 const ranked=games.flatMap(game=>game.sides).sort((a,b)=>b.score-a.score||String(a.name).localeCompare(String(b.name)));
 const tied=ranked.filter(team=>team.score===ranked[0].score).length>1;
 const closest=[...games].sort((a,b)=>Math.abs(a.sides[0].score-a.sides[1].score)-Math.abs(b.sides[0].score-b.sides[1].score))[0];
 const margin=Math.abs(closest.sides[0].score-closest.sides[1].score);
 const href='#/clubhouse?season='+encodeURIComponent(season)+'&amp;week='+encodeURIComponent(week)+'&amp;tab=recap';
 return '<section class="home-week-receipt" aria-label="Week '+esc(week)+' final receipts"><header><h2 class="section-title">Week '+esc(week)+' receipts</h2><span>Final</span></header><div class="home-receipt-leader"><div><small>'+(tied?'Joint high score':'League high score')+'</small><h3>'+esc(ranked[0].name)+'</h3></div><b>'+ranked[0].score.toFixed(2)+'</b></div><p class="home-receipt-roast">'+(tied?'Same points. Twice the fucking noise.':'The rest of you can shut the fuck up until waivers.')+'</p><a class="home-receipt-close" href="'+href+'"><small>'+(margin===0?'Dead even':'Closest finish · '+margin.toFixed(2)+' points')+'</small><strong>'+esc(closest.sides.map(team=>team.name).join(' vs '))+'</strong></a><a class="home-text-action" href="'+href+'">Recap &amp; share <svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></section>';
}

/** Move existing sections only when they are below the viewport or Home is at the top. */
export function mountHomeWeekFlow(root,{win=window,doc=document}={}){
 const host=root?.querySelector('[data-home-week-flow]');
 if(!host)return {update(){},stop(){}};
 const plan=host.querySelector('[data-home-week-part="plan"]');
 // This controller owns phase-specific choices, as the live disclosure already does.
 if(plan)plan.dataset.pageDetailWired='1';
 let pending=null,applied='',stopped=false,frame=null,key='',last=!!plan?.open,loadingChoice=null;
 const toggle=()=>{if(!plan||plan.open===last)return;last=plan.open;if(key)savePageChoice(key,last?'open':'closed');else loadingChoice=last};
 plan?.addEventListener('toggle',toggle);
 const apply=()=>{
  frame=null;if(stopped||!pending||!host.isConnected)return;
  const focused=doc.activeElement;
  if(host.contains(focused)&&focused!==doc.body)return;
  const rect=host.getBoundingClientRect();
  if(win.scrollY>24&&rect.top<win.innerHeight+24)return;
  const phase=pending,identity=phase.season+'.'+phase.week+'.'+phase.key;
  if(identity===applied)return;
  const children=phase.order.map(name=>host.querySelector('[data-home-week-part="'+name+'"]')).filter(Boolean);
  // Avoid disconnecting live nodes/listeners when the order is already correct.
  children.forEach((node,index)=>{if(host.children[index]!==node)host.insertBefore(node,host.children[index]||null)});
  root.dataset.homeWeekPhase=phase.key;
  const title=plan?.querySelector('summary strong');if(title)title.textContent=phase.key==='pregame'?'Plan your week':'Weekly outlook';
  if(plan&&phase.week){
   key='home-week.'+phase.season+'.'+phase.week+'.'+(['live','between','settling'].includes(phase.key)?'started':phase.key);
   const fallback=loadingChoice??(phase.key==='pregame');
   last=readPageChoice(key,['open','closed'],readPageChoice('home-week',['open','closed'],fallback?'open':'closed'))==='open';
   plan.open=last;loadingChoice=null;
  }
  applied=identity;
 };
 const schedule=()=>{if(frame===null&&!stopped)frame=win.requestAnimationFrame(apply)};
 win.addEventListener('scroll',schedule,{passive:true});host.addEventListener('focusout',schedule);
 return {update(edition){pending=homeWeekPhase(edition);schedule()},stop(){stopped=true;if(frame!==null)win.cancelAnimationFrame(frame);win.removeEventListener('scroll',schedule);host.removeEventListener('focusout',schedule);plan?.removeEventListener('toggle',toggle)}};
}
