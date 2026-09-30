// =====================================================================
// DFL Sportsbook - fake SIN, real DFL consequences.
// =====================================================================
import { db, edge, hasPermission, privilegedFunctionHeaders } from "../supabase.js";
import { currentMember } from "../members.js";
import { esc, toast } from "../ui.js";
import { parseStake, entryReturn, combineOdds, MAX_PICKS } from "../sportsbook-slip.js";
import { shareTicket, shareSportsbookRecap } from "../sportsbook-ticket.js";
import { teamPortrait } from "../team-presentation.js";
import { loadPickemBoard, pickemMarkup, wirePickem } from "../sportsbook-pickem.js";
import { sleeperPropImporterMarkup, wireSleeperPropImporter } from "../sleeper-prop-import-ui.js";
import { propMarketMeta, propMatches, readPropFavorites, sortPropRows, togglePropFavorite } from "../sportsbook-props.js";

const fmtOdds=n=>Number(n)>0?`+${Number(n)}`:String(Number(n));
const fmtTime=v=>v?new Date(v).toLocaleString([],{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"}):"";
const isOpen=m=>m.status==="open"&&(!m.closes_at||new Date(m.closes_at)>new Date());
const isGolf=m=>m.category==="Golf"||String(m.auto_key||"").startsWith("golf:");
const ACTIVE_BOOK_CATEGORIES=new Set(["Fantasy","Player Props","Team Totals","Game Totals"]);
const isBookCategory=m=>ACTIVE_BOOK_CATEGORIES.has(String(m?.category||""));
const num=n=>Number(n||0).toLocaleString();
function announceFreshPayout(bets,memberId){
  const won=(bets||[]).find(b=>b.status==="won");
  if(!won)return;
  const key=`dfl.sportsbook.payout.${memberId}`;
  try{
    if(localStorage.getItem(key)===String(won.id))return;
    localStorage.setItem(key,String(won.id));
  }catch{}
  const EventCtor=globalThis.CustomEvent;
  if(globalThis.window?.dispatchEvent&&EventCtor){
    window.dispatchEvent(new EventCtor("dfl:moment",{detail:{kind:"payout",source:"sportsbook",id:won.id}}));
  }
}

/*
  THE MIGRATION MIGHT NOT BE RUN YET.

  Every SQL file in this repo is applied by hand in the Supabase editor, so the
  app has to survive the window where the code is newer than the database. The
  claim button already set the pattern: say WHICH FILE to run rather than
  printing PostgREST's own "function does not exist" at a league member.
*/
const MIGRATE="Run sportsbook_entries_schema.sql in Supabase";
const needsMigration=err=>/does not exist|schema cache|Could not find the function/i.test(err?.message||"");

/*
  WHERE "WEEK 1" COMES FROM NOW.

  It was hardcoded in three places - the masthead caption, every card's
  kicker and the board heading - which is fine for exactly as long as it is
  week one and then quietly wrong for the rest of the season. The weekly
  matchup lines are booked with an auto_key of matchup:<season>:<week>:<id>
  (see tools/current-sportsbook-lines.mjs), so the board can just read it.

  scopeOf() returns null rather than guessing when the markets on screen do
  not agree on a week, and the caption falls back to a count. A board that
  says nothing about the week beats a board that says the wrong one.
*/
const matchupKey=m=>String(m.auto_key||"").match(/^matchup:(\d+):(\d+):/);
function scopeOf(markets){
  const keys=(markets||[]).map(matchupKey).filter(Boolean);
  if(!keys.length)return null;
  const[,season,week]=keys[0];
  return keys.every(k=>k[1]===season&&k[2]===week)?{season:Number(season),week:Number(week)}:null;
}
function mastheadCaption(open){
  const scope=scopeOf(open);
  if(scope)return `Week ${scope.week} &middot; ${scope.season} &middot; Moneyline`;
  return open.length?`${open.length} open line${open.length===1?"":"s"}`:"The book is closed";
}

/*
  THE SLIP LIVES OUTSIDE render().

  render() redraws the whole route from scratch after every claim, every
  placed entry and every pull, so picks held in the view would not survive
  the first thing a member does. It is a module-level array of outcome ids -
  the smallest thing that can be rebuilt into a slip from fresh market rows,
  which matters because a line can move or close while picks are sitting in
  it. Ids, never prices: the price is re-read on every draw and re-checked
  against the database before anything is placed.
*/
let slip=[];
const propGameCache=new Map();

/* The Sportsbook is intentionally allowed to open even when the member
   directory is unavailable: the moneyline still works with initials. In the
   normal app this resolves from members.js' shared cache, so adding faces and
   club colours costs no extra database trip after boot. Keeping the import
   optional also makes old/offline installs degrade cleanly. */
async function loadSportsbookIdentities(){
  try{
    const membersModule=await import("../members.js");
    return typeof membersModule.loadMemberDirectory==="function"
      ? await membersModule.loadMemberDirectory() : [];
  }catch{return []}
}

export async function render(view){
  const me=currentMember();
  if(!me){view.innerHTML=`<h1>DFL Sportsbook</h1><div class="card"><div class="card-body">Pick your league member first.</div></div>`;return}
  const canBook=hasPermission("sportsbook");
  view.innerHTML=`<h1>DFL Sportsbook</h1><div class="card"><div class="card-body muted">Opening the book…</div></div>`;
  let wallet,ledger,leaders,markets,outcomes,bets,trends,members,pickem,recap,feedStatus={};
  let autoReady=true;
  try{
    const touch=await db().rpc("sportsbook_touch_wallet");if(touch.error)throw touch.error;wallet=touch.data?.[0]||null;
    autoReady=true;
    const providerMarketPages=async()=>{const rows=[];for(let from=0;;from+=1000){const{data,error}=await db().from("sportsbook_markets").select("*").in("category",["Player Props","Team Totals","Game Totals"]).in("status",["open","locked"]).order("provider_updated_at",{ascending:false}).range(from,from+999);if(error)return{data:rows,error};rows.push(...(data||[]));if((data||[]).length<1000)return{data:rows,error:null}}};
    const[mr,propMarkets]=await Promise.all([
      db().from("sportsbook_markets").select("*").neq("source","provider").order("created_at",{ascending:false}).limit(100),
      providerMarketPages()
    ]);
    if(mr.error||propMarkets.error)throw mr.error||propMarkets.error;
    markets=[...(mr.data||[]),...(propMarkets.data||[])].filter((market,index,all)=>all.findIndex(row=>String(row.id)===String(market.id))===index);
    const marketIds=markets.map(m=>m.id);
    const outcomePages=async()=>{if(!marketIds.length)return{data:[],error:null};const rows=[];for(let from=0;from<marketIds.length;from+=500){const{data,error}=await db().from("sportsbook_outcomes").select("*").in("market_id",marketIds.slice(from,from+500)).order("sort_order");if(error)return{data:rows,error};rows.push(...(data||[]))}return{data:rows,error:null}};
    const[lr,br,or,btr,tr,memberRows,pickemBoard,recapResult,feedResult]=await Promise.all([
      db().rpc("sportsbook_my_ledger",{row_limit:16}),
      db().rpc("sportsbook_leaderboard"),
      outcomePages(),
      db().rpc("sportsbook_my_bets",{row_limit:30}),
      db().rpc("sportsbook_trending_picks",{row_limit:3}),
      loadSportsbookIdentities(),
      loadPickemBoard().catch(()=>({available:false})),
      db().rpc("sportsbook_weekly_recap",{}),
      canBook?edge().functions.invoke("sync-sportsbook-feed",{body:{action:"status"},headers:privilegedFunctionHeaders()}):Promise.resolve({data:null,error:null})
    ]);
    const err=lr.error||br.error||or.error||btr.error;if(err)throw err;
    ledger=lr.data||[];leaders=br.data||[];outcomes=or.data||[];bets=btr.data||[];trends=tr.error?[]:tr.data||[];members=memberRows||[];pickem=pickemBoard;recap=recapResult.error?null:recapResult.data;feedStatus=feedResult?.data||{};
  }catch(err){view.innerHTML=`<h1>DFL Sportsbook</h1><div class="card note"><div class="card-body">The Sportsbook could not load.<br><span class="muted tiny">${esc(err.message||String(err))}</span></div></div>`;return}

  const byMarket=new Map();
  for(const o of outcomes){const k=String(o.market_id);if(!byMarket.has(k))byMarket.set(k,[]);byMarket.get(k).push(o)}
  const marketMap=new Map(markets.map(m=>[String(m.id),m])),outcomeMap=new Map(outcomes.map(o=>[String(o.id),o]));
  const open=markets.filter(m=>isOpen(m)&&isBookCategory(m)&&!isGolf(m));
  const onBoard=new Set(open.map(m=>String(m.id)));
  /*
    OFF THE BOARD, AND WHY THAT USED TO TRAP MONEY.

    The board shows Fantasy markets only - the golf sportsbook was removed
    in 9119470 - and the ruling queue was given the SAME filter. So a golf
    market that had already taken bets went to a place with no exit: it
    could not be settled, because no commissioner screen listed it; it
    could not be voided, for the same reason; the owner could not pull
    their ticket, because a pull is refused once a market locks; and they
    could not dismiss it, because dismissing an open ticket is refused on
    purpose. The stake sat out of the bankroll permanently.

    So the queue is now defined by what the BOARD cannot reach rather than
    by category: anything locked, plus anything still open that the board
    does not offer or whose clock has run out. Golf lands in it, and so
    does any category filtered off the board in future.
  */
  const rulings=markets.filter(m=>
    (m.status==="locked"||m.status==="open")
    && !onBoard.has(String(m.id))
    && !(m.source==="provider"&&isBookCategory(m))
    && (m.status==="locked"||isGolf(m)||!isBookCategory(m)||!isOpen(m)));

  /* A pick whose line closed while it sat in the slip is dropped here rather
     than at submit time, so the slip on screen is always placeable. */
  const before=slip.length;
  slip=slip.filter(id=>{const o=outcomeMap.get(String(id));const m=o&&marketMap.get(String(o.market_id));return !!m&&isOpen(m)});
  if(slip.length<before)toast(`${before-slip.length} pick${before-slip.length===1?"":"s"} dropped: the line closed`,true);

  view.innerHTML=`<div id="sportsbook-wrap"${slip.length?' class="has-slip"':""}>
    <header class="sb-masthead"><div class="sb-brand"><small>DFL</small><h1>Sportsbook</h1><span>${mastheadCaption(open)}</span></div><div class="sb-wallet" aria-label="Available SIN"><small>BANKROLL</small><strong>${num(wallet?.balance)}</strong><span>SIN</span></div></header>
    <div class="sb-product-tabs" role="tablist" aria-label="Game type"><button type="button" role="tab" aria-selected="true" data-sb-product="book">SIN Sportsbook</button><button type="button" role="tab" aria-selected="false" data-sb-product="pickem">NFL Pick'em</button></div>
    <div id="sb-book-panel" role="tabpanel">
    ${bankrollCard(me,wallet,open,autoReady)}
    ${canBook?`${refreshFeedControl(feedStatus)}${sleeperPropImporterMarkup()}`:""}
    ${trendingPicks(trends)}
    ${weeklyRecapMarkup(recap)}
    <div class="sb-tabs" role="tablist" aria-label="Sportsbook views"><button type="button" role="tab" aria-selected="true" aria-controls="sb-markets" id="sb-tab-markets" data-sb-tab="markets">Matchups & lines</button><button type="button" role="tab" aria-selected="false" aria-controls="sb-tickets" id="sb-tab-tickets" data-sb-tab="tickets" tabindex="-1">My bets <span>${bets.filter(b=>b.status==="open").length}</span></button></div>
    <div id="sb-markets" role="tabpanel" aria-labelledby="sb-tab-markets">
    ${categoryBoard(open,byMarket,bets,canBook,outcomeMap,marketMap,members,me.id)}
    ${!open.length?'<p class="sb-empty">No open lines right now. Check back for the next matchup.</p>':""}
    </div>
    <div id="sb-tickets" role="tabpanel" aria-labelledby="sb-tab-tickets" hidden>
    ${bets.length?`<section class="block">${ticketBoardHead(bets)}${bets.slice(0,12).map(b=>ticketCard(b,marketMap,outcomeMap)).join("")}</section>`:""}
    ${!bets.length?'<p class="sb-empty">No tickets yet. Choose a line to start an entry.</p>':""}
    </div>
    ${canBook&&rulings.length?rulingQueue(rulings,byMarket):""}
    ${canBook?commissionerBook():""}
    <details class="sb-secondary"><summary>SIN leaderboard</summary><section class="block"><div class="card"><div class="card-body">${leaders.length?leaders.slice(0,12).map((r,i)=>`<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${i+1}.</strong> ${esc(r.display_name)}</span><strong>${num(r.balance)} SIN</strong></div>`).join(""):`<span class="muted">No bankrolls yet.</span>`}</div></div></section></details>
    <details class="card"><summary class="card-title">Receipts</summary><div class="card-body">${ledger.length?ledger.map(r=>`<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${esc(r.note||r.kind)}</strong><br><span class="muted tiny">${esc(fmtTime(r.created_at))}</span></span><strong>${r.amount>0?"+":""}${num(r.amount)} SIN</strong></div>`).join(""):`<span class="muted">No SIN has moved yet.</span>`}</div></details>
    <p class="muted tiny" style="text-align:center">SIN is play money only.</p>
    ${slipBar(slip,outcomeMap,marketMap)}
    </div>
    <div id="sb-pickem-panel" role="tabpanel" hidden>${pickemMarkup(pickem,esc,canBook)}</div>
  </div>`;
  /* The share and pull handlers need the rows behind the buttons they drew. */
  view.__bets=bets;
  wireSlipAndPicks(view,outcomeMap,marketMap,wallet);
  wireProductTabs(view);wirePickem(view,pickem,()=>render(view));wireFeedRefresh(view);wireSleeperPropImporter(view,pickem,esc,()=>render(view));
  wireBookTabs(view);wireClaim(view);wireTicketActions(view,marketMap,outcomeMap,me);wirePropFilters(view,me.id);wireRecapShare(view,recap);
  if(canBook)wireCommissioner(view);
  announceFreshPayout(bets,me.id);
}

function trendingPicks(rows){
  const picks=(rows||[]).slice(0,3);
  return `<section class="sb-trending" aria-labelledby="sb-trending-title">
    <div class="sb-board-head"><div><small>Action report</small><h2 id="sb-trending-title">Trending picks</h2></div><span>Top 3</span></div>
    ${picks.length?`<ol class="sb-trend-grid">${picks.map((pick,index)=>`<li class="sb-trend-card">
      <span class="sb-trend-rank">${index+1}</span>
      <span class="sb-trend-copy"><strong>${esc(pick.outcome_label)}</strong><small>${esc(pick.market_title)}</small></span>
      <span class="sb-trend-count"><b>${num(pick.ticket_count)} ticket${Number(pick.ticket_count)===1?"":"s"}</b><small>${num(pick.bettor_count)} bettor${Number(pick.bettor_count)===1?"":"s"} &middot; ${Math.round(Number(pick.pick_share)||0)}% of picks</small></span>
    </li>`).join("")}</ol>`:`<p class="sb-trending-empty">No picks on the board yet.</p>`}
  </section>`;
}

function recapName(item){return item?.team_name||item?.display_name||"Nobody"}
function weeklyRecapMarkup(recap){
  if(!recap?.available)return "";
  const winner=recap.biggestWinner,beat=recap.worstBeat,parlay=recap.longestParlay,profit=recap.mostProfitable,fail=recap.funniestFailure;
  const cards=[
    winner&&{eyebrow:"BIGGEST CASH",name:recapName(winner),value:`+${num(winner.net)} SIN`,copy:`Turned ${winner.pick_count} pick${Number(winner.pick_count)===1?"":"s"} into rent money.`},
    beat&&{eyebrow:"BAD BEAT",name:recapName(beat),value:`${num(beat.potential_payout)} SIN missed`,copy:`The house watched that dream die and kept the receipt.`},
    parlay&&{eyebrow:"PARLAY PSYCHO",name:recapName(parlay),value:`${parlay.pick_count}-leg ${String(parlay.status).toUpperCase()}`,copy:parlay.status==="won"?"The lunatic actually landed it.":"Ambition met a folding chair."},
    profit&&{eyebrow:"WEEK'S SHARPEST",name:recapName(profit),value:`${Number(profit.net)>=0?"+":""}${num(profit.net)} SIN`,copy:"Best net result when the smoke cleared."},
    fail&&{eyebrow:"HOUSE VICTIM",name:recapName(fail),value:`${fail.pick_count}-leg funeral`,copy:`Risked ${num(fail.stake)} to chase ${num(fail.potential_payout)}. Absolutely cooked.`}
  ].filter(Boolean).slice(0,4);
  const start=new Date(recap.startsAt),end=new Date(recap.endsAt);
  const range=`${start.toLocaleDateString([],{month:"short",day:"numeric"})}–${end.toLocaleDateString([],{month:"short",day:"numeric"})}`;
  return `<section class="sb-recap" aria-labelledby="sb-recap-title">
    <div class="sb-board-head"><div><small>${esc(range)} &middot; ${num(recap.tickets)} graded tickets</small><h2 id="sb-recap-title">Sportsbook aftermath</h2></div><button type="button" class="linkbtn" data-share-recap>Share</button></div>
    <div class="sb-recap-grid">${cards.map(card=>`<article><small>${card.eyebrow}</small><strong>${esc(card.name)}</strong><b>${esc(card.value)}</b><p>${esc(card.copy)}</p></article>`).join("")}</div>
  </section>`;
}
function wireRecapShare(view,recap){
  view.querySelector("[data-share-recap]")?.addEventListener("click",async()=>{
    try{await shareSportsbookRecap(recap)}catch(error){toast(error?.message||"Could not share that recap",true)}
  });
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
function bankrollCard(me,wallet,open,autoReady){
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
      ${autoReady?`<span class="pill">${open.length} live</span>`:""}
    </div>
  </section>`;
}

/*
  WHY THE BOARD WAS HARD TO READ, AND WHAT ACTUALLY CHANGED.

  Every group used to print everything at the same weight in one column: a
  dozen markets with two or three outcomes each is fifty-odd interactive
  elements of identical size, and nothing says where to start.

    1. ONE ROW PER OUTCOME, PRICE IN ITS OWN COLUMN. The price is the thing
       being compared, so it is right-aligned and lines up down the whole card.
       Scanning a column of numbers is what a board is for.
    2. A TICKET YOU ALREADY HOLD IS MARKED ON THE BOARD, not only in the
       tickets list, so "have I backed this" is answerable where the decision
       is being made.
    3. A PICK IN THE SLIP IS MARKED THE SAME WAY, because tapping a price no
       longer opens a slip on the spot - it adds a pick, and a member building
       a 4-pick entry needs to see the four.
*/
const identityKey=value=>String(value||"").toLowerCase().replace(/[^a-z0-9]/g,"");
function outcomeButtons(m,outcomes,picked,held,members=[]){
  const mine=held||new Set();
  const identities=new Map();
  for(const member of members){
    for(const value of [member.team_name,member.display_name])if(value)identities.set(identityKey(value),member);
  }
  const projected=String(m.lore_note||"").match(/projected\s+([\d.]+)[–-]([\d.]+)/i)?.slice(1)||[];
  const prop=["Player Props","Team Totals","Game Totals"].includes(m.category);
  const propSource=String(m.provider_key||"").startsWith("sleeper-import:")?"Sleeper line":"Book consensus";
  return `<div class="sb-outcomes">${outcomes.map((o,i)=>{
    const held=mine.has(String(o.id)),inSlip=picked.has(String(o.id));
    return `
    <button class="sb-outcome${held?" is-mine":""}${inSlip?" is-picked":""}" data-bet-outcome="${o.id}" aria-pressed="${inSlip}">
      ${prop?`<span class="sb-prop-side" aria-hidden="true">${i===0?"O":"U"}</span>`:teamPortrait({team_name:o.label,identity:identities.get(identityKey(o.label))||null},{className:"sb-team-mark"})}
      <span class="sb-outcome-label"><span class="sb-outcome-name">${esc(o.label)}${held?`<span class="sb-held">Held</span>`:""}</span><small>${prop?propSource:projected[i]?`${esc(projected[i])} projected`:"Moneyline"}</small></span>
      <strong class="sb-price">${fmtOdds(o.odds_american)}</strong>
    </button>`}).join("")}</div>`;
}
function houseControls(m,outcomes,canBook){return canBook?`<div class="sb-house">${outcomes.map(o=>`<button type="button" class="linkbtn" data-settle-market="${m.id}" data-settle-outcome="${o.id}">${esc(o.label)}</button>`).join(" · ")} · <button type="button" class="linkbtn" data-void-market="${m.id}">Void</button></div>`:""}
function marketCard(m,outcomes,canBook,picked,held,members,meta=null,favorite=false){
  const key=matchupKey(m);
  const imported=String(m.provider_key||"").startsWith("sleeper-import:");
  const kicker=key?`Week ${key[2]} &middot; Matchup`:m.category==="Player Props"?`${imported?"SLEEPER":"CONSENSUS"} &middot; ${m.provider_updated_at?esc(fmtTime(m.provider_updated_at)):"REAL LINE"}`:esc(m.category||"DFL");
  const prop=m.category==="Player Props",info=meta||propMarketMeta(m,outcomes);
  const attrs=prop?` data-prop-card data-prop-key="${esc(info.key)}" data-prop-player="${esc(info.player)}" data-prop-stat="${esc(info.stat.toLowerCase())}" data-prop-position="${esc(info.position)}" data-prop-team="${esc(info.team)}" data-prop-game="${esc(info.matchup)}" data-prop-source="${esc(info.source)}" data-prop-updated="${info.updatedAt}" data-prop-price="${info.bestPrice}"`:"";
  return `<article class="card sb-market"${attrs}><div class="card-title-row"><div><small class="sb-market-kicker">${kicker}</small><h3 class="card-heading">${esc(m.title)}</h3>${prop?`<span class="sb-market-source">${esc(info.sourceLabel)}</span>`:""}</div><div class="sb-market-status">${prop?`<button type="button" class="sb-prop-favorite${favorite?" is-favorite":""}" data-prop-favorite="${esc(info.key)}" aria-label="${favorite?"Remove from":"Add to"} favorite props" aria-pressed="${favorite}">★</button>`:""}<span class="sb-market-state is-open">OPEN</span>${m.closes_at?`<span class="sb-locks">Locks ${esc(fmtTime(m.closes_at))}</span>`:""}</div></div>${outcomeButtons(m,outcomes,picked,held,members)}${houseControls(m,outcomes,canBook)}</article>`;
}

/*
  WHAT YOU ALREADY HOLD, GATHERED FROM THE LEGS.

  This used to read bets.market_id/outcome_id straight off the row, which was
  right for as long as every ticket was a single. On a multi-pick entry those
  columns are null - the entry does not belong to one market - so the board
  quietly stopped marking anything a member held inside a parlay. The legs are
  the only complete answer, and entryLegs() reconstructs a one-leg entry for a
  database that has not been migrated yet, so this works on both.
*/
function heldOutcomes(bets,marketMap,outcomeMap){
  const held=new Set();
  for(const bet of bets||[]){
    if(bet.status!=="open")continue;
    for(const leg of entryLegs(bet,marketMap,outcomeMap))held.add(String(leg.outcome_id));
  }
  return held;
}

function categoryBoard(markets,byMarket,bets,canBook,outcomeMap,marketMap,members=[],memberId=null){
  if(!markets.length)return "";
  propGameCache.clear();
  const picked=new Set(slip.map(String));
  const held=heldOutcomes(bets,marketMap,outcomeMap);
  const groups=new Map();for(const m of markets){const c=m.category||"Other";if(!groups.has(c))groups.set(c,[]);groups.get(c).push(m)}
  const preferred=["Fantasy","Player Props","Game Totals","Team Totals","DFL Life","DFL Disrespect","Marvel","Gaming","Other"];
  const cats=[...groups.keys()].sort((a,b)=>{const ai=preferred.indexOf(a),bi=preferred.indexOf(b);return(ai<0?99:ai)-(bi<0?99:bi)||a.localeCompare(b)});
  return cats.map(cat=>{
    const group=groups.get(cat);
    if(cat==="Player Props"){
      const favorites=readPropFavorites(memberId),games=new Map();group.forEach(market=>{const choices=byMarket.get(String(market.id))||[],meta=propMarketMeta(market,choices),label=meta.matchup,key=String(market.provider_event_id||label),bucket=games.get(key)||{label,rows:[]};bucket.rows.push({market,meta,html:marketCard(market,choices,canBook,picked,held,members,meta,favorites.has(meta.key))});games.set(key,bucket)});
      for(const[key,game]of games)propGameCache.set(key,sortPropRows(game.rows,"player"));
      const metas=[...games.values()].flatMap(game=>game.rows.map(row=>row.meta));
      const positionOrder=["QB","RB","WR","TE"];const positions=[...new Set(metas.map(meta=>meta.position).filter(Boolean))].sort((a,b)=>(positionOrder.indexOf(a)<0?99:positionOrder.indexOf(a))-(positionOrder.indexOf(b)<0?99:positionOrder.indexOf(b))||a.localeCompare(b));
      const teams=[...new Set(metas.map(meta=>meta.team).filter(Boolean))].sort();
      const gameNames=[...new Set(metas.map(meta=>meta.matchup).filter(Boolean))].sort();
      return `<section class="block sb-section sb-props"><div class="sb-board-head"><div><small>Current week &middot; consensus lines</small><h2>Player props</h2></div><span>${group.length} lines</span></div>
        <div class="sb-prop-tools"><label class="sb-prop-search"><span>Find a player</span><input type="search" id="sb-prop-search" placeholder="Player, team or matchup"></label><button type="button" class="sb-prop-favorites" data-prop-favorites aria-pressed="false">★ Favorites</button><details class="sb-prop-filter-drawer"><summary>Filter and sort <span>Position · stat · team · game</span></summary><div class="sb-prop-filter-grid"><label><span>Position</span><select id="sb-prop-position"><option value="">All positions</option>${positions.map(value=>`<option>${esc(value)}</option>`).join("")}</select></label><label><span>Stat</span><select id="sb-prop-stat"><option value="">All stats</option><option value="passing">Passing</option><option value="rushing">Rushing</option><option value="receiving">Receiving</option><option value="receptions">Receptions</option><option value="touchdown">Touchdowns</option><option value="fantasy">Fantasy points</option></select></label><label><span>Team</span><select id="sb-prop-team"><option value="">All teams</option>${teams.map(value=>`<option>${esc(value)}</option>`).join("")}</select></label><label><span>Game</span><select id="sb-prop-game"><option value="">All games</option>${gameNames.map(value=>`<option>${esc(value)}</option>`).join("")}</select></label><label><span>Source</span><select id="sb-prop-source"><option value="">All sources</option><option value="sportsbooks">Sportsbooks</option><option value="sleeper">Sleeper</option></select></label><label><span>Sort</span><select id="sb-prop-sort"><option value="player">Player</option><option value="stat">Stat</option><option value="price">Best price</option><option value="updated">Newest</option></select></label></div></details></div>
        <div class="sb-prop-games">${[...games].map(([key,game])=>`<details data-prop-game data-prop-key="${esc(key)}"><summary><span>${esc(game.label)}</span><b data-prop-count>${game.rows.length} props</b></summary><div class="sb-market-grid" data-prop-grid></div></details>`).join("")}</div>
        <p class="sb-empty" data-prop-empty hidden>No props match that filter.</p></section>`;
    }
    const cards=group.map(m=>marketCard(m,byMarket.get(String(m.id))||[],canBook,picked,held,members));
    /* A heading is only allowed to say "matchup" if every card under it is
       one; a category that mixes props in gets called what it is. */
    const scope=scopeOf(group),matchups=group.every(matchupKey);
    const eyebrow=scope?`Week ${scope.week} &middot; ${scope.season}`:esc(cat);
    const heading=matchups?"Matchup moneylines":`${esc(cat)} lines`;
    const unit=matchups?"games":"lines";
    return `<section class="block sb-section"><div class="sb-board-head"><div><small>${eyebrow}</small><h2>${heading}</h2></div><span>${cards.length} ${unit}</span></div><div class="sb-market-grid">${cards.join("")}</div></section>`;
  }).join("");
}

function wirePropFilters(view,memberId){
  const search=view.querySelector("#sb-prop-search"),stat=view.querySelector("#sb-prop-stat"),position=view.querySelector("#sb-prop-position"),team=view.querySelector("#sb-prop-team"),gameFilter=view.querySelector("#sb-prop-game"),source=view.querySelector("#sb-prop-source"),sort=view.querySelector("#sb-prop-sort"),favoriteToggle=view.querySelector("[data-prop-favorites]");if(!search||!stat)return;
  let favoriteKeys=readPropFavorites(memberId),favoritesOnly=false;
  const paintFavorites=grid=>grid?.querySelectorAll("[data-prop-favorite]").forEach(button=>{const active=favoriteKeys.has(button.dataset.propFavorite);button.classList.toggle("is-favorite",active);button.setAttribute("aria-pressed",String(active));button.setAttribute("aria-label",`${active?"Remove from":"Add to"} favorite props`)});
  const hydrate=game=>{const grid=game.querySelector("[data-prop-grid]");if(!grid||grid.dataset.ready)return;const rows=sortPropRows(propGameCache.get(game.dataset.propKey)||[],sort?.value||"player");grid.innerHTML=rows.map(row=>row.html).join("");grid.dataset.ready="true";paintFavorites(grid)};
  view.querySelectorAll("[data-prop-game]").forEach(game=>game.addEventListener("toggle",()=>{if(game.open)hydrate(game)}));
  const apply=()=>{const filters={query:search.value,stat:stat.value,position:position?.value||"",team:team?.value||"",game:gameFilter?.value||"",source:source?.value||"",favorites:favoritesOnly,favoriteKeys},active=Object.values(filters).some(value=>value&&!(value instanceof Set));let total=0;
    view.querySelectorAll("[data-prop-game]").forEach(game=>{const grid=game.querySelector("[data-prop-grid]"),rows=sortPropRows(propGameCache.get(game.dataset.propKey)||[],sort?.value||"player"),visibleRows=rows.filter(row=>propMatches(row.meta,filters)),visible=visibleRows.length;game.hidden=!visible;if(active&&visible)game.open=true;if(grid&&(active||game.open||grid.dataset.ready)){grid.innerHTML=visibleRows.map(row=>row.html).join("");grid.dataset.ready="true";paintFavorites(grid)}const count=game.querySelector("[data-prop-count]");if(count)count.textContent=`${visible} prop${visible===1?"":"s"}`;total+=visible});
    const empty=view.querySelector("[data-prop-empty]");if(empty)empty.hidden=total>0;
  };
  search.addEventListener("input",apply);[stat,position,team,gameFilter,source,sort].filter(Boolean).forEach(control=>control.addEventListener("change",apply));
  favoriteToggle?.addEventListener("click",()=>{favoritesOnly=!favoritesOnly;favoriteToggle.setAttribute("aria-pressed",String(favoritesOnly));favoriteToggle.classList.toggle("is-active",favoritesOnly);apply()});
  view.querySelector(".sb-props")?.addEventListener("click",event=>{const button=event.target.closest("[data-prop-favorite]");if(!button)return;favoriteKeys=togglePropFavorite(memberId,button.dataset.propFavorite);const active=favoriteKeys.has(button.dataset.propFavorite);button.classList.toggle("is-favorite",active);button.setAttribute("aria-pressed",String(active));button.setAttribute("aria-label",`${active?"Remove from":"Add to"} favorite props`);if(favoritesOnly)apply()});
}

/*
  THE SLIP BAR.

  Tapping a price used to open a modal immediately, which is the correct
  interaction for a book that only sells singles and the wrong one the moment
  an entry can hold six picks - you cannot assemble a parlay inside a dialog
  that closed the board behind it. So the board stays open, taps accumulate,
  and this bar is the running total. It is the only thing on the route that
  floats, and it only exists while there is something in it.
*/
function slipBar(ids,outcomeMap,marketMap){
  if(!ids.length)return "";
  const odds=ids.map(id=>Number(outcomeMap.get(String(id))?.odds_american));
  const combined=combineOdds(odds);
  const picks=ids.map(id=>{
    const o=outcomeMap.get(String(id));
    return `<span class="sb-slipbar-chip">${esc(o?.label||"Pick")} <b>${fmtOdds(o?.odds_american)}</b></span>`;
  }).join("");
  return `<div class="sb-slipbar" role="region" aria-label="Entry slip">
    <div class="sb-slipbar-body">
      <div class="sb-slipbar-head">
        <strong>${ids.length} pick${ids.length===1?"":"s"}</strong>
        <span class="sb-slipbar-odds">${combined===null?"—":fmtOdds(combined)}</span>
        <button type="button" class="linkbtn" data-slip-clear>Clear</button>
      </div>
      <div class="sb-slipbar-chips">${picks}</div>
    </div>
    <button type="button" class="btn sb-slipbar-go" data-slip-open>${ids.length===1?"Review bet":`Review ${ids.length}-pick entry`}</button>
  </div>`;
}

/*
  PICKING, AND WHY IT DOES NOT REDRAW THE ROUTE.

  render() re-runs five network calls. Building a 4-pick entry is four taps,
  and routing each one through render() would mean four full reloads of the
  board to change a class on one button - the picks would visibly lag behind
  the thumb. So a tap patches the DOM: the row it hit, and the slip bar. The
  authoritative redraw is kept for the things that actually change the
  database - placing, pulling, claiming.

  ONE MARKET, ONE PICK. Tapping the other side of a game you already picked
  SWAPS it rather than refusing: the database rejects two legs from one market
  (there is a unique index on it), and betting both sides of the same game
  inside one entry is a guaranteed loss, so "no" would be technically right
  and useless. Swapping is what the member meant.
*/
function wireSlipAndPicks(view,outcomeMap,marketMap,wallet){
  const wrap=view.querySelector("#sportsbook-wrap");

  const paintRow=button=>{
    const id=String(button.dataset.betOutcome);
    const on=slip.some(x=>String(x)===id);
    button.classList.toggle("is-picked",on);
    button.setAttribute("aria-pressed",String(on));
  };

  const wireBar=()=>{
    view.querySelector("[data-slip-clear]")?.addEventListener("click",()=>{slip=[];refresh()});
    view.querySelector("[data-slip-open]")?.addEventListener("click",()=>openSlip(view,outcomeMap,marketMap,wallet,refresh));
  };

  const refresh=()=>{
    view.querySelectorAll("[data-bet-outcome]").forEach(paintRow);
    wrap?.classList.toggle("has-slip",slip.length>0);
    const existing=view.querySelector(".sb-slipbar");
    const html=slipBar(slip,outcomeMap,marketMap);
    if(existing&&html){
      const holder=document.createElement("div");
      holder.innerHTML=html;
      existing.replaceWith(holder.firstElementChild);
    }else if(existing){
      existing.remove();
    }else if(html&&wrap){
      wrap.insertAdjacentHTML("beforeend",html);
    }
    wireBar();
  };

  wrap?.addEventListener("click",event=>{const button=event.target.closest("[data-bet-outcome]");if(!button)return;
    const id=String(button.dataset.betOutcome);
    const outcome=outcomeMap.get(id);
    const market=marketMap.get(String(outcome?.market_id));
    if(!outcome||!market||!isOpen(market)){toast("This market is closed",true);return}
    if(slip.some(x=>String(x)===id)){slip=slip.filter(x=>String(x)!==id);refresh();return}
    const clash=slip.find(x=>String(outcomeMap.get(String(x))?.market_id)===String(outcome.market_id));
    if(clash!==undefined)slip=slip.filter(x=>x!==clash);
    if(slip.length>=MAX_PICKS){toast(`${MAX_PICKS} picks is the most one entry can hold`,true);return}
    slip=[...slip,id];
    refresh();
  });

  wireBar();
}

// ---------------------------------------------------------------------
// MY BETS
// ---------------------------------------------------------------------
function ticketBoardHead(bets){
  const open=bets.filter(b=>b.status==="open").length;
  return `<div class="sb-board-head"><div><small>Your money</small><h2>Tickets</h2></div><span>${open} open</span></div>`;
}

/*
  A ticket read back from a database that has not been migrated yet has no
  legs, so it is rebuilt as the one-leg entry it always was. This is the only
  reason the market_id/outcome_id columns stay on the entry row.
*/
function entryLegs(b,marketMap,outcomeMap){
  let raw=b.legs;
  if(typeof raw==="string"){try{raw=JSON.parse(raw)}catch{raw=null}}
  if(Array.isArray(raw)&&raw.length)return raw;
  const o=outcomeMap.get(String(b.outcome_id)),m=marketMap.get(String(b.market_id));
  return [{outcome_id:b.outcome_id,market_id:b.market_id,label:o?.label||"Ticket",
           market:m?.title||"DFL Sportsbook",odds_american:b.odds_american,status:b.status,
           provider_side:o?.provider_side,provider_line:m?.provider_line,accepted_line:m?.provider_line,
           provider_score:m?.provider_score,market_status:m?.status,closes_at:m?.closes_at,category:m?.category}];
}

const STATUS_PILL={won:"green",lost:"grey",void:"warn"};
function legMarketOpen(leg,market){const status=leg.market_status||market?.status,closes=leg.closes_at||market?.closes_at;return status==="open"&&(!closes||new Date(closes)>new Date())}
function legPulse(leg){
  if(leg.status==="won")return{tone:"is-ahead",text:"CASHED"};
  if(leg.status==="lost")return{tone:"is-behind",text:"MISSED"};
  if(leg.status==="void")return{tone:"",text:"VOID"};
  const line=Number(leg.accepted_line??leg.provider_line),score=Number(leg.provider_score),hasLine=Number.isFinite(line),hasScore=leg.provider_score!==null&&leg.provider_score!==undefined&&Number.isFinite(score);
  if(hasLine&&hasScore){const side=String(leg.provider_side||"").toLowerCase(),push=score===line,ahead=side==="over"?score>line:score<line;return{tone:push?"is-push":ahead?"is-ahead":"is-behind",text:`${score} / ${line} · ${push?"PUSH":ahead?"WINNING":"BEHIND"}`}}
  if(leg.market_status==="locked")return{tone:"is-live",text:"LIVE · AWAITING STAT"};
  return{tone:"",text:"NOT STARTED"};
}
function ticketCard(b,marketMap,outcomeMap){
  const legs=entryLegs(b,marketMap,outcomeMap);
  const multi=legs.length>1;
  const pulled=b.status==="void"&&!!b.cancelled_at;
  /* Pullable only while every market on the entry is still open. A locked leg
     makes a cancel a free look at a result, and the RPC refuses it too - this
     just avoids offering a button that is going to say no. */
  const canPull=b.status==="open"&&legs.every(l=>legMarketOpen(l,marketMap.get(String(l.market_id))));
  /*
    AN OPEN TICKET WITH NO ACTIONS HAS TO EXPLAIN ITSELF.

    Pull is refused once a leg locks and dismiss is refused while a ticket
    is open, so a locked ticket correctly offers neither button - and used
    to say nothing at all about why, which reads as the app having lost
    the ticket. Naming the blocking leg also tells the owner which of a
    six-pick is holding the rest of it up.
  */
  const blocking=b.status==="open"&&!canPull
    ? legs.map(l=>({leg:l,market:marketMap.get(String(l.market_id))})).find(({leg,market})=>!legMarketOpen(leg,market))
    : null;
  const stuck=!blocking?"" : (()=>{
    const m=blocking.market;
    const category=m?.category||blocking.leg.category;
    if((m?.source==="provider"||blocking.leg.provider_side)&&ACTIVE_BOOK_CATEGORIES.has(String(category||"")))return `${esc(blocking.leg.label)} is live. Automatic grading follows the final stat.`;
    if(!m)return "This line is gone from the board. The house has to void it to release your stake.";
    if(isGolf(m)||!isBookCategory(m))return `${esc(blocking.leg.label)} is on a retired line. The house has to void it to release your stake.`;
    return `${esc(blocking.leg.label)} has locked. Waiting on a ruling.`;
  })();
  const won=legs.filter(l=>l.status==="won").length;
  const pulses=legs.map(legPulse),live=pulses.some(p=>p.tone==="is-live"||p.tone==="is-ahead"||p.tone==="is-behind"||p.tone==="is-push"),behind=pulses.some(p=>p.tone==="is-behind"),ahead=pulses.some(p=>p.tone==="is-ahead")&&!behind;
  const label=pulled?"PULLED":multi&&(b.status==="won"||b.status==="lost")?`${won} OF ${legs.length}`
    :b.status==="won"?"PAID":b.status==="lost"?"LOST":b.status==="void"?"VOID"
      :live?(ahead?"WINNING":"SWEATING"):blocking?"AWAITING RESULT":"OPEN";
  return `<article class="card sb-ticket${multi?" is-entry":""}">
    <div class="card-title-row">
      <div>
        <small class="sb-ticket-kicker">${multi?`${legs.length}-pick entry`:esc(legs[0].market||"DFL Sportsbook")}</small>
        <strong>${multi?fmtOdds(b.odds_american):esc(legs[0].label||"Ticket")}</strong>
      </div>
      <span class="pill ${STATUS_PILL[b.status]||""}">${esc(label)}</span>
    </div>
    <ol class="sb-ticket-legs">${legs.map((l,i)=>{const pulse=pulses[i];return `
      <li class="sb-leg is-${esc(l.status||"open")}">
        <span class="sb-leg-mark" aria-hidden="true">${l.status==="won"?"&check;":l.status==="lost"?"&times;":i+1}</span>
        <span class="sb-leg-body"><span class="sb-leg-pick">${esc(l.label)}</span><small>${esc(l.market||"")}</small><em class="sb-leg-pulse ${pulse.tone}">${esc(pulse.text)}</em></span>
        <strong class="sb-leg-odds">${fmtOdds(l.odds_american)}</strong>
      </li>`}).join("")}</ol>
    <div class="card-meta sb-ticket-foot">
      <span class="sb-ticket-figures">
        <span><b>${pulled?"Refunded":"Stake"}</b>${num(b.stake)}</span>
        <span class="sb-ticket-return${b.status==="lost"||b.status==="void"?" is-dead":""}"><b>${b.status==="won"?"Paid":b.status==="lost"?"Returned":b.status==="void"?"Void":"To return"}</b>${b.status==="lost"?"0":b.status==="void"?"—":num(b.potential_payout)}</span>
      </span>
      <span class="sb-ticket-actions">
        ${stuck?`<span class="sb-ticket-stuck">${stuck}</span>`:""}
        ${canPull?`<button type="button" class="linkbtn sb-pull" data-cancel-bet="${b.id}">Pull ticket</button>`:""}
        ${b.status!=="open"?`<button type="button" class="linkbtn" data-dismiss-bet="${b.id}">Dismiss</button>`:""}
        <button type="button" class="linkbtn" data-share-ticket="${b.id}">Share card</button>
      </span>
    </div>
  </article>`;
}

/*
  The queue is open by default and says what each line is, because a market
  the board no longer offers is not going to be found by browsing. Voiding
  every retired line at once is offered as one button: the golf board was
  removed wholesale, so clearing it one market at a time is busywork that
  leaves other members' stakes stranded for however long it takes.
*/
function rulingQueue(markets,byMarket){
  const retired=markets.filter(m=>isGolf(m)||!isBookCategory(m));
  return `<details class="card sb-rulings" open><summary class="card-title">Needs a ruling · ${markets.length}</summary><div class="card-body">
    ${retired.length?`<div class="sb-ruling-bulk"><p>${retired.length} line${retired.length===1?"":"s"} the board no longer offers${retired.some(isGolf)?", including golf":""}. Voiding refunds every open ticket on them.</p><button type="button" class="btn small" data-void-retired="${esc(retired.map(m=>m.id).join(","))}">Void all ${retired.length} &amp; refund</button></div>`:""}
    ${markets.map(m=>{
      const os=byMarket.get(String(m.id))||[];
      const why=isGolf(m)?"Golf · off the board":!isBookCategory(m)?`${esc(m.category||"Other")} · off the board`:m.status==="locked"?"Locked · awaiting a ruling":"Closed · awaiting a ruling";
      return `<div class="sb-ruling"><small class="sb-ruling-why">${why}</small><strong>${esc(m.title)}</strong><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${os.map(o=>`<button type="button" class="btn small" data-settle-market="${m.id}" data-settle-outcome="${o.id}">${esc(o.label)} won</button>`).join("")}<button type="button" class="linkbtn" data-void-market="${m.id}">Void + refund</button></div></div>`;
    }).join("")}
  </div></details>`;
}
/*
  OPEN BY DEFAULT FOR THE PERSON WHO OWNS IT.

  This was a collapsed <details> titled "Commissioner window", sitting below the
  leaderboard and the receipts - so the one screen in the app that can open a
  betting line looked like it could not, and the person who asked for the
  feature had it all along. A commissioner is here to book. Nobody else ever
  sees it: canBook gates the whole thing.
*/
function commissionerBook(){return `<details class="card sb-book" open><summary class="card-title">Open a line</summary><form class="card-body" id="sportsbook-market-form"><label for="book-title">Market</label><input id="book-title" maxlength="120" required placeholder="Market title"><label for="book-category">Category</label><select id="book-category"><option>Fantasy</option><option>DFL Life</option><option>Marvel</option><option>Gaming</option></select><label for="book-close">Closes</label><input id="book-close" type="datetime-local"><label for="book-note">House note</label><input id="book-note" maxlength="180" placeholder="Optional"><p class="muted tiny">American odds, like -110 or +150. Two outcomes minimum, the third optional.</p><div class="section-head"><h3>Outcomes</h3></div>${outcomeInput(1,"YES","-110")}${outcomeInput(2,"NO","-110")}${outcomeInput(3,"","")}<div class="row-end"><button class="btn" type="submit">Open market</button></div></form></details>`}
function refreshFeedControl(status={}){const objects=Number(status.monthlyEventObjects)||0,last=status.lastSuccessAt?fmtTime(status.lastSuccessAt):"not synced";return `<div class="sb-feed-control"><div><small>NFL FEED</small><span>Matchups, real prop lines + settlement</span></div><button type="button" class="btn small" id="sb-feed-refresh">Sync lines</button><p id="sb-feed-status" class="muted tiny" aria-live="polite">Last ${esc(last)} · ${objects} API event objects this month${status.lastError?` · ${esc(status.lastError)}`:""}</p></div>`}
function outcomeInput(n,label,odds){return `<div class="row" style="gap:8px"><input data-book-label="${n}" maxlength="60" placeholder="Outcome ${n}" value="${esc(label)}" ${n<3?"required":""}><input data-book-odds="${n}" inputmode="numeric" placeholder="-110" value="${esc(odds)}" style="max-width:100px" ${n<3?"required":""}></div>`}

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

/*
  PULL, DISMISS, SHARE - the three things you can do to a ticket you hold.

  PULL refunds the stake and is refused by the database once any leg's market
  has locked. DISMISS only hides a graded ticket from this list; the row and
  every SIN it moved stay in Receipts, which is why it does not ask for
  confirmation and pulling does.
*/
function wireTicketActions(view,marketMap,outcomeMap,me){
  const betById=id=>(view.__bets||[]).find(b=>String(b.id)===String(id));

  view.querySelectorAll("[data-share-ticket]").forEach(btn=>btn.addEventListener("click",async()=>{
    const bet=betById(btn.dataset.shareTicket);
    if(!bet){toast("That ticket is no longer on screen",true);return}
    btn.disabled=true;
    try{
      await shareTicket({bet,legs:entryLegs(bet,marketMap,outcomeMap),member:me});
    }catch(err){
      toast(err?.message||"Could not build that card",true);
    }finally{
      btn.disabled=false;
    }
  }));

  view.querySelectorAll("[data-cancel-bet]").forEach(btn=>btn.addEventListener("click",async()=>{
    const bet=betById(btn.dataset.cancelBet);
    const stake=num(bet?.stake);
    if(!confirm(`Pull this ticket and take the ${stake} SIN back?`))return;
    btn.disabled=true;
    try{
      const{data,error}=await db().rpc("sportsbook_cancel_bet",{target_bet_id:Number(btn.dataset.cancelBet)});
      if(error)throw error;
      toast(`+${num(data??bet?.stake)} SIN refunded`);
      render(view);
    }catch(err){
      btn.disabled=false;
      toast(needsMigration(err)?MIGRATE:(err.message||"Could not pull that ticket"),true);
    }
  }));

  view.querySelectorAll("[data-dismiss-bet]").forEach(btn=>btn.addEventListener("click",async()=>{
    btn.disabled=true;
    try{
      const{error}=await db().rpc("sportsbook_dismiss_bet",{target_bet_id:Number(btn.dataset.dismissBet)});
      if(error)throw error;
      toast("Cleared. It stays in Receipts.");
      render(view);
    }catch(err){
      btn.disabled=false;
      toast(needsMigration(err)?MIGRATE:(err.message||"Could not clear that ticket"),true);
    }
  }));
}

function wireBookTabs(view) {
  const tabs=[...view.querySelectorAll('[data-sb-tab]')];
  const select=tab=>{for(const button of tabs){const active=button===tab;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;view.querySelector('#sb-'+button.dataset.sbTab).hidden=!active;}};
  tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[next]);tabs[next].focus();});});
}

function wireProductTabs(view){
  const tabs=[...view.querySelectorAll("[data-sb-product]")];
  tabs.forEach(tab=>tab.addEventListener("click",()=>{for(const item of tabs){const active=item===tab;item.setAttribute("aria-selected",String(active));view.querySelector(`#sb-${item.dataset.sbProduct}-panel`).hidden=!active}}));
}

function wireFeedRefresh(view){
  const button=view.querySelector("#sb-feed-refresh");if(!button)return;
  button.addEventListener("click",async()=>{const status=view.querySelector("#sb-feed-status");button.disabled=true;if(status)status.textContent="Pulling matchups and prop lines…";
    const{data,error}=await edge().functions.invoke("sync-sportsbook-feed",{body:{action:"sync"},headers:privilegedFunctionHeaders()});
    if(error||data?.ok===false){button.disabled=false;if(status)status.textContent=data?.error||error?.message||"Feed unavailable";return}
    toast(`${data.cached?"Cached · ":""}${Number(data.games||0)} games · ${Number(data.props||0)} props · ${Number(data.teamTotals||0)} totals · ${Number(data.billedEventObjects||0)} new API objects`);render(view);
  });
}

// ---------------------------------------------------------------------
// THE SLIP
// ---------------------------------------------------------------------
/*
  THE REVIEW STEP IS NOT DECORATION.

  Submitting the form the first time only re-labels the button; the second
  press places. On a parlay that matters more than it did on a single - the
  combined price of six legs is a number nobody can sanity-check at a glance,
  so there is one deliberate beat between "that looks right" and the SIN
  leaving the wallet.

  And before it leaves, every leg is re-read from the database. A commissioner
  can move a line or close a market while the slip is open, and a member is
  entitled to see the price they are actually getting rather than the one that
  was on screen when they started.
*/
function openSlip(view,outcomeMap,marketMap,wallet,refresh){
  view.querySelector(".sb-slip")?.remove();
  let picks=slip.map(id=>outcomeMap.get(String(id))).filter(Boolean);
  if(!picks.length){toast("Choose a line first",true);return}

  const available=Number(wallet?.balance||0);
  const dialog=document.createElement("dialog");
  dialog.className="sb-slip";
  dialog.setAttribute("aria-labelledby","sb-slip-title");
  dialog.innerHTML=`<form novalidate>
    <div class="sb-slip-head"><h2 id="sb-slip-title">Bet slip</h2><button type="button" class="linkbtn" data-close>Close</button></div>
    <ol class="sb-slip-picks" data-picks></ol>
    <div class="sb-slip-price"><span>Combined price</span><strong data-combined>—</strong></div>
    <div class="sb-slip-fields">
      <label>Stake <span>SIN</span><input name="stake" inputmode="numeric" autocomplete="off" value="${Math.min(50,available)||""}" aria-describedby="sb-slip-error"></label>
      <div><span>Estimated return</span><output data-return aria-live="polite">—</output></div>
    </div>
    <p class="sb-slip-available">${num(available)} SIN available &middot; Return includes your stake</p>
    <p id="sb-slip-error" role="status"></p>
    <button type="submit" class="btn sb-slip-submit">Review bet</button>
  </form>`;
  view.append(dialog);

  const form=dialog.querySelector("form"),input=form.elements.stake;
  const submit=dialog.querySelector('[type="submit"]'),status=dialog.querySelector("#sb-slip-error");
  let reviewed=false,busy=false;

  /* Closing repaints the board rather than reloading it: dropping picks in
     here has to show up out there, and nothing in the database moved. */
  const close=()=>{if(busy)return;dialog.close();dialog.remove();refresh()};
  dialog.querySelector("[data-close]").addEventListener("click",close);
  dialog.addEventListener("cancel",event=>{event.preventDefault();close()});

  const paint=()=>{
    reviewed=false;
    dialog.querySelector("[data-picks]").innerHTML=picks.map((o,i)=>`
      <li class="sb-slip-pick">
        <span class="sb-slip-index" aria-hidden="true">${i+1}</span>
        <span class="sb-slip-pick-body"><strong>${esc(o.label)}</strong><small>${esc(marketMap.get(String(o.market_id))?.title||"")}</small></span>
        <strong class="sb-slip-pick-odds" data-price="${o.id}">${fmtOdds(o.odds_american)}</strong>
        ${picks.length>1?`<button type="button" class="sb-slip-drop" data-drop="${o.id}" aria-label="Remove ${esc(o.label)}">&times;</button>`:""}
      </li>`).join("");
    const combined=combineOdds(picks.map(o=>Number(o.odds_american)));
    dialog.querySelector("[data-combined]").textContent=combined===null?"—":fmtOdds(combined);
    const stake=parseStake(input.value,available);
    const payout=stake===null?null:entryReturn(stake,picks.map(o=>Number(o.odds_american)));
    dialog.querySelector("[data-return]").textContent=payout===null?"—":`${num(payout)} SIN`;
    submit.textContent=picks.length===1?"Review bet":`Review ${picks.length}-pick entry`;
    status.textContent=picks.length>1?"Every pick has to land.":"";
    dialog.querySelectorAll("[data-drop]").forEach(btn=>btn.addEventListener("click",()=>{
      const id=String(btn.dataset.drop);
      picks=picks.filter(o=>String(o.id)!==id);
      slip=slip.filter(x=>String(x)!==id);
      if(!picks.length){close();return}
      paint();
    }));
  };
  input.addEventListener("input",paint);
  paint();
  dialog.showModal();
  input.focus();input.select();

  form.addEventListener("submit",async event=>{
    event.preventDefault();
    if(busy)return;
    const stake=parseStake(input.value,available);
    if(stake===null){status.textContent="Enter a whole SIN amount within your available balance.";input.focus();return}
    if(!reviewed){
      reviewed=true;
      status.textContent=picks.length>1
        ? `All ${picks.length} picks have to land. Confirm to place it.`
        : "Review your selection and stake, then confirm.";
      submit.textContent=`Confirm ${num(stake)} SIN ${picks.length>1?`${picks.length}-pick entry`:"bet"}`;
      return;
    }
    busy=true;submit.disabled=true;input.disabled=true;
    status.textContent="Checking the latest lines…";
    try{
      const ids=picks.map(o=>o.id);
      const[priceResult,marketResult]=await Promise.all([
        db().from("sportsbook_outcomes").select("*").in("id",ids),
        db().from("sportsbook_markets").select("*").in("id",picks.map(o=>o.market_id))
      ]);
      if(priceResult.error||marketResult.error)throw priceResult.error||marketResult.error;
      const latest=new Map((priceResult.data||[]).map(o=>[String(o.id),o]));
      const live=new Map((marketResult.data||[]).map(m=>[String(m.id),m]));

      const shut=picks.find(o=>{const m=live.get(String(o.market_id));return !m||!isOpen(m)});
      if(shut)throw new Error(`${live.get(String(shut.market_id))?.title||"A market"} has closed. Nothing was placed.`);

      const moved=picks.filter(o=>{
        const now=latest.get(String(o.id));
        return !now||Number(now.odds_american)!==Number(o.odds_american)||now.label!==o.label;
      });
      if(moved.length){
        picks=picks.map(o=>latest.get(String(o.id))||o);
        slip=picks.map(o=>String(o.id));
        busy=false;submit.disabled=false;input.disabled=false;
        paint();
        status.textContent=`${moved.length===1?"A line":`${moved.length} lines`} moved. Review the new price before confirming.`;
        return;
      }

      status.textContent="Placing your entry…";
      const{error}=await db().rpc("sportsbook_place_entry",{entry_outcome_ids:ids.map(Number),sin_stake:stake});
      if(error)throw error;
      slip=[];
      dialog.close();dialog.remove();
      toast(picks.length>1?`${picks.length}-pick entry confirmed`:"Ticket confirmed");
      await render(view);
    }catch(error){
      /* A database still on the old schema can take a single the old way. It
         cannot take a parlay at all, and saying so beats a silent failure. */
      if(needsMigration(error)){
        if(picks.length===1){
          try{
            const{error:legacy}=await db().rpc("sportsbook_place_bet",{target_outcome_id:Number(picks[0].id),sin_stake:stake});
            if(legacy)throw legacy;
            slip=[];
            dialog.close();dialog.remove();
            toast("Ticket confirmed");
            await render(view);
            return;
          }catch(fallback){error=fallback}
        }else{
          error=new Error(`Multi-pick entries need the new tables. ${MIGRATE}`);
        }
      }
      reviewed=false;
      submit.textContent=picks.length===1?"Review bet":`Review ${picks.length}-pick entry`;
      status.textContent=error.message||"Could not confirm. Check My bets before trying again.";
    }finally{
      busy=false;submit.disabled=false;input.disabled=false;
    }
  });
}

function wireCommissioner(view){const form=view.querySelector("#sportsbook-market-form");form?.addEventListener("submit",async e=>{e.preventDefault();const os=[1,2,3].map(n=>({label:form.querySelector(`[data-book-label="${n}"]`)?.value.trim()||"",odds:Number(form.querySelector(`[data-book-odds="${n}"]`)?.value.trim()||0)})).filter(o=>o.label);if(os.length<2||os.some(o=>!(o.odds<=-100||o.odds>=100))){toast("Use American odds like -110 or +150",true);return}const closes=form.querySelector("#book-close").value,btn=form.querySelector('button[type="submit"]');btn.disabled=true;try{const{error}=await db().rpc("sportsbook_create_market",{market_title:form.querySelector("#book-title").value.trim(),market_category:form.querySelector("#book-category").value,market_source:"commissioner",market_closes_at:closes?new Date(closes).toISOString():null,market_lore_note:form.querySelector("#book-note").value.trim(),market_outcomes:os});if(error)throw error;toast("Market open");render(view)}catch(err){toast(err.message||"Could not open that market",true);btn.disabled=false}});view.querySelectorAll("[data-settle-market]").forEach(btn=>btn.addEventListener("click",async()=>{const label=btn.textContent.replace(/ won$/i,"").trim();if(!confirm(`Settle with ${label} as the winner?`))return;btn.disabled=true;try{const{error}=await db().rpc("sportsbook_settle_market",{target_market_id:Number(btn.dataset.settleMarket),winning_outcome_id:Number(btn.dataset.settleOutcome)});if(error)throw error;toast("Market settled");render(view)}catch(err){toast(err.message||"Could not settle that market",true);btn.disabled=false}}));view.querySelectorAll("[data-void-market]").forEach(btn=>btn.addEventListener("click",async()=>{if(!confirm("Void this market and refund open tickets?"))return;btn.disabled=true;try{const{error}=await db().rpc("sportsbook_void_market",{target_market_id:Number(btn.dataset.voidMarket)});if(error)throw error;toast("Market voided");render(view)}catch(err){toast(err.message||"Could not void that market",true);btn.disabled=false}}));
  /*
    CLEARING A RETIRED BOARD, ONE CONFIRMATION.

    Sequential rather than Promise.all: each void writes wallets and the
    ledger for every open ticket on its market, and a failure halfway
    through should stop and report how far it got rather than firing the
    rest anyway. Voids are independent, so the ones that landed stay
    landed and the button can simply be pressed again.
  */
  view.querySelectorAll("[data-void-retired]").forEach(btn=>btn.addEventListener("click",async()=>{
    const ids=String(btn.dataset.voidRetired||"").split(",").filter(Boolean);
    if(!ids.length)return;
    if(!confirm(`Void ${ids.length} retired line${ids.length===1?"":"s"} and refund every open ticket on them?`))return;
    btn.disabled=true;
    let done=0;
    try{
      for(const id of ids){
        const{error}=await db().rpc("sportsbook_void_market",{target_market_id:Number(id)});
        if(error)throw error;
        done+=1;
      }
      toast(`${done} line${done===1?"":"s"} voided and refunded`);
    }catch(err){
      toast(done?`${done} of ${ids.length} voided, then: ${err.message||"failed"}`:(err.message||"Could not void those lines"),true);
    }
    render(view);
  }));}
