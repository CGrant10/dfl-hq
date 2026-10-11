import {describe,it,expect} from 'vitest';
import {leagueHealth} from './league-health.js';
import {DFL_STARTING_SLOTS} from './analyzer-league-context.js';
const fixture=()=>({league:{season:2026,status:'in_season',total_rosters:12,roster_positions:DFL_STARTING_SLOTS,scoring_settings:{rec:1}},state:{season:2026,season_type:'regular',week:6},week:6,
 rosters:Array.from({length:12},(_,i)=>({roster_id:i+1,owner_id:`owner-${i}`,players:[`player-${i}`],reserve:[`player-${i}`]})),
 rows:Array.from({length:12},(_,i)=>({roster_id:i+1,starters:[`player-${i}`,'0']})),now:Date.parse('2026-10-11T16:00:00Z')});
describe('league snapshot admission',()=>{
 it('accepts complete DFL data without counting reserve membership twice or empty starter placeholders',()=>expect(leagueHealth(fixture())).toMatchObject({ok:true,rostersChecked:12,matchupsChecked:12,issues:[]}));
 it('detects duplicate owners even when the roster count matches',()=>{const f=fixture();f.rosters[1].owner_id=f.rosters[0].owner_id;expect(leagueHealth(f).issues).toContain('roster_owners');});
 it('rejects duplicate matchup rows and missing roster data',()=>{const f=fixture();f.rows[1]=f.rows[0];f.rosters[2].players=[];expect(leagueHealth(f).issues).toEqual(expect.arrayContaining(['matchup_rosters','matchup_count','empty_rosters']));});
 it('rejects double ownership and invalid starters',()=>{const f=fixture();f.rosters[1].players.push(f.rosters[0].players[0]);f.rows[2].starters=['player-0','player-0'];expect(leagueHealth(f).issues).toEqual(expect.arrayContaining(['duplicate_players','invalid_starters']));});
 it('detects the wrong live week, season and scoring format',()=>{const f=fixture();f.week=5;f.league.season=2025;f.league.scoring_settings.rec=.5;expect(leagueHealth(f).issues).toEqual(expect.arrayContaining(['wrong_week','wrong_season','league_format']));});
 it('can check historical rosters without comparing their week with the current NFL week',()=>{const f=fixture();f.league.status='complete';f.week=18;expect(leagueHealth(f).ok).toBe(true);});
 it('stores counts and issue codes without recording identities',()=>{const report=JSON.stringify(leagueHealth(fixture()));expect(report).not.toContain('owner-');expect(report).not.toContain('player-');});
});
