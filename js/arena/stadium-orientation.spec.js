import {it,expect} from 'vitest';
import {needsStadiumLandscape} from './stadium-orientation.js';
it('requires landscape on portrait phones and touch tablets, including large tablets',()=>{
 expect(needsStadiumLandscape({width:390,height:844})).toBe(true);
 expect(needsStadiumLandscape({width:768,height:1024})).toBe(true);
 expect(needsStadiumLandscape({width:1024,height:1366,touch:true})).toBe(true);
 expect(needsStadiumLandscape({width:1080,height:1920,touch:false})).toBe(false);
});
it('allows landscape, square and wide desktop viewing',()=>{
 for(const [width,height] of [[844,390],[1024,768],[600,600],[1440,900]])expect(needsStadiumLandscape({width,height,touch:true})).toBe(false);
});
