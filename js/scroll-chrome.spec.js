import {afterEach,it,expect,vi} from 'vitest';
import {scrollChromeBottom} from './scroll-chrome.js';
afterEach(()=>vi.unstubAllGlobals());
function chrome(width,header,nav,dock){
 vi.stubGlobal('innerWidth',width);
 vi.stubGlobal('document',{querySelector:selector=>selector==='.topbar'?{getBoundingClientRect:()=>({bottom:header})}:selector==='#tabbar'?{getBoundingClientRect:()=>({bottom:nav})}:dock});
}
it('stacks above a desktop nav even before the alert has repainted at its new position',()=>{
 const dock={offsetHeight:44,getBoundingClientRect:()=>({bottom:88})};chrome(900,44,93,dock);
 expect(scrollChromeBottom()).toBe(137);
 dock.getBoundingClientRect=()=>({bottom:137});expect(scrollChromeBottom()).toBe(137);
});
it('keeps bottom navigation out of the mobile header stack',()=>{
 chrome(390,44,844,{offsetHeight:44});expect(scrollChromeBottom()).toBe(88);
});
it('follows a safe-area header and releases alert space when the alert is hidden',()=>{
 chrome(390,64,844,{offsetHeight:44});expect(scrollChromeBottom()).toBe(108);
 chrome(390,64,844,null);expect(scrollChromeBottom()).toBe(64);
});
