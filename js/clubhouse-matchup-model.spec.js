import {describe,it,expect} from 'vitest';
import {nflWeekStatuses,matchupTeamView,matchupPhase} from './clubhouse-matchup-model.js';
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

describe('NFL halftime checkpoint',()=>{
 it('does not use elapsed time or first-half scores to infer halftime',()=>{for(const [period,state,completed,expected] of [[1,'in',false,false],[2,'in',false,false],[3,'in',false,true],[4,'in',false,true],[5,'in',false,true],[0,'pre',false,false],[0,'post',true,true]]){const payload={season:{year:2026,type:2},week:{number:4},events:[{status:{period,type:{state,completed}},competitions:[{competitors:[{team:{abbreviation:'PIT'}}]}]}]};const schedule=nflWeekStatuses(payload,2026,4);expect(schedule.get('PIT').afterHalftime).toBe(expected);expect(matchupTeamView({starters:['a']},players,schedule).starters[0].afterHalftime).toBe(expected)}});
});
