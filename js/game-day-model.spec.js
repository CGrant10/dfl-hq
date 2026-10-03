import {describe,it,expect} from 'vitest';
import {buildGameDay,gameDayHighlights,kickoffCountdown,gameDayLineup} from './game-day-model.js';
const week={season:2026,week:4,completed:false,games:[{matchup_id:1,user1:'one',user2:'two',roster1:1,roster2:2}]};
const members=[{id:11,sleeper_user_id:'one',team_name:'Home'},{id:12,sleeper_user_id:'two',team_name:'Away'}];
const players={a:{n:'Player A',p:'QB',t:'BUF'},b:{n:'Player B',p:'WR',t:'NYG'},bench:{n:'Bench',p:'RB',t:'BUF'}};
const build=(a=10,b=12)=>buildGameDay({week,members,memberId:11,players,rows:[{roster_id:1,starters:['a'],points:a,players_points:{a,bench:40}},{roster_id:2,starters:['b'],points:b,players_points:{b}}]});
describe('GameDay actual score tracking',()=>{
 it('tracks submitted starters and excludes a high-scoring bench player',()=>{const model=build();expect(model.starters.map(p=>p.id)).toEqual(['a','b']);expect(model.mine.map(p=>p.id)).toEqual(['a']);expect(model.leaders[0].id).toBe('b')});
 it('keeps missing scores unknown and does not invent projection points',()=>{const model=buildGameDay({week,members,players});expect(model.games[0].sides[0].score).toBeNull();expect(model.leaders).toEqual([])});
 it('detects real lead changes, scoring jumps and threshold crossings between snapshots',()=>{const old=build(10,12),next=build(23,12),highlights=gameDayHighlights(next,old.snapshot);expect(highlights.map(h=>h.kind)).toEqual(['lead','surge','big']);expect(highlights[1].text).toContain('+13.00 fantasy points');expect(highlights.some(h=>/touchdown/i.test(h.text))).toBe(false)});
 it('does not repeat highlights on unchanged stats or score corrections',()=>{const model=build(25,12);expect(gameDayHighlights(model,model.snapshot)).toEqual([]);expect(gameDayHighlights(build(20,12),model.snapshot)).toEqual([])});
 it('shows initial big days without fabricating a previous lead or a score jump',()=>{expect(gameDayHighlights(build(25,12)).map(h=>h.kind)).toEqual(['big'])});
 it('handles tied and missing leaders without false lead-change alerts',()=>{expect(gameDayHighlights(build(12,12),build(10,12).snapshot)).toEqual([])});
 it('does not assign unmapped starters to a guest',()=>{const model=buildGameDay({week,players,rows:[{roster_id:1,starters:['a'],points:1,players_points:{a:1}}]});expect(model.mine).toEqual([])});
 it('formats an upcoming countdown and stops it at kickoff',()=>{expect(kickoffCountdown(3600000,0)).toBe('1h 0m to kickoff');expect(kickoffCountdown(60000,0)).toBe('1m to kickoff');expect(kickoffCountdown(100,100)).toBe('')});
});

describe('GameDay lineup slots and bench',()=>{
 it('labels Flex by the assigned slot, keeps duplicate positions and displays kicker before defense',()=>{const row={starters:['a','r1','r2','w1','w2','t','b','d','k'],players:['a','r1','r2','w1','w2','t','b','d','k','bench'],players_points:{bench:40}};const roster=gameDayLineup(row,players,null,{rosterPositions:['QB','RB','RB','WR','WR','TE','FLEX','DEF','K','BN']});expect(roster.lineup.map(p=>p.slot)).toEqual(['QB','RB','RB','WR','WR','TE','Flex','Kicker','Def']);expect(roster.lineup[6].id).toBe('b');expect(roster.lineup[6].position).toBe('WR');expect(roster.bench.map(p=>p.id)).toEqual(['bench']);expect(roster.bench[0].points).toBe(40)});
 it('keeps an empty starter slot without counting it as a player',()=>{const roster=gameDayLineup({starters:['a','0','b'],players:['a','b','bench']},players);expect(roster.lineup[1]).toMatchObject({slot:'RB',empty:true,points:null});expect(roster.bench.map(p=>p.id)).toEqual(['bench'])});
});

describe('opponent lineup tracking',()=>{
 it('keeps both teams slot assignments and benches with their identities',()=>{const model=buildGameDay({week,members,memberId:11,players,rows:[{roster_id:1,starters:['a'],players:['a','bench'],players_points:{a:10,bench:40},points:10},{roster_id:2,starters:['b'],players:['b','bench'],players_points:{b:12,bench:30},points:12}]});const opponent=model.games[0].sides[1];expect(opponent.identity.team_name).toBe('Away');expect(opponent.lineup[0]).toMatchObject({id:'b',roster:'2',points:12,isMine:false});expect(opponent.bench[0]).toMatchObject({id:'bench',roster:'2',points:30});expect(model.bench[0].points).toBe(40);expect(model.leaders.map(p=>p.id)).not.toContain('bench')});
});
