import {drawKitRunner,onRacerArtReady} from './racer-kit-art.js';
import {normalizeKit,footballYardNumber,kitInk,footballSpot} from './racer-kit-model.js';
import {runnerCadence} from './stadium-motion.js';
import {stadiumShowdown,stadiumShowdownLane,stadiumDepth} from './stadium-scene.js';
import {createStadiumDirector,stadiumShotWindow,stadiumCelebration} from './stadium-director.js';
const palette=['#cf263b','#c8a147','#ece5d9','#36465c','#a73549','#d3b16e','#ae3b23','#4e6484','#d06238','#c16a91','#8a7c5d','#677781'];
export const stadiumColor=(racer,index)=>/^#[0-9a-f]{6}$/i.test(racer?.color||'')?racer.color:palette[index%palette.length];
const image=(src,onload)=>{const img=new Image();img.decoding='async';img.onload=onload;img.src=src;return img;};
const lerp=(a,b,t)=>a+(b-a)*t;
const initial=name=>String(name||'DFL').trim().split(/\s+/).map(p=>p[0]).slice(0,2).join('').toUpperCase();
const safePhoto=value=>{if(!String(value||'').trim())return null;try{const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
export function stadiumTrackWindow(rows,u,worldWidth=2300){
 const positions=rows.map(r=>r.progress),low=positions.length?Math.min(...positions):0,high=positions.length?Math.max(...positions):0;
 const span=Math.max(240,(high-low)*worldWidth+160,u>.90?(1-low)*worldWidth+120:0);
 return {span,start:u<.055?0:Math.max(0,low*worldWidth-35)};
}

export function createStadiumRenderer(canvas,{racers,motion=()=>true,camera=()=>({mode:'auto',racerId:null}),onLayout=(_layout)=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('The race display could not open.');
 let width=0,height=0,ratio=1,closed=false,lastFrame=null,lastOptions={},lastTime=0,panX=0,panY=0,zoom=1,span=2760,lastRun='',sizeDirty=true,lastLayout='',shot=null,showdown=null,duelBlend=0,previousDuel=null,lastCamera='',cameraUntil=0;
 const director=createStadiumDirector();
 const redraw=()=>{if(lastFrame)draw(lastFrame,lastOptions);};
 const stopArt=onRacerArtReady(redraw);
 const stadium=image(new URL('../../assets/stadium-arena/stadium.webp',import.meta.url),redraw);
 const crest=image(new URL('../../icons/dfl-logo-512.webp',import.meta.url),redraw);
 const sprite=image(new URL('../../assets/stadium-arena/runner-cycle.webp',import.meta.url),redraw);
 const photos=new Map(racers.map(r=>{const url=safePhoto(r.photo);return [String(r.id),url?image(url,redraw):null];}));
 const kits=new Map();const refreshKits=()=>{kits.clear();racers.forEach((r,index)=>kits.set(String(r.id),normalizeKit(r.kit,{number:r.number??index+1})));};refreshKits();
 const resize=new ResizeObserver(()=>{sizeDirty=true;redraw();});resize.observe(canvas);
 const getSize=()=>{
  if(!sizeDirty)return;const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);sizeDirty=false;
 };
 function runner(r,x,y,scale,elapsed,moving,color,index,speed=1,identity=true,finishAge=-1,celebrate=false){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const cadence=runnerCadence(elapsed,speed,index,moving),stride=cadence.stride,alpha=ctx.globalAlpha;
  ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(-2,0,18,3.5,0,0,Math.PI*2);ctx.fill();
  const kit=kits.get(String(r.id));
  if(moving&&scale>.35){for(let i=0;i<4;i++){const age=((cadence.phase/2+i*.25)%1);ctx.globalAlpha=alpha*(1-age)*.16;ctx.fillStyle=i%2?'#d7c7a0':'#80a18a';ctx.beginPath();ctx.ellipse(-12-age*(cadence.burst?25:16),-age*5,1+age*2,.6+age,0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=alpha;}
  const pose=stadiumCelebration(finishAge,index,celebrate);
  ctx.save();ctx.translate(0,cadence.bob-pose.lift-30);ctx.rotate(cadence.lean+pose.lean);ctx.scale(pose.turn,1);ctx.translate(0,30);
  if(cadence.burst&&scale>.55){ctx.globalAlpha=alpha*.12;drawKitRunner(ctx,kit,{x:-29,y:-60,width:48,height:66,stride:(stride+5)%6});ctx.globalAlpha=alpha;}
  if(drawKitRunner(ctx,kit,{x:-22,y:-60,width:48,height:66,stride})){
   // The recolored shared atlas keeps the original runner detail.
  }else if(sprite.complete&&sprite.naturalWidth){
   const cell=sprite.naturalWidth/6;ctx.drawImage(sprite,cell*stride,0,cell,sprite.naturalHeight,-22,-60,48,66);
  }else{
   const swing=moving?Math.sin(elapsed/95+index)*9:0;
   ctx.strokeStyle='#ece5d9';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(-7+swing,-10);ctx.lineTo(-11+swing,0);ctx.moveTo(0,-23);ctx.lineTo(7-swing,-10);ctx.lineTo(11-swing,0);ctx.stroke();
   ctx.fillStyle='#b7243a';ctx.fillRect(-8,-43,16,23);ctx.fillStyle='#2a303b';ctx.beginPath();ctx.arc(2,-51,9,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
  if(!identity){ctx.restore();return;}
  // Identity badge stays separate from the shared jersey animation.
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-20,-76,40,18,5);ctx.fill();ctx.fillStyle=kitInk(color);ctx.font='700 11px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText(String(kit.number),0,-63);
  const photo=photos.get(String(r.id));ctx.save();ctx.beginPath();ctx.arc(-28,-66,10,0,Math.PI*2);ctx.clip();
  if(photo?.complete&&photo.naturalWidth)ctx.drawImage(photo,-38,-76,20,20);
  else {ctx.fillStyle='#1a202b';ctx.fillRect(-38,-76,20,20);ctx.fillStyle='#fff';ctx.font='700 8px sans-serif';ctx.fillText(initial(r.name),-28,-63);}
  ctx.restore();ctx.restore();
 }
 function leadBattle(leaders,y,h,elapsed,moving,state,offset=0,panelWidth=width){
  if(h<70)return;ctx.save();ctx.translate(offset,0);const width=panelWidth,picks=leaders.slice(0,2),cell=width/2;
  ctx.fillStyle='#0b1420';ctx.fillRect(0,y,width,h);
  const light=ctx.createLinearGradient(0,y,0,y+h);light.addColorStop(0,'#7b283322');light.addColorStop(1,'#080e1800');ctx.fillStyle=light;ctx.fillRect(0,y,width,h);
  ctx.fillStyle='#d8c08a';ctx.font='700 10px Rajdhani,sans-serif';ctx.textAlign='left';ctx.fillText(state==='idle'?'ON DECK':state==='finished'?'AT THE LINE':'LEAD BATTLE',14,y+19);
  const gap=picks.length===2?Math.max(0,(picks[0].progress-picks[1].progress)*100):0;
  ctx.textAlign='right';ctx.fillStyle='#ede6d6';ctx.fillText(state==='idle'?`${racers.length} RACERS`:gap<.1?'NECK AND NECK':`${gap.toFixed(1)} YD GAP`,width-14,y+19);
  picks.forEach((row,i)=>{
   const racer=racers[row.index],x=i*cell,ground=y+h-35,scale=Math.min(1.1,(h-68)/78),color=stadiumColor(racer,row.index);
   ctx.save();ctx.beginPath();ctx.rect(x+5,y+26,cell-10,h-26);ctx.clip();
   ctx.fillStyle=color+'1a';ctx.beginPath();ctx.ellipse(x+cell*.67,ground,cell*.27,5,0,0,Math.PI*2);ctx.fill();
   runner(racer,x+cell*.64,ground,scale,elapsed,moving&&!row.finished,color,row.index,row.speed);
   ctx.fillStyle='#f0e8da';ctx.font='700 12px Rajdhani,sans-serif';ctx.textAlign='left';ctx.fillText(racer.name,x+12,y+h-18,cell-24);
   ctx.fillStyle='#b9ad91';ctx.font='600 10px Rajdhani,sans-serif';ctx.fillText(`${row.finished?'#'+row.place:'#'+(i+1)} · ${footballSpot(row.progress)}`,x+12,y+h-5,cell-24);ctx.restore();
  });
  ctx.strokeStyle='#d4bd7f24';ctx.beginPath();ctx.moveTo(cell,y+30);ctx.lineTo(cell,y+h-8);ctx.stroke();ctx.restore();
 }
 function duelField(bounds,{pan,span}){
  const {left,top,width,height}=bounds,pad=Math.min(24,width*.15),scale=(width-pad*2)/Math.max(200,span),xOf=progress=>left+pad+(progress*2300-pan)*scale;
  ctx.save();ctx.beginPath();ctx.rect(left,top,width,height);ctx.clip();
  const turf=ctx.createLinearGradient(0,top,0,top+height);turf.addColorStop(0,'#193d32');turf.addColorStop(1,'#0d2a23');ctx.fillStyle=turf;ctx.fillRect(left,top,width,height);
  for(let m=0;m<=10;m++){
   const x=xOf(m/10),next=xOf((m+1)/10);if(x>left+width||next<left)continue;
   ctx.fillStyle=m%2?'#ffffff05':'#0000000b';ctx.fillRect(x,top,next-x,height);ctx.strokeStyle='#e6e8da36';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+height);ctx.stroke();
   const number=footballYardNumber(m);if(number){ctx.fillStyle='#edeadd88';ctx.font='700 10px Rajdhani,sans-serif';ctx.textAlign='center';ctx.fillText(number,x,top+height-5);}
  }
  for(let m=1;m<20;m++){const x=xOf(m/20);if(x<left||x>left+width)continue;ctx.strokeStyle='#edeadd55';ctx.beginPath();ctx.moveTo(x-2,top+height*.56);ctx.lineTo(x+2,top+height*.56);ctx.stroke();}
  const end=xOf(1),start=xOf(0),zone=230*scale;
  for(const [x,label,color] of [[start-zone,'DFL','#5a2033'],[end,'TOUCHDOWN','#78243c']])if(x<left+width&&x+zone>left){ctx.fillStyle=color;ctx.fillRect(x,top,zone,height);ctx.save();ctx.translate(x+zone/2,top+height/2);ctx.rotate(-Math.PI/2);ctx.fillStyle='#fff1d9';ctx.font=`400 ${Math.min(17,height/8)}px Anton,sans-serif`;ctx.textAlign='center';ctx.fillText(label,0,0);ctx.restore();}
  if(end>=left&&end<=left+width){ctx.fillStyle='#ecdec5';ctx.fillRect(end-1,top,3,height);}
  if(crest.complete&&crest.naturalWidth){const size=Math.min(80,345*scale);ctx.globalAlpha*=.13;ctx.drawImage(crest,xOf(.5)-size/2,top+height/2-size/2,size,size);}
  ctx.restore();
 }
 function draw(frame,{state='running',runId='',now=performance.now(),replay=false,celebration=0,photo=false}={}){
  if(closed)return;getSize();if(lastFrame&&frame.elapsed<lastFrame.elapsed)lastRun='';lastFrame=frame;lastOptions={state,runId,now,replay,celebration,photo};const enabled=motion(),dt=Math.min(.08,Math.max(.001,(now-lastTime)/1000));lastTime=now;
  const cameraState=camera();if(lastCamera!==cameraState.mode){lastCamera=cameraState.mode;cameraUntil=now+600;}if(cameraState.mode==='field'||!enabled)duelBlend=0;
  const overview=cameraState.mode==='field'||!enabled;
  const compactOverview=overview&&width<600,sideBattle=overview&&!compactOverview&&width>height*1.55,trackWidth=sideBattle?Math.round(width*.68):width;
  const n=racers.length,top=Math.max(30,Math.min(44,height*.11)),available=height-top-22,fieldH=overview&&!sideBattle&&!compactOverview?Math.max(90,Math.min(width/2.35,available-116)):available,laneH=Math.max(26,fieldH/n),worldH=laneH*n;
  const layout=`${overview}:${top}:${fieldH}:${trackWidth}`;if(layout!==lastLayout){lastLayout=layout;onLayout({overview,top,fieldHeight:fieldH,fieldWidth:trackWidth});}
  const live=state==='running'||replay,elapsed=Math.max(0,frame?.elapsed||0),u=frame?.u||0,rows=frame?.rows||racers.map((r,index)=>({id:String(r.id),index,progress:0,speed:0,finished:false}));
  const leaders=frame?.ranked||rows,leader=leaders[0];
  const view=cameraState,following=view.mode==='follow'?rows.find(r=>r.id===String(view.racerId)):null;
  shot=director.update(frame,{runId,state:replay?'running':state,camera:view.mode,racerId:view.racerId,motion:enabled,photo});
  showdown=stadiumShowdown(shot,frame,{camera:view.mode,motion:enabled,state,replay,activeKey:lastRun===runId?showdown?.key:null});
  if(showdown)previousDuel=showdown;
  const targetBlend=showdown?1:0;
  if(cameraState.mode==='field')duelBlend=0;
  else if(!(enabled&&state==='paused'&&!replay&&view.mode==='auto'&&lastRun===runId&&now>=cameraUntil))duelBlend=!enabled||lastRun!==runId||state==='idle'||state==='finished'&&!replay?targetBlend:lerp(duelBlend,targetBlend,1-Math.exp(-dt*12));
  if(Math.abs(duelBlend-targetBlend)<.002)duelBlend=targetBlend;
  const duel=(showdown||duelBlend>0)?previousDuel:null,columns=!!duel&&width<650;
  const wide=['field','launch'].includes(shot.kind),focusRows=rows.filter(row=>shot.ids.includes(row.id));
  const indices=focusRows.map(row=>row.index),low=indices.length?Math.min(...indices):0,high=indices.length?Math.max(...indices):n-1;
  const battle=!wide, targetZoom=wide||showdown?1:Math.max(1,Math.min(6.4,n/(high-low+2.5))),focusY=wide?worldH/2:(low+high+1)*laneH/2;
  const worldWidth=2300,padding=overview?24:62;
  const target=wide?(shot.kind==='launch'?stadiumTrackWindow(rows,u,worldWidth):{span:worldWidth*1.2,start:-worldWidth*.1}):stadiumShotWindow(focusRows,{finish:photo||u>=.90,worldWidth});
  const targetX=target.start;
  if(!enabled||lastRun!==runId||state==='idle'||state==='finished'&&!replay){panX=targetX;panY=focusY;zoom=targetZoom;span=target.span;lastRun=runId;}
  else if(state==='paused'&&view.mode==='auto'&&now>=cameraUntil){/* Keep the exact camera frozen with the race. */}
  else {const ease=1-Math.exp(-dt*3.3);panX=lerp(panX,targetX,ease);panY=lerp(panY,focusY,ease);zoom=lerp(zoom,targetZoom,ease);span=lerp(span,target.span,ease);}
  const pxScale=(trackWidth-padding*2)/Math.max(200,span);
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#080d15';ctx.fillRect(0,0,width,height);
  const depth=stadiumDepth(panX,{motion:enabled});
  if(stadium.complete&&stadium.naturalWidth){
   const sw=stadium.naturalWidth,sh=stadium.naturalHeight,split=top*.48;
   ctx.save();ctx.beginPath();ctx.rect(0,0,width,split);ctx.clip();ctx.drawImage(stadium,0,sh*.18,sw,sh*.28,-80+depth.far,0,width+160,split);ctx.restore();
   ctx.save();ctx.beginPath();ctx.rect(0,split,width,top-split);ctx.clip();ctx.drawImage(stadium,0,sh*.43,sw,sh*.22,-80+depth.near,split,width+160,top-split);ctx.restore();
  }
  else {const gradient=ctx.createLinearGradient(0,0,0,top);gradient.addColorStop(0,'#07111f');gradient.addColorStop(1,'#351625');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,top);}
  // Static floodlights add stadium depth without an extra animation loop.
  ctx.save();ctx.fillStyle='#fff2d1';ctx.shadowColor='#e6d2aa';ctx.shadowBlur=9;
  for(const fraction of [.12,.35,.65,.88])for(let bulb=0;bulb<4;bulb++)ctx.fillRect(width*fraction+bulb*4-6+depth.far,Math.max(4,top*.25),2,2);
  ctx.restore();
  const shade=ctx.createLinearGradient(0,top-28,0,top+10);shade.addColorStop(0,'#09101b00');shade.addColorStop(1,'#0b1821');ctx.fillStyle=shade;ctx.fillRect(0,top-28,width,38);
  ctx.fillStyle='#dfcdae';ctx.font='700 10px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText(following?racers[following.index].name.toUpperCase():photo?'GOAL-LINE REPLAY · 0.25×':overview?'FULL FIELD':state==='finished'&&!replay?'OFFICIAL FINISH':shot.kind==='pass'?'OVERTAKE':shot.kind==='finish'?'THE FINAL SPRINT':showdown?'SHOWDOWN':battle?'BATTLE CAM':'DFL ARENA',width/2,top-12,width-32);
  ctx.save();ctx.beginPath();ctx.rect(0,top,trackWidth,fieldH+5);ctx.clip();
  const baseScale=(overview?fieldH-Math.min(40,fieldH*.15):fieldH)/worldH,yScale=baseScale*zoom,lower=Math.max(worldH/2/zoom,Math.min(worldH-worldH/2/zoom,panY));
  const yOf=index=>top+fieldH/2+((index+.5)*laneH-lower)*yScale;
  const turf=ctx.createLinearGradient(0,top,0,height);turf.addColorStop(0,'#193d32');turf.addColorStop(1,'#0d2a23');ctx.fillStyle=turf;ctx.fillRect(0,top,width,height-top);
  const startX=padding-panX*pxScale,startZoneWidth=worldWidth/10*pxScale;
  if(startX>0){ctx.fillStyle='#5a2033';ctx.fillRect(startX-startZoneWidth,top,startZoneWidth,fieldH);ctx.fillStyle='#e9d6a0';ctx.save();ctx.translate(startX-startZoneWidth/2,top+fieldH/2);ctx.rotate(-Math.PI/2);ctx.font='400 19px Anton,sans-serif';ctx.textAlign='center';ctx.fillText('DFL',0,0);ctx.restore();}
  const step=worldWidth/10;
  for(let m=-1;m<12;m++){
   const x=padding+(m*step-panX)*pxScale,next=padding+((m+1)*step-panX)*pxScale;
   if(x>width||next<0)continue;ctx.fillStyle=m%2?'#ffffff05':'#0000000b';ctx.fillRect(x,top,next-x,fieldH);
   ctx.strokeStyle='#e6e8da36';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+fieldH);ctx.stroke();
   const number=footballYardNumber(m);if(number){ctx.fillStyle='#edeaddbb';ctx.font=`700 ${pxScale<.1?8:pxScale<.4?11:16}px Rajdhani,sans-serif`;ctx.textAlign='center';ctx.globalAlpha=1-duelBlend*.45;ctx.fillText(number,x,lerp(top+18,top+fieldH/2-4,duelBlend));ctx.fillText(number,x,top+fieldH-8);ctx.globalAlpha=1;}
  }
  for(let m=1;m<20;m++){const x=padding+(m*worldWidth/20-panX)*pxScale;if(x<0||x>width)continue;ctx.strokeStyle='#edeadd66';ctx.lineWidth=1;for(const y of [top+fieldH*.26,top+fieldH*.74]){ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.stroke();}}
  if(crest.complete&&crest.naturalWidth){const x=padding+(worldWidth/2-panX)*pxScale,y=top+fieldH/2+(worldH/2-lower)*yScale,size=Math.min(100,worldWidth*.15*pxScale);ctx.globalAlpha=.16;ctx.drawImage(crest,x-size/2,y-size/2,size,size);ctx.globalAlpha=1;}
  for(let index=0;index<n;index++){
   const y=yOf(index);ctx.globalAlpha=1-duelBlend;ctx.strokeStyle='#e5e7dc13';ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(0,y+laneH*yScale/2);ctx.lineTo(width,y+laneH*yScale/2);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.globalAlpha=1;
  if(duelBlend>0&&!columns){ctx.strokeStyle=`rgba(235,222,191,${duelBlend*.4})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,top+fieldH/2);ctx.lineTo(trackWidth,top+fieldH/2);ctx.stroke();}
  const finishX=padding+(worldWidth-panX)*pxScale;
  const endWidth=worldWidth/10*pxScale;if(finishX<width){ctx.fillStyle='#78243c';ctx.fillRect(finishX,top,endWidth,fieldH);ctx.fillStyle='#fff1d9';ctx.save();ctx.translate(finishX+Math.min(endWidth/2,44),top+fieldH/2);ctx.rotate(-Math.PI/2);ctx.font=`400 ${Math.min(22,Math.max(9,fieldH/7.5))}px Anton,sans-serif`;ctx.textAlign='center';ctx.fillText('TOUCHDOWN',0,0);ctx.restore();}
  if(finishX>0&&finishX<width+15){
   ctx.fillStyle='#ecdec5';ctx.fillRect(finishX-2,top,4,fieldH);for(let y=top;y<top+fieldH;y+=10){ctx.fillStyle=(Math.floor((y-top)/10)%2)?'#d5ae56':'#521527';ctx.fillRect(finishX+2,y,6,10);}
   ctx.fillStyle='#fff4d5';ctx.font='700 10px Rajdhani,sans-serif';ctx.textAlign='center';if(!compactOverview)ctx.fillText('GOAL LINE',finishX,top+30);
  }
  const moving=enabled&&live&&!frame?.countdown&&!frame?.finished;
  const duelLanes=duel?.rows.map((_,index)=>stadiumShowdownLane(index,{top,height:fieldH,width:trackWidth}))||[];
  if(columns&&duelBlend>0){ctx.save();ctx.globalAlpha=duelBlend;duelLanes.forEach(bounds=>duelField(bounds,{pan:panX,span}));ctx.restore();ctx.strokeStyle=`rgba(235,222,191,${duelBlend*.5})`;ctx.beginPath();ctx.moveTo(trackWidth/2,top);ctx.lineTo(trackWidth/2,top+fieldH);ctx.stroke();}
  for(const row of rows){
   const duelIndex=duel?.rows.findIndex(pick=>pick.id===row.id)??-1,lane=duelIndex>=0?duelLanes[duelIndex]:null;
   const r=racers[row.index],normalY=yOf(row.index)+laneH*yScale*.35,y=lane?lerp(normalY,lane.ground,duelBlend):normalY;if(y<top-30||y>top+fieldH+65)continue;
   ctx.globalAlpha=lane?1:1-duelBlend;if(ctx.globalAlpha<.002)continue;
   const normalX=padding+(row.progress*worldWidth-panX)*pxScale,duelPad=lane?Math.min(24,lane.width*.15):0,duelX=lane?lane.left+duelPad+(row.progress*worldWidth-panX)*(lane.width-duelPad*2)/Math.max(200,span):normalX,x=lane&&columns?lerp(normalX,duelX,duelBlend):normalX,color=stadiumColor(r,row.index),normalScale=Math.max(overview ? .06 : .42,Math.min(.9,laneH*yScale/78)),scale=lane?lerp(normalScale,lane.scale,duelBlend):normalScale;
   const crossed=Math.max(0,elapsed-(row.finishMs||Infinity)),bounce=enabled&&row.finished&&crossed<800?Math.sin(crossed/800*Math.PI)*5:0;
   ctx.save();runner(r,x,y-bounce,scale,elapsed,moving&&!row.finished,color,row.index,row.speed,!overview&&duelBlend<.5,row.finished?Math.max(0,elapsed-row.finishMs):-1,enabled);ctx.restore();
   if(overview&&n<=16){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-20,y-7,14,7,2);ctx.fill();ctx.fillStyle=kitInk(color);ctx.font=`700 ${laneH*yScale<9?6:7}px Rajdhani,sans-serif`;ctx.textAlign='center';ctx.fillText(String(kits.get(String(r.id)).number),x-13,y-1.5);}
   if(following?.id===row.id){ctx.strokeStyle='#f0d17baa';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y+2,24*scale,5*scale,0,0,Math.PI*2);ctx.stroke();}
   if(row.id===leader?.id&&!frame?.countdown&&u>.03&&duelBlend<.5){ctx.fillStyle='#e3c374';ctx.beginPath();ctx.moveTo(x,y-84*scale);ctx.lineTo(x-4,y-91*scale);ctx.lineTo(x+4,y-91*scale);ctx.fill();}
   if(row.finished){ctx.fillStyle='#f4e7c4';ctx.font=`700 ${overview?8:11}px Rajdhani,sans-serif`;ctx.textAlign='left';ctx.fillText(`#${row.place}`,Math.min(width-24,x+20),y-8);}
  }
  ctx.globalAlpha=1;
  // A soft lens falloff gives close shots depth; the final sprint warms
  // gradually from real race progress and is static with motion disabled.
  const lens=ctx.createLinearGradient(0,top,0,top+fieldH);lens.addColorStop(0,'#03091238');lens.addColorStop(.32,'#03091200');lens.addColorStop(.72,'#03091200');lens.addColorStop(1,'#03091244');ctx.fillStyle=lens;ctx.fillRect(0,top,trackWidth,fieldH);
  if(enabled&&u>.88&&u<1&&!frame?.countdown){const heat=Math.min(1,(u-.88)/.09),glow=ctx.createLinearGradient(trackWidth-70,0,trackWidth,0);glow.addColorStop(0,'#dbc18000');glow.addColorStop(1,`rgba(219,193,128,${heat*.13})`);ctx.fillStyle=glow;ctx.fillRect(Math.max(0,trackWidth-70),top,70,fieldH);}
  ctx.restore();
  ctx.fillStyle='#d8caa5';ctx.fillRect(0,top+fieldH,width,2);ctx.fillStyle='#7d2437';ctx.fillRect(0,top+fieldH+5,width,4);
  ctx.save();ctx.beginPath();ctx.rect(0,top+fieldH+9,trackWidth,11);ctx.clip();ctx.fillStyle='#111923';ctx.fillRect(0,top+fieldH+9,trackWidth,11);ctx.strokeStyle='#dbc18055';ctx.lineWidth=1;ctx.beginPath();for(let x=(depth.sideline%48)-48;x<trackWidth+48;x+=48){ctx.moveTo(x,top+fieldH+11);ctx.lineTo(x+8,top+fieldH+18);}ctx.stroke();ctx.restore();
  if(overview&&!compactOverview){const picks=leaders.length?leaders:rows;if(sideBattle)leadBattle(picks,top,fieldH,elapsed,moving,replay?'running':state,trackWidth+8,width-trackWidth-8);else leadBattle(picks,top+fieldH+10,height-top-fieldH-10,elapsed,moving,replay?'running':state);}
  if(enabled&&frame?.finished&&celebration>0&&celebration<4){
   const seconds=celebration;ctx.globalAlpha=Math.min(1,(4-seconds)/1.2);for(let i=0;i<42;i++){
    const x=(i*97.3+seconds*(i%2?13:-11))%width,y=(i*41.7+seconds*(18+i%7))%height;
    ctx.fillStyle=['#bd263d','#e8cf88','#f5eee1'][i%3];ctx.fillRect(x,y,2,4);
   }ctx.globalAlpha=1;
  }
 }
 return {draw,getShot:()=>shot,getShowdown:()=>showdown?{...showdown,columns:width<650}:null,updateRacers(next){racers=next;refreshKits();director.reset();redraw();},stop(){closed=true;director.reset();stopArt();resize.disconnect();for(const img of [stadium,crest,sprite,...photos.values()])if(img)img.onload=null;}};
}
