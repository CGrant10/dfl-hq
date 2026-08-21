// Restore the pre-metallic shell icons without disturbing Claude's unrelated fixes.
// The metallic commit swapped the shell to separate *-steel SVG symbols. CSS cannot
// reliably recolor those <use> shadow trees, so switch the references back to the
// original symbols and let profile-neutral.css apply the established neutral ink.
function neutralize(root=document){
  root.querySelectorAll?.('#tabbar use[href$="-steel"], #more use[href$="-steel"]').forEach(use=>{
    const href=use.getAttribute('href')||'';
    if(href.endsWith('-steel'))use.setAttribute('href',href.slice(0,-6));
  });
}

neutralize();

const more=document.getElementById('more');
if(more){
  new MutationObserver(()=>neutralize(more)).observe(more,{childList:true,subtree:true});
}
