import {esc,toast} from './ui.js';
import {db} from './supabase.js';
import {currentMember} from './members.js';
import {loadClubhouseIndex,loadMemberWeeklyAwards} from './weekly-clubhouse-data.js';
import {weeklyHref} from './weekly-clubhouse-model.js';
export function weeklyAwardsHtml(model){
 const units={'high-score':'points',blowout:'point margin',escape:'point margin',bench:'bench points',clown:'votes'};
 return model.awards.length?`<div class="clubhouse-awards">${model.awards.map(a=>`<article class="clubhouse-award is-${esc(a.key)}"><div class="clubhouse-award-label"><svg class="ico" aria-hidden="true"><use href="#i-record-steel"></use></svg><small>${esc(a.label)}</small></div><strong>${a.winners.map(w=>w.memberId?`<a href="#/profile?id=${esc(w.memberId)}">${esc(w.name)}</a>`:esc(w.name)).join(' &amp; ')}</strong><span class="clubhouse-award-metric">${esc(a.detail.match(/[\d.]+/)?.[0]||a.detail)}<small>${esc(units[a.key]||'')}</small></span>${a.key==='bench'?`<span class="clubhouse-award-player">${a.winners.map(w=>esc(w.playerName)).join(' &amp; ')}</span>`:''}${a.winners.length>1?'<span class="muted">Shared award</span>':''}</article>`).join('')}</div>`:'<div class="clubhouse-empty"><strong>The week is still playing out</strong><p>Final awards arrive after the NFL slate finishes, normally Tuesday morning. Matchup conversations are open now.</p></div>';
}
export function weeklyVoteHtml(model){
 const me=currentMember(),mine=model.votes.find(v=>String(v.voter_id)===String(me?.id)),eligible=new Set(model.games.flatMap(g=>[String(g.user1),String(g.user2)])),choices=model.members.filter(m=>eligible.has(String(m.sleeper_user_id)));
 return `<section class="card clubhouse-section clubhouse-ballot"><div class="clubhouse-heading"><div><small>LEAGUE VOTE</small><h2>Clown of the Week</h2></div><span class="clubhouse-status">${model.voteOpen?"Voting open":model.completed?"Closed":"Opens after final"}</span></div><p>Pick the member who earned the roast.</p><p class="muted tiny">${model.voteOpen?`Voting closes ${esc(new Date(model.voteClosesAt).toLocaleString())}.`:model.completed?'This ballot is closed.':'Voting opens after this week is final.'}</p><div data-weekly-vote-results>${weeklyVoteResults(model)}</div>${model.voteOpen&&me?`<form data-weekly-vote><label for="weekly-nominee">Your nominee</label><select id="weekly-nominee" name="nominee" required><option value="">Choose a member…</option>${choices.map(m=>`<option value="${m.id}" ${String(m.id)===String(mine?.nominee_id)?'selected':''}>${esc(m.display_name)}</option>`).join('')}</select><div class="clubhouse-actions"><button type="submit" class="btn">${mine?'Change vote':'Cast vote'}</button><button type="button" class="btn ghost" data-withdraw-vote ${mine?'':'hidden'}>Withdraw vote</button></div></form>`:model.voteOpen?'<p class="muted">Choose your profile to vote.</p>':''}<p role="status" data-weekly-vote-status></p><p class="clubhouse-footnote">One vote per member. Change or withdraw it while voting is open.</p></section>`;
}
export function weeklyVoteResults(model){const names=new Map(model.members.map(m=>[String(m.id),m.display_name]));return model.votes.length?`<ul class="clubhouse-votes">${[...model.counts].sort((a,b)=>b[1]-a[1]).map(([nominee,count])=>`<li><strong>${esc(names.get(nominee)||'Member')} · ${count} vote${count===1?'':'s'}</strong><span>${model.votes.filter(v=>String(v.nominee_id)===nominee).map(v=>esc(names.get(String(v.voter_id))||'Member')).join(', ')}</span></li>`).join('')}</ul>`:'<p class="muted">No votes yet.</p>'}
export function wireMatchupThreads(root,season,week){
 root.querySelectorAll('[data-matchup-thread]').forEach(button=>button.addEventListener('click',async()=>{
  if(!currentMember()){toast('Choose your profile to start a conversation',true);return}button.disabled=true;button.setAttribute('aria-busy','true');const old=button.textContent,status=button.closest('.clubhouse-matchup-card')?.querySelector('[data-matchup-status]');if(status)status.textContent='';button.textContent='Opening conversation…';
  try{const{data,error}=await db().rpc('clubhouse_open_thread',{p_season:Number(season),p_week:Number(week),p_matchup:Number(button.dataset.matchupThread)});if(error)throw error;location.hash=`#/wall?post=${Number(data)}`}catch{button.disabled=false;button.removeAttribute('aria-busy');button.textContent=old;if(status)status.textContent='Could not open this conversation. Try again.'}
 }));
}
export function memberWeeklyAwardsHtml(){return '<details class="clubhouse-profile-awards" data-member-weekly-awards><summary>Weekly award cabinet</summary><div data-weekly-cabinet><p class="muted" role="status">Open to load weekly awards.</p></div></details>'}
export function wireMemberWeeklyAwards(root,memberId){
 const details=root.querySelector('[data-member-weekly-awards]');if(!details)return;const slot=details.querySelector('[data-weekly-cabinet]');let loaded=false,generation=0;
 const start=async()=>{if(loaded)return;loaded=true;slot.innerHTML='<p role="status">Loading award seasons…</p>';
  try{const index=await loadClubhouseIndex();if(!slot.isConnected)return;const seasons=[...new Set(index.filter(w=>w.completed).map(w=>w.season))];if(!seasons.length){slot.innerHTML='<p>No completed weeks yet.</p>';return}
   slot.innerHTML=`<label for="weekly-cabinet-season">Award season</label><select id="weekly-cabinet-season">${seasons.map(s=>`<option>${s}</option>`).join('')}</select><div data-cabinet-results></div>`;
   const select=slot.querySelector('select'),results=slot.querySelector('[data-cabinet-results]');
   const load=async()=>{const token=++generation;results.innerHTML='<p role="status">Loading awards and historical weekly lineups…</p>';try{const result=await loadMemberWeeklyAwards(Number(select.value),memberId);if(token!==generation||!results.isConnected)return;results.innerHTML=result.awards.length?`<ul class="clubhouse-votes">${result.awards.map(a=>`<li><a href="${weeklyHref(select.value,a.week)}"><strong>Week ${a.week} · ${esc(a.label)}</strong><span>${esc(a.detail)}</span></a></li>`).join('')}</ul>`:'<p class="muted">No weekly awards in this season.</p>';if(result.unavailable)results.insertAdjacentHTML('beforeend',`<p class="muted tiny">Bench data unavailable for ${result.unavailable} week${result.unavailable===1?'':'s'}. Score and vote awards are still shown.</p>`)}catch{if(token!==generation||!results.isConnected)return;results.innerHTML='<p role="status">Awards could not load.</p><button type="button" class="btn ghost" data-cabinet-retry>Retry awards</button>';results.querySelector('button').addEventListener('click',load)}};
   select.addEventListener('change',load);void load();
  }catch{loaded=false;slot.innerHTML='<p role="status">Award seasons could not load.</p><button type="button" class="btn ghost">Retry</button>';slot.querySelector('button').addEventListener('click',start)}
 };
 details.addEventListener('toggle',()=>{if(details.open)void start()});
}

export function wireClubhouseTabs(root,initial='overview'){
 const tabs=[...root.querySelectorAll('[data-clubhouse-tab]')];
 const activate=(name,focus=false)=>{
  const selected=tabs.find(tab=>tab.dataset.clubhouseTab===name)||tabs[0];
  for(const tab of tabs){const on=tab===selected;tab.setAttribute('aria-selected',String(on));tab.tabIndex=on?0:-1;tab.classList.toggle('on',on);root.querySelector('#'+tab.getAttribute('aria-controls')).hidden=!on}
  if(focus)selected.focus();
  const params=new URLSearchParams(location.hash.split('?')[1]||'');params.set('tab',selected.dataset.clubhouseTab);history.replaceState(null,'',location.hash.split('?')[0]+'?'+params);
 };
 for(const tab of tabs){tab.addEventListener('click',()=>activate(tab.dataset.clubhouseTab));tab.addEventListener('keydown',event=>{const index=tabs.indexOf(tab);let next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();activate(tabs[next].dataset.clubhouseTab,true)})}
 activate(initial);
}
