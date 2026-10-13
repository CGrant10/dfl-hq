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

export function createStadiumRenderer(canvas,{racers,motion=()=>true}={}){
 const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw Error('The race display could not open.');
 let width=0,height=0,ratio=1,closed=false,lastFrame=null,lastOptions={},lastTime=0,panX=0,panY=0,zoom=1,lastRun='',sizeDirty=true;
 const redraw=()=>{if(lastFrame)draw(lastFrame,lastOptions);};
 const stadium=image(new URL('../../assets/stadium-arena/stadium.webp',import.meta.url),redraw);
 const sprite=image(new URL('../../assets/stadium-arena/runner-cycle.webp',import.meta.url),redraw);
 const photos=new Map(racers.map(r=>{const url=safePhoto(r.photo);return [String(r.id),url?image(url,redraw):null];}));
 const resize=new ResizeObserver(()=>{sizeDirty=true;redraw();});resize.observe(canvas);
 const getSize=()=>{
  if(!sizeDirty)return;const box=canvas.getBoundingClientRect();width=Math.max(1,box.width);height=Math.max(1,box.height);ratio=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);sizeDirty=false;
 };
 function runner(r,x,y,scale,elapsed,moving,color,index){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  const stride=moving?Math.floor(elapsed/90+index)%6:1;
  ctx.fillStyle='#0007';ctx.beginPath();ctx.ellipse(-2,0,18,3.5,0,0,Math.PI*2);ctx.fill();
  if(sprite.complete&&sprite.naturalWidth){
   const cell=sprite.naturalWidth/6;ctx.drawImage(sprite,cell*stride,0,cell,sprite.naturalHeight,-22,-60,48,66);
  }else{
   const swing=moving?Math.sin(elapsed/95+index)*9:0;
   ctx.strokeStyle='#ece5d9';ctx.lineWidth=5;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-23);ctx.lineTo(-7+swing,-10);ctx.lineTo(-11+swing,0);ctx.moveTo(0,-23);ctx.lineTo(7-swing,-10);ctx.lineTo(11-swing,0);ctx.stroke();
   ctx.fillStyle='#b7243a';ctx.fillRect(-8,-43,16,23);ctx.fillStyle='#2a303b';ctx.beginPath();ctx.arc(2,-51,9,0,Math.PI*2);ctx.fill();
  }
  // Identity badge stays separate from the shared jersey animation.
  ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(-20,-76,40,18,5);ctx.fill();ctx.fillStyle='#10141b';ctx.font='700 11px Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText(String(r.number||index+1),0,-63);
  const photo=photos.get(String(r.id));ctx.save();ctx.beginPath();ctx.arc(-28,-66,10,0,Math.PI*2);ctx.clip();
  if(photo?.complete&&photo.naturalWidth)ctx.drawImage(photo,-38,-76,20,20);
  else {ctx.fillStyle='#1a202b';ctx.fillRect(-38,-76,20,20);ctx.fillStyle='#fff';ctx.font='700 8px sans-serif';ctx.fillText(initial(r.name),-28,-63);}
  ctx.restore();ctx.restore();
 }
 function draw(frame,{state='running',runId='',now=performance.now(),replay=false,celebration=0}={}){
  if(closed)return;getSize();lastFrame=frame;lastOptions={state,runId,now,replay,celebration};const enabled=motion(),dt=Math.min(.08,Math.max(.001,(now-lastTime)/1000));lastTime=now;
  const n=racers.length,top=Math.max(94,Math.min(128,height*.27)),fieldH=height-top-22,laneH=Math.max(26,fieldH/n),worldH=laneH*n;
  const live=state==='running'||replay,elapsed=Math.max(0,frame?.elapsed||0),u=frame?.u||0,rows=frame?.rows||racers.map((r,index)=>({id:String(r.id),index,progress:0,speed:0,finished:false}));
  const leaders=frame?.ranked||rows,leader=leaders[0];
  const battle=enabled&&live&&u>.13&&u<.90&&Math.floor(elapsed/6500)%3!==0;
  const targetZoom=battle&&n>6?Math.min(6.4,n/5):1,focusY=battle?(leader?.index||0)*laneH+laneH/2:worldH/2;
  const worldWidth=2300,padding=62;
  const {span,start:targetX}=stadiumTrackWindow(rows,u,worldWidth);
  const pxScale=(width-padding*2)/Math.max(200,span);
  if(!enabled||lastRun!==runId||state==='idle'||state==='paused'||state==='finished'){panX=targetX;panY=focusY;zoom=targetZoom;lastRun=runId;}
  else {const ease=1-Math.exp(-dt*3.3);panX=lerp(panX,targetX,ease);panY=lerp(panY,focusY,ease);zoom=lerp(zoom,targetZoom,ease);}
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle='#080d15';ctx.fillRect(0,0,width,height);
  if(stadium.complete&&stadium.naturalWidth)ctx.drawImage(stadium,0,0,stadium.naturalWidth,stadium.naturalHeight*.65,0,0,width,top);
  else {const gradient=ctx.createLinearGradient(0,0,0,top);gradient.addColorStop(0,'#07111f');gradient.addColorStop(1,'#351625');ctx.fillStyle=gradient;ctx.fillRect(0,0,width,top);}
  const shade=ctx.createLinearGradient(0,top-28,0,top+10);shade.addColorStop(0,'#09101b00');shade.addColorStop(1,'#0b1821');ctx.fillStyle=shade;ctx.fillRect(0,top-28,width,38);
  ctx.fillStyle='#dfcdae';ctx.font='700 22px Anton, Rajdhani, sans-serif';ctx.textAlign='center';ctx.fillText('DFL STADIUM',width/2,top-36);
  ctx.fillStyle='#faf7ef';ctx.font='700 11px Rajdhani, sans-serif';ctx.fillText(battle?'BATTLE CAM':u>.90?'THE FINAL SPRINT':'THE LEAGUE’S STARTING LINE',width/2,top-16);
  ctx.save();ctx.beginPath();ctx.rect(0,top,width,fieldH+5);ctx.clip();
  const baseScale=fieldH/worldH,yScale=baseScale*zoom,lower=Math.max(worldH/2/zoom,Math.min(worldH-worldH/2/zoom,panY));
  const yOf=index=>top+fieldH/2+((index+.5)*laneH-lower)*yScale;
  const turf=ctx.createLinearGradient(0,top,0,height);turf.addColorStop(0,'#193d32');turf.addColorStop(1,'#0d2a23');ctx.fillStyle=turf;ctx.fillRect(0,top,width,height-top);
  const step=worldWidth/10;
  for(let m=-1;m<12;m++){
   const x=padding+(m*step-panX)*pxScale,next=padding+((m+1)*step-panX)*pxScale;
   if(x>width||next<0)continue;ctx.fillStyle=m%2?'#ffffff05':'#0000000b';ctx.fillRect(x,top,next-x,fieldH);
   ctx.strokeStyle='#e6e8da36';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,top);ctx.lineTo(x,top+fieldH);ctx.stroke();
   if(m>=0&&m<=10){ctx.fillStyle='#e6e8da70';ctx.font='700 10px Rajdhani,sans-serif';ctx.textAlign='center';ctx.fillText(String(m*10),x,top+13);}
  }
  for(let index=0;index<n;index++){
   const y=yOf(index);ctx.strokeStyle='#e5e7dc13';ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(0,y+laneH*yScale/2);ctx.lineTo(width,y+laneH*yScale/2);ctx.stroke();ctx.setLineDash([]);
  }
  const finishX=padding+(worldWidth-panX)*pxScale;
  if(finishX>0&&finishX<width+15){
   ctx.fillStyle='#ecdec5';ctx.fillRect(finishX-2,top,4,fieldH);for(let y=top;y<top+fieldH;y+=10){ctx.fillStyle=(Math.floor((y-top)/10)%2)?'#d5ae56':'#521527';ctx.fillRect(finishX+2,y,6,10);}
   ctx.fillStyle='#fff4d5';ctx.font='700 10px Rajdhani,sans-serif';ctx.textAlign='center';ctx.fillText('FINISH',finishX,top+24);
  }
  const moving=enabled&&live&&!frame?.countdown&&!frame?.finished;
  for(const row of rows){
   const r=racers[row.index],y=yOf(row.index)+laneH*yScale*.35;if(y<top-30||y>top+fieldH+65)continue;
   const x=padding+(row.progress*worldWidth-panX)*pxScale,color=stadiumColor(r,row.index),scale=Math.max(.42,Math.min(.9,laneH*yScale/78));
   if(enabled&&moving&&row.speed>1.15){ctx.strokeStyle=color+'99';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-20,y-22*scale);ctx.lineTo(x-42,y-22*scale);ctx.stroke();}
   runner(r,x,y,scale,elapsed,moving,color,row.index);
   if(row.id===leader?.id&&!frame?.countdown&&u>.03){ctx.fillStyle='#e3c374';ctx.beginPath();ctx.moveTo(x,y-84*scale);ctx.lineTo(x-4,y-91*scale);ctx.lineTo(x+4,y-91*scale);ctx.fill();}
   if(row.finished){ctx.fillStyle='#f4e7c4';ctx.font='700 11px Rajdhani,sans-serif';ctx.textAlign='left';ctx.fillText(`#${row.place}`,Math.min(width-24,x+20),y-8);}
  }
  ctx.restore();
  ctx.fillStyle='#d8caa5';ctx.fillRect(0,top+fieldH,width,2);ctx.fillStyle='#7d2437';ctx.fillRect(0,top+fieldH+5,width,4);
  if(enabled&&frame?.finished&&celebration>0&&celebration<4){
   const seconds=celebration;ctx.globalAlpha=Math.min(1,(4-seconds)/1.2);for(let i=0;i<42;i++){
    const x=(i*97.3+seconds*(i%2?13:-11))%width,y=(i*41.7+seconds*(18+i%7))%height;
    ctx.fillStyle=['#bd263d','#e8cf88','#f5eee1'][i%3];ctx.fillRect(x,y,2,4);
   }ctx.globalAlpha=1;
  }
 }
 return {draw,stop(){closed=true;resize.disconnect();for(const img of [stadium,sprite,...photos.values()])if(img)img.onload=null;}};
}
