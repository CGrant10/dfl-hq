import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {nflPlayTeam,nflPlayField,nflBoardAhead} from './nfl-field-model.js';
import {nflCenterGames,nflCenterPlays,nflObservedGame} from './nfl-game-center-model.js';
const {teams,plays}=JSON.parse(readFileSync(new URL('../tools/fixtures/nfl-field-plays.json',import.meta.url),'utf8'));
const field=p=>nflPlayField(p,teams);
const summary=rows=>({header:{id:'401873023',season:{year:2026,type:2},competitions:[{status:{type:{state:'in',shortDetail:'Q1'}},competitors:teams.map(t=>({team:{id:t.id,abbreviation:t.code},homeAway:t.home?'home':'away',score:'3'}))}]},drives:{previous:[{plays:rows}]}});

it('uses official coordinates for both teams with a stable left/right field',()=>{
 const away=field(plays.away_gain),home=field(plays.home_gain);
 expect(away.start.team).toBe('CAR');expect(away.end.x).toBeGreaterThan(away.start.x);
 expect(home.start.team).toBe('GB');expect(home.end.x).toBeLessThan(home.start.x);
 expect(home.start.x).toBe(plays.home_gain.start.yardsToEndzone);
 expect(away.start.x).toBe(100-plays.away_gain.start.yardsToEndzone);
 expect(away.target-away.start.x).toBe(plays.away_gain.start.distance);
 expect(home.start.x-home.target).toBe(plays.home_gain.start.distance);
});
it('uses the documented yard-line coordinate when quick updates omit yards to goal',()=>{
 for(const p of Object.values(plays)){
  const copy=structuredClone(p);delete copy.start.yardsToEndzone;delete copy.end.yardsToEndzone;
  expect(field(copy)).toMatchObject({start:{x:field(p).start.x},end:{x:field(p).end.x}});
 }
});
it('keeps negative and zero yardage and treats a possession change in physical field coordinates',()=>{
 expect(field(plays.loss)).toMatchObject({yards:plays.loss.statYardage,voided:false});
 expect(field(plays.zero)).toMatchObject({yards:0,animate:false});
 const turnover=field(plays.turnover);expect(turnover).toMatchObject({turnover:true,start:{team:'GB'},end:{team:'CAR'}});
 expect(turnover.end.x).toBe(100-plays.turnover.end.yardsToEndzone);
});
it('does not turn a field goal into a touchdown or animate a nullified play',()=>{
 expect(field(plays.field_goal)).toMatchObject({touchdown:false});
 expect(field(plays.touchdown)).toMatchObject({touchdown:true,voided:false});
 expect(field(plays.no_play)).toMatchObject({voided:true,touchdown:false,animate:false});
 expect(field({...plays.touchdown,text:plays.touchdown.text+' No Play.'})).toMatchObject({voided:true,touchdown:false,animate:false});
});
it('preserves goal-line zero and leaves incomplete or foreign locations unplotted',()=>{
 expect(field({...plays.away_gain,end:{team:plays.away_gain.end.team,yardsToEndzone:0}}).end.x).toBe(100);
 expect(field({...plays.home_gain,end:{team:plays.home_gain.end.team,yardsToEndzone:0}}).end.x).toBe(0);
 for(const end of [undefined,{}, {team:{id:'999'},yardLine:30},{team:{id:'29'},yardsToEndzone:101},{team:{id:'29'},yardLine:NaN}])expect(field({...plays.away_gain,end})).toBe(null);
 expect(field({...plays.away_gain,start:{...plays.away_gain.start,down:0}}).target).toBe(null);
 expect(field({...plays.away_gain,start:{...plays.away_gain.start,down:1.5}}).target).toBe(null);
 expect(nflPlayTeam({text:'CAR scores'},teams)).toBe(null);
});
it('accepts only newer scoreboard plays and replaces partial rows with confirmed detail without duplicates',()=>{
 const first=plays.away_gain,next={...plays.away_gain,id:String(BigInt(plays.away_gain.id)+1n),text:'Earlier scoreboard text'};
 const game={id:'401873023',sides:teams,state:'in',status:'Q2',lastPlay:next};
 expect(nflBoardAhead(summary([first]),game)).toBe(true);
 const early=nflCenterPlays(summary([first]),game);expect(early).toHaveLength(2);expect(early.at(-1)).toMatchObject({id:next.id,early:true,team:'CAR'});
 const confirmed={...next,text:'Confirmed full description'};
 const rows=nflCenterPlays(summary([first,confirmed]),game);expect(rows).toHaveLength(2);expect(rows.at(-1)).toMatchObject({text:confirmed.text,early:false});
 expect(nflBoardAhead(summary([confirmed]),{...game,lastPlay:first})).toBe(false);
 expect(nflObservedGame(game,summary([first]),2026).status).toBe('Q2');
 expect(nflObservedGame(game,summary([confirmed]),2026).status).toBe('Q1');
});
it('scopes scoreboard possession and last play to the requested NFL game/week',()=>{
 const competition={competitors:teams.map(t=>({team:{id:t.id,abbreviation:t.code},homeAway:t.home?'home':'away',score:'7'})),situation:{possession:'29',lastPlay:{...plays.away_gain,scoringPlay:undefined,scoreValue:6},down:2,distance:6,shortDownDistanceText:'2nd & 6',possessionText:'GB 30'}};
 const board={season:{year:2026,type:2},week:{number:8},events:[{id:'401873023',date:'2026-10-30T00:15Z',status:{type:{state:'in',shortDetail:'Q2'}},competitions:[competition]}]};
 const game=nflCenterGames(board,2026,8)[0];expect(game.lastPlay).toMatchObject({scoringPlay:true,end:{down:2,distance:6}});
 competition.situation.lastPlay={...plays.away_gain,start:{team:{id:'999'}}};
 expect(nflCenterGames(board,2026,8)[0].lastPlay).toBe(null);
 expect(nflCenterGames(board,2026,7)).toEqual([]);
});

it('does not label normal punts and kickoffs as turnovers when possession changes',()=>{
 expect(field(plays.punt).start.x).toBe(60); // GB 40, despite the contradictory raw distance to goal.
 for(const p of [plays.punt,plays.kickoff]){
  expect(field(p)).toMatchObject({kick:true,turnover:false});
  expect(field({...p,isTurnover:undefined})).toMatchObject({turnover:false});
  expect(field({...p,isTurnover:true})).toMatchObject({turnover:true});
 }
});
