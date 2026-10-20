import {drawKitRunner,onRacerArtReady} from './racer-kit-art.js';
import {normalizeKit,footballYardNumber,kitInk} from './racer-kit-model.js';
import {runnerCadence} from './stadium-motion.js';
import {stadiumDepth,stadiumVerticalCamera} from './stadium-scene.js';
import {stadiumCelebration} from './stadium-director.js';
const palette=['#cf263b','#c8a147','#ece5d9','#36465c','#a73549','#d3b16e','#ae3b23','#4e6484','#d06238','#c16a91','#8a7c5d','#677781'];
export const stadiumColor=(racer,index)=>/^#[0-9a-f]{6}$/i.test(racer?.color||'')?racer.color:palette[index%palette.length];
const image=(src,onload)=>{const img=new Image();img.decoding='async';img.onload=onload;img.src=src;return img;};
export function createStadiumRenderer(canvas,{racers,motion=()=>true,highlight=()=>null,onLayout=(_layout)=>{}}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('The race display could not open.');
 let width=0,height=0,ratio=1,closed=false,lastFrame=null,lastOptions={},sizeDirty=true,lastLayout='',lastLeader='',leadAt=-Infinity,lastElapsed=0;
 const redraw=()=>{if(lastFrame)draw(lastFrame,lastOptions);};
 const stopArt=onRacerArtReady(redraw);
 const stadium=image(new URL('../../assets/stadium-arena/stadium.webp',import.meta.url),redraw);
 const crest=image(new URL('../../icons/dfl-logo-512.webp',import.meta.url),redraw);
 const sprite=image(new URL('../../assets/stadium-arena/runner-cycle.webp',import.meta.url),redraw);
 // A tiny reusable turf grain avoids generating noise on each animation frame.
 const grain=document.createElement('canvas');grain.width=grain.height=96;
 const grainContext=grain.getContext('2d');
 if(grainContext){let noise=0xdf1;const point=()=>{noise^=noise<<13;noise^=noise>>>17;noise^=noise<<5;return (noise>>>0)%96;};for(let i=0;i<200;i++){grainContext.fillStyle=i%2?'#f3ebd506':'#00000009';grainContext.fillRect(point(),point(),1,2);}}
 const turfGrain=ctx.createPattern(grain,'repeat');
 const kits=new Map();const refreshKits=()=>{kits.clear();racers.forEach((r,index)=>kits.set(String(r.id),normalizeKit(r.kit,{number:r.number??index+1})));};refreshKits();
 const resize=new ResizeObserver(()=>{sizeDirty=true;redraw();});resize.observe(canvas);
 const getSize=()=>{
  if(!sizeDirty)return;const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);sizeDirty=false;
 };
 function runner(r,x,y,scale,elapsed,moving,index,speed=1,finishAge=-1,celebrate=false){
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
  ctx.restore();
 }

 function draw(frame,{state='running',replay=false,celebration=0}={}){
  if(closed)return;getSize();lastFrame=frame;lastOptions={state,replay,celebration};const enabled=motion();
  const n=racers.length,top=Math.max(30,Math.min(44,height*.11)),fieldH=Math.max(24,height-top-22),laneH=Math.max(26,fieldH/n),worldH=laneH*n,trackWidth=width,overview=true;
  const layout=`${top}:${fieldH}:${width}`;if(layout!==lastLayout){lastLayout=layout;onLayout({overview:true,top,fieldHeight:fieldH,fieldWidth:width});}
  const live=state==='running'||replay,elapsed=Math.max(0,frame?.elapsed||0),u=frame?.u||0,rows=frame?.rows||racers.map((r,index)=>({id:String(r.id),index,progress:0,speed:0,finished:false}));
  const leaders=frame?.ranked||rows,leader=leaders[0],highlighted=String(highlight()??'');
  if(elapsed<lastElapsed){lastLeader='';leadAt=-Infinity;}lastElapsed=elapsed;
  if(leader?.id!==lastLeader){if(lastLeader&&live&&u>.06&&u<.94&&elapsed-leadAt>900)leadAt=elapsed;lastLeader=leader?.id||'';}
  // One fixed view includes both endzones and every lane for the whole race.
  const worldWidth=2300,padding=Math.min(24,width*.05),panX=-worldWidth*.1,span=worldWidth*1.2,pxScale=(width-padding*2)/span;
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
  ctx.fillStyle='#dfcdae';ctx.font='700 10px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText('DFL ARENA',width/2,top-12,width-32);
  ctx.save();ctx.beginPath();ctx.rect(0,top,trackWidth,fieldH+5);ctx.clip();
  const vertical=stadiumVerticalCamera({top,height:fieldH,count:n,laneHeight:laneH,zoom:1,focus:worldH/2,overview}),yScale=vertical.scale,lower=vertical.center;
  const yOf=index=>vertical.middle+((index+.5)*laneH-lower)*yScale;
  const turf=ctx.createLinearGradient(0,top,0,height);turf.addColorStop(0,'#193d32');turf.addColorStop(1,'#0d2a23');ctx.fillStyle=turf;ctx.fillRect(0,top,width,height-top);
  if(turfGrain){ctx.fillStyle=turfGrain;ctx.fillRect(0,top,width,fieldH);}
  const startX=padding-panX*pxScale,startZoneWidth=worldWidth/10*pxScale;
  if(startX>0){ctx.fillStyle='#5a2033';ctx.fillRect(startX-startZoneWidth,top,startZoneWidth,fieldH);ctx.fillStyle='#e9d6a0';ctx.save();ctx.translate(startX-startZoneWidth/2,top+fieldH/2);ctx.rotate(-Math.PI/2);ctx.font='400 19px Anton,sans-serif';ctx.textAlign='center';ctx.fillText('DFL',0,0);ctx.restore();}
  const step=worldWidth/10;
  for(let m=-1;m<12;m++){
   const x=padding+(m*step-panX)*pxScale,next=padding+((m+1)*step-panX)*pxScale;
   if(x>width||next<0)continue;ctx.fillStyle=m%2?'#ffffff05':'#0000000b';ctx.fillRect(x,top,next-x,fieldH);
   ctx.strokeStyle='#e6e8da36';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+fieldH);ctx.stroke();
   const number=footballYardNumber(m);if(number){ctx.fillStyle='#edeaddbb';ctx.font=`700 ${pxScale<.1?8:pxScale<.4?11:16}px Rajdhani,sans-serif`;ctx.textAlign='center';ctx.fillText(number,x,top+18);ctx.fillText(number,x,top+fieldH-8);ctx.globalAlpha=1;}
  }
  for(let m=1;m<20;m++){const x=padding+(m*worldWidth/20-panX)*pxScale;if(x<0||x>width)continue;ctx.strokeStyle='#edeadd66';ctx.lineWidth=1;for(const y of [top+fieldH*.26,top+fieldH*.74]){ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+3,y);ctx.stroke();}}
  if(crest.complete&&crest.naturalWidth){const x=padding+(worldWidth/2-panX)*pxScale,y=top+fieldH/2+(worldH/2-lower)*yScale,size=Math.min(100,worldWidth*.15*pxScale);ctx.globalAlpha=.16;ctx.drawImage(crest,x-size/2,y-size/2,size,size);ctx.globalAlpha=1;}
  for(let index=0;index<n;index++){
   const y=yOf(index);ctx.strokeStyle='#e5e7dc13';ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(0,y+laneH*yScale/2);ctx.lineTo(width,y+laneH*yScale/2);ctx.stroke();ctx.setLineDash([]);
  }
  ctx.globalAlpha=1;
  const finishX=padding+(worldWidth-panX)*pxScale;
  const endWidth=worldWidth/10*pxScale;if(finishX<width){ctx.fillStyle='#78243c';ctx.fillRect(finishX,top,endWidth,fieldH);ctx.fillStyle='#fff1d9';ctx.save();ctx.translate(finishX+Math.min(endWidth/2,44),top+fieldH/2);ctx.rotate(-Math.PI/2);ctx.font=`400 ${Math.min(22,Math.max(9,fieldH/7.5))}px Anton,sans-serif`;ctx.textAlign='center';ctx.fillText('TOUCHDOWN',0,0);ctx.restore();}
  if(finishX>0&&finishX<width+15){
   ctx.fillStyle='#ecdec5';ctx.fillRect(finishX-2,top,4,fieldH);for(let y=top;y<top+fieldH;y+=10){ctx.fillStyle=(Math.floor((y-top)/10)%2)?'#d5ae56':'#521527';ctx.fillRect(finishX+2,y,6,10);}
   ctx.fillStyle='#fff4d5';ctx.font='700 10px Rajdhani,sans-serif';ctx.textAlign='center';ctx.fillText('GOAL LINE',finishX,top+30);
  }
  const moving=enabled&&live&&!frame?.countdown&&!frame?.finished;
  for(const row of rows){
   const r=racers[row.index],y=yOf(row.index)+laneH*yScale*.35,x=padding+(row.progress*worldWidth-panX)*pxScale,color=stadiumColor(r,row.index),scale=Math.max(.06,Math.min(.9,laneH*yScale/78));
   if(row.id===highlighted){ctx.fillStyle=color+'18';ctx.fillRect(0,yOf(row.index)-laneH*yScale/2,width,laneH*yScale);}
   if(enabled&&row.id===leader?.id&&elapsed-leadAt<700){ctx.fillStyle=`rgba(235,211,151,${Math.max(0,1-(elapsed-leadAt)/700)*.15})`;ctx.fillRect(0,yOf(row.index)-laneH*yScale/2,width,laneH*yScale);}
   // Screen-space turf kicks stay visible in a wide phone view, without speed lines.
   if(moving&&row.speed>1.12&&laneH*yScale>=8){for(let i=0;i<3;i++){const age=((elapsed/420+row.index*.31+i/3)%1);ctx.globalAlpha=(1-age)*.32;ctx.fillStyle=i%2?'#dbc180':'#9ba88a';ctx.beginPath();ctx.ellipse(x-3-age*9,y-age*2,1+age,Math.max(.5,age),0,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
   const crossed=Math.max(0,elapsed-(row.finishMs||Infinity)),bounce=enabled&&row.finished&&crossed<800?Math.sin(crossed/800*Math.PI)*5:0;
   ctx.save();runner(r,x,y-bounce,scale,elapsed,moving&&!row.finished,row.index,row.speed,row.finished?Math.max(0,elapsed-row.finishMs):-1,enabled);ctx.restore();
   if(overview&&n<=16){const badgeH=laneH*yScale>=10?9:7,badgeW=badgeH===9?18:14;ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x-badgeW-5,y-badgeH,badgeW,badgeH,2);ctx.fill();ctx.fillStyle=kitInk(color);ctx.font=`700 ${badgeH===9?8:6}px Rajdhani,sans-serif`;ctx.textAlign='center';ctx.fillText(String(kits.get(String(r.id)).number),x-badgeW/2-5,y-1.5);}
   if(row.id===highlighted){ctx.strokeStyle='#f0d17baa';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,y+2,24*scale,5*scale,0,0,Math.PI*2);ctx.stroke();}
   if(row.id===leader?.id&&!frame?.countdown&&u>.03){ctx.fillStyle='#e3c374';ctx.beginPath();ctx.moveTo(x,y-84*scale);ctx.lineTo(x-4,y-91*scale);ctx.lineTo(x+4,y-91*scale);ctx.fill();}
   if(row.finished&&laneH*yScale>=9){ctx.fillStyle='#f4e7c4';ctx.font='700 8px Rajdhani,sans-serif';ctx.textAlign='right';ctx.fillText(String(row.place),width-3,yOf(row.index)+3);}
  }
  ctx.globalAlpha=1;
  // The field keeps its lens falloff; the final sprint warms
  // gradually from real race progress and is static with motion disabled.
  const lens=ctx.createLinearGradient(0,top,0,top+fieldH);lens.addColorStop(0,'#03091238');lens.addColorStop(.32,'#03091200');lens.addColorStop(.72,'#03091200');lens.addColorStop(1,'#03091244');ctx.fillStyle=lens;ctx.fillRect(0,top,trackWidth,fieldH);
  if(enabled&&u>.88&&u<1&&!frame?.countdown){const heat=Math.min(1,(u-.88)/.09),glow=ctx.createLinearGradient(trackWidth-70,0,trackWidth,0);glow.addColorStop(0,'#dbc18000');glow.addColorStop(1,`rgba(219,193,128,${heat*.13})`);ctx.fillStyle=glow;ctx.fillRect(Math.max(0,trackWidth-70),top,70,fieldH);}
  ctx.restore();
  ctx.fillStyle='#d8caa5';ctx.fillRect(0,top+fieldH,width,2);ctx.fillStyle='#7d2437';ctx.fillRect(0,top+fieldH+5,width,4);
  ctx.save();ctx.beginPath();ctx.rect(0,top+fieldH+9,trackWidth,11);ctx.clip();ctx.fillStyle='#111923';ctx.fillRect(0,top+fieldH+9,trackWidth,11);ctx.strokeStyle='#dbc18055';ctx.lineWidth=1;ctx.beginPath();for(let x=(depth.sideline%48)-48;x<trackWidth+48;x+=48){ctx.moveTo(x,top+fieldH+11);ctx.lineTo(x+8,top+fieldH+18);}ctx.stroke();ctx.restore();
  if(enabled&&frame?.finished&&celebration>0&&celebration<4){
   const seconds=celebration;ctx.globalAlpha=Math.min(1,(4-seconds)/1.2);for(let i=0;i<42;i++){
    const x=(i*97.3+seconds*(i%2?13:-11))%width,y=(i*41.7+seconds*(18+i%7))%height;
    ctx.fillStyle=['#bd263d','#e8cf88','#f5eee1'][i%3];ctx.fillRect(x,y,2,4);
   }ctx.globalAlpha=1;
  }
 }
 return {draw,updateRacers(next){racers=next;refreshKits();redraw();},stop(){closed=true;stopArt();resize.disconnect();for(const img of [stadium,crest,sprite])if(img)img.onload=null;}};
}
