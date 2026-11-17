import {parseTradeOffer} from './trade-offer-import.js';
import {fitDialogToViewport} from './dialog-viewport.js';
import {enterSheet,exitSheet} from './sheet-drag.js';

export function openTradeOfferImport({team,teams,pool,maxPlayers=8,onImport}){
 const dialog=document.createElement('dialog'),opener=document.activeElement;
 dialog.className='trade-import-sheet';dialog.setAttribute('aria-labelledby','trade-import-title');
 dialog.innerHTML=`<header><h2 id="trade-import-title" tabindex="-1">Review a Sleeper offer</h2><button type="button" class="linkbtn" data-import-close>Close</button></header><form><label>You send<textarea name="send" rows="2" maxlength="1200" required placeholder="Chris Olave, James Cook"></textarea></label><label>You receive<textarea name="receive" rows="2" maxlength="1200" required placeholder="Amon-Ra St. Brown"></textarea></label><p class="trade-import-note">Paste player names, separated by commas or new lines.</p><p data-import-error role="alert" hidden></p><button class="btn" type="submit">Grade &amp; find counters</button></form>`;
 document.body.append(dialog);let stopped=false;
 const finish=()=>{if(stopped)return;stopped=true;if(dialog.open)dialog.close();dialog.remove();opener?.isConnected&&opener.focus({preventScroll:true})};
 const close=(immediate=false)=>{if(immediate)finish();else exitSheet(dialog,finish,{motion:true})};
 dialog.querySelector('[data-import-close]').addEventListener('click',()=>close());
 dialog.addEventListener('cancel',event=>{event.preventDefault();close()});
 dialog.addEventListener('click',event=>{if(event.target===dialog)close()});
 dialog.querySelector('form').addEventListener('input',()=>{dialog.querySelector('[data-import-error]').hidden=true});
 dialog.querySelector('form').addEventListener('submit',event=>{
  event.preventDefault();if(stopped)return;
  const form=event.currentTarget,result=parseTradeOffer({team,teams,pool,maxPlayers,sendText:form.elements.namedItem('send').value,receiveText:form.elements.namedItem('receive').value});
  const error=dialog.querySelector('[data-import-error]');
  if(!result.ok){error.hidden=false;error.textContent=result.errors.join(' ');return;}
  finish();onImport(result.deal);
 });
 dialog.showModal();fitDialogToViewport(dialog);dialog.querySelector('h2').focus({preventScroll:true});enterSheet(dialog,{motion:true});
 return ()=>close(true);
}
