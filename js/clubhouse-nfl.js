import {mountMultigame} from './multigame.js';
import {mountNflGameCenter} from './nfl-game-center.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {currentMember} from './members.js';
export function mountClubhouseNfl(root,{getModel,active=()=>root.isConnected,onClip=(_id,_source=null)=>{}}={}){
 const slot=root.querySelector('[data-clubhouse-nfl-center]'),params=new URLSearchParams(location.hash.split('?')[1]||'');
 let stopped=false,desk=null,center=null,clips=[],key='',preferred=params.get('nflView')==='fantasy'?'fantasy':'plays';
 const visible=()=>!stopped&&active()&&!root.querySelector('#clubhouse-panel-nfl')?.hidden;
 const getContext=()=>{const model=getModel();return {...model,players:model?.games.flatMap(game=>game.sides.flatMap(side=>[...side.lineup,...side.bench].filter(p=>!p.empty).map(p=>({...p,owner:side.name,isMine:String(side.memberId)===String(currentMember()?.id),isOpponent:game.isMine&&String(side.memberId)!==String(currentMember()?.id)}))))||[]}};
 const sync=()=>{if(!visible())return;const model=getModel();if(!model)return;
  if(!center){const host=document.createElement('section');host.setAttribute('aria-label','Pinned NFL games');slot.before(host);desk=mountMultigame(host,{getContext,active:visible,onSelect:id=>center?.selectGame(id),onChange:()=>void center?.refresh()});center=mountNflGameCenter(slot,{getContext,active:visible,getClips:()=>clips,onClip,initialMode:preferred,initialGame:params.get('nflGame')||'',initialPlay:params.get('moment')?.split(':')[2]||'',onGameChange:id=>desk.select(id),onBoard:(payload,id)=>void desk.update(payload,id),watchOthers:()=>desk.hasPending(),liveOthers:()=>desk.hasLive()});}else void center.refresh();
  const next=`${model.season}:${model.week}`;if(next!==key){key=next;clips=[];void loadHomeHighlights().then(rows=>{if(stopped||key!==next)return;clips=rows;if(visible())void center.refresh()}).catch(()=>{})}
 };
 const tab=event=>{if(event.detail?.tab==='nfl')sync();else center?.pause()};root.addEventListener('dfl:clubhouse-tab',tab);sync();
 return {open(mode='plays'){preferred=mode==='fantasy'?'fantasy':'plays';root.querySelector('#clubhouse-tab-nfl').click();if(center)center.setMode(preferred);else sync();return center?.ready;},stop(){stopped=true;desk?.stop();center?.stop();root.removeEventListener('dfl:clubhouse-tab',tab)}};
}
