import {esc,toast} from './ui.js';
import {db} from './supabase.js';
import {currentMember} from './members.js';
import {loadClubhouseIndex,loadMemberWeeklyAwards} from './weekly-clubhouse-data.js';
import {weeklyHref} from './weekly-clubhouse-model.js';
export function weeklyAwardsHtml(model){return model.awards.length?`<div class="clubhouse-awards">${model.awards.map(a=>`<article class="clubhouse-award"><small>${esc(a.label)}</small><strong>${a.winners.map(w=>w.memberId?`<a href="#/profile?id=${esc(w.memberId)}">${esc(w.name)}</a>`:esc(w.name)).join(' &amp; ')}</strong><span>${esc(a.detail)}</span>${a.key==='bench'?`<span>${a.winners.map(w=>esc(w.playerName)).join(' &amp; ')}</span>`:''}</article>`).join('')}</div>`:'<p class="muted">Awards appear after the week is final.</p>'}
export function weeklyVoteHtml(model){
 const me=currentMember(),mine=model.votes.find(v=>String(v.voter_id)===String(me?.id)),eligible=new Set(model.games.flatMap(g=>[String(g.user1),String(g.user2)])),choices=model.members.filter(m=>eligible.has(String(m.sleeper_user_id)));
 return `<section class="clubhouse-ballot"><h2>Clown of the Week</h2><p>The league decides. One vote per member; change or withdraw it until voting closes.</p><p class="muted tiny">${model.voteOpen?`Voting closes ${esc(new Date(model.voteClosesAt).toLocaleString())}.`:model.completed?'This ballot is closed.':'Voting opens after this week is final.'}</p><div data-weekly-vote-results>${weeklyVoteResults(model)}</div>${model.voteOpen&&me?`<form data-weekly-vote><label for="weekly-nominee">Your nominee</label><select id="weekly-nominee" name="nominee" required><option value="">Choose a member…</option>${choices.map(m=>`<option value="${m.id}" ${String(m.id)===String(mine?.nominee_id)?'selected':''}>${esc(m.display_name)}</option>`).join('')}</select><div class="clubhouse-actions"><button type="submit" class="btn">${mine?'Change vote':'Cast vote'}</button><button type="button" class="btn ghost" data-withdraw-vote ${mine?'':'hidden'}>Withdraw vote</button></div></form>`:model.voteOpen?'<p class="muted">Choose your profile to vote.</p>':''}<p role="status" data-weekly-vote-status></p></section>`;
}
export function weeklyVoteResults(model){const names=new Map(model.members.map(m=>[String(m.id),m.display_name]));return model.votes.length?`<ul class="clubhouse-votes">${[...model.counts].sort((a,b)=>b[1]-a[1]).map(([nominee,count])=>`<li><strong>${esc(names.get(nominee)||'Member')} · ${count} vote${count===1?'':'s'}</strong><span>${model.votes.filter(v=>String(v.nominee_id)===nominee).map(v=>esc(names.get(String(v.voter_id))||'Member')).join(', ')}</span></li>`).join('')}</ul>`:'<p class="muted">No votes yet.</p>'}
export function wireMatchupThreads(root,season,week){
 root.querySelectorAll('[data-matchup-thread]').forEach(button=>button.addEventListener('click',async()=>{
  if(!currentMember()){toast('Choose your profile to start a conversation',true);return}button.disabled=true;const old=button.textContent;button.textContent='Opening conversation…';
  try{const{data,error}=await db().rpc('clubhouse_open_thread',{p_season:Number(season),p_week:Number(week),p_matchup:Number(button.dataset.matchupThread)});if(error)throw error;location.hash=`#/wall?post=${Number(data)}`}catch{button.disabled=false;button.textContent=old;const status=button.parentElement.querySelector('[data-matchup-status]');if(status)status.textContent='Could not open this conversation. Try again.'}
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
