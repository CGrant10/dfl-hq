import {db} from '../supabase.js';
import {esc,toast,loading,errorBox} from '../ui.js';
import {loadMemberDirectory,currentMember} from '../members.js';
import {canEdit} from '../inline.js';
import {ensureStylesheet} from '../lazy-css.js';
import {getReduceRaceMotion,setReduceRaceMotion} from '../store.js';
import {loadStadiumRace,commandStadiumRace,createStadiumClock} from '../arena/stadium-data.js';
import {buildStadiumRace,stadiumFrame,stadiumElapsed,stadiumMoment,STADIUM_ENGINE} from '../arena/stadium-model.js';
import {createStadiumRenderer,stadiumColor} from '../arena/stadium-renderer.js';
import {normalizeKit,footballSpot,finishMargin} from '../arena/racer-kit-model.js';

let active=null;
export function leave(){active?.stop();active=null;}
const safePhoto=value=>{if(!String(value||'').trim())return '';try{const u=new URL(value,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}};
const initials=name=>String(name||'DFL').split(/\s+/).map(p=>p[0]).slice(0,2).join('');
const portrait=r=>{const photo=safePhoto(r.photo);return `<span class="sr-avatar" data-initials="${esc(initials(r.name))}" style="--racer:${stadiumColor(r,r.index||0)}">${photo?`<img src="${esc(photo)}" alt="" loading="lazy" decoding="async">`:esc(initials(r.name))}</span>`;};
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
 return `<form class="sr-editor"><div class="sr-editor-head"><h2>${event?'Edit race':'New race'}</h2><button type="button" data-cancel aria-label="Close race editor">×</button></div>
 <label>Race name<input name="name" maxlength="80" required value="${esc(event?.name||'DFL Stadium Dash')}"></label>
 <div class="sr-duration-presets" aria-label="Race duration">${[30,60,90,120,180].map(n=>`<button type="button" data-duration="${n}" aria-pressed="${n===duration}">${n<60?`${n}s`:`${n/60}m`}</button>`).join('')}</div>
 <label>Duration · seconds<input name="duration" type="number" min="15" max="600" step="1" required value="${duration}" inputmode="numeric"></label>
 <div class="sr-pick-head"><h3>Racers <span data-picked>${picked.size}</span></h3>${paused?'':'<button type="button" data-all>Select all</button>'}</div>
 ${paused?'':`<label class="sr-search"><span class="sr-only">Find a racer</span><input name="search" type="search" placeholder="Find a racer" autocomplete="off"></label>`}
 <div class="sr-member-picks">${members.filter(m=>!paused||picked.has(String(m.id))).map((m,index)=>`<label class="sr-member-pick"><input type="checkbox" name="racer" value="${esc(m.id)}" ${picked.has(String(m.id))?'checked':''} ${paused?'disabled':''}>${portrait({photo:m.profile_image,name:m.display_name,index})}<span>${esc(m.display_name)}<small>${esc(m.team_name||'')}</small></span></label>`).join('')}</div>
 <p class="sr-form-error" role="alert" hidden></p><button class="sr-primary" type="submit">${event?'Save race':'Create race'}</button></form>`;
}

