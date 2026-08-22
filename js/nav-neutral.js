// Neutral shell chrome. Golf may theme its page, but the nav keeps one stable visual language.
function ensureNeutralStyle(){
  if(document.querySelector('link[data-dfl-nav-neutral]'))return;
  const l=document.createElement('link');l.rel='stylesheet';l.href='./css/nav-neutral.css';l.dataset.dflNavNeutral='1';document.head.appendChild(l);
}
function neutralize(root=document){root.querySelectorAll?.('#tabbar use[href$="-steel"], #more use[href$="-steel"]').forEach(use=>{const href=use.getAttribute('href')||'';if(href.endsWith('-steel'))use.setAttribute('href',href.slice(0,-6));});}
function repairGolfRoute(){const bar=document.getElementById('tabbar');if(!bar)return;const golfUse=bar.querySelector('use[href="#i-golf"],use[href$="#i-golf"]');const golf=golfUse?.closest('a,.tabmore,button');if(!golf)return;if(golf.tagName==='A')golf.setAttribute('href','#/golf');golf.dataset.route='golf';}
function apply(){ensureNeutralStyle();neutralize();repairGolfRoute();}
apply();new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('click',event=>{const golf=event.target.closest('#tabbar [data-route="golf"]');if(!golf)return;if(location.hash.split('?')[0]!=='#/golf'){event.preventDefault();location.hash='#/golf';}});