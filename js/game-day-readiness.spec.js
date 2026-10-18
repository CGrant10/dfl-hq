import {describe,expect,it} from 'vitest';
import {starterWarnings,lineupCheckHtml,kickoffLabel} from './game-day-readiness.js';
import {gameDayLineup} from './game-day-model.js';
import {playerScorePhase} from './game-day-player-rows.js';
import {scoreFreshness} from './score-freshness.js';

describe('game-day lineup checks',()=>{
 it('shares unavailable designations and honors kickoff locks even when the feed still says upcoming',()=>{
  const now=Date.parse('2026-10-18T16:00:00Z'),kickoff='2026-10-18T17:00:00Z';
  for(const status of ['Sus','NA','DNR','IR'])expect(starterWarnings([{id:status,state:'upcoming',availabilityStatus:status,kickoff}],{now})).toHaveLength(1);
  expect(starterWarnings([{id:'x',state:'upcoming',injuryStatus:'Out',kickoff}],{now:Date.parse(kickoff)})).toEqual([]);
 });
 it('expands only confirmed actionable issues close to kickoff',()=>{
  const now=Date.parse('2026-10-18T16:00:00Z'),side={name:'Team',lineup:[{id:'x',state:'upcoming',injuryStatus:'Out',kickoff:'2026-10-18T17:00:00Z',slot:'WR'}]};
  expect(lineupCheckHtml([side],{now})).toContain('data-lineup-check open');
  expect(lineupCheckHtml([side],{now:now-2*3600000})).not.toContain('data-lineup-check open');
  expect(lineupCheckHtml([{...side,lineup:[{...side.lineup[0],injuryStatus:'Questionable'}]}],{now})).not.toContain('data-lineup-check open');
 });
  const p=(id,injuryStatus='',state='upcoming')=>({id,name:`Player ${id}`,slot:'WR',state,injuryStatus});
  it('flags submitted empty slots and upcoming availability concerns, excluding bench and completed players',()=>{
    const lineup=[{empty:true,slot:'Flex'},p('q','Questionable'),p('out','Out'),p('live','Questionable','live'),p('done','Out','final'),p('healthy')];
    expect(starterWarnings(lineup).map(p=>p.reason)).toEqual(['Empty slot','Questionable','Out']);
    expect(starterWarnings(lineup,{completed:true})).toEqual([]);
    const roster=gameDayLineup({starters:['starter'],players:['starter','bench']},{starter:{n:'Starter',p:'WR'},bench:{n:'Bench',i:'Out'}});
    expect(starterWarnings(roster.lineup)).toEqual([]);
  });
  it('does not confuse missing player status with a healthy or unavailable designation',()=>{
    expect(starterWarnings([p('unknown','','unknown')])).toEqual([]);
    expect(starterWarnings([p('unknown','Questionable','unknown')])).toHaveLength(1);
    expect(starterWarnings([{...p('reserve','Questionable'),availabilityStatus:'IR'}])[0].reason).toBe('IR');
  });
  it('shows truthful collapsed counts and escapes team and player names',()=>{
    const html=lineupCheckHtml([{name:'<b>Team</b>',lineup:[{empty:true,slot:'Flex'},p('<img>','Out')]}]);
    expect(html).toContain('1 open slot · 1 status flag');expect(html).toContain('&lt;b&gt;Team&lt;/b&gt;');
    expect(html).toContain('&lt;img&gt;');expect(html).not.toContain('<details open');
    expect(lineupCheckHtml([{lineup:[p('out','Out')]}],{completed:true})).toBe('');
    expect(lineupCheckHtml([{name:'Unknown',lineup:[]}])).toBe('');
  });
  it('uses only known scheduled kickoff times and keeps completed phases final',()=>{
    expect(kickoffLabel('bad')).toBe('');expect(kickoffLabel(null)).toBe('');
    const kickoff='2026-10-11T17:00:00Z';expect(kickoffLabel(kickoff)).toContain('Sun');
    expect(playerScorePhase({...p('x'),kickoff})).toBe(kickoffLabel(kickoff));
    expect(playerScorePhase({...p('x','','final'),kickoff})).toBe('Final');
    expect(playerScorePhase(p('x','','unknown'))).toBe('Status pending');
  });
});

describe('score freshness',()=>{
  it('distinguishes current, delayed, failed, and offline scores without claiming they are live',()=>{
    const values={checkedAt:1000,now:181000};
    expect(scoreFreshness(values)).toEqual({state:'delayed',text:'Scores delayed · last checked 3m ago'});
    expect(scoreFreshness({...values,state:'offline'}).text).toBe('Offline · last checked 3m ago');
    expect(scoreFreshness({...values,state:'error'}).state).toBe('error');
    expect(scoreFreshness({checkedAt:1000,now:1001}).text).toBe('Checked just now');
    expect(scoreFreshness({...values,completed:true}).state).toBe('ready');
  });
  it('keeps unknown scores and unavailable lineup or NFL status explicit',()=>{
    expect(scoreFreshness({state:'offline'}).text).toBe('Offline · scores unavailable');
    expect(scoreFreshness({state:'error'}).text).toBe('Scores unavailable · try Refresh');
    expect(scoreFreshness({checkedAt:1,now:1,playersAvailable:false}).text).toContain('Lineup status unavailable');
    expect(scoreFreshness({checkedAt:1,now:1,nflAvailable:false}).text).toContain('NFL status unavailable');
  });
});
