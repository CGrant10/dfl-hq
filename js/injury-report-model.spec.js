import {describe,it,expect} from 'vitest';
import {buildInjuryReport,injuryAvailability,injuryReportSlides} from './injury-report-model.js';
const entry=(id,name,status,position='WR',team='BUF',date='2026-10-03T12:00:00Z')=>({status,date,athlete:{id,displayName:name,position:{abbreviation:position},team:{abbreviation:team}},details:{type:'Ankle',returnDate:'2026-10-04'}});
const payload=items=>({timestamp:'2026-10-03T12:00:00Z',injuries:[{injuries:items}]});
describe('injury report availability and priority',()=>{
 it('never turns uncertain tags or an estimated return date into confirmed availability',()=>{expect(injuryAvailability('Questionable').availability).toBe('Decision pending');expect(injuryAvailability('Doubtful').availability).toBe('Unlikely to play');expect(injuryAvailability('Out').availability).toBe('Ruled out');expect(injuryAvailability('Injured Reserve')).toMatchObject({tag:'IR',availability:'Unavailable'});expect(injuryAvailability('unknown').availability).toBe('Not confirmed');expect(buildInjuryReport(payload([entry('1','One','Questionable')])).items[0].availability).toBe('Decision pending')});
 it('ranks DFL starters before bench, then NFL skill players, with ADP within tiers',()=>{
  const players=[{id:'s',name:'Starter Jr.',nflTeam:'BUF',position:'WR',adp:50},{id:'b',name:'Bench',nflTeam:'BUF',position:'WR',adp:1},{id:'s2',name:'Star',nflTeam:'BUF',position:'WR',adp:10}];
  const analysis={state:'ready',pool:new Map(players.map(p=>[p.id,p])),teams:[{team_name:'DFL club',playerIds:['s','b','s2'],starters:['s','s2']}]};
  const report=buildInjuryReport(payload([entry('5','Lineman','Out','OT'),entry('2','Bench','Out'),entry('3','Free agent','Out','QB'),entry('1','Starter','Questionable'),entry('4','Star','Questionable')]),{analysis});
  expect(report.items.map(p=>p.id)).toEqual(['4','1','2','3']);expect(report.starters).toBe(2);expect(report.owned).toBe(3);expect(report.items[1]).toMatchObject({owner:'DFL club',starter:true,sleeperId:'s'});
 });
 it('includes offensive fantasy positions and excludes even rostered defenders, linemen and special teams',()=>{
  const all=['QB','RB','WR','TE','DE','DT','LB','CB','S','DB','OT','OG','C','FB','K','P',''];
  const analysis={state:'ready',pool:new Map([['d',{id:'d',name:'Player DE',nflTeam:'BUF',position:'DE'}]]),teams:[{playerIds:['d'],starters:['d']}]};
  const report=buildInjuryReport(payload(all.map((pos,i)=>entry(String(i),`Player ${pos}`,'Out',pos))),{analysis});
  expect(report.items.map(p=>p.position).sort()).toEqual(['QB','RB','TE','WR']);expect(report.owned).toBe(0);
 });
 it('retains an excluded player’s actual injury when an individual card requests unrestricted records',()=>{
  const source=payload([entry('k','Kicker','Out','K'),entry('d','Defender','Doubtful','LB')]);
  expect(buildInjuryReport(source).items).toHaveLength(0);
  expect(buildInjuryReport(source,{offenseOnly:false}).items).toEqual(expect.arrayContaining([expect.objectContaining({id:'k',position:'K',tag:'Out',availability:'Ruled out'}),expect.objectContaining({id:'d',position:'LB',tag:'Doubtful',availability:'Unlikely to play'})]));
 });
 it('deduplicates by athlete and uses the newer report, excluding healthy feed entries',()=>{const report=buildInjuryReport(payload([entry('1','One','Questionable','WR','BUF','2026-10-02'),entry('1','One','Out'),entry('2','Healthy','Active')]));expect(report.items).toHaveLength(1);expect(report.items[0].tag).toBe('Out')});
 it('removes an older injury when the latest duplicate entry is active',()=>{expect(buildInjuryReport(payload([entry('1','One','Out','WR','BUF','2026-10-02'),entry('1','One','Active')])).items).toHaveLength(0)});
 it('supports ESPN athletes identified by headshots instead of an id field',()=>{const p=entry('1','One','Out');delete p.athlete.id;p.athlete.headshot={href:'https://a.espncdn.com/i/headshots/nfl/players/full/1234.png'};expect(buildInjuryReport(payload([p])).items[0].id).toBe('1234')});
 it('does not guess a roster owner for ambiguous or wrong-team names',()=>{const player={id:'s',name:'Same',nflTeam:'BUF',position:'WR'};const analysis={pool:new Map([['s',player],['b',{...player,id:'b'}]]),teams:[{playerIds:['s'],starters:['s']}]};expect(buildInjuryReport(payload([entry('1','Same','Out')]),{analysis}).items[0].owner).toBe('');expect(buildInjuryReport(payload([entry('1','Same','Out','WR','KC')]),{analysis}).items[0].owner).toBe('')});
 it('splits the top four across two sparse cards without duplicating players or losing the full report',()=>{
 const report=buildInjuryReport(payload(Array.from({length:7},(_,i)=>entry(String(i),`Player ${i}`,'Questionable'))));
 const slides=injuryReportSlides(report);
 expect(report.items).toHaveLength(7);expect(slides.map(s=>s.players.length)).toEqual([2,2]);
 expect(slides.flatMap(s=>s.players)).toEqual(report.items.slice(0,4));
 expect(new Set(slides.map(s=>s.id)).size).toBe(2);expect(slides.every(s=>s.total===7&&s.pages===2)).toBe(true);
 });
 it('keeps an empty or unavailable report to one card and handles an odd player count',()=>{
 expect(buildInjuryReport({})).toBeNull();expect(injuryReportSlides(null)).toMatchObject([{available:false,checkedAt:0,players:[]}]);
 expect(injuryReportSlides(buildInjuryReport(payload([])))).toMatchObject([{available:true,total:0,pages:1}]);
 expect(injuryReportSlides(buildInjuryReport(payload([entry('1','One','Out'),entry('2','Two','Out'),entry('3','Three','Out')]))).map(s=>s.players.length)).toEqual([2,1]);
 });
});

