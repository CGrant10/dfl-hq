import {describe,it,expect,vi,afterEach} from 'vitest';
import {createStadiumFeedback} from './stadium-feedback.js';
afterEach(()=>vi.unstubAllGlobals());
function fixture({pending=false}={}){
 const listeners={};let resolve;const resume=pending?new Promise(r=>resolve=r):Promise.resolve();
 const context={state:'suspended',resume:vi.fn(()=>resume.then(()=>{context.state='running'})),suspend:vi.fn(async()=>{context.state='suspended'}),close:vi.fn(async()=>{context.state='closed'})};
 const Audio=vi.fn(function(){return context});vi.stubGlobal('AudioContext',Audio);vi.stubGlobal('document',{hidden:false,addEventListener:(k,v)=>listeners[k]=v,removeEventListener:vi.fn()});
 return {Audio,context,listeners,resolve};
}
describe('stadium sound activation and lifecycle',()=>{
 it('creates no audio context until explicit activation',async()=>{
  const f=fixture(),sound=createStadiumFeedback();sound.cue('launch');expect(f.Audio).not.toHaveBeenCalled();
  expect(await sound.enable(true)).toBe(true);expect(f.Audio).toHaveBeenCalledOnce();await sound.enable(false);expect(f.context.suspend).toHaveBeenCalled();sound.stop();expect(f.context.close).toHaveBeenCalledOnce();
 });
 it('a late resume cannot undo a newer mute request',async()=>{
  const f=fixture({pending:true}),sound=createStadiumFeedback(),first=sound.enable(true);await sound.enable(false);f.resolve();expect(await first).toBe(false);sound.stop();
 });
 it('stopping during audio activation closes once and rejects late readiness',async()=>{
  const f=fixture({pending:true}),sound=createStadiumFeedback(),first=sound.enable(true);sound.stop();f.resolve();expect(await first).toBe(false);sound.stop();expect(f.context.close).toHaveBeenCalledOnce();
 });
 it('backgrounding suspends sound and invalidates an in-flight resume',async()=>{
  const f=fixture({pending:true}),sound=createStadiumFeedback(),first=sound.enable(true);document.hidden=true;f.listeners.visibilitychange();f.resolve();expect(await first).toBe(false);expect(f.context.suspend).toHaveBeenCalledOnce();sound.stop();
 });
 it('unsupported audio remains disabled',async()=>{
  fixture();vi.stubGlobal('AudioContext',undefined);vi.stubGlobal('webkitAudioContext',undefined);const sound=createStadiumFeedback();expect(await sound.enable(true)).toBe(false);sound.cue('finish');sound.stop();
 });
});
