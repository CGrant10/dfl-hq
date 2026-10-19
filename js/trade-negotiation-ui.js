import {esc,toast} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {negotiationProposal,negotiationDeal,negotiationActions,negotiationStatus,negotiationChanges,negotiationSleeperUrl} from './trade-negotiation-model.js';
const name=t=>t?.team_name||t?.ownerName||'DFL team';
const labels={save:'Saved draft',send:'Sent offer',counter:'Counteroffer',accept:'Agreed',decline:'Declined',withdraw:'Withdrawn'};
const date=value=>new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});

export function negotiationPackage(proposal,data){
 if(!proposal?.teamIds)return '';
 return `<div class="tr-package">${proposal.teamIds.map((id,i)=>{const t=data.teams.find(t=>String(t.id)===String(id));return `<section><h3>${esc(name(t))}</h3><ul>${(proposal.sends[i]||[]).map(pid=>{const p=data.pool.get(String(pid))||{id:pid,name:String(pid)},to=data.teams.find(t=>String(t.id)===String(proposal.destinations?.[pid]));return `<li>${playerPortrait(p)}<span><b>${esc(p.name)}</b><small>${esc(p.position||'')} → ${esc(name(to))}</small></span></li>`}).join('')}</ul></section>`}).join('')}</div>`;
}

