import {describe,it,expect} from 'vitest';
import {broadcastEdition,broadcastEditionKey} from './broadcast-edition.js';
import {homeBroadcastDeck} from './home-presentation.js';
const date='2026-10-27';
describe('short Home broadcast editions',()=>{
 it('remembers visible editions while ignoring heartbeat-only refreshes',()=>{
  const first=[{id:'odds',headline:'Playoff picture',figure:'72%',checkedAt:1}];
  expect(broadcastEditionKey(first)).toBe(broadcastEditionKey([{...first[0],checkedAt:2}]));
  expect(broadcastEditionKey(first)).not.toBe(broadcastEditionKey([{...first[0],figure:'81%'}]));
 });
 it('gives all static awards, records and anniversary content one combined slot',()=>{
  const archive=['champion','chip','past','record','fact','season'].map(kind=>({id:kind,kind}));
  expect(broadcastEdition(archive,date)).toHaveLength(1);
  const week=Array.from({length:6},(_,i)=>broadcastEdition(archive,`2026-10-${20+i}`)[0].id);
  expect(new Set(week).size).toBe(6);
  expect(broadcastEdition(archive,date)).toEqual(broadcastEdition(archive,date));
 });
 it('puts current activity ahead of archive and caps ordinary stories at four',()=>{
  const data=[{id:'champ',kind:'champion'},...['trade','league-story','news','golf','poll','event'].map(kind=>({id:kind,kind}))];
  const result=broadcastEdition(data,date);expect(result).toHaveLength(5);expect(result[0].kind).toBe('trade');expect(result.at(-1).kind).toBe('champion');
 });
 it('deduplicates repeated syncs and multiple automatic stories from one source',()=>{
  const a={id:'one',kind:'trade'},b={id:'two',kind:'trade'};
  expect(broadcastEdition([a,a,b],date)).toEqual([a]);
 });
 it('honors pinned and featured commissioner content and never invents fillers',()=>{
  const pinned={id:'pinned',kind:'record',pinned:true},featured={id:'feature',kind:'champion',featured:true};
  expect(broadcastEdition([pinned,featured],date)).toEqual([pinned,featured]);
  expect(broadcastEdition([],date)).toEqual([]);expect(broadcastEdition([{kind:'identity'}],date)).toEqual([]);
 });
 it('ages automatic announcements out after three days while keeping explicit editorial pins',()=>{
  const old={id:'old',kind:'news',publishedAt:'2026-10-20T12:00:00Z'},fresh={id:'fresh',kind:'news',publishedAt:'2026-10-27T10:00:00Z'};
  expect(broadcastEdition([old,fresh],date)).toEqual([fresh]);expect(broadcastEdition([{...old,pinned:true}],date)).toHaveLength(1);
 });
 it('expires stale automatic trades even when generated as pinned, without expiring commissioner stories',()=>{
  const old={id:'old-trade',kind:'trade',source:'auto',pinned:true,occurredAt:Date.parse('2026-10-20T12:00:00Z')};
  expect(broadcastEdition([old],date)).toEqual([]);
  expect(broadcastEdition([{...old,source:'manual'}],date)).toHaveLength(1);
  expect(broadcastEdition([{...old,kind:'news'}],date)).toEqual([]);
 });
 it('uses the latest confirmed news or trade in its existing ranked slot',()=>{
  for(const kind of ['trade','news']){
   const old={id:'old',kind,occurredAt:'2026-10-26T10:00:00Z'},fresh={id:'fresh',kind,occurredAt:'2026-10-27T10:00:00Z'};
   const before={id:'before',kind:'golf'},after={id:'after',kind:'event'};
   expect(broadcastEdition([before,old,after,fresh],date)).toEqual([before,fresh,after]);
   expect(broadcastEdition([fresh,old],date)).toEqual([fresh]);
  }
 });
 it('keeps undated stories and preserves event ranking instead of guessing freshness',()=>{
  const unknown={id:'unknown',kind:'trade',source:'auto',pinned:true};
  expect(broadcastEdition([unknown],date)).toEqual([unknown]);
  const first={id:'first',kind:'event',publishedAt:'2026-10-26T10:00:00Z'},later={id:'later',kind:'event',publishedAt:'2026-10-27T10:00:00Z'};
  expect(broadcastEdition([first,later],date)).toEqual([first]);
 });
 it('keeps the daily opener independent and the compact deck stable on refresh',()=>{
  const deck=homeBroadcastDeck([{id:'chip',kind:'chip'},{id:'season',kind:'season'},{id:'trade',kind:'trade'}],{now:new Date(date+'T12:00:00Z')});
  expect(deck).toHaveLength(3);expect(deck[0].homeFeature).toBe(true);expect(deck[1].kind).toBe('trade');expect(homeBroadcastDeck(deck,{now:new Date(date+'T13:00:00Z')})).toEqual(deck);
 });
});
