import {describe,it,expect} from 'vitest';
import {dailyBroadcast} from './daily-broadcast.js';
import {homeBroadcastDeck} from './home-presentation.js';
describe('the shared daily DFL card',()=>{
 it('uses one Chicago calendar day, independently of device time zone',()=>{
  expect(dailyBroadcast(new Date('2026-10-16T05:01:00Z'))).toEqual(dailyBroadcast(new Date('2026-10-16T23:59:00Z')));
  expect(dailyBroadcast(new Date('2026-10-16T04:59:00Z')).date).toBe('2026-10-15');
  expect(dailyBroadcast(new Date('2026-10-16T05:00:00Z')).date).toBe('2026-10-16');
 });
 it('changes the saying on the next day, including the winter time boundary',()=>{
  const a=dailyBroadcast(new Date('2026-12-31T05:59:59Z')),b=dailyBroadcast(new Date('2026-12-31T06:00:00Z'));
  expect(a.date).toBe('2026-12-30');expect(b.date).toBe('2026-12-31');expect(a.headline).not.toBe(b.headline);
 });
 it('never adopts a personal story or action, and rolls over an already wrapped deck',()=>{
  const now=new Date('2026-10-16T12:00:00Z'),story={key:'personal',headline:'Your team',href:'#/trade'};
  const a=homeBroadcastDeck([story],{now,edition:{headline:'You lost'},week:6});
  expect(a[0]).toMatchObject({href:null,body:'',actionLabel:'',dailyDate:'2026-10-16'});
  expect(a[0]).not.toHaveProperty('sourceKey');expect(a[1]).toBe(story);
  const b=homeBroadcastDeck(a,{now:new Date('2026-10-17T12:00:00Z')});
  expect(b).toHaveLength(2);expect(b[0].headline).not.toBe(a[0].headline);
 });
});
