import {describe,it,expect} from 'vitest';
import {spotlightStats} from './player-spotlight-model.js';
const scope={season:2026,week:4},row={player_id:'a',season:'2026',week:4,season_type:'regular',stats:{pass_yd:300,pass_td:3,pass_int:0,rush_yd:null,pts_ppr:32},updated_at:1234};
describe('player spotlight recorded stats',()=>{
 it('uses position-specific raw stats and retains recorded zeroes',()=>{expect(spotlightStats({id:'a',position:'QB'},[row],scope)).toEqual({items:[{key:'pass_yd',label:'Passing yards',value:300},{key:'pass_td',label:'Passing TDs',value:3},{key:'pass_int',label:'Interceptions',value:0}],updatedAt:1234})});
 it('rejects another week, season, player, and preseason stats',()=>{for(const changed of [{week:5},{season:2025},{player_id:'b'},{season_type:'pre'}])expect(spotlightStats({id:'a',position:'QB'},[{...row,...changed}],scope).items).toEqual([])});
 it('does not fabricate zeroes for missing data',()=>{expect(spotlightStats({id:'a',position:'DEF'},[],scope).items).toEqual([]);expect(spotlightStats({id:'a',position:'DEF'},[row],scope).items).toEqual([])});
});
