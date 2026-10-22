import {esc,loading,errorBox} from '../ui.js';
import {loadMemberDirectory} from '../members.js';
import {ensureStylesheet} from '../lazy-css.js';
import {getReduceRaceMotion} from '../store.js';
import {loadStadiumRace} from '../arena/stadium-data.js';
import {finishRacers,officialFinish} from '../arena/finish-model.js';
import {mountFinishPresentation} from '../arena/finish-presentation.js';

let generation=0,finishView=null;
export function leave(){generation++;finishView?.stop();finishView=null;}
const motion=()=>!getReduceRaceMotion()&&document.documentElement.dataset.uiMotion!=='off'&&!matchMedia('(prefers-reduced-motion: reduce)').matches;

// The same read-only snapshot supplies the field and the archived result.
// No race commands, orientation changes or automatic spectator re-entry here.
export async function render(view,{snapshot=null,members=null}={}){
 leave();const own=generation,id=new URLSearchParams(location.hash.split('?')[1]||'').get('id');
 if(!id){view.innerHTML='<header class="utility-head"><h1>Arena Results</h1></header><p>No Arena event selected.</p>';return;}
 view.innerHTML=loading('Reading the finish…');
 try{
  const [data,directory]=await Promise.all([snapshot||loadStadiumRace(id),members||loadMemberDirectory().catch(()=>[]),ensureStylesheet('./css/stadium-arena.css')]);
  if(own!==generation||!view.isConnected)return;
  const finish=officialFinish(data.event,data.results,finishRacers(data,directory));
  view.innerHTML=`<section class="stadium-arena sr-results-page"><header class="sr-title"><div><a class="sr-back" href="#/arena">← Arena</a><h1>${esc(data.event.name)}</h1></div><span class="sr-state">${finish?'Final':'Results pending'}</span></header>${finish?'<section class="sr-final" aria-label="Official race results"></section>':'<p class="sr-empty" role="status">The complete official order is not available yet.</p>'}<a class="sr-back" href="#/arena">Arena history →</a></section>`;
  if(finish)finishView=mountFinishPresentation(view.querySelector('.sr-final'),finish,{motion});
 }catch(error){if(own===generation)view.innerHTML=`<header class="utility-head"><a href="#/arena">← Arena</a><h1>Arena Results</h1></header>${errorBox(error)}`;}
}
