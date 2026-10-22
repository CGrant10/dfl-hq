import {scrollChromeBottom} from './scroll-chrome.js';
const clamp=n=>Math.max(0,Math.min(1,n));
const ease=p=>p*p*p*(p*(p*6-15)+10);
export const homeScoreProgress=(top,cardTop,height)=>ease(clamp((top+104-cardTop)/Math.max(96,height-24)));
const mix=(a,b,p)=>a+(b-a)*p;
const text=node=>node?.textContent.trim()||'';
const set=(node,value)=>{if(node.textContent!==value)node.textContent=value};
const attr=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value)};
const style=(node,key,value)=>{if(node.style[key]!==value)node.style[key]=value};

// The same sampled path drives the compositor and the cached-geometry fallback.
// Names keep a constant font and wrapping; the two original labels cross-fade.
export function homeScoreFrame(g,t,top,span){
 t=clamp(t);const p=ease(t),name=g.kind==='name';
 const scale=name?1:mix(1,g.scale,p);
 const x=mix(g.from.left+g.from.width/2,g.to.left+g.to.width/2,p)-g.width*scale/2;
 const y=mix(top+104-span*t+g.from.top+g.from.height/2,g.to.top+g.to.height/2,p)-g.height*scale/2;
 const opacity=Math.min(clamp(t/.015),clamp((1-t)/.015))*(name?clamp((p-.08)/.32):1);
 return {transform:`translate3d(${x}px,${y}px,0) scale(${scale})`,opacity};
}

