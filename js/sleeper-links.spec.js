import {describe,it,expect} from 'vitest';
import {sleeperUrl,sleeperAction,SLEEPER_APP_URL} from './sleeper-links.js';
import {startSitContent} from './start-sit-ui.js';
import {lineupCheckHtml} from './game-day-readiness.js';
describe('Sleeper handoffs',()=>{
 it('uses the official generic launcher for every valid league section',()=>{
  const id='1286077564572037120';
  for(const section of ['league','roster','matchups','waivers','trades','standings'])expect(sleeperUrl(id,section)).toBe(SLEEPER_APP_URL);
  expect(sleeperUrl('987654','matchups')).toBe(SLEEPER_APP_URL);
 });
 it('hides unavailable destinations instead of opening the wrong league or an unsafe URL',()=>{
  for(const id of [null,undefined,'','null','undefined','javascript:alert(1)','123/team','1?league=2',Number('1286077564572037120')])expect(sleeperAction(id,'roster')).toBe('');
  for(const section of ['__proto__','constructor','https://example.com','submit_trade'])expect(sleeperUrl('123',section)).toBeNull();
 });
 it('uses safe external navigation and does not promise a specific app screen',()=>{
  const html=sleeperAction('123','waivers',{label:'<Add player>'});
  expect(html).toContain('https://sleeperbot.app.link/esEa7TDlJN');
  expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  expect(html).toContain('Open Sleeper');expect(html).not.toContain('Add player');
 });
 it('puts a real roster action beside actionable advice only when the caller supplies a league',()=>{
  const advice={lineupIsSet:false},side={name:'Team',lineup:[{empty:true,slot:'Flex'}]};
  expect(startSitContent(advice,{leagueId:'123'})).toContain('https://sleeperbot.app.link/esEa7TDlJN');
  expect(startSitContent(advice)).not.toContain('sleeper-action');
  expect(lineupCheckHtml([side],{leagueId:'123'})).toContain('data-sleeper-section="roster"');
  expect(lineupCheckHtml([side],{leagueId:'123',completed:true})).toBe('');
 });
});
