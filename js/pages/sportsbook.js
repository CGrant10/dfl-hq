// =====================================================================
// DFL Sportsbook - fake SIN, real DFL consequences.
// =====================================================================
import { db, hasPermission } from "../supabase.js";
import { currentMember } from "../members.js";
import { esc, toast } from "../ui.js";
import { parseStake, estimatedReturn } from "../sportsbook-slip.js";
import { shareTicket } from "../sportsbook-ticket.js";

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
    <header class="sb-masthead"><img src="icons/dfl-seal-64.webp" alt="" width="40" height="40"><h1>DFL Sportsbook</h1><span class="sb-wallet" aria-label="Available SIN">${Number(wallet?.balance||0).toLocaleString()} <small>SIN</small></span></header>
    ${bankrollCard(me,wallet,golf,open,autoReady,autoState)}
    <div class="sb-tabs" role="tablist" aria-label="Sportsbook views"><button type="button" role="tab" aria-selected="true" aria-controls="sb-markets" id="sb-tab-markets" data-sb-tab="markets">Matchups & lines</button><button type="button" role="tab" aria-selected="false" aria-controls="sb-tickets" id="sb-tab-tickets" data-sb-tab="tickets" tabindex="-1">My bets <span>${bets.filter(b=>b.status==="open").length}</span></button></div>
    <div id="sb-markets" role="tabpanel" aria-labelledby="sb-tab-markets">
    ${golfNotice}
    ${categoryBoard(other.filter(m=>m.category==="Fantasy"),byMarket,bets,canBook)}
    ${golf.length?golfBoard(golf,byMarket,bets,canBook):""}
    ${categoryBoard(other.filter(m=>m.category!=="Fantasy"),byMarket,bets,canBook)}
    ${!open.length?'<p class="sb-empty">No open lines right now. Check back for the next matchup.</p>':""}
    </div>
    <div id="sb-tickets" role="tabpanel" aria-labelledby="sb-tab-tickets" hidden>
    ${bets.length?`<section class="block"><h2 class="section-title">Your tickets</h2>${bets.slice(0,10).map(b=>ticketCard(b,marketMap,outcomeMap)).join("")}</section>`:""}
    ${!bets.length?'<p class="sb-empty">No tickets yet. Choose a line to review your first bet.</p>':""}
    </div>
    ${canBook&&rulings.length?rulingQueue(rulings,byMarket):""}
    ${canBook?commissionerBook():""}
    <details class="sb-secondary"><summary>SIN leaderboard</summary><section class="block"><div class="card"><div class="card-body">${leaders.length?leaders.slice(0,12).map((r,i)=>`<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${i+1}.</strong> ${esc(r.display_name)}</span><strong>${Number(r.balance).toLocaleString()} SIN</strong></div>`).join(""):`<span class="muted">No bankrolls yet.</span>`}</div></div></section></details>
    <details class="card"><summary class="card-title">Receipts</summary><div class="card-body">${ledger.length?ledger.map(r=>`<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${esc(r.note||r.kind)}</strong><br><span class="muted tiny">${esc(fmtTime(r.created_at))}</span></span><strong>${r.amount>0?"+":""}${r.amount} SIN</strong></div>`).join(""):`<span class="muted">No SIN has moved yet.</span>`}</div></details>
    <p class="muted tiny" style="text-align:center">SIN is play money only.</p>
  </div>`;
  /* The share handler needs the rows behind the buttons it just drew. */
  view.__bets=bets;
  wireBets(view,outcomeMap,marketMap,wallet);wireBookTabs(view);wireClaim(view);wireTicketShare(view,marketMap,outcomeMap,me);if(canBook)wireCommissioner(view);
}

/*
  THE ALLOWANCE IS CLAIMED, AND THE BUTTON IS THE POINT.

  It used to arrive inside sportsbook_touch_wallet() when the page loaded, so
  opening the Sportsbook was indistinguishable from taking part and nobody had
  to notice it happen. A daily allowance that lands by itself is not an
  allowance, it is a balance going up. See sportsbook_claim_schema.sql.

  With nothing to claim the button is REPLACED by the time of the next one
  rather than drawn disabled: a dead button invites a tap and then explains
  itself, which is the wrong order.
*/
function bankrollCard(me,wallet,golf,open,autoReady,autoState){
  const claimable=Number(wallet?.claimable||0),days=Number(wallet?.claimable_days||0);
  return `<section class="sb-bankroll">
    <div class="card-title-row">
      <div>
        <div class="card-title">${esc(me.display_name)}</div>

      </div>

    </div>
    <div class="sb-claim-row">
      ${claimable>0
        ? `<button type="button" class="btn sb-claim" id="sb-claim">Claim ${claimable} SIN${days>1?` &middot; ${days} days`:""}</button>`
        : `<span class="muted tiny">Next 50 SIN ${esc(fmtTime(wallet?.next_daily_at))}</span>`}
      ${golf.length?`<span class="pill green">${golf.length} Golf lines</span>`
        :autoReady?`<span class="pill">${Number(autoState?.open_auto??open.length)} live</span>`:""}
    </div>
  </section>`;
}

function golfGroupKey(m){const k=String(m.auto_key||"");const match=k.match(/^golf:(\d+):match:(\d+):/);if(match)return`match:${match[2]}`;const team=k.match(/^golf:(\d+):team-war:/);if(team)return`outing:${team[1]}`;return`market:${m.id}`}
function cleanGolfTitle(title){return String(title||"Golf").replace(/\s+\u2014\s+(Moneyline|DFL handicap|Winning margin O\/U.*|Tournament moneyline).*$/i,"").trim()}

/*
  WHY THE BOARD WAS HARD TO READ, AND WHAT ACTUALLY CHANGED.

  The grouping was already right - golf gathered per match, everything else per
  category. The problem was that every group printed everything it had at the
  same weight in one column: a dozen markets with two or three outcomes each is
  fifty-odd interactive elements of identical size, and nothing says where to
  start.

  Three changes, all hierarchy rather than grouping:

    1. ONE ROW PER OUTCOME, PRICE IN ITS OWN COLUMN. The price is the thing
       being compared, so it is right-aligned and lines up down the whole card.
       Scanning a column of numbers is what a board is for.
    2. THE FIRST CARD IS OPEN, THE REST FOLD behind "N more". A section showing
       one thing and offering eleven is legible; one showing all twelve is a
       wall.
    3. A TICKET YOU ALREADY HOLD IS MARKED ON THE BOARD, not only in the
       tickets list, so "have I backed this" is answerable where the decision
       is being made.
*/
function outcomeButtons(m,outcomes,bets){
  const mine=new Set((bets||[]).filter(b=>String(b.market_id)===String(m.id)&&b.status==="open").map(b=>String(b.outcome_id)));
  return `<div class="sb-outcomes">${outcomes.map(o=>`
    <button class="sb-outcome${mine.has(String(o.id))?" is-mine":""}" data-bet-outcome="${o.id}">
      <span class="sb-outcome-label">${esc(o.label)}</span>
      ${mine.has(String(o.id))?`<span class="sb-held">held</span>`:""}
      <strong class="sb-price">${fmtOdds(o.odds_american)}</strong>
    </button>`).join("")}</div>`;
}
function houseControls(m,outcomes,canBook){return canBook?`<div class="sb-house">${outcomes.map(o=>`<button type="button" class="linkbtn" data-settle-market="${m.id}" data-settle-outcome="${o.id}">${esc(o.label)}</button>`).join(" \u00b7 ")} \u00b7 <button type="button" class="linkbtn" data-void-market="${m.id}">Void</button></div>`:""}
function marketLine(m,outcomes,bets,canBook){return `<div class="sb-line"><div class="sb-line-head">${esc(golfKind(m))}</div>${outcomeButtons(m,outcomes,bets)}${houseControls(m,outcomes,canBook)}</div>`}
function marketCard(m,outcomes,bets,canBook){return `<article class="card sb-market"><div class="card-title-row"><h3 class="card-heading">${esc(m.title)}</h3>${m.closes_at?`<span class="pill">${esc(fmtTime(m.closes_at))}</span>`:""}</div>${m.lore_note?`<p class="muted tiny sb-note">${esc(m.lore_note)}</p>`:""}${outcomeButtons(m,outcomes,bets)}${houseControls(m,outcomes,canBook)}</article>`}

/* A section with a top: first card open, the remainder behind one fold. */
function foldedSection(title,count,openHtml,restHtml,key){
  return `<section class="block sb-section">
    <h2 class="section-title">${esc(title)}<span class="count">${count}</span></h2>
    ${openHtml}
    ${restHtml?`<div class="sb-more" data-collapse="${esc(key)}" data-collapse-default="folded"
         data-collapse-title="Show the rest" data-collapse-badge="${count-1} more">${restHtml}</div>`:""}
  </section>`;
}

function golfBoard(markets,byMarket,bets,canBook){
  const groups=new Map();
  for(const m of markets){const k=golfGroupKey(m);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(m)}
  const cards=[...groups.values()].map(ms=>{
    ms.sort((a,b)=>golfSort(a)-golfSort(b));
    const title=cleanGolfTitle(ms.find(m=>golfKind(m)==="Moneyline")?.title||ms[0]?.title);
    const close=ms.map(m=>m.closes_at).filter(Boolean).sort()[0];
    return `<article class="card sportsbook-match sb-market"><div class="card-title-row"><h3 class="card-heading">${esc(title)}</h3>${close?`<span class="pill">${esc(fmtTime(close))}</span>`:""}</div>${ms.map(m=>marketLine(m,byMarket.get(String(m.id))||[],bets,canBook)).join("")}</article>`;
  });
  if(!cards.length)return "";
  return foldedSection("Golf",cards.length,cards[0],cards.slice(1).join(""),"sb-golf");
}

function categoryBoard(markets,byMarket,bets,canBook){
  if(!markets.length)return "";
  const groups=new Map();for(const m of markets){const c=m.category||"Other";if(!groups.has(c))groups.set(c,[]);groups.get(c).push(m)}
  const preferred=["Fantasy","DFL Life","DFL Disrespect","Marvel","Gaming","Other"];
  const cats=[...groups.keys()].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return(ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b)});
  return cats.map(cat=>{
    const cards=groups.get(cat).map(m=>marketCard(m,byMarket.get(String(m.id))||[],bets,canBook));
    return `<section class="block sb-section"><h2 class="section-title">${esc(cat)}<span class="count">${cards.length}</span></h2>${cards.join("")}</section>`;
  }).join("");
}

function rulingQueue(markets,byMarket){return `<details class="card"><summary class="card-title">Needs a ruling · ${markets.length}</summary><div class="card-body">${markets.map(m=>{const os=byMarket.get(String(m.id))||[];return `<div style="padding:10px 0;border-bottom:1px solid var(--line,rgba(255,255,255,.08))"><strong>${esc(m.title)}</strong><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${os.map(o=>`<button type="button" class="btn small" data-settle-market="${m.id}" data-settle-outcome="${o.id}">${esc(o.label)} won</button>`).join("")}</div><button type="button" class="linkbtn" data-void-market="${m.id}">Void + refund</button></div>`}).join("")}</div></details>`}
/*
  OPEN BY DEFAULT FOR THE PERSON WHO OWNS IT.

  This was a collapsed <details> titled "Commissioner window", sitting below the
  leaderboard and the receipts - so the one screen in the app that can open a
  betting line looked like it could not, and the person who asked for the
  feature had it all along. A commissioner is here to book. Nobody else ever
  sees it: canBook gates the whole thing.
*/
function commissionerBook(){return `<details class="card sb-book" open><summary class="card-title">Open a line</summary><form class="card-body" id="sportsbook-market-form"><label for="book-title">Market</label><input id="book-title" maxlength="120" required placeholder="Market title"><label for="book-category">Category</label><select id="book-category"><option>DFL Life</option><option>Fantasy</option><option>Golf</option><option>Marvel</option><option>Gaming</option></select><label for="book-close">Closes</label><input id="book-close" type="datetime-local"><label for="book-note">House note</label><input id="book-note" maxlength="180" placeholder="Optional"><p class="muted tiny">American odds, like -110 or +150. Two outcomes minimum, the third optional.</p><div class="section-head"><h3>Outcomes</h3></div>${outcomeInput(1,"YES","-110")}${outcomeInput(2,"NO","-110")}${outcomeInput(3,"","")}<div class="row-end"><button class="btn" type="submit">Open market</button></div></form></details>`}
function outcomeInput(n,label,odds){return `<div class="row" style="gap:8px"><input data-book-label="${n}" maxlength="60" placeholder="Outcome ${n}" value="${esc(label)}" ${n<3?"required":""}><input data-book-odds="${n}" inputmode="numeric" placeholder="-110" value="${esc(odds)}" style="max-width:100px" ${n<3?"required":""}></div>`}
function ticketCard(b,mm,om){const m=mm.get(String(b.market_id)),o=om.get(String(b.outcome_id));return `<div class="card sb-ticket"><div class="card-title-row"><div><strong>${esc(o?.label||"Ticket")}</strong><div class="muted tiny">${esc(m?.title||"DFL Sportsbook")} · ${fmtOdds(b.odds_american)}</div></div><span class="pill ${b.status==="won"?"green":b.status==="lost"?"grey":b.status==="void"?"warn":""}">${esc(b.status)}</span></div><div class="card-meta sb-ticket-foot"><span>${b.stake} SIN · ${b.potential_payout} return</span><button type="button" class="linkbtn" data-share-ticket="${b.id}">Share card</button></div></div>`}

/*
  THE CLAIM. One button, one RPC, and the page redraws from the wallet the
  database hands back rather than from an optimistic guess - the whole reason
  this moved out of the automatic path is so the number is a record of somebody
  turning up, and a client-side increment would not be that.
*/
function wireClaim(view){
  const btn=view.querySelector("#sb-claim");
  if(!btn)return;
  btn.addEventListener("click",async()=>{
    btn.disabled=true;
    try{
      const{data,error}=await db().rpc("sportsbook_claim_daily");
      if(error)throw error;
      const row=Array.isArray(data)?data[0]:data;
      toast(row?.credited?`+${row.credited} SIN claimed`:"Claimed");
      render(view);
    }catch(err){
      btn.disabled=false;
      /* An un-migrated database has no claim function. Say which file. */
      toast(/claim_daily|schema cache|does not exist/i.test(err.message||"")
        ? "Run sportsbook_claim_schema.sql in Supabase"
        : (err.message||"Could not claim that"),true);
    }
  });
}

/* Share one ticket as a card, through the same canvas/share path the keeper
   board and the golf posters use. shareCanvas() owns the phone fallbacks. */
function wireTicketShare(view,marketMap,outcomeMap,me){
  view.querySelectorAll("[data-share-ticket]").forEach(btn=>btn.addEventListener("click",async()=>{
    const bet=(view.__bets||[]).find(b=>String(b.id)===String(btn.dataset.shareTicket));
    if(!bet){toast("That ticket is no longer on screen",true);return}
    btn.disabled=true;
    try{
      await shareTicket({
        bet,
        market:marketMap.get(String(bet.market_id))||null,
        outcome:outcomeMap.get(String(bet.outcome_id))||null,
        member:me,
      });
    }catch(err){
      toast(err?.message||"Could not build that card",true);
    }finally{
      btn.disabled=false;
    }
  }));
}

function wireBookTabs(view) {
  const tabs=[...view.querySelectorAll('[data-sb-tab]')];
  const select=tab=>{for(const button of tabs){const active=button===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;view.querySelector('#sb-'+button.dataset.sbTab).hidden=!active;}};
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[next]);tabs[next].focus();});});
}

function wireBets(view,outcomeMap,marketMap,wallet) {
  view.querySelectorAll('[data-bet-outcome]').forEach(button=>button.addEventListener('click',()=>{
    let outcome=outcomeMap.get(String(button.dataset.betOutcome));
    const market=marketMap.get(String(outcome?.market_id));
    if(!outcome||!market||!isOpen(market)){toast('This market is closed',true);return;}
    view.querySelector('.sb-slip')?.remove();
    const dialog=document.createElement('dialog');dialog.className='sb-slip';dialog.setAttribute('aria-labelledby','sb-slip-title');
    dialog.innerHTML=`<form novalidate><div class="sb-slip-head"><h2 id="sb-slip-title">Bet slip</h2><button type="button" class="linkbtn" data-close>Close</button></div><p class="sb-slip-market">${esc(market.title)}</p><div class="sb-slip-pick"><strong>${esc(outcome.label)}</strong><strong data-price>${fmtOdds(outcome.odds_american)}</strong></div><div class="sb-slip-fields"><label>Stake <span>SIN</span><input name="stake" inputmode="numeric" autocomplete="off" value="${Math.min(50,Number(wallet?.balance||0))||''}" aria-describedby="sb-slip-error"></label><div><span>Estimated return</span><output data-return aria-live="polite">—</output></div></div><p class="sb-slip-available">${Number(wallet?.balance||0).toLocaleString()} SIN available · Return includes your stake</p><p id="sb-slip-error" role="status"></p><button type="submit" class="btn sb-slip-submit">Review bet</button></form>`;
    view.append(dialog);
    const form=dialog.querySelector('form'),input=form.elements.stake,submit=dialog.querySelector('[type="submit"]'),status=dialog.querySelector('#sb-slip-error');
    let reviewed=false,busy=false,available=Number(wallet?.balance||0);
    const close=()=>{if(busy)return;dialog.close();dialog.remove();button.focus();};
    dialog.querySelector('[data-close]').addEventListener('click',close);
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
    const update=()=>{reviewed=false;submit.textContent='Review bet';const stake=parseStake(input.value,available);const payout=stake===null?null:estimatedReturn(stake,Number(outcome.odds_american));dialog.querySelector('[data-return]').textContent=payout===null?'—':payout.toLocaleString()+' SIN';status.textContent='';};
    input.addEventListener('input',update);update();dialog.showModal();input.focus();input.select();
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      const stake=parseStake(input.value,available);
      if(stake===null){status.textContent='Enter a whole SIN amount within your available balance.';input.focus();return;}
      if(!reviewed){reviewed=true;status.textContent='Review your selection and stake, then confirm.';submit.textContent='Confirm '+stake.toLocaleString()+' SIN bet';return;}
      busy=true;submit.disabled=true;input.disabled=true;status.textContent='Checking the latest line…';
      try {
        const [priceResult,marketResult]=await Promise.all([db().from('sportsbook_outcomes').select('*').eq('id',outcome.id).single(),db().from('sportsbook_markets').select('*').eq('id',market.id).single()]);
        if(priceResult.error||marketResult.error)throw priceResult.error||marketResult.error;
        if(!isOpen(marketResult.data))throw new Error('This market has closed. No bet was placed.');
        const latest=priceResult.data;
        if(Number(latest.odds_american)!==Number(outcome.odds_american)||latest.label!==outcome.label){outcome=latest;dialog.querySelector('[data-price]').textContent=fmtOdds(latest.odds_american);dialog.querySelector('.sb-slip-pick strong').textContent=latest.label;update();status.textContent='The line changed. Review the updated odds before confirming.';return;}
        status.textContent='Placing your bet…';
        const {error}=await db().rpc('sportsbook_place_bet',{target_outcome_id:Number(outcome.id),sin_stake:stake});
        if(error)throw error;
        dialog.close();dialog.remove();toast('Ticket confirmed');await render(view);
      }catch(error){reviewed=false;submit.textContent='Review bet';status.textContent=error.message||'Could not confirm. Check My bets before trying again.';}
      finally{busy=false;submit.disabled=false;input.disabled=false;}
    });
  }));
}

function wireCommissioner(view){const form=view.querySelector("#sportsbook-market-form");form?.addEventListener("submit",async e=>{e.preventDefault();const os=[1,2,3].map(n=>({label:form.querySelector(`[data-book-label="${n}"]`)?.value.trim()||"",odds:Number(form.querySelector(`[data-book-odds="${n}"]`)?.value.trim()||0)})).filter(o=>o.label);if(os.length<2||os.some(o=>!(o.odds<=-100||o.odds>=100))){toast("Use American odds like -110 or +150",true);return}const closes=form.querySelector("#book-close").value,btn=form.querySelector('button[type="submit"]');btn.disabled=true;try{const{error}=await db().rpc("sportsbook_create_market",{market_title:form.querySelector("#book-title").value.trim(),market_category:form.querySelector("#book-category").value,market_source:"commissioner",market_closes_at:closes?new Date(closes).toISOString():null,market_lore_note:form.querySelector("#book-note").value.trim(),market_outcomes:os});if(error)throw error;toast("Market open");render(view)}catch(err){toast(err.message||"Could not open that market",true);btn.disabled=false}});view.querySelectorAll("[data-settle-market]").forEach(btn=>btn.addEventListener("click",async()=>{const label=btn.textContent.replace(/ won$/i,"").trim();if(!confirm(`Settle with ${label} as the winner?`))return;btn.disabled=true;try{const{error}=await db().rpc("sportsbook_settle_market",{target_market_id:Number(btn.dataset.settleMarket),winning_outcome_id:Number(btn.dataset.settleOutcome)});if(error)throw error;toast("Market settled");render(view)}catch(err){toast(err.message||"Could not settle that market",true);btn.disabled=false}}));view.querySelectorAll("[data-void-market]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Void this market and refund open tickets?"))return;btn.disabled=true;try{const{error}=await db().rpc("sportsbook_void_market",{target_market_id:Number(btn.dataset.voidMarket)});if(error)throw error;toast("Market voided");render(view)}catch(err){toast(err.message||"Could not void that market",true);btn.disabled=false}}))}