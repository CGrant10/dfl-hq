import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {loadPropGame} from './sportsbook-loading.js';

// Read only the mounted lines. Never recreate a wallet, place a bet or replay an action.
export function mountSportsbookLive(root,{client,outcomeMap,active,onUpdate,onError=(_error)=>{}}) {
  let first=true;
  const loop=mountLiveScoreRefresh({active,refresh:async()=>{
    if(first){first=false;return true;}
    if(root.querySelector('.sb-slip[open],button[aria-busy="true"]'))return true;
    const ids=[...new Set([...root.querySelectorAll('[data-bet-outcome]')].map(button=>outcomeMap.get(button.dataset.betOutcome)?.market_id).filter(id=>id!=null))];
    if(!ids.length)return true;
    try{
      const fresh=await loadPropGame(client,ids);
      if(!active()||root.querySelector('.sb-slip[open]'))return true;
      onUpdate(fresh,ids);return true;
    }catch(error){if(active())onError(error);return false;}
  }});
  loop.start();return ()=>loop.stop();
}
