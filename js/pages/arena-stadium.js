import {animateUi} from '../ui-motion.js';
import {mountStadiumCrowd} from '../arena/stadium-crowd.js';
import {db} from '../supabase.js';
import {esc,toast,loading,errorBox} from '../ui.js';
import {loadMemberDirectory,currentMember} from '../members.js';
import {canEdit} from '../inline.js';
import {ensureStylesheet} from '../lazy-css.js';
import {getReduceRaceMotion,setReduceRaceMotion} from '../store.js';
import {loadStadiumRace,commandStadiumRace,removeStadiumRace,createStadiumClock} from '../arena/stadium-data.js';
import {buildStadiumRace,stadiumFrame,stadiumElapsed,stadiumMoment,STADIUM_ENGINE} from '../arena/stadium-model.js';
import {createStadiumRenderer,stadiumColor} from '../arena/stadium-renderer.js';
import {normalizeKit,footballSpot,finishMargin,kitInk} from '../arena/racer-kit-model.js';
import {drawCharacterRunner as drawKitRunner} from '../arena/racer-character-art.js';
import {defaultRacerKit} from '../arena/racer-character.js';
import {mountStadiumOrientation} from '../arena/stadium-orientation.js';
import {mountStadiumRacerRoster} from '../arena/stadium-racer-roster.js';

let active=null;
export function leave(){active?.stop();active=null;}
const safePhoto=value=>{if(!String(value||'').trim())return '';try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const initials=name=>String(name||'DFL').split(/\s+/).map(p=>p[0]).slice(0,2).join('');
const portrait=r=>{const photo=safePhoto(r.photo);return `<span class="sr-avatar" data-initials="${esc(initials(r.name))}" style="--racer:${stadiumColor(r,r.index||0)}">${photo?`<img src="${esc(photo)}" alt="" loading="lazy" decoding="async">`:esc(initials(r.name))}</span>`;};
const jersey=r=>`<span class="sr-jersey" aria-label="Racer ${r.raceNumber}" style="--jersey:${stadiumColor(r,r.index)};--jersey-ink:${kitInk(stadiumColor(r,r.index))}">${r.raceNumber}</span>`;
const seconds=ms=>`${Math.floor(Math.max(0,ms)/60000)}:${String(Math.floor(Math.max(0,ms)/1000)%60).padStart(2,'0')}`;
const eventDuration=e=>e.race_engine===STADIUM_ENGINE?Number(e.race_duration_ms):Math.max(15000,Math.min(600000,Number(e.length_ticks||1500)*40));
const motion=()=>!getReduceRaceMotion()&&document.documentElement.dataset.uiMotion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const stateName=e=>e.bc_state==='running'?'Live':e.bc_state==='paused'?'Paused':e.bc_state==='finished'||e.status==='complete'?'Final':'On deck';
const setText=(element,value)=>{if(element.textContent!==String(value))element.textContent=String(value);};
function wireMyRacer(root,life,onSave,initialKit=()=>null){const button=root.querySelector('[data-my-racer]');if(!button)return;button.onclick=async()=>{
 button.disabled=true;try{const {openRacerEditor}=await import('../arena/racer-kit-editor.js');if(life.closed)return;const close=await openRacerEditor({motion,onSave,initialKit:initialKit(),opener:button});if(life.closed)close();else life.cleanup.push(close);}catch(error){toast(error.message||'Racer editor unavailable.');}finally{button.disabled=false;}
};}

export async function render(view){
 leave();const life={closed:false,cleanup:[],stop(){this.closed=true;for(const fn of this.cleanup.splice(0))fn();}};active=life;
 const failedPhoto=e=>{const avatar=e.target.closest?.('.sr-avatar');if(avatar&&e.target.tagName==='IMG')avatar.textContent=avatar.dataset.initials;};
 view.addEventListener('error',failedPhoto,true);life.cleanup.push(()=>view.removeEventListener('error',failedPhoto,true));
 view.innerHTML=loading();
 try{
  const [members]=await Promise.all([loadMemberDirectory(),ensureStylesheet('./css/stadium-arena.css')]);if(life.closed)return;
  const id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
  if(id)await room(view,members,id,life);else await lobby(view,members,life);
 }catch(error){if(!life.closed)view.innerHTML=errorBox(error.message||'Arena unavailable.');}
}

function editorMarkup(members,{event=null,selected=[],paused=false}={}){
 const picked=new Set(selected.map(String)),duration=event?eventDuration(event)/1000:60;
 members=members.filter(m=>m.active===true||picked.has(String(m.id)));
 return `<form class="sr-editor"><div class="sr-editor-head"><h2>${event?'Edit race':'New race'}</h2><button type="button" data-cancel aria-label="Close race editor">×</button></div><div class="sr-editor-body">
 <label>Race name<input name="name" maxlength="80" required value="${esc(event?.name||'DFL Stadium Dash')}"></label>
 <div class="sr-duration-presets" aria-label="Race duration">${[30,60,90,120,180].map(n=>`<button type="button" data-duration="${n}" aria-pressed="${n===duration}">${n<60?`${n}s`:`${n/60}m`}</button>`).join('')}</div>
 <details class="sr-custom-duration" ${[30,60,90,120,180].includes(duration)?'':'open'}><summary>Custom duration</summary><label>Seconds<input name="duration" type="number" min="15" max="600" step="1" required value="${duration}" inputmode="numeric"></label></details>
 <div class="sr-pick-head"><h3>Racers <span data-picked>${picked.size}</span></h3>${paused?'':'<button type="button" data-all>Select all</button>'}</div>
 ${paused?'':`<label class="sr-search"><span class="sr-only">Find a racer</span><input name="search" type="search" placeholder="Find a racer" autocomplete="off"></label>`}
 <div class="sr-member-picks">${members.filter(m=>!paused||picked.has(String(m.id))).map((m,index)=>`<label class="sr-member-pick"><input type="checkbox" name="racer" value="${esc(m.id)}" ${picked.has(String(m.id))?'checked':''} ${paused?'disabled':''}>${portrait({photo:m.profile_image,name:m.display_name,index})}<span>${esc(m.display_name)}<small>${esc(m.team_name||'')}</small></span></label>`).join('')}</div>
 </div><div class="sr-editor-save"><p class="sr-form-error" role="alert" hidden></p><button class="sr-primary" type="submit">${event?'Save race':'Create race'}</button></div></form>`;
}

function wireEditor(host,members,{event=null,selected=[],onSave,onCancel}={}){
 host.innerHTML=editorMarkup(members,{event,selected,paused:event?.bc_state==='paused'});
 const form=host.querySelector('form'),checks=[...form.querySelectorAll('[name=racer]')],duration=form.elements.namedItem('duration');
 const count=()=>{const picked=checks.filter(c=>c.checked).length;form.querySelector('[data-picked]').textContent=String(picked);if(picked>=2&&picked<=32){const error=form.querySelector('.sr-form-error');error.hidden=true;error.textContent='';}};
 const presets=()=>form.querySelectorAll('[data-duration]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.duration)===Number(duration.value))));
 form.querySelector('[data-cancel]').onclick=onCancel;
 form.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{duration.value=b.dataset.duration;presets();});duration.oninput=presets;
 form.addEventListener('invalid',()=>{form.querySelector('.sr-custom-duration').open=true;},true);
 checks.forEach(c=>c.onchange=count);
 const all=form.querySelector('[data-all]');if(all)all.onclick=()=>{const select=!checks.every(c=>c.checked);checks.forEach((c,i)=>c.checked=select&&i<32);count();};
 const search=form.elements.namedItem('search');if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();checks.forEach(c=>c.closest('label').hidden=!c.closest('label').textContent.toLowerCase().includes(q));};
 form.onsubmit=async e=>{
  e.preventDefault();const ids=checks.filter(c=>c.checked).map(c=>Number(c.value)),error=form.querySelector('[role=alert]'),submit=form.querySelector('[type=submit]');
  if(submit.disabled)return;
  error.hidden=true;if(ids.length<2||ids.length>32){error.textContent='Choose 2–32 racers.';error.hidden=false;return;}
  const label=submit.textContent;submit.disabled=true;submit.textContent=event?'Saving…':'Creating…';form.setAttribute('aria-busy','true');try{await onSave({name:form.elements.namedItem('name').value.trim(),duration:Number(duration.value),memberIds:ids});}catch(err){error.textContent=err.message||'Race could not be saved.';error.hidden=false;}finally{submit.disabled=false;submit.textContent=label;form.removeAttribute('aria-busy');}
 };
 const heading=form.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
 host.scrollIntoView({behavior:motion()?'smooth':'instant',block:'start'});
}

