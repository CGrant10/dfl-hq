import {esc} from './ui.js';
import {team} from './nfl-teams.js';

export function nflPlayColors(code){
 const club=team(code);
 return club?`--nfl-team-color:${club.primary};--nfl-team-alt:${club.secondary}`:'';
}
const x=percent=>50+percent*5;
export function nflFieldMarkup(play,game,{uid,historical=false}={}){
 const field=play?.field,sides=game?.sides||[],offense=field?.start.team||'',colors=nflPlayColors(offense);
 const current=!!field&&!historical&&!!field.end.down;
 const label=field?.voided?'No play':field?.touchdown?'Touchdown':field?.turnover?'Turnover':play?.typeLabel||'';
 const result=field?.voided?'No play':field?.touchdown?'Touchdown':field?.turnover?'Turnover':field?.kick?(/field goal/i.test(play.typeLabel)&&field.yards!==null?`${field.yards} yd FG`:play.typeLabel):field?.yards!==null&&field?.yards!==undefined?`${field.yards>0?'+':''}${field.yards} yd`:'';
 const phase=[play?.period?play.period>4?'OT':'Q'+play.period:'',play?.clock].filter(Boolean).join(' · ');
 const description=field?[offense,field.start.down,field.start.label,'to',field.end.label,label].filter(Boolean).join(' · '):'Field position unavailable';
 return `<section class="nfl-field" id="${uid}-field" tabindex="-1" aria-label="${esc(historical?'Selected play':'Latest play')} field view" data-nfl-field data-field-play="${esc(play?.id||'')}"${field?` ${field.end.goal<=20&&field.end.down?'data-field-redzone ':''}data-field-kind="${field.voided?'voided':field.touchdown?'touchdown':field.turnover?'turnover':'play'}"`:''} style="${colors}">
  <header><div><b>${esc((current?field.end.team:offense)||game?.label||'NFL')}</b><span>${esc((current?field.end.down:field?.start.down)|| (game?.state==='pre'?'Kickoff':game?.state==='post'?'Final play':game?.status||''))}</span></div><div class="nfl-field-result"><b>${esc(result)}</b><small>${esc(phase)}</small></div>${historical?'<button type="button" class="linkbtn" data-nfl-field-latest>Latest play</button>':''}</header>
  <svg class="nfl-field-pitch" viewBox="0 0 600 150" role="img" aria-label="${esc(description)}">
   <rect class="nfl-field-turf" x="10" y="8" width="580" height="134" rx="5"/>
   <rect class="nfl-field-zone" x="10" y="8" width="40" height="134" style="fill:${team(sides[0]?.code)?.primary||'transparent'}"/>
   <rect class="nfl-field-zone" x="550" y="8" width="40" height="134" style="fill:${team(sides[1]?.code)?.primary||'transparent'}"/>
   <g class="nfl-field-lines">${Array.from({length:21},(_,i)=>`<path d="M${50+i*25} 8v134"${i%2?' opacity=".3"':''}/>`).join('')}<path d="M50 43h500M50 107h500" stroke-dasharray="2 23"/></g>
   <g class="nfl-field-numbers">${Array.from({length:9},(_,i)=>{const n=(i+1)*10;return `<text x="${50+n*5}" y="31">${Math.min(n,100-n)}</text><text x="${50+n*5}" y="132">${Math.min(n,100-n)}</text>`}).join('')}<text transform="translate(34 75) rotate(-90)">${esc(sides[0]?.code||'')}</text><text transform="translate(566 75) rotate(90)">${esc(sides[1]?.code||'')}</text></g>
   ${field?`${field.touchdown?`<rect class="nfl-field-arrival" x="${field.end.x>50?550:10}" y="8" width="40" height="134"/>`:''}<path class="nfl-field-scrimmage" d="M${x(field.start.x)} 10v130"/>${field.target!==null?`<path class="nfl-field-target" d="M${x(field.target)} 10v130"/>`:''}<path class="nfl-field-bed" d="M${x(field.start.x)} 75H${x(field.end.x)}"/><path class="nfl-field-travel" pathLength="1" d="M${x(field.start.x)} 75H${x(field.end.x)}"/><circle class="nfl-field-start" cx="${x(field.start.x)}" cy="75" r="4"/><circle class="nfl-field-land" cx="${x(field.end.x)}" cy="75" r="14"/><g class="nfl-field-shadow" style="transform:translate(${x(field.end.x)}px,84px)"><ellipse rx="8" ry="2.5"/></g><g class="nfl-field-ball" style="transform:translate(${x(field.end.x)}px,75px)"><g class="nfl-field-ball-body"><ellipse rx="10" ry="6" transform="rotate(-25)"/><path d="M-4 0h8M-2-2v4M1-2v4"/></g></g>`:''}
  </svg>
  <footer><span>${esc(field?(field.voided?'No play · ':'')+[field.start.label,field.end.label].join(' → '):game?.state==='pre'?'Kickoff pending':'Field position unavailable')}</span><nav class="nfl-field-controls" aria-label="Play animation">${field?.animate?'<button type="button" data-nfl-field-replay>Replay</button>':''}${historical?`<button type="button" data-nfl-field-return="${esc(play.id)}">Back to play</button>`:field?'<span class="nfl-field-key"><i></i>Start <i></i>To gain</span>':''}</nav></footer>
 </section>`;
}

