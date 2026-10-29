import {expect,it} from 'vitest';
import {playerCardScope} from './player-card-actions.js';
it('opens an NFL player card for the exact season and week being viewed',()=>{
 expect(playerCardScope({dataset:{playerCard:'123',playerSeason:'2025',playerWeek:'7',playerState:'final'}})).toEqual({id:'123',season:2025,week:7,state:'final'});
});
it('does not turn unscoped controls, invalid weeks or invalid seasons into archived requests',()=>{
 for(const dataset of [{playerCard:'123'},{playerSeason:'2026',playerWeek:'0'},{playerSeason:'2026',playerWeek:'19'},{playerSeason:'2026',playerWeek:'2.5'},{playerSeason:'bad',playerWeek:'7'}])expect(playerCardScope({dataset})).toBeNull();
});
it('does not infer a fantasy score or invented game status from the NFL stat line',()=>{
 const result=playerCardScope({dataset:{playerCard:'123',playerSeason:'2026',playerWeek:'7',playerState:'guess',playerPoints:'40'}});
 expect(result).toEqual({id:'123',season:2026,week:7,state:''});expect(result).not.toHaveProperty('points');
});
