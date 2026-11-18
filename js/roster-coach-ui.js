import {esc} from './ui.js';
import {sleeperAction} from './sleeper-links.js';
import {loadRosterCoach,clearRosterCoachCache} from './roster-coach-data.js';
import {waiverMarketHtml,waiverOfferIntelHtml,waiverDropsHtml} from './waiver-intelligence-ui.js';
const pts=n=>Number(n).toFixed(1);
const pickupHtml=o=>`<li><small>${esc(o.kind)} · WEEK ${esc(o.targetWeek)}</small><div class="coach-swap"><div><small>ADD · ${esc(o.player.position)}</small><strong data-ui-name title="${esc(o.player.name)}">${esc(o.player.name)}</strong></div><div><small>${o.drop?'DROP':'ROSTER'}</small><strong data-ui-name title="${esc(o.drop?.name||'Open spot')}">${esc(o.drop?.name||'Open spot')}</strong></div></div><p class="coach-gains">${o.gains.filter(g=>g.gain!==null).map(g=>`W${g.week}: ${g.gain>=0?'+':''}${pts(g.gain)} lineup pts`).join(' · ')}</p>${o.faab?`<small>${o.faab.source==='league-history'?'DFL-guided FAAB':'FAAB guide'}: ${o.faab.min}–${o.faab.max} · ${o.faab.remaining} remaining</small>`:''}${waiverOfferIntelHtml(o)}</li>`;
export function rosterCoachHtml({plan,rescue=[],checkedAt,league}){
  const alerts=rescue.filter(r=>r.actionable);
  const status=plan.state==='schedule-unavailable'?'Kickoff status unavailable.':plan.state!=='ready'?'Fresh roster advice unavailable.':!plan.offers.length?'Hold your depth.':'';
  const keep=plan.state==='ready'&&!plan.offers.length?plan.keep?.[0]:null;
  return `<section class="wo-panel roster-coach" aria-label="Waivers and lineup alerts"><header class="wo-head"><div><small>ROSTER COACH</small><h2>Waivers &amp; backup plan</h2></div><button type="button" class="linkbtn" data-coach-refresh aria-label="Refresh waiver advice">Refresh</button></header>
    ${alerts.length?`<ul class="wo-alarms coach-alerts">${alerts.map(a=>`<li><strong>${esc(a.player.name)} · ${esc(a.status)}</strong><span>${a.backup?`${esc(a.backup.name)} can fill ${esc(a.slot)}${a.severity==='questionable'?(a.lateCover?' · late-game cover':' · kicks off earlier'):''}.`:`No healthy, unlocked ${esc(a.slot)} backup.`}</span></li>`).join('')}</ul>`:''}
    ${status?keep?`<div class="coach-hold" role="status"><strong data-ui-name title="${esc(keep.name)}">Keep ${esc(keep.name)}</strong><span data-ui-name title="${esc(keep.reason)}">${esc(keep.reason)}</span></div>`:`<p role="status">${esc(status)}</p>`:`<ol class="coach-pickups">${plan.offers.slice(0,1).map(pickupHtml).join('')}</ol>${plan.offers.length>1?`<details class="coach-more"><summary>More pickups · ${plan.offers.length-1}</summary><ol class="coach-pickups">${plan.offers.slice(1).map(pickupHtml).join('')}</ol></details>`:''}`}
    ${waiverMarketHtml(plan)}${waiverDropsHtml(plan)}
    <footer>${sleeperAction(league?.league_id,'waivers',{label:'Waivers in Sleeper'})}<small>${checkedAt?`Checked ${esc(new Date(checkedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))} · `:''}${plan.futureCount||0}-week outlook</small></footer></section>`;
}
export function mountRosterCoach(host,input){
  let stopped=false,busy=false;
  const draw=async()=>{
    if(stopped||!host.isConnected||busy)return;busy=true;
    const open=[...host.querySelectorAll('details[open]')].map(el=>el.dataset.coachDetail||el.className),focused=host.contains(document.activeElement);
    const retry=host.querySelector('[data-coach-retry],[data-coach-refresh]');if(retry)retry.disabled=true;
    try{const result=await loadRosterCoach(input);if(stopped||!host.isConnected)return;host.innerHTML=rosterCoachHtml(result);host.querySelectorAll('details').forEach(el=>{if(open.includes(el.dataset.coachDetail||el.className))el.open=true});host.querySelector('[data-coach-refresh]')?.addEventListener('click',()=>{clearRosterCoachCache();void draw()});if(focused)host.querySelector('[data-coach-refresh]')?.focus({preventScroll:true})}
    catch{if(!stopped&&host.isConnected){host.innerHTML='<section class="wo-panel roster-coach"><h2>Waivers &amp; backup plan</h2><p role="status">Fresh roster advice couldn’t load.</p><button type="button" class="btn ghost" data-coach-retry>Retry roster advice</button></section>';host.querySelector('button').addEventListener('click',draw);if(focused)host.querySelector('button').focus({preventScroll:true})}}
    finally{busy=false}
  };
  host.innerHTML='<section class="wo-panel roster-coach"><h2>Waivers &amp; backup plan</h2><p role="status">Checking free agents and kickoff locks…</p></section>';
  void draw();return ()=>{stopped=true};
}