async function lobby(view,members,life){
 const {data:events,error}=await db().from('arena_events').select('id,name,bc_state,status,race_engine,race_duration_ms,length_ticks,race_revision,created_at').order('created_at',{ascending:false}).limit(60);if(error)throw error;if(life.closed)return;
 const ready=(events||[]).filter(e=>e.bc_state!=='finished'&&e.status!=='complete'),history=(events||[]).filter(e=>!ready.includes(e));
 view.innerHTML=`<section class="stadium-arena sr-lobby"><header class="sr-title"><div><span class="sr-kicker">THE DFL</span><h1>Arena</h1></div><div class="sr-lobby-actions">${currentMember()?'<button data-my-racer>My racer</button>':''}${canEdit('arena_events')?'<button class="sr-primary" data-new>New race</button>':''}</div></header><div class="sr-editor-host" hidden></div>
 <div class="sr-lobby-art"><span>SETTLE IT<br>ON THE FIELD.</span><b>DFL STADIUM DASH</b></div>
 <h2>On the starting line</h2><div class="sr-event-list">${ready.length?ready.map(e=>`<a class="sr-event" href="#/arena?id=${esc(e.id)}"><span class="sr-state" data-state="${esc(e.bc_state)}">${stateName(e)}</span><strong>${esc(e.name)}</strong><span>${seconds(eventDuration(e))} <b aria-hidden="true">↗</b></span></a>`).join(''):'<div class="sr-empty">No races on deck.</div>'}</div>
 ${history.length?`<section class="sr-history"><h2>Official results</h2><div class="sr-event-list">${history.map(e=>`<div class="sr-history-row" data-past-race="${esc(e.id)}"><a class="sr-event" href="#/${e.race_engine===STADIUM_ENGINE?'arena':'arena-results'}?id=${esc(e.id)}"><strong>${esc(e.name)}</strong><span>Final <b aria-hidden="true">↗</b></span></a>${canEdit('arena_events')?`<button type="button" data-remove-race="${esc(e.id)}" aria-label="Remove ${esc(e.name)}">Remove</button>`:''}<div class="sr-remove-confirm" hidden></div></div>`).join('')}</div></section>`:''}</section>`;
 view.querySelectorAll('[data-remove-race]').forEach(button=>button.onclick=()=>{
  const event=history.find(e=>String(e.id)===button.dataset.removeRace),row=button.closest('.sr-history-row'),confirm=row.querySelector('.sr-remove-confirm');
  confirm.hidden=false;confirm.innerHTML=`<strong>Remove “${esc(event.name)}” and its results?</strong><button type="button" class="sr-primary" data-confirm-remove>Remove race</button><button type="button" data-cancel-remove>Keep race</button><span role="alert" hidden></span>`;
  const cancel=confirm.querySelector('[data-cancel-remove]'),submit=confirm.querySelector('[data-confirm-remove]');submit.focus({preventScroll:true});
  cancel.onclick=()=>{confirm.hidden=true;confirm.replaceChildren();button.focus({preventScroll:true});};
  submit.onclick=async()=>{submit.disabled=cancel.disabled=button.disabled=true;try{await removeStadiumRace(event);if(life.closed)return;const next=row.nextElementSibling?.querySelector('a')||row.previousElementSibling?.querySelector('a')||view.querySelector('[data-new]')||view.querySelector('.sr-lobby h1');row.remove();if(!view.querySelector('.sr-history-row'))view.querySelector('.sr-history')?.remove();if(next){if(!next.matches('a,button'))next.tabIndex=-1;next.focus({preventScroll:true});}toast('Race removed.');}catch(error){if(life.closed)return;const alert=confirm.querySelector('[role=alert]');alert.hidden=false;alert.textContent=error.code==='40001'?'Race changed. Reopen Arena and try again.':error.message||'Race could not be removed.';}finally{if(!life.closed)submit.disabled=cancel.disabled=button.disabled=false;}};
 });
 const newButton=view.querySelector('[data-new]');if(newButton)newButton.onclick=()=>{
  const host=view.querySelector('.sr-editor-host');host.hidden=false;
  wireEditor(host,members,{onCancel:()=>{host.hidden=true;newButton.focus({preventScroll:true});},onSave:async values=>{const snapshot=await commandStadiumRace(null,'create',values);if(!life.closed)location.hash=`#/arena?id=${snapshot.event.id}`;}});
 };
 wireMyRacer(view,life,()=>{});
}

