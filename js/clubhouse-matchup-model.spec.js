import {describe,it,expect} from 'vitest';
import {nflWeekStatuses,matchupTeamView,matchupPhase,matchupSummary} from './clubhouse-matchup-model.js';
const players={a:{n:'QB',p:'QB',t:'PIT'},b:{n:'RB',p:'RB',t:'WAS'},c:{n:'WR',p:'WR',t:'SEA'}};
const row={starters:['a','b','c','0'],points:12,players_points:{a:0,b:12}};
const schedule=new Map([['PIT',{key:'final'}],['WAS',{key:'live'}],['SEA',{key:'upcoming'}]]);
describe('matchup game-day states',()=>{
 it('counts live and upcoming starters remaining, including a final player scoring zero',()=>{const t=matchupTeamView(row,players,schedule);expect(t.remaining).toBe(2);expect(t.live).toBe(1);expect(t.score).toBe(12);expect(t.featured.map(p=>p.id)).toEqual(['a','b'])});
 it('keeps missing schedule status unknown instead of treating everyone as finished',()=>{expect(matchupTeamView(row,players,null).remaining).toBeNull();expect(matchupTeamView(row,players,new Map()).remaining).toBeNull()});
 it('does not invent a starting lineup or score',()=>{const t=matchupTeamView(undefined,players,schedule);expect(t.remaining).toBeNull();expect(t.score).toBeNull();expect(t.featured).toEqual([])});
 it('takes finality from the completed league week',()=>{const t=matchupTeamView(row,players,null,{completed:true});expect(t.remaining).toBe(0);expect(matchupPhase(t,t,true).label).toBe('Final')});
 it('identifies live and upcoming matchups without calling an unfinished week final',()=>{const t=matchupTeamView(row,players,schedule);expect(matchupPhase(t,t,false).label).toBe('Live');const pre=matchupTeamView({starters:['c']},players,schedule);expect(matchupPhase(pre,pre,false).label).toBe('Upcoming');const done=matchupTeamView({starters:['a']},players,schedule);expect(matchupPhase(done,done,false).label).toBe('In progress')});
 it('validates the NFL season and week and normalizes Washington abbreviations',()=>{const payload={season:{year:2026,type:2},week:{number:4},events:[{status:{type:{state:'post',completed:true}},competitions:[{competitors:[{team:{abbreviation:'WSH'}}]}]}]};expect(nflWeekStatuses(payload,2026,4).get('WAS').key).toBe('final');expect(()=>nflWeekStatuses(payload,2026,5)).toThrow();expect(()=>nflWeekStatuses({...payload,season:{year:2025,type:2}},2026,4)).toThrow()});
});

describe('matchup lead and result copy',()=>{
 const left={name:'The Boys',memberId:1,score:120.2,known:true,live:1,starters:[{state:'live'}]};
 const right={name:'The Rivals',memberId:2,score:118.8,known:true,live:0,starters:[{state:'final'}]};
 it('uses actual scoring precision and the selected member’s side',()=>{
  expect(matchupSummary(left,right)).toBe('The Boys leads by 1.40');
  expect(matchupSummary(left,right,{memberId:'1'})).toBe('You lead by 1.40');
  expect(matchupSummary(left,right,{memberId:2})).toBe('You trail by 1.40');
  expect(matchupSummary(left,right,{compact:true})).toBe('1.40-point game');
 });
 it('does not turn pregame forecasts, absent scores or unknown status into a lead',()=>{
  const pre=team=>({...team,live:0,starters:[{state:'upcoming'}]});
  expect(matchupSummary(pre(left),pre(right))).toBe('Ready for kickoff');
  expect(matchupSummary({...left,score:null},right)).toBe('Scores pending');
  expect(matchupSummary({...left,live:0,known:false},right)).toBe('Player status pending');
  expect(matchupSummary({},{})).toBe('Scores pending');
 });
 it('uses final wording only for a completed week and preserves ties and corrections',()=>{
  expect(matchupSummary(left,right,{completed:true,memberId:1})).toBe('Won by 1.40');
  expect(matchupSummary(left,right,{completed:true,memberId:2})).toBe('Lost by 1.40');
  expect(matchupSummary(left,{...right,score:120.2},{completed:true})).toBe('Finished level');
  expect(matchupSummary({...left,score:120.204},{...right,score:120.2})).toBe('All square');
  expect(matchupSummary({...left,score:null},right,{completed:true})).toBe('Final score pending');
  expect(matchupSummary({...left,score:118},right,{memberId:1})).toBe('You trail by 0.80');
 });
});

describe('NFL halftime checkpoint',()=>{
 it('does not use elapsed time or first-half scores to infer halftime',()=>{for(const [period,state,completed,expected] of [[1,'in',false,false],[2,'in',false,false],[3,'in',false,true],[4,'in',false,true],[5,'in',false,true],[0,'pre',false,false],[0,'post',true,true]]){const payload={season:{year:2026,type:2},week:{number:4},events:[{status:{period,type:{state,completed}},competitions:[{competitors:[{team:{abbreviation:'PIT'}}]}]}]};const schedule=nflWeekStatuses(payload,2026,4);expect(schedule.get('PIT').afterHalftime).toBe(expected);expect(matchupTeamView({starters:['a']},players,schedule).starters[0].afterHalftime).toBe(expected)}});
});
