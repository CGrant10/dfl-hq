// =====================================================================
// DFL Sportsbook - fake SIN, real DFL consequences.
// =====================================================================
import { db, hasPermission } from "../supabase.js";
import { currentMember } from "../members.js";
import { esc, toast } from "../ui.js";

const fmtOdds=n=>Number(n)>0?`+${Number(n)}`:String(Number(n));
const fmtTime=v=>v?new Date(v).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
const isOpen=m=>m.status==="open"&&(!m.closes_at||new Date(m.closes_at)>new Date());
const isGolf=m=>m.category==="Golf"&&String(m.auto_key||"").startsWith("golf:");
const golfKind=m=>String(m.auto_key||"").includes(":moneyline:")?"Moneyline":String(m.auto_key||"").includes(":spread:")?"Spread":String(m.auto_key||"").includes(":margin-total:")?"Total":String(m.auto_key||"").includes(":team-war:")?"Tournament":"Line";
const golfSort=m=>({Tournament:0,Moneyline:1,Spread:2,Total:3,Line:4}[golfKind(m)]??9);

export async function render(view){
  const me=currentMember();
  if(!me){view.innerHTML=`<h1>DFL Sportsbook</h1><div class="card"><div class="card-body">Pick your league member first.</div></div>`;return}
  view.innerHTML=`<h1>DFL Sportsbook</h1><div class="card"><div class="card-body muted">Opening the book…</div></div>`;
  let wallet,ledger,leaders,markets,outcomes,bets,autoState=null;
  let autoReady=true,golfReady=true,golfError="";
  try{
    const touch=await db().rpc("sportsbook_touch_wallet");if(touch.error)throw touch.error;wallet=touch.data?.[0]||null;
    try{
      const g=await db().rpc("sportsbook_maintain_golf_board");
      if(g.error)throw g.error;
      const repr=await db().rpc("sportsbook_reprice_open_golf");
      if(repr.error)golfError=repr.error.message||String(repr.error);
    }catch(err){golfReady=false;golfError=err?.message||String(err||"Golf board refresh failed")}
    try{const a=await db().rpc("sportsbook_maintain_auto_board",{target_open:6});if(a.error)throw a.error;autoState=a.data?.[0]||null}catch{autoReady=false}
    const[lr,br,mr,or,btr]=await Promise.all([
      db().rpc("sportsbook_my_ledger",{row_limit:16}),
      db().rpc("sportsbook_leaderboard"),
      db().from("sportsbook_markets").select("*").order("created_at",{ascending:false}).limit(100),
      db().from("sportsbook_outcomes").select("*").order("sort_order"),
      db().rpc("sportsbook_my_bets",{row_limit:30})
    ]);
    const err=lr.error||br.error||mr.error||or.error||btr.error;if(err)throw err;
    ledger=lr.data||[];leaders=br.data||[];markets=mr.data||[];outcomes=or.data||[];bets=btr.data||[];
  }catch(err){view.innerHTML=`<h1>DFL Sportsbook</h1><div class="card note"><div class="card-body">The Sportsbook could not load.<br><span class="muted tiny">${esc(err.message||String(err))}</span></div></div>`;return}

  const byMarket=new Map();
  for(const o of outcomes){const k=String(o.market_id);if(!byMarket.has(k))byMarket.set(k,[]);byMarket.get(k).push(o)}
  const marketMap=new Map(markets.map(m=>[String(m.id),m])),outcomeMap=new Map(outcomes.map(o=>[String(o.id),o]));
  const open=markets.filter(isOpen),golf=open.filter(isGolf),other=open.filter(m=>!isGolf(m)),rulings=markets.filter(m=>m.status==="locked"),canBook=hasPermission("sportsbook");
  const golfNotice=!golfReady&&golf.length===0?`<div class="card note"><div class="card-body"><strong>Golf board refresh failed.</strong>${golfError?`<br><span class="muted tiny">${esc(golfError)}</span>`:""}</div></div>`:"";

  view.innerHTML=`<div id="sportsbook-wrap">
    <header class="page-head"><h1>DFL Sportsbook</h1></header>
    ${bankrollCard(me,wallet,golf,open,autoReady,autoState)}
    ${golfNotice}
    ${golf.length?golfBoard(golf,byMarket,bets,canBook):""}
    ${categoryBoard(other,byMarket,bets,canBook)}
    ${bets.length?`<section class="block"><h2 class="section-title">Your tickets</h2>${bets.slice(0,10).map(b=>ticketCard(b,marketMap,outcomeMap)).join("")}</section>`:""}
    ${canBook&&rulings.length?rulingQueue(rulings,byMarket):""}
    ${canBook?commissionerBook():""}
    <section class="block"><h2 class="section-title">SIN leaderboard</h2><div class="card"><div class="card-body">${leaders.length?leaders.slice(0,12).map((r,i)=>`<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${i+1}.</strong> ${esc(r.display_name)}</span><strong>${Number(r.balance).toLocaleString()} SIN</strong></div>`).join(""):`<span class="muted">No bankrolls yet.</span>`}</div></div></section>
    <details class="card"><summary class="card-title">Receipts</summary><div class="card-body">${ledger.length?ledger.map(r=>`<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${esc(r.note||r.kind)}</strong><br><span class="muted tiny">${esc(fmtTime(r.created_at))}</span></span><strong>${r.amount>0?"+":""}${r.amount} SIN</strong></div>`).join(""):`<span class="muted">No SIN has moved yet.</span>`}</div></details>
    <p class="muted tiny" style="text-align:center">SIN is play money only.</p>
  </div>`;
  wireBets(view,outcomeMap);if(canBook)wireCommissioner(view);
}

