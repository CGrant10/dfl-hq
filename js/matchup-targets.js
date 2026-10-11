import {esc} from './ui.js';
const finite=n=>n!==null&&n!==undefined&&Number.isFinite(Number(n));
export function matchupTargets(game,{completed=false,memberId=null}={}){
  if(completed||game?.sides?.length!==2||game.sides.some(t=>!finite(t.score)||!t.known))return [];
  const all=game.sides.flatMap(t=>t.starters||[]);
  if(!all.length||all.every(p=>p.state==='upcoming')||all.some(p=>p.state==='unknown'))return [];
  return game.sides.flatMap((team,i)=>{
    if(memberId!==null&&String(team.memberId)!==String(memberId))return [];
    const opponent=game.sides[1-i],margin=Math.round((Number(team.score)-Number(opponent.score))*100)/100;
    const remaining=team.remaining,otherRemaining=opponent.remaining;
    if(!Number.isInteger(remaining)||!Number.isInteger(otherRemaining))return [];
    if(!remaining&&!otherRemaining)return [{team,text:'All players finished · awaiting league final',kind:'pending'}];
    if(margin>0)return [{team,text:otherRemaining?`Protect a ${margin.toFixed(2)}-point lead · ${remaining} / ${otherRemaining} players remaining`:`Ahead by ${margin.toFixed(2)} · opponent’s players finished`,kind:'lead'}];
    const target=((Math.round(Math.abs(margin)*100)+1)/100).toFixed(2);
    if(!remaining)return [{team,text:`No players left · ${margin<0?`trail by ${Math.abs(margin).toFixed(2)}`:'tied'}${otherRemaining?' · opponent still playing':''}`,kind:'done'}];
    return [{team,text:otherRemaining?`Need ${target} more points than their remaining players · ${remaining} / ${otherRemaining} left`:`Need ${target} points to take the lead · ${remaining} left`,kind:'chase'}];
  });
}
export function matchupTargetsHtml(game,options={}){
  const rows=matchupTargets(game,options);if(!rows.length)return '';
  return `<section class="matchup-targets" aria-label="Live scoring targets"><small>WHAT’S LEFT</small>${rows.map(r=>`<p data-target-kind="${r.kind}"><strong>${esc(r.team.name)}</strong><span>${esc(r.text)}</span></p>`).join('')}</section>`;
}
