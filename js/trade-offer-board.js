import {patchGameDay} from './game-day-dom.js';
import {animateUi} from './ui-motion.js';
import {esc,toast} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {tradePerspective} from './trade-routing.js';
import {tradeAssessment} from './trade-assessment.js';
import {mountMobileSheet} from './mobile-sheet.js';
import {openTradeReplacement} from './trade-player-picker.js';
import {automaticTradePlayer} from './player-availability.js';
import {boardOfferDeal,boardDealKey,boardProposal,replaceBoardPlayer,restoreBoardChoice} from './trade-offer-board-model.js';
const name=t=>t.team_name||t.ownerName||`Team ${t.id}`;
const signed=n=>Number.isFinite(Number(n))?`${n>0?'+':n<0?'−':''}${Math.abs(Number(n)).toFixed(1)}`:'—';
const label=deal=>deal.parties.slice(1).map(name).join(' + ');
const metric=(title,value)=>`<div><dt>${title}</dt><dd>${esc(value)}</dd></div>`;
function figures(deal){const p=tradePerspective(deal.result),a=tradeAssessment(p);return `<dl class="tob-metrics">${metric(deal.parties.length>2?'Group balance':'Value balance',Math.round(deal.result.fairness)+'%')}${metric('Lineup · ROS/wk',signed(p.weeklyDeltaA))}${metric('Depth · ROS/wk',signed(p.depthDeltaA))}</dl>`}
function risks(deal,pool){const p=tradePerspective(deal.result),a=tradeAssessment(p),drops=p.requiredDropsA||[];return `${drops.length?`<p class="tob-risk">Drop: ${esc(drops.map(id=>pool.get(String(id))?.name||id).join(', '))}</p>`:''}${a.flags.length?`<p class="tob-risk">${esc(a.flags.join(' · '))}</p>`:''}`}
function players(ids,pool,{deal,owner,editable=false,locked=[]}={}){
 return `<ul class="tob-players">${ids.map(id=>{const p=pool.get(String(id));const to=deal?.parties.length>2?deal.parties.find(t=>String(t.id)===String(deal.destinations[id])):null;return `<li>${p?playerPortrait(p):''}<div><strong>${esc(p?.name||id)}</strong><small>${esc([p?.position,p?.nflTeam].filter(Boolean).join(' · '))}${to?` · → ${esc(name(to))}`:''}</small></div>${editable?`<button type="button" data-tob-swap="${esc(id)}" data-owner="${owner}" ${locked.map(String).includes(String(id))?'disabled':''} aria-label="Replace ${esc(p?.name||id)}">Swap</button>`:''}</li>`}).join('')}</ul>`;
}
function packages(deal,pool,editable=false,locked=[]){return `<div class="tob-packages">${deal.parties.map((t,i)=>`<section><h3>${esc(i===0?'You send':deal.parties.length===2?'You get':name(t)+' sends')} <small>${deal.sends[i].length}</small></h3>${players(deal.sends[i],pool,{deal,owner:i,editable,locked})}</section>`).join('')}</div>`}

