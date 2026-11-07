import {patchGameDay} from './game-day-dom.js';
import {thermalScore,playerScoreTemperature} from './score-temperature.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';

// Keep the number and its thermal anchor mounted. A game selection changes
// context; only a new numeric score in that same game gets the quiet settle.
export function patchPlayerCardScore(host,context,{motion=true,feedback=false}={}){
 if(!host)return;
 if(!motion)cancelUiMotion(host.querySelector('.gd-thermal-value'));
 const points=(typeof context.points==='number'||typeof context.points==='string'&&context.points.trim()!=='')&&Number.isFinite(Number(context.points))?Number(context.points):null;
 const temperature=playerScoreTemperature(context),stamp=JSON.stringify([context.week,points,temperature]);
 if(host.dataset.scoreStamp===stamp)return;
 const previous=host.dataset.scorePoints===''?null:Number(host.dataset.scorePoints),sameWeek=host.dataset.scoreWeek===String(context.week),hadValue=host.hasAttribute('data-score-points');
 if(!sameWeek)cancelUiMotion(host.querySelector('.gd-thermal-value'));
 patchGameDay(host,`${thermalScore(points,temperature,{tag:'strong'})}<small>Fantasy points</small>`);
 host.dataset.scoreStamp=stamp;host.dataset.scoreWeek=String(context.week);host.dataset.scorePoints=points===null?'':String(points);
 if(feedback&&sameWeek&&hadValue&&previous!==null&&points!==null&&previous!==points)animateUi(host.querySelector('.gd-thermal-value'),[{opacity:.55},{opacity:1}],{duration:180,motion});
}
