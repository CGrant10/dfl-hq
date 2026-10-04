import {playerIdentity} from './player-presentation.js';
import {playerTemperature,thermalScore} from './score-temperature.js';
import {esc} from './ui.js';
const phase=p=>({live:'Live',final:'Final',upcoming:'Upcoming',unknown:'Status pending'}[p.state]||'Status pending');
export function playerRows(rows){return rows.map(p=>`<li class="gameday-player">${p.slot?`<span class="gameday-slot">${esc(p.slot)}</span>`:''}${p.empty?'<span class="gameday-empty-slot">Empty slot</span>':`<button type="button" class="gameday-player-tap" data-gameday-player="${esc(p.id)}" data-player-roster="${esc(p.roster)}" aria-label="View ${esc(p.name)} game stats">${playerIdentity(p,{detail:`${p.position} · ${p.nflTeam}`})}</button>`}<span class="gameday-player-score" data-gameday-score-key="${esc(`${p.roster}:${p.id}`)}">${thermalScore(p.points,playerTemperature(p.points,p.state,p.afterHalftime))}<small data-player-phase="${esc(p.id)}">${p.empty?'Not filled':phase(p)}</small></span></li>`).join('')}
