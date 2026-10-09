import {describe,it,expect} from 'vitest';
import {currentAnalyzerLeague,currentAnalyzerRoster,matchesDflStartingSlots,DFL_STARTING_SLOTS} from './analyzer-league-context.js';
const stored={sleeper_league_id:'current',season:2026,scoring_settings:{rec:.5}};
describe('current analyzer league context',()=>{
 it('uses current league scoring and starting slots rather than stale synced settings',()=>{
  const league=currentAnalyzerLeague(stored,{league_id:'current',season:'2026',scoring_settings:{rec:1,pass_td:4,pass_int:-2},roster_positions:[...DFL_STARTING_SLOTS,'BN'],total_rosters:12});
  expect(league.scoring_settings).toEqual({rec:1,pass_td:4,pass_int:-2});expect(league.total_rosters).toBe(12);
  expect(matchesDflStartingSlots(league.roster_positions)).toBe(true);expect(stored.scoring_settings.rec).toBe(.5);
 });
 it('does not apply league settings from the wrong league or season',()=>{
  for(const live of [null,{league_id:'other',season:2026},{league_id:'current',season:2025}])expect(currentAnalyzerLeague(stored,live)).toBe(stored);
 });
 it('detects unsupported slots instead of silently grading a different format',()=>{
  expect(matchesDflStartingSlots([...DFL_STARTING_SLOTS,'BN','BN'])).toBe(true);
  expect(matchesDflStartingSlots([...DFL_STARTING_SLOTS,'SUPER_FLEX'])).toBe(false);
  expect(matchesDflStartingSlots(DFL_STARTING_SLOTS.filter(s=>s!=='TE'))).toBe(false);
 });
 it('uses the latest trimmed Sleeper name and stable owner IDs, preserving stored identities',()=>{
  const roster={roster_id:3,sleeper_user_id:'owner',team_name:'Old roster name'},member={id:5,display_name:'The owner',team_name:'Old profile name'};
  const result=currentAnalyzerRoster(roster,member,[{user_id:'different',metadata:{team_name:'Wrong team'}},{user_id:'owner',metadata:{team_name:'  The Bayou Bombers  '},display_name:'Sleeper owner'}]);
  expect(result.team_name).toBe('The Bayou Bombers');expect(result.identity.team_name).toBe(result.team_name);
  expect(result.ownerName).toBe('The owner');expect(member.team_name).toBe('Old profile name');expect(roster.team_name).toBe('Old roster name');
 });
 it('handles a removed/empty team name and retains a synced fallback on feed failure',()=>{
  const roster={roster_id:1,sleeper_user_id:'owner',team_name:'Synced name'};
  expect(currentAnalyzerRoster(roster,null,[{user_id:'owner',metadata:{team_name:' '},display_name:'Current owner'}]).team_name).toBe('Current owner');
  expect(currentAnalyzerRoster(roster,{team_name:'Older profile'}).team_name).toBe('Synced name');
  expect(currentAnalyzerRoster({roster_id:1},null).team_name).toBe('Team 1');
 });
});
