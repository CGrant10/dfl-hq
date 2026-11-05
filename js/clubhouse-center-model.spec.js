import {describe,it,expect} from 'vitest';
import {clubhouseGameMetrics,clubhouseLeaguePulse,clubhousePlayerStatLine,clubhouseMatchupOrder,initialClubhouseMatchup} from './clubhouse-center-model.js';
import {clubhouseScoreboardHtml,clubhouseTeamStatsHtml,clubhousePositionStatsHtml} from './clubhouse-center-ui.js';
const player=(id,slot,points,state='live')=>({id,roster:'1',slot,slotType:slot,position:slot,name:id,points,state});
const team=(roster,score,lineup)=>({roster,name:`Team ${roster}`,score,lineup,starters:lineup,known:lineup.every(p=>p.state!=='unknown'),live:lineup.filter(p=>p.state==='live').length});
const game=(score1=50,score2=54,state='live')=>({id:'1',sides:[team('1',score1,[player('a','RB',10,state),player('b','RB',20,state),player('c','FLEX',5,state)]),team('2',score2,[player('d','RB',15,state),player('e','RB',15,state),player('f','FLEX',0,state)])]});
describe('Clubhouse matchup context',()=>{
 it('only calls an actual lead after kickoff or for a completed matchup',()=>{
  expect(clubhouseGameMetrics(game(50,54)).lead).toEqual({side:'right',margin:4,label:'Leading'});
  expect(clubhouseGameMetrics(game(54,50,'final'),true).lead).toEqual({side:'left',margin:4,label:'Winner'});
  for(const state of ['upcoming','unknown'])expect(clubhouseGameMetrics(game(50,54,state)).lead).toBeNull();
  expect(clubhouseGameMetrics(game(50,50)).lead).toBeNull();
  expect(clubhouseGameMetrics(game(null,50)).lead).toBeNull();
  expect(clubhouseGameMetrics(game(-3,-1)).lead).toEqual({side:'right',margin:2,label:'Leading'});
 });
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
 it('leaves unavailable starter status blank and only emphasizes reported positional points after kickoff',()=>{
  const pending=game(50,54,'unknown');
  expect(clubhouseTeamStatsHtml(pending)).toContain('<td>—</td>');
  expect(clubhousePositionStatsHtml(pending)).not.toContain('is-ahead');
  expect(clubhousePositionStatsHtml(game(50,54,'upcoming'))).not.toContain('is-ahead');
  expect(clubhousePositionStatsHtml(game())).toContain('is-ahead');
  const missing=game();missing.sides[0].lineup[2].points=null;
  expect(clubhousePositionStatsHtml(missing)).not.toContain('is-ahead');
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
 it('keeps full identities and exact scores accessible in logo-only matchup chips',()=>{
  const g=game(null,103.45);g.sides[0].name='Bombers & Boys';g.sides[1].name='The <Realm>';
  const html=clubhouseScoreboardHtml({games:[g]},'1',{strip:true});
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('aria-label="View Bombers &amp; Boys versus The &lt;Realm&gt;: — to 103.45"');
  expect(html).toContain('title="Bombers &amp; Boys vs The &lt;Realm&gt;"');
  expect(html).not.toContain('clubhouse-mini-phase');
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


describe('active profile matchup priority',()=>{
 const games=[{id:'1',sides:[{memberId:1},{memberId:2}]},{id:'2',sides:[{memberId:3},{memberId:4}]},{id:'3',sides:[{memberId:5},{memberId:6}]}];
 it('puts either side of the viewing profile first without changing other games or team sides',()=>{
  for(const member of [3,'4']){
   const ordered=clubhouseMatchupOrder(games,member);
   expect(ordered.map(g=>g.id)).toEqual(['2','1','3']);
   expect(ordered[0]).toBe(games[1]);
   expect(ordered[0].sides.map(t=>t.memberId)).toEqual([3,4]);
  }
  expect(games.map(g=>g.id)).toEqual(['1','2','3']);
 });
 it('uses the same priority for the weekly model before live rows arrive',()=>{
  const weekly=games.map(({id,sides})=>({id,left:sides[0],right:sides[1]}));
  expect(clubhouseMatchupOrder(weekly,6).map(g=>g.id)).toEqual(['3','1','2']);
 });
 it('keeps league order for guests, byes or missing profiles',()=>{
  for(const profile of [null,99])expect(clubhouseMatchupOrder(games,profile)).toEqual(games);
  expect(clubhouseMatchupOrder([],1)).toEqual([]);
  expect(clubhouseMatchupOrder([{id:'bye',left:{memberId:1}}],99)).toHaveLength(1);
 });
 it('opens the own matchup ahead of an old stored choice but honors explicit game links',()=>{
  const viewing=games.map(g=>({...g,isMine:g.id==='2'}));
  expect(initialClubhouseMatchup(viewing,{remembered:'3'})).toBe('2');
  expect(initialClubhouseMatchup(viewing,{requested:'1',remembered:'3'})).toBe('1');
  expect(initialClubhouseMatchup(viewing,{requested:'missing',remembered:'3'})).toBe('2');
  expect(initialClubhouseMatchup(games,{remembered:'3'})).toBe('3');
  expect(initialClubhouseMatchup(games,{remembered:'missing'})).toBe('1');
  expect(initialClubhouseMatchup([])).toBeUndefined();
 });
});
