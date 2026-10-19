import {esc} from './ui.js';

// Verified against Sleeper's public web router. HTTPS retains its browser fallback
// and lets the device handle app opening; no invented trade/lineup write API.
const routes={league:'',roster:'team',matchups:'matchup',waivers:'players',trades:'trades',standings:'standings'};
export function sleeperUrl(leagueId,section='league'){
 const id=typeof leagueId==='string'?leagueId:typeof leagueId==='number'&&Number.isSafeInteger(leagueId)?String(leagueId):'';
 if(!/^[1-9]\d{0,24}$/.test(id)||!Object.hasOwn(routes,section))return null;
 return `https://sleeper.com/leagues/${id}${routes[section]?'/'+routes[section]:''}`;
}
export function sleeperAction(leagueId,section='league',{label='Open Sleeper',className='btn ghost small'}={}){
 const href=sleeperUrl(leagueId,section);if(!href)return '';
 return `<a class="${esc(className)} sleeper-action" href="${href}" target="_blank" rel="noopener noreferrer" data-sleeper-section="${esc(section)}">${esc(label)} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`;
}
