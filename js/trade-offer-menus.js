// Native disclosures retain every offer action without a crowded action row.
export function mountTradeOfferMenus(root){
 const menus=()=>[...root.querySelectorAll('.tb-offer-more[open]')];
 const close=menu=>{menu.open=false;menu.removeAttribute('data-menu-up');menu.style.removeProperty('--offer-menu-height')};
 const toggle=event=>{const menu=event.target;if(!menu.matches?.('.tb-offer-more')||!menu.open)return;
  for(const other of menus())if(other!==menu)close(other);
  const r=menu.querySelector(':scope > summary').getBoundingClientRect(),nav=document.querySelector('#tabbar')?.getBoundingClientRect(),header=document.querySelector('.topbar')?.getBoundingClientRect();
  const below=Math.max(44,(nav?.top||innerHeight)-r.bottom-12),above=Math.max(44,r.top-(header?.bottom||0)-12),up=below<180&&above>below;
  menu.toggleAttribute('data-menu-up',up);menu.style.setProperty('--offer-menu-height',`${Math.min(260,up?above:below)}px`);
 };
 const outside=event=>{if(document.querySelector('dialog[open]'))return;for(const menu of menus())if(!menu.contains(event.target))close(menu)};
 const key=event=>{if(event.key!=='Escape')return;const menu=event.target.closest('.tb-offer-more[open]');if(menu){event.preventDefault();close(menu);menu.querySelector('summary').focus()}};
 const resize=()=>menus().forEach(menu=>toggle({target:menu}));
 root.addEventListener('toggle',toggle,true);root.addEventListener('keydown',key);document.addEventListener('pointerdown',outside,{passive:true});window.addEventListener('resize',resize);
 return {layout:resize,stop(){menus().forEach(close);root.removeEventListener('toggle',toggle,true);root.removeEventListener('keydown',key);document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',resize)}};
}
