import {expect,it} from 'vitest';
import {replaySnapSizes,replaySnapIndex} from './replay-layout.js';
it.each([[756,390],[500,320],[330,390],[1000,600]])('fits watch, browsing and expanded states into a %s px viewport',(height,width)=>{
 const sizes=replaySnapSizes(height,width);expect(sizes[0]).toBeGreaterThan(sizes[1]);expect(sizes[1]).toBeGreaterThan(sizes[2]);expect(height-sizes[0]).toBeGreaterThanOrEqual(176);expect(sizes[2]).toBeGreaterThanOrEqual(48);
});
it('settles a slow drag at the nearest state and carries a deliberate flick in its direction',()=>{
 const sizes=replaySnapSizes(756,390);expect(replaySnapIndex(sizes,sizes[1]+12)).toBe(1);expect(replaySnapIndex(sizes,sizes[1],-1.3)).toBe(2);expect(replaySnapIndex(sizes,sizes[1],1.5)).toBe(0);
});
