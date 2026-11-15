import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect,vi} from 'vitest';
const source=readFileSync(new URL('../sw.js',import.meta.url),'utf8');
function push(data,{clients=[],failedClients=false}={}){
 const handlers={},showNotification=vi.fn(()=>Promise.resolve());
 runInNewContext(source,{URL,Request,Response,console,self:{clients:{matchAll:()=>failedClients?Promise.reject(Error('Client unavailable')):Promise.resolve(clients)},registration:{scope:'https://example.com/dfl-hq/',showNotification},addEventListener:(name,fn)=>{handlers[name]=fn}}});
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
 it('opens the exact Wall conversation without buzzing twice for a retry',()=>{const sw=push({title:'Wall reply',category:'wall',url:'#/wall?post=50',messageId:51});expect(sw.showNotification).toHaveBeenCalledWith('Wall reply',expect.objectContaining({renotify:false,data:{url:'#/wall?post=50',messageId:51}}))});
 it('expires optional matchup moments and opens their exact week and game without buzzing twice',()=>{
  const url='#/clubhouse?season=2026&week=5&tab=matchups&matchup=4';
  const sw=push({title:'Close game',category:'matchup_moments',url,messageId:52,expiresAt:'2100-01-01T00:00:00Z'});
  expect(sw.showNotification).toHaveBeenCalledWith('Close game',expect.objectContaining({renotify:false,data:{url,messageId:52}}));
  expect(push({title:'Close game',category:'matchup_moments',expiresAt:'2000-01-01T00:00:00Z'}).showNotification).not.toHaveBeenCalled();
 });
 it('keeps ordinary league notifications working without an expiry',()=>{expect(push({title:'League news'}).showNotification).toHaveBeenCalledTimes(1)});
 it('refreshes only visible windows in this app without sending notification copy or another push',async()=>{
  const active={url:'https://example.com/dfl-hq/#/notifications',visibilityState:'visible',postMessage:vi.fn()},hidden={...active,visibilityState:'hidden',postMessage:vi.fn()},other={...active,url:'https://example.com/another-app/',postMessage:vi.fn()};
  const sw=push({title:'A touchdown',messageId:12},{clients:[active,hidden,other]});await Promise.all(sw.promises);
  expect(active.postMessage).toHaveBeenCalledWith({type:'DFL_NOTIFICATION_AVAILABLE',messageId:12});expect(hidden.postMessage).not.toHaveBeenCalled();expect(other.postMessage).not.toHaveBeenCalled();expect(sw.showNotification).toHaveBeenCalledOnce();
 });
 it('keeps the phone notification working when a window cannot be reached',async()=>{
  const sw=push({title:'A touchdown'},{failedClients:true});await expect(Promise.all(sw.promises)).resolves.toBeDefined();expect(sw.showNotification).toHaveBeenCalledOnce();
 });
});
