const number=value=>value!==null&&value!==undefined&&Number.isFinite(Number(value))?Number(value):null;
export const pastHalftime=(state,afterHalftime=false)=>state==='final'||state==='live'&&afterHalftime===true;
export function playerTemperature(points,state,afterHalftime=false){const value=number(points);return value==null||!pastHalftime(state,afterHalftime)?'neutral':value>15?'hot':value<10?'cold':'neutral'}
export function teamTemperature(points,eligible=false){const value=number(points);return value==null||!eligible?'neutral':value>120?'hot':value>=100?'steady':'cold'}
export function teamRosterTemperature(team,completed=false){const ready=completed||team.known===true&&(team.remaining===0||Array.isArray(team.starters)&&team.starters.length>0&&team.starters.every(p=>pastHalftime(p.state,p.afterHalftime)));return teamTemperature(team.score,ready)}
export const temperatureLabel=key=>({hot:'On fire',cold:'Ice cold',steady:'Steady'}[key]||'');
const icons={hot:'<path d="M13 2c1 6 6 7 6 13a7 7 0 0 1-14 0c0-3 2-6 5-9-1 4 1 5 2 6 2-3 2-6 1-10Z" fill="currentColor"/>',cold:'<path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3M9 20l3-3 3 3M4 10l4-1-1-4M20 14l-4 1 1 4M4 14l4 1-1 4M20 10l-4-1 1-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'};
export function thermalScore(points,key,{tag='b'}={}){
 const value=number(points),text=value==null?'—':value.toFixed(2),state=['hot','cold','steady'].includes(key)&&value!=null?key:'neutral',label=temperatureLabel(state),element=tag==='strong'?'strong':'b';
 return `<${element} class="gd-thermal-number" data-score-temperature="${state}"><span class="gd-thermal-value">${text}</span>${icons[state]?`<span class="gd-score-marker" role="img" aria-label="${label}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[state]}</svg></span><span class="gd-thermal-fx" aria-hidden="true"><i></i><i></i><i></i></span>`:''}</${element}>`;
}
