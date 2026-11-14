import {esc} from './ui.js';
import {homeWeekPhase} from './home-week-flow.js';

export function dailyHomeDesk({outlook=null,briefing=null,edition={},now=new Date()}={}){
 const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',weekday:'short'}).format(now);
 const phase=homeWeekPhase(edition,Number(now)),week=outlook?.week||phase.week;
 const live=phase.key==='live';
 const urgent=briefing?.needsAttention||['lineup','ir'].includes(briefing?.actionKind);
 const titles={Tue:'Waiver day',Wed:'Build your week',Thu:'Kickoff check',Fri:'Practice watch',Sat:'Set for Sunday',Sun:'Sunday football',Mon:'Monday finish'};
 const title=live?'Football is on':phase.key==='final'?'The receipts are in':week?titles[day]:'DFL today';
 const advice=briefing?.actionKind&&briefing.actionKind!=='refresh'&&briefing.actionUrl;
 const href=advice?briefing.actionUrl:'#/analyzer';
 const text=advice?briefing.action:'Review lineup';
 const secondary=day==='Tue'?{href:'#/analyzer',label:'Waivers & lineup'}:['Wed','Fri'].includes(day)?{href:'#/trade',label:'Trade desk'}:{href:'#/clubhouse?tab=matchups',label:'Clubhouse'};
 return {title,week,href,text,urgent:!!urgent,advice:!!advice,secondary,live};
}
export function homeDailyDeskMarkup(input={}){
 const d=dailyHomeDesk(input),external=d.href.startsWith('https://');
 return `<section class="home-week-focus home-daily-focus" aria-label="Your next move"><header><h2>${esc(d.title)}</h2><span${d.week?'':' hidden'}>${d.week?`Week ${esc(d.week)}`:''}</span></header><a class="home-lineup-primary" data-home-primary${d.advice?' data-daily-action="true"':''}${d.urgent?' data-action-urgent="true"':''} href="${esc(d.href)}"${external?' target="_blank" rel="noopener noreferrer"':''}><span>${esc(d.text)}</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a><a class="home-clubhouse-link"${d.secondary.label==='Clubhouse'?' data-home-clubhouse-link':''} href="${d.secondary.href}"><span>${d.secondary.label}</span> <svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></a></section>`;
}
// Refresh advice in place, preserving the reader's focused link and selection.
export function updateHomeDailyDesk(host,input){
 const d=dailyHomeDesk(input),primary=host?.querySelector('[data-home-primary]');
 if(!primary){if(host)host.innerHTML=homeDailyDeskMarkup(input);return}
 host.querySelector('h2').textContent=d.title;const week=host.querySelector('header>span');week.hidden=!d.week;week.textContent=d.week?`Week ${d.week}`:'';
 primary.querySelector('span').textContent=d.text;primary.href=d.href;delete primary.dataset.gamedayWatch;
 primary.toggleAttribute('data-daily-action',d.advice);if(d.advice)primary.dataset.dailyAction='true';
 primary.toggleAttribute('data-action-urgent',d.urgent);if(d.urgent)primary.dataset.actionUrgent='true';
 if(d.href.startsWith('https://')){primary.target='_blank';primary.rel='noopener noreferrer'}else{primary.removeAttribute('target');primary.removeAttribute('rel')}
 const secondary=host.querySelector('.home-clubhouse-link');secondary.href=d.secondary.href;secondary.querySelector('span').textContent=d.secondary.label;secondary.toggleAttribute('data-home-clubhouse-link',d.secondary.label==='Clubhouse');
}
