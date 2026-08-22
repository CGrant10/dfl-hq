// Permanent neutral shell chrome. Keep member/theme colors in content, not nav icons.
function ensureNeutralStyle(){
  if(document.getElementById('dfl-nav-neutral-style')) return;
  const s=document.createElement('style');
  s.id='dfl-nav-neutral-style';
  s.textContent=`
    .tabbar :is(a,.tabmore){color:#c7cfda!important}
    .tabbar :is(a,.tabmore).on{color:#fff!important}
    .tabbar :is(a,.tabmore) svg,#more svg,.sheet-card svg{
      color:#c7cfda!important;
      filter:grayscale(1) saturate(0)!important;
      transition:filter .18s ease,opacity .18s ease,transform .18s ease;
    }
    .tabbar :is(a,.tabmore).on svg{
      color:#fff!important;
      filter:grayscale(1) saturate(0) brightness(1.35) drop-shadow(0 0 4px rgba(255,255,255,.26))!important;
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

function apply(){ensureNeutralStyle();neutralize();}
apply();
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
