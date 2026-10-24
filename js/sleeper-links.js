import {esc} from './ui.js';

// Sleeper's own Get The App button uses this universal app launch link.
// Native apps do not reliably support the league section routes.
export const SLEEPER_APP_URL='https://sleeperbot.app.link/esEa7TDlJN';
const routes={league:'',roster:'team',matchups:'matchup',waivers:'players',trades:'trades',standings:'standings'};
export function sleeperUrl(leagueId,section='league'){
 const id=typeof leagueId==='string'?leagueId:typeof leagueId==='number'&&Number.isSafeInteger(leagueId)?String(leagueId):'';
 if(!/^[1-9]\d{0,24}$/.test(id)||!Object.hasOwn(routes,section))return null;
 return SLEEPER_APP_URL;
}
export function sleeperAction(leagueId,section='league',{label='Open Sleeper',className='btn ghost small'}={}){
 const href=sleeperUrl(leagueId,section);if(!href)return '';
 return `<a class="${esc(className)} sleeper-action" href="${href}" target="_blank" rel="noopener noreferrer" data-sleeper-section="${esc(section)}">Open Sleeper <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg></a>`;
}
