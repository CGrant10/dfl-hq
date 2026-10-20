import {esc} from './ui.js';
import {teamPortrait} from './team-presentation.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';
const fixed=n=>n==null?'—':Number(n).toFixed(1);
const movement=r=>r.previousRank==null?'NEW':r.movement>0?`↑${r.movement}`:r.movement<0?`↓${Math.abs(r.movement)}`:'—';
const moveLabel=r=>r.previousRank==null?'First edition':r.movement?`${r.movement>0?'Up':'Down'} ${Math.abs(r.movement)} places from ${r.previousRank}`:`Unchanged at ${r.rank}`;
function teamFor(view,row,members){
 const team=view.allTeams?.find(t=>String(t.id)===String(row.id))||{};
 return {...team,team_name:row.name,identity:team.identity||members.find(m=>String(m.sleeper_user_id)===String(team.sleeper_user_id))};
}
function trend(row){
 const h=row.history.slice(-3);if(h.length<2)return '';
 const low=Math.min(...h.map(v=>v.points)),high=Math.max(...h.map(v=>v.points)),range=high-low||1;
 return `<svg class="power-spark" viewBox="0 0 40 14" aria-hidden="true"><polyline points="${h.map((v,i)=>`${2+i*36/(h.length-1)},${12-(v.points-low)/range*10}`).join(' ')}"/></svg>`;
}
export function powerRankingsMarkup(view,members=[],index=null){
 const rankings=view?.powerRankings,boards=rankings?.boards||[],at=index??boards.length-1,board=boards[at];
 if(!board?.rows?.length)return '<section class="home-rankings-card is-loading"><strong>Power rankings</strong><p>Rankings unavailable.</p></section>';
 const focus=board.rows.find(r=>String(r.id)===String(view.focus?.id));
 const identity=r=>teamFor(view,r,members);
 const showFocus=focus&&focus.rank>3;
 const mover=[...board.rows].filter(r=>r.movement>=2).sort((a,b)=>b.movement-a.movement||a.rank-b.rank)[0];
 return `<section class="home-rankings-card power-edition" data-power-edition="${esc(`${rankings.model||board.model}:${board.week}:${board.publishedAt||'preview'}`)}">
 <header><h2 class="section-title">Power rankings</h2><span class="power-edition-state">${board.week?board.published?board.reconstructed?'Rebuilt':'Published':'Preview':'Roster model'}</span></header>
 <div class="power-week-nav" aria-label="Ranking week"><button type="button" data-power-week="-1" aria-label="Previous ranking week"${at<=0?' disabled':''}>‹</button><strong>${esc(board.label)}</strong><button type="button" data-power-week="1" aria-label="Next ranking week"${at>=boards.length-1?' disabled':''}>›</button></div>
 ${mover?`<button type="button" class="power-mover" data-power-team="${esc(mover.id)}"><span>BIGGEST CLIMBER</span><strong>${esc(mover.name)}</strong><b>↑${mover.movement}</b></button>`:''}
 <div class="home-rank-head"><span>Rank</span><span>Team</span><span>Power</span><span>Move</span></div>
 <ol>${board.rows.map((r,i)=>`${i===3&&showFocus?'<li class="home-rank-ellipsis" aria-hidden="true">•••</li>':''}<li class="${r.id===focus?.id?'is-me ':''}${i>=3&&r.id!==focus?.id?'is-rank-collapsed ':''}${i===0?'is-power-leader':''}" data-power-id="${esc(r.id)}"><button type="button" data-power-team="${esc(r.id)}" aria-label="${esc(`${r.name}, power rank ${r.rank}, score ${fixed(r.score)}, ${moveLabel(r)}. Open ranking details.`)}"><b>${r.rank}</b>${teamPortrait(identity(r),{className:'home-rank-face home-rank-initials'})}<span class="power-team-copy"><strong>${esc(r.name)}</strong><small><span data-power-record>${esc(r.record)}</span>${i===0?'<span class="power-top-dog">TOP DOG</span>':trend(r)}</small></span><em>${fixed(r.score)}</em><span class="power-rank-move ${r.movement>0?'is-up':r.movement<0?'is-down':'is-even'}" aria-label="${esc(moveLabel(r))}">${movement(r)}</span></button></li>`).join('')}</ol>
 <button class="home-rank-all" type="button" data-home-rank-toggle aria-expanded="false"><span>View all ${board.rows.length}</span><svg class="ico-sm" aria-hidden="true"><use href="#home-ui-arrow-right"></use></svg></button></section>`;
}
export function powerDetailMarkup(row,board,previous,liveForecast,team={}){
 const before=previous?.rows.find(r=>r.id===row.id),delta=before?row.score-before.score:null;
 const reason=!board.week?'Current roster model.':row.previousRank==null?'First weekly edition.':row.movement===0?`Holds #${row.rank}.`:`${row.movement>0?'Up':'Down'} ${Math.abs(row.movement)} from #${row.previousRank}.`;
 const history=row.history.slice(-3),max=Math.max(1,...history.map(v=>Math.max(0,v.points)));
 const recent=history.length?history.reduce((sum,v,i)=>sum+v.relative*(i+1),0)/history.reduce((sum,_,i)=>sum+i+1,0):null;
 return `<header><div class="power-detail-identity">${teamPortrait({...team,team_name:row.name},{className:'power-detail-face'})}<div><small>DFL POWER · ${esc(board.label)}</small><h2 id="power-detail-title">${esc(row.name)}</h2></div></div><button type="button" data-power-close aria-label="Close ranking details">×</button></header>
 <div class="power-detail-score"><span><small>POWER RANK</small><strong>#${row.rank}</strong></span><span><small>POWER SCORE</small><strong>${fixed(row.score)}</strong></span><b aria-label="${esc(moveLabel(row))}">${movement(row)}</b></div>
 <p class="power-roast">${esc(row.banter||'New edition. Bring the receipts.')}</p>
 <p class="power-movement-reason">${esc(reason)}${delta==null?'':` <b>Power ${delta>=0?'+':''}${fixed(delta)}</b>`}</p>
 <dl class="power-facts"><div><dt>Record</dt><dd>${esc(row.record)}</dd></div><div><dt>All-play</dt><dd>${row.allPlayRate==null?'—':`${Math.round(row.allPlayRate*100)}%`}<small>${esc(row.allPlayRecord||'No completed games')}</small></dd></div><div><dt>Points / game</dt><dd>${fixed(row.pointsPerGame)}<small>${history.length?`#${row.scoringRank} in scoring`:'No completed games'}</small></dd></div><div><dt>Recent scoring</dt><dd>${recent==null?'—':`${Math.round(recent*100)}%`}<small>Weighted vs league median</small></dd></div><div><dt>${board.published?'Published lineup':board.forecastSource==='season-baseline'?'Roster baseline':'Lineup forecast'}</dt><dd>${fixed(row.forecast)}<small>${row.forecast==null?'Results-only edition':board.forecastSource==='season-baseline'?'Season projection baseline':`Week ${board.forecastWeek} projection`}</small></dd></div>${liveForecast?.complete&&Math.abs((liveForecast.points??0)-(row.forecast??0))>=.1?`<div><dt>Current lineup</dt><dd>${fixed(liveForecast.points)}<small>Available starting nine</small></dd></div>`:''}</dl>
 ${history.length?`<section class="power-trend"><h3>Last ${history.length} ${history.length===1?'week':'weeks'}</h3><ol>${history.map(v=>`<li><strong>${fixed(v.points)}</strong><i aria-hidden="true" style="--bar:${Math.max(2,Math.max(0,v.points)/max*100)}%"></i><small>Week ${v.week}</small></li>`).join('')}</ol></section>`:''}
 <footer>${board.published?`${board.reconstructed?'Rebuilt':'Published'} ${esc(new Date(board.publishedAt).toLocaleDateString())}`:'Calculated preview'} · ${board.rosterWeight?`${Math.round(board.rosterWeight*100)}% lineup / ${Math.round(100-board.rosterWeight*100)}% results`:'Completed results only'}</footer>`;
}
export function mountPowerRankings(root,view,members=[]){
 const boards=view?.powerRankings?.boards;if(!root||!boards?.length)return()=>{};
 let index=boards.length-1,observer=null,dialog=null,stopped=false;
 const nodes=()=>[...root.querySelectorAll('[data-power-id]')].filter(e=>e.getClientRects().length);
 const animateRows=()=>{
  const previous=boards[index-1],visible=nodes(),old=previous?.rows.filter(r=>r.rank<=3||r.id===String(view.focus?.id)).map(r=>r.id)||[];
  const edge=visible[0]?.getBoundingClientRect().height||64;
  visible.forEach((node,i)=>{const was=old.indexOf(node.dataset.powerId),dy=was<0?18:Math.max(-120,Math.min(120,(was-i)*edge));animateUi(node,[{opacity:was<0?0:.65,transform:`translateY(${dy}px)`},{opacity:1,transform:'translateY(0)'}],{duration:460,delay:i*35});});
  const rising=boards[index].rows.filter(r=>r.movement>0).sort((a,b)=>b.movement-a.movement)[0],node=visible.find(e=>e.dataset.powerId===rising?.id)?.querySelector('button');
  if(node)animateUi(node,[{background:'var(--bg-3)'},{background:'transparent'}],{duration:900});
 };
 const reveal=()=>{if(stopped)return;const signature=root.querySelector('[data-power-edition]')?.dataset.powerEdition;let seen=false;try{seen=localStorage.getItem('dfl.power.revealed')===signature;localStorage.setItem('dfl.power.revealed',signature);}catch{}if(!seen)animateRows();observer?.disconnect();};
 const card=root.querySelector('.power-edition');
 if(card&&typeof IntersectionObserver==='function'){observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))reveal();},{threshold:.2});observer.observe(card);}else reveal();
 const close=()=>{dialog?.close();};
 const click=e=>{
  const toggle=e.target.closest('[data-home-rank-toggle]');
  if(toggle){const card=toggle.closest('.power-edition'),expanded=card.classList.toggle('is-expanded');toggle.setAttribute('aria-expanded',String(expanded));toggle.querySelector('span').textContent=expanded?'Show top teams':`View all ${boards[index].rows.length}`;if(expanded)nodes().forEach((node,i)=>animateUi(node,[{opacity:.4,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:220,delay:Math.min(i,5)*15}));return;}
  const week=e.target.closest('[data-power-week]');
  if(week){observer?.disconnect();const expanded=root.querySelector('.power-edition')?.classList.contains('is-expanded'),direction=Number(week.dataset.powerWeek);index=Math.max(0,Math.min(boards.length-1,index+direction));cancelUiMotion(root);root.innerHTML=powerRankingsMarkup(view,members,index);if(expanded){root.querySelector('.power-edition').classList.add('is-expanded');const all=root.querySelector('[data-home-rank-toggle]');all.setAttribute('aria-expanded','true');all.querySelector('span').textContent='Show top teams';}const target=root.querySelector(`[data-power-week="${direction}"]:not(:disabled)`)||root.querySelector('[data-power-week]:not(:disabled)');target?.focus({preventScroll:true});nodes().forEach(node=>animateUi(node,[{opacity:.3,transform:`translateX(${direction*12}px)`},{opacity:1,transform:'none'}],{duration:220}));return;}
  const opener=e.target.closest('[data-power-team]');if(!opener)return;
  const board=boards[index],row=board.rows.find(r=>r.id===opener.dataset.powerTeam);if(!row)return;
  close();dialog=document.createElement('dialog');dialog.className='power-detail';dialog.setAttribute('aria-labelledby','power-detail-title');
  const team=teamFor(view,row,members);dialog.innerHTML=powerDetailMarkup(row,board,boards[index-1],team.powerForecast,team);document.body.append(dialog);
  const current=dialog;current.addEventListener('close',()=>{cancelUiMotion(current);current.remove();if(dialog===current)dialog=null;if(!stopped&&opener.isConnected)opener.focus({preventScroll:true});},{once:true});
  current.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();current.querySelector('[data-power-close]').focus({preventScroll:true});}});
  current.querySelector('[data-power-close]').onclick=()=>current.close();current.addEventListener('click',e=>{if(e.target===current){const r=current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)current.close();}});
  current.showModal();current.querySelector('[data-power-close]').focus({preventScroll:true});animateUi(current,[{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:200});
 };
 root.addEventListener('click',click);
 return()=>{stopped=true;observer?.disconnect();root.removeEventListener('click',click);cancelUiMotion(root);if(dialog){const current=dialog;dialog=null;current.close();current.remove();}};
}
