// Keep the expanded dashboard's space in the document. Shrinking the pinned
// surface must not move the lineup underneath a reader or their focused player.
export const watchScoreCompact=(anchorTop,dialogTop,wasCompact=false)=>anchorTop<dialogTop+(wasCompact?-12:-24);
export function mountWatchScoreCollapse(dialog) {
 let stopped=false,frame=0,width=0;
 const paint=()=>{
  frame=0;if(stopped||!dialog.open)return;
  const anchor=dialog.querySelector('[data-watch-score-anchor]');
  if(!anchor){dialog.classList.remove('is-score-compact');return}
  const compact=watchScoreCompact(anchor.getBoundingClientRect().top,dialog.getBoundingClientRect().top,dialog.classList.contains('is-score-compact'));
  dialog.classList.toggle('is-score-compact',compact);
 };
 const schedule=()=>{if(!frame&&!stopped)frame=requestAnimationFrame(paint)};
 const refresh=()=>{
  if(stopped)return;
  const dashboard=dialog.querySelector('.gd-watch-dashboard'),surface=dashboard?.querySelector('.gd-watch-dashboard-inner');
  if(!surface){dialog.classList.remove('is-score-compact');return}
  const compact=dialog.classList.contains('is-score-compact');
  dialog.classList.add('is-score-measuring');dialog.classList.remove('is-score-compact');
  dashboard.style.setProperty('--watch-dashboard-height',`${surface.getBoundingClientRect().height}px`);
  dialog.classList.toggle('is-score-compact',compact);void surface.offsetHeight;dialog.classList.remove('is-score-measuring');
  schedule();
 };
 const observer=globalThis.ResizeObserver?new ResizeObserver(entries=>{
  const next=entries[0]?.contentRect.width;if(next!==width){width=next;refresh()}
 }):null;
 observer?.observe(dialog);document.fonts?.ready.then(refresh);dialog.addEventListener('scroll',schedule,{passive:true});
 return {refresh,stop(){stopped=true;cancelAnimationFrame(frame);observer?.disconnect();dialog.removeEventListener('scroll',schedule)}};
}
