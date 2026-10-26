// Exactly the fields consumed by DFL; no provider biography or unused IDs.
export function compactPlayers(map){
 const out={};
 for(const [id,p] of Object.entries(map||{})){
  if(!p||typeof p!=='object')continue;
  out[id]=p.n!==undefined?{n:p.n,p:p.p,fp:p.fp||[],t:p.t,i:p.i??null,s:p.s??null,pp:p.pp??null,is:p.is??null,nu:p.nu??null}:{
   n:p.full_name||`${p.first_name||''} ${p.last_name||''}`.trim()||id,p:p.position||'',fp:p.fantasy_positions||[],t:p.team||'FA',
   i:p.injury_status||null,s:p.status||null,pp:p.practice_participation||null,is:p.injury_start_date||null,nu:p.news_updated||null,
  };
 }
 return out;
}
export function validPlayerDirectory(players){
 if(!players||typeof players!=='object'||Array.isArray(players))return false;
 const rows=Object.entries(players);
 return rows.length>=1000&&rows.length<=50000&&rows.every(([id,p])=>/^[A-Za-z0-9_-]{1,32}$/.test(id)&&p&&typeof p.n==='string'&&p.n.length>0&&typeof p.p==='string'&&typeof p.t==='string'&&Array.isArray(p.fp))&&['QB','RB','WR','TE','K'].every(pos=>rows.some(([,p])=>p.p===pos));
}
