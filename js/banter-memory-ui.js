import {esc} from './ui.js';
import {banterMemory} from './banter-memory.js';
export function banterMemoryMarkup(model,game,context){
 const facts=banterMemory(model,game,context);if(!facts.length)return '';
 return `<details class="banter-memory" id="banter-file-${esc(game.id)}"><summary><span>The DFL file</span><b>${facts.length} receipt${facts.length===1?'':'s'}</b></summary><div>${facts.map(f=>`<article><small>${esc(f.type)}</small><h4>${esc(f.roast)}</h4><p>${esc(f.fact)}</p><a class="linkbtn" href="${esc(f.href)}">Bring the receipt →</a></article>`).join('')}</div></details>`;
}
