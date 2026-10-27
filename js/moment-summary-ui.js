import {esc} from './ui.js';
import {playerPortrait} from './player-presentation.js';
import {momentSummary} from './game-day-moments-model.js';
export function momentSummaryMarkup(moment){
 const summary=momentSummary(moment);
 return `${moment.player?playerPortrait(moment.player):'<span class="moment-mini-mark" aria-hidden="true">↗</span>'}<span class="moment-summary-copy"><strong>${esc(summary.name)}</strong><span class="moment-summary-label" data-kind="${esc(moment.kind)}">${esc(summary.label)}</span>${summary.detail?`<small>${esc(summary.detail)}</small>`:''}</span>${summary.value?`<span class="moment-summary-number"><b>${esc(summary.value)}</b>${summary.unit?`<small>${summary.unit}</small>`:''}</span>`:''}`;
}
