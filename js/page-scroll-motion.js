import {mountHomeScoreCollapse} from './home-score-collapse.js';
import {scrollChromeBottom} from './scroll-chrome.js';
// Preserve the full header's document space, just as GameDay preserves its
// expanded scoreboard. The compact reference never shifts a reader's content.
const pages={
  home:{hero:'.home-broadcast',title:'Home'},
  clubhouse:{hero:'.clubhouse-header'},
  sportsbook:{hero:'.sb-masthead'},
  trade:{hero:'.tb-head-row'},
  analyzer:{hero:'.ta-page-head'},
  history:{hero:'.utility-head'},
  profile:{hero:'.profile-head',title:'Profile'},
  wall:{hero:'.page-head'},
  facts:{hero:'.page-head'},
};
const clamp=value=>Math.max(0,Math.min(1,value));
const text=node=>node?.textContent.replace(/\s+/g,' ').trim()||'';
const setText=(node,value)=>{if(node.textContent!==value)node.textContent=value;};
const setHidden=(node,value)=>{if(node.hidden!==value)node.hidden=value;};
const setAttr=(node,key,value)=>{if(node.getAttribute(key)!==value)node.setAttribute(key,value);};
const setStyle=(node,key,value)=>{if(node.style.getPropertyValue(key)!==value)node.style.setProperty(key,value);};
const displayed=node=>{
  if(!node?.getClientRects().length||node.closest('[hidden],[inert]'))return false;
  for(let fold=node.closest('details:not([open])');fold;fold=fold.parentElement?.closest('details:not([open])')){
    if(!fold.querySelector(':scope > summary')?.contains(node))return false;
  }
  return true;
};
const cleanHeading=node=>{
  const copy=node.cloneNode(true);
  copy.querySelectorAll('.count,.badge,.sr-only,small,a,button').forEach(child=>child.remove());
  return text(copy);
};
export function scrollHeaderCompact(bottom,top,wasCompact=false){
  return bottom<top+(wasCompact?6:-10);
}
export function scrollSectionIndex(tops,boundary,previous=-1){
  let next=-1;
  tops.forEach((top,index)=>{if(top<=boundary)next=index;});
  if(previous>=0&&previous<tops.length&&next!==previous){
    if(next>previous&&tops[next]>boundary-8)return previous;
    if(next<previous&&tops[previous]<boundary+8)return previous;
  }
  return next;
}

