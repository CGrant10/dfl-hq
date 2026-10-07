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
 template:'trade',trade:t,
 kind:'Trade receipt',context:t.multi?`${t.partyCount||t.deltas?.length||t.columns.length}-team deal`:`${t.forWhom} / ${t.against}`,
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
 template:'ticket',ticket:t,
 kind:'Sportsbook ticket',context:[t.season,t.who].filter(Boolean).join(' / '),headline:t.title.toUpperCase(),summary:t.market,
 status:t.pulled?'Pulled':t.status==='open'?`All ${t.picks.length} picks must land`:t.picks.length>1?`${t.status.toUpperCase()} · ${t.won} of ${t.picks.length} picks won`:t.status,
 results:[{label:'Odds',value:t.odds},{label:t.pulled?'Refunded':'Stake',value:String(t.stake)},{label:t.status==='won'?'Paid':t.status==='lost'?'Returned':t.status==='void'?'Void':'To return',value:t.status==='lost'?'0':t.status==='void'?'—':String(t.ret)}],
 sections:[{label:'Your picks',rows:t.picks.map(p=>({name:p.pick,value:p.odds,detail:[p.market,p.status].filter(Boolean).join(' · ')}))},...(t.status==='open'?[{label:'Potential profit',rows:[{name:`${t.profit} SIN profit if ${t.picks.length>1?'all picks land':'the pick lands'}`}]}]:[])],
 footer:'SIN is play money · No cash value'
}}
export function aftermathShareSpec(card){
 const highlights=(card.highlights||[]).map(h=>({label:h.label,name:h.title,detail:h.detail})),mvp=card.players?.starters?.find(p=>p.points!=null&&Number.isFinite(Number(p.points)));
 const detailSections=[...['starters','bench'].map(key=>({label:key==='starters'?'Started & showed out':'Wasted on the bench',rows:(card.players?.[key]||[]).map(p=>({name:p.name,value:`${n(p.points)} pts`,detail:[p.position,p.nflTeam,p.owner].filter(Boolean).join(' · ')}))})),...(card.games?.length?[{label:'League scores',rows:card.games.map(g=>({name:`${g.winner.name} vs ${g.loser.name}`,value:`${n(g.winner.value)} – ${n(g.loser.value)}`,detail:`Margin ${n(g.margin)}`}))}]:[])];
 return {
 template:'recap',recap:{title:`WEEK ${String(card.week).padStart(2,'0')}\nRECEIPTS.`,hero:{label:'Final boss',name:card.king?.name||highlights[0]?.name,value:card.king?n(card.king.value):null,detail:card.king?'':highlights[0]?.detail},mvp:mvp?{...mvp,label:'LEAGUE MVP'}:null,highlights:highlights.slice(1),allHighlights:highlights,story:card.story},detailSections,
 kind:'Weekly aftermath',context:`${card.season} / WEEK ${String(card.week).padStart(2,'0')}`,headline:(card.title||card.label||'WEEKLY\nRECEIPTS.').toUpperCase(),status:'Final',summary:card.story,
 sections:[...(card.highlights||[]).map(h=>({label:h.label,rows:[{name:h.title,detail:h.detail}]})),...['starters','bench'].map(key=>({label:key==='starters'?'Started & showed out':'Wasted on the bench',rows:(card.players?.[key]||[]).map(p=>({name:p.name,value:`${n(p.points)} pts`,detail:[p.position,p.nflTeam,p.owner].filter(Boolean).join(' · ')}))}))],
 players:sharePlayers([...(card.players?.starters||[]),...(card.players?.bench||[])]),footer:'Weekly aftermath'
}}

export function profileShareSpec(d){return {
 template:'profile',profile:d,kind:'Member profile',context:d.team,headline:d.who,
 results:[{label:'Record',value:d.record},{label:'Win percentage',value:d.winPct==null?'—':`${Math.round(d.winPct*100)}%`},{label:'Points',value:d.points},{label:'Average finish',value:d.avgFinish},{label:'Seasons',value:String(d.seasons)}],
 sections:[{label:'Trophy case',rows:d.trophyCase.map(([name,value])=>({name,value}))},{label:'Crime scene',rows:d.crimeScene.map(([name,value])=>({name,value}))},{label:'DFLyzer verdict',copy:d.verdict}],footer:'Member profile · DFL scouting report'
}}

export function clubhouseShareSpec(model){
 const score=value=>value==null?'—':Number(value).toFixed(2),awards=model.awards.map(a=>({label:a.label,name:a.winners.map(w=>w.name).join(' & '),detail:[...a.winners.map(w=>w.playerName).filter(Boolean),a.detail].join(' · ')})),boss=model.awards.find(a=>a.key==='high-score')||model.awards[0],index=model.awards.indexOf(boss);
 const hero={label:boss?.label||'Week highlights',name:boss?.winners.map(w=>w.name).join(' & ')||'No awards yet',value:boss?.key==='high-score'?score(boss.winners[0]?.score):null,detail:boss?.key==='high-score'?'':boss?.detail};
 const games={label:'League scores',rows:model.games.map(g=>({name:`${g.left.name} vs ${g.right.name}`,value:`${score(g.left.score)} – ${score(g.right.score)}`}))};
 return {template:'recap',recap:{title:`WEEK ${String(model.week).padStart(2,'0')}\nRECEIPTS.`,hero,highlights:awards.filter((_,i)=>i!==index),allHighlights:awards},detailSections:[games],kind:'Clubhouse recap',context:`${model.season} / WEEK ${model.week}`,headline:`WEEK ${model.week}\nRECEIPTS.`,status:'Final',sections:[...model.awards.map(a=>({label:a.label,rows:a.winners.map(w=>({name:w.name,detail:[w.playerName,a.detail].filter(Boolean).join(' · ')}))})),games],players:sharePlayers(model.awards.flatMap(a=>a.winners.map(w=>({id:w.player,name:w.playerName})))),footer:'Clubhouse recap · Final scores'};
}