// Source layout stays in the document. All moving copies are prepared once;
// scroll frames never measure the page or create/remove a copy at the endpoints.
export function mountHomeScoreCollapse(root){
 const dock=document.createElement('button');dock.type='button';dock.className='home-score-dock';dock.hidden=true;dock.inert=true;
 dock.innerHTML='<span class="home-score-caption"></span><span class="home-score-pair"><span><i data-dock-mark></i><strong data-dock-name></strong><b data-dock-score></b></span><small aria-hidden="true">vs</small><span><i data-dock-mark></i><strong data-dock-name></strong><b data-dock-score></b></span></span>';
 const layer=document.createElement('span');layer.className='home-score-flight';layer.setAttribute('aria-hidden','true');root.append(dock,layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),marks=[...dock.querySelectorAll('[data-dock-mark]')],scores=[...dock.querySelectorAll('[data-dock-score]')],names=[...dock.querySelectorAll('[data-dock-name]')];
 let stopped=false,frame=0,dirty=true,source=null,parts=[],flights=[],geometry=[],effects=[],native=false,layout=null,viewportWidth=innerWidth;
 const original=new Map(),sizes=new WeakMap();
 const motion=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
 const remember=(node,key)=>{if(!original.has(node))original.set(node,{});const values=original.get(node);if(!(key in values))values[key]=node.style[key]};
 const write=(node,key,value)=>{remember(node,key);style(node,key,value)};
 const clear=()=>{for(const effect of effects)effect.cancel();effects=[];for(const[node,values]of original)for(const[key,value]of Object.entries(values))node.style[key]=value;original.clear();layer.replaceChildren();flights=[];geometry=[];native=false;delete layer.dataset.scrollDriver;};
 const blocked=()=>document.hidden||root.inert||root.closest('[hidden]')||source?.closest('[hidden]')||document.querySelector('dialog[open]');
 const suppress=()=>{clear();dock.hidden=true;dock.inert=true;attr(dock,'aria-hidden','true')};
 const animate=(node,frames,timeline,rangeEnd)=>{
  const effect=node.animate(frames,{timeline,rangeStart:'exit-crossing 0%',rangeEnd:`exit-crossing ${rangeEnd}%`,fill:'both',duration:'auto',easing:'linear'});effects.push(effect);
 };
 const prepare=()=>{
  dirty=false;clear();
  const next=root.querySelector('[data-home-gameday-slot] .gameday-matchup');
  if(source!==next){if(source)resize.unobserve(source);if(next)resize.observe(next);source=next}
  parts=[...source?.querySelectorAll('.gameday-faceoff-team')||[]].map(team=>({team,mark:team.querySelector('.gameday-faceoff-mark'),score:team.querySelector('.home-projected-total,.gd-thermal-value'),name:team.querySelector('.home-team-name strong')}));
  if(parts.length!==2||parts.some(p=>!p.mark||!p.score||!p.name)){
   parts=[];root.classList.remove('has-home-score-dock');suppress();return;
  }
  root.classList.add('has-home-score-dock');
  if(blocked()){suppress();return}
  // Read the source before positioning the destination; never mix these reads
  // with scroll-frame writes. Live scores, photos and fonts refresh this cache.
  const box=source.getBoundingClientRect(),bounds=root.getBoundingClientRect(),top=scrollChromeBottom();
  const span=Math.max(96,box.height-24),sourceStyles=parts.map(part=>getComputedStyle(part.score));
  dock.hidden=false;style(dock,'left',`${bounds.left}px`);style(dock,'width',`${bounds.width}px`);style(dock,'top',`${top}px`);style(dock,'opacity','0');
  const phase=text(source.querySelector('.home-team-total > small')),week=text(root.querySelector('[data-gameday-week]'));
  set(dock.querySelector('.home-score-caption'),[week,phase].filter(Boolean).join(' · '));
  parts.forEach((part,i)=>{
   set(scores[i],text(part.score));set(names[i],text(part.name));
   // Preserve the actual score face at both ends of the flight.
   style(scores[i],'fontFamily',sourceStyles[i].fontFamily);style(scores[i],'fontWeight',sourceStyles[i].fontWeight);style(scores[i],'letterSpacing',sourceStyles[i].letterSpacing);
   const clone=part.mark.cloneNode(true);clone.removeAttribute('id');clone.setAttribute('aria-hidden','true');marks[i].replaceChildren(clone);
  });
  attr(dock,'aria-label',`Back to your matchup. ${phase} scores. ${parts.map((part,i)=>`${text(part.name)}: ${scores[i].textContent}`).join('. ')}`);
  const height=dock.offsetHeight;
  if(root.style.getPropertyValue('--dfl-scroll-top')!==`${top}px`)root.style.setProperty('--dfl-scroll-top',`${top}px`);
  if(root.style.getPropertyValue('--dfl-scroll-height')!==`${height}px`)root.style.setProperty('--dfl-scroll-height',`${height}px`);
  layout={top,span,start:box.top+window.scrollY-top-104,divider:source.querySelector(':scope > i'),header:source.closest('.gameday-card')?.querySelector(':scope > header')};viewportWidth=innerWidth;
  if(!motion())return;
  const lanes=parts.flatMap((part,i)=>[{kind:'mark',from:part.mark,to:marks[i]},{kind:'name',from:part.name,to:names[i]},{kind:'score',from:part.score,to:scores[i]}]);
  geometry=lanes.map(({kind,from,to})=>{
   const start=from.getBoundingClientRect(),end=to.getBoundingClientRect(),font=getComputedStyle(from),target=getComputedStyle(to),name=kind==='name';
   return {kind,from:{left:start.left,top:start.top-box.top,width:start.width,height:start.height},to:{left:end.left,top:end.top,width:end.width,height:end.height},
    width:name?end.width:start.width,height:name?end.height:start.height,scale:kind==='score'?parseFloat(target.fontSize)/parseFloat(font.fontSize):end.width/Math.max(1,start.width),
    font:name?target.fontSize:font.fontSize,family:name?target.fontFamily:font.fontFamily,weight:name?target.fontWeight:font.fontWeight,lineHeight:name?target.lineHeight:font.lineHeight,spacing:name?target.letterSpacing:font.letterSpacing,align:target.textAlign};
  });
  flights=lanes.map(({kind,from},i)=>{
   const g=geometry[i],node=kind==='mark'?from.cloneNode(true):document.createElement(kind==='name'?'span':'b');
   node.removeAttribute('id');node.classList.add('home-score-moving');node.dataset.motionKind=kind;if(kind==='name')node.classList.add('home-score-moving-name');
   if(kind!=='mark')set(node,text(from));
   Object.assign(node.style,{left:'0px',top:'0px',width:`${g.width}px`,height:`${g.height}px`,fontSize:g.font,fontFamily:g.family,fontWeight:g.weight,lineHeight:g.lineHeight,letterSpacing:g.spacing,textAlign:g.align,opacity:'0'});
   layer.append(node);return node;
  });
  const {divider,header}=layout;
  const times=[...new Set([0,.001,.015,...Array.from({length:63},(_,i)=>(i+1)/64),.985,.999,1])].sort((a,b)=>a-b);
  const teamFrames=times.map(t=>({offset:t,opacity:1-clamp(ease(t)*2.5)}));
  const sourceFrames=[{offset:0,opacity:1},{offset:.015,opacity:0},{offset:1,opacity:0}];
  const targetFrames=[{offset:0,opacity:0},{offset:.985,opacity:0},{offset:1,opacity:1}];
  if(typeof globalThis.ViewTimeline==='function'&&CSS.supports('animation-range','exit-crossing 0% exit-crossing 100%')){
   try{
    const timeline=new ViewTimeline({subject:source,axis:'block',inset:[CSS.px(top+104),CSS.px(0)]}),rangeEnd=span/box.height*100;
    if(timeline.source!==document.scrollingElement)throw Error('The document must own score scrolling');
    animate(dock,times.map(t=>({offset:t,opacity:ease(t)})),timeline,rangeEnd);
    parts.forEach(part=>{animate(part.team,teamFrames,timeline,rangeEnd);animate(part.mark,sourceFrames,timeline,rangeEnd);animate(part.score,sourceFrames,timeline,rangeEnd)});
    if(divider)animate(divider,teamFrames,timeline,rangeEnd);if(header)animate(header,teamFrames,timeline,rangeEnd);
    [...marks,...names,...scores].forEach(node=>animate(node,targetFrames,timeline,rangeEnd));
    flights.forEach((node,i)=>animate(node,times.map(t=>({offset:t,...homeScoreFrame(geometry[i],t,top,span)})),timeline,rangeEnd));
    native=true;layer.dataset.scrollDriver='native';
   }catch{
    for(const effect of effects)effect.cancel();effects=[];
   }
  }
  if(!native)layer.dataset.scrollDriver='fallback';
 };
 const paint=()=>{
  frame=0;if(stopped||!root.isConnected)return;
  if(dirty)prepare();if(!parts.length||!layout)return;
  if(blocked()){suppress();return}
  const t=clamp((window.scrollY-layout.start)/layout.span),p=ease(t),interactive=motion()?t>=.985:t===1;
  if(dock.inert===interactive)dock.inert=!interactive;
  attr(dock,'aria-hidden',String(!interactive));
  if(native)return;
  style(dock,'opacity',String(motion()?p:t===1?1:0));
  if(!motion())return;
  parts.forEach(part=>{write(part.team,'opacity',String(1-clamp(p*2.5)));write(part.mark,'opacity',String(1-clamp(t/.015)));write(part.score,'opacity',String(1-clamp(t/.015)))});
  for(const node of [layout.divider,layout.header])if(node)write(node,'opacity',String(1-clamp(p*2.5)));
  [...marks,...names,...scores].forEach(node=>write(node,'opacity',String(clamp((t-.985)/.015))));
  flights.forEach((node,i)=>{const value=homeScoreFrame(geometry[i],t,layout.top,layout.span);style(node,'transform',value.transform);style(node,'opacity',String(value.opacity))});
 };
 const schedule=()=>{if(!stopped&&!frame)frame=requestAnimationFrame(paint)};
 const invalidate=()=>{dirty=true;schedule()};
 const preferences=()=>{suppress();invalidate()};
 const fields='.home-team-name,.gameday-faceoff-mark,.gd-thermal-value,.home-projected-total,.home-team-total > small,[data-gameday-week]';
 const replacements='[data-home-gameday-slot],.gameday-matchup,.gameday-faceoff-team,.home-team-name,.gameday-faceoff-mark,.home-team-total,.gd-thermal-value,.home-projected-total,[data-gameday-week],dialog';
 const observer=new MutationObserver(records=>{
  const slot=root.querySelector('[data-home-gameday-slot]');
  const related=node=>node.nodeType===1&&(node===source||node.contains(source)||node.matches(replacements)||node.querySelector(replacements));
  if(records.some(record=>{
   if(dock.contains(record.target)||layer.contains(record.target))return false;
   if(record.target===root&&['data-route','inert','hidden'].includes(record.attributeName))return true;
   if(record.attributeName==='open'&&record.target.tagName==='DIALOG')return true;
   const target=record.target.nodeType===1?record.target:record.target.parentElement;
   if(slot?.contains(target)&&target.closest(fields)&&(record.attributeName!=='class'||target.matches('.gameday-faceoff-mark')))return true;
   return record.type==='childList'&&[...record.addedNodes,...record.removedNodes].some(related);
  }))invalidate();
 });
 observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','data-phase','data-route','inert','hidden','open','class']});
 const resize=new ResizeObserver(entries=>{
  let changed=false;
  for(const entry of entries){const {width,height}=entry.contentRect,next=entry.target===root?`${width}`:`${width}:${height}`;if(sizes.get(entry.target)!==next){sizes.set(entry.target,next);changed=true}}
  if(changed)invalidate();
 });resize.observe(root);const header=document.querySelector('.topbar');if(header)resize.observe(header);
 const viewport=()=>{if(innerWidth!==viewportWidth)invalidate()};
 const entrance=event=>{if(event.target===root||event.target===source)invalidate()};
 const visibility=()=>{if(document.hidden)suppress();else invalidate()};
 const toggle=event=>{if(event.target instanceof HTMLDialogElement)invalidate()};
 dock.addEventListener('click',()=>{source?.focus({preventScroll:true});source?.scrollIntoView({block:'center',behavior:motion()?'smooth':'instant'})});
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('dfl:scroll-chrome',invalidate);window.addEventListener('resize',viewport);window.addEventListener('dfl:ui-motion-change',preferences);window.addEventListener('pageshow',invalidate);window.addEventListener('pagehide',suppress);document.addEventListener('visibilitychange',visibility);document.addEventListener('toggle',toggle,true);reduced.addEventListener('change',preferences);root.addEventListener('animationend',entrance);document.fonts?.addEventListener('loadingdone',invalidate);document.fonts?.ready.then(invalidate);schedule();
 return()=>{stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();clear();dock.remove();layer.remove();root.classList.remove('has-home-score-dock');window.removeEventListener('scroll',schedule);window.removeEventListener('dfl:scroll-chrome',invalidate);window.removeEventListener('resize',viewport);window.removeEventListener('dfl:ui-motion-change',preferences);window.removeEventListener('pageshow',invalidate);window.removeEventListener('pagehide',suppress);document.removeEventListener('visibilitychange',visibility);document.removeEventListener('toggle',toggle,true);reduced.removeEventListener('change',preferences);root.removeEventListener('animationend',entrance);document.fonts?.removeEventListener('loadingdone',invalidate)};
}
