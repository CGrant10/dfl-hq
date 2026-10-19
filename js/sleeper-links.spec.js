import {describe,it,expect} from 'vitest';
import {sleeperUrl,sleeperAction} from './sleeper-links.js';
import {startSitContent} from './start-sit-ui.js';
import {lineupCheckHtml} from './game-day-readiness.js';
describe('Sleeper handoffs',()=>{
 it('preserves the full current or historical league ID across verified web destinations',()=>{
  const id='1286077564572037120';
  for(const [section,path] of Object.entries({league:'',roster:'/team',matchups:'/matchup',waivers:'/players',trades:'/trades',standings:'/standings'}))expect(sleeperUrl(id,section)).toBe('https://sleeper.com/leagues/'+id+path);
  expect(sleeperUrl('987654','matchups')).toBe('https://sleeper.com/leagues/987654/matchup');
 });
 it('hides unavailable destinations instead of opening the wrong league or an unsafe URL',()=>{
  for(const id of [null,undefined,'','null','undefined','javascript:alert(1)','123/team','1?league=2',Number('1286077564572037120')])expect(sleeperAction(id,'roster')).toBe('');
  for(const section of ['__proto__','constructor','https://example.com','submit_trade'])expect(sleeperUrl('123',section)).toBeNull();
 });
 it('uses explicit safe external navigation and escapes custom button copy',()=>{
  const html=sleeperAction('123','waivers',{label:'<Add player>'});
  expect(html).toContain('https://sleeper.com/leagues/123/players');
  expect(html).toContain('target="_blank" rel="noopener noreferrer"');
  expect(html).toContain('&lt;Add player&gt;');expect(html).not.toContain('<Add player>');
 });
 it('puts a real roster action beside actionable advice only when the caller supplies a league',()=>{
  const advice={lineupIsSet:false},side={name:'Team',lineup:[{empty:true,slot:'Flex'}]};
  expect(startSitContent(advice,{leagueId:'123'})).toContain('https://sleeper.com/leagues/123/team');
  expect(startSitContent(advice)).not.toContain('sleeper-action');
  expect(lineupCheckHtml([side],{leagueId:'123'})).toContain('data-sleeper-section="roster"');
  expect(lineupCheckHtml([side],{leagueId:'123',completed:true})).toBe('');
 });
});
