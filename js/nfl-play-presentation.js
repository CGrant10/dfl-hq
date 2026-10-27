const clean=value=>String(value||'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function nflPlayNameIndex(summary){
 const aliases=new Map();
 for(const club of summary?.boxscore?.players||[])for(const group of club.statistics||[])for(const row of group.athletes||[]){
  const athlete=row.athlete,name=clean(athlete?.displayName);if(!name)continue;
  const parts=name.replace(/\s+(jr|sr|ii|iii|iv)\.?$/i,'').split(' ');if(parts.length<2)continue;
  const alias=clean(athlete.shortName)||`${parts[0][0]}.${parts.slice(1).join('')}`;
  const previous=aliases.get(alias);aliases.set(alias,previous&&previous.name!==name?{name:null}:previous||{name,alias});
 }
 return [...aliases.values()].filter(p=>p.name).map(p=>({...p,pattern:new RegExp(`(?<![A-Za-z])(?:${escape(p.alias).replaceAll('\\.','\\.\\s*')}|${escape(p.name).replaceAll(' ','\\s+')})(?![A-Za-z])`,'g')}));
}
// Display names resolve only from a unique official box-score alias. This
// presentation lookup never determines player ownership or notification eligibility.
export function nflPlayPresentation(play,names=[]){
 const offense=clean(play.text).replace(/^(?:\([^)]*\)\s*)+/,'').split('(')[0];
 const found=names.flatMap(person=>{person.pattern.lastIndex=0;const match=person.pattern.exec(offense);return match?[{name:person.name,index:match.index}]:[]}).sort((a,b)=>a.index-b.index);
 const people=[...new Set(found.map(p=>p.name))].slice(0,2),type=String(play.typeId||''),yards=play.yards;
 if(people.length===2&&['24','67'].includes(type)&&/\bpass from\b/i.test(offense))people.reverse();
 const touchdown=!play.voided&&play.score&&['67','68'].includes(type),big=!play.voided&&play.big;
 const label=play.voided?'No play':touchdown?'Touchdown':big?'Big play':play.score&&type==='59'?'Field goal':play.score?'Score':clean(play.typeLabel)||'Play';
 const action=['24','67'].includes(type)?type==='67'?'TD pass':'catch':['5','68'].includes(type)?type==='68'?'TD run':'run':type==='59'?'field goal':'';
 const noGain=yards===0&&!play.score&&['5','24'].includes(type);
 const result=typeof yards==='number'&&Number.isFinite(yards)&&action&&!(type==='59'&&yards===0)?noGain?'No gain':`${yards} yd ${action}`:'';
 return {headline:people.length?people.join(['24','67'].includes(type)?' → ':' · '):label,label,result,kind:play.voided?'play':touchdown?'touchdown':big?'big-play':play.score?'score':'play'};
}
