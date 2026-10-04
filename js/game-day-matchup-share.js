import {matchupShareSpec} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
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
 if(!data)return null;return editorialShareCanvas(matchupShareSpec(data));
}
export function shareMatchupReceipt(data){if(!data)return;const canvas=matchupReceiptCanvas(data);try{return shareCanvas(canvas,`dfl-week-${data.week}-matchup.png`,{title:`DFL · Week ${data.week} final`,text:`${data.sides.map(t=>`${t.name} ${t.score.toFixed(2)}`).join(' – ')}. ${data.banter}`})}catch{return shareText({title:'DFL matchup final',text:data.banter})}}
