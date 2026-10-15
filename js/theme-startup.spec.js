import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {expect,it} from 'vitest';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const startup=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).find(s=>s.includes('var v = localStorage.getItem("dfl.mode")'));
it.each([
 ['dark',false,'dark','#191817'],['medicine',false,'dark','#191817'],
 ['light',true,'light','#F3EDE4'],['medicine-light',true,'light','#F3EDE4'],
 ['system',true,'dark','#191817'],['system',false,'light','#F3EDE4'],
 ['fairway',true,'light','#f4f6f7'],[null,false,'dark','#191817'],
])('paints the correct startup ground for %s (phone dark: %s)',(mode,dark,scheme,bg)=>{
 const attrs={},tokens={},style={setProperty:(k,v)=>tokens[k]=v};
 runInNewContext(startup,{localStorage:{getItem:()=>mode},matchMedia:()=>({matches:dark}),document:{documentElement:{style,setAttribute:(k,v)=>attrs[k]=v}}});
 expect(tokens['--bg']).toBe(bg);expect(style.background).toBe(bg);expect(style.colorScheme).toBe(scheme);expect(attrs['data-mode']).toBe(scheme);
});
