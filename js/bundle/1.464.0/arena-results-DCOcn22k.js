import{Ar as e,H as t,Ir as n,Kt as r,Ln as i,Mr as a,Vt as o,jr as s,kr as c}from"./app-core-cNr3CobW.js";var l=e=>{let t=Number(e);return Number.isFinite(t)&&t>=0?`${(t/1e3).toFixed(2)}s`:`—`};async function u(u){let d=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`);if(!d){u.innerHTML=`<h1>Arena Results</h1>${c(`No Arena event selected.`)}`;return}u.innerHTML=n(`Reading the finish…`);let[f,p,m]=await Promise.all([i().from(`arena_events`).select(`id,name,description,theme,event_date,status,bc_state`).eq(`id`,d).maybeSingle(),i().from(`arena_results`).select(`member_id,place,finish_ms`).eq(`event_id`,d).order(`place`),r().catch(()=>[])]);if(f.error||!f.data){u.innerHTML=`<h1>Arena Results</h1>${e(f.error||Error(`Event not found`))}`;return}if(p.error){u.innerHTML=`<h1>Arena Results</h1>${e(p.error)}`;return}let h=f.data,g=p.data||[],_=new Map(m.map(e=>[String(e.id),e]));u.innerHTML=`
    <header class="page-head">
      <a class="backlink" href="#/arena">← Arena</a>
      <h1>${s(h.name)}</h1>
      <p class="page-sub">
        ${s(t(h.theme))}${h.event_date?` · ${s(a(h.event_date))}`:``}
      </p>
      ${h.description?`<p class="page-sub">${s(h.description)}</p>`:``}
    </header>

    <div class="card">
      <div class="card-title">Race results</div>
      ${g.length?`
        <div class="tblwrap">
          <table class="tbl">
            <thead><tr><th>Place</th><th>Racer</th><th class="num">Time</th></tr></thead>
            <tbody>
              ${g.map(e=>{let t=_.get(String(e.member_id)),n=t?.display_name||`Unknown`;return`<tr>
                  <td><strong>${s(e.place)}</strong>${Number(e.place)===1?` ${o(`trophy`,{size:14,className:`win-ico`})}`:``}</td>
                  <td>${t?`<a href="#/profile?id=${t.id}">${s(n)}</a>`:s(n)}</td>
                  <td class="num">${s(l(e.finish_ms))}</td>
                </tr>`}).join(``)}
            </tbody>
          </table>
        </div>`:`
        <div class="card-body muted">The race has finished, but its saved results are not available yet.</div>`}
    </div>

    <div class="row-end">
      <a class="btn ghost" href="#/arena">Arena history</a>
    </div>
  `}export{u as render};