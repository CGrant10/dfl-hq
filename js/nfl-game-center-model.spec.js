import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {nflCenterGames,nflSummaryMatches,nflCenterPlays,nflFantasyRows} from './nfl-game-center-model.js';
const summary=JSON.parse(readFileSync(new URL('../tools/fixtures/nfl-game-center-summary.json',import.meta.url),'utf8'));
it('keeps NFL game selection inside the requested regular-season week',()=>{
 const board={season:{year:2026,type:2},week:{number:7},events:[{id:'401873011',date:'2026-10-25T13:30Z',competitions:[{status:{type:{state:'post',shortDetail:'Final'}},competitors:[{homeAway:'home',score:'27',team:{abbreviation:'NO'}},{homeAway:'away',score:'30',team:{abbreviation:'PIT'}}]}]}]};
 expect(nflCenterGames(board,2026,7)[0]).toMatchObject({label:'PIT @ NO',state:'post'});expect(nflCenterGames(board,2026,8)).toEqual([]);expect(nflCenterGames({...board,season:{year:2026,type:3}},2026,7)).toEqual([]);
 expect(nflSummaryMatches(summary,{id:'401873011'},2026)).toBe(true);expect(nflSummaryMatches(summary,{id:'999'},2026)).toBe(false);expect(nflSummaryMatches(summary,{id:'401873011'},2025)).toBe(false);
});
it('keeps all plays in order, deduplicates scoring plays and preserves their real score',()=>{const plays=nflCenterPlays(summary);expect(plays.length).toBeGreaterThan(100);expect(new Set(plays.map(p=>p.id)).size).toBe(plays.length);expect(plays.find(p=>p.id==='401873011981')).toMatchObject({big:true,score:false,period:2});expect(plays.filter(p=>p.score).length).toBeGreaterThan(2)});
it('uses exact weekly Sleeper PPR including conversions, never estimated points',()=>{
 const weekly=[{season:2026,week:7,season_type:'regular',team:'PIT',player:{first_name:'DK',last_name:'Metcalf',position:'WR'},stats:{pts_ppr:23.9}}];
 const options={weekly,season:2026,week:7},owner={id:'1',name:'Tyler Shough',nflTeam:'NO',position:'QB',points:22,owner:'Bayou Bombers',isMine:true};
 const rows=nflFantasyRows(summary,[owner],options),qb=rows[0];expect(qb).toMatchObject({name:'Tyler Shough',points:22,league:true,isMine:true,owner:'Bayou Bombers'});expect(qb.line).toContain('pass yd');expect(rows.find(p=>p.name==='DK Metcalf')).toMatchObject({league:false,points:23.9});
 expect(nflFantasyRows(summary,[{...owner,nflTeam:'PIT',points:999}],options).find(p=>p.name==='Tyler Shough').points).toBe(null);
 expect(nflFantasyRows(summary,[],{...options,week:8}).find(p=>p.name==='DK Metcalf').points).toBe(null);
 expect(nflFantasyRows(summary,[],{...options,weekly:[...weekly,...weekly]}).find(p=>p.name==='DK Metcalf').points).toBe(null);
});