export function mountTradeOfferBoard(root,{getData,getMine,getOffer,getRestrictions=()=>({}),onUse}={}){
 let stopped=false,choices=[],dialog=null,sheet=null,draft=null,origin=null,stopPicker=()=>{},ownerId=String(getMine()?.id),kind='',lastSlot=null,lastTray='';
 const valid=()=>!stopped&&root.isConnected;
 const restore=choice=>{const d=getData();return restoreBoardChoice(choice,getMine(),d.teams,d.pool)};
 const close=()=>{stopPicker();stopPicker=()=>{};sheet?.close()};
 const stopDialog=()=>{stopPicker();stopPicker=()=>{};sheet?.stop();dialog?.remove();sheet=null;dialog=null;draft=null};
 const sync=()=>{
  if(!valid())return;
  const currentOwner=String(getMine()?.id);if(currentOwner!==ownerId){ownerId=currentOwner;choices=[];stopDialog()}
  const slot=root.querySelector('[data-tb-board-tools]');if(slot){slot.hidden=!choices.length;const markup=choices.length?`<div class="tob-tray"><span>${choices.length} / 2 selected</span><button type="button" data-tob-open ${choices.length<2?'disabled':''}>Compare offers</button><button type="button" data-tob-clear>Clear</button></div>`:'';if(slot!==lastSlot||markup!==lastTray){slot.innerHTML=markup;lastSlot=slot;lastTray=markup}}
  for(const card of root.querySelectorAll('[data-offer-key]')){const b=card.querySelector('[data-tob-compare]');if(b){const on=choices.some(c=>c.originKey===card.dataset.offerKey);b.setAttribute('aria-pressed',String(on));b.textContent=on?'Selected':'Compare'}}
 };
 const add=(deal,originKey=null,toggle=true)=>{const choice={...boardProposal(deal),originKey},index=choices.findIndex(c=>c.id===choice.id);if(index>=0){if(!toggle)return true;choices.splice(index,1);}else{if(choices.length>=2){toast('Two offers selected. Clear one to compare another.',true);return false}choices.push(choice)}sync();return true};
 const paint=()=>{
  if(!dialog)return;const {pool}=getData(),body=dialog.querySelector('[data-sheet-body]');
  if(kind==='edit'){
   const a=tradeAssessment(tradePerspective(draft.result));
   patchGameDay(body,`<div class="tob-verdict"><b>${esc(a.price.headline)}</b><span>${esc({fair:'Fair',aggressive:'Aggressive',steal:'Steal'}[a.tier])}</span></div>${packages(draft,pool,true,getRestrictions().locked||[])}${figures(draft)}${risks(draft,pool)}<div class="tob-editor-actions"><button type="button" data-tob-use>Review this offer</button><button type="button" data-tob-add-edit>Add to comparison</button><button type="button" data-tob-reset>Reset</button></div>`);
  }else{
   const deals=choices.map(restore);
   patchGameDay(body,`<div class="tob-comparison">${choices.map((choice,i)=>{const d=deals[i],a=d&&tradeAssessment(tradePerspective(d.result));return `<section><header><small>Offer ${i+1}</small><h3>${esc(d?label(d):'Roster changed')}</h3><button type="button" data-tob-remove="${i}" aria-label="Remove offer ${i+1}">Remove</button></header>${d?`<div class="tob-verdict"><b>${esc(a.price.headline)}</b><span>${esc({fair:'Fair',aggressive:'Aggressive',steal:'Steal'}[a.tier])}</span></div><h4>You send</h4>${players(d.sends[0],pool)}<h4>You get</h4>${players(d.receives[0],pool)}${figures(d)}<div class="tob-risks">${risks(d,pool)}</div>${d.parties.length>2?`<details class="tob-routing"><summary>All ${d.parties.length} teams</summary>${packages(d,pool)}</details>`:'<div></div>'}<div class="tob-editor-actions"><button type="button" data-tob-review="${i}">Review offer</button><button type="button" data-tob-edit-choice="${i}">Edit players</button></div>`:'<p class="tob-risk">Refresh offers to rebuild this package.</p>'}</section>`}).join('')}</div>`);
  }
 };
 const show=(type,source)=>{
  stopDialog();kind=type;dialog=document.createElement('dialog');dialog.className='trade-offer-sheet';dialog.setAttribute('aria-labelledby','trade-offer-sheet-title');dialog.innerHTML=`<header><h2 id="trade-offer-sheet-title">${type==='edit'?'Edit offer':'Compare offers'}</h2><button type="button" data-tob-close>Close</button></header><div class="tob-body" data-sheet-body></div>`;
  document.body.append(dialog);sheet=mountMobileSheet(dialog,{onClosed:()=>{stopPicker();draft=null;},restoreFocus:()=>{if(source?.isConnected&&!source.disabled)source.focus({preventScroll:true});else (root.querySelector('[data-tob-open]:not([disabled])')||root.querySelector('[data-tob-clear]')||root.querySelector('[data-tob-compare]'))?.focus({preventScroll:true})}});
  dialog.addEventListener('click',event=>{
   const button=event.target.closest('button');if(!button)return;
   const data=getData();
   if(button.hasAttribute('data-tob-close'))return close();
   if(button.hasAttribute('data-tob-swap')){
    const owner=Number(button.dataset.owner),old=button.dataset.tobSwap,restriction=getRestrictions(),selected=draft.sends.flat(),team=draft.parties[owner];
    stopPicker=openTradeReplacement(button,{root:dialog,pool:data.pool,selected,team:{...team,playerIds:team.playerIds.filter(id=>{const p=data.pool.get(String(id));return p&&automaticTradePlayer(p)&&(!restriction.positions||restriction.positions.includes(p.position))})},onSelect:id=>{
     if(!valid()||!draft)return null;const next=replaceBoardPlayer(draft,owner,old,id,getData().pool,restriction);if(!next){toast('That replacement is no longer available.',true);return button}
     draft=next;paint();const target=dialog.querySelector(`[data-tob-swap="${CSS.escape(id)}"]`);animateUi(target?.closest('li'),[{opacity:.6},{opacity:1}],{duration:160});return target;
    }});return;
   }
   if(button.hasAttribute('data-tob-reset')){draft=restore(origin);if(draft)paint();else close();return;}
   if(button.hasAttribute('data-tob-add-edit')){if(add(draft,boardDealKey(draft)===origin.id?origin.originKey:null,false)){button.textContent='Selected';button.disabled=true}return;}
   if(button.hasAttribute('data-tob-use')||button.hasAttribute('data-tob-review')){const d=button.hasAttribute('data-tob-use')?draft:restore(choices[Number(button.dataset.tobReview)]);if(!d){toast('Rosters changed. Refresh offers.',true);return}const key=button.hasAttribute('data-tob-use')?origin.originKey:choices[Number(button.dataset.tobReview)]?.originKey;sheet.close({immediate:true});onUse(d,key);return;}
   if(button.hasAttribute('data-tob-remove')){choices.splice(Number(button.dataset.tobRemove),1);sync();if(choices.length)paint();else close();return;}
   if(button.hasAttribute('data-tob-edit-choice')){const choice=choices[Number(button.dataset.tobEditChoice)],d=restore(choice);if(!d)return;kind='edit';origin=choice;draft=d;dialog.querySelector('h2').textContent='Edit offer';paint();}
  });
  return source;
 };
 const edit=(deal,source,key)=>{show('edit',source);draft=deal;origin={...boardProposal(deal),originKey:key};paint();sheet.open({source})};
 const click=event=>{
  const button=event.target.closest('[data-tob-compare],[data-tob-edit],[data-tob-open],[data-tob-clear]');if(!button||!valid())return;
  if(button.hasAttribute('data-tob-clear')){choices=[];sync();return;}
  if(button.hasAttribute('data-tob-open')){if(choices.length===2){show('compare',button);paint();sheet.open({source:button})}return;}
  const key=button.closest('[data-offer-key]')?.dataset.offerKey,offer=getOffer(key),d=getData(),deal=offer&&boardOfferDeal(offer,getMine(),d.teams,d.pool);
  if(!deal){toast('Rosters changed. Refresh offers.',true);return;}
  if(button.hasAttribute('data-tob-compare'))add(deal,key);else edit(deal,button,key);
 };
 root.addEventListener('click',click);
 return {sync,stop(){stopped=true;root.removeEventListener('click',click);stopDialog();choices=[]}};
}
