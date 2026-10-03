import {SHARE_INK as P} from './brand-ink.js';
import {FONT,fitText,roundRect,sealImage} from './share.js';

/** One fixed, theme-independent editorial frame for every exported image. */
export function drawShareFrame(ctx,label){
 const {width:w,height:h}=ctx.canvas;ctx.canvas.dataset.shareLayout='2';ctx.canvas.dataset.shareKind=label;
 ctx.save();ctx.fillStyle=P.BG;ctx.fillRect(0,0,w,h);
 ctx.strokeStyle=P.LINE;ctx.lineWidth=1.5;roundRect(ctx,20,20,w-40,h-40,28);ctx.stroke();
 const seal=sealImage();if(seal)ctx.drawImage(seal,64,48,60,60);
 ctx.fillStyle=P.INK;fitText(ctx,'DFL HQ',seal?140:68,89,240,32,650,'left');
 ctx.fillStyle=P.MUTED;fitText(ctx,label,w-68,86,w-420,23,500,'right');
 ctx.strokeStyle=P.LINE;ctx.beginPath();ctx.moveTo(68,136);ctx.lineTo(w-68,136);ctx.stroke();
 [P.BRAND_RED,P.GOLD,P.INK,P.CHARCOAL].forEach((ink,i)=>{ctx.fillStyle=ink;roundRect(ctx,68+i*23,128,18,4,2);ctx.fill()});
 ctx.restore();
}
export function drawShareFooter(ctx,note='Draft · Golf · Sin · Fold'){
 const {width:w,height:h}=ctx.canvas;ctx.save();ctx.textBaseline='alphabetic';ctx.strokeStyle=P.LINE;ctx.lineWidth=1.5;
 ctx.beginPath();ctx.moveTo(68,h-86);ctx.lineTo(w-68,h-86);ctx.stroke();
 ctx.fillStyle=P.MUTED;fitText(ctx,'cgrant10.github.io/dfl-hq',68,h-48,330,20,500,'left');
 fitText(ctx,note,w-68,h-48,w-500,20,500,'right');ctx.restore();
}
export function shareMonogram(ctx,name,x,y,size=88,ink=P.GOLD){
 ctx.save();ctx.fillStyle=P.CARD;ctx.beginPath();ctx.arc(x+size/2,y+size/2,size/2,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle=P.LINE;ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=ink;
 const initials=String(name||'DFL').split(/\s+/).filter(Boolean).map(v=>v[0]).slice(0,2).join('').toUpperCase();
 ctx.font=`600 ${Math.round(size*.35)}px ${FONT}`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(initials,x+size/2,y+size/2);ctx.restore();
}

/** Wrap all copy, including unbroken names, without dropping words or shrinking it away. */
export function wrapShareText(ctx,text,width,size=24,weight=500){
 ctx.font=`${weight} ${size}px ${FONT}`;
 const lines=[];let line='';
 for(const word of String(text||'').trim().split(/\s+/).filter(Boolean)){
  const next=line?`${line} ${word}`:word;
  if(ctx.measureText(next).width<=width){line=next;continue}
  if(line){lines.push(line);line=''}
  if(ctx.measureText(word).width<=width){line=word;continue}
  for(const letter of [...word]){if(line&&ctx.measureText(line+letter).width>width){lines.push(line);line=''}line+=letter}
 }
 if(line)lines.push(line);return lines;
}
