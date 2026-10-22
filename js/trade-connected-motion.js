import {connectPortrait} from './connected-portrait.js';

// Reuse real player portraits across the offer/detail boundary. Text and
// controls render immediately; only a handful of decorative images travel.
export function createTradeConnection(){
 let stopped=false,stops=[],frame=0;
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;stops.forEach(stop=>stop());stops=[]};
 const visible=rect=>rect.width>0&&rect.height>0&&rect.top>=44&&rect.bottom<=innerHeight-48&&rect.left>=0&&rect.right<=innerWidth;
 return {capture(root){
  cancel();if(stopped||!root?.isConnected)return [];
  const selector='[data-player-card],[data-trade-player]',seen=new Set();return [...(root.matches(selector)?[root]:[]),...root.querySelectorAll(selector)].flatMap(node=>{
   const id=node.dataset.playerCard||node.dataset.tradePlayer,portrait=node.querySelector('.dfl-player-portrait'),rect=portrait?.getBoundingClientRect();
   if(!id||seen.has(id)||!rect||!visible(rect))return [];seen.add(id);return [{id,rect}];
  }).slice(0,6);
 },play(origins,root){
  cancel();if(stopped||!root?.isConnected)return;
  // Let the instant destination scroll dispatch before installing the shared
  // portrait's scroll-cancellation listener.
  frame=requestAnimationFrame(()=>{frame=0;if(stopped||!root.isConnected)return;
   for(const {id,rect} of origins){
    const node=root.matches(`[data-trade-player="${CSS.escape(id)}"],[data-player-card="${CSS.escape(id)}"]`)?root:root.querySelector(`[data-trade-player="${CSS.escape(id)}"],[data-player-card="${CSS.escape(id)}"]`),portrait=node?.querySelector('.dfl-player-portrait');
    if(portrait)stops.push(connectPortrait(portrait,portrait,{origin:rect,duration:300}));
   }
  });
 },cancel,stop(){stopped=true;cancel()}};
}
