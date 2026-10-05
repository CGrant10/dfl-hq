import {playerScoreTemperature} from './score-temperature.js';
const numeric=v=>v!=null&&Number.isFinite(Number(v))?Number(v):null;
export function leaguePlayers(model,{filter='all',includeBench=false}={}){
 const rows=model?.games?.flatMap(g=>g.sides.flatMap(t=>[...t.lineup,...(includeBench?t.bench:[])]))||[];
 const seen=new Set();return rows.filter(p=>{const key=`${p.roster}:${p.id}`;if(p.empty||seen.has(key))return false;seen.add(key);return filter==='all'||playerScoreTemperature(p)===filter}).sort((a,b)=>{
  const x=numeric(a.points),y=numeric(b.points);if(x==null||y==null)return x==null?(y==null?a.name.localeCompare(b.name):1):-1;
  return (filter==='cold'?x-y:y-x)||a.name.localeCompare(b.name);
 });
}
export function closeGame(game){
 if(!game?.sides||game.sides.length!==2)return null;
 const [a,b]=game.sides,x=numeric(a.score),y=numeric(b.score);
 if(x==null||y==null||Math.abs(x-y)>10||!game.sides.some(t=>t.starters.some(p=>p.state==='live')))return null;
 return {gap:Math.abs(x-y),leader:x===y?null:x>y?a:b,sides:game.sides.map(t=>({...t,playing:t.lineup.filter(p=>!p.empty&&['live','upcoming'].includes(p.state))}))};
}
