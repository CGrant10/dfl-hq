// Neutral shell chrome. Golf may theme its page, but the nav keeps one stable visual language.
function ensureNeutralStyle(){
  if(document.getElementById('dfl-nav-neutral-style')) return;
  const s=document.createElement('style');
  s.id='dfl-nav-neutral-style';
  s.textContent=`
    .tabbar :is(a,.tabmore){color:#e6ebf2!important;transition:color .18s ease,opacity .18s ease}
    .tabbar :is(a,.tabmore) svg,#more svg,.sheet-card svg{
      color:#fff!important;
      filter:grayscale(1) saturate(0) brightness(1.35) drop-shadow(0 0 4px rgba(255,255,255,.26))!important;
      opacity:.9;
      transition:filter .18s ease,opacity .18s ease,transform .18s ease;
    }
    .tabbar :is(a,.tabmore).on{color:#fff!important}
    .tabbar :is(a,.tabmore).on svg{
      color:#fff!important;
      filter:grayscale(1) saturate(0) brightness(1.55) drop-shadow(0 0 5px rgba(255,255,255,.38))!important;
      opacity:1;
    }
    .tabbar :is(a,.tabmore).on::before,.tabbar :is(a,.tabmore).on::after{background:var(--accent-sweep)!important}
  `;
  document.head.appendChild(s);
}

function neutralize(root=document){
  root.querySelectorAll?.('#tabbar use[href$="-steel"], #more use[href$="-steel"], .sheet-card use[href$="-steel"]').forEach(use=>{
    const href=use.getAttribute('href')||'';
    if(href.endsWith('-steel')) use.setAttribute('href',href.slice(0,-6));
  });
}

// The Golf tab has been moved/reworked a few times. Identify it by its icon and
// make its route explicit so stale/incorrect markup can never send it to Home.
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
  // Hash assignment is deliberate: it works whether Golf is an anchor or a button.
  if(location.hash.split('?')[0]!=='#/golf'){
    event.preventDefault();
    location.hash='#/golf';
  }
});