function bankrollCard(me,wallet,golf,open,autoReady,autoState){return `<section class="card"><div class="card-title-row"><div><div class="card-title">${esc(me.display_name)}</div><p class="muted tiny">+50 SIN every 24 hours</p></div><strong style="font-size:28px;font-variant-numeric:tabular-nums">${Number(wallet?.balance||0).toLocaleString()} SIN</strong></div><div class="row" style="margin-top:10px;gap:6px;flex-wrap:wrap">${Number(wallet?.credited||0)>0?`<span class="pill green">+${wallet.credited}</span>`:""}<span class="pill">Next ${esc(fmtTime(wallet?.next_daily_at))}</span>${golf.length?`<span class="pill green">${golf.length} Golf lines</span>`:autoReady?`<span class="pill">${Number(autoState?.open_auto??open.length)} live</span>`:""}</div></section>`}

function golfGroupKey(m){const k=String(m.auto_key||"");const match=k.match(/^golf:(\d+):match:(\d+):/);if(match)return`match:${match[2]}`;const team=k.match(/^golf:(\d+):team-war:/);if(team)return`outing:${team[1]}`;return`market:${m.id}`}
function cleanGolfTitle(title){return String(title||"Golf").replace(/\s+—\s+(Moneyline|DFL handicap|Winning margin O\/U.*|Tournament moneyline).*$/i,"").trim()}
function golfBoard(markets,byMarket,bets,canBook){
  const groups=new Map();
  for(const m of markets){const k=golfGroupKey(m);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}
  const cards=[...groups.values()].map(ms=>{ms.sort((a,b)=>golfSort(a)-golfSort(b));const title=cleanGolfTitle(ms.find(m=>golfKind(m)==="Moneyline")?.title||ms[0]?.title);const close=ms.map(m=>m.closes_at).filter(Boolean).sort()[0];return `<article class="card sportsbook-match"><div class="card-title-row"><h3 class="card-heading">${esc(title)}</h3>${close?`<span class="pill">${esc(fmtTime(close))}</span>`:""}</div>${ms.map(m=>marketLine(m,byMarket.get(String(m.id))||[],bets,canBook)).join("")}</article>`}).join("");
  return `<section class="block"><h2 class="section-title">Golf</h2>${cards}</section>`;
}

