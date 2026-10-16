let installed=false,selected=null,active=null;
const allowed=()=>document.visibilityState==='visible'&&document.documentElement.dataset.uiMotion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const visible=node=>{if(!node||node.closest('[hidden]'))return false;const b=node.getBoundingClientRect();return b.width>0&&b.height>0&&b.top>=44&&b.bottom<=innerHeight-48};
export function mountMatchupRouteMotion(){
 if(installed)return;installed=true;
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button>0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[data-home-clubhouse-link]');if(!link?.closest('#home-wrap'))return;
  const card=link.closest('.home-personal-desk')?.querySelector('.gameday-matchup');
  selected={hash:link.getAttribute('href'),at:performance.now(),projected:!!card?.classList.contains('is-projected'),sides:[...(card?.querySelectorAll('[data-gameday-team]')||[])]};
 },true);
 const stop=()=>active?.skipTransition();window.addEventListener('resize',stop);window.addEventListener('pagehide',stop);window.addEventListener('dfl:ui-motion-change',()=>{if(!allowed())stop()});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
}
export async function renderWithMatchupMotion(render,previous,nextHash){
 const interrupted=!!active;active?.skipTransition();active=null;delete document.documentElement.dataset.matchupTransition;
 const intent=selected;selected=null;
 if(interrupted||!intent||intent.hash!==nextHash||performance.now()-intent.at>1200||previous?.dataset.route!=='home'||!allowed()||!document.startViewTransition)return render();
 const origins=intent.sides.map(side=>({id:side.dataset.gamedayTeam,mark:side.querySelector('.dfl-team-mark'),score:side.querySelector('.home-team-total .gd-thermal-value')}));
 if(origins.length!==2||origins.some(side=>!visible(side.mark)))return render();
 const styles=[],mark=(node,name)=>{styles.push([node,node.style.viewTransitionName]);node.style.viewTransitionName=name;};
 origins.forEach((side,i)=>{mark(side.mark,'dfl-matchup-team-'+i);side.connectScore=!intent.projected&&visible(side.score);side.points=side.score?.textContent;if(side.connectScore)mark(side.score,'dfl-matchup-score-'+i)});
 let invoked=false,transition;
 const targetFor=id=>[...document.querySelectorAll(`[data-matchup-roster="${CSS.escape(id)}"]`)].find(node=>visible(node.querySelector('.dfl-team-mark')));
 const update=async()=>{
  invoked=true;if(location.hash!==nextHash)return;await render();if(location.hash!==nextHash)return;
  if(origins.some(side=>!targetFor(side.id))&&!origins.every(side=>document.querySelector(`[data-matchup-roster="${CSS.escape(side.id)}"]`)))await new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;observer.disconnect();clearTimeout(timer);resolve()},observer=new MutationObserver(()=>{if(location.hash!==nextHash||origins.every(side=>targetFor(side.id)))finish()}),timer=setTimeout(finish,700);observer.observe(document.getElementById('view'),{childList:true,subtree:true})});
  if(location.hash!==nextHash)return;
  let connected=0;origins.forEach((side,i)=>{const target=targetFor(side.id);if(!target)return;mark(target.querySelector('.dfl-team-mark'),'dfl-matchup-team-'+i);connected++;
   const score=target.querySelector('[data-matchup-score-value],b');if(side.connectScore&&visible(score)&&Number(side.points)===Number(score.textContent))mark(score,'dfl-matchup-score-'+i);
  });if(!connected)transition?.skipTransition();
 };
 try{document.documentElement.dataset.matchupTransition='true';transition=document.startViewTransition(update);active=transition;transition.ready.catch(()=>{});await transition.updateCallbackDone;}
 catch{if(!invoked)await render();}
 finally{const cleanup=()=>{for(const[node,value]of styles)node.style.viewTransitionName=value;if(active===transition){active=null;delete document.documentElement.dataset.matchupTransition}};if(transition)transition.finished.then(cleanup,cleanup);else cleanup()}
}
