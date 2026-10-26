import {footballMomentShareSpec} from './share-export-model.js';
import {editorialShareCanvas} from './share-editorial.js';
import {shareCanvas,shareText} from './share.js';
export function shareFootballMoment(moment,{season,week}={}){
 const spec=footballMomentShareSpec(moment,{season,week});if(!spec)return;
 const title=`DFL · Week ${week} · ${moment.title}`,text=`${moment.text}. ${moment.recap.play.text}`;
 try{return shareCanvas(editorialShareCanvas(spec),`dfl-week-${week}-${moment.eventKey.replaceAll(':','-')}.png`,{title,text})}catch{return shareText({title,text})}
}
