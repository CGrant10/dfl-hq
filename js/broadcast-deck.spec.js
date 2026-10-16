import {describe,expect,it,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:()=>{throw Error('No database access in deck tests')},configured:false}));
vi.mock('./members.js',()=>({memberImage:()=>'',currentMember:()=>null,loadMemberDirectory:async()=>[]}));
import {buildDeck} from './broadcast-deck.js';

describe('Arena broadcast removal',()=>{
 it('keeps completed Arena results out without blanking the deck',()=>{
  const ctx={members:[{id:1,display_name:'Race winner'}],lore:{arenaEvents:[{id:42,name:'Old draft race'}],arenaResults:[{event_id:42,member_id:1,place:1}]}};
  const deck=buildDeck(ctx,{max:40});
  expect(deck.some(item=>item.kind==='arena'||item.href==='#/arena?id=42')).toBe(false);
  expect(deck.length).toBeGreaterThan(0);
 });
});
