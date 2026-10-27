import {expect,it,vi} from 'vitest';
import {replayGameContext} from './replay-context.js';
const clip={game_id:'401873011'},context={season:2026,week:8},data={summary:{header:{id:clip.game_id,week:7,season:{year:2026}}}};
it('keeps the current edition without another read when the clip belongs to its slate',async()=>{
 const load=vi.fn(),edition={...context,week:7,events:[{id:clip.game_id}]};expect(await replayGameContext(clip,edition,load)).toBe(edition);expect(load).not.toHaveBeenCalled();
});
it('uses the official game week for retained clips after the league rolls into a new week',async()=>{
 expect(await replayGameContext(clip,context,vi.fn().mockResolvedValue(data))).toMatchObject({season:2026,week:7});
});
it('rejects mismatched games, seasons and unknown weeks instead of opening unrelated stats',async()=>{
 for(const patch of [{id:'999'},{week:0},{week:19},{week:null},{season:{year:2025}}])await expect(replayGameContext(clip,context,async()=>({summary:{header:{...data.summary.header,...patch}}}))).rejects.toThrow('week');
});
