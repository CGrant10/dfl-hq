import {esc} from './ui.js';
import {team,teamLogoUrl} from './nfl-teams.js';
import {nflBoxscore,nflGameLeaders,nflQuarterScores,nflShortName} from './nfl-stats-model.js';
const value=v=>v===null?'—':String(v);
const photo=p=>`<span class="nfl-stat-photo"><img src="https://a.espncdn.com/i/headshots/nfl/players/full/${esc(p.id)}.png" alt="" width="28" height="28" loading="lazy" decoding="async" onerror="if(!this.dataset.fallback){this.dataset.fallback='1';this.src='${esc(teamLogoUrl(p.nflTeam))}'}"></span>`;
export function nflStatsMarkup(summary,sides,{uid,club=''}={}){
 const clubs=nflBoxscore(summary,sides),leaders=nflGameLeaders(clubs),quarters=nflQuarterScores(summary,sides),selected=clubs.find(t=>t.code===club)||clubs[0];
 if(!sides.length)return '<p class="nfl-center-empty">Choose a game to see NFL stats.</p>';
 return `<section class="nfl-boxscore" aria-label="NFL game statistics"><h3>Scoreboard</h3><div class="nfl-quarter-wrap" data-no-game-swipe><table class="nfl-quarter-table"><thead><tr><th scope="col">Team</th>${quarters.columns.map(c=>`<th scope="col">${c}</th>`).join('')}<th scope="col">TOT</th></tr></thead><tbody>${quarters.teams.map(t=>`<tr><th scope="row"><img src="${esc(teamLogoUrl(t.code))}" alt="" width="22" height="22"><span>${esc(t.code)} ${esc(team(t.code)?.name?.split(' ').at(-1)||'')}</span></th>${t.periods.map(n=>`<td>${value(n)}</td>`).join('')}<td><b>${value(t.score)}</b></td></tr>`).join('')}</tbody></table></div>
 <h3>Game leaders</h3><div class="nfl-stat-leaders">${leaders.map(row=>`<div class="nfl-stat-leader-row">${row.sides.map((p,i)=>`${i===1?`<small class="nfl-stat-category">${row.label}</small>`:''}<div class="nfl-stat-leader is-${i?'home':'away'}">${p?`<div>${photo(p)}<strong title="${esc(p.name)}">${esc(nflShortName(p.name))}${p.tied>1?` <small>+${p.tied-1}</small>`:''}</strong></div><span><img src="${esc(teamLogoUrl(p.nflTeam))}" alt="" width="12" height="12">${esc(p.nflTeam)}${p.position?' · '+esc(p.position):''}</span><p>${esc(p.line)}</p>`:'<span>No stats yet</span>'}</div>`).join('')}</div>`).join('')||'<p class="nfl-center-empty">No game leaders yet.</p>'}</div>
 <div class="nfl-box-team-tabs" role="group" aria-label="Box score team">${clubs.map(t=>`<button type="button" data-nfl-box-team="${esc(t.code)}" aria-pressed="${selected?.code===t.code}"><img src="${esc(teamLogoUrl(t.code))}" alt="" width="20" height="20">${esc(t.code)}</button>`).join('')}</div>
 <div data-nfl-box-tables>${selected?.groups.map(g=>`<section class="nfl-stat-group" aria-label="${esc(selected.code+' '+g.title)}"><h4>${g.title}</h4><div class="nfl-stat-table-scroll" data-no-game-swipe tabindex="0" role="region" aria-label="${esc(g.title)} stats"><table><thead><tr><th scope="col">Player</th>${g.columns.map(c=>`<th scope="col">${esc(c)}</th>`).join('')}</tr></thead><tbody>${g.rows.map(p=>`<tr id="${uid}-box-${esc(g.category)}-${esc(p.id)}"><th scope="row" title="${esc(p.name)}">${esc(nflShortName(p.name))}</th>${p.values.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`).join('')||'<p class="nfl-center-empty">No player stats yet.</p>'}</div></section>`;
}

export function nflQuarterMarkup(summary,sides){
 const quarters=nflQuarterScores(summary,sides);
 return `<div class="nfl-quarter-wrap" data-no-game-swipe><table class="nfl-quarter-table"><thead><tr><th scope="col">Team</th>${quarters.columns.map(c=>`<th scope="col">${c}</th>`).join('')}<th scope="col">TOT</th></tr></thead><tbody>${quarters.teams.map(t=>`<tr><th scope="row"><img src="${esc(teamLogoUrl(t.code))}" alt="" width="22" height="22"><span>${esc(t.code)}</span></th>${t.periods.map(n=>`<td>${value(n)}</td>`).join('')}<td><b>${value(t.score)}</b></td></tr>`).join('')}</tbody></table></div>`;
}
export function nflTeamBoxMarkup(summary,sides,club,{uid}){
 const full=nflStatsMarkup(summary,sides,{uid,club});return full.slice(full.indexOf('<div data-nfl-box-tables>'),full.lastIndexOf('</section>'));
}
