import { it,expect } from 'vitest';
import { sportsbookWeekCaption,fantasyWeekGroups } from './sportsbook-fantasy-weeks.js';
it('keeps the league week at 4 when only week 5 winner bets are open',()=>{
 const current={season:2026,week:4},markets=[{id:5,auto_key:'matchup:2026:5:1',status:'open'},{id:4,auto_key:'matchup:2026:4:1',status:'locked'}];
 expect(sportsbookWeekCaption(current)).toContain('Week 4');
 expect(fantasyWeekGroups(markets,current).map(g=>[g.week,g.period])).toEqual([[4,'current'],[5,'upcoming']]);
 expect(fantasyWeekGroups(markets.slice(0,1),current)[0].period).toBe('upcoming');
});
it('does not invent a current week when the clock cannot load',()=>{
 expect(sportsbookWeekCaption({})).not.toMatch(/Week \d/);
 expect(fantasyWeekGroups([{auto_key:'matchup:2026:5:1'}])[0].period).toBe('unknown');
});
it('handles rollover and separates older slates from current games',()=>{
 const rows=['matchup:2027:1:1','matchup:2026:18:1','matchup:2026:17:1'].map(auto_key=>({auto_key}));
 expect(fantasyWeekGroups(rows,{season:2026,week:18}).map(g=>[g.week,g.period])).toEqual([[18,'current'],[1,'upcoming'],[17,'previous']]);
});
