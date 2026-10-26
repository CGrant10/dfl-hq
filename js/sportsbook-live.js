import {mountLiveScoreRefresh} from './live-score-refresh.js';
import {loadPropGame} from './sportsbook-loading.js';
import {loadBookAccount} from './sportsbook-settlement.js';

// Read only the mounted lines. Never recreate a wallet, place a bet or replay an action.
export function mountSportsbookLive(root,{client,memberId,outcomeMap,active,onUpdate,onAccount=(_data)=>{},onAccountError=(_error)=>{},onError=(_error)=>{},onRefresh=async(_force)=>{},interval=60000}) {
  let first=true;
  const loop=mountLiveScoreRefresh({active,interval,refresh:async(force)=>{
    if(first){first=false;await onRefresh(force);return true;}
    if(root._bookTicketBusy||root.querySelector('.sb-slip [type="submit"]:disabled,button[aria-busy="true"]'))return true;
    const ids=[...new Set([...root.querySelectorAll('[data-bet-outcome]')].map(button=>outcomeMap.get(button.dataset.betOutcome)?.market_id).filter(id=>id!=null))];
    const [account,quotes]=await Promise.allSettled([
      loadBookAccount(client,memberId),
      ids.length&&!root.querySelector('.sb-slip[open]')?loadPropGame(client,ids):Promise.resolve(null),
      onRefresh(force),
    ]);
    if(!active()||root._bookTicketBusy||root.querySelector('.sb-slip [type="submit"]:disabled'))return true;
    if(account.status==='fulfilled')onAccount(account.value);else onAccountError(account.reason);
    if(quotes.status==='fulfilled'){if(quotes.value&&!root.querySelector('.sb-slip[open]'))onUpdate(quotes.value,ids);}
    else onError(quotes.reason);
    return account.status==='fulfilled'&&quotes.status==='fulfilled';
  }});
  loop.start();return ()=>loop.stop();
}
