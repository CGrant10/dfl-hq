import {db} from './supabase.js';
import {currentMember} from './members.js';
import {esc} from './ui.js';
import {teamPortrait} from './team-presentation.js';
import {playerPortrait} from './player-presentation.js';
import {accentOf} from './identity-rules.js';
import {thermalScore,teamRosterTemperature} from './score-temperature.js';
import {mountScoreVfx} from './score-vfx.js';
import {mountPlayerSpotlight} from './player-spotlight.js';
import {playerRows} from './game-day-player-rows.js';
import {animateScoreChanges} from './game-day-score-motion.js';
import {gameDayReel,matchupEntrance,matchupReactionScope,MATCHUP_REACTIONS} from './game-day-experience-model.js';
import {readPageChoice,savePageChoice} from './page-disclosure.js';
import {loadRivalryCalls,rivalryStoryHtml} from './rivalry-story.js';

export function mountGameDayWatch(root,{getModel,getHistory,getMotion,members,onRefresh,onMotion}){
 const dialog=document.createElement('dialog');dialog.className='gameday-watch';dialog.setAttribute('aria-labelledby','gameday-watch-title');
 dialog.innerHTML='<header class="gd-watch-header"><h2 id="gameday-watch-title" tabindex="-1" autofocus>GameDay</h2><button type="button" class="linkbtn" data-watch-close aria-label="Close GameDay watch mode">Close</button></header><div data-watch-content></div>';
 root.append(dialog);
 const content=dialog.querySelector('[data-watch-content]'),heading=dialog.querySelector('h2');
 const vfx=mountScoreVfx(dialog),spotlight=mountPlayerSpotlight(dialog,{getModel,getMotion});
 let stopped=false,gameId='',intro=false,reelIndex=0,timer=null,rows=[],loading=false,saving=false,request=0,restore=null,animations=[],stopScores=()=>{},scopeKey='',reactionMessage='',pointer=null;
 const opened=new Set();let calls=null,callsKey='';
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const motion=()=>getMotion()&&!reduced.matches;
 const selected=()=>getModel()?.games.find(g=>g.id===gameId);
 const cancelAnimations=()=>{animations.forEach(a=>a.cancel());animations=[];stopScores();stopScores=()=>{}};
 const onReduce=()=>{if(!motion())cancelAnimations()};reduced.addEventListener('change',onReduce);
 const setMotion=()=>{dialog.dataset.motion=getMotion()?'on':'off';spotlight.setMotion(getMotion());const button=content.querySelector('[data-watch-motion]');if(button){button.textContent=`Motion ${getMotion()?'on':'off'}`;button.setAttribute('aria-pressed',String(getMotion()))}onReduce()};
 const scope=()=>matchupReactionScope(getModel(),selected());
 const key=()=>JSON.stringify(scope());
 const reactionHtml=()=>`<section class="gd-watch-reactions" aria-label="Matchup reactions"><div role="group" aria-label="React to this matchup">${MATCHUP_REACTIONS.map(([id,label])=>`<button type="button" data-matchup-reaction="${id}" aria-pressed="false" disabled><span>${label}</span><b data-matchup-count>0</b></button>`).join('')}</div><p role="status" data-watch-reaction-status></p></section>`;
 const paintReactions=()=>{
  if(!dialog.open||intro)return;
  const own=currentMember()?.id;
  for(const button of content.querySelectorAll('[data-matchup-reaction]')){
   const id=button.dataset.matchupReaction,matching=rows.filter(r=>r.reaction===id),active=matching.some(r=>String(r.member_id)===String(own)),label=MATCHUP_REACTIONS.find(r=>r[0]===id)[1];
   button.disabled=loading||saving||!scope();button.setAttribute('aria-pressed',String(active));button.setAttribute('aria-label',`${label}: ${matching.length}. ${active?'Remove':'Add'} your reaction.`);button.querySelector('[data-matchup-count]').textContent=String(matching.length);
  }
  const status=content.querySelector('[data-watch-reaction-status]');if(status)status.textContent=reactionMessage||(loading?'Loading reactions…':'');
 };
 const loadReactions=async()=>{
  if(stopped||!dialog.open||intro||loading||saving||document.visibilityState!=='visible')return;
  const s=scope();if(!s)return;const token=++request,k=key();loading=true;paintReactions();
  try{
   const {data,error}=await db().from('gameday_reactions').select('member_id,reaction').match(s).order('member_id').order('reaction').limit(1000);if(error)throw error;
   if(stopped||token!==request||k!==key())return;rows=data||[];reactionMessage='';
  }catch{if(token===request)reactionMessage='Reactions unavailable. Try Refresh.'}
  finally{if(token===request){loading=false;paintReactions()}}
 };
 const schedule=()=>{clearTimeout(timer);if(stopped||!dialog.open)return;timer=setTimeout(()=>{void loadReactions();schedule()},20000)};
 const reelHtml=()=>{
  const slides=gameDayReel(getModel(),getHistory(),members);if(!slides.length)return'';reelIndex=Math.min(reelIndex,slides.length-1);const s=slides[reelIndex];
  return `<section class="gd-watch-reel" role="region" aria-roledescription="carousel" aria-label="League highlight reel"><header><h3>DFL reel</h3><div><button type="button" class="linkbtn" data-reel-step="-1" aria-label="Previous league highlight">←</button><span>${reelIndex+1} / ${slides.length}</span><button type="button" class="linkbtn" data-reel-step="1" aria-label="Next league highlight">→</button></div></header><article aria-live="polite" aria-atomic="true">${s.player?playerPortrait(s.player):teamPortrait({team_name:s.team.name,identity:s.team.identity})}<div><small>${esc(s.kind)}</small><h4>${esc(s.headline)}</h4><p>${esc(s.detail)}</p></div></article></section>`;
 };
 const animateEntrance=()=>{
  if(!motion())return;
  content.querySelectorAll('.gd-entrance-team').forEach((el,i)=>{if(el.animate)animations.push(el.animate([{opacity:0,transform:`translateX(${i?-20:20}px)`},{opacity:1,transform:'translateX(0)'}],{duration:700,delay:i*110,easing:'cubic-bezier(.2,.75,.25,1)',fill:'backwards'}))});
  const versus=content.querySelector('.gd-entrance-vs');if(versus?.animate)animations.push(versus.animate([{opacity:0,transform:'scale(.85)'},{opacity:1,transform:'scale(1)'}],{duration:550,delay:220,fill:'backwards'}));
 };
 const render=()=>{
  cancelAnimations();const model=getModel(),game=selected();if(!model||!game)return;
  const scroll=dialog.scrollTop,focused=document.activeElement,focusPlayer=focused?.dataset?.gamedayPlayer,focusRoster=focused?.dataset?.playerRoster,focusAction=focused?.dataset?.reelStep;
  const focusControl=['data-watch-matchup','data-watch-refresh','data-watch-replay','data-watch-reel','data-watch-motion'].find(attr=>focused?.hasAttribute(attr)),focusBench=focused?.matches('summary')?focused.parentElement?.dataset.watchBench:null;
  const openBench=new Set([...content.querySelectorAll('details[open][data-watch-bench]')].map(d=>d.dataset.watchBench));
  setMotion();dialog.dataset.phase=model.live?'live':model.completed?'final':'pregame';
  heading.textContent=`GameDay · Week ${model.week}`;
  const [a,b]=game.sides;
  dialog.style.setProperty('--watch-left',accentOf(a.identity));dialog.style.setProperty('--watch-right',accentOf(b.identity));
  if(intro){const entrance=matchupEntrance(model,game,getHistory());content.innerHTML=`<section class="gd-watch-entrance" aria-label="Matchup introduction"><small>${model.season} · Week ${model.week}</small><div class="gd-entrance-teams">${game.sides.map((t,i)=>`${i?'<span class="gd-entrance-vs" aria-hidden="true">vs</span>':''}<div class="gd-entrance-team">${teamPortrait({team_name:t.name,identity:t.identity})}<h3>${esc(t.name)}</h3></div>`).join('')}</div><p class="gd-entrance-record">${esc(entrance.record)}</p><p>${esc(entrance.banter)}</p><button type="button" class="btn ghost small" data-watch-start>Enter matchup</button></section>`;animateEntrance();return}
  content.innerHTML=`<div class="gd-watch-toolbar"><label class="sr-only" for="gd-watch-matchup">Choose matchup</label><select id="gd-watch-matchup" data-watch-matchup>${model.games.map(g=>`<option value="${esc(g.id)}"${g.id===gameId?' selected':''}>${esc(g.sides.map(t=>t.name).join(' vs '))}</option>`).join('')}</select><button type="button" class="linkbtn" data-watch-reel>Reel</button><button type="button" class="linkbtn" data-watch-replay>Intro</button><button type="button" class="linkbtn" data-watch-refresh>Refresh</button><button type="button" class="linkbtn" data-watch-motion aria-pressed="${getMotion()}">Motion ${getMotion()?'on':'off'}</button></div><div class="gd-watch-live"><span class="gameday-beacon" aria-hidden="true"></span><span>${model.live?'NFL games live':model.completed?'Final':'GameDay watch'}</span><span data-watch-checked></span></div><section class="gd-watch-scoreboard" aria-label="Matchup scores">${game.sides.map(t=>`<div class="gd-watch-score-team" data-gameday-team="${esc(t.roster)}" style="--faceoff-accent:${esc(accentOf(t.identity))}">${teamPortrait({team_name:t.name,identity:t.identity})}<h3>${esc(t.name)}</h3>${thermalScore(t.score,teamRosterTemperature(t,model.completed),{tag:'strong'})}<small>Actual points</small></div>`).join('<span class="gd-watch-versus" aria-hidden="true">vs</span>')}</section>${reactionHtml()}${rivalryStoryHtml({history:getHistory(),left:{...a,score:a.score},right:{...b,score:b.score},season:model.season,week:model.week,completed:model.completed,calls:(calls||[]).filter(c=>Number(c.matchup_id)===Number(game.id)),members},{callsAvailable:calls!==null})}<div class="gd-watch-rosters">${game.sides.map(t=>`<section aria-label="${esc(t.name)} lineup"><header>${teamPortrait({team_name:t.name,identity:t.identity})}<h3>${esc(t.name)}</h3></header><ul class="gameday-players">${playerRows(t.lineup)}</ul>${t.bench.length?`<details class="gameday-bench" data-watch-bench="${esc(t.roster)}"${openBench.has(t.roster)?' open':''}><summary>Bench · ${t.bench.length}</summary><ul class="gameday-players">${playerRows(t.bench)}</ul></details>`:''}</section>`).join('')}</div>${reelHtml()}`;
  content.querySelector('[data-watch-checked]').textContent=model.checkedAt?new Date(model.checkedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}):'';
  paintReactions();dialog.scrollTop=scroll;
  if(focusPlayer)content.querySelector(`[data-gameday-player="${CSS.escape(focusPlayer)}"][data-player-roster="${CSS.escape(focusRoster)}"]`)?.focus({preventScroll:true});
  if(focusAction)content.querySelector(`[data-reel-step="${focusAction}"]`)?.focus({preventScroll:true});
  if(focusControl)content.querySelector(`[${focusControl}]`)?.focus({preventScroll:true});
  if(focusBench)content.querySelector(`[data-watch-bench="${CSS.escape(focusBench)}"] > summary`)?.focus({preventScroll:true});
 };
 const setGame=(id,showIntro=false)=>{
  const m=getModel(),ck=`${m.season}:${m.week}`;
  if(ck!==callsKey){callsKey=ck;calls=null;void loadRivalryCalls(m.season,m.week).then(result=>{if(!stopped&&callsKey===ck){calls=result;if(dialog.open)render()}}).catch(()=>{})}
  savePageChoice(`watch-matchup-${m.season}-${m.week}`,id);
  request++;loading=false;rows=[];reactionMessage='';gameId=id;reelIndex=0;scopeKey=key();
  const seenKey=`${scopeKey}:intro`;
  try{intro=showIntro||(!opened.has(seenKey)&&sessionStorage.getItem(`dfl.watch.${seenKey}`)!=='1')}catch{intro=showIntro||!opened.has(seenKey)}
  render();if(!intro)void loadReactions();
 };
 const start=()=>{intro=false;const seenKey=`${key()}:intro`;opened.add(seenKey);try{sessionStorage.setItem(`dfl.watch.${seenKey}`,'1')}catch{};render();heading.focus({preventScroll:true});void loadReactions()};
 const react=async button=>{
  if(saving||loading)return;const member=currentMember();if(!member){reactionMessage='Choose your profile to react.';paintReactions();return}
  const s=scope(),k=key();if(!s)return;
  const row={...s,member_id:member.id,reaction:button.dataset.matchupReaction},was=button.getAttribute('aria-pressed')==='true';let saved=false;saving=true;reactionMessage='';paintReactions();
  try{const {data,error}=was?await db().from('gameday_reactions').delete().match(row).select('member_id,reaction'):await db().from('gameday_reactions').insert(row).select('member_id,reaction');if(error&&error.code!=='23505')throw error;if(!error&&!data?.length)throw Error('Reaction refused');saved=true;if(k===key())rows=was?rows.filter(r=>!(String(r.member_id)===String(member.id)&&r.reaction===row.reaction)):[...rows.filter(r=>!(String(r.member_id)===String(member.id)&&r.reaction===row.reaction)),{member_id:member.id,reaction:row.reaction}];}
  catch{if(k===key())reactionMessage='Could not save your reaction. Try again.'}
  finally{saving=false;if(!stopped){paintReactions();if(saved)void loadReactions()}}
 };
 dialog.addEventListener('click',async event=>{
  // The Watch view owns its player spotlight; do not open Home's underneath.
  event.stopPropagation();const target=event.target;
  if(target===dialog||target.closest('[data-watch-close]')){dialog.close();return}
  if(target.closest('[data-watch-start]')){start();return}
  if(target.closest('[data-watch-reel]')){content.querySelector('.gd-watch-reel')?.scrollIntoView({behavior:motion()?'smooth':'instant',block:'start'});content.querySelector('[data-reel-step="1"]')?.focus({preventScroll:true});return}
  if(target.closest('[data-watch-motion]')){onMotion();return}
  if(target.closest('[data-watch-replay]')){intro=true;render();heading.focus({preventScroll:true});return}
  if(target.closest('[data-watch-refresh]')){const button=target.closest('button');button.disabled=true;try{const updated=await onRefresh();await loadReactions();if(updated===false){reactionMessage='Scores unavailable. Last recorded stats stay visible.';paintReactions()}}finally{if(button.isConnected)button.disabled=false}return}
  const step=target.closest('[data-reel-step]');if(step){const slides=gameDayReel(getModel(),getHistory(),members);reelIndex=(reelIndex+Number(step.dataset.reelStep)+slides.length)%slides.length;const reel=content.querySelector('.gd-watch-reel');reel.outerHTML=reelHtml();content.querySelector(`[data-reel-step="${step.dataset.reelStep}"]`)?.focus({preventScroll:true});return}
  const reaction=target.closest('[data-matchup-reaction]');if(reaction)void react(reaction);
 });
 dialog.addEventListener('change',event=>{if(event.target.matches('[data-watch-matchup]')){setGame(event.target.value);heading.focus({preventScroll:true})}});
 dialog.addEventListener('pointerdown',event=>{if(event.target.closest('.gd-watch-reel article'))pointer={id:event.pointerId,x:event.clientX,y:event.clientY}});
 dialog.addEventListener('pointercancel',()=>{pointer=null});
 dialog.addEventListener('keydown',event=>{if(!event.target.closest('.gd-watch-reel')||!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();content.querySelector(`[data-reel-step="${event.key==='ArrowRight'?1:-1}"]`)?.click()});
 dialog.addEventListener('pointerup',event=>{if(!pointer||pointer.id!==event.pointerId)return;const dx=event.clientX-pointer.x,dy=event.clientY-pointer.y;pointer=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.5)content.querySelector(`[data-reel-step="${dx<0?1:-1}"]`)?.click()});
 dialog.addEventListener('close',()=>{cancelAnimations();request++;loading=false;clearTimeout(timer);if(!stopped&&restore?.isConnected)restore.focus({preventScroll:true})});
 return {
  open(){const model=getModel();if(!model?.games.length)return;restore=document.activeElement;const fallback=(model.games.find(g=>g.isMine)||model.games[0]).id;setGame(readPageChoice(`watch-matchup-${model.season}-${model.week}`,model.games.map(g=>g.id),fallback));dialog.showModal();heading.focus({preventScroll:true});paintReactions();if(!intro)void loadReactions();schedule()},
  update(previous){if(!dialog.open||stopped)return;const model=getModel();if(!selected()){setGame((model.games.find(g=>g.isMine)||model.games[0]).id);return}if(key()!==scopeKey){setGame(gameId);return}render();if(!intro)stopScores=animateScoreChanges(content,{previous,model,motion:getMotion(),gameId});spotlight.update()},
  setMotion,
  stop(){stopped=true;request++;clearTimeout(timer);cancelAnimations();reduced.removeEventListener('change',onReduce);spotlight.stop();vfx.stop();dialog.close();dialog.remove()}
 };
}
