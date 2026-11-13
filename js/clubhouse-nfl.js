import {nflCenterGames,nflObservedGame} from './nfl-game-center-model.js';
import {mountNflGameCenter} from './nfl-game-center.js';
import {loadHomeHighlights} from './home-highlight-data.js';
import {currentMember} from './members.js';
export function mountClubhouseNfl(root,{getModel,getDirectory=()=>null,active=()=>root.isConnected,onClip=(_id,_source=null)=>{}}={}){
 const slot=root.querySelector('[data-clubhouse-nfl-center]'),params=new URLSearchParams(location.hash.split('?')[1]||'');
 let stopped=false,center=null,clips=[],key='',board=null,preferred=['plays','stats','fantasy'].includes(params.get('nflView'))?params.get('nflView'):'plays';const summaries=new Map();
 const shell=root.querySelector('.clubhouse-tab-shell'),originalHeight=root.style.getPropertyValue('--nfl-section-tabs-height');
 slot.dataset.nflClubhouse='';
 const syncTabsHeight=()=>{const value=`${Math.ceil(shell?.getBoundingClientRect().height||44)}px`;if(root.style.getPropertyValue('--nfl-section-tabs-height')!==value)root.style.setProperty('--nfl-section-tabs-height',value)};
 const tabsObserver=new ResizeObserver(syncTabsHeight);if(shell)tabsObserver.observe(shell);syncTabsHeight();
 const visible=()=>!stopped&&active()&&!root.querySelector('#clubhouse-panel-nfl')?.hidden;
 const getContext=()=>{const model=getModel();return {...model,clipUnavailableGame:params.get('clipUnavailable')==='1'?params.get('nflGame'):null,playerDirectory:getDirectory(),players:model?.games.flatMap(game=>game.sides.flatMap(side=>[...side.lineup,...side.bench].filter(p=>!p.empty).map(p=>({...p,owner:side.name,isMine:String(side.memberId)===String(currentMember()?.id),isOpponent:game.isMine&&String(side.memberId)!==String(currentMember()?.id)}))))||[]}};
 const sync=()=>{if(!visible())return;syncTabsHeight();const model=getModel();if(!model)return;
  const watched=()=>{const c=getContext();return nflCenterGames(board,c?.season,c?.week).map(g=>nflObservedGame(g,summaries.get(g.id)?.summary,c.season))};
  if(!center){center=mountNflGameCenter(slot,{desk:true,getContext,active:visible,getClips:()=>clips,onClip,initialMode:preferred,initialGame:params.get('nflGame')||'',initialPlay:params.get('moment')?.split(':')[2]||'',onBoard:payload=>{board=payload},onSummary:(game,result)=>summaries.set(game.id,result),watchOthers:()=>watched().some(g=>['in','pre'].includes(g.state)),liveOthers:()=>watched().some(g=>g.state==='in')});}else void center.refresh();
  const next=`${model.season}:${model.week}`;if(next!==key){key=next;summaries.clear();clips=[];void loadHomeHighlights().then(rows=>{if(stopped||key!==next)return;clips=rows;if(visible())void center.refresh()}).catch(()=>{})}
 };
 const tab=event=>{if(event.detail?.tab==='nfl')sync();else center?.pause()};const context=()=>{if(visible())center?.updateContext()};root.addEventListener('dfl:clubhouse-context',context);root.addEventListener('dfl:clubhouse-tab',tab);sync();
 return {open(mode='plays'){preferred=['plays','stats','fantasy'].includes(mode)?mode:'plays';if(!visible())root.querySelector('#clubhouse-tab-nfl').click();if(center)center.setMode(preferred);else sync();return center?.ready;},stop(){stopped=true;tabsObserver.disconnect();if(originalHeight)root.style.setProperty('--nfl-section-tabs-height',originalHeight);else root.style.removeProperty('--nfl-section-tabs-height');summaries.clear();center?.stop();root.removeEventListener('dfl:clubhouse-tab',tab);root.removeEventListener('dfl:clubhouse-context',context)}};
}
