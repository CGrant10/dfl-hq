const n=value=>value==null?'—':Number(value).toFixed(2);
const signed=value=>`${Number(value)>0?'+':''}${Number(value||0).toFixed(1)}`;
export function sharePlayers(players=[]){
 const seen=new Set();return players.filter(p=>{const id=String(p?.id||p?.player_id||p?.player||'');if(!/^\d+$/.test(id)||Number(id)===0||String(p.position||p.player_pos||'').toUpperCase()==='DEF'||seen.has(id))return false;seen.add(id);return true}).map(p=>({...p,id:String(p.id||p.player_id||p.player),name:p.name||p.playerName||'Player'}));
}
export function matchupShareSpec(data){return {
 kind:'Matchup final',context:`${data.season} / WEEK ${String(data.week).padStart(2,'0')}`,
 headline:data.winner?'BRAGGING\nRIGHTS.':'ALL\nSQUARE.',photoHeadline:data.winner?.name||'All square.',photoCaption:data.winner?`Wins by ${n(data.margin)}`:'Final · Tied',
 summary:data.winner?`${data.winner.name} wins by ${n(data.margin)}`:'Final · Tied',status:'Final',
 results:data.sides.map(t=>({label:t.name,value:n(t.score)})),
 sections:data.mvp?[{label:'Matchup MVP',prominent:true,rows:[{name:data.mvp.name,value:`${n(data.mvp.points)} pts`}]}]:[],
 players:sharePlayers(data.mvp?[data.mvp]:[]),footer:'Draft · Golf · Sin · Fold'
}}
export function tradeShareSpec(t){return {
 kind:'Trade receipt',context:t.multi?`${t.columns.length}-team deal`:`${t.forWhom} / ${t.against}`,
 headline:`${t.call||'TRADE'}\nTHE DEAL.`,photoHeadline:`${t.call||'TRADE'}\nTHE DEAL.`,
 summary:[t.headline,t.winner?`${t.winner} wins value`:null].filter(Boolean).join(' · '),
 results:[{label:'Trade balance',value:`${t.fairness}%`}],
 sections:[...t.columns.map(c=>({label:`${c.from} → ${c.to}`,rows:[...c.players.map(p=>({name:p.name,value:String(p.value),detail:p.meta})),{name:'Package value',value:String(c.total)}]})),
 ...(t.remarks||[]).map(r=>({label:r.title,copy:r.copy})),
 {label:'Lineup impact',rows:t.deltas.map(d=>({name:d.team,value:`${signed(d.delta)} / wk`}))}],
 players:sharePlayers(t.columns.flatMap(c=>c.players)),footer:'DFLyzer · Model estimate, not a promise'
}}
export function keeperShareSpec(board){return {
 kind:'Keeper board',context:String(board.season),headline:'KEEPER\nBOARD.',summary:`${board.submitted} of ${board.total} submitted`,
 sections:[...board.rows,...(board.also?.length?[{team:'Unmatched entries',keepers:board.also}]:[])].map(r=>({label:r.team||r.member,rows:r.keepers.length?r.keepers.map(k=>({name:k.name,value:k.round==null?'—':`R${k.round}`,detail:[k.where,k.tenure?.max?`Year ${k.tenure.year}/${k.tenure.max}`:null,k.overridden?'Round overridden':null].filter(Boolean).join(' · ')})):[{name:'No keepers submitted'}]})),
 players:sharePlayers([...board.rows.flatMap(r=>r.keepers),...(board.also||[])]),footer:board.rulesLine||'Keeper board'
}}
export function ticketShareSpec(t){return {
 kind:'Sportsbook ticket',context:[t.season,t.who].filter(Boolean).join(' / '),headline:t.title.toUpperCase(),summary:t.market,
 status:t.pulled?'Pulled':t.status==='open'?`All ${t.picks.length} picks must land`:t.picks.length>1?`${t.status.toUpperCase()} · ${t.won} of ${t.picks.length} picks won`:t.status,
 results:[{label:'Odds',value:t.odds},{label:t.pulled?'Refunded':'Stake',value:String(t.stake)},{label:t.status==='won'?'Paid':t.status==='lost'?'Returned':t.status==='void'?'Void':'To return',value:t.status==='lost'?'0':t.status==='void'?'—':String(t.ret)}],
 sections:[{label:'Your picks',rows:t.picks.map(p=>({name:p.pick,value:p.odds,detail:[p.market,p.status].filter(Boolean).join(' · ')}))},...(t.status==='open'?[{label:'Potential profit',rows:[{name:`${t.profit} SIN profit if ${t.picks.length>1?'all picks land':'the pick lands'}`}]}]:[])],
 footer:'SIN is play money · No cash value'
}}
export function aftermathShareSpec(card){return {
 kind:'Weekly aftermath',context:`${card.season} / WEEK ${String(card.week).padStart(2,'0')}`,headline:(card.title||card.label||'WEEKLY\nRECEIPTS.').toUpperCase(),status:'Final',summary:card.story,
 sections:[...(card.highlights||[]).map(h=>({label:h.label,rows:[{name:h.title,detail:h.detail}]})),...['starters','bench'].map(key=>({label:key==='starters'?'Started & showed out':'Wasted on the bench',rows:(card.players?.[key]||[]).map(p=>({name:p.name,value:`${n(p.points)} pts`,detail:[p.position,p.nflTeam,p.owner].filter(Boolean).join(' · ')}))}))],
 players:sharePlayers([...(card.players?.starters||[]),...(card.players?.bench||[])]),footer:'Weekly aftermath'
}}
