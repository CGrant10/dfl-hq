import {esc} from './ui.js';
import {simulateSwap,strategyLesson} from './lineup-lab.js';
import {matchupNote} from './weekly-outlook.js';
import {playerLiveState} from './live-score.js';
const pts=n=>n.toFixed(1),signed=n=>`${n>=0?'+':''}${pts(n)}`;
export function mountLineupLab(host,{team,opponent,weekly,week,season,defense,fetchedAt,stale}){
 const starters=(team.starters||team.lineup?.starterIds||[]).map(String).filter(p=>p!=='0'),roster=(team.playerIds||[]).map(String),bench=roster.filter(p=>!starters.includes(p));
 const lesson=strategyLesson({week,roster,starters,weekly});
 const options=ids=>ids.map(id=>{const p=weekly.get(id);return`<option value="${esc(id)}">${esc(p?`${p.name} · ${p.position} · ${p.points==null?'no projection':pts(p.points)+' pts'}`:`Player ${id} · no projection`)}</option>`}).join('');
 host.innerHTML=`<section class="card lineup-lab"><header class="play-heading"><div><small>WEEK ${week} · ${season}</small><h2>Lineup lab</h2><p>Try one bench swap and see the projected matchup change.</p></div></header>${opponent?`<p>Opponent: <strong>${esc(opponent.team_name||opponent.ownerName)}</strong></p>`:'<p class="muted">Opponent unavailable. You can still compare your lineup total.</p>'}
  ${starters.length&&bench.length?`<form data-lineup-lab><div class="lab-pickers"><label for="lab-out">Bench this starter<select id="lab-out" required>${options(starters)}</select></label><label for="lab-in">Start this bench player<select id="lab-in" required>${options(bench)}</select></label></div><button type="submit" class="btn">Compare swap</button><button type="reset" class="btn ghost">Reset</button></form><div data-lab-result role="status" aria-live="polite"><p class="muted">Choose two players to compare.</p></div>`:'<p class="muted">Set a starting lineup and keep a bench player to try a swap.</p>'}
  <p class="wo-method">Sleeper weekly projections · league scoring.${fetchedAt?` Fetched ${esc(new Date(fetchedAt).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}))}.`:''}${stale?' Using cached data after a failed refresh.':''} This experiment does not change your lineup. Submit real changes in Sleeper; kickoff locks still apply.</p></section>
  <section class="card strategy-bite"><small>WEEK ${week} · STRATEGY BITE</small><h2>${esc(lesson.title)}</h2><p>${esc(lesson.body)}</p>${lesson.example?`<p class="strategy-example"><strong>On this roster</strong><br>${esc(lesson.example)}</p>`:''}<p>${esc(lesson.action)}</p><small>General fantasy strategy · roster context from Sleeper. Projections do not guarantee results.</small></section>`;
 const form=host.querySelector('form'),result=host.querySelector('[data-lab-result]');
 form?.addEventListener('reset',()=>{result.innerHTML='<p class="muted">Choose two players to compare.</p>'});
 form?.addEventListener('submit',event=>{event.preventDefault();const outId=form.querySelector('#lab-out').value,inId=form.querySelector('#lab-in').value;
  const sim=simulateSwap({starters,roster,outId,inId,weekly,opponentStarters:opponent?.starters||opponent?.lineup?.starterIds||[]});
  if(sim.error){result.innerHTML=`<p>${esc(sim.error)}</p>`;return}
  const incoming=weekly.get(inId),outgoing=weekly.get(outId),note=matchupNote(incoming,defense);
  result.innerHTML=`<div class="lab-totals"><div><small>Current lineup</small><strong>${pts(sim.before)}</strong></div><div><small>After swap</small><strong>${pts(sim.after)}</strong></div><div><small>Projected change</small><strong>${signed(sim.delta)}</strong></div></div><p>${esc(incoming.name)} replaces ${esc(outgoing.name)}.${incoming.isRisky?` ${esc(incoming.injuryStatus)}: monitor availability.`:''}${note?` Matchup context: ${esc(note.tone)} vs ${esc(note.opponent)}.`:''}</p>${sim.opponent!==null?`<p>Opponent projected: <strong>${pts(sim.opponent)}</strong> · Your margin: <strong>${signed(sim.beforeMargin)} → ${signed(sim.afterMargin)}</strong></p>`:''}<p class="muted">${Math.abs(sim.delta)<1.5?'Close call: the projection gap is below the Analyzer’s 1.5-point recommendation threshold.':'This is a projected change; review injuries and opportunity before setting your lineup.'}${[incoming,outgoing].some(p=>['playing','final','played'].includes(playerLiveState(p).key))?' A player has already started or finished; treat this as a hypothetical comparison.':''}</p>`;
 });
}
