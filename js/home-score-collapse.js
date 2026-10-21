import {scrollChromeBottom} from './scroll-chrome.js';
const clamp=n=>Math.max(0,Math.min(1,n));
export const homeScoreProgress=(top,cardTop,height)=>{const p=clamp((top+104-cardTop)/Math.max(96,height-24));return p*p*p*(p*(p*6-15)+10)};
const mix=(a,b,p)=>a+(b-a)*p;
const text=node=>node?.textContent.trim()||'';

// The document keeps its geometry; only decorative copies move between positions.
export function mountHomeScoreCollapse(root){
 const dock=document.createElement('button');dock.type='button';dock.className='home-score-dock';dock.hidden=true;
 dock.innerHTML='<span class="home-score-caption"></span><span class="home-score-pair"><span><i data-dock-mark></i><strong data-dock-name></strong><b data-dock-score></b></span><small aria-hidden="true">vs</small><span><i data-dock-mark></i><strong data-dock-name></strong><b data-dock-score></b></span></span>';
 const layer=document.createElement('span');layer.className='home-score-flight';layer.setAttribute('aria-hidden','true');root.append(dock,layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),marks=[...dock.querySelectorAll('[data-dock-mark]')],scores=[...dock.querySelectorAll('[data-dock-score]')],names=[...dock.querySelectorAll('[data-dock-name]')];
 let stopped=false,frame=0,dirty=true,source=null,parts=[],flights=[],signature='',geometry=null;const hidden=new Map(),faded=new Map();
 const set=(node,value)=>{if(node.textContent!==value)node.textContent=value};
 const attr=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value)};
 const restore=()=>{for(const[node,value]of hidden)node.style.visibility=value;hidden.clear();if(flights.length)layer.replaceChildren();flights=[];for(const node of [...marks,...scores,...names])if(node.style.visibility)node.style.visibility='';};
 const style=(node,key,value)=>{if(node.style[key]!==value)node.style[key]=value};
 const hide=node=>{if(!hidden.has(node))hidden.set(node,node.style.visibility);node.style.visibility='hidden'};
 const unfade=()=>{for(const[node,value]of faded)node.style.opacity=value;faded.clear()};
 const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const reset=()=>{restore();unfade();dock.hidden=true;dock.inert=true;attr(dock,'aria-hidden','true')};
 const scan=()=>{
  dirty=false;geometry=null;restore();unfade();const nextSource=root.querySelector('[data-home-gameday-slot] .gameday-matchup');if(source!==nextSource){if(source)resize.unobserve(source);if(nextSource)resize.observe(nextSource);source=nextSource}
  const teams=[...source?.querySelectorAll('.gameday-faceoff-team')||[]];
  parts=teams.map(team=>({team,mark:team.querySelector('.gameday-faceoff-mark'),score:team.querySelector('.home-projected-total,.gd-thermal-value'),label:team.querySelector('.home-team-name strong'),name:text(team.querySelector('.home-team-name strong'))}));
  if(parts.length!==2||parts.some(p=>!p.mark||!p.score||!p.label)){parts=[];root.classList.remove('has-home-score-dock');reset();return}
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
  dock.hidden=false;dock.inert=p<.98;attr(dock,'aria-hidden',String(p<.98));style(dock,'left',`${bounds.left}px`);style(dock,'width',`${bounds.width}px`);style(dock,'top',`${top}px`);style(dock,'opacity',String(motion()?p:p===1?1:0));
  set(dock.querySelector('.home-score-caption'),`${week} · ${phase}`);
  parts.forEach((part,i)=>{set(scores[i],text(part.score));set(names[i],part.name)});
  attr(dock,'aria-label',`Back to your matchup. ${phase} scores. ${parts.map((part,i)=>`${part.name}: ${scores[i].textContent}`).join('. ')}`);
  // Let the original labels recede before the moving identities cross them.
  // These opacity writes preserve both layout and the accessible source.
  if(motion()&&p>0){for(const part of parts){if(!faded.has(part.team))faded.set(part.team,part.team.style.opacity);style(part.team,'opacity',String(1-clamp(p*2.5)))}}else unfade();
  const height=`${dock.offsetHeight}px`;if(root.style.getPropertyValue('--dfl-scroll-top')!==`${top}px`)root.style.setProperty('--dfl-scroll-top',`${top}px`);if(root.style.getPropertyValue('--dfl-scroll-height')!==height)root.style.setProperty('--dfl-scroll-height',height);
  if(!motion()||p===0||p===1){restore();return}
  // Cache the six endpoints. Name copies use the destination's wrapping
  // throughout the flight and cross-fade from the original label, avoiding
  // squeezed lettering or a line-break jump as they join the dock.
  const lanes=parts.flatMap((part,n)=>[
   {kind:'mark',from:part.mark,to:marks[n]},
   {kind:'name',from:part.label,to:names[n]},
   {kind:'score',from:part.score,to:scores[n]},
  ]);
  if(!geometry)geometry=lanes.map(({kind,from,to})=>{
   const start=from.getBoundingClientRect(),end=to.getBoundingClientRect(),target=getComputedStyle(to);
   return {kind,from:{left:start.left,top:start.top-box.top,width:start.width,height:start.height},to:{left:end.left,top:end.top-top,width:end.width,height:end.height},font:getComputedStyle(from).fontSize,targetFont:target.fontSize,lineHeight:target.lineHeight,fontFamily:target.fontFamily};
  });
  if(flights.length!==lanes.length){restore();flights=lanes.map(({kind,from,to},n)=>{
   const g=geometry[n],label=kind==='name',clone=kind==='mark'?from.cloneNode(true):document.createElement(label?'span':'b');
   clone.removeAttribute('id');clone.style.visibility='';clone.classList.add('home-score-moving');clone.dataset.motionKind=kind;
   if(label)clone.classList.add('home-score-moving-name');
   Object.assign(clone.style,{left:'0px',top:'0px',width:`${label?g.to.width:g.from.width}px`,height:`${label?g.to.height:kind==='score'?parseFloat(g.font):g.from.height}px`,fontSize:label?g.targetFont:g.font});
   if(label){clone.style.fontFamily=g.fontFamily;clone.style.lineHeight=g.lineHeight;}
   layer.append(clone);return clone;
  })}
  lanes.forEach(({kind,from,to})=>{if(kind!=='name')hide(from);hide(to)});
  flights.forEach((node,n)=>{
   const g=geometry[n],label=g.kind==='name',number=g.kind==='score';
   const width=label?g.to.width:g.from.width,height=label?g.to.height:number?parseFloat(g.font):g.from.height;
   const sx=label?mix(parseFloat(g.font)/parseFloat(g.targetFont),1,p):mix(1,number?parseFloat(g.targetFont)/parseFloat(g.font):g.to.width/Math.max(1,g.from.width),p);
   const sy=label||number?sx:mix(1,g.to.height/Math.max(1,g.from.height),p);
   const x=mix(g.from.left+g.from.width/2,g.to.left+g.to.width/2,p)-width*sx/2;
   const y=mix(g.from.top+box.top+g.from.height/2,g.to.top+top+g.to.height/2,p)-height*sy/2;
   if(label||number)set(node,text(lanes[n].from));
   if(label)style(node,'opacity',String(clamp((p-.08)/.32)));
   node.style.transform=`translate3d(${x}px,${y}px,0) scale(${sx},${sy})`;
  });
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
