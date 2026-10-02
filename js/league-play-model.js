import { headToHead } from './lore.js';
export function filterFacts(facts, {filter='all', query='', userId=''}={}) {
 const term=query.trim().toLowerCase();
 return facts.filter(f=> (!term||`${f.headline} ${f.detail} ${f.season||''}`.toLowerCase().includes(term)) &&
  (filter==='all'||filter==='mine'&&(f.userIds||[]).includes(String(userId))||filter==='rivalries'&&(['rivalry','mostplayed'].includes(f.id)||f.kind==='rivalry')||filter==='titles'&&f.kind==='title'||filter==='records'&&['high','low','nailbiter','blowout','streak'].includes(f.kind)&&!['rivalry','playoffs'].includes(f.id)));
}
export function rivalryFor(lore, game, season, week) {
 if(!lore||!game.left.uid||!game.right.uid)return null;
 // Exclude this selected week and everything after it from the pregame dossier.
 const before={...lore,matchups:lore.matchups.filter(g=>Number(g.season)<season||Number(g.season)===season&&Number(g.week)<week)};
 return headToHead(before,game.left.uid).find(r=>String(r.user)===String(game.right.uid))||null;
}
export function gradeCall(call, games, completed) {
 if(!completed)return {label:'Pending',correct:null};
 const game=games.find(g=>Number(g.matchup_id)===Number(call.matchup_id));
 if(!game||game.left.score===null||game.right.score===null)return{label:'Awaiting scores',correct:null};
 if(call.kind==='high-score'){const teams=games.flatMap(g=>[g.left,g.right]);if(teams.some(t=>t.score===null))return{label:'Awaiting scores',correct:null};const selected=[game.left,game.right].find(t=>Number(t.roster)===Number(call.roster_id)),correct=selected?.score===Math.max(...teams.map(t=>t.score));return{label:correct?'Called it':'Missed it',correct}}
 if(game.left.score===game.right.score)return{label:'Tie · no winner',correct:false};
 const winner=game.left.score>game.right.score?game.left:game.right;
 const correct=Number(winner.roster)===Number(call.roster_id);
 return{label:correct?'Called it':'Missed it',correct};
}
export function rankTrivia(rows) {
 const totals=new Map();for(const row of rows){const key=String(row.member_id),old=totals.get(key)||{memberId:row.member_id,correct:0,played:0};old.correct+=Number(row.correct)||0;old.played++;totals.set(key,old)}
 return [...totals.values()].sort((a,b)=>b.correct-a.correct||a.played-b.played).map((r,i,all)=>({...r,rank:1+all.slice(0,i).filter(x=>x.correct>r.correct).length}));
}
