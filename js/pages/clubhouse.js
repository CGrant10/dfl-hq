import {matchupSummary} from '../clubhouse-matchup-model.js';
import {matchupCardHtml} from "../clubhouse-matchup-cards.js";
import {mountMatchupLive} from "../clubhouse-matchup-live.js";
import {disclosure,wirePageDisclosures} from "../page-disclosure.js";
import {mountRivalries,mountWeeklyCalls} from "../clubhouse-play.js";
import {db} from '../supabase.js';
import {currentMember,loadMemberDirectory} from '../members.js';
import {esc,errorBox,toast} from '../ui.js';
import {loadClubhouseIndex,loadClubhouseWeek,enrichClubhouseWeek} from '../weekly-clubhouse-data.js';
import {buildWeeklyClubhouse,weeklyHref} from '../weekly-clubhouse-model.js';
import {weeklyAwardsHtml,weeklyVoteHtml,weeklyVoteResults,wireMatchupThreads,wireClubhouseTabs} from '../weekly-clubhouse-ui.js';
import {shareWeeklyClubhouse} from '../weekly-clubhouse-share.js';
import {readViewMemory,writeViewMemory} from '../view-memory.js';
let renderGeneration=0;
export async function render(view){
 const token=++renderGeneration,active=()=>token===renderGeneration&&view.isConnected&&location.hash.startsWith("#/clubhouse");
 view.innerHTML='<header class="page-head"><h1>Clubhouse</h1></header><p role="status">Loading the league’s receipts…</p><div class="clubhouse-skeleton" aria-hidden="true"><i></i><i></i><i></i></div>';
 try{
  const[index,members]=await Promise.all([loadClubhouseIndex(),loadMemberDirectory()]);if(!active())return;
  const remembered=readViewMemory(currentMember()?.id,'clubhouse-choice');
  const params=new URLSearchParams(location.hash.split('?')[1]||''),wanted=index.find(w=>w.season===Number(params.get('season'))&&w.week===Number(params.get('week'))),selected=wanted||(!params.has('archive')&&!params.has('season')&&!params.has('week')&&index.find(w=>w.season===remembered?.season&&w.week===remembered?.week))||(params.has('archive')&&index.find(w=>w.completed))||index[0];
  if((params.has('season')||params.has('week'))&&!wanted){view.innerHTML='<h1>Weekly clubhouse</h1><p>That week is not available.</p><a class="btn" href="#/clubhouse">Latest completed week</a>';return}
  if(!selected){view.innerHTML='<h1>Weekly clubhouse</h1><p>The first synced matchup will start the clubhouse.</p>';return}
  const data=await loadClubhouseWeek(selected.season,selected.week);if(!active())return;let model=buildWeeklyClubhouse(data,members);
  const threadIds=new Map(data.threads.map(t=>[String(t.matchup_id),t.post_id])),latest=index[0];
  const tabs=[{key:"overview",label:"Overview"},{key:"matchups",label:"Matchups"},{key:"recap",label:"Recap"}];
  const requestedTab=params.get("tab")||remembered?.tab,initialTab=tabs.some(t=>t.key===requestedTab)?requestedTab:model.completed?"overview":"matchups";
  view.innerHTML=`<div class="clubhouse-page">
   <header class="page-head clubhouse-header"><div><small class="clubhouse-eyebrow">THE LEAGUE’S RECEIPTS</small><h1>Clubhouse</h1><span class="clubhouse-status">${model.season} · Week ${model.week} · ${model.completed?'Final':'In progress'}</span></div><button type="button" class="btn" data-clubhouse-share disabled ${model.completed?'':'hidden'}>Share recap</button></header>
   <section class="card clubhouse-context" aria-label="Choose clubhouse week"><div><h2>Weekly archive</h2><p class="muted">Choose a season and week for its awards, matchup rivalries and recap.</p><a href="#/facts?archive=weekly">This week across DFL history →</a></div><div class="clubhouse-week-picker"><label for="clubhouse-season">Season<select id="clubhouse-season">${[...new Set(index.map(w=>w.season))].map(season=>`<option ${season===selected.season?'selected':''}>${season}</option>`).join('')}</select></label><label for="clubhouse-week">Week<select id="clubhouse-week">${index.filter(w=>w.season===selected.season).map(w=>`<option value="${w.season}:${w.week}" ${w===selected?'selected':''}>Week ${w.week}</option>`).join('')}</select></label></div><div class="clubhouse-context-links">${latest!==selected?`<a href="${weeklyHref(latest.season,latest.week)}&tab=matchups">Latest · ${latest.season} Week ${latest.week} →</a>`:''}</div></section>
   <div class="tabs clubhouse-tabs" role="tablist" aria-label="Clubhouse sections">${tabs.map(t=>`<button type="button" role="tab" id="clubhouse-tab-${t.key}" data-clubhouse-tab="${t.key}" aria-controls="clubhouse-panel-${t.key}" aria-selected="${t.key===initialTab}" tabindex="${t.key===initialTab?0:-1}">${t.label}</button>`).join('')}</div>
   <div id="clubhouse-panel-overview" role="tabpanel" aria-labelledby="clubhouse-tab-overview" ${initialTab==='overview'?'':'hidden'}><div class="clubhouse-overview-grid">
    <section class="card clubhouse-section"><div class="clubhouse-heading"><div><small>WEEK ${model.week} · ${model.completed?'FINAL RESULTS':'IN PROGRESS'}</small><h2>Weekly awards</h2></div><span class="clubhouse-status">${model.games.length} matchups</span></div><p class="clubhouse-section-copy">${model.completed?"The week’s headline. Open the awards for the rest of the receipts.":"Join this week’s matchup conversations while the scores develop."}</p><button type="button" class="btn ghost" data-open-matchups>Open matchup conversations</button><div data-clubhouse-awards>${overviewAwardsHtml(model)}</div><p class="clubhouse-footnote" role="status" data-bench-status>${model.completed?'Checking the actual weekly lineups…':'Final awards wait for the NFL slate to finish. Join the matchup talk in the meantime.'}</p></section>
    ${weeklyVoteHtml(model)}
   </div></div>
   <div id="clubhouse-panel-matchups" role="tabpanel" aria-labelledby="clubhouse-tab-matchups" ${initialTab==='matchups'?'':'hidden'}><section class="card clubhouse-section"><div class="clubhouse-heading"><div><small>WEEK ${model.week} · ${model.completed?'FINAL SCORES':'SYNCED SCORES'}</small><h2>Matchups</h2></div><span class="clubhouse-status">${model.games.length} games</span></div><div class="clubhouse-matchup-toolbar"><span data-matchup-freshness role="status">Checking current scores…</span><button type="button" class="btn ghost small" data-matchup-refresh>Refresh scores</button></div><div class="clubhouse-matchup-list">${matchupFocusHtml(model,threadIds)}</div><p class="clubhouse-section-copy">One thread per matchup. Bring your trash talk and receipts.</p><div class="clubhouse-play-links"><a href="#/wall">Open Wall →</a><a href="#/facts?play=trivia">DFL trivia →</a><a href="#/analyzer">Plan your lineup →</a></div>${!model.completed?'<p class="clubhouse-footnote">Synced scores can change while NFL games are in progress.</p>':''}</section><section class="card clubhouse-section" data-weekly-calls><p role="status">Loading this week’s challenge…</p></section></div>
   <div id="clubhouse-panel-recap" role="tabpanel" aria-labelledby="clubhouse-tab-recap" ${initialTab==='recap'?'':'hidden'}><section class="card clubhouse-section"><div class="clubhouse-heading"><div><small>WEEK ${model.week} · ${model.season}</small><h2>Week in review</h2></div><span class="clubhouse-status">${model.completed?'Final receipts':'In progress'}</span></div><p class="clubhouse-section-copy">${model.completed?'The scores, side bets and best of the Wall. Use Share recap to send the card to your group chat.':'The recap will be ready after the NFL slate finishes.'}</p><div data-clubhouse-recap>${recapHtml(model)}</div></section><section class="card clubhouse-section" data-recap-calls><p role="status">Loading prediction receipts…</p></section></div>
  </div>`;
  mountMatchupLive(view,model,threadIds,active);
  wirePageDisclosures(view);
  wireClubhouseTabs(view,initialTab);
  const remember=()=>writeViewMemory(currentMember()?.id,'clubhouse-choice',{season:selected.season,week:selected.week,tab:activeTab(view)});
  remember();view.addEventListener('click',event=>{if(event.target.closest('[data-clubhouse-tab]'))remember()});view.addEventListener('keydown',event=>{if(event.target.closest('[data-clubhouse-tab]'))queueMicrotask(remember)});
  view.querySelector('[data-open-matchups]')?.addEventListener('click',()=>view.querySelector('#clubhouse-tab-matchups').click());
  void mountRivalries(view,model,active);
  if(!model.completed)void mountWeeklyCalls(view.querySelector("[data-weekly-calls]"),model);
  else view.querySelector("[data-weekly-calls]").innerHTML='<a href="#clubhouse-panel-recap" class="clubhouse-text-link" data-view-calls>See prediction receipts in Recap →</a>';
  view.querySelector("[data-view-calls]")?.addEventListener("click",event=>{event.preventDefault();view.querySelector("#clubhouse-tab-recap").click()});
  view.querySelector('#clubhouse-season').addEventListener('change',event=>{const season=Number(event.target.value),week=index.find(w=>w.season===season&&w.completed)||index.find(w=>w.season===season);location.hash=weeklyHref(week.season,week.week)+'&tab='+activeTab(view)});
  view.querySelector('#clubhouse-week').addEventListener('change',event=>{const[season,week]=event.target.value.split(':');location.hash=weeklyHref(season,week)+'&tab='+activeTab(view)});
  wireMatchupThreads(view,model.season,model.week);
  view.querySelector('[data-clubhouse-share]').addEventListener('click',()=>{Promise.resolve(shareWeeklyClubhouse(model)).then(result=>{if(result==='saved')toast('Recap image saved');else if(result==='copied')toast('Recap copied');else if(result==='failed')toast('Could not share the recap',true)})});
  const repaintAwards=()=>{view.querySelector('[data-clubhouse-awards]').innerHTML=overviewAwardsHtml(model);view.querySelector('[data-clubhouse-recap]').innerHTML=recapHtml(model);view.querySelector('[data-weekly-vote-results]').innerHTML=weeklyVoteResults(model);wirePageDisclosures(view)};
  const refreshVote=async()=>{const fresh=await loadClubhouseWeek(model.season,model.week,{force:true});if(!active())return;model={...model,...fresh};model=buildWeeklyClubhouse(model,members,raw,players);repaintAwards()};
  let raw=[],players={},busy=false;
  const ballot=view.querySelector('[data-weekly-vote]'),status=view.querySelector('[data-weekly-vote-status]');
  const vote=async withdraw=>{if(busy)return;const actor=currentMember();if(!actor){status.textContent='Choose your profile first.';return}const nominee=Number(ballot?.elements.nominee.value);if(!withdraw&&!nominee){status.textContent='Choose a nominee.';return}busy=true;ballot.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent=withdraw?'Withdrawing vote…':'Saving your vote…';
   try{const q=db().from('clubhouse_award_votes');const{error}=withdraw?await q.delete().eq('season',model.season).eq('week',model.week).eq('voter_id',actor.id):await q.upsert({season:model.season,week:model.week,voter_id:actor.id,nominee_id:nominee},{onConflict:'season,week,voter_id'});if(error)throw error;await refreshVote();ballot.querySelector('[data-withdraw-vote]').hidden=withdraw;ballot.querySelector('[type="submit"]').textContent=withdraw?'Cast vote':'Change vote';if(withdraw)ballot.elements.nominee.value='';status.textContent=withdraw?'Vote withdrawn.':'Vote saved.'}catch{status.textContent='Could not save your vote. Check your connection and whether voting is still open, then retry.'}finally{busy=false;ballot.querySelectorAll('button').forEach(b=>b.disabled=false)}
  };
  ballot?.addEventListener('submit',event=>{event.preventDefault();void vote(false)});ballot?.querySelector('[data-withdraw-vote]').addEventListener('click',()=>void vote(true));
  if(!model.completed)view.querySelector('[data-recap-calls]').hidden=true;
  if(model.completed){
   // Update only the score/award islands; preserve ballot selections and focus.
   const enriched=await enrichClubhouseWeek(data,members);if(!active())return;
   raw=enriched.rawRosters;players=enriched.playerDirectory;
   model=buildWeeklyClubhouse({...enriched,votes:model.votes},members,raw,players);repaintAwards();
   for(const game of model.games){view.querySelector(`[data-score-left="${game.matchup_id}"] [data-matchup-score-value]`).textContent=game.left.score?.toFixed(2)??'—';view.querySelector(`[data-score-right="${game.matchup_id}"] [data-matchup-score-value]`).textContent=game.right.score?.toFixed(2)??'—';view.querySelector(`[data-matchup-summary="${game.matchup_id}"]`).textContent=matchupSummary(game.left,game.right,{completed:true})}
   void mountWeeklyCalls(view.querySelector('[data-recap-calls]'),model);
   view.querySelector('[data-bench-status]').textContent=model.benchAvailable?'Awards use actual weekly starters and bench scores. Tied awards are shared.':'Weekly lineup data is unavailable. Score awards use synced totals; bench awards are omitted.';
   view.querySelector('[data-clubhouse-share]').disabled=model.games.some(g=>g.left.score===null||g.right.score===null);
  }
 }catch(error){if(active())view.innerHTML='<h1>Weekly clubhouse</h1>'+errorBox(error)}
}
function overviewAwardsHtml(model){
 if(!model.awards.length)return weeklyAwardsHtml(model);
 return weeklyAwardsHtml({...model,awards:model.awards.slice(0,1)})+disclosure('clubhouse-awards','View all weekly awards',`${model.awards.length} awards · blowouts, close calls and bench regret`,weeklyAwardsHtml({...model,awards:model.awards.slice(1)}));
}
function matchupFocusHtml(model,threadIds){
 const member=currentMember(),focus=model.games.find(g=>[g.left.memberId,g.right.memberId].some(id=>id&&String(id)===String(member?.id)))||model.games[0];
 if(!focus)return '<p>No matchups available.</p>';
 const rest=model.games.filter(g=>g!==focus);
 return `<div class="clubhouse-matchup-focus"><small>${member&&[focus.left.memberId,focus.right.memberId].map(String).includes(String(member.id))?'YOUR MATCHUP':'FEATURED MATCHUP'}</small>${gameHtml(focus,model,threadIds)}</div>`+disclosure('clubhouse-other-games',`View ${rest.length} other matchups`,'Scores, rivalry histories and shared conversations',`<div class="clubhouse-games">${rest.map(g=>gameHtml(g,model,threadIds)).join('')}</div>`);
}
function activeTab(view){return view.querySelector('[data-clubhouse-tab][aria-selected="true"]')?.dataset.clubhouseTab||'overview'}
function gameHtml(game,model,threadIds){return matchupCardHtml(game,model,threadIds)}
function recapHtml(model){
 if(!model.completed)return'<div class="clubhouse-empty"><strong>Receipts are still being written</strong><p>Check the Matchups tab for this week’s scores and conversations.</p></div>';
 const pickem=(model.pickem||[]).filter(row=>Number(row.rank)===1),book=model.sportsbook?.mostProfitable;
 return `<div class="clubhouse-recap-grid">${disclosure("clubhouse-results","View fantasy results",`${model.games.length} final matchups`, `<section class="clubhouse-recap-block"><h3>Fantasy results</h3><div class="clubhouse-result-list">${model.games.map(g=>`<article><div><span>${esc(g.left.name)}</span><b>${g.left.score?.toFixed(2)??'—'}</b></div><div><span>${esc(g.right.name)}</span><b>${g.right.score?.toFixed(2)??'—'}</b></div></article>`).join('')}</div></section>`)}<div class="clubhouse-recap-extras"><section class="clubhouse-recap-block"><h3>Pick’em winner</h3>${pickem.length?pickem.map(row=>`<strong>${esc(model.members.find(m=>String(m.id)===String(row.member_id))?.display_name||'Member')}</strong><p>${Number(row.correct)} correct picks</p>`).join(''):'<p class="muted">No graded Pick’em cards this week.</p>'}</section><section class="clubhouse-recap-block"><h3>Sportsbook standout</h3>${model.sportsbook?.available&&book?`<strong>${esc(book.display_name||book.team_name||'Member')}</strong><p class="clubhouse-recap-net">${Number(book.net)>0?'+':''}${Number(book.net).toLocaleString()} SIN net</p>`:'<p class="muted">No settled tickets in this recap window.</p>'}</section><section class="clubhouse-recap-block"><h3>Best of the Wall</h3><div class="clubhouse-wall-receipts">${(model.wall||[]).map(post=>`<a href="#/wall?post=${post.id}"><span>${esc(post.body||'Photo post')}</span><small>${Number(post.reactions)} reactions · ${Number(post.replies)} replies</small></a>`).join('')||'<p class="muted">No Wall highlights in this recap window.</p>'}</div><a class="clubhouse-text-link" href="#/wall">Go to the Wall →</a></section></div></div>`;
}
