// Neutral shell chrome. Golf may theme its page, but the nav keeps one stable visual language.
function ensureNeutralStyle(){
  if(document.getElementById('dfl-nav-neutral-style')) return;
  const s=document.createElement('style');
  s.id='dfl-nav-neutral-style';
  s.textContent=`
    /* The look that used to appear only while Golf was selected is now the
       resting state for every bottom-nav item. Selection is deliberately just
       a small lift, not a different icon treatment or a repaint of the bar. */
    .tabbar :is(a,.tabmore){color:#fff!important;opacity:1;transition:filter .18s ease,opacity .18s ease,transform .18s ease}
    .tabbar :is(a,.tabmore) svg,#more svg{
      color:#fff!important;
      filter:grayscale(1) saturate(0) brightness(1.55) drop-shadow(0 0 5px rgba(255,255,255,.38))!important;
      opacity:1!important;
      transition:filter .18s ease,opacity .18s ease,transform .18s ease;
    }
    .tabbar :is(a,.tabmore).on{
      color:#fff!important;
      filter:brightness(1.08);
    }
    .tabbar :is(a,.tabmore).on svg{
      color:#fff!important;
      filter:grayscale(1) saturate(0) brightness(1.7) drop-shadow(0 0 6px rgba(255,255,255,.46))!important;
      opacity:1!important;
    }
  `;
  document.head.appendChild(s);
}

function neutralize(root=document){
  root.querySelectorAll?.('#tabbar use[href$="-steel"], #more use[href$="-steel"]').forEach(use=>{
    const href=use.getAttribute('href')||'';
    if(href.endsWith('-steel')) use.setAttribute('href',href.slice(0,-6));
  });
}

function repairGolfRoute(){
  const bar=document.getElementById('tabbar');
  if(!bar)return;
  const golfUse=bar.querySelector('use[href="#i-golf"],use[href$="#i-golf"]');
  const golf=golfUse?.closest('a,.tabmore,button');
  if(!golf)return;
  if(golf.tagName==='A')golf.setAttribute('href','#/golf');
  golf.dataset.route='golf';
}

function apply(){ensureNeutralStyle();neutralize();repairGolfRoute();}
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});

document.addEventListener('click',event=>{
  const golf=event.target.closest('#tabbar [data-route="golf"]');
  if(!golf)return;
  if(location.hash.split('?')[0]!=='#/golf'){
    event.preventDefault();
    location.hash='#/golf';
  }
});
