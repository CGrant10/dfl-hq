import{Ht as e,Kn as t,Un as n,W as r,b as i,ir as a,lr as o,q as s,v as c}from"./app-core-C0_tEcFR.js";var l=`dfl-member-preview-style`,u=`dfl-glitch-filter`;function d(){if(document.getElementById(u))return;let e=document.createElementNS(`http://www.w3.org/2000/svg`,`svg`);e.setAttribute(`aria-hidden`,`true`),e.setAttribute(`width`,`0`),e.setAttribute(`height`,`0`),e.style.cssText=`position:absolute;width:0;height:0;overflow:hidden`,e.innerHTML=`
    <filter id="${u}" x="-8%" y="-4%" width="116%" height="108%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.00001 0.28" numOctaves="1" seed="7" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="torn"/>
      <feOffset in="torn" dx="0" dy="0" result="ghostA"/>
      <feColorMatrix in="ghostA" type="matrix" result="redOnly"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
      <feOffset in="torn" dx="0" dy="0" result="ghostB"/>
      <feColorMatrix in="ghostB" type="matrix" result="blueOnly"
        values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
      <feBlend in="redOnly" in2="blueOnly" mode="screen"/>
    </filter>`,document.body.appendChild(e)}var f=620,p=190;function m(){if(document.getElementById(l))return;let e=document.createElement(`style`);e.id=l,e.textContent=`
/*
  Two derived tokens the effect leans on, rather than colours of its own.

  --dfl-scan   mixed from --text, so scanlines are light on a dark palette and
               dark on a light one without branching on the mode.
  --dfl-glitch-blend
               screen brightens, which is how the channel split reads on a dark
               ground - and on a near-white one it has almost no headroom, so
               the whole effect washed out to nothing. Light grounds multiply
               instead.

               One selector covers every light palette: theme.js collapses any
               light-surface mode to data-mode="light" and keeps the real name
               in data-palette, so Fairway and any light club palette are
               already caught here without being named.
*/
:root{--dfl-scan:color-mix(in srgb,var(--text) 14%,transparent);--dfl-glitch-blend:screen}
:root[data-mode="light"]{--dfl-glitch-blend:multiply}

/* The switch names the view you are in. A knob alone told you a switch had been
   thrown but not which side you landed on - the transition said it, then the
   words were gone. The label is always there now, at every width, and colour
   backs it up rather than carrying it - the palette's second accent for your
   own tools, its first for member view, so neither is a colour this file
   invented. */
.dfl-preview-toggle{display:none;align-items:center;gap:7px;min-height:44px;margin-left:auto;padding:4px 10px 4px 7px;border:1px solid var(--control-line,rgba(255,255,255,.24));border-radius:999px;background:var(--control-bg,rgba(255,255,255,.06));color:var(--muted,#9fb0c0);font:900 11px/1.2 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase;white-space:nowrap;cursor:pointer;transition:color .2s,border-color .2s,background .2s}
.dfl-preview-toggle.is-available{display:inline-flex}
.dfl-preview-track{position:relative;flex:0 0 auto;width:24px;height:13px;border:1px solid var(--control-line,rgba(255,255,255,.3));border-radius:999px;background:rgba(0,0,0,.32);transition:background .22s,border-color .22s}
.dfl-preview-knob{position:absolute;top:1px;left:1px;width:9px;height:9px;border-radius:50%;background:var(--muted,#8fa0b0);transition:transform .22s cubic-bezier(.34,1.4,.5,1),background .22s}
.dfl-preview-label{display:inline-block;color:inherit;opacity:1;visibility:visible}
.dfl-preview-short{display:none}
.dfl-preview-toggle:focus-visible{outline:2px solid var(--accent,#ffd400);outline-offset:2px}

/* Holding your own tools. Drawn in the palette's second accent, so this is
   the crest yellow in Medicine, the crest blue in Dark and Light, and the
   fairway blue in Fairway - never a hardcoded gold. */
.dfl-preview-toggle[data-mode="commissioner"]{border-color:color-mix(in srgb,var(--accent-2) 55%,transparent);background:color-mix(in srgb,var(--accent-2) 10%,transparent);color:var(--accent-2)}
.dfl-preview-toggle[data-mode="commissioner"] .dfl-preview-track{border-color:color-mix(in srgb,var(--accent-2) 55%,transparent)}
.dfl-preview-toggle[data-mode="commissioner"] .dfl-preview-knob{background:var(--accent-2-fill);box-shadow:0 0 6px color-mix(in srgb,var(--accent-2-fill) 80%,transparent)}

/* Looking as a member on purpose - knob thrown, filled rather than outlined so
   it reads as the active, deliberate state. The palette's first accent, which
   is the readable one, so the label holds up on a white ground too. */
.dfl-preview-toggle[data-mode="member"]{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 18%,transparent);color:var(--accent)}
.dfl-preview-toggle[data-mode="member"] .dfl-preview-track{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 28%,transparent)}
.dfl-preview-toggle[data-mode="member"] .dfl-preview-knob{transform:translateX(11px);background:var(--accent-fill);box-shadow:0 0 7px color-mix(in srgb,var(--accent-fill) 75%,transparent)}

/* A commissioner who has not entered a PIN this session. Same side of the
   switch as member view, because that is what they are seeing. The header
   applies the same role color; the accessible copy explains the PIN requirement. */
.dfl-preview-toggle[data-mode="locked"]{border-style:dashed;border-color:var(--control-line,rgba(255,255,255,.34));color:var(--muted,#9fb0c0)}
.dfl-preview-toggle[data-mode="locked"] .dfl-preview-knob{transform:translateX(11px)}
.dfl-preview-toggle[data-mode="locked"] .dfl-preview-track{border-style:dashed}

/* Narrow phones keep the word, just a shorter one. Dropping the label entirely
   is what left the view unnamed in the first place. */
@media(max-width:430px){
  .dfl-preview-toggle{gap:6px;padding:4px 8px 4px 6px;letter-spacing:.06em}
  .dfl-preview-word{display:none}
  .dfl-preview-short{display:inline}
}

/* A second, quieter cue that does not depend on looking at the top right: a
   hairline under the top bar while you are in member view. Two pixels, no
   copy - the loud version of this was a full banner. */
body.is-member-preview .topbar{box-shadow:inset 0 -2px 0 var(--accent-fill)}

/* THE GLITCH. A CRT losing sync for half a second: scanlines roll, the picture
   tears into offset slices, the colour channels separate, and a monospace
   readout names the mode you are landing in. The route repaints underneath at
   ${p}ms, so the switch is covered rather than watched. */
.dfl-glitch{position:fixed;inset:0;z-index:9500;overflow:hidden;pointer-events:none;animation:dfl-glitch-out ${f}ms steps(1,end) forwards}
/* Scanlines are mixed from --text rather than hardcoded white, so they come
   out light on a dark palette and dark on a light one with no branching. */
.dfl-glitch-scan{position:absolute;inset:-10% 0;background:repeating-linear-gradient(0deg,var(--dfl-scan) 0,var(--dfl-scan) 1px,transparent 1px,transparent 3px);animation:dfl-glitch-roll ${f}ms linear}
.dfl-glitch-tear{position:absolute;left:-6%;width:112%;background:color-mix(in srgb,var(--accent) 14%,transparent);mix-blend-mode:var(--dfl-glitch-blend);animation:dfl-glitch-tear 140ms steps(2,end) infinite}
/* The two channels are the crest pair for whichever palette is on: red and
   blue in Dark and Light, red and yellow in Medicine, green and blue in
   Fairway. This is what "takes on the theme accents" means in practice. */
/* The channel split now happens on the real pixels, in the SVG filter. What
   is left over the top is only what a screen genuinely adds: scanlines and a
   faint accent wash in the tear bands. */
/* The readout sits on a plate. Without one it lands on top of whatever the page
   was already showing - a headline, a photo - and turns into noise. */
.dfl-glitch-readout{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);max-width:min(340px,calc(100% - 32px));padding:13px 20px;border:1px solid color-mix(in srgb,var(--accent) 50%,transparent);border-radius:4px;background:color-mix(in srgb,var(--bg) 88%,transparent);text-align:center;color:var(--accent);font:900 10px/1.6 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.3em;text-transform:uppercase;text-shadow:0 0 10px color-mix(in srgb,var(--accent) 55%,transparent);box-shadow:0 0 26px color-mix(in srgb,var(--accent) 22%,transparent);animation:dfl-glitch-flicker ${f}ms steps(1,end)}
.dfl-glitch-readout b{display:block;margin-top:3px;font-size:14px;letter-spacing:.18em;color:var(--text)}
@keyframes dfl-glitch-roll{from{transform:translateY(-14%)}to{transform:translateY(14%)}}
@keyframes dfl-glitch-tear{0%{transform:translateX(-3%) scaleY(1)}50%{transform:translateX(4%) scaleY(1.6)}100%{transform:translateX(-1%) scaleY(.7)}}
@keyframes dfl-glitch-flicker{0%{opacity:0}12%{opacity:1}22%{opacity:.15}34%{opacity:1}62%{opacity:.85}78%{opacity:1}100%{opacity:0}}
@keyframes dfl-glitch-out{0%,86%{opacity:1}100%{opacity:0}}

/* The app itself jolts, so it reads as the whole machine losing sync and not an
   overlay floating on top of a perfectly calm page. */
/* The shake shifts things sideways, which grows the document and pops a
   horizontal scrollbar for the duration. clip rather than hidden, and on the
   root as well as the body: the root is the scrolling element here, so a rule
   on body alone does nothing, and hidden would turn it into a scroll container
   and lose the vertical position. */
:root:has(body.is-glitching),body.is-glitching{overflow-x:clip}
/* The filter is the effect; the jolt is only what a knocked screen does on top
   of it. Applying filter here also makes #view a containing block - the old
   contrast()/invert() shake already did that, so this changes nothing. */
body.is-glitching #view,body.is-glitching .topbar,body.is-glitching .breaking-trade{animation:dfl-glitch-shake ${f}ms steps(2,end)}
body.is-tearing #view,body.is-tearing .topbar,body.is-tearing .breaking-trade{filter:url(#${u})}
@keyframes dfl-glitch-shake{0%{transform:none}18%{transform:translate(-2px,1px)}34%{transform:translate(3px,-1px)}52%{transform:translate(-1px,1px)}70%{transform:translate(2px,0)}100%{transform:none}}

/* Anyone who has asked the system to calm down gets the switch with none of the
   theatre - the mode still changes, it just does not lurch. */
@media(prefers-reduced-motion:reduce){
  .dfl-glitch{animation:dfl-glitch-out 160ms steps(1,end) forwards}
  .dfl-glitch-scan,.dfl-glitch-tear{display:none}
  body.is-tearing #view,body.is-tearing .topbar,body.is-tearing .breaking-trade{filter:none}
  .dfl-glitch-readout{animation:none;opacity:1}
  body.is-glitching #view,body.is-glitching .topbar,body.is-glitching .breaking-trade{animation:none}
  .dfl-preview-knob{transition:none}
}
`,document.head.appendChild(e)}var h=()=>document.querySelector(`[data-dfl-preview-toggle]`),g=()=>window.matchMedia?.(`(prefers-reduced-motion: reduce)`).matches===!0;function _(){return a()?`member`:t()?`commissioner`:b?`locked`:`none`}var v={commissioner:{word:`Commissioner`,short:`Commish`,title:`You have your commissioner tools. Tap to look at the app as a member.`},member:{word:`Member view`,short:`Member`,title:`You are in Member view with commissioner tools off. Tap to return to Commissioner view.`},locked:{word:`Member view`,short:`Member`,title:`You are seeing the app as a member. Tap and enter your commissioner PIN to switch.`}};function y(){let e=h();if(!e)return;let t=_(),n=v[t];e.hidden=!n,e.classList.toggle(`is-available`,!!n),e.dataset.mode=t,e.setAttribute(`aria-pressed`,String(t===`member`||t===`locked`)),n&&(e.querySelector(`.dfl-preview-word`).textContent=n.word,e.querySelector(`.dfl-preview-short`).textContent=n.short,e.title=n.title,e.setAttribute(`aria-label`,`${n.word}. ${n.title}`)),document.body.classList.toggle(`is-member-preview`,t===`member`||t===`locked`)}var b=!1,x=null;async function S(){let t=e()?.id??null,n=t==null?null:String(t);if(n===x||(x=n,b=!1,y(),n==null))return;let i=await r(n).catch(()=>!1);String(e()?.id??``)===n&&(b=i,y())}function C(e){let t=document.createElement(`div`);t.className=`dfl-glitch`,t.setAttribute(`aria-hidden`,`true`),t.innerHTML=`
    <div class="dfl-glitch-scan"></div>
    ${[18,39,57,74].map(e=>`<div class="dfl-glitch-tear" style="top:${e}%;height:${3+e%5}%"></div>`).join(``)}
    <div class="dfl-glitch-readout">
      <span>reassigning session</span>
      <b>${e?`access :: member`:`access :: commissioner`}</b>
    </div>`,document.body.appendChild(t),document.body.classList.add(`is-glitching`),T()&&!g()&&document.body.classList.add(`is-tearing`),D(),setTimeout(()=>{t.remove(),document.body.classList.remove(`is-glitching`),document.body.classList.remove(`is-tearing`)},g()?200:f)}var w=`dfl.glitchHeavy`,T=()=>{try{return localStorage.getItem(w)!==`no`}catch{return!0}};function E(){try{if(localStorage.getItem(w))return}catch{return}let e=[],t=performance.now(),n=t,r=i=>{if(e.push(i-t),t=i,i-n<f){requestAnimationFrame(r);return}if(e.shift(),e.length<6)return;let a=[...e].sort((e,t)=>e-t),o=a[Math.floor(a.length/2)];try{localStorage.setItem(w,o>28?`no`:`yes`)}catch{}};requestAnimationFrame(r)}function D(){let e=document.getElementById(u);if(!e||g())return;E();let t=e.querySelector(`feTurbulence`),n=e.querySelector(`feDisplacementMap`),r=e.querySelectorAll(`feOffset`),i=performance.now(),a=-1,o=e=>{let s=e-i,c=Math.min(1,s/f);if(c>=1){n.setAttribute(`scale`,`0`),r.forEach(e=>{e.setAttribute(`dx`,`0`),e.setAttribute(`dy`,`0`)});return}let l=Math.floor(c*14);if(l!==a){a=l;let e=(1-c)**1.6,i=e=>Math.sin(l*12.9898+e)*43758.5453%1;n.setAttribute(`scale`,String(Math.round(46*e*(.45+Math.abs(i(1)))))),t.setAttribute(`baseFrequency`,`0.00001 ${(.16+Math.abs(i(2))*.5).toFixed(3)}`);let o=7*e;r[0].setAttribute(`dx`,(-o*(.5+Math.abs(i(3)))).toFixed(1)),r[0].setAttribute(`dy`,(i(4)*1.5).toFixed(1)),r[1].setAttribute(`dx`,(o*(.5+Math.abs(i(5)))).toFixed(1)),r[1].setAttribute(`dy`,(i(6)*-1.5).toFixed(1))}requestAnimationFrame(o)};requestAnimationFrame(o)}var O=!1;function k(e){C(e);let t=()=>{o(e),y(),i(),O=!1};g()?t():setTimeout(t,p)}async function A(){if(O)return;let e=_();if(e!==`none`){O=!0;try{if(e===`locked`){if(!await s()){O=!1,y();return}o(!1),k(!1);return}k(e===`commissioner`)}catch(e){O=!1,y(),console.warn(`member preview:`,e)}}}function j(){m(),d(),y(),S()}function M(){let e=document.querySelector(`.topbar-actions`)||document.querySelector(`.topbar-inner`),t=document.getElementById(`whoami`);if(!e||h())return j();m();let r=document.createElement(`button`);r.type=`button`,r.className=`dfl-preview-toggle`,r.dataset.dflPreviewToggle=``,r.hidden=!0,r.setAttribute(`aria-pressed`,`false`),r.setAttribute(`aria-label`,`Commissioner view`),r.innerHTML=`<span class="dfl-preview-track" aria-hidden="true"><span class="dfl-preview-knob"></span></span><span class="dfl-preview-label"><span class="dfl-preview-word">Commissioner</span><span class="dfl-preview-short" aria-hidden="true">Commish</span></span>`,r.addEventListener(`click`,A),e.insertBefore(r,t||null),window.addEventListener(n,()=>setTimeout(j,0)),window.addEventListener(`dfl:pick-member`,()=>setTimeout(j,0)),c(()=>j()),j()}export{M as mountMemberPreview};