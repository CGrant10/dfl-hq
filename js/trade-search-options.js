import {esc} from './ui.js';
import {normalizeReceivePositions,setReceivePositions,receivePositionsMarkup} from './trade-receive-controls.js';
import {protectedPlayerIds,setProtectedPlayers} from './trade-protected-players.js';
import {offerPlayerLimit} from './trade-package-limits.js';
import {playerIdentity} from './player-presentation.js';
import {mountMobileSheet} from './mobile-sheet.js';
const goals=[['best','Best fit'],['starter','Upgrade a starter'],['consolidate','Depth for a stud'],['RB','RB help'],['WR','WR help'],['TE','TE help'],['QB','QB help']];
const count=value=>['1','2','3','4','5','6','7'].includes(String(value))?String(value):'any';
export function applyTradeOptions(shop,options,{team,pool}){
 setReceivePositions(shop,options.receivePositions,pool);
 setProtectedPlayers(shop,protectedPlayerIds(options.excludedSendIds,team),team);
 shop.goal=goals.some(([id])=>id===options.goal)&&(!['QB','RB','WR','TE'].includes(options.goal)||shop.receivePositions.includes(options.goal))?options.goal:'best';
 shop.horizon=options.horizon==='next4'?'next4':'season';
 shop.maxPlayers=offerPlayerLimit(options.maxPlayers,shop.sendAnchors,shop.receiveAnchors,2+(shop.memberIds?.length||0));
 shop.sendCount=count(options.sendCount);shop.receiveCount=count(options.receiveCount);
 for(const [field,anchors,opposite] of [['sendCount',shop.sendAnchors,shop.receiveAnchors],['receiveCount',shop.receiveAnchors,shop.sendAnchors]])if(shop[field]!=='any'&&(Number(shop[field])<anchors.length||Number(shop[field])+Math.max(1,opposite.length)+(shop.memberIds?.length||0)>shop.maxPlayers))shop[field]='any';
 if(shop.sendCount!=='any'&&shop.receiveCount!=='any'&&Number(shop.sendCount)+Number(shop.receiveCount)+(shop.memberIds?.length||0)>shop.maxPlayers)shop.receiveCount='any';
}
export function tradeOptionsChips(shop,pool){
 const positions=normalizeReceivePositions(shop.receivePositions),chips=[];
 if(positions.length<4)chips.push(['positions',positions.length?positions.join(' + '):'No positions']);
 if(shop.maxPlayers<8)chips.push(['size',`Up to ${shop.maxPlayers} players`]);
 if(shop.sendCount!=='any')chips.push(['sendCount',`Send ${shop.sendCount}`]);
 if(shop.receiveCount!=='any')chips.push(['receiveCount',`Get ${shop.receiveCount}`]);
 if(shop.horizon==='next4')chips.push(['horizon','Next 4 weeks']);
 if(shop.goal&&shop.goal!=='best')chips.push(['goal',goals.find(([id])=>id===shop.goal)?.[1]||shop.goal]);
 for(const id of shop.excludedSendIds||[])chips.push([`protect:${id}`,`Keep ${pool.get(String(id))?.name||id}`]);
 return chips;
}
export function tradeOptionsMarkup(shop,pool){
 const chips=tradeOptionsChips(shop,pool);
 return `<div class="tb-options-bar"><button type="button" class="btn ghost small" data-tb-options aria-haspopup="dialog">Filters${chips.length?` <b>${chips.length}</b>`:''}<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 5h14M3 15h14M7 2v6m6 4v6"/></svg></button></div>${shop.scheduleLoading?'<p class="tb-options-status" role="status">Checking schedules…</p>':shop.scheduleError?'<p class="tb-options-status" role="status">Schedules unavailable <button type="button" class="linkbtn" data-tb-retry-schedules>Retry</button></p>':''}<div class="tb-active-filters" data-tb-active-filters aria-label="Active trade filters">${chips.map(([key,label])=>`<button type="button" data-tb-remove-filter="${esc(key)}" aria-label="Remove filter: ${esc(label)}"><span data-ui-name>${esc(label)}</span><i aria-hidden="true">×</i></button>`).join('')}</div>`;
}
export function openTradeOptions({source,root,shop,team,pool,onApply}){
 const dialog=document.createElement('dialog');dialog.className='trade-protected-sheet trade-options-sheet';dialog.setAttribute('aria-labelledby','trade-options-title');
 const players=team.playerIds.map(id=>pool.get(String(id))).filter(p=>p&&['QB','RB','WR','TE'].includes(p.position)).sort((a,b)=>b.tradeValue-a.tradeValue);
 const protectedIds=new Set(protectedPlayerIds(shop.excludedSendIds,team));
 const minimum=offerPlayerLimit(2,shop.sendAnchors,shop.receiveAnchors,2+(shop.memberIds?.length||0));
 const counts=selected=>`<option value="any"${selected==='any'?' selected':''}>Any</option>${Array.from({length:7},(_,i)=>i+1).map(n=>`<option value="${n}"${String(selected)===String(n)?' selected':''}>${n}</option>`).join('')}`;
 dialog.innerHTML=`<header><h2 id="trade-options-title">Trade filters</h2><button type="button" data-options-cancel>Cancel</button></header><form><div data-sheet-body>
  <section class="trade-options-positions"><h3>Positions <small>Both sides</small></h3>${receivePositionsMarkup(shop.receivePositions)}</section>
  <section><label class="trade-options-goal">Trade goal<select name="goal">${goals.map(([id,label])=>`<option value="${id}"${shop.goal===id?' selected':''}>${label}</option>`).join('')}</select></label></section>
  <details class="trade-options-advanced"><summary><span>Package &amp; timing</span><small data-options-package-summary></small><i aria-hidden="true">⌄</i></summary><div class="trade-options-advanced-body">
   <label class="trade-options-size">Maximum players <output>${shop.maxPlayers}</output><input type="range" name="maxPlayers" min="${minimum}" max="8" step="1" value="${shop.maxPlayers}"></label>
   <div class="trade-options-split"><label>You send<select name="sendCount">${counts(shop.sendCount)}</select></label><label>You get<select name="receiveCount">${counts(shop.receiveCount)}</select></label></div>
   <label class="trade-options-horizon">Plan for<select name="horizon"><option value="season">Rest of season</option><option value="next4"${shop.horizon==='next4'?' selected':''}>Next 4 weeks</option></select></label>
  </div></details>
  <details class="trade-options-protected"><summary><span>Don’t trade</span><b data-options-kept>${protectedIds.size}</b><i aria-hidden="true">⌄</i></summary><label class="trade-options-search"><span class="sr-only">Search your roster</span><input type="search" placeholder="Search your roster" autocomplete="off"></label><div class="trade-protected-list">${players.map(p=>`<label class="trade-protected-player" data-options-name="${esc(p.name.toLowerCase())}"><span>${playerIdentity({...p,injuryStatus:''},{portraitSize:28,detail:[p.position,p.nflTeam].filter(Boolean).join(' · ')})}</span><input type="checkbox" data-options-protect="${esc(p.id)}"${protectedIds.has(String(p.id))?' checked':''} aria-label="Keep ${esc(p.name)} out of offers"></label>`).join('')}</div></details>
  <a class="trade-options-market" href="https://fantasycalc.com/database" target="_blank" rel="noopener noreferrer" aria-label="Open FantasyCalc trade database; choose 12 teams, one quarterback, full PPR and redraft">Real trades on FantasyCalc <span aria-hidden="true">↗</span></a>
 </div><footer><button type="button" class="linkbtn" data-options-reset>Reset</button><button type="submit" class="btn">Apply filters</button></footer></form>`;
 document.body.append(dialog);let stopped=false,submitted=false,sheet;
 const stop=()=>{if(stopped)return;stopped=true;sheet.stop();dialog.remove()};
 sheet=mountMobileSheet(dialog,{onClosed:stop,restoreFocus:()=>{const target=source?.isConnected?source:root.querySelector('[data-tb-options]');target?.focus({preventScroll:true})}});
 const form=dialog.querySelector('form'),positions=()=>[...dialog.querySelectorAll('[data-tb-receive-position]:checked')].map(el=>el.value);
 const sync=()=>{
  dialog.querySelector('output').textContent=form.elements.maxPlayers.value;dialog.querySelector('[data-options-kept]').textContent=dialog.querySelectorAll('[data-options-protect]:checked').length;
  for(const option of form.elements.goal.options)option.disabled=['QB','RB','WR','TE'].includes(option.value)&&!positions().includes(option.value);if(form.elements.goal.selectedOptions[0]?.disabled)form.elements.goal.value='best';
  const kept=new Set([...dialog.querySelectorAll('[data-options-protect]:checked')].map(el=>el.dataset.optionsProtect));
  const required=side=>(shop[side+'Anchors']||[]).filter(id=>positions().includes(pool.get(String(id))?.position)&&(side!=='send'||!kept.has(String(id)))).length;
  for(const [field,side,other,opposite] of [['sendCount','send','receiveCount','receive'],['receiveCount','receive','sendCount','send']]){
   const select=form.elements[field],otherCount=Number(form.elements[other].value)||Math.max(1,required(opposite));
   for(const option of select.options)option.disabled=option.value!=='any'&&(Number(option.value)<required(side)||Number(option.value)+otherCount+(shop.memberIds?.length||0)>Number(form.elements.maxPlayers.value));
   if(select.selectedOptions[0]?.disabled)select.value='any';
  }
  dialog.querySelector('[data-options-package-summary]').textContent=[`Up to ${form.elements.maxPlayers.value} players`,form.elements.sendCount.value!=='any'?`Send ${form.elements.sendCount.value}`:null,form.elements.receiveCount.value!=='any'?`Get ${form.elements.receiveCount.value}`:null,form.elements.horizon.value==='next4'?'Next 4 weeks':'Season'].filter(Boolean).join(' · ');
  for(const button of dialog.querySelectorAll('[data-tb-receive-preset]'))button.setAttribute('aria-pressed',String(button.dataset.tbReceivePreset==='all'?positions().length===4:positions().join(',')==='RB,WR'));
 };
 dialog.addEventListener('input',sync);dialog.addEventListener('change',sync);
 dialog.querySelector('input[type=search]').addEventListener('input',event=>{const text=event.target.value.trim().toLowerCase();for(const row of dialog.querySelectorAll('[data-options-name]'))row.hidden=!row.dataset.optionsName.includes(text)});
 dialog.addEventListener('click',event=>{const preset=event.target.closest('[data-tb-receive-preset]');if(preset){for(const input of dialog.querySelectorAll('[data-tb-receive-position]'))input.checked=preset.dataset.tbReceivePreset==='all'||['RB','WR'].includes(input.value);sync()}});
 dialog.querySelector('[data-options-cancel]').onclick=()=>sheet.close();
 dialog.querySelector('[data-options-reset]').onclick=()=>{form.reset();for(const row of dialog.querySelectorAll('[data-options-name]'))row.hidden=false;for(const input of dialog.querySelectorAll('[data-tb-receive-position]'))input.checked=true;for(const input of dialog.querySelectorAll('[data-options-protect]'))input.checked=false;Object.assign(form.elements.maxPlayers,{value:'8'});for(const name of ['sendCount','receiveCount'])form.elements[name].value='any';form.elements.goal.value='best';form.elements.horizon.value='season';sync()};
 form.onsubmit=event=>{event.preventDefault();if(stopped||submitted)return;submitted=true;const options=Object.fromEntries(new FormData(form));options.receivePositions=positions();options.excludedSendIds=[...dialog.querySelectorAll('[data-options-protect]:checked')].map(el=>el.dataset.optionsProtect);dialog.querySelector('[type=submit]').disabled=true;sheet.close();onApply(options)};
 sync();sheet.open({source});return stop;
}
