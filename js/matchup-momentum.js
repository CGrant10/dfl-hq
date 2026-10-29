import {matchupTimeline} from './matchup-timeline.js';
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const numeric=value=>(typeof value==='number'||typeof value==='string'&&value.trim()!=='')&&Number.isFinite(Number(value))?Number(value):null;
const byTime=(a,b)=>a.at-b.at||String(a.key).localeCompare(String(b.key),undefined,{numeric:true});
export function scoreHistoryPoints(rows,model,game,{now=Date.now()}={}){
 if(game?.sides?.length!==2)return [];
 const ids=game.sides.map(s=>String(s.roster)),points=new Map();
 for(const row of rows||[]){
  if(String(row.league_id)!==String(model.leagueId)||Number(row.season)!==Number(model.season)||Number(row.week)!==Number(model.week)||String(row.matchup_id)!==String(game.id))continue;
  const rosters=[String(row.roster1),String(row.roster2)],values=[numeric(row.score1),numeric(row.score2)],at=Date.parse(row.observed_at);
  if(new Set(rosters).size!==2||!ids.every(id=>rosters.includes(id))||values.some(v=>v===null||Math.abs(v)>10000)||!Number.isFinite(at)||at>now+30000||!/^\d+$/.test(String(row.id)))continue;
  points.set('score:'+row.id,{key:'score:'+row.id,kind:'score',at,scores:ids.map(id=>values[rosters.indexOf(id)])});
 }
 return [...points.values()].sort(byTime).filter((p,i,all)=>!i||p.scores.some((v,j)=>v!==all[i-1].scores[j]));
}
export function matchupMomentum(items,history,model,game,{selected='',filter='all',now=Date.now()}={}){
 const moments=matchupTimeline(items,game).map(m=>({...m,key:'moment:'+String(m.eventKey||m.key),moment:m}));
 const points=scoreHistoryPoints(history,model,game,{now});
 // Older editions can still show exact saved lead receipts if history is offline.
 for(const entry of moments){
  const sides=entry.recap?.sides;
  if(entry.kind!=='lead'||!sides?.every(s=>finite(s.points))||!game.sides.every(s=>sides.some(v=>String(v.roster)===String(s.roster))))continue;
  const scores=game.sides.map(s=>sides.find(v=>String(v.roster)===String(s.roster)).points);
  if(!points.some(p=>Math.abs(p.at-entry.at)<1000&&p.scores.every((v,i)=>v===scores[i])))points.push({key:'score:lead:'+entry.key,kind:'score',at:entry.at,scores});
 }
 points.sort(byTime);
 const scoreEntries=points.filter(p=>!moments.some(m=>m.kind==='lead'&&Math.abs(m.at-p.at)<1000&&m.recap.sides.every(s=>finite(s.points))&&game.sides.every((s,i)=>m.recap.sides.find(v=>String(v.roster)===String(s.roster))?.points===p.scores[i])));
 const entries=[...scoreEntries,...moments].filter(m=>filter==='leads'?m.kind==='lead':filter==='plays'?!!m.recap?.play:true).sort(byTime);
 const choice=entries.find(e=>e.key===selected)||entries.at(-1)||null;
 const times=[...points,...moments].map(p=>p.at),start=times.length?Math.min(...times):0,end=times.length?Math.max(...times):0;
 const values=points.flatMap(p=>p.scores),low=Math.min(0,...values),high=Math.max(1,...values),span=high-low;
 const x=at=>end===start?240:16+(at-start)/(end-start)*448,y=value=>132-(value-low)/span*112;
 const paths=[0,1].map(side=>points.map((p,i)=>`${i?'L':'M'}${x(p.at).toFixed(2)},${y(p.scores[side]).toFixed(2)}`).join(' '));
 return {points,entries,choice,index:choice?entries.indexOf(choice):-1,start,end,paths,x,y,low,high};
}
