import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function push(data){
 const handlers={},showNotification=vi.fn(()=>Promise.resolve());
 runInNewContext(source,{URL,Request,Response,console,self:{registration:{scope:'https://example.com/dfl-hq/',showNotification},addEventListener:(name,fn)=>{handlers[name]=fn}}});
 const promises=[];handlers.push({data:{json:()=>data},waitUntil:p=>promises.push(p)});
 return {showNotification,promises};
}
describe('injury alert expiry on the device',()=>{
 it('does not display delayed or invalid injury alerts after kickoff',()=>{
  for(const expiresAt of ['2000-01-01T00:00:00Z','invalid'])expect(push({title:'Starter is out',expiresAt}).showNotification).not.toHaveBeenCalled();
 });
 it('delivers a current alert and retains the safe internal destination',async()=>{
  const sw=push({title:'Starter is out',body:'Start Backup',expiresAt:'2100-01-01T00:00:00Z',url:'#/analyzer?owner=a',messageId:12});
  await Promise.all(sw.promises);expect(sw.showNotification).toHaveBeenCalledWith('Starter is out',expect.objectContaining({body:'Start Backup',data:{url:'#/analyzer?owner=a',messageId:12}}));
 });
 it('keeps ordinary league notifications working without an expiry',()=>{expect(push({title:'League news'}).showNotification).toHaveBeenCalledTimes(1)});
});