export function createTradeNegotiation({member,getData,getDeal,onEdit,onRoom,createApi=async m=>(await import('./trade-negotiation-data.js')).tradeNegotiationApi(m)}){
 let host=null,api=null,rows=[],selected=null,editing=null,loaded=false,busy=false,stopped=false,error='',locked=false,filter='active',sequence=0,dialog=null,listOrigin=null;
 const mine=()=>String(member?.id||'');
 const data=()=>getData();
 const actor=id=>{const m=data().members?.find(m=>String(m.id)===String(id)),t=m?.sleeper_user_id&&data().teams.find(t=>String(t.sleeper_user_id)===String(m.sleeper_user_id));return t?name(t):m?.display_name||(String(id)===mine()?'You':'Manager');};
 const actions=()=>negotiationActions(selected,mine());
 const healthy=room=>Number(room.season)===Number(data().projectionSeason)&&!!negotiationDeal(room.proposal,data(),member);
 const alive=()=>!stopped;
 function paint(){
  if(!host?.isConnected||stopped)return;
  const focused=host.contains(document.activeElement)?document.activeElement:null,focusKey=focused?.getAttribute('data-tr-action'),openDetails=[...host.querySelectorAll('details')].map(d=>d.open);
  if(!member){host.innerHTML='<div class="tr-empty">Choose your profile to open offers.</div>';return;}
  if(locked){host.innerHTML=`<form class="tr-unlock"><label>Profile PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="one-time-code" required></label><button class="btn" ${busy?'disabled':''}>Unlock offers</button><p role="alert">${esc(error)}</p></form>`;return;}
  const visible=rows.filter(r=>filter==='closed'?['agreed','declined','withdrawn'].includes(r.status):['pending','draft'].includes(r.status));
  host.innerHTML=`<section class="tr-room" aria-label="Trade negotiation room"><header class="tr-room-head"><div><small>DFL DEAL ROOM</small><h2>${selected?'Offer #'+esc(selected.id):'Make your move.'}</h2></div><button type="button" class="btn ghost small" data-tr-action="refresh" ${busy?'disabled':''}>Refresh</button></header>
  ${error?`<p class="tr-error" role="alert">${esc(error)}</p>`:''}
  ${selected?detail():`<div class="tr-tabs" aria-label="Offer list"><button type="button" data-tr-action="active" aria-pressed="${filter==='active'}">Open (${rows.filter(r=>['pending','draft'].includes(r.status)).length})</button><button type="button" data-tr-action="closed" aria-pressed="${filter==='closed'}">Closed (${rows.filter(r=>!['pending','draft'].includes(r.status)).length})</button></div>
  ${!loaded?'<p role="status">Loading offers…</p>':!visible.length?'<div class="tr-empty"><strong>No offers here yet.</strong><button type="button" class="btn ghost small" data-tr-action="new">Build an offer</button></div>':`<div class="tr-list">${visible.map(r=>`<article class="tr-offer"><button type="button" class="tr-open" data-tr-action="open" data-tr-id="${esc(r.id)}"><span class="tr-status" data-status="${esc(r.status)}">${esc(negotiationStatus(r,mine()))}</span><strong>${esc(r.proposal.teamIds.map(id=>name(data().teams.find(t=>String(t.id)===String(id)))).join(' ↔ '))}</strong><small>${esc(date(r.updated_at))} · #${esc(r.id)}</small><svg class="ico tr-open-arrow" aria-hidden="true"><use href="#i-chev-right"></use></svg></button>${negotiationPackage(r.proposal,data())}</article>`).join('')}</div>`}`}</section>`;
  host.querySelectorAll('details').forEach((d,i)=>{if(openDetails[i])d.open=true;});
  if(focusKey)host.querySelector(`[data-tr-action="${CSS.escape(focusKey)}"]`)?.focus({preventScroll:true});
 }
 function detail(){
  const valid=healthy(selected),deal=valid?negotiationDeal(selected.proposal,data(),member):null,available=actions(),url=negotiationSleeperUrl(selected);
  const terms=(selected.events||[]).filter(e=>e.proposal),events=selected.events||[];
  return `<button type="button" class="linkbtn tr-back" data-tr-action="back">← All offers</button><div class="tr-detail" data-status="${esc(selected.status)}"><div class="tr-detail-status"><strong>${esc(negotiationStatus(selected,mine()))}</strong><span>v${selected.revision}</span></div>${negotiationPackage(selected.proposal,data())}
  ${deal?`<div class="tr-balance"><span>Current balance</span><b>${Math.round(deal.result.fairness)}%</b></div>`:'<p class="tr-error">Rosters changed. Rebuild this offer.</p>'}
  ${selected.status==='pending'||selected.status==='agreed'?`<ul class="tr-agreements">${selected.member_ids.map(id=>`<li><span>${esc(actor(id))}</span><b>${selected.accepted_ids.map(String).includes(String(id))?'Agreed':'Waiting'}</b></li>`).join('')}</ul>`:''}
  <div class="tr-actions">${available.map(action=>`<button type="button" class="btn ${['accept','send'].includes(action)?'':'ghost'} small" data-tr-action="${action}" ${busy||(!valid&&['accept','send','counter','edit'].includes(action))?'disabled':''}>${{edit:'Edit draft',send:'Send offer',remove:'Remove draft',counter:'Build counter',accept:'Agree in DFL',decline:'Pass',withdraw:'Withdraw'}[action]}</button>`).join('')}${selected.status==='agreed'&&url?`<a class="btn small" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open Sleeper ↗</a>`:''}</div>${selected.status==='agreed'?'<p class="tr-handoff">Agreed in DFL · Complete the trade in Sleeper.</p>':''}</div>
  <details class="tr-history"><summary>Offer history (${events.length})</summary>${events.map(e=>{const before=terms.find(t=>t.revision<e.revision),changes=e.proposal&&before?negotiationChanges(before.proposal,e.proposal):[];return `<article><header><strong>${esc(labels[e.action]||e.action)}</strong><small>v${e.revision} · ${esc(date(e.created_at))}</small></header><span>${esc(actor(e.actor_id))}</span>${changes.length?`<ul>${changes.map(c=>`<li>${{added:'+',removed:'−',rerouted:'↪'}[c.kind]} ${esc(data().pool.get(c.id)?.name||c.id)}${c.kind==='removed'?'':` → ${esc(name(data().teams.find(t=>String(t.id)===c.to)))}`}</li>`).join('')}</ul>`:''}${e.proposal?`<details><summary>View full package</summary>${negotiationPackage(e.proposal,data())}</details>`:''}</article>`}).join('')}</details>`;
 }
 async function getApi(){if(!api)api=await createApi(member);return api;}
 async function refresh({id=selected?.id,quiet=false}={}){
  if(!member||busy||stopped)return;const at=++sequence;
  let changed=false;busy=true;
  if(!quiet){error='';paint();}
  try{const client=await getApi(),next=await client.list(),detail=id?await client.read(id):null;if(!alive()||at!==sequence)return;changed=JSON.stringify([rows,selected])!==JSON.stringify([next,detail]);rows=next;selected=detail;loaded=true;locked=false;error='';}
  catch(e){if(!alive()||at!==sequence)return;error=e.message||'Could not load offers.';locked=e.code==='42501'&&/unlock/i.test(error);}
  finally{if(alive()&&at===sequence){busy=false;if(!quiet||changed||error)paint();}}
 }
 async function command(action,{room=selected,proposal=null,requestId=null}={}){
  if(busy||stopped)return;busy=true;error='';paint();
  try{const result=await (await getApi()).command(action,{room,proposal,season:data().projectionSeason,requestId});if(!alive())return;editing=null;selected=result.removed?null:result;busy=false;onRoom();await refresh({id:selected?.id});toast({save:'Draft saved',send:'Offer sent',counter:'Counter sent',accept:'Agreement saved',decline:'Offer declined',withdraw:'Offer withdrawn',remove:'Draft removed'}[action]);}
  catch(e){if(!alive())return;busy=false;error=e.message||'Could not save offer.';paint();throw e;}
 }
 async function compose(){
  const deal=getDeal();if(!member)return toast('Choose your profile first.',true);if(!deal)return;
  if(!member.sleeper_user_id||!deal.parties.some(t=>String(t.sleeper_user_id)===String(member.sleeper_user_id)))return toast('Build an offer that includes your team.',true);
  let needsPin=false;
  try{needsPin=await (await getApi()).needsPin();}catch(e){toast(e.message||'Could not check profile access.',true);return;}
  if(!alive())return;
  const proposal=negotiationProposal(deal),context=editing,requestIds={};closeDialog();
  dialog=document.createElement('dialog');dialog.className='tr-compose';dialog.setAttribute('aria-labelledby','tr-compose-title');
  dialog.innerHTML=`<form><header><h2 id="tr-compose-title">${context?.status==='pending'?'Send counter':'Your offer'}</h2><button type="button" class="btn ghost small" data-tr-dismiss aria-label="Close offer">×</button></header>${negotiationPackage(proposal,data())}${needsPin?'<label>Profile PIN<input name="pin" type="password" inputmode="numeric" pattern="[0-9]{4,6}" maxlength="6" autocomplete="one-time-code" required></label>':''}<p class="tr-compose-error" role="alert" hidden></p><footer>${context?.status==='pending'?'':`<button type="submit" class="btn ghost" name="action" value="save">Save draft</button>`}<button type="submit" class="btn" name="action" value="${context?.status==='pending'?'counter':'send'}">${context?.status==='pending'?'Send counter':'Send offer'}</button></footer></form>`;
  const opener=document.activeElement;document.body.append(dialog);dialog.showModal();
  const node=dialog;
  node.querySelector('[data-tr-dismiss]').onclick=()=>{closeDialog();if(opener?.isConnected)opener.focus({preventScroll:true});};
  node.addEventListener('cancel',e=>{e.preventDefault();if(!busy){closeDialog();if(opener?.isConnected)opener.focus({preventScroll:true});}});
  node.querySelector('form').onsubmit=async e=>{
   e.preventDefault();if(busy)return;const action=e.submitter?.value||(context?.status==='pending'?'counter':'save');
   node.querySelectorAll('button').forEach(b=>b.disabled=true);
   try{if(needsPin)await (await getApi()).unlock(node.querySelector('input[name="pin"]').value);requestIds[action]??=crypto.randomUUID();await command(action,{room:context,proposal,requestId:requestIds[action]});closeDialog();host?.querySelector('.tr-back,[data-tr-action="refresh"]')?.focus({preventScroll:true});}
   catch(err){if(node.isConnected){const p=node.querySelector('[role="alert"]');p.textContent=err.message||'Could not send offer.';p.hidden=false;node.querySelectorAll('button').forEach(b=>b.disabled=false);}}
  };
 }
 function closeDialog(){dialog?.close();dialog?.remove();dialog=null;}
 async function click(e){
  const button=e.target.closest('[data-tr-action]');if(!button||busy)return;
  const action=button.dataset.trAction;
  if(action==='refresh')return refresh();
  if(action==='back'){selected=null;paint();if(listOrigin){window.scrollTo({top:listOrigin.y,behavior:'instant'});host.querySelector(`[data-tr-id="${CSS.escape(String(listOrigin.id))}"]`)?.focus({preventScroll:true});}return;}
  if(action==='active'||action==='closed'){filter=action;selected=null;paint();return;}
  if(action==='open'){listOrigin={id:button.dataset.trId,y:window.scrollY};await refresh({id:button.dataset.trId});host?.scrollIntoView({block:'start',behavior:'instant'});host?.querySelector('.tr-back')?.focus({preventScroll:true});return;}
  if(action==='new'){editing=null;onEdit(null);return;}
  if(action==='counter'||action==='edit'){
   const deal=negotiationDeal(selected.proposal,data(),member);if(!deal)return;
   editing=selected;onEdit(deal);return;
  }
  if(action==='send'){editing=selected;onEdit(negotiationDeal(selected.proposal,data(),member));return compose();}
  try{await command(action);}catch(e){toast(e.message||'Could not update offer.',true);if(e.code==='40001')await refresh();}
 }
 async function unlock(e){if(!e.target.matches('.tr-unlock'))return;e.preventDefault();if(busy)return;const value=e.target.elements.namedItem('pin').value;busy=true;try{await (await getApi()).unlock(value);locked=false;error='';}catch(e){error=e.message||'Could not unlock offers.';}busy=false;if(!locked)await refresh();else paint();}
 function mount(next){if(host!==next){host?.removeEventListener('click',click);host?.removeEventListener('submit',unlock);host=next;host?.addEventListener('click',click);host?.addEventListener('submit',unlock);}if(!host)return;paint();if(!loaded&&!busy&&!locked)void refresh();}
 const timer=setInterval(()=>{if(host?.isConnected&&!document.hidden&&!busy&&!dialog&&!host.contains(document.activeElement))void refresh({quiet:true});},30000);
 return {mount,compose,clearEdit:()=>{editing=null;},editing:()=>editing,stop(){stopped=true;sequence++;clearInterval(timer);host?.removeEventListener('click',click);host?.removeEventListener('submit',unlock);closeDialog();host=null;api=null;rows=[];selected=null;editing=null;}};
}
