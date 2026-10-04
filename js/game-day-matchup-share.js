import { SHARE_INK } from './brand-ink.js';
import { FONT,fitText,shareCanvas,shareText,roundRect } from './share.js';
import { drawShareFrame,drawShareFooter,shareMonogram,wrapShareText } from './share-card-style.js';
const finite=value=>value!=null&&Number.isFinite(Number(value));
export function matchupReceiptData(model){
 const game=model?.games?.find(g=>g.isMine);
 if(!game||game.sides.length!==2||game.sides.some(t=>!finite(t.score))||!model.completed&&!game.sides.every(t=>t.known&&t.remaining===0))return null;
 const sides=game.sides.map(t=>({name:t.name,score:Number(t.score)})),winner=sides[0].score===sides[1].score?null:sides[sides[0].score>sides[1].score?0:1],margin=Math.abs(sides[0].score-sides[1].score);
 const mvp=game.sides.flatMap(t=>(t.starters||[]).filter(p=>finite(p.points)).map(p=>({...p,owner:t.name}))).sort((a,b)=>Number(b.points)-Number(a.points)||String(a.name).localeCompare(String(b.name)))[0]||null;
 return {season:model.season,week:model.week,sides,winner,margin,mvp,banter:winner?margin<5?`${winner.name} escapes by ${margin.toFixed(2)}. Somebody’s checking stat corrections.`:margin>=30?`${winner.name} brought the points. The other side brought the excuses.`:`${winner.name} gets the win—and the group-chat bragging rights.`:'A tie. Two teams, zero bragging rights.'};
}
export function matchupReceiptCanvas(data){
 if(!data)return null;
 const canvas=document.createElement('canvas');canvas.width=1080;canvas.height=1350;const ctx=canvas.getContext('2d');const banterLines=wrapShareText(ctx,data.banter,900,27,500);canvas.height=Math.max(1350,1055+banterLines.length*38+150);drawShareFrame(ctx,'Matchup final');
 ctx.fillStyle=SHARE_INK.INK;fitText(ctx,`WEEK ${data.week} · ${data.season}`,540,235,920,42,650);
 data.sides.forEach((t,i)=>{const x=68+i*484;ctx.fillStyle=SHARE_INK.CARD;roundRect(ctx,x,300,460,450,24);ctx.fill();shareMonogram(ctx,t.name,x+182,334,96);ctx.fillStyle=SHARE_INK.INK;fitText(ctx,t.name,x+230,494,408,30,600);ctx.fillStyle=data.winner?.name===t.name?SHARE_INK.GOLD:SHARE_INK.INK;fitText(ctx,t.score.toFixed(2),x+230,622,400,86,650);ctx.fillStyle=SHARE_INK.MUTED;fitText(ctx,'FINAL POINTS',x+230,693,408,22,500)});
 ctx.fillStyle=SHARE_INK.GOLD;fitText(ctx,data.winner?`${data.winner.name} wins by ${data.margin.toFixed(2)}`:'FINAL · TIED',540,820,940,32,600);
 if(data.mvp){ctx.fillStyle=SHARE_INK.MUTED;fitText(ctx,'MATCHUP MVP',540,907,920,22,500);ctx.fillStyle=SHARE_INK.INK;fitText(ctx,`${data.mvp.name} · ${Number(data.mvp.points).toFixed(2)} pts`,540,954,920,32,600)}
 ctx.fillStyle=SHARE_INK.MUTED;ctx.textAlign='center';ctx.font=`500 27px ${FONT}`;banterLines.forEach((line,i)=>ctx.fillText(line,540,1055+i*38));drawShareFooter(ctx);return canvas;
}
export function shareMatchupReceipt(data){if(!data)return;const canvas=matchupReceiptCanvas(data);try{return shareCanvas(canvas,`dfl-week-${data.week}-matchup.png`,{title:`DFL · Week ${data.week} final`,text:`${data.sides.map(t=>`${t.name} ${t.score.toFixed(2)}`).join(' – ')}. ${data.banter}`})}catch{return shareText({title:'DFL matchup final',text:data.banter})}}
