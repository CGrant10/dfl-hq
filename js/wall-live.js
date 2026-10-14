import {mountLiveScoreRefresh} from './live-score-refresh.js';

export function mountWallLive(root,refresh,{active=()=>root.isConnected}={}) {
  let first=true;
  const loop=mountLiveScoreRefresh({active,refresh:async()=>{
    if(first){first=false;if(root.querySelector('.wall'))return true;}
    // Let submissions and post edits finish before refreshing their surface.
    if(root.querySelector('button[type="submit"]:disabled,[data-wall-reaction]:disabled,[data-wall-edit-form]:not(.hidden)')||document.querySelector('dialog[open]'))return true;
    return refresh();
  }});
  loop.start();return ()=>loop.stop();
}