describe('injury impact inside league relevance groups',()=>{
 it('puts an important questionable starter ahead of a low-impact out, but comparable outs ahead of questionable players',()=>{
  const players=[{id:'star',name:'Star',nflTeam:'BUF',position:'WR',adp:3},{id:'q',name:'Comparable Q',nflTeam:'BUF',position:'WR',adp:20},{id:'out',name:'Comparable Out',nflTeam:'BUF',position:'WR',adp:20},{id:'depth',name:'Depth',nflTeam:'BUF',position:'WR',adp:250}];
  const analysis={state:'ready',pool:new Map(players.map(p=>[p.id,p])),teams:[{playerIds:players.map(p=>p.id),starters:players.map(p=>p.id)}]};
  const report=buildInjuryReport(payload(players.map(p=>entry(p.id,p.name,['star','q'].includes(p.id)?'Questionable':'Out'))),{analysis});
  expect(report.items.map(p=>p.id)).toEqual(['out','star','q','depth']);
 });
 it('uses current usable expert importance and falls back when the expert snapshot is stale',()=>{
  const players=[{id:'a',name:'A',nflTeam:'BUF',position:'WR',adp:100,expert:{rank:2},expertWeight:.5},{id:'b',name:'B',nflTeam:'BUF',position:'WR',adp:10,expert:{rank:200},expertWeight:.5}];
  const analysis={state:'ready',pool:new Map(players.map(p=>[p.id,p])),teams:[]};
  expect(buildInjuryReport(payload(players.map(p=>entry(p.id,p.name,'Out'))),{analysis}).items.map(p=>p.id)).toEqual(['a','b']);
  players.forEach(p=>p.expertWeight=0);
  expect(buildInjuryReport(payload(players.map(p=>entry(p.id,p.name,'Out'))),{analysis}).items.map(p=>p.id)).toEqual(['b','a']);
 });
 it('keeps the complete report beyond the old four-player broadcast limit',()=>{
  const report=buildInjuryReport(payload(Array.from({length:127},(_,i)=>entry(String(i),`Player ${i}`,'Questionable'))));
  expect(report.items).toHaveLength(127);expect(new Set(report.items.map(p=>p.id)).size).toBe(127);
 });
});
