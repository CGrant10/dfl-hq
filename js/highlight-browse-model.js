import {teamHighlightClips} from './team-highlight-model.js';
const text=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/['’‘.]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
export function highlightPlayerOptions(clips,players=[]){
 const games=[...new Set(clips.map(clip=>String(clip.game_id)))],seen=new Set(),options=[];
 for(const player of players){
  if(!player||player.empty||!player.id||seen.has(String(player.id)))continue;seen.add(String(player.id));
  const matches=teamHighlightClips(clips,[player],{gameIds:games});if(!matches.length)continue;
  options.push({...player,key:String(player.id),clipIds:matches.map(clip=>clip.id),count:matches.length});
 }
 return options.sort((a,b)=>a.name.localeCompare(b.name)||a.key.localeCompare(b.key));
}
export function browseHighlightClips(clips,{player='',players=[],query=''}={}){
 const selected=player&&players.find(option=>option.key===player),ids=selected?new Set(selected.clipIds):null;
 const terms=text(String(query).slice(0,80)).split(/\s+/).filter(Boolean);
 return clips.filter(clip=>{
  if(ids&&!ids.has(clip.id))return false;
  const names=players.filter(option=>option.clipIds.includes(clip.id)).map(option=>`${option.name} ${option.position}`).join(' ');
  const haystack=text(`${clip.headline} ${names} ${clip.game_label} ${clip.kind==='touchdown'?'touchdown TD':'big play'}`);
  return terms.every(term=>haystack.includes(term));
 });
}
