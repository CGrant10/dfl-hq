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
const displayed=node=>{
  if(!node?.getClientRects().length||node.closest('[hidden]'))return false;
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

export function mountPageScrollMotion(root,{animate,cancel}={}){
  const spec=pages[root.dataset.route];if(!spec)return ()=>{};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const allowed=()=>!reduced.matches&&document.documentElement.dataset.uiMotion!=='off';
  const dock=document.createElement('button');
  dock.type='button';dock.className='dfl-scroll-context';dock.hidden=true;dock.inert=true;
  dock.innerHTML='<span class="dfl-scroll-copy"><strong></strong><small></small></span><span class="dfl-scroll-value" hidden></span><span class="dfl-scroll-scores" hidden></span><svg class="dfl-scroll-up" aria-hidden="true" viewBox="0 0 24 24"><path d="M6 14l6-6 6 6M12 8v12"/></svg><i class="dfl-scroll-read" aria-hidden="true"></i>';
  const copy=dock.querySelector('.dfl-scroll-copy'),title=copy.querySelector('strong'),section=copy.querySelector('small');
  const value=dock.querySelector('.dfl-scroll-value'),scores=dock.querySelector('.dfl-scroll-scores'),progress=dock.querySelector('.dfl-scroll-read');
  const originalTop=root.style.getPropertyValue('--dfl-scroll-top'),originalHeight=root.style.getPropertyValue('--dfl-scroll-height');
  let stopped=false,frame=0,dirty=true,hero=null,heading=null,headings=[],compact=false,shown=false,lastScroll=window.scrollY,scrolledAt=-Infinity,scoreAnchor=null,scoreKey='';
  const seen=new WeakSet(),observed=new Set(),labels=new WeakMap(),rising=new Set(),focusRestores=new Map();
  const current=()=>!stopped&&root.isConnected;
  const markVisible=nodes=>nodes.forEach(node=>{seen.add(node);intersection?.unobserve(node);observed.delete(node)});
  const intersection=globalThis.IntersectionObserver?new IntersectionObserver(entries=>{
    if(!current())return;
    for(const entry of entries){
      if(!entry.isIntersecting||!displayed(entry.target))continue;
      markVisible([entry.target]);
      // An async score/data render is not a scroll entrance.
      if(allowed()&&performance.now()-scrolledAt<900){
        const animation=animate?.(entry.target,[{opacity:.65,transform:'translateY(10px)'},{opacity:1,transform:'translateY(0)'}],{duration:300});
        if(animation){rising.add(entry.target);const finish=()=>rising.delete(entry.target);animation.finished.then(finish,finish);}
      }
    }
  },{threshold:.15,rootMargin:'-90px 0px -8% 0px'}):null;
  const resize=new ResizeObserver(()=>schedule());resize.observe(root);resize.observe(dock);
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
    if(on===shown)return;
    shown=on;dock.hidden=false;dock.inert=!on;dock.setAttribute('aria-hidden',String(!on));
    const animation=allowed()?animate?.(dock,on
      ?[{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}]
      :[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-6px)'}],{duration:on?240:150,fill:'forwards'}):null;
    if(!on){const finish=()=>{if(!shown&&current())dock.hidden=true};if(animation)animation.finished.then(finish,finish);else finish();}
  }
  function paint(){
    frame=0;if(!current()||document.hidden)return;
    if(dirty)scan();
    if(!displayed(hero)){compact=false;show(false);return;}
    // Read geometry together before any style or text writes.
    const bounds=root.getBoundingClientRect(),heroBox=hero.getBoundingClientRect();
    const topbar=document.querySelector('.topbar')?.getBoundingClientRect();
    const nav=innerWidth>=900?document.querySelector('#tabbar')?.getBoundingClientRect():null;
    const top=Math.max(0,topbar?.bottom||44,nav?.bottom||0);
    const height=dock.hidden?52:dock.getBoundingClientRect().height;
    let label='';
    for(const node of headings){if(!displayed(node))continue;const box=node.getBoundingClientRect();if(box.top<=top+height+18)label=labels.get(node)||'';}
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
    compact=nextCompact;
    dock.style.left=`${bounds.left}px`;dock.style.width=`${bounds.width}px`;dock.style.top=`${top}px`;
    root.style.setProperty('--dfl-scroll-top',`${top}px`);root.style.setProperty('--dfl-scroll-height',`${height}px`);
    if(heading)heading.style.setProperty('--dfl-title-leave',allowed()&&!hero.contains(document.activeElement)?String(leave):'0');
    setText(title,nextTitle);setText(section,label||fallback);section.hidden=!section.textContent;
    value.hidden=!bank;if(bank)setText(value,`${bank} SIN`);
    const key=JSON.stringify([scoreData,phase]);
    if(key!==scoreKey){
      scoreKey=key;scores.replaceChildren();
      for(const team of scoreData){const side=document.createElement('span'),name=document.createElement('small'),points=document.createElement('b');name.textContent=team.name;points.textContent=team.points;side.append(name,points);scores.append(side);}
    }
    scores.hidden=scoreData.length!==2;dock.classList.toggle('is-matchup',!scores.hidden);scoreAnchor=!scores.hidden?header:null;
    if(scoreAnchor){setText(section,`${text(root.querySelector('.clubhouse-status')).split('·').slice(0,2).join('·').trim()} · ${phase}`);section.hidden=false;}
    dock.setAttribute('aria-label',scoreAnchor?'Back to the selected matchup scoreboard':`Back to the ${nextTitle} header`);
    progress.style.transform=`scaleX(${read})`;
    show(compact||dock.contains(document.activeElement));
  }
  function schedule(){if(current()&&!frame)frame=requestAnimationFrame(paint);}
  const scroll=()=>{if(window.scrollY!==lastScroll){lastScroll=window.scrollY;scrolledAt=performance.now();}schedule();};
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
  const reset=()=>{dirty=true;if(!allowed()){intersection?.disconnect();observed.clear();for(const node of rising)cancel?.(node);cancel?.(dock);dock.hidden=!shown;}schedule();};
  const visibility=()=>{if(!document.hidden){dirty=true;schedule();}};
  dock.addEventListener('click',jump);dock.addEventListener('focusout',schedule);
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('resize',schedule);
  window.addEventListener('dfl:ui-motion-change',reset);document.addEventListener('visibilitychange',visibility);
  reduced.addEventListener('change',reset);document.fonts?.addEventListener('loadingdone',schedule);
  paint();
  return ()=>{
    stopped=true;cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();intersection?.disconnect();
    cancel?.(dock);for(const node of rising)cancel?.(node);restoreHeading();dock.remove();observed.clear();rising.clear();
    for(const restore of focusRestores.values())restore();focusRestores.clear();
    root.style.removeProperty('--dfl-scroll-top');root.style.removeProperty('--dfl-scroll-height');
    if(originalTop)root.style.setProperty('--dfl-scroll-top',originalTop);if(originalHeight)root.style.setProperty('--dfl-scroll-height',originalHeight);
    dock.removeEventListener('click',jump);dock.removeEventListener('focusout',schedule);
    window.removeEventListener('scroll',scroll);window.removeEventListener('resize',schedule);window.removeEventListener('dfl:ui-motion-change',reset);
    document.removeEventListener('visibilitychange',visibility);reduced.removeEventListener('change',reset);document.fonts?.removeEventListener('loadingdone',schedule);
  };
}