function categoryBoard(markets,byMarket,bets,canBook){
  if(!markets.length)return `<section class="block"><h2 class="section-title">Other lines</h2><div class="card"><div class="card-body muted">No other lines open.</div></div></section>`;
  const groups=new Map();for(const m of markets){const c=m.category||"Other";if(!groups.has(c))groups.set(c,[]);groups.get(c).push(m)}
  const preferred=["Fantasy","DFL Life","DFL Disrespect","Marvel","Gaming","Other"];
  const cats=[...groups.keys()].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return(ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b)});
  return cats.map(cat=>`<section class="block"><h2 class="section-title">${esc(cat)}<span class="count">${groups.get(cat).length}</span></h2>${groups.get(cat).map(m=>marketCard(m,byMarket.get(String(m.id))||[],bets,canBook)).join("")}</section>`).join("");
}

function outcomeButtons(m,outcomes,bets){const mine=new Set((bets||[]).filter(b=>String(b.market_id)===String(m.id)&&b.status==="open").map(b=>String(b.outcome_id)));return `<div style="display:grid;gap:8px">${outcomes.map(o=>`<button class="btn ghost" data-bet-outcome="${o.id}" style="display:flex;justify-content:space-between;align-items:center"><span>${esc(o.label)}${mine.has(String(o.id))?` <small>· open</small>`:""}</span><strong>${fmtOdds(o.odds_american)}</strong></button>`).join("")}</div>`}
function houseControls(m,outcomes,canBook){return canBook?`<div class="card-meta">${outcomes.map(o=>`<button type="button" class="linkbtn" data-settle-market="${m.id}" data-settle-outcome="${o.id}">${esc(o.label)}</button>`).join(" · ")} · <button type="button" class="linkbtn" data-void-market="${m.id}">Void</button></div>`:""}
function marketLine(m,outcomes,bets,canBook){return `<div class="sportsbook-line" style="border-top:1px solid var(--line,rgba(255,255,255,.08));padding-top:10px;margin-top:10px"><div class="card-meta" style="margin:0 0 7px"><strong>${golfKind(m)}</strong></div>${outcomeButtons(m,outcomes,bets)}${houseControls(m,outcomes,canBook)}</div>`}
function marketCard(m,outcomes,bets,canBook){return `<article class="card"><div class="card-title-row"><h3 class="card-heading">${esc(m.title)}</h3>${m.closes_at?`<span class="pill">${esc(fmtTime(m.closes_at))}</span>`:""}</div><div style="margin-top:10px">${outcomeButtons(m,outcomes,bets)}</div>${houseControls(m,outcomes,canBook)}</article>`}

function rulingQueue(markets,byMarket){return `<details class="card"><summary class="card-title">Needs a ruling · ${markets.length}</summary><div class="card-body">${markets.map(m=>{const os=byMarket.get(String(m.id))||[];return `<div style="padding:10px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.08))"><strong>${esc(m.title)}</strong><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${os.map(o=>`<button type="button" class="btn small" data-settle-market="${m.id}" data-settle-outcome="${o.id}">${esc(o.label)} won</button>`).join("")}</div><button type="button" class="linkbtn" data-void-market="${m.id}">Void + refund</button></div>`}).join("")}</div></details>`}
function commissionerBook(){return `<details class="card"><summary class="card-title">Commissioner window</summary><form class="card-body" id="sportsbook-market-form"><label for="book-title">Market</label><input id="book-title" maxlength="120" required placeholder="Market title"><label for="book-category">Category</label><select id="book-category"><option>DFL Life</option><option>Fantasy</option><option>Golf</option><option>Marvel</option><option>Gaming</option></select><label for="book-close">Closes</label><input id="book-close" type="datetime-local"><label for="book-note">House note</label><input id="book-note" maxlength="180" placeholder="Optional"><div class="section-head"><h3>Lines</h3></div>${outcomeInput(1,"YES","-110")}${outcomeInput(2,"NO","-110")}${outcomeInput(3,"","")}<div class="row-end"><button class="btn" type="submit">Open market</button></div></form></details>`}
function outcomeInput(n,label,odds){return `<div class="row" style="gap:8px"><input data-book-label="${n}" maxlength="60" placeholder="Outcome ${n}" value="${esc(label)}" ${n<3?"required":""}><input data-book-odds="${n}" inputmode="numeric" placeholder="-110" value="${esc(odds)}" style="max-width:100px" ${n<3?"required":""}></div>`}
function ticketCard(b,mm,om){const m=mm.get(String(b.market_id)),o=om.get(String(b.outcome_id));return `<div class="card"><div class="card-title-row"><div><strong>${esc(o?.label||"Ticket")}</strong><div class="muted tiny">${esc(m?.title||"DFL Sportsbook")} · ${fmtOdds(b.odds_american)}</div></div><span class="pill ${b.status==="won"?"green":b.status==="lost"?"grey":b.status==="void"?"warn":""}">${esc(b.status)}</span></div><div class="card-meta">${b.stake} SIN · ${b.potential_payout} return</div></div>`}

