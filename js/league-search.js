import { trapFocus } from "./focus-trap.js";
import { db } from './supabase.js';
import { loadPlayers } from './sleeper.js';
import { esc } from './ui.js';

export function playerSearchResults(players, query) {
  const terms=String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);
  if(!terms.length)return [];
  return Object.entries(players).filter(([,player])=>terms.every(term=>`${player.n} ${player.p} ${player.t}`.toLowerCase().includes(term)))
    .sort(([,a],[,b])=>Number(b.s==='Active')-Number(a.s==='Active')||a.n.localeCompare(b.n)).slice(0,12)
    .map(([id,player])=>({kind:'Players',id,title:player.n,detail:`${player.p} · ${player.t} · Find available props`,url:`#/sportsbook?player=${encodeURIComponent(player.n)}`}));
}
export function mountLeagueSearch(){
  if(document.getElementById('league-search-button'))return;
  const button=document.createElement('button');button.id='league-search-button';button.className='notification-bell';button.type='button';button.setAttribute('aria-label','Search the league');button.title='Search the league (Ctrl/⌘ K)';button.textContent='⌕';
  document.getElementById('whoami')?.before(button);
  const dialog=document.createElement('dialog');dialog.className='league-search';dialog.setAttribute('aria-labelledby','league-search-title');
  dialog.innerHTML=`<header><h2 id="league-search-title">Search DFL</h2><button class="btn ghost small" type="button" data-search-close>Close</button></header><label for="league-search-input">Members, players, records and Wall posts</label><input id="league-search-input" type="search" maxlength="80" autocomplete="off" placeholder="Try a name, championship or old receipt"><p class="muted tiny" role="status" data-search-status>Type at least two characters. Ctrl/⌘ K opens search.</p><div data-search-results></div>`;
  document.body.append(dialog);
  const input=dialog.querySelector('input'),status=dialog.querySelector('[data-search-status]'),results=dialog.querySelector('[data-search-results]');
  let generation=0,timer,releaseFocus=null;
  const open=()=>{if(!dialog.open){dialog.showModal();releaseFocus=trapFocus(dialog,{initial:'#league-search-input'})}input.focus()};
  button.addEventListener('click',open);
  dialog.querySelector('[data-search-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();dialog.close()}});
  window.addEventListener('hashchange',()=>{if(dialog.open)dialog.close()});
  dialog.addEventListener('close',()=>{generation++;clearTimeout(timer);releaseFocus?.();releaseFocus=null;button.focus()});
  document.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();open()}});
  results.addEventListener('click',event=>{if(event.target.closest('a'))dialog.close()});
  input.addEventListener('input',()=>{clearTimeout(timer);const token=++generation,query=input.value.trim();results.replaceChildren();if(query.length<2){status.textContent='Type at least two characters.';return}status.textContent='Searching the league…';timer=setTimeout(async()=>{
    const groups=await Promise.allSettled([db().rpc('league_search',{search_text:query}).then(({data,error})=>{if(error)throw error;return data||[]}),loadPlayers().then(players=>playerSearchResults(players,query))]);
    if(token!==generation||!dialog.open)return;
    const rows=groups.flatMap(group=>group.status==='fulfilled'?group.value:[]),failed=groups.map((group,index)=>group.status==='rejected'?(index?'Players':'League results'):null).filter(Boolean);
    status.textContent=`${rows.length} result${rows.length===1?'':'s'}.${failed.length?` ${failed.join(' and ')} unavailable. Change your search to retry.`:rows.length?'':' Try another name or phrase.'}`;
    const kinds=[...new Set(rows.map(row=>row.kind))];
    results.innerHTML=kinds.map(kind=>`<section><h3>${esc(kind)}</h3><ul>${rows.filter(row=>row.kind===kind).map(row=>`<li><a href="${esc(row.url)}"><strong>${esc(row.title)}</strong><span>${esc(row.detail||'')}</span></a></li>`).join('')}</ul></section>`).join('');
  },200)});
}
