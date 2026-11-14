import {describe,it,expect} from 'vitest';
import {broadcastEdition,broadcastEditionKey} from './broadcast-edition.js';
import {homeBroadcastDeck} from './home-presentation.js';
const date='2026-10-27';
describe('full Home broadcast editions',()=>{
 it('remembers visible editions while ignoring heartbeat-only refreshes',()=>{
  const first=[{id:'odds',headline:'Playoff picture',figure:'72%',checkedAt:1}];
  expect(broadcastEditionKey(first)).toBe(broadcastEditionKey([{...first[0],checkedAt:2}]));
  expect(broadcastEditionKey(first)).not.toBe(broadcastEditionKey([{...first[0],figure:'81%'}]));
 });
 it('keeps both awards and includes distinct historical subjects instead of one shared slot',()=>{
  const archive=['champion','chip','past','record','fact','season'].map(kind=>({id:kind,kind}));
  const edition=broadcastEdition(archive,date);
  expect(edition).toHaveLength(6);expect(edition).toContain(archive[0]);expect(edition).toContain(archive[1]);
  expect(edition.indexOf(archive[1])-edition.indexOf(archive[0])).toBeGreaterThan(1);
  expect(broadcastEdition(edition,date)).toEqual(edition);
 });
 it('puts current activity first and leaves room for both awards and an archive feature',()=>{
  const data=[{id:'champ',kind:'champion'},{id:'chip',kind:'chip'},...['trade','league-story','news','golf','poll','event'].map(kind=>({id:kind,kind})),{id:'record',kind:'record'}];
  const result=broadcastEdition(data,date);expect(result).toHaveLength(9);expect(result[0].kind).toBe('trade');
  expect(result.filter(s=>['champion','chip','record'].includes(s.kind))).toHaveLength(3);
 });
 it('fills a quiet league day with genuine, varied records and dated awards',()=>{
  const data=[{id:'champ',kind:'champion'},{id:'chip',kind:'chip'},...Array.from({length:3},(_,i)=>({id:'past-'+i,kind:'past'})),...Array.from({length:3},(_,i)=>({id:'record-'+i,kind:'record'})),{id:'season',kind:'season'},{id:'fact',kind:'fact'}];
  const edition=broadcastEdition(data,date);
  expect(edition.length).toBeGreaterThanOrEqual(7);expect(edition.every(story=>data.includes(story))).toBe(true);
  expect(edition.filter(story=>story.kind==='past')).toHaveLength(1);expect(edition.filter(story=>story.kind==='record')).toHaveLength(2);
  const choices=Array.from({length:7},(_,i)=>broadcastEdition(data,`2026-10-${20+i}`).find(s=>s.kind==='past').id);
  expect(new Set(choices).size).toBeGreaterThan(1);expect(broadcastEdition(edition,date)).toEqual(edition);
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
 it('honors a commissioner feature applied to an automatic generator',()=>{
  const featured={id:'featured',kind:'news',source:'auto',featured:true,publishedAt:'2026-10-20T12:00:00Z'};
  const trade={id:'trade',kind:'trade',source:'auto',pinned:true,occurredAt:date+'T10:00:00Z'};
  expect(broadcastEdition([trade,featured],date)).toEqual([featured,trade]);
 });
 it('ages automatic announcements out while keeping explicit editorial pins',()=>{
  const old={id:'old',kind:'news',publishedAt:'2026-10-20T12:00:00Z'},fresh={id:'fresh',kind:'news',publishedAt:'2026-10-27T10:00:00Z'};
  expect(broadcastEdition([old,fresh],date)).toEqual([fresh]);expect(broadcastEdition([{...old,pinned:true}],date)).toHaveLength(1);
 });
 it('gives automatic receipts and news exactly two days, even when their generator pins them',()=>{
  const now=Date.parse(date+'T12:00:00Z'),age=48*60*60*1000;
  for(const kind of ['trade','news']){
   const story={id:kind,kind,source:'auto',pinned:true,occurredAt:now-age};
   expect(broadcastEdition([story],date,{now})).toEqual([story]);
   expect(broadcastEdition([story],date,{now:now+1})).toEqual([]);
   expect(broadcastEdition([{...story,source:'manual'}],date,{now:now+1})).toHaveLength(1);
  }
 });
 it('leads with fresh league business ahead of routine generated pins and open polls',()=>{
  const routine={id:'odds',kind:'league',generator:'playoffPicture',source:'auto',pinned:true};
  const poll={id:'poll',kind:'poll',temporal:'live'};
  const result={id:'result',kind:'league-story',temporal:'final',source:'auto',pinned:true};
  const trade={id:'trade',kind:'trade',source:'auto',pinned:true,occurredAt:date+'T10:00:00Z'};
  const news={id:'news',kind:'news',occurredAt:date+'T11:00:00Z'};
  expect(broadcastEdition([routine,poll,result,trade,news],date)).toEqual([news,trade,result,routine,poll]);
 });
 it('lets a completed result lead yesterday\'s news without losing actual live play or authored pins',()=>{
  const result={id:'result',kind:'league-story',temporal:'final'};
  const news={id:'news',kind:'news',occurredAt:'2026-10-26T10:00:00Z'};
  const pin={id:'pin',kind:'news',source:'manual',featured:true};
  const live={id:'live',kind:'fantasy',temporal:'live'};
  expect(broadcastEdition([news,pin,result,live],date)).toEqual([pin,live,result,news]);
 });
 it('waits for an automatic publication time and prefers confirmed news to undated copies',()=>{
  const unknown={id:'unknown',kind:'news'},fresh={id:'fresh',kind:'news',publishedAt:date+'T10:00:00Z'};
  const future={id:'future',kind:'news',publishedAt:date+'T13:00:00Z'};
  expect(broadcastEdition([unknown,fresh,future],date)).toEqual([fresh]);
  expect(broadcastEdition([future],date)).toEqual([]);
  expect(broadcastEdition([{...future,source:'manual',pinned:true}],date)).toHaveLength(1);
 });
 it('preserves the same edition across repeated background refreshes inside a freshness band',()=>{
  const stories=[{id:'odds',source:'auto',pinned:true,kind:'league'},{id:'trade',source:'auto',pinned:true,kind:'trade',occurredAt:date+'T10:00:00Z'},{id:'champ',kind:'champion'},{id:'record',kind:'record'},{id:'chip',kind:'chip'}];
  const edition=broadcastEdition(stories,date),now=Date.parse(date+'T12:05:00Z');
  expect(broadcastEdition(edition,date,{now})).toEqual(edition);
 });
 it('expires stale automatic trades even when generated as pinned, without expiring commissioner stories',()=>{
  const old={id:'old-trade',kind:'trade',source:'auto',pinned:true,occurredAt:Date.parse('2026-10-20T12:00:00Z')};
  expect(broadcastEdition([old],date)).toEqual([]);
  expect(broadcastEdition([{...old,source:'manual'}],date)).toHaveLength(1);
  expect(broadcastEdition([{...old,kind:'news'}],date)).toEqual([]);
 });
 it('uses the latest confirmed news or trade ahead of routine undated activity',()=>{
  for(const kind of ['trade','news']){
   const old={id:'old',kind,occurredAt:'2026-10-26T10:00:00Z'},fresh={id:'fresh',kind,occurredAt:'2026-10-27T10:00:00Z'};
   const before={id:'before',kind:'golf'},after={id:'after',kind:'event'};
   expect(broadcastEdition([before,old,after,fresh],date)).toEqual([fresh,before,after]);
   expect(broadcastEdition([fresh,old],date)).toEqual([fresh]);
  }
 });
 it('keeps explicit pins first, then live play, fresh receipts and routine content',()=>{
  const pin={id:'pin',kind:'news',source:'manual',pinned:true},live={id:'live',kind:'fantasy',temporal:'live'},receipt={id:'receipt',kind:'trade',occurredAt:'2026-10-27T10:00:00Z'},routine={id:'routine',kind:'event'};
  expect(broadcastEdition([routine,receipt,pin,live],date)).toEqual([pin,live,receipt,routine]);
 });
 it('keeps undated stories and preserves event ranking instead of guessing freshness',()=>{
  const unknown={id:'unknown',kind:'trade',source:'auto',pinned:true};
  expect(broadcastEdition([unknown],date)).toEqual([unknown]);
  const first={id:'first',kind:'event',publishedAt:'2026-10-26T10:00:00Z'},later={id:'later',kind:'event',publishedAt:'2026-10-27T10:00:00Z'};
  expect(broadcastEdition([first,later],date)).toEqual([first]);
 });
 it('keeps the daily opener independent and the compact deck stable on refresh',()=>{
  const deck=homeBroadcastDeck([{id:'chip',kind:'chip'},{id:'season',kind:'season'},{id:'trade',kind:'trade'}],{now:new Date(date+'T12:00:00Z')});
  expect(deck).toHaveLength(4);expect(deck[0].homeFeature).toBe(true);expect(deck[1].kind).toBe('trade');expect(homeBroadcastDeck(deck,{now:new Date(date+'T13:00:00Z')})).toEqual(deck);
 });
});
