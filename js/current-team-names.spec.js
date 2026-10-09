import {describe,it,expect,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:vi.fn()}));
vi.mock('./members.js',()=>({loadMemberDirectory:vi.fn(async()=>[])}));
import {currentTeamMembers,currentTeamLabel,currentTeamMember,currentMatchupTitle,currentTradeNames,currentSportsbookNames} from './current-team-names.js';
import {namer} from './lore.js';
import {ticketData} from './sportsbook-ticket.js';
const stored=[{id:1,sleeper_user_id:'a',display_name:'Owner A',team_name:'Old A'},{id:2,sleeper_user_id:'b',display_name:'Owner B',team_name:'Old B'}];
const rosters=[{season:2019,sleeper_user_id:'a',team_name:'Ancient A'},{season:2026,sleeper_user_id:'a',team_name:'Synced A'},{season:2026,sleeper_user_id:'b',team_name:'Synced B'}];
const members=currentTeamMembers(stored,[{user_id:'a',metadata:{team_name:' New A '}},{user_id:'b',metadata:{team_name:'New B'}}],rosters);
describe('current team names everywhere',()=>{
 it('uses current trimmed names and keeps historical aliases without mutating stored records',()=>{
  expect(members[0].team_name).toBe('New A');expect(members[0].team_name_aliases).toContain('Ancient A');expect(stored[0].team_name).toBe('Old A');
  expect(currentTeamLabel('Ancient A',members)).toBe('New A');expect(currentTeamLabel('Old B',members)).toBe('New B');
 });
 it('prioritizes stable owner IDs over names and refuses ambiguous aliases',()=>{
  const duplicate=[{...members[0],team_name_aliases:['Shared']},{...members[1],team_name_aliases:['Shared']}];
  expect(currentTeamMember('Shared',duplicate)).toBeNull();expect(currentTeamLabel('Shared',duplicate)).toBe('Shared');
  expect(currentTeamLabel('Old B',members,{sleeper_user_id:'a'})).toBe('New A');
  expect(currentTeamLabel('Old A',members,{member_id:2})).toBe('New B');
 });
 it('keeps the newest synced name usable when Sleeper is unavailable',()=>{
  expect(currentTeamMembers(stored,[],rosters)[0].team_name).toBe('Synced A');
  expect(currentTeamMembers(stored,[{user_id:'a',metadata:{team_name:' '},display_name:'Current account'}],rosters)[0].team_name).toBe('Current account');
 });
 it('uses current owner names even for the oldest archived seasons',()=>{
  const data={members,users:[],standings:[{season:2019,roster_id:4,sleeper_user_id:'a',team_name:'Ancient A'}]},name=namer(data);
  expect(name('a',2019,4)).toMatchObject({label:'New A',memberId:1});expect(name('a',2026,4).label).toBe('New A');
  expect(data.standings[0].team_name).toBe('Ancient A');
  expect(name('deleted',2019,4)).toMatchObject({label:'Ancient A',sub:'account deleted'});
 });
 it('names old matchups with missing user IDs through verified season/roster ownership',()=>{
  const directory=currentTeamMembers(stored,[],[{season:2019,roster_id:4,sleeper_user_id:'a',team_name:'Ancient A'},{season:2026,roster_id:4,sleeper_user_id:'b',team_name:'Synced B'}]);
  const name=namer({members:directory,users:[],standings:[]});
  expect(name(null,2019,4)).toMatchObject({label:'Ancient A',memberId:1});
  expect(name(null,2026,4)).toMatchObject({label:'Synced B',memberId:2});
  expect(name(null,2024,4)).toMatchObject({label:'Roster 4',memberId:null});
 });
 it('renames frozen receipt teams and winner labels without regrading the trade',()=>{
  const alert={teams:[{roster_id:1,team_name:'Old A'},{roster_id:2,team_name:'Old B'}],verdict:{winner_roster_id:2,winner_team_name:'Old B'},result:{fairness:60,valueToA:60,valueToB:100},packages:[{roster_id:1,sends:[{name:'Player',trade_value:100}]}]};
  const current=currentTradeNames(alert,members);expect(current.teams.map(t=>t.team_name)).toEqual(['New A','New B']);expect(current.verdict.winner_team_name).toBe('New B');
  expect(current.result).toBe(alert.result);expect(current.packages).toBe(alert.packages);expect(alert.verdict.winner_team_name).toBe('Old B');
 });
 it('resolves older receipts by their season and roster IDs when the saved name is unknown',()=>{
  const directory=currentTeamMembers(stored,[],[{season:2025,roster_id:7,sleeper_user_id:'a',team_name:'Synced A'},{season:2026,roster_id:7,sleeper_user_id:'b',team_name:'Synced B'}]);
  const alert={season:2025,teams:[{roster_id:7,team_name:'Unrecorded name'}],verdict:{winner_roster_id:7,winner_team_name:'Unrecorded name'},result:{fairness:72}};
  expect(currentTradeNames(alert,directory).teams[0].team_name).toBe('Synced A');
  expect(currentTradeNames({...alert,season:2026},directory).verdict.winner_team_name).toBe('Synced B');
  expect(currentTradeNames({...alert,season:2024},directory).teams[0].team_name).toBe('Unrecorded name');
 });
 it('renames fantasy markets, settled ticket legs and shares while retaining prices and IDs',()=>{
  const input={markets:[{id:10,category:'Fantasy',title:'Ancient A vs Old B',status:'locked'}],outcomes:[{id:20,market_id:10,label:'Ancient A',odds_american:110}],bets:[{id:30,legs:JSON.stringify([{market_id:10,outcome_id:20,label:'Ancient A',market:'Ancient A vs Old B',odds_american:110,status:'won'}]),stake:100,potential_payout:210,status:'won'}],trends:[{market_id:10,outcome_id:20,outcome_label:'Ancient A',market_title:'Ancient A vs Old B'}],recap:{biggestWinner:{member_id:1,team_name:'Ancient A',net:110}}};
  const current=currentSportsbookNames(input,members);
  expect(current.markets[0].title).toBe('New A vs New B');expect(current.outcomes[0]).toMatchObject({id:20,label:'New A',odds_american:110});
  const ticket=ticketData({bet:current.bets[0],legs:current.bets[0].legs,member:members[0]});expect(ticket.picks[0]).toMatchObject({pick:'New A',market:'vs New B',status:'won'});expect(ticket.ret).toBe(210);
  expect(current.trends[0].outcome_label).toBe('New A');expect(current.recap.biggestWinner).toMatchObject({team_name:'New A',net:110});expect(input.outcomes[0].label).toBe('Ancient A');
 });
 it('leaves NFL and player props alone even if a fantasy alias happens to match',()=>{
  const data={markets:[{id:1,category:'Player Props',title:'Old A vs Old B'}],outcomes:[{id:2,market_id:1,label:'Old A'}],bets:[{legs:[{market_id:1,category:'Player Props',label:'Old A',market:'Old A vs Old B'}]}]};
  const current=currentSportsbookNames(data,members);expect(current.markets[0]).toBe(data.markets[0]);expect(current.outcomes[0]).toBe(data.outcomes[0]);expect(current.bets[0].legs[0]).toBe(data.bets[0].legs[0]);
  expect(currentMatchupTitle('Unknown vs Other',members)).toBe('Unknown vs Other');
 });
});
