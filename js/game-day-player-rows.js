import {playerWeekDetailHtml} from './player-week-detail-model.js';
import {playerIdentity} from './player-presentation.js';
import {playerScoreTemperature,thermalScore} from './score-temperature.js';
import {esc} from './ui.js';
import {kickoffLabel} from './game-day-readiness.js';
export const playerScorePhase=p=>p.state==='upcoming'&&kickoffLabel(p.kickoff)?kickoffLabel(p.kickoff):({live:'Live',final:'Final',upcoming:'Upcoming',unknown:'Status pending'}[p.state]||'Status pending');
export function playerRowContent(p,{showOwner=false,showSlot=true,showDetails=true}={}){return `${showSlot&&p.slot?`<span class="gameday-slot">${esc(p.slot)}</span>`:''}${p.empty?'<span class="gameday-empty-slot">Empty slot</span>':`<button type="button" class="gameday-player-tap" data-gameday-player="${esc(p.id)}" data-player-roster="${esc(p.roster)}" aria-label="View ${esc(p.name)} game stats">${playerIdentity(p,{detail:[p.position,p.nflTeam,showOwner?p.owner:null,showOwner&&p.slot==='Bench'?'Bench':null].filter(Boolean).join(' · ')})}</button>`}<span class="gameday-player-score" data-gameday-score-key="${esc(`${p.roster}:${p.id}`)}">${thermalScore(p.points,playerScoreTemperature(p))}<small data-player-phase="${esc(p.id)}">${p.empty?'Not filled':playerScorePhase(p)}</small></span>${showDetails?playerWeekDetailHtml(p):''}`}
export function playerRows(rows,options={}){return rows.map(p=>`<li class="gameday-player" data-gameday-row="${esc(`${p.roster}:${p.id}`)}">${playerRowContent(p,options)}</li>`).join('')}
