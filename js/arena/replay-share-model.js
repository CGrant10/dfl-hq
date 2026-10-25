import {officialFinish} from './finish-model.js';

// A replay is exportable only when its manifest agrees with the locked result.
// Older results can still be shared as an image without inventing race footage.
export function replayShareModel(event,results,racers,race){
 const finish=officialFinish(event,results,racers);if(!finish)return null;
 const paths=new Map((race?.paths||[]).map(path=>[String(path.id),path]));
 const replay=!!race&&race.racers.length===racers.length&&finish.rows.every(row=>{
  const path=paths.get(row.id);return path&&path.place===row.place&&row.time!==null&&Math.abs(path.finishMs-row.time)<=2;
 });
 const from=replay?Math.max(0,finish.rows[0].time-4500):0;
 return {name:event.name||'DFL Stadium Dash',finish,racers,replay,race:replay?race:null,from,rate:replay?(race.duration-from)/6000:1,duration:8000};
}
export function replayShareMoment(model,time){
 const t=Math.max(0,Math.min(8000,Number(time)||0));
 return {elapsed:model.from+Math.min(6000,t)*model.rate,final:t>=6000,hold:Math.max(0,t-6000)/1000};
}
export function replayMime(Recorder=globalThis.MediaRecorder){
 if(!Recorder||typeof Recorder.isTypeSupported!=='function')return '';
 return ['video/mp4;codecs=avc1.42E01E','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(type=>Recorder.isTypeSupported(type))||'';
}
