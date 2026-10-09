import {esc} from './ui.js';
import {playerRowContent} from './game-day-player-rows.js';

const order=['QB','RB','WR','TE','FLEX','SUPER_FLEX','K','DEF'];
const typeOf=p=>({WRRB_FLEX:'FLEX',REC_FLEX:'FLEX',Flex:'FLEX',Superflex:'SUPER_FLEX',Kicker:'K',Def:'DEF',DST:'DEF','D/ST':'DEF'}[p.slotType||p.slot||p.position]||p.slotType||p.slot||p.position||'Starter');
const labelOf=type=>({SUPER_FLEX:'SFLX',DEF:'D/ST'}[type]||type);

// Pair submitted lineup slots, not a flex player's NFL position or points rank.
export function matchupPlayerPairs(left=[],right=[]) {
  const group=players=>{
    const groups=new Map();
    for(const p of players){const type=typeOf(p);if(!groups.has(type))groups.set(type,[]);groups.get(type).push(p)}
    for(const rows of groups.values())rows.sort((a,b)=>(a.slotIndex??0)-(b.slotIndex??0));
    return groups;
  };
  const a=group(left),b=group(right),types=[...new Set([...a.keys(),...b.keys()])];
  types.sort((x,y)=>(order.includes(x)?order.indexOf(x):99)-(order.includes(y)?order.indexOf(y):99));
  return types.flatMap(type=>{
    const l=a.get(type)||[],r=b.get(type)||[],count=Math.max(l.length,r.length);
    return Array.from({length:count},(_,i)=>({key:`${type}:${i}`,label:`${labelOf(type)}${count>1?` ${i+1}`:''}`,left:l[i]||null,right:r[i]||null}));
  });
}

const playerCell=(player,team,key)=>`<div class="gameday-player gd-compare-player" data-gameday-row="${esc(player?`${player.roster}:${player.id}`:`missing:${team.roster}:${key}`)}" role="group" aria-label="${esc(team.name)} player">${player?playerRowContent(player,{showSlot:false}):`<span class="gd-lineup-missing">${team.lineup?.length?'No player in slot':'Lineup unavailable'}</span><span class="gd-lineup-missing-score" aria-label="Points unavailable">—</span>`}</div>`;
const pairedRows=(pairs,a,b,statLines=null)=>`<ul class="gd-lineup-pairs">${pairs.map(row=>`<li class="gd-compare-row" data-compare-slot="${esc(row.key)}" aria-label="${esc(row.label)} comparison">${playerCell(row.left,a,row.key)}<span class="gd-compare-slot">${esc(row.label)}</span>${playerCell(row.right,b,row.key)}${statLines?[row.left,row.right].map((p,i)=>`<p data-clubhouse-stat-key="${esc(p?`${p.roster}:${p.id}`:'')}" class="gd-player-stat-line is-${i?'right':'left'}">${esc(p&&!p.empty?statLines.get(`${p.roster}:${p.id}`)||'No box score yet':'')}</p>`).join(''):''}</li>`).join('')}</ul>`;

export function matchupLineupHtml(game,{statLines=null}={}) {
  const [a,b]=game.sides,pairs=matchupPlayerPairs(a.lineup,b.lineup);
  const bench=side=>(side.bench||[]).map(p=>({...p,slot:p.position,slotType:p.position}));
  const benches=matchupPlayerPairs(bench(a),bench(b));
  const header=`<div class="gd-compare-head">${[a,b].map((t,i)=>`${i?'<span aria-hidden="true"></span>':''}<strong>${esc(t.name)}</strong>`).join('')}</div>`;
  return `<section class="gd-lineup-comparison" aria-label="Side-by-side player comparison"><h3>Starting lineups</h3>${header}${pairs.length?pairedRows(pairs,a,b,statLines):'<p role="status">Starting lineups unavailable.</p>'}${benches.length?`<details class="gameday-bench gd-compare-bench" data-watch-bench="${esc(game.id)}"><summary>Bench · ${a.bench?.length||0} / ${b.bench?.length||0} players</summary>${pairedRows(benches,a,b,statLines)}</details>`:''}</section>`;
}