export function mountPageScrollMotion(root,{animate,cancel}={}){
  const spec=pages[root.dataset.route];if(!spec)return ()=>{};
  const stopHomeScore=root.dataset.route==='home'?mountHomeScoreCollapse(root):()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const allowed=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
  const dock=document.createElement('button');
  dock.type='button';dock.className='dfl-scroll-context';dock.hidden=true;dock.inert=true;
  dock.innerHTML='<span class="dfl-scroll-copy"><strong></strong><small></small></span><span class="dfl-scroll-value" hidden></span><span class="dfl-scroll-scores" hidden></span><svg class="dfl-scroll-up" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 14l6-6 6 6M12 8v12"/></svg><i class="dfl-scroll-read" aria-hidden="true"></i>';
  const copy=dock.querySelector('.dfl-scroll-copy'),title=copy.querySelector('strong'),section=copy.querySelector('small');
  const value=dock.querySelector('.dfl-scroll-value'),scores=dock.querySelector('.dfl-scroll-scores'),progress=dock.querySelector('.dfl-scroll-read');
  const originalTop=root.style.getPropertyValue('--dfl-scroll-top'),originalHeight=root.style.getPropertyValue('--dfl-scroll-height');
  let stopped=false,frame=0,dirty=true,hero=null,heading=null,headings=[],sectionPositions=[],activeSection=null,compact=false,shown=false,lastScroll=window.scrollY,paintedScroll=window.scrollY,scrolledAt=-Infinity,scoreAnchor=null,scoreKey='',scrollDirection=0,scrollSpeed=0;let scrollAt=performance.now();
  const seen=new WeakSet(),observed=new Set(),layoutNodes=new Set(),labels=new WeakMap(),rising=new Set(),focusRestores=new Map();
  const current=()=>!stopped&&root.isConnected;
  const markVisible=nodes=>nodes.forEach(node=>{seen.add(node);intersection?.unobserve(node);observed.delete(node)});
  const intersection=globalThis.IntersectionObserver?new IntersectionObserver(entries=>{
    if(!current())return;
    for(const entry of entries){
      if(!entry.isIntersecting||!displayed(entry.target))continue;
      markVisible([entry.target]);
      // An async score/data render is not a scroll entrance.
      if(allowed()&&scrollSpeed<1.4&&performance.now()-scrolledAt<600){
        const animation=animate?.(entry.target,[{opacity:.7,transform:'translateY(4px)'},{opacity:1,transform:'translateY(0)'}],{duration:260,easing:'cubic-bezier(.16,1,.3,1)'});
        if(animation){rising.add(entry.target);const finish=()=>rising.delete(entry.target);animation.finished.then(finish,finish);}
      }
    }
  },{threshold:.15,rootMargin:'-90px 0px -8% 0px'}):null;
  const resize=new ResizeObserver(entries=>{if(entries.some(entry=>entry.target!==dock))dirty=true;schedule()});resize.observe(root);resize.observe(dock);
  function restoreHeading(){
    if(!heading)return;
    heading.removeAttribute('data-scroll-title');heading.style.removeProperty('--dfl-title-leave');heading=null;
  }
  function scan(){
    dirty=false;
    const next=root.querySelector(spec.hero);
    if(next!==hero){if(hero)resize.unobserve(hero);restoreHeading();hero=next;if(hero)resize.observe(hero);}
    const nextHeading=hero?.querySelector('h1');
    if(nextHeading!==heading){restoreHeading();heading=nextHeading;if(heading)heading.dataset.scrollTitle='1';}
    headings=[...root.querySelectorAll('h2')].filter(node=>!node.closest('.home-broadcast,dialog')).slice(0,30);
    headings.forEach(node=>labels.set(node,cleanHeading(node)));
    // Layout changes are observed; scroll frames reuse document offsets.
    sectionPositions=headings.filter(displayed).map(node=>({node,top:node.getBoundingClientRect().top+window.scrollY}));
    const nextLayoutNodes=new Set(sectionPositions.map(item=>item.node.parentElement).filter(node=>node!==root&&node!==hero));
    for(const node of layoutNodes)if(!nextLayoutNodes.has(node)){resize.unobserve(node);layoutNodes.delete(node)}
    for(const node of nextLayoutNodes)if(!layoutNodes.has(node)){resize.observe(node);layoutNodes.add(node)}
    for(const node of observed)if(!root.contains(node)||!displayed(node)){intersection?.unobserve(node);observed.delete(node);}
    for(const node of headings){
      if(seen.has(node)||observed.has(node)||!displayed(node))continue;
      const box=node.getBoundingClientRect();
      if(box.top<innerHeight-50||!intersection){seen.add(node);continue;}
      if(!allowed())continue;
      observed.add(node);intersection.observe(node);
    }
    if(!dock.isConnected)root.append(dock);
  }
  function show(on){
    if(on===shown)return false;
    // Reverse an interrupted entrance/exit from its current frame, rather
    // than flashing back to fully visible or restarting at zero opacity.
    const from=dock.hidden?{opacity:0,transform:'translateY(-4px)'}
      :{opacity:getComputedStyle(dock).opacity,transform:getComputedStyle(dock).transform};
    shown=on;dock.hidden=false;dock.inert=!on;dock.setAttribute('aria-hidden',String(!on));
    if(!allowed())cancel?.(dock);
    const animation=allowed()?animate?.(dock,[from,on
      ?{opacity:1,transform:'translateY(0)'}
      :{opacity:0,transform:'translateY(-4px)'}],{duration:on?220:160,fill:'forwards'}):null;
    if(!on){const finish=()=>{if(!shown&&current())dock.hidden=true};if(animation)animation.finished.then(finish,finish);else finish();}
    return true;
  }
  function resizeDock(fromHeight){
    if(!animate||!allowed()||fromHeight==null)return;
    const style=getComputedStyle(dock),opacity=style.opacity,transform=style.transform;
    cancel?.(dock);
    // Only a scroll-driven context change needs this second measurement.
    // Natural height returns when the animation finishes; no fixed sizes or
    // animation frame loops survive the transition.
    const height=dock.getBoundingClientRect().height;
    if(Math.abs(height-fromHeight)<1&&Number(opacity)>=.999)return;
    animate(dock,[{height:`${fromHeight}px`,opacity,transform},
      {height:`${height}px`,opacity:1,transform:'translateY(0)'}],{duration:240});
  }
  function glide(node,direction){
    if(!allowed())return;
    const interrupted=node.getAnimations().length>0,style=interrupted?getComputedStyle(node):null;
    animate?.(node,[{opacity:style?.opacity||.5,transform:style?.transform||`translateY(${direction*3}px)`},
      {opacity:1,transform:'translateY(0)'}],{duration:160});
  }
  function paint(){
    frame=0;if(!current()||document.hidden)return;
    if(dirty)scan();
    if(root.classList.contains('has-home-score-dock')){show(false);return;}
    if(!displayed(hero)){compact=false;show(false);return;}
    // Read geometry together before any style or text writes.
    const bounds=root.getBoundingClientRect(),heroBox=hero.getBoundingClientRect();
    const top=scrollChromeBottom();
    const fromHeight=dock.hidden?null:dock.getBoundingClientRect().height,height=fromHeight||52;
    const visibleHeadings=sectionPositions.map(item=>item.node),tops=sectionPositions.map(item=>item.top-window.scrollY);
    // Keep the tracking boundary independent of caption wrapping or the
    // score row's animated height, so labels cannot trigger each other.
    const index=scrollSectionIndex(tops,top+70,visibleHeadings.indexOf(activeSection));
    activeSection=visibleHeadings[index]||null;
    const label=labels.get(activeSection)||'';
    const matchup=root.dataset.route==='clubhouse'?root.querySelector('[data-clubhouse-matchup]:not([hidden]) .clubhouse-matchup-card'):null;
    const header=matchup?.querySelector('header'),anchor=matchup?.querySelector('.clubhouse-game-teams')||header,strip=matchup?.querySelector('.clubhouse-score-strip');
    const useScore=displayed(anchor)&&anchor.getBoundingClientRect().bottom<top-10;
    const scoreData=useScore&&strip?[...strip.querySelectorAll('.clubhouse-strip-team')].map(team=>({name:text(team.querySelector('strong')),points:text(team.querySelector('b'))})):[];
    const phase=scoreData.length===2?text(strip.querySelector('.clubhouse-strip-phase')):'';
    const read=clamp(window.scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight));
    const leave=clamp((top-heroBox.top)/Math.max(80,heroBox.height));
    const nextCompact=scrollHeaderCompact(heroBox.bottom,top,compact);
    const nextTitle=spec.title||text(heading)||'DFL';
    const intent=text(root.querySelector('.tb-intent-options .is-active'));
    const fallback=root.dataset.route==='clubhouse'?text(root.querySelector('.clubhouse-status'))
      :root.dataset.route==='trade'?(intent?`${intent} search`:'')
      :text(root.querySelector('[role="tab"][aria-selected="true"]'));
    const bank=root.dataset.route==='sportsbook'?text(root.querySelector('.sb-wallet strong')):'';
    const nextSection=scoreData.length===2
      ?`${text(root.querySelector('.clubhouse-status')).split('·').slice(0,2).join('·').trim()} · ${phase}`
      :label||fallback;
    const moved=window.scrollY!==paintedScroll,direction=window.scrollY>=paintedScroll?1:-1;
    const wasShown=shown,hadScore=!scores.hidden,labelChanged=section.textContent!==nextSection;
    const layoutChanged=title.textContent!==nextTitle||labelChanged||hadScore!==(scoreData.length===2);
    paintedScroll=window.scrollY;
    compact=nextCompact;
    for(const [key,next]of [['left',`${bounds.left}px`],['width',`${bounds.width}px`],['top',`${top}px`]])if(dock.style[key]!==next)dock.style[key]=next;
    for(const [key,next]of [['--dfl-scroll-top',`${top}px`],['--dfl-scroll-height',`${height}px`]])if(root.style.getPropertyValue(key)!==next)root.style.setProperty(key,next);
    if(heading)setStyle(heading,'--dfl-title-leave',allowed()&&!hero.contains(document.activeElement)?String(leave):'0');
    setText(title,nextTitle);setText(section,nextSection);setHidden(section,!section.textContent);
    setHidden(value,!bank);if(bank)setText(value,`${bank} SIN`);
    const key=JSON.stringify([scoreData,phase]),scoreChanged=key!==scoreKey;
    if(scoreChanged){
      scoreKey=key;scores.replaceChildren();
      for(const team of scoreData){const side=document.createElement('span'),name=document.createElement('small'),points=document.createElement('b');name.textContent=team.name;points.textContent=team.points;side.append(name,points);scores.append(side);}
    }
    setHidden(scores,scoreData.length!==2);dock.classList.toggle('is-matchup',!scores.hidden);scoreAnchor=!scores.hidden?header:null;
    const action=scoreAnchor?'Back to the selected matchup scoreboard':`Back to the ${nextTitle} header`;
    const context=scoreAnchor?[phase,...scoreData.map(team=>`${team.name}: ${team.points} points`)]
      :[section.textContent,bank?`${bank} SIN`:''];
    setAttr(dock,'aria-label',[action,...context].filter(Boolean).join('. '));
    setStyle(progress,'transform',`scaleX(${read})`);
    const toggled=show(compact||dock.contains(document.activeElement));
    if(!moved){
      if(labelChanged)cancel?.(section);
      if((layoutChanged||scoreChanged)&&dock.getAnimations().some(animation=>
        animation.effect?.getKeyframes().some(frame=>'height' in frame)))cancel?.(dock);
    }
    if(shown&&wasShown&&moved&&!toggled){
      if(layoutChanged)resizeDock(fromHeight);
      if(labelChanged)glide(section,direction);
      if(!hadScore&&!scores.hidden)glide(scores,-1);
    }
  }
  function schedule(){if(current()&&!frame)frame=requestAnimationFrame(paint);}
  const scroll=()=>{const at=performance.now(),delta=window.scrollY-lastScroll;if(delta){const direction=Math.sign(delta);scrollSpeed=Math.abs(delta)/Math.max(8,at-scrollAt);if(scrollDirection&&direction!==scrollDirection){for(const node of rising)cancel?.(node);rising.clear()}scrollDirection=direction;lastScroll=window.scrollY;scrolledAt=at;scrollAt=at;}schedule();};
  const observer=new MutationObserver(records=>{
    if(records.some(record=>!dock.contains(record.target)&&!(record.type==='childList'&&[...record.addedNodes,...record.removedNodes].every(node=>node===dock||node.nodeType===1&&node.matches('.dfl-selection-rail,.dfl-scroll-cue')))
      &&(record.attributeName!=='class'||record.target.matches('button,[data-clubhouse-matchup],.clubhouse-matchup-card')))){
      dirty=true;schedule();
    }
  });
  observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden','open','aria-selected','aria-pressed','class']});
  const jump=()=>{
    const target=scoreAnchor;
    if(target)target.scrollIntoView({block:'start',behavior:allowed()?'smooth':'instant'});
    else window.scrollTo({top:0,behavior:allowed()?'smooth':'instant'});
    const focus=target||heading||hero;
    if(focus){
      if(!focus.hasAttribute('tabindex')){
        focus.setAttribute('tabindex','-1');
        const restore=()=>{focus.removeAttribute('tabindex');focus.removeEventListener('blur',restore);focusRestores.delete(focus);};
        focusRestores.set(focus,restore);focus.addEventListener('blur',restore,{once:true});
      }
      focus.focus({preventScroll:true});
    }
  };
  const reset=()=>{dirty=true;if(!allowed()){intersection?.disconnect();observed.clear();for(const node of rising)cancel?.(node);cancel?.(dock);cancel?.(section);cancel?.(scores);dock.hidden=!shown;}schedule();};
  const visibility=()=>{if(!document.hidden){dirty=true;schedule();}};
  dock.addEventListener('click',jump);dock.addEventListener('focusout',schedule);
  const layout=()=>{dirty=true;schedule()};
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('dfl:scroll-chrome',schedule);window.addEventListener('resize',layout);
  window.addEventListener('dfl:ui-motion-change',reset);document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',reset);document.fonts?.addEventListener('loadingdone',layout);
  paint();
  return ()=>{
    stopped=true;stopHomeScore();cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();intersection?.disconnect();
    cancel?.(dock);cancel?.(section);cancel?.(scores);for(const node of rising)cancel?.(node);restoreHeading();dock.remove();observed.clear();rising.clear();
    for(const restore of focusRestores.values())restore();focusRestores.clear();
    root.style.removeProperty('--dfl-scroll-top');root.style.removeProperty('--dfl-scroll-height');
    if(originalTop)root.style.setProperty('--dfl-scroll-top',originalTop);if(originalHeight)root.style.setProperty('--dfl-scroll-height',originalHeight);
    dock.removeEventListener('click',jump);dock.removeEventListener('focusout',schedule);
    window.removeEventListener('scroll',scroll);window.removeEventListener('dfl:scroll-chrome',schedule);window.removeEventListener('resize',layout);window.removeEventListener('dfl:ui-motion-change',reset);
    document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reset);document.fonts?.removeEventListener('loadingdone',layout);
  };
}
