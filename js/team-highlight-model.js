const club=value=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[value]||value);
const aliases={'christian mccaffrey':['cmc'],'jaxon smith njigba':['jsn'],'marquise brown':['hollywood brown'],'gabriel davis':['gabe davis'],'kenneth walker':['ken walker'],'odell beckham':['obj']};
const words=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/['’]s\b/g,'').replace(/['’‘.]/g,'').replace(/[^a-z0-9]+/g,' ').replace(/\b(?:jr|sr|ii|iii|iv)\b/g,'').trim().replace(/\s+/g,' ').replace(/\b([a-z]) ([a-z])\b/g,'$1$2');
export function teamHighlightClips(clips,players,{gameIds=[]}={}){
 const games=new Set(gameIds.map(String));if(!games.size)return [];
 const roster=players.filter(p=>p&&!p.empty&&['QB','RB','WR','TE','K'].includes(p.position)).map(p=>({name:words(p.name),team:club(p.nflTeam)})).filter(p=>p.name.split(' ').length>=2&&!/^player \d+$/.test(p.name)&&p.team);
 return clips.filter(clip=>games.has(String(clip.game_id))&&roster.some(p=>{
  const teams=String(clip.game_label||'').split('·').map(t=>club(t.trim()));
  const headline=' '+words(clip.headline)+' ';return teams.includes(p.team)&&[p.name,...(aliases[p.name]||[])].some(name=>headline.includes(' '+name+' '));
 }));
}
