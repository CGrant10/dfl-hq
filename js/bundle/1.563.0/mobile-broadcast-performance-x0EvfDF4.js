var e=()=>(location.hash||``).split(`?`)[0]===`#/broadcast`,t=()=>e()&&Math.min(innerWidth,innerHeight)<=900;if(!document.getElementById(`arena-mobile-performance-css`)){let e=document.createElement(`style`);e.id=`arena-mobile-performance-css`,e.textContent=`
@media(max-width:900px){
  .bc-stage.arena-mobile-performance .race-scenery{
    filter:blur(var(--arena-mobile-blur,0px))!important;
    -webkit-filter:blur(var(--arena-mobile-blur,0px))!important;
    transform:scale(1.012);
    transform-origin:center;
    contain:paint;
    will-change:transform;
  }
  .bc-stage.arena-mobile-performance[data-course-stopped="true"] .race-scenery{
    filter:none!important;
    -webkit-filter:none!important;
  }
}
`,document.head.appendChild(e)}var n=0,r=-1;function i(){let e=document.querySelector(`#bc-stage`);if(!e||!t()){e?.classList.remove(`arena-mobile-performance`),r=-1;return}e.classList.add(`arena-mobile-performance`);let n=Number.parseFloat(e.style.getPropertyValue(`--arena-motion`))||0,i=Math.min(2.6,Math.max(0,n*2.6));r>=0&&Math.abs(i-r)<.12||(r=i,e.style.setProperty(`--arena-mobile-blur`,`${i.toFixed(2)}px`))}function a(){clearInterval(n),n=0,i(),t()&&(n=window.setInterval(i,120))}window.addEventListener(`hashchange`,a),window.addEventListener(`resize`,a,{passive:!0}),window.addEventListener(`orientationchange`,()=>setTimeout(a,80)),a();