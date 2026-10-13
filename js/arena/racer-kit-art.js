import {normalizeKit,kitSymbol,kitInk} from './racer-kit-model.js';
const cache=new Map(),listeners=new Set();let source=null,loading=null;
const logos=new Map();
function kitLogo(kit){if(!kit.preset.startsWith('nfl:'))return null;const code=kit.preset.slice(4);if(logos.has(code))return logos.get(code);const img=new Image();img.decoding='async';img.onload=()=>{for(const fn of listeners)fn();};img.src=`https://a.espncdn.com/i/teamlogos/nfl/500/${code==='WAS'?'wsh':code.toLowerCase()}.png`;logos.set(code,img);return img;}
const rgb=value=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16));
// Pack complete alpha-connected poses, rather than assuming illustration gutters are exact.
export function racerSpriteComponents(data,width,height,count=6){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),components=[];
 for(let p=0;p<seen.length;p++){
  if(seen[p]||data[p*4+3]<20)continue;let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;queue[0]=p;seen[p]=1;const points=[];
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);points.push(at);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(const next of [x?at-1:-1,x<width-1?at+1:-1,y?at-width:-1,y<height-1?at+width:-1])if(next>=0&&!seen[next]&&data[next*4+3]>=20){seen[next]=1;queue[tail++]=next;}
  }
  if(points.length>20)components.push({points,minX,minY,width:maxX-minX+1,height:maxY-minY+1});
 }
 return components.sort((a,b)=>b.points.length-a.points.length).slice(0,count).sort((a,b)=>a.minX-b.minX);
}
export function racerMaterial(r,g,b,y=1){
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min,sat=max?delta/max:0;
 if(max<26||sat<.23)return max>175&&y>.24?5:0;
 let hue=delta===0?0:max===r?(g-b)/delta:max===g?2+(b-r)/delta:4+(r-g)/delta;hue=((hue*60)%360+360)%360;
 return hue>=270&&hue<=335?1:hue>=80&&hue<160?2:hue>=160&&hue<255?3:hue>=35&&hue<80?4:6;
}
export function loadRacerArt(){
 if(loading)return loading;
 loading=new Promise(resolve=>{const img=new Image();img.decoding='async';img.onload=()=>{
  const raw=document.createElement('canvas');raw.width=1536;raw.height=512;const rawCtx=raw.getContext('2d',{willReadFrequently:true});rawCtx.drawImage(img,0,0,1536,512);const rgba=rawCtx.getImageData(0,0,1536,512),poses=racerSpriteComponents(rgba.data,1536,512);
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(poses.length!==6){resolve(false);return;}
  const sx=112/Math.max(...poses.map(p=>p.width)),sy=214/Math.max(...poses.map(p=>p.height));
  poses.forEach((pose,index)=>{const cut=document.createElement('canvas');cut.width=pose.width;cut.height=pose.height;const c=cut.getContext('2d'),pixels=c.createImageData(cut.width,cut.height);
   for(const point of pose.points){const from=point*4,to=((Math.floor(point/1536)-pose.minY)*cut.width+(point%1536)-pose.minX)*4;pixels.data.set(rgba.data.subarray(from,from+4),to);}c.putImageData(pixels,0,0);const w=pose.width*sx,h=pose.height*sy;ctx.drawImage(cut,index*128+64-w/2,240-h,w,h);});
  const pixels=ctx.getImageData(0,0,768,256),materials=new Uint8Array(768*256),frames=Array.from({length:6},()=>({helmet:{x:0,y:0,n:0},jersey:{x:0,y:0,n:0}}));
  for(let p=0;p<materials.length;p++){const i=p*4,y=Math.floor(p/768)/256,x=p%768;if(!pixels.data[i+3])continue;const material=racerMaterial(pixels.data[i],pixels.data[i+1],pixels.data[i+2],y);materials[p]=material;
   if(material===2||material===3){const point=frames[Math.floor(x/128)][material===2?'helmet':'jersey'];point.x+=(x%128)/128;point.y+=y;point.n++;}}
  for(const f of frames)for(const point of Object.values(f)){point.x=point.n?point.x/point.n:.6;point.y=point.n?point.y/point.n:.25;}
  source={pixels,materials,frames};for(const fn of listeners)fn();resolve(true);
 };img.onerror=()=>{loading=null;resolve(false);};img.src=new URL('../../assets/stadium-arena/runner-custom.webp',import.meta.url).href;});return loading;
}
export function onRacerArtReady(fn){listeners.add(fn);void loadRacerArt();return()=>listeners.delete(fn);}
export function racerArt(value){
 return artForKit(normalizeKit(value));
}
function artForKit(kit){
 if(!source)return null;const key=[kit.skin,kit.helmet,kit.jersey,kit.pants,kit.trim].join('|');
 if(cache.has(key)){const entry=cache.get(key);cache.delete(key);cache.set(key,entry);return entry;}
 const canvas=document.createElement('canvas');canvas.width=768;canvas.height=256;const ctx=canvas.getContext('2d'),data=new ImageData(new Uint8ClampedArray(source.pixels.data),768,256),colors=[null,...['skin','helmet','jersey','pants','trim'].map(k=>rgb(kit[k]))];
 for(let p=0;p<source.materials.length;p++){const m=source.materials[p];if(!m)continue;const i=p*4,v=Math.max(data.data[i],data.data[i+1],data.data[i+2])/255;
  if(m===6){const dark=Math.round(v*36);data.data[i]=dark;data.data[i+1]=dark;data.data[i+2]=dark;continue;}
  const shade=.12+.88*v;for(let c=0;c<3;c++)data.data[i+c]=Math.round(colors[m][c]*shade);
 }
 ctx.putImageData(data,0,0);const art={canvas,frames:source.frames,ink:kitInk(kit.jersey,kit.trim)};cache.set(key,art);if(cache.size>40)cache.delete(cache.keys().next().value);return art;
}
export function drawKitSymbol(ctx,symbol,x,y,size,color){
 ctx.save();ctx.translate(x,y);ctx.scale(size/10,size/10);ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.lineJoin='round';
 if(symbol==='bolt'){ctx.beginPath();ctx.moveTo(1,-5);ctx.lineTo(-4,1);ctx.lineTo(0,1);ctx.lineTo(-1,5);ctx.lineTo(4,-1);ctx.lineTo(1,-1);ctx.closePath();ctx.fill();}
 else if(symbol==='wave'||symbol==='spiral'){ctx.beginPath();if(symbol==='wave'){ctx.moveTo(-5,2);ctx.bezierCurveTo(-3,-4,1,-4,2,0);ctx.bezierCurveTo(5,-1,5,3,3,3);}else{for(let i=0;i<28;i++){const a=i*.34,r=i*.15;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(0,0);}}ctx.stroke();}
 else if(symbol==='blade'){ctx.rotate(-.6);ctx.fillRect(-1,-5,2,10);ctx.fillRect(-4,1,8,1.5);}
 else if(symbol==='check'){for(let i=0;i<4;i++)if(i%3===0)ctx.fillRect((i%2)*5-5,Math.floor(i/2)*5-5,5,5);}
 else if(symbol==='ghost'){ctx.beginPath();ctx.arc(0,-1,4,Math.PI,0);ctx.lineTo(4,5);ctx.lineTo(1,3);ctx.lineTo(-1,5);ctx.lineTo(-4,3);ctx.closePath();ctx.fill();}
 else if(symbol==='flame'||symbol==='dragon'){ctx.beginPath();ctx.moveTo(0,-5);ctx.bezierCurveTo(0,0,5,0,3,4);ctx.bezierCurveTo(0,7,-5,2,-2,-1);ctx.bezierCurveTo(-2,2,0,0,0,-5);ctx.fill();}
 else{ctx.beginPath();for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,r=i%2?2:5;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.closePath();ctx.fill();}ctx.restore();
}
export function drawKitRunner(ctx,value,{x=0,y=0,width=48,height=66,stride=1}={}){
 const kit=normalizeKit(value),art=artForKit(kit);if(!art)return false;const frame=Math.max(0,Math.min(5,stride)),points=art.frames[frame];
 ctx.drawImage(art.canvas,frame*128,0,128,256,x,y,width,height);
 const body={x:x+points.jersey.x*width,y:y+points.jersey.y*height},head={x:x+points.helmet.x*width,y:y+points.helmet.y*height};
 ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=art.ink;ctx.strokeStyle='#07101c88';ctx.lineWidth=width*.025;ctx.font=`800 ${Math.max(5,width*.18)}px Rajdhani,sans-serif`;ctx.strokeText(String(kit.number),body.x,body.y);ctx.fillText(String(kit.number),body.x,body.y);
 const symbol=kitSymbol(kit);if(symbol!=='dfl'&&symbol!=='team')drawKitSymbol(ctx,symbol,body.x-width*.14,body.y-height*.11,width*.10,kit.trim);
 const logo=kitLogo(kit);if(logo?.complete&&logo.naturalWidth)ctx.drawImage(logo,head.x-width*.09,head.y-height*.045,width*.11,width*.11);
 if(kit.helmetStyle==='speed'){ctx.strokeStyle=kit.trim;ctx.lineWidth=width*.025;ctx.beginPath();ctx.moveTo(head.x-width*.12,head.y-height*.035);ctx.quadraticCurveTo(head.x-width*.10,head.y-height*.1,head.x+width*.015,head.y-height*.10);ctx.stroke();}
 if(kit.helmetStyle==='visor'){ctx.fillStyle='#061423e6';ctx.beginPath();ctx.roundRect(head.x+width*.035,head.y-height*.015,width*.125,height*.04,width*.014);ctx.fill();ctx.strokeStyle=kit.trim+'aa';ctx.lineWidth=width*.012;ctx.beginPath();ctx.moveTo(head.x+width*.06,head.y-height*.01);ctx.lineTo(head.x+width*.13,head.y-height*.01);ctx.stroke();}
 ctx.restore();return true;
}
