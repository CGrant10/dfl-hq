import {sharePlayers} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
import {drawShareFrame,drawShareFooter,wrapShareText} from "./share-card-style.js";
import {shareCanvas,shareText,fitText,roundRect,FONT} from './share.js';
import {SHARE_INK} from './brand-ink.js';
import {weeklyRecapLines,weeklyHref} from './weekly-clubhouse-model.js';
export function weeklyClubhouseCanvas(model){
 const score=value=>value==null?'—':Number(value).toFixed(2);
 return editorialShareCanvas({kind:'Clubhouse recap',context:`${model.season} / WEEK ${model.week}`,headline:`WEEK ${model.week}\nRECEIPTS.`,status:'Final',sections:[...model.awards.slice(0,5).map(a=>({label:a.label,rows:a.winners.map(w=>({name:w.name,detail:[w.playerName,a.detail].filter(Boolean).join(' · ')}))})),{label:'League scores',rows:model.games.map(g=>({name:`${g.left.name} vs ${g.right.name}`,value:`${score(g.left.score)}–${score(g.right.score)}`}))}],players:sharePlayers(model.awards.flatMap(a=>a.winners.map(w=>({id:w.player,name:w.playerName})))),footer:'Clubhouse recap'});
}
export function shareWeeklyClubhouse(model){
 if(!model.completed)return'failed';const text=weeklyRecapLines(model).join('\n'),url=new URL(weeklyHref(model.season,model.week),location.href).href;
 try{return shareCanvas(weeklyClubhouseCanvas(model),`dfl-${model.season}-week-${model.week}-recap.png`,{title:`DFL Week ${model.week} recap`,text:text+'\n'+url})}catch{return shareText({title:`DFL Week ${model.week} recap`,text,url})}
}
