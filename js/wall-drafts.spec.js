import {it,expect} from 'vitest';
import {readWallDraft,saveWallDraft,clearWallDraft} from './wall-drafts.js';
const storage=()=>{const rows=new Map();return{getItem:key=>rows.get(key)||null,setItem:(key,value)=>rows.set(key,value),removeItem:key=>rows.delete(key)}};
it('isolates drafts by selected member, composer and reply thread',()=>{
 const s=storage();saveWallDraft(11,'post','Hello',s,100);saveWallDraft(11,'reply:3','Reply',s,100);saveWallDraft(12,'post','Other',s,100);
 expect(readWallDraft(11,'post',s,101)).toBe('Hello');expect(readWallDraft(11,'reply:3',s,101)).toBe('Reply');expect(readWallDraft(11,'reply:4',s,101)).toBe('');
 clearWallDraft(11,'post',s);expect(readWallDraft(11,'post',s,101)).toBe('');expect(readWallDraft(12,'post',s,101)).toBe('Other');
});
it('expires old drafts and tolerates malformed or unavailable storage',()=>{
 const s=storage();saveWallDraft(11,'post','Text',s,0);expect(readWallDraft(11,'post',s,30*86400000)).toBe('');
 s.setItem('dfl.wall.draft.v1.11.post','broken');expect(readWallDraft(11,'post',s)).toBe('');
 const bad={getItem(){throw Error()},setItem(){throw Error()},removeItem(){throw Error()}};
 expect(saveWallDraft(11,'post','Text',bad)).toBe(false);expect(readWallDraft(11,'post',bad)).toBe('');expect(()=>clearWallDraft(11,'post',bad)).not.toThrow();expect(saveWallDraft(null,'post','Text',s)).toBe(false);
});
it('limits drafts to the Wall length and removes empty drafts',()=>{const s=storage();saveWallDraft(11,'post','x'.repeat(600),s);expect(readWallDraft(11,'post',s)).toHaveLength(500);saveWallDraft(11,'post',' ',s);expect(readWallDraft(11,'post',s)).toBe('')});
