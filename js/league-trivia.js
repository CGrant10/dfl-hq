import {db} from './supabase.js';
import {currentMember} from './members.js';
import {esc} from './ui.js';
import {rankTrivia} from './league-play-model.js';
import {shareFact} from './fact-share.js';
export async function mountTrivia(host,state,members){
 if(!host||!state)return;
 const{season,currentWeek:week}=state;
 const load=async()=>{
  const[pack,attempt,board,end]=await Promise.all([
   db().from('dfl_trivia_questions').select('ordinal,prompt,options').eq('season',season).eq('week',week).order('ordinal'),
   db().rpc('my_dfl_trivia',{p_season:season,p_week:week}),
   db().from('dfl_trivia_attempts').select('member_id,correct,week').eq('season',season),
   db().rpc('clubhouse_week_end',{p_season:season,p_week:week}),
  ]);
  if(pack.error||attempt.error||board.error||end.error)throw pack.error||attempt.error||board.error||end.error;
  return{questions:pack.data||[],receipt:attempt.data,rows:board.data||[],end:Date.parse(end.data)};
 };
 try{
 let data=await load();if(!host.isConnected)return;
 if(data.questions.length!==5){host.innerHTML='<h2>DFL trivia</h2><p>This week’s quiz is not ready yet.</p>';return}
 let busy=false;
 const paint=()=>{
  const me=currentMember(),receipt=data.receipt,open=Date.now()>=data.end-7*86400000&&Date.now()<data.end,rank=rankTrivia(data.rows),weekly=rankTrivia(data.rows.filter(r=>Number(r.week)===week));
  const leaderboard=rows=>rows.length?`<ol class="play-leaderboard">${rows.map(r=>`<li><span><b>${r.rank}.</b> ${esc(members.find(m=>String(m.id)===String(r.memberId))?.display_name||'Member')}</span><strong>${r.correct} <small>correct${r.played>1?` · ${r.played} quizzes`:''}</small></strong></li>`).join('')}</ol>`:'<p class="muted">The first score starts the leaderboard.</p>';
  host.innerHTML=`<header class="play-heading"><div><small>WEEK ${week} · ${season}</small><h2>Know your league?</h2><p>Five questions. One attempt. Real DFL history.</p></div>${receipt?`<strong class="play-score">${Number(receipt.correct)}/5</strong>`:''}</header>
  ${receipt?`<div class="trivia-receipt">${receipt.results.map(r=>`<article><h3>${esc(r.prompt)}</h3><p><strong>${r.answer===r.correctIndex?'Correct':'Missed it'}</strong> · ${esc(r.options[r.correctIndex])}</p>${r.answer!==r.correctIndex?`<p class="muted">Your answer: ${esc(r.options[r.answer])}</p>`:''}<small>${esc(r.source)}</small></article>`).join('')}</div><button type="button" class="btn" data-trivia-share>Share my score</button>`:
  `<form data-trivia-form>${data.questions.map(q=>`<fieldset class="trivia-question"><legend>${q.ordinal}. ${esc(q.prompt)}</legend><div class="trivia-options">${q.options.map((option,i)=>`<label><input type="radio" name="q${q.ordinal}" value="${i}" required> <span>${esc(option)}</span></label>`).join('')}</div></fieldset>`).join('')}<button class="btn" type="submit" ${me&&open?'':'disabled'}>Lock in all five answers</button><p class="muted">${!open?'This weekly quiz is closed. The next challenge opens Tuesday.':me?'Answers reveal after submission. Scores are for bragging rights.':'Choose your profile to play.'}</p><p role="status" data-trivia-status></p></form>`}
  <details class="play-board" open><summary>This week’s leaderboard</summary>${leaderboard(weekly)}</details><details class="play-board"><summary>Season leaderboard</summary>${leaderboard(rank)}</details>`;
  host.querySelector('[data-trivia-share]')?.addEventListener('click',()=>void shareFact({kicker:'DFL TRIVIA',ask:'KNOW YOUR LEAGUE?',headline:`${me?.display_name||'A DFL member'} scored ${receipt.correct}/5 in DFL trivia.`,detail:`Week ${week} · ${season}. Think you know the league? Take this week’s five-question challenge in DFL Lore.`,season}));
  host.querySelector('form')?.addEventListener('submit',async event=>{
   event.preventDefault();if(busy)return;const actor=currentMember(),form=event.currentTarget,status=form.querySelector('[data-trivia-status]');if(!actor){status.textContent='Choose your profile first.';return}
   const answers=data.questions.map(q=>Number(new FormData(form).get(`q${q.ordinal}`)));busy=true;form.querySelector('button').disabled=true;status.textContent='Grading your answers…';
   try{const{error}=await db().from('dfl_trivia_attempts').insert({season,week,member_id:actor.id,answers});if(error)throw error;data=await load();if(!host.isConnected)return;paint();host.querySelector('.play-score')?.setAttribute('tabindex','-1');host.querySelector('.play-score')?.focus()}
   catch{status.textContent='Could not submit. The quiz may be closed or already played. Your choices are kept; refresh to check an existing score.';form.querySelector('button').disabled=false}finally{busy=false}
  });
 };paint();
 }catch{if(host.isConnected)host.innerHTML='<h2>DFL trivia</h2><p role="status">Could not load trivia. Your league history is still available below.</p><button class="btn ghost" type="button" data-trivia-retry>Retry trivia</button>';host.querySelector('[data-trivia-retry]')?.addEventListener('click',()=>void mountTrivia(host,state,members))}
}
