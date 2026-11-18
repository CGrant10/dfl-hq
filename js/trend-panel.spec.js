import {beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({stats:{}}));
vi.mock('./sleeper.js',()=>({loadSeasonStats:vi.fn(async year=>({data:state.stats[year]||{}})),loadTrendingPlayers:vi.fn(async()=>null)}));
vi.mock('./ui.js',()=>({esc:value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}));
beforeEach(()=>{vi.resetModules();state.stats={2025:{golden:{gp:14,rec:70},other:{gp:17,rec:170}}};});
const host=()=>({dataset:{},innerHTML:''});
describe('analyzer trend panel',()=>{
 it('includes current production for Golden and does not reuse the first roster’s histories',async()=>{
  const {renderTrendPanel}=await import('./trend-panel.js');
  const {loadSeasonStats}=await import('./sleeper.js');loadSeasonStats.mockClear();
  const pool=new Map([['golden',{id:'golden',name:'Matthew Golden',position:'WR',nflTeam:'GB',currentPoints:179.9,currentGames:10}],['other',{id:'other',name:'Another Player',position:'WR',nflTeam:'KC',currentPoints:180,currentGames:10}]]);
  const one=host();await renderTrendPanel(one,{team:{playerIds:['golden']},pool,season:2026,scoringSettings:{rec:1}});
  expect(one.innerHTML).toContain('Matthew Golden');expect(one.innerHTML).toContain('Rising');expect(one.innerHTML).toContain('10 games · 179.9 pts');expect(one.innerHTML).not.toContain('Not enough history');
  const two=host();await renderTrendPanel(two,{team:{playerIds:['other']},pool,season:2026,scoringSettings:{rec:1}});
  expect(two.innerHTML).toContain('Another Player');expect(two.innerHTML).toContain('2025 10.0');expect(two.innerHTML).not.toContain('Matthew Golden');expect(loadSeasonStats).toHaveBeenCalledTimes(3);
  const rescored=host();await renderTrendPanel(rescored,{team:{playerIds:['other']},pool,season:2026,scoringSettings:{rec:.5}});
  expect(rescored.innerHTML).toContain('2025 5.0');
 });
 it('shows first-season games instead of an insufficient-history warning',async()=>{
  const {renderTrendPanel}=await import('./trend-panel.js');const el=host();
  await renderTrendPanel(el,{team:{playerIds:['rookie']},pool:new Map([['rookie',{id:'rookie',name:'Rookie',currentGames:8,currentPoints:80}]]),season:2026,scoringSettings:{rec:1}});
  expect(el.innerHTML).toContain('This season');expect(el.innerHTML).toContain('8 games · 80.0 pts');expect(el.innerHTML).not.toContain('Missed time');
 });
 it('scopes cached records to the requested season',async()=>{
  const {renderTrendPanel}=await import('./trend-panel.js');const{loadSeasonStats}=await import('./sleeper.js');loadSeasonStats.mockClear();
  const options={team:{playerIds:['golden']},pool:new Map([['golden',{id:'golden',name:'Golden'}]]),scoringSettings:{rec:1}};
  await renderTrendPanel(host(),{...options,season:2026});await renderTrendPanel(host(),{...options,season:2025});expect(loadSeasonStats).toHaveBeenCalledTimes(6);
 });
});
