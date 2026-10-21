import {describe,expect,it,vi} from 'vitest';
vi.mock('./supabase.js',()=>({db:()=>{throw Error('No database access in deck tests')},configured:false}));
vi.mock('./members.js',()=>({memberImage:vi.fn(()=>'https://example.com/member-profile.jpg'),currentMember:()=>null,loadMemberDirectory:async()=>[]}));
import {buildDeck,GENERATORS} from './broadcast-deck.js';
import {memberImage} from './members.js';

describe('Arena broadcast removal',()=>{
 it('keeps completed Arena results out without blanking the deck',()=>{
  const ctx={members:[{id:1,display_name:'Race winner'}],lore:{arenaEvents:[{id:42,name:'Old draft race'}],arenaResults:[{event_id:42,member_id:1,place:1}]}};
  const deck=buildDeck(ctx,{max:40});
  expect(deck.some(item=>item.kind==='arena'||item.href==='#/arena?id=42')).toBe(false);
  expect(deck.length).toBeGreaterThan(0);
 });
});


describe('award artwork ownership',()=>{
 it('keeps current and past champions independent of member photos',()=>{
  vi.mocked(memberImage).mockClear();
  const ctx={leagues:[{season:2025,champion_user_id:'winner',last_place_user_id:'loser'},{season:2024,champion_user_id:'past'}],members:[{id:'member',profile_image:'https://example.com/member-profile.jpg',broadcast_image:'https://example.com/member-broadcast.jpg'}],name:()=>({memberId:'member',label:'Current team name',sub:'Owner'})};
  const enabled=new Set(['champion','pastChampions','chipEater']);
  const off=new Set(GENERATORS.map(([id])=>id).filter(id=>!enabled.has(id)));
  const deck=buildDeck(ctx,{off,max:10});
  expect(deck.map(item=>item.generator)).toEqual(expect.arrayContaining([...enabled]));
  expect(deck.filter(item=>item.variant!=='chip').every(item=>item.image==='assets/dfl-daily-champion.webp')).toBe(true);
  expect(deck.find(item=>item.variant==='chip')?.image).toBe('assets/dfl-daily-chip-eater.webp');
  expect(deck.every(item=>item.headline==='Current team name'&&item.href==='#/history')).toBe(true);
  expect(memberImage).not.toHaveBeenCalled();
 });
});
