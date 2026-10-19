import {it,expect} from 'vitest';
import {autoExpandStadium} from './stadium-orientation.js';
it('keeps phones and tablets inline in portrait, with no rotation requirement',()=>{
 for(const [width,height] of [[320,844],[390,844],[768,1024],[1024,1366]])expect(autoExpandStadium({width,height,touch:true})).toBe(false);
});
it('only automatically expands a touch landscape view',()=>{
 expect(autoExpandStadium({width:844,height:390,touch:true})).toBe(true);
 expect(autoExpandStadium({width:1440,height:900,touch:false})).toBe(false);
 expect(autoExpandStadium({width:600,height:600,touch:true})).toBe(false);
});
