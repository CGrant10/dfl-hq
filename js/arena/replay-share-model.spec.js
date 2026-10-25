import {describe,it,expect} from 'vitest';
import {buildStadiumRace} from './stadium-model.js';
import {finishRacers} from './finish-model.js';
import {replayShareModel,replayShareMoment,replayMime} from './replay-share-model.js';
const racers=finishRacers({participants:[{member_id:1},{member_id:2},{member_id:3}]},[{id:1,display_name:'First'},{id:2,display_name:'Second'},{id:3,display_name:'Third'}]);
const race=buildStadiumRace(racers,{engine:"stadium-v1",seed:740,order:['2','3','1'],presentation_version:2,story_duration_ms:60000},60000);
const event={id:7,name:'Official draw',bc_state:'finished',status:'complete'};
const results=race.paths.map(p=>({member_id:p.id,place:p.place,finish_ms:p.finishMs}));
describe('shareable Arena finishes',()=>{
 it('exports the manifest only when the whole official result matches',()=>{
  const model=replayShareModel(event,results,racers,race);
  expect(model.replay).toBe(true);expect(model.finish.rows.map(r=>r.id)).toEqual(['2','3','1']);
  const first=replayShareMoment(model,0),last=replayShareMoment(model,6000);
  expect(first.elapsed).toBe(model.finish.rows[0].time-4500);expect(first.final).toBe(false);
  expect(last.elapsed).toBe(race.duration);expect(last.final).toBe(true);
  expect(replayShareMoment(model,8000)).toMatchObject({elapsed:race.duration,hold:2});
 });
 it.each(['running','paused','idle'])('never exports an unfinished %s result',state=>{
  expect(replayShareModel({...event,bc_state:state,status:'live'},results,racers,race)).toBeNull();
 });
 it('does not manufacture footage for mismatched or missing recorded times',()=>{
  for(const finish of [results.map(r=>({...r,finish_ms:null})),results.map(r=>({...r,finish_ms:r.finish_ms+30}))]){
   const model=replayShareModel(event,finish,racers,race);expect(model.replay).toBe(false);expect(model.race).toBeNull();expect(model.finish.rows).toHaveLength(3);
  }
  expect(replayShareModel(event,results,racers,null).replay).toBe(false);
 });
 it('refuses duplicated, foreign or incomplete official orders',()=>{
  for(const finish of [results.slice(1),results.map((r,i)=>({...r,member_id:i?'99':r.member_id})),results.map(r=>({...r,place:1}))])expect(replayShareModel(event,finish,racers,race)).toBeNull();
 });
 it('bounds a long race to eight seconds with a two-second official-result hold',()=>{
  const long=buildStadiumRace(racers,{engine:"stadium-v1",seed:740,order:['2','3','1'],presentation_version:2},600000),locked=long.paths.map(p=>({member_id:p.id,place:p.place,finish_ms:p.finishMs}));
  const model=replayShareModel(event,locked,racers,long);expect(model.duration).toBe(8000);expect(model.rate).toBeGreaterThan(1);
  expect(replayShareMoment(model,90000)).toMatchObject({elapsed:600000,final:true,hold:2});
 });
 it('selects an actual supported video type and keeps an image fallback',()=>{
  expect(replayMime(null)).toBe('');expect(replayMime({isTypeSupported:()=>false})).toBe('');
  expect(replayMime({isTypeSupported:type=>type==='video/mp4'})).toBe('video/mp4');
  expect(replayMime({isTypeSupported:type=>type==='video/webm;codecs=vp8'})).toBe('video/webm;codecs=vp8');
 });
});
