import {clubhouseShareSpec} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter,wrapShareText} from "./share-card-style.js";
import {shareCanvas,shareText,fitText,roundRect,FONT} from './share.js';
import {SHARE_INK} from './brand-ink.js';
import {weeklyRecapLines,weeklyHref} from './weekly-clubhouse-model.js';
export function weeklyClubhouseCanvas(model){
 return editorialShareCanvas(clubhouseShareSpec(model));
}
export function shareWeeklyClubhouse(model){
 if(!model.completed)return'failed';const text=weeklyRecapLines(model).join('\n'),url=new URL(weeklyHref(model.season,model.week),location.href).href;
 try{return shareCanvas(weeklyClubhouseCanvas(model),`dfl-${model.season}-week-${model.week}-recap.png`,{title:`DFL Week ${model.week} recap`,text:text+'\n'+url})}catch{return shareText({title:`DFL Week ${model.week} recap`,text,url})}
}