// A presentation of official endpoints, not player tracking or invented routes.
export function nflFieldMotion(play){
 const field=play?.field;
 if(!field?.animate||field.voided)return null;
 const from=x(field.start.x),to=x(field.end.x),distance=Math.abs(to-from);
 const air=!field.turnover&&/pass|punt|kick|field goal/i.test(play.typeLabel||'');
 const lift=air?Math.min(22,10+distance*.035):3;
 const duration=Math.round(760+Math.min(260,distance*.65));
 const frames=Array.from({length:17},(_,i)=>{const t=i/16,px=Math.round((from+(to-from)*t)*100)/100,py=Math.round((75-Math.sin(Math.PI*t)*lift)*100)/100;return {offset:t,transform:`translate(${px}px,${py}px)`,opacity:Math.min(1,t*10)}});
 return {frames,duration};
}
export function animateNflField(root,play,animate){
 const motion=nflFieldMotion(play);if(!motion)return;
 const field=play.field,{frames,duration}=motion,easing='cubic-bezier(.2,.75,.25,1)';
 animate(root.querySelector('.nfl-field-ball'),frames,{duration,easing});
 animate(root.querySelector('.nfl-field-ball-body'),[{transform:'rotate(-12deg)'},{transform:'rotate(8deg)',offset:.6},{transform:'rotate(0deg)'}],{duration,easing});
 animate(root.querySelector('.nfl-field-shadow'),frames.map(f=>({...f,transform:f.transform.replace(/,[^,]*px\)/,',84px)'),opacity:.24-Math.sin(Math.PI*f.offset)*.1})),{duration,easing});
 animate(root.querySelector('.nfl-field-travel'),[{strokeDashoffset:1},{strokeDashoffset:0}],{duration,easing});
 animate(root.querySelector('.nfl-field-land'),[{opacity:0,transform:'scale(.5)'},{opacity:.65,offset:.35},{opacity:0,transform:'scale(1.65)'}],{delay:duration-90,duration:380});
 animate(root.querySelector('.nfl-field-result b'),[{transform:'scale(1)'},{transform:'scale(1.07)',offset:.4},{transform:'scale(1)'}],{delay:duration-90,duration:280});
 if(field.touchdown)animate(root.querySelector('.nfl-field-arrival'),[{opacity:.12},{opacity:.4,offset:.45},{opacity:.12}],{delay:duration-180,duration:650});
}