function wireEditor(host,members,{event=null,selected=[],onSave,onCancel}={}){
 host.innerHTML=editorMarkup(members,{event,selected,paused:event?.bc_state==='paused'});
 const form=host.querySelector('form'),checks=[...form.querySelectorAll('[name=racer]')],duration=form.elements.namedItem('duration');
 const count=()=>{form.querySelector('[data-picked]').textContent=String(checks.filter(c=>c.checked).length);};
 const presets=()=>form.querySelectorAll('[data-duration]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.duration)===Number(duration.value))));
 form.querySelector('[data-cancel]').onclick=onCancel;
 form.querySelectorAll('[data-duration]').forEach(b=>b.onclick=()=>{duration.value=b.dataset.duration;presets();});duration.oninput=presets;
 checks.forEach(c=>c.onchange=count);
 const all=form.querySelector('[data-all]');if(all)all.onclick=()=>{const select=!checks.every(c=>c.checked);checks.forEach((c,i)=>c.checked=select&&i<32);count();};
 const search=form.elements.namedItem('search');if(search)search.oninput=()=>{const q=search.value.trim().toLowerCase();checks.forEach(c=>c.closest('label').hidden=!c.closest('label').textContent.toLowerCase().includes(q));};
 form.onsubmit=async e=>{
  e.preventDefault();const ids=checks.filter(c=>c.checked).map(c=>Number(c.value)),error=form.querySelector('[role=alert]'),submit=form.querySelector('[type=submit]');
  error.hidden=true;if(ids.length<2||ids.length>32){error.textContent='Choose 2–32 racers.';error.hidden=false;return;}
  submit.disabled=true;try{await onSave({name:form.elements.namedItem('name').value.trim(),duration:Number(duration.value),memberIds:ids});}catch(err){error.textContent=err.message||'Race could not be saved.';error.hidden=false;}finally{submit.disabled=false;}
 };
 form.elements.namedItem('name').focus({preventScroll:true});
}

async function lobby(view,members,life){
 const {data:events,error}=await db().from('arena_events').select('id,name,bc_state,status,race_engine,race_duration_ms,length_ticks,created_at').order('created_at',{ascending:false}).limit(60);if(error)throw error;if(life.closed)return;
 const ready=(events||[]).filter(e=>e.bc_state!=='finished'&&e.status!=='complete'),history=(events||[]).filter(e=>!ready.includes(e));
 view.innerHTML=`<section class="stadium-arena sr-lobby"><header class="sr-title"><div><span class="sr-kicker">THE DFL</span><h1>Arena</h1></div><div class="sr-lobby-actions">${currentMember()?'<button data-my-racer>My racer</button>':''}${canEdit('arena_events')?'<button class="sr-primary" data-new>New race</button>':''}</div></header><div class="sr-editor-host" hidden></div>
 <div class="sr-lobby-art"><span>SETTLE IT<br>ON THE FIELD.</span><b>DFL STADIUM DASH</b></div>
 <h2>On the starting line</h2><div class="sr-event-list">${ready.length?ready.map(e=>`<a class="sr-event" href="#/arena?id=${esc(e.id)}"><span class="sr-state" data-state="${esc(e.bc_state)}">${stateName(e)}</span><strong>${esc(e.name)}</strong><span>${seconds(eventDuration(e))} <b aria-hidden="true">↗</b></span></a>`).join(''):'<div class="sr-empty">No races on deck.</div>'}</div>
 ${history.length?`<h2>Official results</h2><div class="sr-event-list">${history.map(e=>`<a class="sr-event" href="#/${e.race_engine===STADIUM_ENGINE?'arena':'arena-results'}?id=${esc(e.id)}"><strong>${esc(e.name)}</strong><span>Final <b aria-hidden="true">↗</b></span></a>`).join('')}</div>`:''}</section>`;
 const newButton=view.querySelector('[data-new]');if(newButton)newButton.onclick=()=>{
  const host=view.querySelector('.sr-editor-host');host.hidden=false;
  wireEditor(host,members,{onCancel:()=>host.hidden=true,onSave:async values=>{const snapshot=await commandStadiumRace(null,'create',values);if(!life.closed)location.hash=`#/arena?id=${snapshot.event.id}`;}});
 };
 wireMyRacer(view,life,()=>{});
}

async function room(view,members,id,life){
 const clock=createStadiumClock();let snapshot=null,racers=[],race=null,renderer=null,channel=null,poll=0,raf=0,cameraRaf=0,inflight=null,busy=false,lastDOM=0,lastKey='',finishAt=null,replayAt=null,replayFinished=false,lastLeader='',leadChange=null,stageVisible=true,cameraMode='auto',followId=null;
 const sent=performance.now();snapshot=await loadStadiumRace(id);clock.sync(snapshot.server_ms,sent);if(life.closed)return;
 // Only untouched legacy setup can be upgraded. Its historical/live renderer stays intact.
 if(snapshot.event.race_engine!==STADIUM_ENGINE&&!(snapshot.event.bc_state==='idle'&&snapshot.event.status!=='complete'&&!snapshot.results.length)){
  const legacy=await import(snapshot.event.bc_state==='finished'||snapshot.event.status==='complete'?'./arena-results.js':'./broadcast.js');if(life.closed)return;life.cleanup.push(()=>legacy.leave?.());await legacy.render(view);return;
 }
 const memberMap=new Map(members.map(m=>[String(m.id),m]));
 const root=document.createElement('section');root.className='stadium-arena sr-room';
 root.innerHTML=`<a class="sr-back" href="#/arena">← Arena</a><header class="sr-title"><div><span class="sr-kicker">DFL STADIUM DASH</span><h1 data-name></h1></div><span class="sr-state" data-state-label></span></header>
 <div class="sr-room-meta"><span data-racer-count></span><span data-duration-label></span><span data-presence hidden></span><span class="sr-connection" role="status" hidden></span></div>
 <div class="sr-camera-selector" style="--camera-slot:0" aria-label="Race camera"><button type="button" data-camera="auto" aria-pressed="true">Auto</button><button type="button" data-camera="field" aria-pressed="false">Full field</button><button type="button" data-camera="follow" aria-pressed="false">Follow racer</button></div>
 <div class="sr-stage"><canvas aria-label="Live football stadium race"></canvas><div class="sr-stage-score"><div><span data-clock>0:00</span><small data-field-spot></small></div><button type="button" data-expand aria-label="Expand race">⛶</button></div><div class="sr-stage-overlay" aria-live="polite"><strong data-overlay></strong><span data-overlay-name></span></div><div class="sr-moment" aria-live="polite"><span data-moment-title></span><strong data-moment-name></strong></div></div>
 <div class="sr-tools">${currentMember()?'<button type="button" data-my-racer>My racer</button>':''}<button type="button" data-motion aria-pressed="true">Motion on</button><button type="button" data-share>Copy watch link</button><button type="button" data-replay hidden>Replay</button></div>
 <div class="sr-controls"></div><div class="sr-editor-host" hidden></div><div class="sr-final" hidden aria-live="polite"></div>
 <div class="sr-board-head"><h2 data-board-title>Starting grid</h2><span data-board-status></span></div><ol class="sr-board" aria-label="Race positions"></ol></section>`;
 view.replaceChildren(root);
 const q=s=>root.querySelector(s),stage=q('.sr-stage'),board=q('.sr-board'),host=q('.sr-editor-host');
 const stageWatch=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{stageVisible=entries[0].isIntersecting;if(stageVisible)draw(performance.now());},{rootMargin:'100px'}):null;
 stageWatch?.observe(stage);life.cleanup.push(()=>stageWatch?.disconnect());
 const visible=()=>!document.hidden&&!life.closed;
 const showConnection=message=>{const el=q('.sr-connection');el.textContent=message;el.hidden=!message;};
 const setMotion=()=>{root.dataset.motion=motion()?'on':'off';q('[data-motion]').textContent=`Motion ${motion()?'on':'off'}`;q('[data-motion]').setAttribute('aria-pressed',String(motion()));if(!raf)draw(performance.now());};
 const configureRacers=()=>{
  const kits=new Map((snapshot.racer_kits||[]).map(k=>[String(k.member_id),k.kit]));
  const next=snapshot.participants.map((p,index)=>{const m=memberMap.get(String(p.member_id)),kit=normalizeKit(kits.get(String(p.member_id)),{number:p.number??index+1});return {id:String(p.member_id),name:m?.display_name||`Racer ${p.number||index+1}`,team:m?.team_name||'',photo:m?.profile_image||'',number:kit.number,kit,color:kits.has(String(p.member_id))?kit.jersey:p.color||m?.accent_color,index};});
  const signature=JSON.stringify(next);if(signature!==JSON.stringify(racers)){
   const sameField=racers.length===next.length&&racers.every((r,i)=>r.id===next[i].id);racers=next;
   if(renderer&&sameField)renderer.updateRacers(racers);else{renderer?.stop();renderer=createStadiumRenderer(q('canvas'),{racers,motion,camera:()=>({mode:cameraMode,racerId:followId})});}
   board.innerHTML=racers.map(r=>`<li class="sr-position" data-racer-id="${esc(r.id)}"><button class="sr-follow-row" type="button" data-follow-racer="${esc(r.id)}" aria-pressed="false"><span class="sr-rank">${r.index+1}</span>${portrait(r)}<span class="sr-racer-name">${esc(r.name)}<small>${esc(r.team)}</small></span><span class="sr-gap">On deck</span></button></li>`).join('');
   board.querySelectorAll('[data-follow-racer]').forEach(b=>b.onclick=()=>{followId=b.dataset.followRacer;setCamera('follow');stage.scrollIntoView({behavior:motion()?'smooth':'auto',block:'center'});});
   board.style.height=`${racers.length*76}px`;
  }
  race=snapshot.event.race_manifest?buildStadiumRace(racers,snapshot.event.race_manifest,eventDuration(snapshot.event)):null;
 };
 const paintControls=()=>{
  const e=snapshot.event,controls=q('.sr-controls');
  if(!snapshot.can_control){controls.replaceChildren();return;}
  const state=e.bc_state;
  controls.innerHTML=state==='running'?'<button class="sr-primary" data-command="pause">Pause race</button>':state==='paused'?'<button class="sr-primary" data-command="resume">Resume race</button><button data-edit>Edit race</button><button data-reset>Reset draw</button>':state==='finished'?'<button class="sr-primary" data-again>Race again</button>':'<button class="sr-primary" data-command="start">Start race</button><button data-edit>Edit race</button>';
  controls.querySelectorAll('button').forEach(b=>b.disabled=busy);
  controls.querySelectorAll('[data-command]').forEach(b=>b.onclick=()=>void runCommand(b.dataset.command));
  const edit=controls.querySelector('[data-edit]');if(edit)edit.onclick=()=>{
   host.hidden=false;wireEditor(host,members,{event:snapshot.event,selected:racers.map(r=>r.id),onCancel:()=>host.hidden=true,onSave:async values=>{await runCommand('configure',values,true);host.hidden=true;}});host.scrollIntoView({behavior:motion()?'smooth':'auto',block:'nearest'});
  };
  const reset=controls.querySelector('[data-reset]');if(reset)reset.onclick=()=>{
   controls.innerHTML='<strong>Discard this draw?</strong><button class="sr-primary" data-confirm>Reset draw</button><button data-cancel-reset>Keep race</button>';
   controls.querySelector('[data-confirm]').onclick=()=>void runCommand('reset');controls.querySelector('[data-cancel-reset]').onclick=paintControls;
  };
  const again=controls.querySelector('[data-again]');if(again)again.onclick=async()=>{
   if(busy)return;busy=true;paintControls();try{const created=await commandStadiumRace(null,'create',{name:snapshot.event.name,duration:eventDuration(snapshot.event)/1000,memberIds:racers.map(r=>Number(r.id))});if(!life.closed)location.hash=`#/arena?id=${created.event.id}`;}catch(error){toast(error.message||'Race could not be created.');}finally{busy=false;if(!life.closed)paintControls();}
  };
 };
 const paintFinal=()=>{
  const final=q('.sr-final');if(snapshot.event.bc_state!=='finished'||snapshot.results.length!==racers.length){final.hidden=true;return;}
  const key=snapshot.results.map(r=>`${r.member_id}:${r.place}`).join('|');if(final.dataset.result===key){final.hidden=false;return;}final.dataset.result=key;final.hidden=false;
  const podium=snapshot.results.slice(0,3).map(result=>{const r=racers.find(p=>p.id===String(result.member_id));return `<div class="sr-podium-place" data-place="${result.place}">${portrait(r)}<b>${result.place===1?'WINNER':`#${result.place}`}</b><strong>${esc(r.name)}</strong></div>`;}).join('');
  const margin=finishMargin(snapshot.results);final.innerHTML=`<span class="sr-kicker">OFFICIAL ORDER</span><h2>That’s the fucking order.</h2><div class="sr-finish-margin">${margin!==null?`${margin<=200?'PHOTO FINISH · ':''}${(margin/1000).toFixed(2)}s margin`:''}</div><div class="sr-podium">${podium}</div>`;
 };
 const accept=(data,sentAt)=>{
  if(life.closed||Number(data.event.race_revision)<Number(snapshot.event.race_revision))return;
  const before=snapshot.event.bc_state,revision=snapshot.event.race_revision,permission=snapshot.can_control;snapshot=data;clock.sync(data.server_ms,sentAt);configureRacers();
  q('[data-name]').textContent=data.event.name;q('[data-state-label]').textContent=stateName(data.event);q('[data-state-label]').dataset.state=data.event.bc_state;
  q('[data-racer-count]').textContent=`${racers.length} racers`;q('[data-duration-label]').textContent=seconds(eventDuration(data.event));q('[data-replay]').hidden=data.event.bc_state!=='finished';
  if(revision!==data.event.race_revision||before!==data.event.bc_state||permission!==data.can_control){paintControls();lastKey='';lastDOM=0;if(!host.hidden){host.hidden=true;host.replaceChildren();}}
  if(data.event.bc_state==='finished'&&before==='running'&&finishAt===null)finishAt=performance.now();
  showConnection('');paintFinal();draw(performance.now());schedule();
 };
 async function refresh(){
  if(life.closed)return;if(inflight)return inflight;
  const sentAt=performance.now();inflight=loadStadiumRace(id).then(data=>accept(data,sentAt)).catch(()=>{if(!life.closed)showConnection(navigator.onLine?'Reconnecting…':'Offline');}).finally(()=>{inflight=null;});return inflight;
 }
 async function runCommand(action,values={},rethrow=false){
  if(busy)return;busy=true;paintControls();
  try{
   if(action==='start'&&snapshot.event.race_engine!==STADIUM_ENGINE){const sentAt=performance.now();accept(await commandStadiumRace(snapshot,'configure',{name:snapshot.event.name,duration:eventDuration(snapshot.event)/1000,memberIds:racers.map(r=>Number(r.id))}),sentAt);}
   const sentAt=performance.now();accept(await commandStadiumRace(snapshot,action,values),sentAt);replayAt=null;replayFinished=false;if(action==='start'||action==='reset'){lastLeader='';leadChange=null;finishAt=null;}
  }catch(error){await refresh();if(rethrow)throw error;toast(error.code==='40001'?'Race changed. Try again.':error.message||'Race could not be changed.');}
  finally{busy=false;if(!life.closed)paintControls();}
 }
 function draw(now){
  if(!visible()||!renderer)return;
  const e=snapshot.event,replaying=replayAt!==null,elapsed=replaying?now-replayAt:stadiumElapsed(e,clock.now());
  const frame=race?stadiumFrame(race,elapsed):{elapsed:-3000,u:0,countdown:0,finished:false,rows:racers.map((r,index)=>({id:r.id,index,progress:0,speed:0,rank:index+1})),ranked:[]};
  if(replaying&&frame.finished&&!replayFinished){replayFinished=true;finishAt=now;}
  if(!replaying&&e.bc_state==='running'&&frame.finished){if(finishAt===null)finishAt=now;void refresh();}
  if(stageVisible)renderer.draw(frame,{state:e.bc_state,runId:e.race_manifest?.run_id||'',now,replay:replaying,celebration:finishAt===null?0:(now-finishAt)/1000});
  if(now-lastDOM<100)return;lastDOM=now;setMotionLabel();
  setText(q('[data-clock]'),frame.countdown?`−${frame.countdown}`:seconds(Math.max(0,eventDuration(e)-Math.max(0,elapsed))));
  const idle=e.bc_state==='idle',paused=e.bc_state==='paused'&&!replaying,overlay=idle?'ON THE STARTING LINE':paused?'HOLD THE LINE':frame.countdown?String(frame.countdown):'';
  setText(q('[data-overlay]'),overlay);setText(q('[data-overlay-name]'),idle?`${racers.length} racers ready`:paused?'PAUSED':'');q('.sr-stage-overlay').hidden=!overlay;q('.sr-stage-overlay').dataset.countdown=String(frame.countdown>0&&!idle&&!paused);
  const moment=idle?{key:'idle',title:'THE BOYS ARE LINED UP',name:'WHO’S GOT THE LEGS?'}:paused?{key:'paused',title:'RACE PAUSED',name:'NOBODY’S GOING ANYWHERE'}:race?stadiumMoment(race,frame):{key:'loading',title:'',name:''};
  const leader=frame.ranked[0];if(leader&&leader.id!==lastLeader){if(lastLeader&&frame.u>.06&&frame.u<.90&&(!leadChange||now-leadChange.at>1400))leadChange={id:leader.id,at:now};lastLeader=leader.id;}
  const focused=cameraMode==='follow'?frame.rows.find(r=>r.id===followId):leader;setText(q('[data-field-spot]'),footballSpot(focused?.progress||0));
  if(frame.u>.94&&!frame.finished&&!leader?.finished&&frame.ranked[1]&&leader.progress-frame.ranked[1].progress<.008){moment.key='tight-finish';moment.title='TOO TIGHT TO CALL';moment.name='GET TO THE FUCKING LINE';}
  if(!idle&&!paused&&frame.u<.9&&leadChange&&now-leadChange.at<1400){moment.key=`lead-${leadChange.at}`;moment.title='TAKES THE LEAD';moment.name=racers.find(r=>r.id===leadChange.id)?.name||'DFL';}
  if(frame.finished&&e.bc_state!=='finished'&&!replaying){moment.title='FINISHING';moment.name='LOCKING THE ORDER';}
  if(lastKey!==moment.key){lastKey=moment.key;q('[data-moment-title]').textContent=moment.title;q('[data-moment-name]').textContent=moment.name;if(motion())q('.sr-moment').animate([{opacity:.4,transform:'translateY(5px)'},{opacity:1,transform:'translateY(0)'}],{duration:220,easing:'ease-out'});}
  q('[data-board-title]').textContent=idle?'Starting grid':frame.finished?'Finish order':'Live positions';q('[data-board-status]').textContent=replaying?'Replay':paused?'Paused':e.bc_state==='running'?'Live':'';
  const ranked=frame.ranked.length?frame.ranked:frame.rows;
  for(const row of ranked){const el=board.querySelector(`[data-racer-id="${row.id}"]`);if(!el)continue;const rank=row.rank||row.index+1;el.style.transform=`translateY(${(rank-1)*76}px)`;setText(el.querySelector('.sr-rank'),rank);el.dataset.leader=String(rank===1&&!idle&&!frame.countdown);
   el.querySelector('.sr-gap').textContent=idle?'On deck':frame.countdown?'Set':row.finished?`${(row.finishMs/1000).toFixed(2)}s`:rank===1?'Leader':`${Math.max(0,((ranked[0]?.progress||0)-row.progress)*100).toFixed(1)} yd`;
   const button=el.querySelector('button');button.setAttribute('aria-label',`Follow ${racers[row.index].name}, position ${rank}${row.finished?', finished':''}`);button.setAttribute('aria-pressed',String(cameraMode==='follow'&&followId===row.id));
  }
  const rankKey=ranked.map(r=>r.id).join(',');if(board.dataset.order!==rankKey){board.dataset.order=rankKey;for(const row of ranked){const el=board.querySelector(`[data-racer-id="${row.id}"]`);if(el)board.append(el);}}
 }
 function setMotionLabel(){const enabled=motion();root.dataset.motion=enabled?'on':'off';q('[data-motion]').textContent=`Motion ${enabled?'on':'off'}`;q('[data-motion]').setAttribute('aria-pressed',String(enabled));}
 function setCamera(mode){cancelAnimationFrame(cameraRaf);cameraRaf=0;cameraMode=mode;if(mode==='follow'&&!racers.some(r=>r.id===followId))followId=racers.find(r=>r.id===String(currentMember()?.id))?.id||racers[0]?.id;root.querySelectorAll('[data-camera]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.camera===mode)));q('.sr-camera-selector').style.setProperty('--camera-slot',String(['auto','field','follow'].indexOf(mode)));lastDOM=0;draw(performance.now());if(snapshot.event.bc_state!=='running'){let end=performance.now()+600;const glide=now=>{cameraRaf=0;if(life.closed||now>end)return;draw(now);cameraRaf=requestAnimationFrame(glide);};if(motion())cameraRaf=requestAnimationFrame(glide);}schedule();}
 root.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>setCamera(b.dataset.camera));
 wireMyRacer(root,life,async saved=>{snapshot.racer_kits=[...(snapshot.racer_kits||[]).filter(k=>String(k.member_id)!==String(saved.member_id)),saved];configureRacers();lastDOM=0;draw(performance.now());void refresh();},()=>racers.find(r=>r.id===String(currentMember()?.id))?.kit);
 function schedule(){if(raf||!visible())return;const animating=snapshot.event.bc_state==='running'||replayAt!==null||(finishAt!==null&&performance.now()-finishAt<4000);if(!animating)return;raf=requestAnimationFrame(now=>{raf=0;draw(now);if(replayAt!==null&&now-replayAt>eventDuration(snapshot.event)+4000)replayAt=null;schedule();});}
 q('[data-motion]').onclick=()=>{setReduceRaceMotion(!getReduceRaceMotion());setMotion();};
 q('[data-share]').onclick=async()=>{try{const url=new URL(location.href);url.hash=`#/arena?id=${id}`;await navigator.clipboard.writeText(url.href);toast('Watch link copied.');}catch{toast('Could not copy the watch link.');}};
 q('[data-replay]').onclick=()=>{replayAt=performance.now()+3000;replayFinished=false;finishAt=null;lastKey='';lastLeader='';leadChange=null;schedule();};
 q('[data-expand]').onclick=async()=>{try{if(document.fullscreenElement===stage)await document.exitFullscreen();else if(stage.requestFullscreen)await stage.requestFullscreen();else{stage.classList.toggle('sr-expanded');q('[data-expand]').setAttribute('aria-label',stage.classList.contains('sr-expanded')?'Close expanded race':'Expand race');}}catch{toast('Fullscreen is unavailable.');}};
 const onKey=e=>{if(e.key==='Escape')stage.classList.remove('sr-expanded');};window.addEventListener('keydown',onKey);
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0;}else{void refresh();draw(performance.now());schedule();}};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('online',visibility);
 life.cleanup.push(()=>{cancelAnimationFrame(raf);cancelAnimationFrame(cameraRaf);clearInterval(poll);renderer?.stop();channel?.unsubscribe();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',visibility);window.removeEventListener('keydown',onKey);stage.classList.remove('sr-expanded');if(document.fullscreenElement===stage)void document.exitFullscreen();});
 configureRacers();paintControls();accept(snapshot,sent);setMotion();
 const presenceKey=globalThis.crypto.randomUUID();
 channel=db().channel(`stadium-room-${id}`,{config:{presence:{key:presenceKey}}})
  .on('postgres_changes',{event:'UPDATE',schema:'public',table:'arena_events',filter:`id=eq.${id}`},()=>void refresh())
  .on('presence',{event:'sync'},()=>{if(life.closed)return;const people=new Set(Object.values(channel.presenceState()).flat().map(p=>p.key).filter(Boolean));const el=q('[data-presence]');el.textContent=`${people.size} watching`;el.hidden=!people.size;})
  .subscribe(status=>{if(status==='SUBSCRIBED'&&!life.closed)void channel.track({key:presenceKey});});
 poll=setInterval(()=>{if(visible()&&navigator.onLine&&snapshot.event.bc_state!=='finished')void refresh();},2000);
}
