import {nflShortName} from './nfl-stats-model.js';
import {esc} from './ui.js';
import {team,teamLogoUrl} from './nfl-teams.js';
import {nflPlayColors,stadiumX} from './nfl-field-ui.js';

// A perspective data plot. Only official start/end yard lines are plotted;
// the lift illustrates a pass, never an invented player route or tracking feed.
const topX=percent=>90+percent*4.2,bottomX=percent=>10+percent*5.8;
export function nflStadiumMarkup(play,game,{uid,historical=false,latest=play,athlete=null,drive=null}={}){
 const portrait=athlete?.id?`https://a.espncdn.com/i/headshots/nfl/players/full/${athlete.id}.png`:'';
 const field=play?.field,sides=game?.sides||[],offense=field?.start.team||play?.team||'';
 const current=!!field&&!historical&&!!field.end.down;
 const down=(current?field.end.down:field?.start.down)||'',spot=(current?field.end.label:field?.start.label)||'';
 const snapshot=!historical&&latest?.id!==play?.id;
 const result=snapshot?'':field?.voided?'No play':field?.touchdown?'Touchdown':field?.turnover?'Turnover':field?.yards!=null?`${field.yards>0?'+':''}${field.yards} yd`:play?.typeLabel||'';
 const message=historical?play:latest||play;
 const phase=[message?.period?message.period>4?'OT':'Q'+message.period:'',message?.clock].filter(Boolean).join(' · ');
 const description=field?[offense,field.start.down,field.start.label,'to',field.end.label,result].filter(Boolean).join(' · '):'Field position unavailable';
 return `<section class="nfl-field nfl-stadium" id="${uid}-field" tabindex="-1" aria-label="${historical?'Selected':'Latest'} play field view" data-nfl-field data-field-stadium data-field-play="${esc(play?.id||'')}"${field?` data-field-kind="${field.voided?'voided':field.touchdown?'touchdown':field.turnover?'turnover':'play'}"`:''} style="${nflPlayColors(offense)}">
  <header><div class="nfl-stadium-play"><b>${historical?'Selected play':game?.state==='in'?'Live':game?.state==='post'?'Final play':'Kickoff'}${offense?` · ${esc(offense)}`:''}</b><small>${esc(phase)}</small></div><div class="nfl-field-result"><b>${esc(result)}</b></div>${field?.animate?'<button type="button" data-nfl-field-replay>Replay</button>':''}${historical?'<button type="button" data-nfl-field-latest>Latest play</button>':''}</header>
  <p class="nfl-stadium-description">${esc(message?.text|| (game?.state==='pre'?'Plays appear at kickoff.':'Waiting for the next play.'))}</p>
  <div class="nfl-stadium-ground" ${field?'':'hidden'}><svg ${field?'':'hidden'} class="nfl-field-pitch" viewBox="0 0 600 180" role="img" aria-label="${esc(description)}">
   <polygon class="nfl-stadium-turf" points="90,16 510,16 590,148 10,148"/>
   ${Array.from({length:12},(_,i)=>`<polygon class="nfl-stadium-stripe" points="${topX(i/12*100)},16 ${topX((i+1)/12*100)},16 ${bottomX((i+1)/12*100)},148 ${bottomX(i/12*100)},148" opacity="${i%2?'.035':'.075'}"/>`).join('')}
   <polygon class="nfl-field-zone" points="90,16 125,16 58,148 10,148" style="fill:${team(sides[0]?.code)?.primary||'transparent'}"/>
   <polygon class="nfl-field-zone" points="475,16 510,16 590,148 542,148" style="fill:${team(sides[1]?.code)?.primary||'transparent'}"/>
   <g class="nfl-field-lines">${Array.from({length:11},(_,i)=>{const p=100/12+i*100/12;return `<path d="M${topX(p)} 16L${bottomX(p)} 148"/>`}).join('')}<path d="M90 16H510L590 148H10Z"/></g>
   <g class="nfl-field-lines nfl-stadium-goals"><path d="M20 88V28m-14-24v24h28V4M580 88V28m-14-24v24h28V4"/></g><g class="nfl-stadium-numbers">${[20,50,80].map((n,i)=>`<text x="${stadiumX(n)}" y="12">${[20,50,20][i]}</text>`).join('')}</g>
   ${field?`${field.touchdown?`<polygon class="nfl-field-arrival" points="${field.end.x>50?'475,16 510,16 590,148 542,148':'90,16 125,16 58,148 10,148'}"/>`:''}<path class="nfl-field-scrimmage" d="M${topX((field.start.x+10)/1.2)} 16L${bottomX((field.start.x+10)/1.2)} 148"/>${field.target!=null?`<path class="nfl-field-target" d="M${topX((field.target+10)/1.2)} 16L${bottomX((field.target+10)/1.2)} 148"/>`:''}<path class="nfl-field-bed" d="M${stadiumX(field.start.x)} 92H${stadiumX(field.end.x)}"/><path class="nfl-field-travel" pathLength="1" d="M${stadiumX(field.start.x)} 92Q${(stadiumX(field.start.x)+stadiumX(field.end.x))/2} ${/pass|kick|punt/i.test(play.typeLabel)?40:86} ${stadiumX(field.end.x)} 92"/><circle class="nfl-field-start" cx="${stadiumX(field.start.x)}" cy="92" r="4"/><circle class="nfl-field-land" cx="${stadiumX(field.end.x)}" cy="92" r="14"/><g class="nfl-field-shadow" style="transform:translate(${stadiumX(field.end.x)}px,100px)"><ellipse rx="12" ry="3"/></g><g class="nfl-field-ball" style="transform:translate(${stadiumX(field.end.x)}px,92px)"><g class="nfl-field-ball-body"><circle class="nfl-stadium-pin" cx="0" cy="-27" r="18"/><image href="${esc(portrait||teamLogoUrl(offense))}" x="-14" y="-41" width="28" height="28"/>${portrait?`<image href="${esc(teamLogoUrl(offense))}" x="9" y="-17" width="12" height="12"/>`:""}<path class="nfl-stadium-pin-stem" d="M0-9v9"/><ellipse rx="7" ry="4"/><path d="M-3 0h6M-1-2v4M1-2v4"/>${athlete?`<text class="nfl-field-player-label" x="0" y="20">${esc(nflShortName(athlete.name))}${field.yards!=null?` ${field.yards} yd`:""}</text>`:""}</g></g>`:''}
  </svg>
  <div class="nfl-stadium-position"><b>${esc((snapshot?(game?.state==='post'?'Final spot':'Last spot'):down)|| (game?.state==='pre'?'Kickoff pending':field?'Play complete':'Field position unavailable'))}</b>${spot?`<span>@ ${esc(spot)}</span>`:''}</div></div>
  ${drive?.description?`<p class="nfl-drive-caption">${esc(drive.description)}</p>`:''}
  ${historical?`<footer><nav class="nfl-field-controls" aria-label="Selected play"><button type="button" data-nfl-field-return="${esc(play.id)}">Back to play</button></nav></footer>`:''}
 </section>`;
}
