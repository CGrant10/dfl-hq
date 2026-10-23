import {esc} from './ui.js';
import {teamPortrait} from './team-presentation.js';
import {recordChases} from './record-chases-model.js';
import {animateUi,cancelUiMotion} from './ui-motion.js';

const label=kind=>({league:'League best',team:'Team best',season:'Season best'}[kind]);
export function recordChasesMarkup(model,game){
 const rows=recordChases(model,game);if(!rows.length)return '';
 const years=model.recordArchive.years,span=years[0]===years.at(-1)?String(years[0]):`${years[0]}–${years.at(-1)}`;
 return `<section class="dfl-record-watch" aria-label="Recorded scoring targets"><header><h3>Record watch</h3><span>Same scoring · ${span}</span></header>${rows.map(row=>{
  const benchmark=(row.target.cents/100).toFixed(2),cleared=row.state==='cleared',metric=cleared?(row.cents/100).toFixed(2):`+${row.remaining.toFixed(2)}`;
  const status=cleared?`${row.final?'New':'Above'} ${label(row.kind).toLowerCase()}`:row.state==='tied'?`Matched ${benchmark}`:label(row.kind);
  const spoken=cleared?`${row.team.name}: ${row.final?'new':'above'} ${label(row.kind).toLowerCase()}, ${(row.cents/100).toFixed(2)} points.`:`${row.team.name} needs ${row.remaining.toFixed(2)} more points to beat ${benchmark}, the ${label(row.kind).toLowerCase()}.`;
  return `<article data-record-key="${esc(row.key)}" data-record-state="${row.state}"><div class="record-identity">${teamPortrait({team_name:row.team.name,identity:row.team.identity})}<div><strong>${esc(row.team.name)}</strong><small>${esc(status)} · ${row.target.season} W${row.target.week}</small></div></div><div class="record-distance"><b>${metric}</b><small>${cleared?`was ${benchmark}`:`to pass ${benchmark}`}</small></div><span class="record-progress" role="progressbar" aria-label="${esc(spoken)}" aria-valuemin="0" aria-valuemax="${((row.target.cents+1)/100).toFixed(2)}" aria-valuenow="${(Math.max(0,Math.min(row.cents,row.target.cents+1))/100).toFixed(2)}"><i style="--record-progress:${row.progress}"></i></span></article>`;
 }).join('')}<span class="sr-only" role="status" aria-atomic="true" data-record-announcement></span></section>`;
}

// Observe fresh data updates, never scroll frames. First paint, corrections,
// stale/offscreen updates and reopening do not manufacture a celebration.
export function mountRecordChases(root,{getModel,getGame,getMotion=()=>true}){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let states=new Map(),scope='',checkedAt=0,stopped=false;const celebrated=new Set();
 const cancel=()=>{for(const node of root.querySelectorAll('[data-record-key]'))cancelUiMotion(node)};
 const update=()=>{
  if(stopped)return;
  const model=getModel(),game=getGame(),key=JSON.stringify([model?.leagueId,model?.season,model?.week,game?.id]);
  if(scope!==key){states=new Map();checkedAt=0;scope=key;cancel()}
  const rows=recordChases(model,game),next=new Map(),fresh=Number.isFinite(model?.checkedAt)&&model.checkedAt>checkedAt&&Date.now()-model.checkedAt>=0&&Date.now()-model.checkedAt<120000&&(model.scoreStatus||'ready')==='ready'&&model.nflAvailable!==false&&model.playersAvailable!==false;
  for(const row of rows){
   const previous=states.get(row.key);next.set(row.key,row);
   if(!previous||previous.cents>row.target.cents||row.cents<=row.target.cents||celebrated.has(row.key))continue;
   celebrated.add(row.key);if(celebrated.size>100)celebrated.delete(celebrated.values().next().value);
   const node=root.querySelector(`[data-record-key="${CSS.escape(row.key)}"]`),box=node?.getBoundingClientRect();
   if(!fresh||!node||!getMotion()||reduced.matches||document.hidden||node.closest('[hidden],[inert],dialog:not([open])')||!box||box.bottom<=44||box.top>=innerHeight-48)continue;
   animateUi(node,[{opacity:.65,transform:'translateY(3px)'},{opacity:1,transform:'none'}],{duration:380,motion:getMotion()});
   const announcement=root.querySelector('[data-record-announcement]');if(announcement)announcement.textContent=`${row.team.name} ${row.final?'set a new':'moved above the'} ${label(row.kind).toLowerCase()}: ${(row.cents/100).toFixed(2)} points.`;
  }
  states=next;checkedAt=model?.checkedAt||0;
 };
 const interrupt=()=>cancel();
 document.addEventListener('visibilitychange',interrupt);window.addEventListener('dfl:ui-motion-change',interrupt);reduced.addEventListener('change',interrupt);
 return {update,motionChanged:cancel,stop(){stopped=true;cancel();states.clear();document.removeEventListener('visibilitychange',interrupt);window.removeEventListener('dfl:ui-motion-change',interrupt);reduced.removeEventListener('change',interrupt)}};
}
