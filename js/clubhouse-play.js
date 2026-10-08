import {matchupChirpHtml,clubhouseChirp} from './matchup-chirp-ui.js';
import {db} from './supabase.js';
import {currentMember} from './members.js';
import {esc,toast} from './ui.js';
import {loadLore} from './lore.js';
import {gradeCall} from './league-play-model.js';
import {shareFact} from './fact-share.js';
import {loadRivalryCalls,rivalryStoryHtml} from './rivalry-story.js';
import {rivalryShareFact} from './rivalry-story-model.js';
export async function mountRivalries(view,model,active=()=>view.isConnected){
 try{const [lore,calls]=await Promise.all([loadLore(),loadRivalryCalls(model.season,model.week).catch(()=>null)]);if(!active())return;
  model.chirpHistory=lore.matchups;
  for(const game of model.games){const chirp=view.querySelector(`[data-matchup-chirp="${game.matchup_id}"]`);if(chirp)chirp.innerHTML=matchupChirpHtml(clubhouseChirp(game,model));const host=view.querySelector(`[data-rivalry="${game.matchup_id}"]`);if(!host)continue;
   const input={history:lore.matchups,left:game.left,right:game.right,season:model.season,week:model.week,completed:model.completed,calls:(calls||[]).filter(c=>Number(c.matchup_id)===Number(game.matchup_id)),members:model.members};
   const storyMarkup=rivalryStoryHtml(input,{callsAvailable:calls!==null}),fact=rivalryShareFact(input);
   host.innerHTML=storyMarkup;
   if(!fact)continue;
   host.insertAdjacentHTML('beforeend','<button class="btn ghost small" type="button" data-rivalry-share>Share rivalry stats</button>');
   host.querySelector('[data-rivalry-share]').addEventListener('click',()=>{Promise.resolve(shareFact(fact)).then(result=>{if(result==='failed')toast('Could not share the rivalry stats',true);else if(result==='saved')toast('Rivalry image saved');else if(result==='copied')toast('Rivalry stats copied')})});
  }
 }catch{if(active())for(const host of view.querySelectorAll('[data-rivalry]'))host.textContent='Rivalry history is temporarily unavailable.'}
}
export async function mountWeeklyCalls(host,model){
 if(!host)return;let rows=[],standings=[],lock,busy=false;
 const load=async()=>{const[calls,deadline,board]=await Promise.all([db().from('dfl_weekly_calls').select('member_id,matchup_id,roster_id,kind').eq('season',model.season).eq('week',model.week),db().rpc('dfl_call_lock',{p_season:model.season,p_week:model.week}),db().rpc('dfl_call_standings',{p_season:model.season})]);if(calls.error||deadline.error||board.error)throw calls.error||deadline.error||board.error;rows=calls.data||[];standings=board.data||[];lock=Date.parse(deadline.data)};
 const paint=()=>{
  const actor=currentMember(),mine=rows.find(r=>String(r.member_id)===String(actor?.id)),open=!model.completed&&Date.now()<lock&&Date.now()>=Date.parse(model.endsAt||'')-7*86400000;
  // Deadline is authoritative on the server. The client also avoids offering future-week calls.
  const deadline=new Date(lock).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'});
  host.innerHTML=`<header class="play-heading"><div><small>WEEK ${model.week} · BRAGGING RIGHTS</small><h2>Call your shot</h2><p>Predict a matchup winner or the league’s highest-scoring team. ${model.completed?'The receipts are in.':`Locks ${esc(deadline)}.`}</p></div></header>
  ${open?`<form data-call-form><label for="weekly-call-kind">Your challenge</label><select id="weekly-call-kind"><option value="winner" ${mine?.kind!=='high-score'?'selected':''}>Matchup winner</option><option value="high-score" ${mine?.kind==='high-score'?'selected':''}>League high scorer</option></select><label for="weekly-call">Your team pick</label><select id="weekly-call" required><option value="">Choose a matchup winner</option>${model.games.flatMap(g=>[g.left,g.right].map(t=>`<option value="${g.matchup_id}:${t.roster}" ${Number(mine?.matchup_id)===Number(g.matchup_id)&&Number(mine?.roster_id)===Number(t.roster)?'selected':''}>${esc(t.name)} over ${esc((t===g.left?g.right:g.left).name)}</option>`)).join('')}</select><button type="submit" class="btn" ${actor?'':'disabled'}>${mine?'Change my call':'Save my call'}</button><p role="status" data-call-status>${actor?'One call per member. You can change it until kickoff.':'Choose your profile to make a call.'}</p></form>`:`<p class="muted">${model.completed?'Final results below.':'Calls are closed for this week. The next challenge opens Tuesday.'}</p>`}
  <div class="call-receipts">${rows.map(row=>{const game=model.games.find(g=>Number(g.matchup_id)===Number(row.matchup_id)),team=game&&[game.left,game.right].find(t=>Number(t.roster)===Number(row.roster_id)),grade=gradeCall(row,model.games,model.completed),member=model.members.find(m=>String(m.id)===String(row.member_id));return`<article><span><strong>${esc(member?.display_name||'Member')}</strong><small>${row.kind==='high-score'?'High scorer':'Winner'}: ${esc(team?.name||'a team')}</small></span><b class="call-grade">${esc(grade.label)}</b></article>`}).join('')||'<p class="muted">No calls recorded for this week.</p>'}</div><details class="play-board"><summary>Season prediction leaderboard</summary>${standings.length?`<ol class="play-leaderboard">${standings.map(r=>`<li><span>${esc(model.members.find(m=>String(m.id)===String(r.member_id))?.display_name||'Member')}</span><strong>${r.correct}/${r.played}<small> correct</small></strong></li>`).join('')}</ol>`:'<p class="muted">Final weeks will build the season standings.</p>'}</details>`;
  const pick=host.querySelector('#weekly-call'),kindSelect=host.querySelector('#weekly-call-kind');
  const labelOptions=()=>{if(!pick)return;for(const option of pick.options){if(!option.value)continue;const[gameId,roster]=option.value.split(':').map(Number),game=model.games.find(g=>Number(g.matchup_id)===gameId),team=[game.left,game.right].find(t=>Number(t.roster)===roster);option.textContent=kindSelect.value==='high-score'?`${team.name} · league high scorer`:`${team.name} over ${(team===game.left?game.right:game.left).name}`}};kindSelect?.addEventListener('change',labelOptions);labelOptions();
  host.querySelector('form')?.addEventListener('submit',async event=>{event.preventDefault();if(busy)return;const form=event.currentTarget,status=form.querySelector('[data-call-status]'),actor=currentMember();if(!actor){status.textContent='Choose your profile first.';return}const kind=form.querySelector('#weekly-call-kind').value;const[matchup_id,roster_id]=form.querySelector('#weekly-call').value.split(':').map(Number);busy=true;form.querySelector('button').disabled=true;status.textContent='Saving your call…';try{const{data,error}=await db().from('dfl_weekly_calls').upsert({season:model.season,week:model.week,member_id:actor.id,matchup_id,roster_id,kind},{onConflict:'season,week,member_id'}).select('member_id');if(error||!data?.length)throw error||Error('Refused');await load();if(!host.isConnected)return;paint();host.querySelector('[data-call-status]').textContent='Call saved. Bring the receipts after the games.'}catch{status.textContent='Could not save. Calls may have locked; your selection is kept for retry.';form.querySelector('button').disabled=false}finally{busy=false}});
 };
 try{await load();if(host.isConnected)paint()}catch{if(host.isConnected){host.innerHTML='<h2>Call your shot</h2><p role="status">Could not load this week’s challenge.</p><button class="btn ghost" type="button">Retry challenge</button>';host.querySelector('button').addEventListener('click',()=>void mountWeeklyCalls(host,model))}}
}
