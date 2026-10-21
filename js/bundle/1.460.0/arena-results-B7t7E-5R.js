import{Ar as e,H as t,Kt as n,Lr as r,Mr as i,Nr as a,Rn as o,Vt as s,jr as c}from"./app-core-BN-xSORp.js";var l=e=>{let t=Number(e);return Number.isFinite(t)&&t>=0?`${(t/1e3).toFixed(2)}s`:`—`};async function u(u){let d=new URLSearchParams(location.hash.split(`?`)[1]||``).get(`id`);if(!d){u.innerHTML=`<h1>Arena Results</h1>${e(`No Arena event selected.`)}`;return}u.innerHTML=r(`Reading the finish…`);let[f,p,m]=await Promise.all([o().from(`arena_events`).select(`id,name,description,theme,event_date,status,bc_state`).eq(`id`,d).maybeSingle(),o().from(`arena_results`).select(`member_id,place,finish_ms`).eq(`event_id`,d).order(`place`),n().catch(()=>[])]);if(f.error||!f.data){u.innerHTML=`<h1>Arena Results</h1>${c(f.error||Error(`Event not found`))}`;return}if(p.error){u.innerHTML=`<h1>Arena Results</h1>${c(p.error)}`;return}let h=f.data,g=p.data||[],_=new Map(m.map(e=>[String(e.id),e]));u.innerHTML=`
    <header class="page-head">
      <a class="backlink" href="#/arena">← Arena</a>
      <h1>${i(h.name)}</h1>
      <p class="page-sub">
        ${i(t(h.theme))}${h.event_date?` · ${i(a(h.event_date))}`:``}
      </p>
      ${h.description?`<p class="page-sub">${i(h.description)}</p>`:``}
    </header>

    <div class="card">
      <div class="card-title">Race results</div>
      ${g.length?`
        <div class="tblwrap">
          <table class="tbl">
            <thead><tr><th>Place</th><th>Racer</th><th class="num">Time</th></tr></thead>
            <tbody>
              ${g.map(e=>{let t=_.get(String(e.member_id)),n=t?.display_name||`Unknown`;return`<tr>
                  <td><strong>${i(e.place)}</strong>${Number(e.place)===1?` ${s(`trophy`,{size:14,className:`win-ico`})}`:``}</td>
                  <td>${t?`<a href="#/profile?id=${t.id}">${i(n)}</a>`:i(n)}</td>
                  <td class="num">${i(l(e.finish_ms))}</td>
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