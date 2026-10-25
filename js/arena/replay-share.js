import {createStadiumRenderer} from './stadium-renderer.js';
import {stadiumFrame} from './stadium-model.js';
import {replayShareModel,replayShareMoment,replayMime} from './replay-share-model.js';
import {finishTime} from './finish-model.js';
import {drawCharacterRunner} from './racer-character-art.js';
import {kitInk} from './racer-kit-model.js';
import {esc} from '../ui.js';
import {enterSheet,exitSheet,mountSheetDrag} from '../sheet-drag.js';
import {fitDialogToViewport} from '../dialog-viewport.js';

let active=null;
const abortError=()=>new DOMException('Replay canceled.','AbortError');
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Image could not be created.')),'image/png'));
const wrap=(ctx,value,max)=>{let line='',out=[];for(const word of String(value).split(/\s+/)){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>max){out.push(line);line=word}else line=next}if(line)out.push(line);return out};

export function createReplayCanvas(model){
 const canvas=document.createElement('canvas'),field=document.createElement('canvas'),w=960,fieldH=Math.max(360,Math.min(640,model.racers.length*32));
 const listTop=82+fieldH+104,rowH=74;
 canvas.width=w;canvas.height=listTop+Math.ceil(model.racers.length/2)*rowH+44;
 const ctx=canvas.getContext('2d',{alpha:false});let stopped=false;
 const renderer=model.replay?createStadiumRenderer(field,{racers:model.racers,motion:()=>true,outputSize:{width:w,height:fieldH}}):null;
 const ink='#f4f2ee',muted='#b8b3ab',red='#C8102E',gold='#EFC94C';
 function draw(time=8000){
  if(stopped)return;const moment=replayShareMoment(model,time),final=!model.replay||moment.final;
  ctx.fillStyle='#0b0b0c';ctx.fillRect(0,0,w,canvas.height);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.fillStyle=red;ctx.fillRect(0,0,8,82);
  ctx.fillStyle=ink;ctx.font='700 34px Rajdhani,sans-serif';ctx.fillText('DFL ARENA',28,38);
  ctx.fillStyle=muted;ctx.font='600 22px Rajdhani,sans-serif';ctx.fillText(model.name,28,68,w-200);
  ctx.textAlign='right';ctx.fillStyle=gold;ctx.fillText(final?'FINAL':`REPLAY · ${model.rate.toFixed(1)}×`,w-28,40);
  if(renderer){renderer.draw(stadiumFrame(model.race,moment.elapsed),{state:'finished',replay:!final,celebration:moment.hold});ctx.drawImage(field,0,82)}
  else{const winner=model.finish.rows[0];drawCharacterRunner(ctx,winner.kit,{x:50,y:90,width:230,height:fieldH-8,identity:winner.id,moving:false,celebrate:true});ctx.fillStyle=ink;ctx.font='700 64px Rajdhani,sans-serif';ctx.textAlign='left';ctx.fillText('OFFICIAL',320,180);ctx.fillText('FINISH.',320,246)}
  ctx.textAlign='left';ctx.fillStyle=gold;ctx.font='700 22px Rajdhani,sans-serif';ctx.fillText(final?'THAT’S THE FUCKING ORDER.':'GET TO THE FUCKING LINE.',28,82+fieldH+38);
  ctx.fillStyle=ink;ctx.font='700 34px Rajdhani,sans-serif';ctx.fillText(final?model.finish.rows[0].name+' wins.':'Every racer. One finish.',28,82+fieldH+78,w-56);
  const rows=final?model.finish.rows:model.racers;
  rows.forEach((r,i)=>{
   const x=28+(i%2)*474,y=listTop+Math.floor(i/2)*rowH;
   ctx.fillStyle='#38383c';ctx.fillRect(x,y,430,1);
   ctx.fillStyle=r.kit.jersey;ctx.fillRect(x,y+14,36,36);ctx.fillStyle=kitInk(r.kit.jersey);ctx.textAlign='center';ctx.font='700 24px Rajdhani,sans-serif';ctx.fillText(String(r.raceNumber),x+18,y+40);
   ctx.textAlign='left';ctx.fillStyle=ink;ctx.font='700 24px Rajdhani,sans-serif';const lines=wrap(ctx,r.name,final?275:365);lines.slice(0,2).forEach((line,j)=>ctx.fillText(line,x+48,y+31+j*25,final?275:365));
   if(final){ctx.textAlign='right';ctx.fillStyle=r.place===1?gold:ink;ctx.font='700 24px Rajdhani,sans-serif';ctx.fillText('#'+r.place,x+430,y+29);ctx.fillStyle=muted;ctx.font='500 19px Rajdhani,sans-serif';ctx.fillText(finishTime(r.time),x+430,y+54)}
  });
  ctx.textAlign='left';ctx.fillStyle=muted;ctx.font='600 18px Rajdhani,sans-serif';ctx.fillText('DRAFT · GOLF · SIN · FOLD',28,canvas.height-14);
 }
 draw();const ready=Promise.all([document.fonts.ready,renderer?.ready]).then(()=>draw());return {canvas,draw,ready,stop(){stopped=true;renderer?.stop()}};
}

