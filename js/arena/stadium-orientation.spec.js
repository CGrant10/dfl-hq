import {it,expect} from 'vitest';
import {autoExpandStadium} from './stadium-orientation.js';
it('gives touch spectators the whole stadium in portrait without rotation',()=>{
 for(const [width,height] of [[320,844],[390,844],[768,1024],[1024,1366]])expect(autoExpandStadium({width,height,touch:true})).toBe(true);
});
it('also expands touch landscape but leaves a desktop window alone',()=>{
 expect(autoExpandStadium({width:844,height:390,touch:true})).toBe(true);
 expect(autoExpandStadium({width:1440,height:900,touch:false})).toBe(false);
 expect(autoExpandStadium({width:600,height:600,touch:true})).toBe(true);
 expect(autoExpandStadium({width:0,height:600,touch:true})).toBe(false);
});
