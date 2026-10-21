import {normalizeKit,kitInk,kitSymbol} from './racer-kit-model.js';
import {racerCharacter,characterPose} from './racer-character.js';

// 24 genuinely different articulated poses; one bounded atlas per visible kit.
// Field poses are painted on first use, then composited. Large previews retain
// vector detail. No remote image, texture decode or per-frame pixel reads.
const frames=33,runFrames=24,celebrationFrames=8,idleFrame=32,cellW=112,cellH=122,cache=new Map(),limit=32;
const shade=(hex,amount)=>'#'+[1,3,5].map(i=>Math.max(0,Math.min(255,Math.round(parseInt(hex.slice(i,i+2),16)+amount))).toString(16).padStart(2,'0')).join('');
const material=(ctx,color,x,y,h)=>{const g=ctx.createLinearGradient(x,y,x+12,y+h);g.addColorStop(0,shade(color,35));g.addColorStop(.38,color);g.addColorStop(1,shade(color,-32));return g;};
function shape(ctx,points,fill,stroke='#0a111c',line=2){ctx.beginPath();for(let i=0;i<points.length;i++){const p=points[i];if(i===0)ctx.moveTo(...p);else if(p.length===6)ctx.bezierCurveTo(...p);else if(p.length===4)ctx.quadraticCurveTo(...p);else ctx.lineTo(...p);}ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(line){ctx.strokeStyle=stroke;ctx.lineWidth=line;ctx.stroke();}}
function capsule(ctx,ax,ay,bx,by,width,color){ctx.lineCap='round';ctx.lineWidth=width+3;ctx.strokeStyle='#0a111c';ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.lineWidth=width;ctx.strokeStyle=color;ctx.stroke();ctx.lineWidth=Math.max(1,width*.18);ctx.strokeStyle='#ffffff26';ctx.beginPath();ctx.moveTo(ax-1,ay-1);ctx.lineTo(bx-1,by-1);ctx.stroke();}
function paint(ctx,kit,character,cycle,moving=true,celebrate=false){
 const p=characterPose(character,cycle,moving),b=character,skin=material(ctx,kit.skin,0,30,50),jersey=material(ctx,kit.jersey,0,32,40),pants=material(ctx,kit.pants,0,65,35),ink=kitInk(kit.jersey,kit.trim);
 if(celebrate){const wave=Math.sin(cycle*Math.PI*2);p.frontArm=-2.4+wave*.22;p.backArm=2.3-wave*.3;p.frontHip=wave*.12;p.backHip=-wave*.12;p.frontKnee=.15;p.backKnee=.25;p.bob=Math.abs(wave)*character.bounce;}
 ctx.save();ctx.lineJoin='round';ctx.translate(53,5);
 // Articulated far limbs, then torso, then near limbs establish body depth.
 function leg(hip,knee,far=false){ctx.save();ctx.translate(far?-5:5,72-p.bob);ctx.rotate(hip);capsule(ctx,0,0,0,16,b.limb+3,far?shade(kit.pants,-20):pants);ctx.translate(0,16);ctx.rotate(knee);capsule(ctx,0,0,0,15,b.limb-1,skin);capsule(ctx,0,9,0,18,b.limb,'#ede5d5');ctx.translate(0,18);ctx.rotate(-hip-knee*.6);shape(ctx,[[-5,-2],[3,-3],[10,0],[11,4],[-6,4]],far?'#111a26':kit.helmet,undefined,1.5);ctx.strokeStyle=kit.trim;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3,3);ctx.lineTo(8,3);ctx.stroke();ctx.restore();}
 function arm(angle,far=false){ctx.save();ctx.translate(far?-12:12,44-p.bob);ctx.rotate(angle+(far?.28:-.22));const sleeve=b.accessory===3||b.index===1&&!far;capsule(ctx,0,0,-5,14,b.limb,sleeve?kit.jersey:skin);ctx.translate(-5,14);ctx.rotate(-1.2);capsule(ctx,0,0,0,12,b.limb-1,sleeve?kit.helmet:skin);capsule(ctx,0,9,0,14,b.limb,kit.trim);ctx.restore();}
 leg(p.backHip,p.backKnee,true);arm(p.backArm,true);
 ctx.save();ctx.translate(0,-p.bob);ctx.translate(0,70);ctx.rotate(p.lean);ctx.translate(0,-70);
 if(b.accessory===0){shape(ctx,[[-b.waist,67],[-b.waist-9,72+p.towel/2],[-b.waist-15,85+p.towel],[-b.waist-3,80]],kit.trim,undefined,1);}
 shape(ctx,[[-b.waist-1,65],[b.waist+3,65],[b.waist+3,77],[0,80],[-b.waist-3,77]],pants);
 shape(ctx,[[-b.shoulders,39],[-10,34],[13,34],[b.shoulders+3,42],[b.waist+2,66],[-b.waist,66]],jersey);
 // Shoulder pads, collar and contrasting uniform patterns remain legible small.
 shape(ctx,[[-b.shoulders,40],[-b.shoulders+3,49],[-b.shoulders+10,47],[-b.shoulders+9,38]],kit.trim,undefined,1);
 shape(ctx,[[b.shoulders-7,38],[b.shoulders+3,43],[b.shoulders,51],[b.shoulders-8,47]],kit.trim,undefined,1);
 ctx.strokeStyle=shade(kit.jersey,-55);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-5,37);ctx.quadraticCurveTo(3,44,10,37);ctx.stroke();
 if(b.pattern===1){ctx.fillStyle=kit.trim;ctx.fillRect(-b.waist,61,b.waist*2,3);}else if(b.pattern===2){shape(ctx,[[-b.waist,50],[-b.waist+4,52],[-b.waist+3,66],[-b.waist,66]],kit.trim,undefined,0);}
 ctx.font='900 19px Rajdhani, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;ctx.fillText(String(kit.number),2,53);
 if(b.accessory===1){ctx.fillStyle=kit.trim;ctx.fillRect(-b.waist-2,64,6,13);ctx.fillStyle=shade(kit.trim,-35);ctx.fillRect(-b.waist-2,74,6,2);}
 // Oversized helmet: separate shell, face, cage/visor, rim light and decals.
 ctx.save();ctx.translate(4,22);const h=b.helmet;
 if(kit.preset==='pokemon:pikachu'){shape(ctx,[[-11,-7],[-19,-20],[-11,-18],[-3,-7]],kit.trim);shape(ctx,[[2,-9],[5,-21],[10,-19],[10,-7]],kit.trim);}
 if(['pokemon:charizard','pokemon:rayquaza','pokemon:lucario'].includes(kit.preset)){shape(ctx,[[-12,-6],[-20,-18],[-7,-13]],kit.trim);shape(ctx,[[3,-11],[9,-20],[12,-8]],kit.trim);}
 if(kit.preset.startsWith('anime:')){shape(ctx,[[-13,0],[-28,-5+p.towel],[-23,2+p.towel/2],[-31,8+p.towel],[-12,6]],kit.trim,undefined,1);}
 ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(8,6,10,13,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#0a111c';ctx.lineWidth=2;ctx.stroke();
 const shell=material(ctx,kit.helmet,-h,-h,h*2);shape(ctx,[[-h,7],[-h-3,-7,-h+4,-h,0,-h],[h+1,-h,h+5,-8,h+3,3],[h-3,5],[7,3],[5,12],[-4,13],[-h,7]],shell);
 ctx.strokeStyle=kit.trim;ctx.lineWidth=kit.helmetStyle==='speed'?4:2.5;ctx.beginPath();ctx.moveTo(-h+5,-h+4);ctx.quadraticCurveTo(0,-h-1,h-1,-8);ctx.stroke();
 if(b.index===0&&kit.helmetStyle==='speed'){shape(ctx,[[-9,-h+3],[-5,-h-3],[5,-h-2],[12,-h+6]],kit.trim,undefined,1);}
 ctx.strokeStyle='#ffffff70';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(-h+3,-2);ctx.quadraticCurveTo(-h+1,-h+7,-4,-h+3);ctx.stroke();
 ctx.fillStyle=shade(kit.helmet,-28);ctx.beginPath();ctx.arc(-4,5,5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#ffffff38';ctx.lineWidth=1;ctx.stroke();
 if(kit.helmetStyle==='visor'){shape(ctx,[[8,1],[h+5,0],[h+4,8],[8,9]],'#101d30',kit.trim,1);ctx.strokeStyle='#b5e7ed';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(11,3);ctx.lineTo(h+2,2);ctx.stroke();}
 else{ctx.strokeStyle=kit.trim;ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(9,3);ctx.lineTo(h+7,4);ctx.lineTo(h+4,15);ctx.lineTo(9,15);ctx.moveTo(12,8);ctx.lineTo(h+6,9);ctx.stroke();}
 const symbol=kitSymbol(kit);ctx.fillStyle=kit.trim;ctx.strokeStyle=kit.trim;ctx.lineWidth=2;
 if(symbol==='bolt'){shape(ctx,[[-7,-9],[-13,0],[-7,-1],[-10,6],[-1,-4],[-7,-3]],kit.trim,undefined,0);}
 else if(symbol==='flame'||symbol==='dragon'){shape(ctx,[[-8,-10],[-8,-1,-1,-4,-4,3],[-8,10,-16,1,-10,-3],[-10,0,-8,-2,-8,-10]],kit.trim,undefined,0);}
 else if(symbol==='ghost'){ctx.beginPath();ctx.arc(-8,-2,5,Math.PI,0);ctx.lineTo(-3,6);ctx.lineTo(-7,3);ctx.lineTo(-10,6);ctx.lineTo(-13,4);ctx.fill();}
 else if(symbol!=='dfl'&&symbol!=='team'){ctx.beginPath();ctx.arc(-8,-2,4,0,Math.PI*2);ctx.stroke();ctx.fillRect(-9,-7,2,10);}
 else{ctx.font='900 10px Rajdhani,sans-serif';ctx.textAlign='center';ctx.fillText(kit.preset.startsWith('nfl:')?kit.preset.slice(4):'D',-8,-2);}
 if(b.accessory===2){ctx.fillStyle=kit.trim;ctx.beginPath();ctx.roundRect(-15,10,9,3,1);ctx.fill();}
 ctx.restore();ctx.restore();arm(p.frontArm);
 leg(p.frontHip,p.frontKnee);
 // The showboat has high socks, the powerhouse wrist tape, the speedster a sash.
 if(b.index===0){ctx.save();ctx.translate(0,-p.bob);ctx.strokeStyle=kit.trim;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,41);ctx.lineTo(10,59);ctx.stroke();ctx.restore();}
 ctx.restore();
}
function atlas(kit,character,frame){
 const key=JSON.stringify([kit,character.index,character.accessory,character.pattern]);let entry=cache.get(key);
 if(entry){cache.delete(key);cache.set(key,entry);}
 else{const canvas=document.createElement('canvas');canvas.width=frames*cellW;canvas.height=cellH;canvas.dataset.racerCharacter='true';entry={canvas,ready:new Set()};cache.set(key,entry);if(cache.size>limit)cache.delete(cache.keys().next().value);}
 if(!entry.ready.has(frame)){const ctx=entry.canvas.getContext('2d');ctx.save();ctx.beginPath();ctx.rect(frame*cellW,0,cellW,cellH);ctx.clip();ctx.translate(frame*cellW,0);paint(ctx,kit,character,frame<runFrames?frame/runFrames:(frame-runFrames)/celebrationFrames,frame!==idleFrame,frame>=runFrames&&frame<idleFrame);ctx.restore();entry.ready.add(frame);}
 return entry.canvas;
}
export function drawCharacterRunner(ctx,value,{x=0,y=0,width=72,height=78,stride=1,cycle=null,identity=null,moving=true,celebrate=false}={}){
 const kit=normalizeKit(value),character=racerCharacter(identity,kit),phase=moving?(celebrate?(cycle??0):(cycle??stride/6)*character.tempo+character.phase):0;
 if(height>140){ctx.save();ctx.translate(x,y);ctx.scale(width/cellW,height/cellH);paint(ctx,kit,character,phase,moving,celebrate);ctx.restore();}
 else{const total=celebrate?celebrationFrames:runFrames,frame=moving?(celebrate?runFrames:0)+((Math.floor(phase*total+1e-8)%total)+total)%total:idleFrame;ctx.drawImage(atlas(kit,character,frame),frame*cellW,0,cellW,cellH,x,y,width,height);}
 return true;
}
export function clearCharacterArt(){cache.clear();}
