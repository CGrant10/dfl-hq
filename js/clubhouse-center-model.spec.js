import {describe,it,expect} from 'vitest';
import {clubhouseGameMetrics,clubhouseLeaguePulse,clubhousePlayerStatLine} from './clubhouse-center-model.js';
import {clubhouseScoreboardHtml} from './clubhouse-center-ui.js';
const player=(id,slot,points,state='live')=>({id,roster:'1',slot,slotType:slot,position:slot,name:id,points,state});
const team=(roster,score,lineup)=>({roster,name:`Team ${roster}`,score,lineup,starters:lineup,known:lineup.every(p=>p.state!=='unknown'),live:lineup.filter(p=>p.state==='live').length});
const game=(score1=50,score2=54,state='live')=>({id:'1',sides:[team('1',score1,[player('a','RB',10,state),player('b','RB',20,state),player('c','FLEX',5,state)]),team('2',score2,[player('d','RB',15,state),player('e','RB',15,state),player('f','FLEX',0,state)])]});
describe('Clubhouse matchup context',()=>{
 it('shows close-game pressure only for real live, known scores',()=>{
  expect(clubhouseGameMetrics(game()).pressure).toBe(true);
  expect(clubhouseGameMetrics(game(50,70)).pressure).toBe(false);
  expect(clubhouseGameMetrics(game(0,0,'upcoming')).pressure).toBe(false);
  expect(clubhouseGameMetrics(game(null,0)).pressure).toBe(false);
  expect(clubhouseGameMetrics(game(50,54,'final'),true).pressure).toBe(false);
 });
 it('counts live/upcoming/finished starters without treating unknowns or empty slots as finished',()=>{
  const g=game();g.sides[0].lineup=[player('live','QB',10),player('later','RB',0,'upcoming'),player('done','WR',0,'final'),{...player('empty','TE',null,'unknown'),empty:true}];
  expect(clubhouseGameMetrics(g).teams[0]).toMatchObject({live:1,upcoming:1,finished:1,total:3});
  g.sides[0].lineup.push(player('pending','WR',null,'unknown'));
  expect(clubhouseGameMetrics(g).teams[0]).toMatchObject({live:null,upcoming:null,finished:null});
 });
 it('totals starting slots, including Flex, and keeps missing points unknown',()=>{
  const g=game(),rows=clubhouseGameMetrics(g).positional;
  expect(rows).toEqual([{key:'RB',label:'RB',left:30,right:30},{key:'FLEX',label:'FLEX',left:5,right:0}]);
  g.sides[0].lineup[1].points=null;expect(clubhouseGameMetrics(g).positional[0].left).toBeNull();
 });
 it('does not present pregame ties as the tightest battle or zero-point stars',()=>{
  expect(clubhouseLeaguePulse({games:[game(0,0,'upcoming')],starters:[player('qb','QB',0,'upcoming')]})).toMatchObject({high:null,player:null,close:null,live:0});
 });
 it('uses actual team points and skill starters for the league pulse',()=>{
  const g=game();const pulse=clubhouseLeaguePulse({games:[g],starters:[player('rb','RB',25),player('def','DEF',40)]});
  expect(pulse.high.roster).toBe('2');expect(pulse.player.id).toBe('rb');expect(pulse.close.margin).toBe(4);
 });
 it('escapes current team names and exposes every selectable game accessibly',()=>{
  const g=game();g.sides[0].name='<b>My team</b>';
  const html=clubhouseScoreboardHtml({games:[g,{...g,id:'2'}]},'2');
  expect(html).toContain('&lt;b&gt;My team&lt;/b&gt;');expect(html).not.toContain('<b>My team</b>');
  expect(html).toContain('data-clubhouse-game="1" aria-pressed="false"');expect(html).toContain('data-clubhouse-game="2" aria-pressed="true"');
 });
});
describe('Clubhouse player box scores',()=>{
 const p={id:'a',position:'WR',state:'live'},scope={season:2026,week:5};
 const row=(stats,extra={})=>({player_id:'a',season:2026,week:5,season_type:'regular',stats,...extra});
 it('keeps receptions, yards, and touchdowns in a compact real stat line',()=>{
  expect(clubhousePlayerStatLine(p,{data:[row({rec:6,rec_yd:98,rec_td:1})]},scope)).toBe('6 rec · 98 rec yd · 1 rec TD');
 });
 it('never borrows stats from another week, season, or postseason',()=>{
  for(const extra of [{week:4},{season:2025},{season_type:'post'}])expect(clubhousePlayerStatLine(p,{data:[row({rec:6},extra)]},scope)).toBe('No box score yet');
 });
 it('keeps reported zeros while leaving unpublished fields absent',()=>{
  expect(clubhousePlayerStatLine({...p,position:'QB'},{data:[row({pass_yd:0,pass_td:0,pass_int:0,rush_yd:null})]},scope)).toBe('0 pass yd · 0 pass TD · 0 INT');
 });
 it('shows explicit pending/error/loading states without invented numbers',()=>{
  expect(clubhousePlayerStatLine({...p,state:'upcoming'},{data:[row({rec:0})]},scope)).toBe('Yet to play');
  expect(clubhousePlayerStatLine(p,{error:true},scope)).toBe('Stats unavailable');
  expect(clubhousePlayerStatLine(p,{loading:true},scope)).toBe('Loading stats…');
  expect(clubhousePlayerStatLine({...p,empty:true},{error:true},scope)).toBe('');
 });
 it('does not call generic team touchdowns defensive scores',()=>{expect(clubhousePlayerStatLine({...p,position:'DEF'},{data:[row({sack:3,td:3,pts_allow:34})]},scope)).toBe('3 sacks · 34 allowed');expect(clubhousePlayerStatLine({...p,position:'DEF'},{data:[row({sack:3,td:3,def_td:1,def_st_td:1,pts_allow:34})]},scope)).toContain('1 def TD · 1 ST TD')});
 it('does not lose RB receiving touchdowns behind less important zero fields',()=>{
  const line=clubhousePlayerStatLine({...p,position:'RB'},{data:[row({rush_yd:63,rush_td:0,rec:4,rec_yd:30,rec_td:1})]},scope);
  expect(line).toContain('1 rec TD');expect(line).not.toContain('0 rush TD');
 });
});
