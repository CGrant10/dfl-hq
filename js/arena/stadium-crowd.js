import {esc} from '../ui.js';
import {animateUi,cancelUiMotion} from '../ui-motion.js';
import {stadiumReadyState,stadiumCrowdRun,stadiumCrowdReaction} from './stadium-crowd-model.js';
import {createStadiumFeedback} from './stadium-feedback.js';

// Readiness is opt-in, temporary Presence. Reactions are anonymous Broadcast
// decoration. Neither is consulted by commissioner commands or the race engine.
export function mountStadiumCrowd(root,{channel,key,getSnapshot,getRacers,getMember,motion=()=>true}){
 const bar=root.querySelector('[data-stadium-crowd]'),staging=root.querySelector('[data-stadium-staging]'),surface=root.querySelector('.sr-watch-surface');
 let stopped=false,connected=false,ready=false,revision='',field='',memberId='',lastSend=-Infinity,busy=false,received=[],sound=false,soundBusy=false,cooldown=0;
 const feedback=createStadiumFeedback();
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const seen=new Set(),pops=new Map();
 bar.innerHTML='<summary>Crowd</summary><div class="sr-crowd-controls"><label class="sr-only" for="sr-cheer-racer">Cheer or heckle a racer</label><select id="sr-cheer-racer" data-crowd-racer></select><button type="button" data-crowd-call="cheer">Cheer</button><button type="button" data-crowd-call="heckle">Heckle</button><button type="button" data-crowd-ready aria-pressed="false" hidden>I’m ready</button><button type="button" data-race-sound aria-pressed="false">Sound off</button><span class="sr-only" data-crowd-status role="status"></span></div>';
 const status=bar.querySelector('[data-crowd-status]'),select=bar.querySelector('select');
 const clear=()=>{for(const [node,timer] of pops){clearTimeout(timer);cancelUiMotion(node);node.remove()}pops.clear()};
 const publish=async()=>{
  if(!connected||stopped)return;
  const snapshot=getSnapshot(),member=String(getMember()?.id||''),isRacer=getRacers().some(r=>r.id===member);
  try{const result=await channel.track({key,...ready&&isRacer&&snapshot.event.bc_state==='idle'?{racer:member,readyFor:String(snapshot.event.race_revision)}:{}});if(result!=='ok'&&result!==undefined)throw Error();}
  catch{if(!stopped){ready=false;status.textContent='Ready status could not sync. Try again.';paint()}}
 };
 const sync=()=>{
  if(stopped)return;
  const snapshot=getSnapshot(),state=connected?stadiumReadyState(channel.presenceState(),getRacers(),snapshot.event.race_revision):{watching:0,ready:[]};
  const presence=root.querySelector('[data-presence]');presence.textContent=connected?`${state.watching} watching`:'Reconnecting…';presence.hidden=false;
  root.querySelectorAll('[data-ready-racer]').forEach(node=>{const done=state.ready.includes(node.dataset.readyRacer);node.hidden=getSnapshot().event.bc_state!=='idle';node.dataset.ready=String(done);node.querySelector('small').textContent=done?'Ready ✓':'Waiting'});
  const count=staging.querySelector('[data-ready-count]');if(count)count.textContent=connected?`${state.ready.length} / ${getRacers().length} ready`:'Connecting…';
 };
 const paint=()=>{
  if(stopped)return;
  const snapshot=getSnapshot(),racers=getRacers(),member=String(getMember()?.id||''),idle=snapshot.event.bc_state==='idle';
  const nextRevision=String(snapshot.event.race_revision),nextField=racers.map(r=>r.id+':'+r.name).join('|');
  if(memberId!==member){memberId=member;if(ready){ready=false;void publish()}}
  if(revision!==nextRevision){revision=nextRevision;if(ready){ready=false;void publish()}clear();seen.clear()}
  if(field!==nextField){field=nextField;const selected=select.value;select.innerHTML=racers.map(r=>`<option value="${esc(r.id)}">${esc(r.name)}</option>`).join('');select.value=racers.some(r=>r.id===selected)?selected:racers.some(r=>r.id===member)?member:racers[0]?.id||'';
   staging.innerHTML='<header><span data-ready-count></span></header><button type="button" data-crowd-ready aria-pressed="false" hidden>I’m ready</button>';
  }
  staging.hidden=!idle;const showReady=idle&&racers.some(r=>r.id===member);
  for(const button of root.querySelectorAll('[data-crowd-ready]')){button.hidden=!showReady;button.disabled=!connected||busy;button.setAttribute('aria-pressed',String(ready));button.textContent=ready?'Ready ✓':'I’m ready'}
  select.disabled=!connected;
  root.querySelectorAll('[data-crowd-call]').forEach(button=>button.disabled=!connected||busy||performance.now()-lastSend<1800);
  sync();
 };
 const receive=({payload})=>{
  if(stopped||document.hidden)return;
  const value=stadiumCrowdReaction(payload,{run:stadiumCrowdRun(getSnapshot()),racers:getRacers()});if(!value||seen.has(value.id))return;
  const now=performance.now();received=received.filter(at=>now-at<5000);if(received.length>=5)return;received.push(now);seen.add(value.id);if(seen.size>80)seen.delete(seen.values().next().value);
  while(pops.size>=2){const [node,timer]=pops.entries().next().value;clearTimeout(timer);cancelUiMotion(node);node.remove();pops.delete(node)}
  const node=document.createElement('span');node.className='sr-crowd-pop';node.setAttribute('aria-hidden','true');node.textContent=`${getRacers().find(r=>r.id===value.racer).name} · ${value.call}`;surface.append(node);
  animateUi(node,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'translateY(0)'}],{motion:motion(),duration:220});
  pops.set(node,setTimeout(()=>{cancelUiMotion(node);node.remove();pops.delete(node)},1800));
 };
 const click=async event=>{
  const button=event.target.closest('[data-crowd-call],[data-crowd-ready],[data-race-sound]');if(!button||!root.contains(button)||stopped)return;
  if(button.hasAttribute('data-race-sound')){if(soundBusy)return;soundBusy=true;button.disabled=true;sound=await feedback.enable(!sound);soundBusy=false;if(stopped)return;button.disabled=false;button.textContent=sound?'Sound on':'Sound off';button.setAttribute('aria-pressed',String(sound));if(sound)feedback.cue('countdown');else status.textContent='Sound off.';return}
  if(!connected||busy)return;
  if(button.hasAttribute('data-crowd-ready')){
   ready=!ready;busy=true;paint();await publish();if(stopped)return;busy=false;paint();return;
  }
  if(performance.now()-lastSend<1800)return;
  lastSend=performance.now();clearTimeout(cooldown);cooldown=setTimeout(()=>{cooldown=0;paint()},1800);busy=true;paint();
  const payload={v:1,id:crypto.randomUUID(),run:stadiumCrowdRun(getSnapshot()),racer:select.value,kind:button.dataset.crowdCall,at:Date.now()};
  try{const result=await channel.send({type:'broadcast',event:'stadium-cheer',payload});if(result!=='ok')throw Error();if(!stopped){receive({payload});status.textContent=`${button.textContent} sent.`;if(motion())try{navigator.vibrate?.(12)}catch{}}}
  catch{lastSend=-Infinity;if(!stopped)status.textContent='Reaction could not send. Try again.'}
  finally{if(!stopped){busy=false;paint()}}
 };
 const visibility=()=>{clear();if(!document.hidden){sync();if(sound)void feedback.enable(true)}};
 root.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);window.addEventListener('dfl:ui-motion-change',clear);reduced.addEventListener('change',clear);
 channel.on('presence',{event:'sync'},sync).on('broadcast',{event:'stadium-cheer'},receive);
 paint();
 return {update:paint,cue:kind=>feedback.cue(kind),quiet:()=>feedback.quiet(),motionChanged(){if(!motion())clear()},connection(statusValue){if(stopped)return;const next=statusValue==='SUBSCRIBED';if(connected===next&&next)return;connected=next;if(!next){clear();ready=false}else void publish();paint()},stop(){if(stopped)return;stopped=true;clearTimeout(cooldown);feedback.stop();clear();seen.clear();root.removeEventListener('click',click);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('dfl:ui-motion-change',clear);reduced.removeEventListener('change',clear)}};
}
