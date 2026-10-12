import {describe,it,expect} from 'vitest';
import {scrollHeaderCompact} from './page-scroll-motion.js';
describe('compact scroll header',()=>{
  it('uses a small dead zone to prevent header flicker while scrolling back and forth',()=>{
    let compact=false;
    for(const bottom of [45,40,35])compact=scrollHeaderCompact(bottom,44,compact);
    expect(compact).toBe(false);
    compact=scrollHeaderCompact(33,44,compact);expect(compact).toBe(true);
    for(const bottom of [35,40,45,49])compact=scrollHeaderCompact(bottom,44,compact);
    expect(compact).toBe(true);
    expect(scrollHeaderCompact(51,44,compact)).toBe(false);
  });
  it('uses the actual chrome boundary for desktop navigation and safe-area layouts',()=>{
    expect(scrollHeaderCompact(75,100)).toBe(true);
    expect(scrollHeaderCompact(125,100,true)).toBe(false);
    expect(scrollHeaderCompact(55,44)).toBe(false);
    expect(scrollHeaderCompact(55,80)).toBe(true);
  });
});
