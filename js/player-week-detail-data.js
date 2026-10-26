import {loadWeeklyStats} from './sleeper.js';

// One week payload serves the entire league; never request data per player.
export async function loadPlayerWeekDetails(season,week,{force=false,load=loadWeeklyStats}={}) {
 if(!Number.isInteger(Number(season))||Number(season)<2000||!Number.isInteger(Number(week))||Number(week)<1||Number(week)>18)return [];
 return Promise.all(Array.from({length:Number(week)},(_,i)=>i+1).map(async current=>{
  const maxAgeMs=current===Number(week)?force?0:60000:current===Number(week)-1?300000:6*60*60*1000;
  try{return {...await load(Number(season),current,{maxAgeMs}),week:current}}
  catch{return {week:current,data:[],error:true}}
 }));
}
