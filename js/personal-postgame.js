import {personalPostgame} from './personal-postgame-model.js';
import {loadGameDayMoments} from './game-day-moments.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {currentMember} from './members.js';
import {personalPostgameMarkup} from './personal-postgame-ui.js';
import {patchGameDay} from './game-day-dom.js';
export function mountPersonalPostgame(root,{getModel,active=()=>root.isConnected,member=()=>currentMember()?.id,loadMoments=loadGameDayMoments,loadClips=loadHomeHighlights}={}){
 const slot=root.querySelector('[data-personal-postgame]');if(!slot)return {stop(){}};
 let stopped=false,key='',generation=0,loaded=false,moments=[],clips=[];
 const visible=()=>!stopped&&active()&&!root.querySelector('#clubhouse-panel-recap')?.hidden;
 const paint=()=>{const result=personalPostgame(getModel(),member(),{moments,clips});slot.hidden=!result;patchGameDay(slot,personalPostgameMarkup(result))};
 const sync=()=>{
  if(!visible())return;const model=getModel(),game=model?.games.find(g=>g.sides.some(s=>String(s.memberId)===String(member())));
  const next=JSON.stringify([member(),model?.leagueId,model?.season,model?.week,game?.id]);
  if(next!==key){key=next;generation++;loaded=false;moments=[];clips=[]}paint();
  if(loaded||!model?.completed||!game||member()==null)return;loaded=true;const token=generation;
  void Promise.allSettled([loadMoments(model,{}, {gameId:game.id,limit:100}),loadClips()]).then(([plays,videos])=>{
   if(!visible()||generation!==token||next!==JSON.stringify([member(),getModel()?.leagueId,getModel()?.season,getModel()?.week,game.id])){if(generation===token)loaded=false;return;}
   moments=plays.status==='fulfilled'?plays.value.items:[];clips=videos.status==='fulfilled'?videos.value:[];paint();
  });
 };
 root.addEventListener('dfl:clubhouse-context',sync);root.addEventListener('dfl:clubhouse-tab',sync);sync();
 return {stop(){stopped=true;generation++;root.removeEventListener('dfl:clubhouse-context',sync);root.removeEventListener('dfl:clubhouse-tab',sync)}};
}
