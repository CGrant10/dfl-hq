// DFL Sportsbook entry in the existing More sheet. Kept out of index.html so
// the shell markup stays stable; the router calls this once at startup.
import { decorateChipEaters } from "./chip-eaters.js";

export function ensureSportsbookNav() {
  const nav = document.querySelector("#more .quicknav");
  if (nav && !nav.querySelector('a[href="#/sportsbook"]')) {
    const link = document.createElement("a");
    link.href = "#/sportsbook";
    link.innerHTML = `<svg class="ico" aria-hidden="true"><use href="#i-versus"></use></svg><span class="qn-label">Sportsbook</span>`;
    const admin = nav.querySelector('a[href="#/admin"]');
    nav.insertBefore(link, admin || null);
  }
  startChipEaters();
}

let chipStarted=false;
function startChipEaters(){
  if(chipStarted)return;chipStarted=true;
  let timer=0;
  const paint=()=>{clearTimeout(timer);timer=setTimeout(()=>{const view=document.getElementById("view");if(view)decorateChipEaters(view).catch(()=>{})},60)};
  new MutationObserver(paint).observe(document.getElementById("view")||document.body,{childList:true,subtree:true});
  window.addEventListener("hashchange",paint);
  paint();
}
