import {it,expect} from 'vitest';
import {readViewMemory,writeViewMemory,restoreView} from './view-memory.js';
it('bounds visit memory while preserving member isolation and regular page preferences',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)};
 writeViewMemory('other','visit:0',{y:99},storage,1000);writeViewMemory('me','route:home',{details:[]},storage,1000);
 for(let i=0;i<85;i++)writeViewMemory('me',`visit:${i}`,{y:i},storage,1000);
 expect(readViewMemory('me','visit:0',storage,1000)).toBeNull();expect(readViewMemory('me','visit:84',storage,1000)).toEqual({y:84});
 expect(readViewMemory('other','visit:0',storage,1000)).toEqual({y:99});expect(readViewMemory('me','route:home',storage,1000)).toEqual({details:[]});
 expect(readViewMemory('me','visit:84',storage,1000+12*60*60*1000)).toBeNull();
});
it('restores disclosure preferences without moving a fresh visit',()=>{
 const detail={open:false},scrolls=[];
 const stop=restoreView({querySelector:()=>detail},{y:900,details:[{key:'#test',open:true}]},{restoreScroll:false,scroll:y=>scrolls.push(y)});
 expect(detail.open).toBe(true);expect(scrolls).toEqual([]);stop();
});
