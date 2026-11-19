import {it,expect} from 'vitest';
import {legacyPropResult} from './sportsbook-legacy-props.js';
const market={category:'Player Props',provider_key:'sgo:event:receiving_receptions-A_NFL-game-ou-over',provider_market_id:'receiving_receptions-A_NFL-game-ou-over',title:'Amon-Ra St. Brown · Receptions',provider_line:6.5,closes_at:'2026-11-08T18:00:00Z'};
const input=()=>({players:{a:{n:'Amon-Ra St. Brown',t:'DET'}},rows:[{player_id:'a',stats:{rec:7}}],games:[{home_team_id:'DET',away_team_id:'BUF',status:'final',starts_at:market.closes_at}]});
it('grades an exact historical player, kickoff, supported stat and final game',()=>{expect(legacyPropResult(market,input())).toMatchObject({final_score:7,winner_side:'over',void_market:false});});
it('can grade a recorded zero and a tied line without inventing a stat',()=>{const data=input();data.rows[0].stats.rec=0;expect(legacyPropResult(market,data)?.winner_side).toBe('under');expect(legacyPropResult({...market,provider_line:0},data)?.void_market).toBe(true);});
it.each(['live','scheduled','cancelled'])('does not settle a %s game',status=>{const data=input();data.games[0].status=status;expect(legacyPropResult(market,data)).toBeNull();});
it('does not grade absent or ambiguous players, missing stats or unsupported scoring',()=>{
 const data=input();expect(legacyPropResult(market,{...data,players:{}})).toBeNull();expect(legacyPropResult(market,{...data,players:{...data.players,b:{n:'Amon-Ra St Brown',t:'DET'}},rows:[...data.rows,{player_id:'b',stats:{rec:9}}]})).toBeNull();expect(legacyPropResult(market,{...data,rows:[]})).toBeNull();expect(legacyPropResult(market,{...data,rows:[{player_id:'a',stats:{rush_yd:70}}]})).toBeNull();expect(legacyPropResult({...market,provider_market_id:'fantasyScore-A_NFL'},data)).toBeNull();
});
it('disambiguates a retired namesake only through recorded stats and the exact final game',()=>{const data=input();data.players.b={n:'Amon-Ra St Brown',t:'FA'};expect(legacyPropResult(market,data)?.final_score).toBe(7);});
it('does not use a different kickoff or a different club to resolve a prop',()=>{const data=input();data.games[0].starts_at='2026-11-09T18:00:00Z';expect(legacyPropResult(market,data)).toBeNull();data.games[0].starts_at=market.closes_at;data.games[0].home_team_id='KC';expect(legacyPropResult(market,data)).toBeNull();});
