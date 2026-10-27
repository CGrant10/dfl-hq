import {it,expect} from 'vitest';
import {momentRecapFrames,momentRecapFrame} from './moment-recap.js';
const moment=(key,matchupId='1')=>({key:String(key),kind:'surge',text:`+${key} pts`,at:1000+key,matchupId});
it('uses a bounded chronological sequence of saved observations for the selected matchup',()=>{
 const items=Array.from({length:12},(_,i)=>moment(i)),copy=structuredClone(items);const frames=momentRecapFrames([...items,moment(1),moment(30,'2'),{...moment(50),kind:'unknown'}],'1');
 expect(frames.map(m=>m.key)).toEqual(['4','5','6','7','8','9','10','11','recap:close']);expect(items).toEqual(copy);expect(frames.at(-1).text).not.toMatch(/won|touchdown/i);
});
it('has no invented recap for missing, invalid or other-matchup observations',()=>{
 expect(momentRecapFrames([moment(1,'2'),{...moment(2),at:NaN}],'1')).toEqual([]);expect(momentRecapFrames()).toEqual([]);
});
it('keeps observation wording and safely renders league names in its live frame',()=>{
 const frame=momentRecapFrames([{...moment(8),text:'<Club> +8 pts'}])[0];const html=momentRecapFrame(frame);expect(html).toContain('&lt;Club&gt;');expect(html).toContain('pts');expect(html).toContain('Saved');expect(html).not.toContain('touchdown');
});
it('puts recorded player totals and the saved before/after swing in the foreground',()=>{
 const frame={...moment(1),title:'Points added',player:{id:'a',name:'<Player>',position:'WR',nflTeam:'CIN'},team:{team_name:'<Club>'},recap:{points:24.83,delta:8.12,before:16.71}};
 const html=momentRecapFrame(frame);expect(html).toContain('+8.12');expect(html).toContain('16.71');expect(html).toContain('24.83');expect(html).toContain('&lt;Player&gt;');expect(html).toContain('&lt;Club&gt;');expect(html).toContain('Points added');
 expect(momentRecapFrame({...frame,recap:undefined})).not.toContain('moment-recap-score-path');
});
it('shows both recorded team scores and preserves full current names in a lead change',()=>{
 const html=momentRecapFrame({...moment(1),kind:'lead',title:'Lead change',team:{team_name:'Current <Leader>'},recap:{sides:[{team_name:'Current <Leader>',points:105.12,leading:true},{team_name:'Other team',points:102.13,leading:false}]}});
 expect(html).toContain('105.12');expect(html).toContain('102.13');expect(html).toContain('Current &lt;Leader&gt;');expect(html).toContain('is-leading');expect(html).not.toContain('touchdown');
});
