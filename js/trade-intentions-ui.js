import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {INTENTION_POSITIONS,INTENTION_LABELS,INTENTION_MAX_AGE,tradeIntentionContext} from './trade-intentions-model.js';
const name=t=>t?.team_name||t?.ownerName||'DFL team';
const motion=()=>!matchMedia('(prefers-reduced-motion: reduce)').matches&&document.documentElement.dataset.uiMotion!=='off';

export function createTradeIntentions({member,getData,onChange,onTarget,createApi=async m=>(await import('./trade-intentions-data.js')).tradeIntentionsApi(m)}){
 let host=null,rows=[],api=null,loaded=false,loading=false,stopped=false,error='',dialog=null,sequence=0,opener=null,closing=null,busy=false,lastContext='{}',sizeMotion=null,loadTask=null,opening=false;
 let teamId=null,draft=null,baseRevision=0,conflict=false,needsPin=false;
 const own=()=>member?.sleeper_user_id&&getData().teams.find(t=>String(t.sleeper_user_id)===String(member.sleeper_user_id));
 const record=t=>rows.find(r=>String(r.roster_id)===String(t?.id));
 const context=()=>tradeIntentionContext(rows,getData().teams,{season:getData().projectionSeason,leagueId:getData().league?.sleeper_league_id});
 const getApi=async()=>api||(api=await createApi(member));
 function paint(){
  if(!host||stopped)return;
  const team=own(),row=record(team),pref=team&&context()[String(team.id)],count=Object.keys(pref?.players||{}).length;
  const summary=error?'Intentions unavailable':!loaded?'Loading intentions…':pref?[count?`${count} player label${count===1?'':'s'}`:'No player labels',pref.needs.length?`Wants ${pref.needs.join(' / ')}`:''].filter(Boolean).join(' · '):row?'Refresh your intentions':'Set your trade intentions';
  const existing=host.querySelector('[data-ti-open]');
  if(existing){existing.querySelector('small').textContent=summary;existing.lastElementChild.innerHTML=`${error?'Retry':team?'Edit':'View'} <i aria-hidden="true">↗</i>`;return;}
  host.innerHTML=`<button type="button" class="ti-entry" data-ti-open><span><strong>Trade intentions</strong><small>${esc(summary)}</small></span><span>${error?'Retry':team?'Edit':'View'} <i aria-hidden="true">↗</i></span></button>`;
 }
 function refresh(){
  if(stopped)return Promise.resolve();if(loading)return loadTask;loading=true;const at=++sequence;
  loadTask=(async()=>{try{const next=await (await getApi()).list();if(stopped||at!==sequence)return;rows=next;loaded=true;error='';const nextContext=JSON.stringify(context());if(nextContext!==lastContext){lastContext=nextContext;onChange(context());}}
  catch(e){if(!stopped&&at===sequence)error=e.message||'Intentions unavailable';}
  finally{if(!stopped&&at===sequence){loading=false;paint();}}})();
  return loadTask;
 }
 function resetDraft(){const row=record(own()),owned=new Set((own()?.playerIds||[]).map(String));baseRevision=row?.revision||0;draft={players:Object.fromEntries(Object.entries(row?.players||{}).filter(([id,status])=>owned.has(id)&&Object.hasOwn(INTENTION_LABELS,status))),needs:(row?.needs||[]).filter(p=>INTENTION_POSITIONS.includes(p))};conflict=false;needsPin=false;}
 function content(){
  if(!dialog)return;
  const oldHeight=dialog.open?dialog.getBoundingClientRect().height:0;sizeMotion?.cancel();
  const data=getData(),team=data.teams.find(t=>String(t.id)===String(teamId))||data.teams[0],editable=own()&&String(team.id)===String(own().id);
  const pref=editable?draft:context()[String(team.id)],row=record(team),stale=row&&Date.now()-Date.parse(row.updated_at)>INTENTION_MAX_AGE;
  const players=team.playerIds.map(id=>data.pool.get(String(id))).filter(Boolean).sort((a,b)=>(b.tradeValue||0)-(a.tradeValue||0));
  const shown=editable?players:players.filter(p=>pref?.players?.[String(p.id)]);
  dialog.querySelector('[data-ti-content]').innerHTML=`${stale?`<p class="ti-notice">${editable?'Your labels expired. Save to confirm.':'This manager’s labels expired.'}</p>`:''}<fieldset class="ti-needs"><legend>Looking for</legend><div>${INTENTION_POSITIONS.map(p=>editable?`<button type="button" data-ti-need="${p}" aria-pressed="${draft.needs.includes(p)}">${p}</button>`:pref?.needs.includes(p)?`<span>${p}</span>`:'').join('')}${!editable&&!pref?.needs.length?'<span class="ti-unset">Not set</span>':''}</div></fieldset><div class="ti-players">${shown.map(p=>`<div class="ti-player">${playerPortrait(p)}<span><strong>${esc(p.name)}</strong><small>${esc([p.position,p.nflTeam].filter(Boolean).join(' · '))}</small></span>${editable?`<select data-ti-player="${esc(p.id)}" aria-label="Trade status for ${esc(p.name)}"><option value="">Not set</option>${Object.entries(INTENTION_LABELS).map(([v,label])=>`<option value="${v}"${draft.players[String(p.id)]===v?' selected':''}>${label}</option>`).join('')}</select>`:`<span class="ti-label" data-status="${esc(pref.players[String(p.id)])}">${INTENTION_LABELS[pref.players[String(p.id)]]}</span>`}</div>`).join('')||'<p class="ti-notice">No player labels yet.</p>'}</div>${!editable&&shown.some(p=>pref.players[String(p.id)]!=='keeping')?`<button type="button" class="btn ghost ti-shop" data-ti-shop>Find offers with this team →</button>`:''}`;
  const footer=dialog.querySelector('footer');footer.hidden=!editable;
  footer.innerHTML='<button type="button" class="btn ghost" data-ti-clear>Clear</button><button type="submit" class="btn" data-ti-save>Save intentions</button>';
  footer.querySelector('[data-ti-save]').disabled=conflict;
  dialog.querySelector('[data-ti-pin]').hidden=!editable||!needsPin;
  dialog.querySelector('[data-ti-reload]').hidden=!editable||!conflict;
  setError(editable&&conflict?'Your intentions changed. Reload before saving.':'');
  const nextHeight=dialog.getBoundingClientRect().height;
  if(oldHeight&&Math.abs(oldHeight-nextHeight)>1&&motion())sizeMotion=dialog.animate([{height:oldHeight+'px'},{height:nextHeight+'px'}],{duration:200,easing:'cubic-bezier(.2,.8,.2,1)'});
 }
 function setError(message){const node=dialog?.querySelector('[data-ti-error]');if(node){node.textContent=message;node.hidden=!message;}}
 function release(){sizeMotion?.cancel();sizeMotion=null;clearTimeout(closing);closing=null;const node=dialog;dialog=null;node?.close();node?.remove();if(opener?.isConnected)opener.focus({preventScroll:true});opener=null;}
 function close(){if(busy||closing||!dialog)return;if(motion()){dialog.classList.add('is-closing');closing=setTimeout(release,160);}else release();}
 async function open(){
  if(dialog||stopped||opening)return;opening=true;opener=document.activeElement;
  if(!loaded||error){await refresh();if(stopped){opening=false;return;}if(error){opening=false;paint();return;}}
  opening=false;
  resetDraft();teamId=own()?.id||getData().teams[0]?.id;
  dialog=document.createElement('dialog');dialog.className='ti-dialog';dialog.setAttribute('aria-labelledby','ti-title');
  dialog.innerHTML=`<form><header><h2 id="ti-title">Trade intentions</h2><button type="button" class="btn ghost small" data-ti-close aria-label="Close trade intentions">×</button></header><label class="ti-team">Team<select data-ti-team aria-label="View team intentions">${getData().teams.map(t=>`<option value="${esc(t.id)}"${String(t.id)===String(teamId)?' selected':''}>${esc(name(t))}${String(t.id)===String(own()?.id)?' · You':''}</option>`).join('')}</select></label><div class="ti-scroll" data-ti-content></div><div class="ti-feedback"><p data-ti-error role="alert" hidden></p><div data-ti-pin hidden><label>Profile PIN<input type="password" name="pin" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></label></div><button type="button" class="btn ghost small" data-ti-reload hidden>Reload latest intentions</button></div><footer></footer></form>`;
  const node=dialog;document.body.append(node);content();node.showModal();
  node.addEventListener('cancel',e=>{e.preventDefault();close();});
  node.addEventListener('change',e=>{
   if(e.target.matches('[data-ti-team]')){teamId=e.target.value;content();node.querySelector('.ti-scroll').scrollTop=0;return;}
   if(e.target.matches('[data-ti-player]')){const id=e.target.dataset.tiPlayer;if(e.target.value)draft.players[id]=e.target.value;else delete draft.players[id];}
  });
  node.addEventListener('click',async e=>{
   if(busy||closing)return;
   if(e.target.closest('[data-ti-close]')){close();return;}
   const need=e.target.closest('[data-ti-need]');if(need){const p=need.dataset.tiNeed;draft.needs=draft.needs.includes(p)?draft.needs.filter(n=>n!==p):[...draft.needs,p];need.setAttribute('aria-pressed',String(draft.needs.includes(p)));return;}
   if(e.target.closest('[data-ti-clear]')){draft={players:{},needs:[]};content();return;}
   if(e.target.closest('[data-ti-reload]')){await refresh();if(error){setError(error);return;}resetDraft();node.querySelector('[data-ti-pin]').hidden=true;node.querySelector('[data-ti-reload]').hidden=true;content();node.querySelector('[data-ti-team]').focus({preventScroll:true});return;}
   if(e.target.closest('[data-ti-shop]')){const target=teamId;release();onTarget(target);}
  });
  node.querySelector('form').addEventListener('submit',async e=>{
   e.preventDefault();if(busy||conflict||closing)return;busy=true;setError('');
   node.querySelectorAll('button,select,input').forEach(el=>el.disabled=true);
   const button=node.querySelector('[data-ti-save]');button.textContent='Saving…';node.setAttribute('aria-busy','true');
   try{
    const client=await getApi();if(needsPin)await client.unlock(node.querySelector('input[name=pin]').value);
    const data=getData(),saved=await client.save({season:data.projectionSeason,leagueId:data.league?.sleeper_league_id,revision:baseRevision,...draft});
    if(stopped||dialog!==node)return;
    rows=[...rows.filter(r=>String(r.member_id)!==String(member.id)),saved];loaded=true;error='';baseRevision=saved.revision;
    lastContext=JSON.stringify(context());onChange(context());paint();button.textContent='Saved';
    // Keep the frame stable through the acknowledgement, then ease away.
    busy=false;closing=setTimeout(()=>{closing=null;close();},240);
   }catch(err){
    if(stopped||dialog!==node)return;
    setError(err.message||'Could not save. Try again.');conflict=err.code==='40001';
    if(err.code==='42501'&&/unlock|PIN/i.test(err.message||'')){needsPin=true;node.querySelector('[data-ti-pin]').hidden=false;}
    node.querySelector('[data-ti-reload]').hidden=!conflict;
   }finally{
    if(!stopped&&dialog===node){busy=false;node.removeAttribute('aria-busy');if(!closing){node.querySelectorAll('button,select,input').forEach(el=>el.disabled=false);button.disabled=conflict;button.textContent='Save intentions';if(needsPin)node.querySelector('input[name=pin]').focus({preventScroll:true});}}
   }
  });
 }
 const click=()=>void open();
 const timer=setInterval(()=>{if(host?.isConnected&&!document.hidden&&!dialog)void refresh();},60000);
 return {mount(next){if(host!==next){host?.removeEventListener('click',click);host=next;host?.addEventListener('click',click);}paint();if(!loaded&&!loading)void refresh();},refresh,context,editing:()=>!!dialog,
  stop(){stopped=true;sequence++;clearInterval(timer);host?.removeEventListener('click',click);release();host=null;rows=[];api=null;}};
}
