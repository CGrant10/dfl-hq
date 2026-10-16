import {it,expect} from 'vitest';
import {momentRecapFrames,momentRecapFrame} from './moment-recap.js';
const moment=(key,matchupId='1')=>({key:String(key),kind:'surge',text:`+${key} fantasy points since the previous sync`,at:1000+key,matchupId});
it('uses a bounded chronological sequence of saved observations for the selected matchup',()=>{
 const items=Array.from({length:12},(_,i)=>moment(i)),copy=structuredClone(items);const frames=momentRecapFrames([...items,moment(1),moment(30,'2'),{...moment(50),kind:'unknown'}],'1');
 expect(frames.map(m=>m.key)).toEqual(['4','5','6','7','8','9','10','11','recap:close']);expect(items).toEqual(copy);expect(frames.at(-1).text).not.toMatch(/won|touchdown/i);
});
it('has no invented recap for missing, invalid or other-matchup observations',()=>{
 expect(momentRecapFrames([moment(1,'2'),{...moment(2),at:NaN}],'1')).toEqual([]);expect(momentRecapFrames()).toEqual([]);
});
it('keeps observation wording and safely renders league names in its live frame',()=>{
 const frame=momentRecapFrames([{...moment(8),text:'<Club> +8 points since the previous sync'}])[0];const html=momentRecapFrame(frame);expect(html).toContain('&lt;Club&gt;');expect(html).toContain('since the previous sync');expect(html).toContain('Observed');expect(html).not.toContain('touchdown');
});
