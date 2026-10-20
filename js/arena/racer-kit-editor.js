import {esc,toast} from '../ui.js';
import {db} from '../supabase.js';
import {currentMember} from '../members.js';
import {verifiedPin,markMemberUnlocked} from '../member-lock.js';
import {loadMyRacerKit,saveMyRacerKit} from './stadium-data.js';
import {normalizeKit,applyKitPreset,KIT_PRESETS,SKIN_TONES,HELMETS} from './racer-kit-model.js';
import {drawKitRunner,loadRacerArt,onRacerArtReady} from './racer-kit-art.js';
import {enterSheet,exitSheet,mountSheetDrag} from '../sheet-drag.js';
const quickColors=[['DFL red','#bb2038'],['White','#ffffff'],['Black','#101820'],['Royal blue','#00338d'],['Forest green','#203731'],['Gold','#ffb612'],['Purple','#4f2683'],['Sky blue','#0085ca'],['Orange','#e86b24'],['Silver','#869397'],['Ivory','#eae2cf'],['Burgundy','#5a1414']];

export async function openRacerEditor({onSave=(_saved)=>{},motion=()=>true,initialKit=null,opener=null}={}){
 const member=currentMember();if(!member)return()=>{};
 const [record,lockResult]=await Promise.all([loadMyRacerKit(member.id),db().rpc('profile_lock_status',{target_member_id:member.id})]);
 let activeColor='helmet';
 let kit=normalizeKit(record?.kit??initialKit,{number:initialKit?.number??0}),revision=record?.revision||0,closed=false,raf=0,lastDraw=0,saving=false,stopDrag=null;
 const restoreFocus=opener||document.activeElement;
 const dialog=document.createElement('dialog');dialog.className='sr-kit-dialog';dialog.dataset.motion=motion()?'on':'off';dialog.setAttribute('aria-labelledby','sr-kit-title');
 dialog.innerHTML=`<form class="sr-kit-panel"><header><div><span class="sr-kicker">${esc(member.display_name)}</span><h2 id="sr-kit-title">My racer</h2></div><canvas class="sr-kit-mini" width="128" height="160" aria-hidden="true"></canvas><button type="button" data-kit-close aria-label="Close racer editor">×</button></header>
 <div class="sr-kit-preview"><canvas aria-label="Your animated football racer"></canvas><span data-kit-name></span><button type="button" data-preview-retry hidden>Retry preview</button></div>
 <fieldset class="sr-kit-groups"><legend class="sr-only">Kit collection</legend>${['DFL','NFL','Pokémon','Anime'].map(group=>`<button type="button" data-kit-group="${group}" aria-pressed="${group===(KIT_PRESETS.find(p=>p.id===kit.preset)?.group||'DFL')}">${group}</button>`).join('')}</fieldset>
 <label>Kit<select name="preset" aria-label="Racer kit preset"></select></label>
 <fieldset class="sr-kit-skin"><legend>Skin tone</legend>${SKIN_TONES.map(([name,color])=>`<button type="button" style="--tone:${color}" data-kit-skin="${color}" aria-label="${name}" aria-pressed="${kit.skin===color}"></button>`).join('')}</fieldset>
 <div class="sr-kit-fields"><label>Helmet<select name="helmetStyle">${HELMETS.map(([id,name])=>`<option value="${id}" ${id===kit.helmetStyle?'selected':''}>${name}</option>`).join('')}</select></label><label>Jersey number<input name="number" type="number" min="0" max="99" step="1" value="${kit.number}" inputmode="numeric" required></label></div>
 <fieldset class="sr-kit-colors"><legend>Uniform colors</legend><div class="sr-kit-parts">${[['helmet','Helmet'],['jersey','Jersey'],['pants','Pants'],['trim','Trim']].map(([key,name])=>`<input name="${key}" type="hidden" value="${kit[key]}"><button type="button" data-kit-part="${key}" aria-pressed="${key==='helmet'}"><strong>${name}</strong><i style="--tone:${kit[key]}" aria-hidden="true"></i></button>`).join('')}</div></fieldset>
 <div class="sr-kit-palette" aria-label="Quick uniform colors">${quickColors.map(([name,color])=>`<button type="button" data-kit-color="${color}" data-color-name="${name}" style="--tone:${color}" aria-label="Set helmet color to ${name}"></button>`).join('')}</div>
 <label class="sr-kit-custom"><span data-kit-custom-label>Custom helmet color</span><input name="uniformColor" type="color" value="${kit.helmet}"></label>
 <label class="sr-kit-pin" ${lockResult.data&&!verifiedPin(member.id)?'':'hidden'}>Profile PIN<input name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="one-time-code" pattern="[0-9]{4,6}"></label>
 <p class="sr-kit-error" role="alert" hidden></p><footer><button type="button" data-kit-reset>DFL original</button><button type="submit" class="sr-primary">Save racer</button></footer></form>`;
 document.body.append(dialog);const form=dialog.querySelector('form'),canvas=dialog.querySelector('.sr-kit-preview canvas'),ctx=canvas.getContext('2d');canvas.width=420;canvas.height=440;
 const header=form.querySelector('header'),syncHeader=()=>dialog.style.setProperty('--kit-header',`${Math.ceil(header.getBoundingClientRect().height)+6}px`),headerSize=new ResizeObserver(syncHeader);headerSize.observe(header);
 const mini=form.querySelector('.sr-kit-mini'),miniContext=mini.getContext('2d');
 const compact=()=>{const next=dialog.scrollTop>120;if(dialog.dataset.compact!==String(next)){dialog.dataset.compact=String(next);draw(performance.now(),true);}};
 dialog.addEventListener('scroll',compact,{passive:true});
 const field=name=>form.elements.namedItem(name),groupButtons=[...form.querySelectorAll('[data-kit-group]')];
 function sync(force=true){
  for(const key of ['helmet','jersey','pants','trim','number','helmetStyle'])field(key).value=kit[key];
  form.querySelectorAll('[data-kit-part]').forEach(button=>{button.setAttribute('aria-pressed',String(button.dataset.kitPart===activeColor));button.querySelector('i').style.setProperty('--tone',kit[button.dataset.kitPart]);});
  form.querySelector('.sr-kit-parts').style.setProperty('--kit-part',String(['helmet','jersey','pants','trim'].indexOf(activeColor)));
  field('uniformColor').value=kit[activeColor];form.querySelector('[data-kit-custom-label]').textContent=`Custom ${activeColor} color`;
  form.querySelectorAll('[data-kit-color]').forEach(button=>{button.setAttribute('aria-label',`Set ${activeColor} color to ${button.dataset.colorName}`);button.setAttribute('aria-pressed',String(button.dataset.kitColor===kit[activeColor]));});
  form.querySelectorAll('[data-kit-skin]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kitSkin===kit.skin)));
  const preset=KIT_PRESETS.find(p=>p.id===kit.preset),custom=preset&&['helmet','jersey','pants','trim','helmetStyle'].some(key=>preset[key]!==kit[key]);dialog.querySelector('[data-kit-name]').textContent=preset?`${preset.name}${custom?' · Custom':''}`:'Custom kit';draw(performance.now(),force);schedulePreview();
 }
 function group(name){groupButtons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.kitGroup===name)));dialog.querySelector('.sr-kit-groups').style.setProperty('--kit-slot',String(['DFL','NFL','Pokémon','Anime'].indexOf(name)));field('preset').innerHTML=`<option value="custom">Custom kit</option>`+KIT_PRESETS.filter(p=>p.group===name).map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');field('preset').value=KIT_PRESETS.some(p=>p.id===kit.preset&&p.group===name)?kit.preset:'custom';}
 function draw(now,force=false){
  if(closed||document.hidden)return;if(!force&&motion()&&now-lastDraw<50)return;lastDraw=now;
  ctx.clearRect(0,0,420,440);ctx.strokeStyle='#d6c17a20';ctx.lineWidth=2;for(const x of [48,210,372]){ctx.beginPath();ctx.moveTo(x,360);ctx.lineTo(x,425);ctx.stroke();}ctx.fillStyle='#0008';ctx.beginPath();ctx.ellipse(206,411,94,12,0,0,Math.PI*2);ctx.fill();
  const stride=motion()?Math.floor(now/110)%6:1;drawKitRunner(ctx,kit,{x:107,y:5,width:205,height:410,stride});
  if(dialog.dataset.compact==='true'){miniContext.clearRect(0,0,128,160);drawKitRunner(miniContext,kit,{x:24,y:0,width:80,height:158,stride});}
 }
 function schedulePreview(){if(!raf&&!closed&&!document.hidden&&motion())raf=requestAnimationFrame(animate);}
 function animate(now){raf=0;if(closed)return;draw(now);schedulePreview();}
 const stopArt=onRacerArtReady(()=>{if(!closed)draw(performance.now(),true);});
 const visibility=()=>{cancelAnimationFrame(raf);raf=0;if(!document.hidden&&!closed){draw(performance.now(),true);schedulePreview();}};
 document.addEventListener('visibilitychange',visibility);
 function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);headerSize.disconnect();stopArt();stopDrag?.stop?.();document.removeEventListener('visibilitychange',visibility);dialog.close();dialog.remove();if(restoreFocus?.isConnected)restoreFocus.focus({preventScroll:true});}
 const dismiss=()=>{if(!saving)exitSheet(dialog,close,{motion:motion()});};
 dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});dialog.querySelector('[data-kit-close]').onclick=dismiss;
 dialog.addEventListener('click',e=>{if(e.target===dialog&&!saving){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 groupButtons.forEach(b=>b.onclick=()=>group(b.dataset.kitGroup));
 field('preset').onchange=()=>{kit=field('preset').value==='custom'?{...kit,preset:'custom'}:applyKitPreset(kit,field('preset').value);sync();};
 function colorChange(key,value){kit={...kit,[key]:value,preset:kit.preset==='dfl'?'custom':kit.preset};if(kit.preset==='custom')field('preset').value='custom';sync(false);}
 form.querySelectorAll('[data-kit-part]').forEach(button=>button.onclick=()=>{activeColor=button.dataset.kitPart;sync(false);});
 field('uniformColor').oninput=()=>colorChange(activeColor,field('uniformColor').value);
 form.querySelectorAll('[data-kit-color]').forEach(button=>button.onclick=()=>colorChange(activeColor,button.dataset.kitColor));
 field('helmetStyle').onchange=()=>{kit={...kit,helmetStyle:field('helmetStyle').value};sync();};
 field('number').oninput=()=>{const value=Number(field('number').value);if(Number.isInteger(value)&&value>=0&&value<=99){kit={...kit,number:value};draw(performance.now(),true);}};
 form.querySelectorAll('[data-kit-skin]').forEach(b=>b.onclick=()=>{kit={...kit,skin:b.dataset.kitSkin};sync();});
 form.querySelector('[data-kit-reset]').onclick=()=>{kit=applyKitPreset(kit,'dfl');group('DFL');sync();};
 form.onsubmit=async e=>{
  e.preventDefault();if(saving)return;const error=form.querySelector('[role=alert]');error.hidden=true;const controls=[...form.querySelectorAll('button,input,select')];saving=true;controls.forEach(c=>c.disabled=true);
  try{
   if(String(currentMember()?.id)!==String(member.id))throw Error('Profile changed. Reopen your racer editor.');
   const pin=field('pin').value||verifiedPin(member.id),saved=await saveMyRacerKit(normalizeKit(kit),revision,pin);revision=saved.revision;if(pin)markMemberUnlocked(member.id,pin);
   await onSave(saved);toast('Racer saved.');close();
  }catch(err){error.textContent=err.message||'Could not save racer.';error.hidden=false;if(err.code==='42501'){form.querySelector('.sr-kit-pin').hidden=false;queueMicrotask(()=>field('pin').focus());}}
  finally{saving=false;controls.forEach(c=>c.disabled=false);}
 };
 const retry=form.querySelector('[data-preview-retry]');const loadPreview=async()=>{retry.hidden=true;const ready=await loadRacerArt();if(closed)return;retry.hidden=!ready?false:true;draw(performance.now(),true);};retry.onclick=()=>void loadPreview();
 group(KIT_PRESETS.find(p=>p.id===kit.preset)?.group||'DFL');dialog.showModal();syncHeader();dialog.querySelector('[data-kit-close]').focus();enterSheet(dialog,{motion:motion()});stopDrag=mountSheetDrag(dialog,{handle:header,canDismiss:()=>!saving,dismiss:close});sync();void loadPreview();schedulePreview();return close;
}
