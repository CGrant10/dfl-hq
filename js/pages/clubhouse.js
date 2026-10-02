import {db} from '../supabase.js';
import {currentMember,loadMemberDirectory} from '../members.js';
import {esc,errorBox,toast} from '../ui.js';
import {loadClubhouseIndex,loadClubhouseWeek,enrichClubhouseWeek} from '../weekly-clubhouse-data.js';
import {buildWeeklyClubhouse,weeklyHref,weeklyRecapLines} from '../weekly-clubhouse-model.js';
import {weeklyAwardsHtml,weeklyVoteHtml,weeklyVoteResults,wireMatchupThreads} from '../weekly-clubhouse-ui.js';
import {shareWeeklyClubhouse} from '../weekly-clubhouse-share.js';
let renderGeneration=0;
export async function render(view){
 const token=++renderGeneration,active=()=>token===renderGeneration&&view.isConnected&&location.hash.startsWith("#/clubhouse");
 view.innerHTML='<h1>Weekly clubhouse</h1><p role="status">Loading the league’s receipts…</p>';
 try{
  const[index,members]=await Promise.all([loadClubhouseIndex(),loadMemberDirectory()]);if(!active())return;
  const params=new URLSearchParams(location.hash.split('?')[1]||''),wanted=index.find(w=>w.season===Number(params.get('season'))&&w.week===Number(params.get('week'))),selected=wanted||index.find(w=>w.completed)||index[0];
  if((params.has('season')||params.has('week'))&&!wanted){view.innerHTML='<h1>Weekly clubhouse</h1><p>That week is not available.</p><a class="btn" href="#/clubhouse">Latest completed week</a>';return}
  if(!selected){view.innerHTML='<h1>Weekly clubhouse</h1><p>The first synced matchup will start the clubhouse.</p>';return}
  const data=await loadClubhouseWeek(selected.season,selected.week);if(!active())return;let model=buildWeeklyClubhouse(data,members);
  const threadIds=new Map(data.threads.map(t=>[String(t.matchup_id),t.post_id])),latest=index[0];
  view.innerHTML=`<div class="clubhouse-page"><header class="page-head"><div><span class="eyebrow">THE LEAGUE’S RECEIPTS</span><h1>Weekly clubhouse</h1><p>Win the week. Own the jokes. Bring receipts.</p></div><a class="btn ghost" href="#/home">Home</a></header><div class="clubhouse-week-picker"><label for="clubhouse-season">Season</label><select id="clubhouse-season">${[...new Set(index.map(w=>w.season))].map(season=>`<option ${season===selected.season?'selected':''}>${season}</option>`).join('')}</select><label for="clubhouse-week">Week</label><select id="clubhouse-week">${index.filter(w=>w.season===selected.season).map(w=>`<option value="${w.season}:${w.week}" ${w===selected?'selected':''}>Week ${w.week}${w.completed?' · Final':' · In progress'}</option>`).join('')}</select>${latest!==selected?`<a class="btn ghost" href="${weeklyHref(latest.season,latest.week)}">Current matchups</a>`:''}</div>
   <section class="card clubhouse-section"><div class="clubhouse-heading"><div><small>${model.season} · WEEK ${model.week} · ${model.completed?'FINAL':'IN PROGRESS'}</small><h2>Weekly awards</h2></div><button type="button" class="btn" data-clubhouse-share disabled>Share recap</button></div><div data-clubhouse-awards>${weeklyAwardsHtml(model)}</div><p class="muted tiny" role="status" data-bench-status>${model.completed?'Checking the actual weekly lineups…':'Final awards and the recap wait until the NFL slate finishes, normally Tuesday morning.'}</p></section>
   ${weeklyVoteHtml(model)}
   <section class="card clubhouse-section"><h2>Matchup conversations</h2><p class="muted tiny">${model.completed?'Final scores':'Synced scores · games may still be in progress'}. Open a shared Wall thread for predictions, trash talk and receipts.</p><div class="clubhouse-games">${model.games.map(g=>`<article class="clubhouse-game"><div><strong>${esc(g.left.name)}</strong><b data-score-left="${g.matchup_id}">${g.left.score?.toFixed(2)??'—'}</b><span>vs</span><strong>${esc(g.right.name)}</strong><b data-score-right="${g.matchup_id}">${g.right.score?.toFixed(2)??'—'}</b></div>${threadIds.has(String(g.matchup_id))?`<a class="btn ghost" aria-label="Join conversation for ${esc(g.left.name)} versus ${esc(g.right.name)}, week ${model.week}" href="#/wall?post=${threadIds.get(String(g.matchup_id))}">Join conversation</a>`:`<button class="btn ghost" type="button" aria-label="Start conversation for ${esc(g.left.name)} versus ${esc(g.right.name)}, week ${model.week}" data-matchup-thread="${g.matchup_id}">Start conversation</button>`}<p class="muted tiny" role="status" data-matchup-status></p></article>`).join('')}</div></section>
   <section class="card clubhouse-section"><h2>Monday receipts</h2><p class="muted tiny">${model.completed?'The completed week, ready for the group chat.':'The last completed week is available in the week selector.'}</p><div data-clubhouse-recap>${recapHtml(model)}</div></section>
  </div>`;
  view.querySelector('#clubhouse-season').addEventListener('change',event=>{const season=Number(event.target.value),week=index.find(w=>w.season===season&&w.completed)||index.find(w=>w.season===season);location.hash=weeklyHref(week.season,week.week)});
  view.querySelector('#clubhouse-week').addEventListener('change',event=>{const[season,week]=event.target.value.split(':');location.hash=weeklyHref(season,week)});
  wireMatchupThreads(view,model.season,model.week);
  view.querySelector('[data-clubhouse-share]').addEventListener('click',()=>{Promise.resolve(shareWeeklyClubhouse(model)).then(result=>{if(result==='saved')toast('Recap image saved');else if(result==='copied')toast('Recap copied');else if(result==='failed')toast('Could not share the recap',true)})});
  const repaintAwards=()=>{view.querySelector('[data-clubhouse-awards]').innerHTML=weeklyAwardsHtml(model);view.querySelector('[data-clubhouse-recap]').innerHTML=recapHtml(model);view.querySelector('[data-weekly-vote-results]').innerHTML=weeklyVoteResults(model)};
  const refreshVote=async()=>{const fresh=await loadClubhouseWeek(model.season,model.week);if(!active())return;model={...model,...fresh};model=buildWeeklyClubhouse(model,members,raw,players);repaintAwards()};
  let raw=[],players={},busy=false;
  const ballot=view.querySelector('[data-weekly-vote]'),status=view.querySelector('[data-weekly-vote-status]');
  const vote=async withdraw=>{if(busy)return;const actor=currentMember();if(!actor){status.textContent='Choose your profile first.';return}const nominee=Number(ballot?.elements.nominee.value);if(!withdraw&&!nominee){status.textContent='Choose a nominee.';return}busy=true;ballot.querySelectorAll('button').forEach(b=>b.disabled=true);status.textContent=withdraw?'Withdrawing vote…':'Saving your vote…';
   try{const q=db().from('clubhouse_award_votes');const{error}=withdraw?await q.delete().eq('season',model.season).eq('week',model.week).eq('voter_id',actor.id):await q.upsert({season:model.season,week:model.week,voter_id:actor.id,nominee_id:nominee},{onConflict:'season,week,voter_id'});if(error)throw error;await refreshVote();ballot.querySelector('[data-withdraw-vote]').hidden=withdraw;ballot.querySelector('[type="submit"]').textContent=withdraw?'Cast vote':'Change vote';if(withdraw)ballot.elements.nominee.value='';status.textContent=withdraw?'Vote withdrawn.':'Vote saved.'}catch{status.textContent='Could not save your vote. Check your connection and whether voting is still open, then retry.'}finally{busy=false;ballot.querySelectorAll('button').forEach(b=>b.disabled=false)}
  };
  ballot?.addEventListener('submit',event=>{event.preventDefault();void vote(false)});ballot?.querySelector('[data-withdraw-vote]').addEventListener('click',()=>void vote(true));
  if(model.completed){
   // Update only the score/award islands; preserve ballot selections and focus.
   const enriched=await enrichClubhouseWeek(data,members);if(!active())return;
   raw=enriched.rawRosters;players=enriched.playerDirectory;
   model=buildWeeklyClubhouse({...enriched,votes:model.votes},members,raw,players);repaintAwards();
   for(const game of model.games){view.querySelector(`[data-score-left="${game.matchup_id}"]`).textContent=game.left.score?.toFixed(2)??'—';view.querySelector(`[data-score-right="${game.matchup_id}"]`).textContent=game.right.score?.toFixed(2)??'—'}
   view.querySelector('[data-bench-status]').textContent=model.benchAvailable?'Awards use actual weekly starters and bench scores. Tied awards are shared.':'Weekly lineup data is unavailable. Score awards use synced totals; bench awards are omitted.';
   view.querySelector('[data-clubhouse-share]').disabled=model.games.some(g=>g.left.score===null||g.right.score===null);
  }
 }catch(error){if(active())view.innerHTML='<h1>Weekly clubhouse</h1>'+errorBox(error)}
}
function recapHtml(model){if(!model.completed)return'<p class="muted">Results are still in progress.</p>';return `<ul class="clubhouse-recap-lines">${weeklyRecapLines(model).filter(line=>!line.startsWith('Wall receipt:')).map(line=>`<li>${esc(line)}</li>`).join('')}</ul><div class="clubhouse-wall-receipts">${(model.wall||[]).map(post=>`<a href="#/wall?post=${post.id}"><strong>Wall receipt · ${Number(post.reactions)} reactions · ${Number(post.replies)} replies</strong><span>${esc(post.body||'Photo post')}</span></a>`).join('')}</div>${!(model.pickem||[]).length?'<p class="muted tiny">No graded Pick’em cards for this week.</p>':''}${!model.sportsbook?.available?'<p class="muted tiny">No settled Sportsbook tickets for this recap window.</p>':''}`}
