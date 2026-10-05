const number=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value):null;
export const pastHalftime=(state,afterHalftime=false)=>state==='final'||state==='live'&&afterHalftime===true;
export function playerTemperature(points,state,afterHalftime=false){const value=number(points);return value==null?'neutral':value>15?'hot':value<10&&pastHalftime(state,afterHalftime)?'cold':'neutral'}
export function isDefensePlayer(player){return [player?.position,player?.slotType].some(value=>['DEF','DST','D/ST','DEFENSE'].includes(String(value||'').toUpperCase()))}
export function playerScoreTemperature(player){return isDefensePlayer(player)?'neutral':playerTemperature(player?.points,player?.state,player?.afterHalftime)}
export function teamTemperature(points,eligible=false){const value=number(points);return value==null?'neutral':value>120?'hot':value>=100?'steady':eligible?'cold':'neutral'}
export function teamRosterTemperature(team,completed=false){const ready=completed||team.known===true&&(team.remaining===0||Array.isArray(team.starters)&&team.starters.length>0&&team.starters.every(p=>pastHalftime(p.state,p.afterHalftime)));return teamTemperature(team.score,ready)}
export const temperatureLabel=key=>({hot:'On fire',cold:'Ice cold',steady:'Steady'}[key]||'');
export function thermalScore(points,key,{tag='b'}={}){
 const value=number(points),text=value==null?'—':value.toFixed(2),state=['hot','cold','steady'].includes(key)&&value!=null?key:'neutral',label=temperatureLabel(state),element=tag==='strong'?'strong':'b';
 return `<${element} class="gd-thermal-number" data-score-temperature="${state}"><span class="gd-thermal-value">${text}</span>${state==='hot'||state==='cold'?`<span class="sr-only" role="img" aria-label="${label}"></span>`:''}</${element}>`;
}
