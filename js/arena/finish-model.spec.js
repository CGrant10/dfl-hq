import {describe,it,expect} from 'vitest';
import {finishRacers,officialFinish,finishTime} from './finish-model.js';
const event={bc_state:'finished',status:'complete'};
const racers=finishRacers({participants:[{member_id:1,number:1},{member_id:2,number:2},{member_id:3,number:3}],racer_kits:[{member_id:2,kit:{number:17,jersey:'#002244',pants:'#ffffff',preset:'nfl:BUF'}}]},[{id:1,display_name:'First'},{id:2,display_name:'Second',team_name:'Current team'}]);
const results=[{member_id:3,place:3,finish_ms:60000},{member_id:2,place:1,finish_ms:59000},{member_id:1,place:2,finish_ms:59123}];
describe('the official Arena finish',()=>{
 it('keeps official places, lane numbers and saved jerseys distinct',()=>{
  const finish=officialFinish(event,results,racers);
  expect(finish.rows.map(row=>row.id)).toEqual(['2','1','3']);
  expect(finish.rows[0]).toMatchObject({name:'Second',team:'Current team',raceNumber:2,kit:{number:17,jersey:'#002244'},profile:true});
  expect(finish.rows[2]).toMatchObject({name:'Racer 3',profile:false});
  expect(finish).toMatchObject({margin:123,photoFinish:true});
  expect(finish.rows.map(row=>row.gap)).toEqual([0,123,1000]);
 });
 it.each(['idle','running','paused'])('does not reveal an uncompleted %s draw',state=>{
  expect(officialFinish({bc_state:state,status:'live'},results,racers)).toBeNull();
 });
 it('does not reveal a partial, duplicated or foreign order even with the correct row count',()=>{
  expect(officialFinish(event,results.slice(0,2),racers)).toBeNull();
  for(const mutate of [rows=>rows[0].member_id=2,rows=>rows[0].member_id=99,rows=>rows[0].place=2,rows=>rows[0].place=4]){
   const rows=structuredClone(results);mutate(rows);expect(officialFinish(event,rows,racers)).toBeNull();
  }
 });
 it('rejects invalid times or times that contradict official order',()=>{
  for(const time of [-1,'',NaN,Infinity,58000]){
   const rows=structuredClone(results);rows[0].finish_ms=time;expect(officialFinish(event,rows,racers)).toBeNull();
  }
 });
 it('keeps an old missing time unknown and never manufactures a zero-second finish',()=>{
  const rows=results.map(row=>({...row,finish_ms:null}));const finish=officialFinish(event,rows,racers);
  expect(finish.margin).toBeNull();expect(finish.rows.every(row=>row.time===null&&row.gap===null)).toBe(true);
  expect(finishTime(null)).toBe('—');expect(finishTime('')).toBe('—');expect(finishTime(0)).toBe('0.000s');
 });
 it('preserves millisecond separation and permits equal recorded times in official place order',()=>{
  const rows=results.map(row=>({...row,finish_ms:59000}));expect(officialFinish(event,rows,racers).rows.map(row=>row.id)).toEqual(['2','1','3']);
  expect(finishTime(4)).toBe('0.004s');
 });
 it('uses deterministic appearance when a legacy racer has no saved kit',()=>{
  expect(finishRacers({participants:[{member_id:1}]},[])[0].kit).toEqual(finishRacers({participants:[{member_id:1}]},[])[0].kit);
 });
});