export function recordReplay(surface,{signal,mime=replayMime()}={}){
 return new Promise((resolve,reject)=>{
  if(signal?.aborted){reject(abortError());return}
  let recorder,stream,raf=0,timeout=0,settled=false;const chunks=[];
  const stopTracks=()=>stream?.getTracks().forEach(track=>track.stop());
  const finish=(error,blob)=>{if(settled)return;settled=true;cancelAnimationFrame(raf);clearTimeout(timeout);signal?.removeEventListener('abort',abort);try{if(recorder?.state==='recording')recorder.stop()}catch{}stopTracks();if(error)reject(error);else resolve(blob)};
  const abort=()=>finish(abortError());
  try{
   surface.draw(0);stream=surface.canvas.captureStream(30);recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2800000});
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};
   recorder.onerror=()=>finish(Error('Replay recording unavailable. You can still share the finish image.'));
   recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType||mime});finish(blob.size?null:Error('The replay was empty. Try the finish image.'),blob)};
   signal?.addEventListener('abort',abort,{once:true});
   recorder.start();const began=performance.now();
   const tick=now=>{if(settled)return;const time=now-began;surface.draw(time);if(time>=8000){recorder.stop();return}raf=requestAnimationFrame(tick)};
   raf=requestAnimationFrame(tick);timeout=setTimeout(()=>finish(Error('Replay timed out. You can still share the finish image.')),12000);
  }catch(error){finish(error)}
 });
}

export function openReplayShare({event,results,racers,race,source,motion=()=>true}){
 const model=replayShareModel(event,results,racers,race);if(!model)return;
 active?.();const surface=createReplayCanvas(model),dialog=document.createElement('dialog');dialog.className='dfl-action-sheet sr-replay-share';dialog.setAttribute('aria-labelledby','arena-share-title');
 dialog.innerHTML=`<header><span class="dfl-sheet-grip" aria-hidden="true"></span><h2 id="arena-share-title">${esc(model.name)}</h2><button type="button" class="linkbtn" data-close>Close</button></header><div class="replay-share-body"><div data-poster></div><video controls playsinline preload="metadata" hidden aria-label="DFL Arena finish replay"></video><p class="replay-share-status" role="status"></p></div><footer><button type="button" data-create-clip>Create replay clip</button><button type="button" data-share-media>Share image</button><button type="button" data-save-media>Save image</button><button type="button" data-copy-link>Copy result link</button></footer>`;
 dialog.querySelector('[data-poster]').append(surface.canvas);
 const q=s=>dialog.querySelector(s),video=q('video'),status=q('[role=status]'),create=q('[data-create-clip]'),share=q('[data-share-media]'),save=q('[data-save-media]');
 let closed=false,busy=false,recording=null,blob=null,objectUrl='',format='image';
 const abort=new AbortController();
 const cleanup=()=>{if(closed)return;closed=true;abort.abort();drag.stop();surface.stop();video.pause();video.removeAttribute('src');if(objectUrl)URL.revokeObjectURL(objectUrl);window.removeEventListener('hashchange',close);document.removeEventListener('visibilitychange',visibility);dialog.remove();if(source?.isConnected)source.focus({preventScroll:true});if(active===close)active=null};
 const close=()=>{dialog.close();cleanup()};const dismiss=()=>exitSheet(dialog,close);
 const drag=mountSheetDrag(dialog,{handle:q('header'),dismiss});
 const visibility=()=>{if(document.hidden){video.pause();if(recording)close()}};
 active=close;dialog.addEventListener('close',cleanup);dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss()});q('[data-close]').onclick=dismiss;dialog.addEventListener('click',e=>{if(e.target===dialog)dismiss()});
 window.addEventListener('hashchange',close);document.addEventListener('visibilitychange',visibility);
 document.body.append(dialog);dialog.showModal();fitDialogToViewport(dialog);enterSheet(dialog,{motion:motion()});
 const mime=replayMime();create.hidden=!model.replay||!mime||typeof surface.canvas.captureStream!=='function'||!motion();
 const setBusy=value=>{busy=value;for(const b of [create,share,save])b.disabled=value;dialog.setAttribute('aria-busy',String(value))};
 const media=async()=>{await surface.ready;return blob||await png(surface.canvas)};
 const filename=()=>`dfl-arena-${event.id||'finish'}.${format==='image'?'png':blob?.type.includes('mp4')?'mp4':'webm'}`;
 create.onclick=async()=>{
  if(busy||closed)return;setBusy(true);status.textContent='Creating the finish clip…';recording=true;
  try{await surface.ready;if(closed)return;blob=await recordReplay(surface,{signal:abort.signal,mime});if(closed)return;format='clip';objectUrl=URL.createObjectURL(blob);video.poster=surface.canvas.toDataURL('image/png');video.src=objectUrl;video.hidden=false;q('[data-poster]').hidden=true;share.textContent='Share clip';save.textContent='Save clip';create.hidden=true;status.textContent='Replay ready.'}
  catch(error){if(!closed){surface.draw();status.textContent=error.message||'Clip unavailable. Share the finish image.'}}
  finally{recording=false;if(!closed)setBusy(false)}
 };
 share.onclick=async()=>{
  if(busy||closed)return;setBusy(true);
  try{const data=await media();if(closed)return;const file=new File([data],filename(),{type:data.type});if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file],title:model.name,text:'DFL Arena · Official finish'});else status.textContent=`Use Save ${format} to download it.`}
  catch(error){if(!closed&&error.name!=='AbortError')status.textContent=`Could not share. Use Save ${format}.`}
  finally{if(!closed)setBusy(false)}
 };
 save.onclick=async()=>{if(busy||closed)return;setBusy(true);try{const data=await media();if(closed)return;const url=URL.createObjectURL(data),a=document.createElement('a');a.href=url;a.download=filename();a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);status.textContent='Download started.'}catch{if(!closed)status.textContent='Could not save. Try again.'}finally{if(!closed)setBusy(false)}};
 q('[data-copy-link]').onclick=async()=>{try{const url=new URL(location.href);url.hash=`#/arena?id=${encodeURIComponent(event.id)}`;await navigator.clipboard.writeText(url.href);if(!closed)status.textContent='Result link copied.'}catch{if(!closed)status.textContent='Could not copy the link.'}};
 return close;
}
