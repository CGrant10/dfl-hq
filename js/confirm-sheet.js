import {esc} from './ui.js';
import {mountMobileSheet} from './mobile-sheet.js';
export function confirmSheet({title,message,action='Confirm',source=document.activeElement}={}){
 return new Promise(resolve=>{
  const dialog=document.createElement('dialog');dialog.className='dfl-confirm-sheet';dialog.setAttribute('aria-labelledby','dfl-confirm-title');
  dialog.innerHTML=`<header><h2 id="dfl-confirm-title">${esc(title)}</h2><button type="button" data-confirm-close aria-label="Close confirmation">Close</button></header><div data-sheet-body><p>${esc(message)}</p></div><footer><button type="button" class="btn ghost" data-confirm-close>Cancel</button><button type="button" class="btn" data-confirm-yes>${esc(action)}</button></footer>`;
  document.body.append(dialog);let accepted=false;
  const sheet=mountMobileSheet(dialog,{onClosed:()=>{sheet.stop();dialog.remove();resolve(accepted)}});
  dialog.querySelectorAll('[data-confirm-close]').forEach(b=>b.onclick=()=>sheet.close());
  dialog.querySelector('[data-confirm-yes]').onclick=()=>{accepted=true;sheet.close()};
  sheet.open({source});
 });
}
