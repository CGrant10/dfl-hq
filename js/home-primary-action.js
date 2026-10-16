import {animateUi} from './ui-motion.js';
export function homePrimaryAction(phase='unknown'){
  if(phase==='final')return {label:'View result',watch:true};
  if(['live','ongoing'].includes(phase))return {label:'Watch matchup',watch:true};
  return {label:'Review lineup',watch:false};
}
export function syncHomePrimaryAction(owner,phase){
  if(!owner)return;owner.dataset.matchupPhase=phase;
  const clubhouse=owner.querySelector('[data-home-clubhouse-link]');if(clubhouse&&owner.dataset.clubhouseHref)clubhouse.href=owner.dataset.clubhouseHref;
  const link=owner.querySelector('[data-home-primary]');if(!link)return;
  const action=homePrimaryAction(phase),label=link.querySelector('span');if(label.textContent!==action.label){label.textContent=action.label;animateUi(label,[{opacity:.6,transform:'translateY(3px)'},{opacity:1,transform:'translateY(0)'}],{duration:180});}
  link.toggleAttribute('data-gameday-watch',action.watch);
  link.href=action.watch?'#/clubhouse?tab=matchups':'#/analyzer';
}
