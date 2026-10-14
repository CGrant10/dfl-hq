const clamp=n=>Math.max(0,Math.min(1,n));
export const homeScoreProgress=(top,cardTop,height)=>clamp((top+104-cardTop)/Math.max(96,height-24));
const mix=(a,b,p)=>a+(b-a)*p;
const text=node=>node?.textContent.trim()||'';

// The document keeps its geometry; only decorative copies move between positions.
export function mountHomeScoreCollapse(root){
 const dock=document.createElement('button');dock.type='button';dock.className='home-score-dock';dock.hidden=true;
 dock.innerHTML='<span class="home-score-caption"></span><span class="home-score-pair"><span><i data-dock-mark></i><b data-dock-score></b></span><small aria-hidden="true">vs</small><span><i data-dock-mark></i><b data-dock-score></b></span></span>';
 const layer=document.createElement('span');layer.className='home-score-flight';layer.setAttribute('aria-hidden','true');root.append(dock,layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),marks=[...dock.querySelectorAll('[data-dock-mark]')],scores=[...dock.querySelectorAll('[data-dock-score]')];
 let stopped=false,frame=0,dirty=true,source=null,parts=[],flights=[],signature='';const hidden=new Map();
 const set=(node,value)=>{if(node.textContent!==value)node.textContent=value};
 const restore=()=>{for(const[node,value]of hidden)node.style.visibility=value;hidden.clear();layer.replaceChildren();flights=[];for(const node of [...marks,...scores])node.style.visibility='';};
 const hide=node=>{if(!hidden.has(node))hidden.set(node,node.style.visibility);node.style.visibility='hidden'};
 const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const reset=()=>{restore();dock.hidden=true;dock.inert=true;dock.setAttribute('aria-hidden','true')};
 const scan=()=>{
  dirty=false;source=root.querySelector('[data-home-gameday-slot] .gameday-matchup');
  const teams=[...source?.querySelectorAll('.gameday-faceoff-team')||[]];
  parts=teams.map(team=>({team,mark:team.querySelector('.gameday-faceoff-mark'),score:team.querySelector('.home-projected-total,.gd-thermal-value'),name:text(team.querySelector('.home-team-name strong'))}));
  if(parts.length!==2||parts.some(p=>!p.mark||!p.score)){parts=[];root.classList.remove('has-home-score-dock');reset();return}
  if(!root.classList.contains('has-home-score-dock'))root.classList.add('has-home-score-dock');
  const next=parts.map(p=>p.mark.outerHTML.replace(/visibility:\s*hidden;?/g,'')).join('');
  if(next!==signature){restore();signature=next;parts.forEach((p,i)=>{const clone=p.mark.cloneNode(true);clone.removeAttribute('id');clone.style.visibility='';clone.setAttribute('aria-hidden','true');marks[i].replaceChildren(clone)})}
 };
 const paint=()=>{
  frame=0;if(stopped||!root.isConnected)return;
  if(dirty)scan();if(!parts.length)return;
  if(document.hidden||root.inert||document.querySelector('dialog[open]')||root.closest('[hidden]')){reset();return}
  const box=source.getBoundingClientRect(),bounds=root.getBoundingClientRect(),top=Math.max(44,document.querySelector('.topbar')?.getBoundingClientRect().bottom||0,innerWidth>=900?document.querySelector('#tabbar')?.getBoundingClientRect().bottom||0:0);
  const p=homeScoreProgress(top,box.top,box.height),phase=text(source.querySelector('.home-team-total > small')),week=text(root.querySelector('[data-gameday-week]'));
  dock.hidden=false;dock.inert=p<.98;dock.setAttribute('aria-hidden',String(p<.98));dock.style.left=`${bounds.left}px`;dock.style.width=`${bounds.width}px`;dock.style.top=`${top}px`;dock.style.opacity=String(motion()?p:p===1?1:0);
  set(dock.querySelector('.home-score-caption'),`${week} · ${phase}`);
  parts.forEach((part,i)=>set(scores[i],text(part.score)));
  dock.setAttribute('aria-label',`Back to your matchup. ${phase} scores. ${parts.map((part,i)=>`${part.name}: ${scores[i].textContent}`).join('. ')}`);
  root.style.setProperty('--dfl-scroll-top',`${top}px`);root.style.setProperty('--dfl-scroll-height',`${dock.offsetHeight}px`);
  if(!motion()||p===0||p===1){restore();return}
  // Read all endpoints before positioning the flight layer.
  const from=parts.flatMap(part=>[part.mark,part.score]),to=parts.flatMap((_part,i)=>[marks[i],scores[i]]),geometry=from.map((node,i)=>({from:node.getBoundingClientRect(),to:to[i].getBoundingClientRect(),font:getComputedStyle(node).fontSize,targetFont:getComputedStyle(to[i]).fontSize}));
  if(flights.length!==4){restore();flights=from.map((node,i)=>{const clone=i%2?document.createElement('b'):node.cloneNode(true);clone.removeAttribute('id');clone.style.visibility='';clone.classList.add('home-score-moving');layer.append(clone);return clone})}
  from.forEach(hide);to.forEach(hide);
  flights.forEach((node,i)=>{const g=geometry[i];if(i%2)set(node,text(from[i]));Object.assign(node.style,{left:`${mix(g.from.left,g.to.left,p)}px`,top:`${mix(g.from.top,g.to.top,p)}px`,width:`${mix(g.from.width,g.to.width,p)}px`,height:`${mix(g.from.height,g.to.height,p)}px`,fontSize:`${mix(parseFloat(g.font),parseFloat(g.targetFont),p)}px`})});
 };
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(paint)};
 const invalidate=()=>{dirty=true;schedule()};
 const preferences=()=>{if(!motion())reset();invalidate()},visibility=()=>{if(document.hidden)reset();invalidate()};
 const observer=new MutationObserver(records=>{if(records.every(record=>record.target===dock||dock.contains(record.target)||record.target===layer||layer.contains(record.target)||record.type==='childList'&&[...record.addedNodes,...record.removedNodes].every(node=>node===layer||layer.contains(node))))return;invalidate()});
 observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','data-phase','data-route']});
 const resize=new ResizeObserver(invalidate);resize.observe(root);
 dock.addEventListener('click',()=>{source?.focus({preventScroll:true});source?.scrollIntoView({block:'center',behavior:motion()?'smooth':'instant'})});
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',invalidate);window.addEventListener('dfl:ui-motion-change',preferences);window.addEventListener('pageshow',invalidate);window.addEventListener('pagehide',reset);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',preferences);root.addEventListener('animationend',schedule);document.fonts?.ready.then(invalidate);schedule();
 return()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();restore();dock.remove();layer.remove();root.classList.remove('has-home-score-dock');window.removeEventListener('scroll',schedule);window.removeEventListener('resize',invalidate);window.removeEventListener('dfl:ui-motion-change',preferences);window.removeEventListener('pageshow',invalidate);window.removeEventListener('pagehide',reset);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preferences);root.removeEventListener('animationend',schedule)};
}
