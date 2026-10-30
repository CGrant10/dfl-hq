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
 const description=field?[offense,field.start.down,field.start.label,'to',field.end.label,label].filter(Boolean).join(' · '):'Field position unavailable';
 return `<section class="nfl-field" id="${uid}-field" tabindex="-1" aria-label="${esc(historical?'Selected play':'Latest play')} field view" data-nfl-field data-field-play="${esc(play?.id||'')}"${field?` ${field.end.goal<=20&&field.end.down?'data-field-redzone ':''}data-field-kind="${field.voided?'voided':field.touchdown?'touchdown':field.turnover?'turnover':'play'}"`:''} style="${colors}">
  <header><div><b>${esc((current?field.end.team:offense)||game?.label||'NFL')}</b><span>${esc((current?field.end.down:field?.start.down)|| (game?.state==='pre'?'Kickoff':game?.state==='post'?'Final play':game?.status||''))}</span></div>${historical?'<button type="button" class="linkbtn" data-nfl-field-latest>Latest play</button>':`<small>${esc([result,field?.end.goal<=20&&field?.end.down?'Red zone':''].filter(Boolean).join(' · '))}</small>`}</header>
  <svg class="nfl-field-pitch" viewBox="0 0 600 150" role="img" aria-label="${esc(description)}">
   <rect class="nfl-field-turf" x="10" y="8" width="580" height="134" rx="5"/>
   <rect class="nfl-field-zone" x="10" y="8" width="40" height="134" style="fill:${team(sides[0]?.code)?.primary||'transparent'}"/>
   <rect class="nfl-field-zone" x="550" y="8" width="40" height="134" style="fill:${team(sides[1]?.code)?.primary||'transparent'}"/>
   <g class="nfl-field-lines">${Array.from({length:21},(_,i)=>`<path d="M${50+i*25} 8v134"${i%2?' opacity=".3"':''}/>`).join('')}<path d="M50 43h500M50 107h500" stroke-dasharray="2 23"/></g>
   <g class="nfl-field-numbers">${Array.from({length:9},(_,i)=>{const n=(i+1)*10;return `<text x="${50+n*5}" y="31">${Math.min(n,100-n)}</text><text x="${50+n*5}" y="132">${Math.min(n,100-n)}</text>`}).join('')}<text transform="translate(34 75) rotate(-90)">${esc(sides[0]?.code||'')}</text><text transform="translate(566 75) rotate(90)">${esc(sides[1]?.code||'')}</text></g>
   ${field?`${field.touchdown?`<rect class="nfl-field-arrival" x="${field.end.x>50?550:10}" y="8" width="40" height="134"/>`:''}<path class="nfl-field-scrimmage" d="M${x(field.start.x)} 10v130"/>${field.target!==null?`<path class="nfl-field-target" d="M${x(field.target)} 10v130"/>`:''}<path class="nfl-field-travel" pathLength="1" d="M${x(field.start.x)} 75H${x(field.end.x)}"/><g class="nfl-field-ball" style="transform:translate(${x(field.end.x)}px,75px)"><ellipse rx="9" ry="5.5" transform="rotate(-25)"/><path d="M-4 0h8M-2-2v4M1-2v4"/></g>`:''}
  </svg>
  <footer><span>${esc(field?(field.voided?'No play · ':'')+(historical&&field.end.down?[field.end.down,field.end.label].filter(Boolean).join(' · '):field.touchdown||play.score&&!field.end.down?label:field.end.label):game?.state==='pre'?'Kickoff pending':'Field position unavailable')}</span>${historical?`<button type="button" class="linkbtn" data-nfl-field-return="${esc(play.id)}">Back to play</button>`:field?'<span class="nfl-field-key"><i></i>Start <i></i>To gain</span>':''}</footer>
 </section>`;
}

export function animateNflField(root,play,animate){
 const field=play?.field;
 if(!field?.animate)return;
 const ball=root.querySelector('.nfl-field-ball'),trail=root.querySelector('.nfl-field-travel');
 animate(ball,[{transform:`translate(${x(field.start.x)}px,75px)`},{transform:`translate(${x(field.end.x)}px,75px)`}],{duration:780});
 animate(trail,[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:780});
 if(field.touchdown)animate(root.querySelector('.nfl-field-arrival'),[{opacity:.12},{opacity:.5,offset:.5},{opacity:.12}],{duration:900});
}
