import {esc} from './ui.js';
import {teamPortrait} from './team-presentation.js';
import {matchupPhase,matchupSummary} from './clubhouse-matchup-model.js';

// The selected game's visible identity is shared by all Clubhouse sections.
// Keep the score-feed binding attributes so refreshes remain immediate.
export function clubhouseDuelHtml(game,model) {
 const sides=(game.sides||[game.left,game.right]).map(team=>({...team,starters:team.starters||[]}));
 const id=game.matchup_id??game.id,phase=matchupPhase(...sides,model.completed);
 const side=(team,index)=>{
  const position=index?'right':'left',identity=team.identity||(model.members||[]).find(m=>String(m.id)===String(team.memberId))||{};
  const remaining=model.completed?'Final score':team.remaining==null?'Checking starters…':`${team.remaining} remaining${team.live?` · ${team.live} live`:''}`;
  return `<div class="clubhouse-game-side" data-matchup-roster="${esc(team.roster)}" data-gameday-team="${esc(team.roster)}">${teamPortrait({team_name:team.name,identity},{className:'clubhouse-team-mark'})}<div class="clubhouse-matchup-name"><strong>${team.memberId?`<a href="#/profile?id=${esc(team.memberId)}">${esc(team.name)}</a>`:esc(team.name)}</strong></div><b data-score-${position}="${esc(id)}"${team.score!=null&&Number(team.score).toFixed(2).length>5?' data-wide-score':''} data-gameday-total-key="${esc(id)}:${position}" aria-label="${esc(team.name)} score"><span data-matchup-score-value>${team.score==null?'—':Number(team.score).toFixed(2)}</span><small class="clubhouse-score-lead" aria-hidden="true"></small></b><span class="clubhouse-remaining" data-remaining-${position}="${esc(id)}">${esc(remaining)}</span><div hidden aria-hidden="true" data-players-${position}="${esc(id)}"></div></div>`;
 };
 return `<section class="clubhouse-duel" data-matchup-id="${esc(id)}" data-matchup-state="${phase.key}" aria-label="${esc(sides.map(t=>t.name).join(' versus '))}"><span class="clubhouse-matchup-state" data-state="${phase.key}" data-matchup-phase="${esc(id)}">${esc(phase.label)}</span><div class="clubhouse-game-teams">${sides.map(side).join('')}<span class="clubhouse-duel-versus" aria-hidden="true">vs</span></div><p class="sr-only" data-matchup-summary="${esc(id)}">${esc(matchupSummary(...sides,{completed:model.completed}))}</p></section>`;
}