function wireBets(view,outcomeMap){view.querySelectorAll("[data-bet-outcome]").forEach(btn=>btn.addEventListener("click",async()=>{const o=outcomeMap.get(String(btn.dataset.betOutcome));if(!o)return;const raw=prompt(`How much SIN on ${o.label} (${fmtOdds(o.odds_american)})?`,"50");if(raw==null)return;const stake=Number(String(raw).replace(/\D/g,""));if(!Number.isInteger(stake)||stake<1){toast("Enter a valid SIN stake",true);return}btn.disabled=true;try{const{error}=await db().rpc("sportsbook_place_bet",{target_outcome_id:Number(o.id),sin_stake:stake});if(error)throw error;toast("Ticket punched");render(view)}catch(err){toast(err.message||"The house rejected that ticket",true);btn.disabled=false}}))}
function wireCommissioner(view){const form=view.querySelector("#sportsbook-market-form");form?.addEventListener("submit",async e=>{e.preventDefault();const os=[1,2,3].map(n=>({label:form.querySelector(`[data-book-label="${n}"]`)?.value.trim()||"",odds:Number(form.querySelector(`[data-book-odds="${n}"]`)?.value.trim()||0)})).filter(o=>o.label);if(os.length<2||os.some(o=>!(o.odds<=-100||o.odds>=100))){toast("Use American odds like -110 or +150",true);return}const closes=form.querySelector("#book-close").value,btn=form.querySelector('button[type="submit"]');btn.disabled=true;try{const{error}=await db().rpc("sportsbook_create_market",{market_title:form.querySelector("#book-title").value.trim(),market_category:form.querySelector("#book-category").value,market_source:"commissioner",market_closes_at:closes?new Date(closes).toISOString():null,market_lore_note:form.querySelector("#book-note").value.trim(),market_outcomes:os});if(error)throw error;toast("Market open");render(view)}catch(err){toast(err.message||"Could not open that market",true);btn.disabled=false}});view.querySelectorAll("[data-settle-market]").forEach(btn=>btn.addEventListener("click",async()=>{const label=btn.textContent.replace(/ won$/i,"").trim();if(!confirm(`Settle with ${label} as the winner?`))return;btn.disabled=true;try{const{error}=await db().rpc("sportsbook_settle_market",{target_market_id:Number(btn.dataset.settleMarket),winning_outcome_id:Number(btn.dataset.settleOutcome)});if(error)throw error;toast("Market settled");render(view)}catch(err){toast(err.message||"Could not settle that market",true);btn.disabled=false}}));view.querySelectorAll("[data-void-market]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Void this market and refund open tickets?"))return;btn.disabled=true;try{const{error}=await db().rpc("sportsbook_void_market",{target_market_id:Number(btn.dataset.voidMarket)});if(error)throw error;toast("Market voided");render(view)}catch(err){toast(err.message||"Could not void that market",true);btn.disabled=false}}))}