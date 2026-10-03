import {drawShareFrame,drawShareFooter,wrapShareText} from "./share-card-style.js";
import {shareCanvas,shareText,fitText,roundRect,FONT} from './share.js';
import {SHARE_INK} from './brand-ink.js';
import {weeklyRecapLines,weeklyHref} from './weekly-clubhouse-model.js';
export function weeklyClubhouseCanvas(model){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');
 const awards=model.awards.slice(0,5).map(award=>({...award,
  names:wrapShareText(ctx,award.winners.map(w=>w.name).join(' & '),880,34,650),
  details:wrapShareText(ctx,[award.winners.map(w=>w.playerName).filter(Boolean).join(' & '),award.detail].filter(Boolean).join(' · '),880,24,500)
 }));
 const lines=weeklyRecapLines(model).slice(1+model.awards.length).map(line=>wrapShareText(ctx,line,880,28,500));
 const awardsH=awards.reduce((n,a)=>n+74+a.names.length*40+a.details.length*32+20,0),linesH=lines.reduce((n,l)=>n+l.length*38+28,0);
 canvas.height=Math.max(1350,344+awardsH+linesH+130);drawShareFrame(ctx,'Clubhouse recap');
 ctx.fillStyle=SHARE_INK.INK;fitText(ctx,`Week ${model.week} recap`,68,236,944,72,650,'left');
 ctx.fillStyle=SHARE_INK.MUTED;fitText(ctx,`${model.season} · Final receipts`,68,284,944,27,500,'left');
 let y=344;
 for(const award of awards){
  const height=74+award.names.length*40+award.details.length*32;
  ctx.fillStyle=SHARE_INK.CARD;roundRect(ctx,68,y,944,height,22);ctx.fill();
  ctx.fillStyle=SHARE_INK.ACCENT;fitText(ctx,award.label,100,y+40,880,24,600,'left');
  ctx.fillStyle=SHARE_INK.INK;ctx.font=`650 34px ${FONT}`;ctx.textAlign='left';
  award.names.forEach((line,i)=>ctx.fillText(line,100,y+88+i*40));
  ctx.fillStyle=SHARE_INK.MUTED;ctx.font=`500 24px ${FONT}`;
  award.details.forEach((line,i)=>ctx.fillText(line,100,y+86+award.names.length*40+i*32));
  y+=height+20;
 }
 ctx.fillStyle=SHARE_INK.INK;ctx.font=`500 28px ${FONT}`;ctx.textAlign='left';
 for(const group of lines){group.forEach((line,i)=>ctx.fillText(line,100,y+34+i*38));y+=group.length*38+28}
 drawShareFooter(ctx,'Clubhouse recap');return canvas;
}
export function shareWeeklyClubhouse(model){
 if(!model.completed)return'failed';const text=weeklyRecapLines(model).join('\n'),url=new URL(weeklyHref(model.season,model.week),location.href).href;
 try{return shareCanvas(weeklyClubhouseCanvas(model),`dfl-${model.season}-week-${model.week}-recap.png`,{title:`DFL Week ${model.week} recap`,text:text+'\n'+url})}catch{return shareText({title:`DFL Week ${model.week} recap`,text,url})}
}
