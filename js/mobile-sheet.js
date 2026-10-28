import {enterSheet,exitSheet,mountSheetDrag} from './sheet-drag.js';
import {fitDialogToViewport} from './dialog-viewport.js';
import {cancelUiExit,cancelUiMotion} from './ui-motion.js';

/** Shared dialog lifecycle; native body scrolling never participates in dismissal. */
export function mountMobileSheet(dialog,{handle=dialog.querySelector('header'),canDismiss=()=>true,onClosed=()=>{},restoreFocus=null}={}){
 let opener=null,stopViewport=()=>{},stopped=false;
 dialog.classList.add('dfl-mobile-sheet');
 const finish=()=>{drag.reset();dialog.close()};
 const close=({immediate=false,force=false}={})=>{
  if(!dialog.open||!force&&!canDismiss())return;
  if(immediate){cancelUiExit(dialog);cancelUiMotion(dialog);finish()}else exitSheet(dialog,finish);
 };
 const drag=mountSheetDrag(dialog,{handle,canDismiss,dismiss:()=>close()});
 const cancel=e=>{e.preventDefault();close()};
 const key=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close()}};
 const backdrop=e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()};
 const closed=()=>{
  if(dialog.open)return;stopViewport();stopViewport=()=>{};cancelUiExit(dialog);cancelUiMotion(dialog);drag.reset();
  if(stopped)return;
  if(restoreFocus)restoreFocus(opener);else if(opener?.isConnected&&!document.querySelector('dialog[open]'))opener.focus({preventScroll:true});
  onClosed();
 };
 const route=()=>close({immediate:true,force:true});window.addEventListener('hashchange',route);
 dialog.addEventListener('cancel',cancel);dialog.addEventListener('keydown',key);dialog.addEventListener('click',backdrop);dialog.addEventListener('close',closed);
 return {
  open({source=document.activeElement,focus=dialog.querySelector('h2')}={}){
   if(stopped)return;cancelUiExit(dialog);cancelUiMotion(dialog);drag.reset();stopViewport();
   if(!dialog.open)opener=source;dialog.showModal();stopViewport=fitDialogToViewport(dialog)||(()=>{});
   const body=dialog.querySelector('[data-sheet-body]');if(body)body.scrollTop=0;
   if(focus){if(!focus.hasAttribute('tabindex')&&!focus.matches('input,button,select,textarea,a[href]'))focus.tabIndex=-1;focus.focus({preventScroll:true})}
   enterSheet(dialog);
  },close,
  stop(){stopped=true;window.removeEventListener('hashchange',route);stopViewport();drag.stop();cancelUiExit(dialog);cancelUiMotion(dialog);if(dialog.open)dialog.close();dialog.removeEventListener('cancel',cancel);dialog.removeEventListener('keydown',key);dialog.removeEventListener('click',backdrop);dialog.removeEventListener('close',closed)},
 };
}
