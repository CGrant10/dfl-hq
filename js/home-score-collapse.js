import {scrollChromeBottom} from './scroll-chrome.js';
const clamp=n=>Math.max(0,Math.min(1,n));
export const homeScoreProgress=(top,cardTop,height)=>{const p=clamp((top+104-cardTop)/Math.max(96,height-24));return p*p*(3-2*p)};
const mix=(a,b,p)=>a+(b-a)*p;
const text=node=>node?.textContent.trim()||'';

// The document keeps its geometry; only decorative copies move between positions.
export function mountHomeScoreCollapse(root){
 const dock=document.createElement('button');dock.type='button';dock.className='home-score-dock';dock.hidden=true;
 dock.innerHTML='<span class="home-score-caption"></span><span class="home-score-pair"><span><i data-dock-mark></i><b data-dock-score></b></span><small aria-hidden="true">vs</small><span><i data-dock-mark></i><b data-dock-score></b></span></span>';
 const layer=document.createElement('span');layer.className='home-score-flight';layer.setAttribute('aria-hidden','true');root.append(dock,layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),marks=[...dock.querySelectorAll('[data-dock-mark]')],scores=[...dock.querySelectorAll('[data-dock-score]')];
 let stopped=false,frame=0,dirty=true,source=null,parts=[],flights=[],signature='',geometry=null;const hidden=new Map(),faded=new Map();
 const set=(node,value)=>{if(node.textContent!==value)node.textContent=value};
 const restore=()=>{for(const[node,value]of hidden)node.style.visibility=value;hidden.clear();if(flights.length)layer.replaceChildren();flights=[];for(const node of [...marks,...scores])if(node.style.visibility)node.style.visibility='';};
 const style=(node,key,value)=>{if(node.style[key]!==value)node.style[key]=value};
 const hide=node=>{if(!hidden.has(node))hidden.set(node,node.style.visibility);node.style.visibility='hidden'};
 const unfade=()=>{for(const[node,value]of faded)node.style.opacity=value;faded.clear()};
 const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const reset=()=>{restore();unfade();dock.hidden=true;dock.inert=true;dock.setAttribute('aria-hidden','true')};
 const scan=()=>{
  dirty=false;geometry=null;restore();unfade();const nextSource=root.querySelector('[data-home-gameday-slot] .gameday-matchup');if(source!==nextSource){if(source)resize.unobserve(source);if(nextSource)resize.observe(nextSource);source=nextSource}
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
  const box=source.getBoundingClientRect(),bounds=root.getBoundingClientRect(),top=scrollChromeBottom();
  const p=homeScoreProgress(top,box.top,box.height),phase=text(source.querySelector('.home-team-total > small')),week=text(root.querySelector('[data-gameday-week]'));
  dock.hidden=false;dock.inert=p<.98;dock.setAttribute('aria-hidden',String(p<.98));style(dock,'left',`${bounds.left}px`);style(dock,'width',`${bounds.width}px`);style(dock,'top',`${top}px`);style(dock,'opacity',String(motion()?p:p===1?1:0));
  set(dock.querySelector('.home-score-caption'),`${week} · ${phase}`);
  parts.forEach((part,i)=>set(scores[i],text(part.score)));
  dock.setAttribute('aria-label',`Back to your matchup. ${phase} scores. ${parts.map((part,i)=>`${part.name}: ${scores[i].textContent}`).join('. ')}`);
  // Let the original labels recede before the moving identities cross them.
  // These opacity writes preserve both layout and the accessible source.
  if(motion()&&p>0){for(const part of parts){if(!faded.has(part.team))faded.set(part.team,part.team.style.opacity);style(part.team,'opacity',String(1-clamp(p*2.5)))}}else unfade();
  const height=`${dock.offsetHeight}px`;if(root.style.getPropertyValue('--dfl-scroll-top')!==`${top}px`)root.style.setProperty('--dfl-scroll-top',`${top}px`);if(root.style.getPropertyValue('--dfl-scroll-height')!==height)root.style.setProperty('--dfl-scroll-height',height);
  if(!motion()||p===0||p===1){restore();return}
  // Read all endpoints before positioning the flight layer.
  const from=parts.flatMap(part=>[part.mark,part.score]),to=parts.flatMap((_part,i)=>[marks[i],scores[i]]);
  // Endpoints are measured once per data/layout change. During scrolling only
  // compositor transforms change, not four boxes and font sizes on every frame.
  if(!geometry)geometry=from.map((node,i)=>{const start=node.getBoundingClientRect(),end=to[i].getBoundingClientRect();return {from:{left:start.left,top:start.top-box.top,width:start.width,height:start.height},to:{left:end.left,top:end.top-top,width:end.width,height:end.height},font:getComputedStyle(node).fontSize}});
  if(flights.length!==4){restore();flights=from.map((node,i)=>{const clone=i%2?document.createElement('b'):node.cloneNode(true),g=geometry[i];clone.removeAttribute('id');clone.style.visibility='';clone.classList.add('home-score-moving');Object.assign(clone.style,{left:'0px',top:'0px',width:`${g.from.width}px`,height:`${g.from.height}px`,fontSize:g.font});layer.append(clone);return clone})}
  from.forEach(hide);to.forEach(hide);
  flights.forEach((node,i)=>{const g=geometry[i];if(i%2)set(node,text(from[i]));node.style.transform=`translate3d(${mix(g.from.left,g.to.left,p)}px,${mix(g.from.top+box.top,g.to.top+top,p)}px,0) scale(${mix(1,g.to.width/Math.max(1,g.from.width),p)},${mix(1,g.to.height/Math.max(1,g.from.height),p)})`});
 };
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(paint)};
 const invalidate=()=>{dirty=true;schedule()};
 const preferences=()=>{if(!motion())reset();invalidate()},visibility=()=>{if(document.hidden)reset();invalidate()};
 const observer=new MutationObserver(records=>{if(records.every(record=>record.target===dock||dock.contains(record.target)||record.target===layer||layer.contains(record.target)||record.type==='childList'&&[...record.addedNodes,...record.removedNodes].every(node=>node===layer||layer.contains(node))))return;invalidate()});
 observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','data-phase','data-route']});
 const resize=new ResizeObserver(invalidate);resize.observe(root);
 dock.addEventListener('click',()=>{source?.focus({preventScroll:true});source?.scrollIntoView({block:'center',behavior:motion()?'smooth':'instant'})});
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('dfl:scroll-chrome',invalidate);window.addEventListener('resize',invalidate);window.addEventListener('dfl:ui-motion-change',preferences);window.addEventListener('pageshow',invalidate);window.addEventListener('pagehide',reset);document.addEventListener('visibilitychange',visibility);reduced.addEventListener('change',preferences);root.addEventListener('animationend',invalidate);document.fonts?.addEventListener('loadingdone',invalidate);document.fonts?.ready.then(invalidate);schedule();
 return()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();restore();unfade();dock.remove();layer.remove();root.classList.remove('has-home-score-dock');window.removeEventListener('scroll',schedule);window.removeEventListener('dfl:scroll-chrome',invalidate);window.removeEventListener('resize',invalidate);window.removeEventListener('dfl:ui-motion-change',preferences);window.removeEventListener('pageshow',invalidate);window.removeEventListener('pagehide',reset);document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',preferences);root.removeEventListener('animationend',invalidate);document.fonts?.removeEventListener('loadingdone',invalidate)};
}
