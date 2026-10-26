import {describe,it,expect} from 'vitest';
import {indexPlayerWeeks,playerWeekDetail,playerWeekDetailHtml} from './player-week-detail-model.js';
import {loadPlayerWeekDetails} from './player-week-detail-data.js';
const scope={season:2026,week:4},player={id:'p',roster:'1',position:'WR',state:'live'};
const row=(week,points,gp=1,extra={})=>({player_id:'p',season:2026,week,season_type:'regular',stats:{gp,pts_ppr:points,rec:7,rec_yd:96,rec_td:1},...extra});
const weeks=()=>[1,2,3,4].map(week=>({week,data:[row(week,week*10)]}));
const detail=(changes={},bundles=weeks(),context=scope)=>playerWeekDetail({...player,...changes},indexPlayerWeeks(bundles,context),context);
describe('weekly player rows and PPR average',()=>{
 it('shows the selected real stat line and completed-season PPR average while a game is live',()=>{
  expect(detail()).toMatchObject({line:'7 rec · 96 yd · 1 TD',average:20,games:3});
 });
 it('includes this week only after this player or the whole league week is final',()=>{
  expect(detail({state:'final'})).toMatchObject({average:25,games:4});
  expect(detail({},weeks(),{...scope,completed:true})).toMatchObject({average:25,games:4});
  expect(detail({state:'upcoming'})).toMatchObject({line:'Yet to play',average:20,games:3});
 });
 it('excludes byes and DNPs but retains true zero and negative PPR appearances',()=>{
  const bundles=[{week:1,data:[row(1,0)]},{week:2,data:[row(2,80,0)]},{week:3,data:[row(3,-2)]},{week:4,data:[]}];
  expect(detail({},bundles)).toMatchObject({average:-1,games:2});
  bundles[1].data=[row(2,10,1,{player_id:'another-player'})];expect(detail({},bundles)).toMatchObject({average:-1,games:2});
 });
 it('never uses future weeks, a different season or postseason for a historical average',()=>{
  const bundles=weeks();bundles[0].data.push(row(1,999,1,{season:2025}),row(1,999,1,{season_type:'post'}));bundles.push({week:5,data:[row(5,999)]});
  expect(detail({},bundles)).toMatchObject({average:20,games:3});
 });
 it('uses the PPR source total, independently of DFL bonuses or the live fantasy score',()=>{
  const bundles=weeks();bundles[0].data[0].stats.pts_ppr=1.5;
  expect(detail({points:999},bundles).average).toBeCloseTo((1.5+20+30)/3);
 });
 it('treats an unpublished completed week as missing history rather than a player bye',()=>{
  const bundles=weeks();bundles[1].data=[];expect(detail({},bundles).average).toBeNull();
 });
 it('does not invent averages when completed history or PPR scoring is missing',()=>{
  expect(detail({},weeks().slice(1)).average).toBeNull();
  const bundles=weeks();bundles[1].error=true;expect(detail({},bundles).average).toBeNull();
  delete bundles[1].error;delete bundles[0].data[0].stats.pts_ppr;expect(detail({},bundles).average).toBeNull();
  expect(detail({},[{week:4,data:[]}])).toMatchObject({line:'No box score yet',average:null});
 });
 it('marks cached averages honestly and renders escaped, accessible compact metrics',()=>{
  const bundles=weeks();bundles[0].stale=true;
  const result=detail({},bundles);expect(result.stale).toBe(true);
  expect(playerWeekDetailHtml(player,result)).toContain('20.0 PPR/g · cached');
  expect(playerWeekDetailHtml(player,result)).toContain('PPR points per completed game, 3 games');
  expect(playerWeekDetailHtml(player,{line:'<script>bad</script>'})).toContain('&lt;script&gt;');
  expect(playerWeekDetailHtml({...player,empty:true})).toBe('');
  bundles[3].stale=true;expect(detail({},bundles).line).toContain(' · cached');
 });
 it('keeps first-game pregame averages unknown rather than zero',()=>{
  const context={season:2026,week:1};expect(detail({state:'upcoming'},[{week:1,data:[row(1,99)]}],context)).toMatchObject({average:null,games:0});
 });
});
describe('shared weekly data loading',()=>{
 it('loads each week once for all players and uses short live versus long settled caches',async()=>{
  const calls=[],load=async(season,week,options)=>{calls.push({season,week,...options});return {data:[row(week,10)],fetchedAt:1}};
  const result=await loadPlayerWeekDetails(2026,4,{load});expect(result).toHaveLength(4);
  expect(calls).toEqual([{season:2026,week:1,maxAgeMs:21600000},{season:2026,week:2,maxAgeMs:21600000},{season:2026,week:3,maxAgeMs:300000},{season:2026,week:4,maxAgeMs:60000}]);
  calls.length=0;await loadPlayerWeekDetails(2026,4,{load,force:true});expect(calls.at(-1).maxAgeMs).toBe(0);
 });
 it('keeps the current stat line usable after a historical source fails, without publishing a partial average',async()=>{
  const result=await loadPlayerWeekDetails(2026,4,{load:async(_season,week)=>{if(week===2)throw Error('offline');return {data:[row(week,10)]}}});
  expect(result[1]).toMatchObject({week:2,error:true});expect(detail({},result)).toMatchObject({line:'7 rec · 96 yd · 1 TD',average:null});
 });
 it.each([[2026,0],[2026,19],[2026,1.5],[null,4]])('ignores invalid scope %s/%s without network requests',async(season,week)=>{
  let calls=0;expect(await loadPlayerWeekDetails(season,week,{load:async()=>{calls++;return {data:[]}}})).toEqual([]);expect(calls).toBe(0);
 });
});
