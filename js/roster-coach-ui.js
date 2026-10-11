import {esc} from './ui.js';
import {loadRosterCoach} from './roster-coach-data.js';
const pts=n=>Number(n).toFixed(1);
const pickupHtml=o=>`<li><div><small>${esc(o.kind)} · WEEK ${esc(o.targetWeek)}</small><strong>ADD ${esc(o.player.name)}</strong><span>${esc(o.player.position)} · ${pts(o.player.points)} projected this week</span></div><p>${o.drop?`DROP <strong>${esc(o.drop.name)}</strong>`:'Open roster spot · no drop needed'}</p><p class="coach-gains">${o.gains.filter(g=>g.gain!==null).map(g=>`W${g.week}: ${g.gain>=0?'+':''}${pts(g.gain)} lineup pts`).join(' · ')}</p>${o.faab?`<small>Suggested FAAB: ${o.faab.min}–${o.faab.max} · ${o.faab.remaining} remaining</small>`:''}</li>`;
export function rosterCoachHtml({plan,rescue=[],checkedAt,league}){
  const alerts=rescue.filter(r=>r.actionable);
  const url=`https://sleeper.com/leagues/${encodeURIComponent(league.league_id)}/team`;
  const status=plan.state==='schedule-unavailable'?'NFL kickoff status unavailable. Refresh before checking pickups.':plan.state!=='ready'?'Full, fresh league rosters are needed to check available players.':!plan.offers.length?'No clear pickup/drop improvement found. Keep your depth.':'';
  return `<section class="wo-panel roster-coach" aria-label="Waivers and lineup alerts"><header class="wo-head"><div><small>ROSTER COACH</small><h2>Waivers &amp; backup plan</h2></div></header>
    ${alerts.length?`<ul class="wo-alarms coach-alerts">${alerts.map(a=>`<li><strong>${esc(a.player.name)} · ${esc(a.status)}</strong><span>${a.backup?`${esc(a.backup.name)} can fill ${esc(a.slot)}${a.severity==='questionable'?(a.lateCover?' · late-game cover':' · kicks off earlier'):''}.`:`No healthy, unlocked ${esc(a.slot)} backup.`}</span></li>`).join('')}</ul>`:''}
    ${status?`<p role="status">${esc(status)}</p>`:`<ol class="coach-pickups">${plan.offers.slice(0,1).map(pickupHtml).join('')}</ol>${plan.offers.length>1?`<details class="coach-more"><summary>More pickups · ${plan.offers.length-1}</summary><ol class="coach-pickups">${plan.offers.slice(1).map(pickupHtml).join('')}</ol></details>`:''}`}
    <footer><a class="btn ghost small" href="${esc(url)}" target="_blank" rel="noopener">Make changes in Sleeper</a><small>${checkedAt?`Checked ${esc(new Date(checkedAt).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'}))} · `:''}${plan.futureCount||0} projection week${plan.futureCount===1?'':'s'} available. Picks compare legal lineups; ${plan.offers?.some(o=>o.faab)?'FAAB is a conservative guide, not a winning-bid prediction.':'ownership and kickoff locks can change.'}</small></footer></section>`;
}
export function mountRosterCoach(host,input){
  let stopped=false,busy=false;
  const draw=async()=>{
    if(stopped||!host.isConnected||busy)return;busy=true;
    const retry=host.querySelector('[data-coach-retry]');if(retry)retry.disabled=true;
    try{const result=await loadRosterCoach(input);if(stopped||!host.isConnected)return;host.innerHTML=rosterCoachHtml(result)}
    catch{if(!stopped&&host.isConnected){host.innerHTML='<section class="wo-panel roster-coach"><h2>Waivers &amp; backup plan</h2><p role="status">Fresh roster advice couldn’t load.</p><button type="button" class="btn ghost" data-coach-retry>Retry roster advice</button></section>';host.querySelector('button').addEventListener('click',draw)}}
    finally{busy=false}
  };
  host.innerHTML='<section class="wo-panel roster-coach"><h2>Waivers &amp; backup plan</h2><p role="status">Checking free agents and kickoff locks…</p></section>';
  void draw();return ()=>{stopped=true};
}
