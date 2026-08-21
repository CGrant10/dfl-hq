// =====================================================================
// DFL Arena Beta — rendered production visual sandbox
//
// IMPORTANT: this route stays isolated from live Arena/Broadcast. The visual
// surface is now a real raster render rather than CSS/SVG-built car art.
// =====================================================================

function ensureStyles(){
  if(document.getElementById("arena-beta-render-css"))return;
  const link=document.createElement("link");
  link.id="arena-beta-render-css";
  link.rel="stylesheet";
  link.href="css/arena-beta-render.css";
  document.head.appendChild(link);
}

export async function render(view){
  ensureStyles();
  view.innerHTML=`
    <div id="arena-beta-render-wrap" class="arena-beta-render-wrap">
      <div class="abr-topbar">
        <a class="abr-back" href="#/arena">← Live Arena</a>
        <div class="abr-status"><strong>ARENA BETA</strong><span>Rendered asset build · isolated from live races</span></div>
        <span class="abr-pill">BETA</span>
      </div>

      <section class="abr-stage" aria-label="DFL Arena Beta garage production render">
        <img
          class="abr-production-render"
          src="assets/arena-beta/arena-beta-render.jpg"
          alt="DFL Arena Beta garage with illustrated arcade vehicles, customization panels, antenna flag, accessories and DFL Speedway preview"
          decoding="async"
        />
      </section>

      <div class="abr-note">
        <strong>Visual baseline is now raster artwork.</strong>
        <span>The old procedural SVG/CSS vehicle preview is no longer used on this page. Controls and per-vehicle image layers are the next Beta wiring step; live Arena remains untouched.</span>
      </div>
    </div>`;
}
