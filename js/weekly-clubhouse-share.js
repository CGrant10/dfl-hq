import {shareCanvas,shareText,fitText,sealImage} from './share.js';
import {SHARE_INK} from './brand-ink.js';
import {weeklyRecapLines,weeklyHref} from './weekly-clubhouse-model.js';
export function weeklyClubhouseCanvas(model){
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');ctx.fillStyle=SHARE_INK.BG;ctx.fillRect(0,0,1080,1350);
 const seal=sealImage();if(seal){ctx.save();ctx.globalAlpha=.04;ctx.drawImage(seal,90,160,900,900);ctx.restore()}
 ctx.fillStyle=SHARE_INK.ACCENT;ctx.fillRect(0,0,1080,12);ctx.fillStyle=SHARE_INK.MUTED;fitText(ctx,`DFL HQ · ${model.season} · FINAL RECEIPTS`,540,70,960,25,800);
 ctx.fillStyle=SHARE_INK.INK;fitText(ctx,`WEEK ${model.week} RECAP`,540,150,960,75,900);
 const awards=model.awards.slice(0,5);let y=205;
 for(const award of awards){ctx.fillStyle=SHARE_INK.CARD_2;ctx.fillRect(60,y,960,110);ctx.fillStyle=SHARE_INK.ACCENT;fitText(ctx,award.label.toUpperCase(),85,y+30,900,21,800,'left');ctx.fillStyle=SHARE_INK.INK;fitText(ctx,award.winners.map(w=>w.name).join(' & '),85,y+63,900,32,900,'left');ctx.fillStyle=SHARE_INK.MUTED;fitText(ctx,[award.winners.map(w=>w.playerName).filter(Boolean).join(" & "),award.detail].filter(Boolean).join(" · "),85,y+92,900,20,700,'left');y+=123}
 const lines=weeklyRecapLines(model).slice(1+model.awards.length);ctx.fillStyle=SHARE_INK.INK;for(const line of lines.slice(0,Math.floor((1270-y)/38))){fitText(ctx,line.length>105?line.slice(0,102)+"…":line,70,y+27,940,24,700,'left');y+=38}
 ctx.fillStyle=SHARE_INK.MUTED;fitText(ctx,'DRAFT · GOLF · SIN · FOLD',540,1315,940,24,800);return canvas;
}
export function shareWeeklyClubhouse(model){
 if(!model.completed)return'failed';const text=weeklyRecapLines(model).join('\n'),url=new URL(weeklyHref(model.season,model.week),location.href).href;
 try{return shareCanvas(weeklyClubhouseCanvas(model),`dfl-${model.season}-week-${model.week}-recap.png`,{title:`DFL Week ${model.week} recap`,text:text+'\n'+url})}catch{return shareText({title:`DFL Week ${model.week} recap`,text,url})}
}
