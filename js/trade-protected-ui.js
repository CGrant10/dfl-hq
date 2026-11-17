import {esc} from './ui.js';
import {playerIdentity} from './player-presentation.js';
import {mountMobileSheet} from './mobile-sheet.js';
import {protectedPlayerIds} from './trade-protected-players.js';

export function protectedPlayersButton(ids=[]){
 const count=new Set(ids.map(String)).size;
 return `<button type="button" class="tb-protected-button" data-tb-protected aria-haspopup="dialog" aria-label="Don’t trade: ${count} players excluded"><span>Don’t trade</span><b data-tb-protected-count>${count}</b></button>`;
}
export function openProtectedPlayers({source,root,team,pool,ids=[],onChange}){
 const dialog=document.createElement('dialog');dialog.className='trade-protected-sheet';dialog.setAttribute('aria-labelledby','trade-protected-title');
 const players=(team.playerIds||[]).map(id=>pool.get(String(id))).filter(p=>p&&['QB','RB','WR','TE'].includes(p.position)).sort((a,b)=>['QB','RB','WR','TE'].indexOf(a.position)-['QB','RB','WR','TE'].indexOf(b.position)||(Number(b.tradeValue)||0)-(Number(a.tradeValue)||0));
 const staged=new Set(protectedPlayerIds(ids,team));let stopped=false,sheet;
 dialog.innerHTML='<header><h2 id="trade-protected-title">Don’t trade</h2><button type="button" data-protected-close>Close</button></header><div class="trade-protected-search"><label class="sr-only" for="protected-search">Search your roster</label><input id="protected-search" type="search" placeholder="Search your roster" autocomplete="off" maxlength="80"><p data-protected-status role="status"></p></div><div data-sheet-body><div class="trade-protected-list"></div></div><footer><button type="button" class="linkbtn" data-protected-clear>Clear all</button><button type="button" class="btn" data-protected-save>Save</button></footer>';
 document.body.append(dialog);
 const count=()=>{dialog.querySelector('[data-protected-status]').textContent=`${staged.size} excluded from offers`;dialog.querySelector('[data-protected-save]').textContent=`Save (${staged.size})`};
 const draw=()=>{
  const query=dialog.querySelector('input[type=search]').value.trim().toLowerCase(),rows=players.filter(p=>[p.name,p.position,p.nflTeam].join(' ').toLowerCase().includes(query));
  dialog.querySelector('.trade-protected-list').innerHTML=rows.length?rows.map(p=>`<label class="trade-protected-player"><span>${playerIdentity({...p,injuryStatus:''},{portraitSize:28,detail:[p.position,p.nflTeam].filter(Boolean).join(' · ')})}</span><input type="checkbox" data-protected-player="${esc(p.id)}"${staged.has(String(p.id))?' checked':''} aria-label="Keep ${esc(p.name)} out of offers"></label>`).join(''):'<p class="trade-protected-empty">No matching players.</p>';
  count();
 };
 const stop=()=>{if(stopped)return;stopped=true;sheet.stop();dialog.remove()};
 sheet=mountMobileSheet(dialog,{onClosed:stop,restoreFocus:()=>{const target=source?.isConnected?source:root.querySelector('[data-tb-protected]');if(target?.isConnected)target.focus({preventScroll:true})}});
 dialog.querySelector('[data-protected-close]').onclick=()=>sheet.close();
 dialog.querySelector('input[type=search]').addEventListener('input',draw);
 dialog.addEventListener('change',event=>{const input=event.target.closest('[data-protected-player]');if(!input)return;if(input.checked)staged.add(input.dataset.protectedPlayer);else staged.delete(input.dataset.protectedPlayer);count()});
 dialog.querySelector('[data-protected-clear]').onclick=()=>{staged.clear();draw()};
 dialog.querySelector('[data-protected-save]').onclick=()=>{if(stopped)return;const selected=[...staged];sheet.close({immediate:true});onChange(selected)};
 draw();sheet.open({source});return stop;
}
