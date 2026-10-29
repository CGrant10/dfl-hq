import {describe,it,expect} from 'vitest';
import {scoreHistoryPoints,matchupMomentum} from './matchup-momentum.js';
import {momentumMarkup,momentumDetail} from './matchup-momentum-ui.js';
const now=Date.parse('2026-10-25T20:00:00Z'),model={leagueId:'dfl',season:2026,week:7},game={id:'5',sides:[{roster:'1',name:'North'},{roster:'2',name:'South'}]};
const score=(id,score1,score2,extra={})=>({id,league_id:'dfl',season:2026,week:7,matchup_id:5,roster1:1,roster2:2,score1,score2,observed_at:new Date(now-60000+id*1000).toISOString(),...extra});
describe('observed matchup momentum',()=>{
 it('keeps exact zeroes, negative scores and stat corrections in observed order',()=>{
  const rows=[score(3,5.5,4),score(1,0,-1),score(2,6,4),score(2,6,4)];
  expect(scoreHistoryPoints(rows,model,game,{now}).map(p=>p.scores)).toEqual([[0,-1],[6,4],[5.5,4]]);
 });
 it('refuses the wrong league, edition, matchup, roster pair, unknown score and future clock',()=>{
  const valid=score(1,42,40),bad=[{league_id:'other'},{season:2025},{week:8},{matchup_id:9},{roster1:3},{roster2:1},{score1:null},{score2:''},{observed_at:new Date(now+60000).toISOString()}];
  expect(scoreHistoryPoints(bad.map((change,i)=>({...valid,id:i+2,...change})),model,game,{now})).toEqual([]);
 });
 it('maps reversed rosters explicitly and never uses team names to guess a score',()=>{
  expect(scoreHistoryPoints([score(1,40,42,{roster1:2,roster2:1})],model,game,{now})[0].scores).toEqual([42,40]);
 });
 it('does not manufacture kickoff, fill gaps or infer fantasy points from a touchdown',()=>{
  const moment={key:'9',eventKey:'nfl:123:9:1',kind:'touchdown',roster:'1',matchupId:'5',at:now-500,text:'A touchdown',player:{id:'12',name:'Receiver'},recap:{play:{gameId:'123',id:'9',yards:42,period:3,clock:'2:00'}}};
  const view=matchupMomentum([moment],[score(1,42,40),score(2,60,45)],model,game,{now});
  expect(view.points).toHaveLength(2);expect(view.points[0].scores).toEqual([42,40]);expect(view.paths.every(p=>!p.includes('C'))).toBe(true);
  const detail=momentumDetail(view.entries.find(e=>e.moment),game,model);
  expect(detail).toContain('42 yd');expect(detail).not.toContain('+6');expect(detail).toContain('data-player-week="7"');expect(detail).toContain('nflGame=123');
 });
 it('retains an explicitly chosen checkpoint after newer data and follows latest only on request',()=>{
  const first=[score(1,42,40),score(2,60,45)],next=[...first,score(3,80,75)];
  expect(matchupMomentum([],next,model,game,{selected:'score:1',now}).choice.scores).toEqual([42,40]);
  expect(matchupMomentum([],next,model,game,{now}).choice.scores).toEqual([80,75]);
 });
 it('uses complete saved lead receipts when checkpoint loading is unavailable',()=>{
  const lead={key:'9',kind:'lead',matchupId:'5',roster:'1',at:now-1000,text:'North takes the lead',recap:{sides:[{roster:'2',points:40},{roster:'1',points:42}]}};
  const view=matchupMomentum([lead],[],model,game,{now});expect(view.points[0].scores).toEqual([42,40]);expect(view.entries).toHaveLength(1);
  expect(matchupMomentum([{...lead,recap:{sides:[{points:40},{points:42}]}}],[],model,game,{now}).points).toEqual([]);
 });
 it('bounds empty views and exposes a native scrubber with a meaningful score description',()=>{
  const empty=matchupMomentum([],[],model,game,{now});expect(empty.paths).toEqual(['','']);expect(empty.choice).toBeNull();
  expect(momentumMarkup(empty,game,model)).toContain('No recorded scores yet.');
  const view=matchupMomentum([],[score(1,0,0)],model,game,{now}),html=momentumMarkup(view,game,model);
  expect(html).toContain('type="range"');expect(html).toContain('North, 0.00');expect(html).not.toContain('NaN');
 });
});
