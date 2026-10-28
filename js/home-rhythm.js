import {homeWeekPhase} from './home-week-flow.js';

/** Keep the completed week's receipts first until the next kickoff is close. */
export function homeRhythmPhase(edition={},now=Date.now()){
 const phase=homeWeekPhase(edition,now);
 if(phase.key==='unknown')return {...phase,mode:'unknown'};
 const kickoffs=(edition.openingNfl?.payload?.events||[]).map(e=>Date.parse(e.date)).filter(t=>Number.isFinite(t)&&t>now);
 const next=kickoffs.length?Math.min(...kickoffs):null;
 const aftermath=phase.key==='final'||phase.key==='pregame'&&edition.model?.completed
  &&Number(phase.week)>Number(edition.model.week)&&next!==null&&next-now>24*3600000;
 return {...phase,...(aftermath?{key:'final',order:['recap','live','plan']}:{}),mode:aftermath?'aftermath':phase.key==='pregame'?'pregame':'live'};
}

/** Resolve once on entry. Never move sections after the reader starts browsing. */
export function mountHomeRhythm(root,{win=window,doc=document}={}){
 const host=root?.querySelector('[data-home-rhythm-flow]');
 let chosen=null,engaged=win.scrollY>24,stopped=false;
 const engage=()=>{engaged=true};
 const scroll=()=>{if(win.scrollY>24)engage()};
 root?.addEventListener('pointerdown',engage,{passive:true});root?.addEventListener('keydown',engage);
 win.addEventListener('scroll',scroll,{passive:true});
 return {
  update(edition,now=Date.now()){
   if(stopped||chosen)return chosen;
   const phase=homeRhythmPhase(edition,now);if(phase.mode==='unknown')return null;
   engaged ||= win.scrollY>24;
   chosen={...phase,layoutAllowed:!engaged&&!root?.contains(doc.activeElement)};
   // A default desk stays in place if the initial data arrives after engagement.
   if(host&&chosen.layoutAllowed){
    const order=phase.mode==='live'?['highlights','week']:['week','highlights'];
    order.forEach((key,index)=>{const node=host.querySelector('[data-home-rhythm-part="'+key+'"]');if(node&&host.children[index]!==node)host.insertBefore(node,host.children[index]||null)});
   }
   if(root)root.dataset.homeRhythm=phase.mode;
   return chosen;
  },
  stop(){stopped=true;root?.removeEventListener('pointerdown',engage);root?.removeEventListener('keydown',engage);win.removeEventListener('scroll',scroll)},
 };
}