async function room(view,members,id,life){
 const clock=createStadiumClock();let snapshot=null,racers=[],race=null,renderer=null,channel=null,poll=0,raf=0,inflight=null,busy=false,lastDOM=0,lastKey='',finishAt=null,replayAt=null,replayFinished=false,stageVisible=true,highlightId=null,crowd=null,replayFrom=0,replayRate=1,replayUntil=0,replayKind='full',lastCue='';
 const sent=performance.now();snapshot=await loadStadiumRace(id);clock.sync(snapshot.server_ms,sent);if(life.closed)return;
 // Only untouched legacy setup can be upgraded. Its historical/live renderer stays intact.
 if(snapshot.event.race_engine!==STADIUM_ENGINE&&!(snapshot.event.bc_state==='idle'&&snapshot.event.status!=='complete'&&!snapshot.results.length)){
  const legacy=(snapshot.event.bc_state==='finished'||snapshot.event.status==='complete')?await import('./arena-results.js'):await import('./broadcast.js');if(life.closed)return;life.cleanup.push(()=>legacy.leave?.());await legacy.render(view);return;
 }
 const memberMap=new Map(members.map(m=>[String(m.id),m]));
 const root=document.createElement('section');root.className='stadium-arena sr-room';
 root.innerHTML=`<header class="sr-title sr-room-title"><a class="sr-back" href="#/arena">← Arena</a><h1 data-name></h1><span class="sr-state" data-state-label></span></header>
 <div class="sr-room-meta"><span data-racer-count></span><span data-duration-label></span><span data-presence hidden></span><span class="sr-connection" role="status" hidden></span></div>
 <div class="sr-stage"><div class="sr-watch-toolbar sr-stage-score"><div class="sr-watch-clock"><span data-clock>0:00</span></div><div class="sr-watch-identity"><span data-highlight-number aria-hidden="true"></span><div aria-hidden="true"><strong data-highlight-name></strong><small data-field-spot></small></div><select data-racer-highlight aria-label="Highlight racer"></select></div><button type="button" data-expand aria-label="Expand race"><span aria-hidden="true">⛶</span><b data-expand-label>Watch</b></button></div><div class="sr-watch-body"><div class="sr-watch-surface"><canvas role="img" aria-label="Live football stadium race"></canvas><div class="sr-stage-overlay" aria-live="polite"><div class="sr-start-lights" aria-hidden="true"><i></i><i></i><i></i></div><strong data-overlay></strong><span data-overlay-name></span></div></div><div class="sr-watch-roster" role="group" aria-label="Racer numbers"></div></div><div class="sr-race-footer"><canvas class="sr-winner-art" width="128" height="160" aria-hidden="true" hidden></canvas><div class="sr-moment" aria-live="polite"><span data-moment-title></span><strong data-moment-name></strong></div><details class="sr-crowd-menu" data-stadium-crowd></details></div><div class="sr-finish-tools" hidden><button type="button" data-show-podium>Podium</button><button type="button" data-replay>Replay race</button><button type="button" data-photo-finish hidden>Photo finish</button><button type="button" data-stop-replay hidden>Back to result</button></div><div class="sr-controls" aria-label="Commissioner race controls"></div></div>
 <div class="sr-tools">${currentMember()?'<button type="button" data-my-racer>My racer</button>':''}<button type="button" data-motion aria-pressed="true">Motion on</button><button type="button" data-share>Copy watch link</button></div>
 <div class="sr-editor-host" hidden></div><div class="sr-final" hidden aria-live="polite"></div>
 <div class="sr-board-head"><h2 data-board-title>Starting grid</h2><span data-board-status></span></div><section class="sr-staging" data-stadium-staging hidden></section><ol class="sr-board" aria-label="Race positions"></ol></section>`;
 view.replaceChildren(root);
 const q=s=>root.querySelector(s),stage=q('.sr-stage'),board=q('.sr-board'),host=q('.sr-editor-host');
 const roster=mountStadiumRacerRoster(q('.sr-watch-roster'),{onHighlight:id=>{highlightId=id;lastDOM=0;draw(performance.now(),{forceStage:true});}});life.cleanup.push(()=>roster.stop());
 const stageWatch=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;if(stageVisible)draw(performance.now());},{rootMargin:'100px'}):null;
 stageWatch?.observe(stage);life.cleanup.push(()=>stageWatch?.disconnect());
 const orientation=mountStadiumOrientation(stage,{autoExpand:()=>!snapshot.can_control,onChange:()=>{lastDOM=0;draw(performance.now());schedule();}});life.cleanup.push(()=>orientation.stop());
 const visible=()=>!document.hidden&&!life.closed;
 const showConnection=message=>{const el=q('.sr-connection');el.textContent=message;el.hidden=!message;};
 const setMotion=()=>{crowd?.motionChanged();root.dataset.motion=motion()?'on':'off';q('[data-motion]').textContent=`Motion ${motion()?'on':'off'}`;q('[data-motion]').setAttribute('aria-pressed',String(motion()));if(!motion())root.getAnimations({subtree:true}).forEach(animation=>animation.cancel());if(!raf)draw(performance.now());};
 const configureRacers=()=>{
  const kits=new Map((snapshot.racer_kits||[]).map(k=>[String(k.member_id),k.kit]));
  const next=snapshot.participants.map((p,index)=>{const m=memberMap.get(String(p.member_id)),number=p.number??index+1,kit=normalizeKit(kits.get(String(p.member_id))||defaultRacerKit(p.member_id,{jersey:p.color||m?.accent_color,number}),{number});return {id:String(p.member_id),name:m?.display_name||`Racer ${p.number||index+1}`,team:m?.team_name||'',photo:m?.profile_image||'',number:kit.number,raceNumber:index+1,kit,color:kit.jersey,index};});
  const signature=JSON.stringify(next);if(signature!==JSON.stringify(racers)){
   const sameField=racers.length===next.length&&racers.every((r,i)=>r.id===next[i].id);racers=next;
   if(renderer&&sameField)renderer.updateRacers(racers);else{renderer?.stop();renderer=createStadiumRenderer(q('canvas'),{racers,motion,highlight:()=>highlightId,onLayout:({overview,top,fieldHeight,fieldWidth})=>{stage.dataset.fieldOverview=String(overview);stage.style.setProperty('--sr-field-top',`${top}px`);stage.style.setProperty('--sr-field-height',`${fieldHeight}px`);stage.style.setProperty('--sr-field-width',`${fieldWidth}px`);}});}
   board.innerHTML=racers.map(r=>`<li class="sr-position" data-racer-id="${esc(r.id)}"><button class="sr-follow-row" type="button" aria-describedby="sr-ready-${esc(r.id)}" data-highlight-racer="${esc(r.id)}" aria-pressed="false"><span class="sr-rank">${r.index+1}</span><span class="sr-racer-mark">${portrait(r)}${jersey(r)}</span><span class="sr-racer-name">${esc(r.name)}<small>${esc(r.team)}</small></span><span class="sr-gap">On deck</span><span class="sr-ready-status" id="sr-ready-${esc(r.id)}" data-ready-racer="${esc(r.id)}" hidden><small>Waiting</small></span></button></li>`).join('');
   delete board.dataset.order;
   board.querySelectorAll('[data-highlight-racer]').forEach(b=>b.onclick=()=>{highlightId=b.dataset.highlightRacer;lastDOM=0;draw(performance.now(),{forceStage:true});stage.scrollIntoView({behavior:motion()?'smooth':'auto',block:'center'});});
   if(!racers.some(r=>r.id===highlightId))highlightId=racers.find(r=>r.id===String(currentMember()?.id))?.id||racers[0]?.id;
   q('[data-racer-highlight]').innerHTML=racers.map(r=>`<option value="${esc(r.id)}">${r.raceNumber} · ${esc(r.name)}${r.team?` · ${esc(r.team)}`:''}</option>`).join('');
   q('[data-racer-highlight]').value=highlightId;
   const selected=racers.find(r=>r.id===highlightId);q('[data-highlight-number]').innerHTML=jersey(selected);q('[data-highlight-name]').textContent=selected.name;
  }
  roster.update(racers,highlightId);
  race=snapshot.event.race_manifest?buildStadiumRace(racers,snapshot.event.race_manifest,eventDuration(snapshot.event)):null;
 };
 const paintControls=()=>{
  const e=snapshot.event,controls=q('.sr-controls'),finishTools=q('.sr-finish-tools');
  finishTools.querySelector('[data-again]')?.remove();
  if(!snapshot.can_control){controls.replaceChildren();return;}
  const state=e.bc_state;
  controls.innerHTML=state==='running'?'<button class="sr-primary" data-command="pause">Pause race</button><button data-reset>Reset race</button>':state==='paused'?'<button class="sr-primary" data-command="resume">Resume race</button><button data-edit>Edit race</button><button data-reset>Reset race</button>':state==='finished'?'':'<button class="sr-primary" data-command="start">Start race</button><button data-edit>Edit race</button>';
  if(state==='finished')finishTools.insertAdjacentHTML('beforeend','<button class="sr-primary" data-again>Race again</button>');
  controls.querySelectorAll('button').forEach(b=>b.disabled=busy);
  controls.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>void runCommand(b.dataset.command));
  const edit=controls.querySelector('[data-edit]');if(edit)edit.onclick=async()=>{
   if(!await orientation.exit()){toast('Close full screen to edit the race.');return;}if(life.closed)return;
   host.hidden=false;wireEditor(host,members,{event:snapshot.event,selected:racers.map(r=>r.id),onCancel:()=>{host.hidden=true;root.querySelector('[data-edit]')?.focus({preventScroll:true});},onSave:async values=>{await runCommand('configure',values,true);host.hidden=true;root.querySelector('[data-edit]')?.focus({preventScroll:true});}});
  };
  const reset=controls.querySelector('[data-reset]');if(reset)reset.onclick=()=>{
   const revision=snapshot.event.race_revision;controls.innerHTML='<strong>Reset this race and draw?</strong><button class="sr-primary" data-confirm>Reset race</button><button data-cancel-reset>Keep race</button>';
   controls.querySelector('[data-confirm]').focus({preventScroll:true});
   controls.querySelector('[data-confirm]').onclick=()=>{if(snapshot.event.race_revision!==revision){paintControls();toast('Race changed. Try again.');return;}void runCommand('reset');};controls.querySelector('[data-cancel-reset]').onclick=()=>{paintControls();controls.querySelector('[data-reset]')?.focus({preventScroll:true});};
  };
  const again=finishTools.querySelector('[data-again]');if(again){again.disabled=busy;again.onclick=async()=>{
   if(busy)return;busy=true;paintControls();try{const created=await commandStadiumRace(null,'create',{name:snapshot.event.name,duration:eventDuration(snapshot.event)/1000,memberIds:racers.map(r=>Number(r.id))});if(!life.closed)location.hash=`#/arena?id=${created.event.id}`;}catch(error){toast(error.message||'Race could not be created.');}finally{busy=false;if(!life.closed)paintControls();}
  };}
 };
 const paintFinal=()=>{
  const final=q('.sr-final');if(snapshot.event.bc_state!=='finished'||snapshot.results.length!==racers.length){final.hidden=true;return;}
  const key=JSON.stringify([snapshot.results,racers.map(r=>r.kit)]);if(final.dataset.result===key){final.hidden=false;return;}final.dataset.result=key;final.hidden=false;
  const podium=[...snapshot.results].sort((a,b)=>a.place-b.place).slice(0,3).map(result=>{const r=racers.find(p=>p.id===String(result.member_id));return `<div class="sr-podium-place" data-place="${result.place}"><canvas width="128" height="160" data-podium-racer="${esc(r.id)}" aria-hidden="true"></canvas><b>${result.place===1?'WINNER':`#${result.place}`}</b><strong>${esc(r.name)}</strong>${jersey(r)}</div>`;}).join('');
  const margin=finishMargin(snapshot.results);final.innerHTML=`<span class="sr-kicker">OFFICIAL ORDER</span><h2>That’s the fucking order.</h2><div class="sr-finish-margin">${margin!==null?`${margin<=200?'PHOTO FINISH · ':''}${(margin/1000).toFixed(2)}s margin`:''}</div><div class="sr-podium">${podium}</div>`;
  paintRacerArt();
 };
 function paintRacerArt(){
  const winner=snapshot.results.find(result=>result.place===1),winnerRacer=racers.find(r=>r.id===String(winner?.member_id));
  for(const canvas of root.querySelectorAll('[data-podium-racer],.sr-winner-art')){
   const r=canvas.classList.contains('sr-winner-art')?winnerRacer:racers.find(r=>r.id===canvas.dataset.podiumRacer);if(!r)continue;
   const ctx=canvas.getContext('2d');ctx.clearRect(0,0,128,160);drawKitRunner(ctx,r.kit,{x:0,y:0,width:128,height:158,identity:r.id,moving:false});
  }
 }
 q('[data-racer-highlight]').onchange=e=>{highlightId=e.target.value;const r=racers.find(r=>r.id===highlightId);q('[data-highlight-number]').innerHTML=jersey(r);setText(q('[data-highlight-name]'),r.name);lastDOM=0;draw(performance.now(),{forceStage:true});};
 const accept=(data,sentAt)=>{
  if(life.closed||Number(data.event.race_revision)<Number(snapshot.event.race_revision))return;
  const before=snapshot.event.bc_state,revision=snapshot.event.race_revision,permission=snapshot.can_control;snapshot=data;clock.sync(data.server_ms,sentAt);configureRacers();
  q('[data-name]').textContent=data.event.name;q('[data-state-label]').textContent=stateName(data.event);q('[data-state-label]').dataset.state=data.event.bc_state;
  q('[data-racer-count]').textContent=`${racers.length} racers`;q('[data-duration-label]').textContent=seconds(eventDuration(data.event));q('.sr-finish-tools').hidden=data.event.bc_state!=='finished';const margin=finishMargin(data.results);q('[data-photo-finish]').hidden=margin===null||margin>250||!race||data.results.length!==racers.length;crowd?.update();
  if(revision!==data.event.race_revision||before!==data.event.bc_state||permission!==data.can_control){paintControls();lastKey='';lastDOM=0;if(!host.hidden){host.hidden=true;host.replaceChildren();}}
  if(data.event.bc_state==='finished'&&before==='running'&&finishAt===null)finishAt=performance.now();
  showConnection('');paintFinal();draw(performance.now());schedule();
 };
 async function refresh(){
  if(life.closed)return;if(inflight)return inflight;
  const sentAt=performance.now();inflight=loadStadiumRace(id).then(data=>accept(data,sentAt)).catch(error=>{if(life.closed)return;if(error.code==='22023'&&/race not found/i.test(error.message||'')){life.stop();view.innerHTML='<section class="stadium-arena"><a class="sr-back" href="#/arena">← Arena</a><h1>Race removed.</h1></section>';return;}showConnection(navigator.onLine?'Reconnecting…':'Offline');}).finally(()=>{inflight=null;});return inflight;
 }
 async function runCommand(action,values={},rethrow=false){
  if(busy)return;busy=true;paintControls();
  try{
   if(action==='start'&&snapshot.event.race_engine!==STADIUM_ENGINE){const sentAt=performance.now();accept(await commandStadiumRace(snapshot,'configure',{name:snapshot.event.name,duration:eventDuration(snapshot.event)/1000,memberIds:racers.map(r=>Number(r.id))}),sentAt);}
   const sentAt=performance.now(),next=await commandStadiumRace(snapshot,action,values);replayAt=null;replayFinished=false;if(action==='start'||action==='reset'){finishAt=null;lastCue='';}accept(next,sentAt);if(action==='reset'&&next.event.bc_state==='finished')toast('Race finished. Use Race again for a new draw.');
  }catch(error){await refresh();if(rethrow)throw error;toast(error.code==='40001'?'Race changed. Try again.':error.message||'Race could not be changed.');}
  finally{busy=false;if(!life.closed)paintControls();}
 }
 function draw(now,{forceStage=false}={}){
  if(!visible()||!renderer)return;
  const e=snapshot.event,replaying=replayAt!==null,elapsed=replaying?Math.min(replayUntil,replayFrom+(now-replayAt)*replayRate):stadiumElapsed(e,clock.now());
  const frame=race?stadiumFrame(race,elapsed):{elapsed:-3000,u:0,countdown:0,finished:false,rows:racers.map((r,index)=>({id:r.id,index,progress:0,speed:0,rank:index+1})),ranked:[]};
  if(replaying&&elapsed>=replayUntil&&!replayFinished){replayFinished=true;finishAt=now;}
  if(!replaying&&e.bc_state==='running'&&frame.finished){if(finishAt===null)finishAt=now;void refresh();}
  if(stageVisible||forceStage)renderer.draw(frame,{state:e.bc_state,replay:replaying,celebration:finishAt===null?0:(now-finishAt)/1000});
  if(now-lastDOM<100)return;lastDOM=now;setMotionLabel();
  root.dataset.raceState=e.bc_state;

  const cue=frame.countdown?'count-'+frame.countdown:frame.ranked[0]?.finished?'finish':frame.u<.06&&!frame.countdown?'launch':frame.u>.90&&!frame.finished?'final':'';if(!['idle','paused'].includes(e.bc_state)&&cue&&cue!==lastCue){lastCue=cue;crowd?.cue(cue.startsWith('count-')?'countdown':cue)}
  setText(q('[data-clock]'),frame.countdown?`−${frame.countdown}`:seconds(Math.max(0,eventDuration(e)-Math.max(0,elapsed))));
  const idle=e.bc_state==='idle',paused=e.bc_state==='paused'&&!replaying,overlay=idle?'ON THE STARTING LINE':!paused&&frame.countdown?String(frame.countdown):'';
  setText(q('[data-overlay]'),overlay);setText(q('[data-overlay-name]'),idle?`${racers.length} on the grid`:'');q('.sr-stage-overlay').hidden=!overlay;q('.sr-stage-overlay').dataset.countdown=String(frame.countdown>0&&!idle&&!paused);
  const count=frame.countdown>0&&!idle&&!paused?frame.countdown:0;
  if(stage.dataset.count!==String(count)){stage.dataset.count=String(count);if(count&&motion())q('[data-overlay]').animate([{opacity:.3,transform:'scale(.88)'},{opacity:1,transform:'scale(1)'}],{duration:320,easing:'cubic-bezier(.16,1,.3,1)'});}
  stage.dataset.raceState=replaying?'replay':e.bc_state;
  stage.style.setProperty('--sr-race-progress',String(Math.min(1,Math.max(0,frame.ranked[0]?.progress||0))));
  let moment=idle?{key:'idle',title:'THE BOYS ARE LINED UP',name:'WHO’S GOT THE LEGS?'}:paused?{key:'paused',title:'RACE PAUSED',name:'NOBODY’S GOING ANYWHERE'}:race?stadiumMoment(race,frame):{key:'loading',title:'',name:''};
  if(replaying&&replayKind==='photo')moment={key:'photo-replay',title:'PHOTO FINISH · 0.25×',name:frame.ranked.slice(0,2).map(row=>racers[row.index].name).join(' vs ')};
  const leader=frame.ranked[0];
  const focused=frame.rows.find(r=>r.id===highlightId)||leader;setText(q('[data-field-spot]'),idle?'On deck':`${focused?.rank||1} · ${footballSpot(focused?.progress||0)}`);
  roster.select(highlightId);
  const selected=racers.find(r=>r.id===highlightId);if(selected&&q('[data-racer-highlight]').value!==highlightId){q('[data-racer-highlight]').value=highlightId;q('[data-highlight-number]').innerHTML=jersey(selected);setText(q('[data-highlight-name]'),selected.name);}
  if(frame.u>.94&&!frame.finished&&!leader?.finished&&frame.ranked[1]&&leader.progress-frame.ranked[1].progress<.008){moment.key='tight-finish';moment.title='TOO TIGHT TO CALL';moment.name='GET TO THE FUCKING LINE';}
  if(frame.finished&&e.bc_state!=='finished'&&!replaying){moment.title='FINISHING';moment.name='LOCKING THE ORDER';}
  const official=!replaying&&e.bc_state==='finished'&&snapshot.results.length===racers.length,showWinner=official&&snapshot.results.some(result=>result.place===1);
  q('[data-show-podium]').hidden=e.bc_state!=='finished'||snapshot.results.length!==racers.length;
  q('.sr-winner-art').hidden=!showWinner;stage.dataset.officialWinner=String(showWinner);
  if(showWinner){const winner=racers.find(r=>r.id===String(snapshot.results.find(result=>result.place===1).member_id));moment={key:'official-winner',title:'OFFICIAL WINNER',name:winner.name};}
  if(lastKey!==moment.key){if(lastKey&&moment.cue&&!idle&&!paused&&!frame.countdown)crowd?.cue(moment.cue);if(idle||paused)crowd?.quiet();lastKey=moment.key;q('[data-moment-title]').textContent=moment.title;q('[data-moment-name]').textContent=moment.name;if(motion())q('.sr-moment').animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});}
  q('[data-board-title]').textContent=idle?'Starting grid':frame.finished?'Finish order':'Live positions';q('[data-board-status]').textContent=replaying?'Replay':paused?'Paused':e.bc_state==='running'?'Live':'';
  const ranked=frame.ranked.length?frame.ranked:frame.rows;
  const rankKey=ranked.map(r=>r.id).join(','),reorder=board.dataset.order!==rankKey,positions=reorder&&motion()?new Map([...board.children].map(el=>[el,el.getBoundingClientRect().top])):null;
  for(const row of ranked){const el=board.querySelector(`[data-racer-id="${row.id}"]`);if(!el)continue;const rank=row.rank||row.index+1;setText(el.querySelector('.sr-rank'),rank);el.dataset.leader=String(rank===1&&!idle&&!frame.countdown);
   el.querySelector('.sr-gap').textContent=idle?'On deck':frame.countdown?'Set':row.finished?`${(row.finishMs/1000).toFixed(2)}s`:rank===1?'Leader':`${Math.max(0,((ranked[0]?.progress||0)-row.progress)*100).toFixed(1)} yd`;
   const button=el.querySelector('button');if(idle)button.setAttribute('aria-describedby',`sr-ready-${row.id}`);else button.removeAttribute('aria-describedby');button.setAttribute('aria-label',`Highlight ${racers[row.index].name}, racer ${racers[row.index].raceNumber}, position ${rank}${row.finished?', finished':''}`);button.setAttribute('aria-pressed',String(highlightId===row.id));
  }
  if(reorder){const focused=board.contains(document.activeElement)?document.activeElement:null;board.dataset.order=rankKey;for(const row of ranked){const el=board.querySelector(`[data-racer-id="${row.id}"]`);if(el){el.getAnimations().forEach(animation=>animation.cancel());board.append(el);}}if(positions)for(const el of board.children){const delta=positions.get(el)-el.getBoundingClientRect().top;if(Math.abs(delta)>1)el.animate([{transform:`translateY(${delta}px)`},{transform:'translateY(0)'}],{duration:420,easing:'cubic-bezier(.22,.7,.25,1)'});}if(focused?.isConnected&&document.activeElement!==focused)focused.focus({preventScroll:true});}
 }
 function setMotionLabel(){const enabled=motion();root.dataset.motion=enabled?'on':'off';q('[data-motion]').textContent=`Motion ${enabled?'on':'off'}`;q('[data-motion]').setAttribute('aria-pressed',String(enabled));}
 wireMyRacer(root,life,async saved=>{snapshot.racer_kits=[...(snapshot.racer_kits||[]).filter(k=>String(k.member_id)!==String(saved.member_id)),saved];configureRacers();lastDOM=0;draw(performance.now());void refresh();},()=>racers.find(r=>r.id===String(currentMember()?.id))?.kit);
 function schedule(){if(raf||!visible())return;const animating=snapshot.event.bc_state==='running'||replayAt!==null||(finishAt!==null&&performance.now()-finishAt<4000);if(!animating)return;raf=requestAnimationFrame(now=>{raf=0;draw(now);if(replayAt!==null&&now-replayAt>(replayUntil-replayFrom)/replayRate+4000){replayAt=null;lastDOM=0;q('[data-stop-replay]').hidden=true;draw(now);}schedule();});}
 q('[data-motion]').onclick=()=>{setReduceRaceMotion(!getReduceRaceMotion());setMotion();};
 q('[data-share]').onclick=async()=>{try{const url=new URL(location.href);url.hash=`#/arena?id=${id}`;await navigator.clipboard.writeText(url.href);toast('Watch link copied.');}catch{toast('Could not copy the watch link.');}};
 const beginReplay=photo=>{if(snapshot.event.bc_state!=='finished'||!race)return;const sorted=[...snapshot.results].sort((a,b)=>a.place-b.place);if(photo&&(sorted.length!==racers.length||finishMargin(sorted)===null||finishMargin(sorted)>250))return;replayFrom=photo?Math.max(0,Number(sorted[0].finish_ms)-1600):0;replayUntil=photo?Math.min(race.duration,Number(sorted[1].finish_ms)+800):race.duration;replayRate=photo?.25:1;replayKind=photo?'photo':'full';replayAt=performance.now()+(photo?0:3000);replayFinished=false;finishAt=null;lastKey='';lastCue='';q('[data-stop-replay]').hidden=false;stage.scrollIntoView({behavior:motion()?'smooth':'auto',block:'center'});lastDOM=0;draw(performance.now(),{forceStage:true});schedule();};
 q('[data-show-podium]').onclick=async()=>{if(snapshot.event.bc_state!=='finished'||snapshot.results.length!==racers.length)return;replayAt=null;finishAt=null;q('[data-stop-replay]').hidden=true;lastDOM=0;draw(performance.now());await orientation.exit();if(life.closed||!root.isConnected)return;const result=q('.sr-final');result.scrollIntoView({behavior:motion()?'smooth':'auto',block:'start'});result.setAttribute('tabindex','-1');result.focus({preventScroll:true});result.querySelectorAll('.sr-podium-place').forEach((card,i)=>animateUi(card,[{opacity:0,transform:'translateY(14px)'},{opacity:1,transform:'none'}],{duration:420,delay:200+i*120,motion:motion()}));};
 q('[data-replay]').onclick=()=>beginReplay(false);q('[data-photo-finish]').onclick=()=>beginReplay(true);q('[data-stop-replay]').onclick=()=>{replayAt=null;finishAt=null;lastDOM=0;q('[data-stop-replay]').hidden=true;draw(performance.now());};
 q('[data-expand]').onclick=()=>void orientation.expand();
 const onKey=e=>{if(e.key==='Escape')void orientation.exit();};window.addEventListener('keydown',onKey);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{void refresh();draw(performance.now());schedule();}};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('online',visibility);
 life.cleanup.push(()=>{cancelAnimationFrame(raf);clearInterval(poll);renderer?.stop();crowd?.stop();channel?.unsubscribe();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',visibility);window.removeEventListener('keydown',onKey);stage.classList.remove('sr-expanded');if(document.fullscreenElement===stage)void document.exitFullscreen();});
 configureRacers();paintControls();accept(snapshot,sent);setMotion();orientation.sync();
 const presenceKey=globalThis.crypto.randomUUID();
 channel=db().channel(`stadium-room-${id}`,{config:{presence:{key:presenceKey},broadcast:{ack:true,self:false}}});
 crowd=mountStadiumCrowd(root,{channel,key:presenceKey,getSnapshot:()=>snapshot,getRacers:()=>racers,getMember:currentMember,motion});
 channel
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'arena_events',filter:`id=eq.${id}`},()=>void refresh())
  .on('postgres_changes',{event:'DELETE',schema:'public',table:'arena_events'},payload=>{if(String(payload.old?.id)===String(id))void refresh();})
  .subscribe(status=>crowd.connection(status));
 poll=setInterval(()=>{if(!document.hidden&&!life.closed&&navigator.onLine&&snapshot.event.bc_state!=='finished')void refresh();},2000);
}
