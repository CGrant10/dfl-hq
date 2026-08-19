// =====================================================================
// DFL Sportsbook - fake SIN, real DFL consequences.
// ---------------------------------------------------------------------
// Foundation release: bankroll, daily drip, open markets, betting, ledger,
// and leaderboard. League Lore will create data-driven lines in the next
// layer; this page already understands source="lore" when they arrive.
// =====================================================================
import { db } from "../supabase.js";
import { currentMember } from "../members.js";
import { esc, toast } from "../ui.js";

const fmtOdds = (n) => Number(n) > 0 ? `+${Number(n)}` : String(Number(n));
const fmtTime = (v) => v ? new Date(v).toLocaleString([], { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "";

export async function render(view) {
  const me = currentMember();
  if (!me) {
    view.innerHTML = `<h1>DFL Sportsbook</h1><div class="card"><div class="card-body">Pick your league member first. The house needs to know whose SIN it is taking.</div></div>`;
    return;
  }

  view.innerHTML = `<h1>DFL Sportsbook</h1><div class="card"><div class="card-body muted">Opening the book…</div></div>`;

  let wallet, ledger, leaders, markets, outcomes, bets;
  try {
    const touch = await db().rpc("sportsbook_touch_wallet");
    if (touch.error) throw touch.error;
    wallet = touch.data?.[0] || null;

    const [ledgerRes, leaderRes, marketRes, outcomeRes, betsRes] = await Promise.all([
      db().rpc("sportsbook_my_ledger", { row_limit: 12 }),
      db().rpc("sportsbook_leaderboard"),
      db().from("sportsbook_markets").select("*").order("created_at", { ascending:false }).limit(30),
      db().from("sportsbook_outcomes").select("*").order("sort_order"),
      db().rpc("sportsbook_my_bets", { row_limit: 20 }),
    ]);
    const err = ledgerRes.error || leaderRes.error || marketRes.error || outcomeRes.error || betsRes.error;
    if (err) throw err;
    ledger = ledgerRes.data || [];
    leaders = leaderRes.data || [];
    markets = marketRes.data || [];
    outcomes = outcomeRes.data || [];
    bets = betsRes.data || [];
  } catch (err) {
    view.innerHTML = `<h1>DFL Sportsbook</h1><div class="card note"><div class="card-body">
      The Sportsbook needs its database migration. Run <strong>sportsbook_schema.sql</strong> in Supabase, then come back here.
      <br><span class="muted tiny">${esc(err.message || String(err))}</span>
    </div></div>`;
    return;
  }

  const byMarket = new Map();
  for (const o of outcomes) {
    const k = String(o.market_id);
    if (!byMarket.has(k)) byMarket.set(k, []);
    byMarket.get(k).push(o);
  }
  const marketMap = new Map(markets.map((m) => [String(m.id), m]));
  const outcomeMap = new Map(outcomes.map((o) => [String(o.id), o]));
  const open = markets.filter((m) => m.status === "open" && (!m.closes_at || new Date(m.closes_at) > new Date()));

  view.innerHTML = `<div id="sportsbook-wrap">
    <header class="page-head"><div><h1>DFL Sportsbook</h1><p class="muted">Fake money. Real receipts.</p></div></header>

    <section class="card">
      <div class="card-title-row">
        <div><div class="card-title">Your bankroll</div><p class="muted tiny">${esc(me.display_name)} · 500 starting SIN · +50 every 24 hours</p></div>
        <strong style="font-size:28px;font-variant-numeric:tabular-nums">${Number(wallet?.balance || 0).toLocaleString()} SIN</strong>
      </div>
      <div class="row" style="margin-top:10px">
        ${Number(wallet?.credited || 0) > 0 ? `<span class="pill green">+${wallet.credited} daily SIN</span>` : ""}
        <span class="pill">Next drip ${esc(fmtTime(wallet?.next_daily_at))}</span>
      </div>
    </section>

    <section class="block">
      <h2 class="section-title">The board<span class="count">${open.length}</span></h2>
      ${open.length ? open.map((m) => marketCard(m, byMarket.get(String(m.id)) || [], bets)).join("") : `
        <div class="card"><div class="card-body">
          <strong>The windows are dark.</strong><br><span class="muted">No lines are open yet. League Lore odds and commissioner specials are the next layer.</span>
        </div></div>`}
    </section>

    ${bets.length ? `<section class="block"><h2 class="section-title">Your tickets</h2>${bets.slice(0,8).map((b) => {
      const m = marketMap.get(String(b.market_id)); const o = outcomeMap.get(String(b.outcome_id));
      return `<div class="card"><div class="card-title-row"><div><strong>${esc(o?.label || "Ticket")}</strong><div class="muted tiny">${esc(m?.title || "DFL Sportsbook")} · ${fmtOdds(b.odds_american)}</div></div><span class="pill ${b.status === "won" ? "green" : b.status === "lost" ? "grey" : ""}">${esc(b.status)}</span></div><div class="card-meta">${b.stake} SIN risked · ${b.potential_payout} SIN return</div></div>`;
    }).join("")}</section>` : ""}

    <section class="block"><h2 class="section-title">SIN leaderboard</h2>
      <div class="card"><div class="card-body">${leaders.length ? leaders.slice(0,12).map((r,i) => `<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${i+1}.</strong> ${esc(r.display_name)}</span><strong>${Number(r.balance).toLocaleString()} SIN</strong></div>`).join("") : `<span class="muted">The first bankroll has not been opened yet.</span>`}</div></div>
    </section>

    <section class="block"><h2 class="section-title">Ledger</h2>
      <div class="card"><div class="card-body">${ledger.length ? ledger.map((r) => `<div class="row" style="justify-content:space-between;padding:6px 0"><span><strong>${esc(r.note || r.kind)}</strong><br><span class="muted tiny">${esc(fmtTime(r.created_at))}</span></span><strong>${r.amount > 0 ? "+" : ""}${r.amount} SIN</strong></div>`).join("") : `<span class="muted">No SIN has moved yet.</span>`}</div></div>
    </section>

    <p class="muted tiny" style="text-align:center">SIN is DFL play money only. No cash value. The house remembers everything.</p>
  </div>`;

  view.querySelectorAll("[data-bet-outcome]").forEach((btn) => btn.addEventListener("click", async () => {
    const outcome = outcomeMap.get(String(btn.dataset.betOutcome));
    if (!outcome) return;
    const raw = prompt(`How much SIN on ${outcome.label} (${fmtOdds(outcome.odds_american)})?`, "50");
    if (raw == null) return;
    const stake = Number(String(raw).replace(/\D/g, ""));
    if (!Number.isInteger(stake) || stake < 1) { toast("Enter a valid SIN stake", true); return; }
    btn.disabled = true;
    try {
      const { error } = await db().rpc("sportsbook_place_bet", { target_outcome_id: Number(outcome.id), sin_stake: stake });
      if (error) throw error;
      toast("Ticket punched");
      render(view);
    } catch (err) {
      toast(err.message || "The house rejected that ticket", true);
      btn.disabled = false;
    }
  }));
}

function marketCard(m, outcomes, bets) {
  const mine = new Set((bets || []).filter((b) => String(b.market_id) === String(m.id) && b.status === "open").map((b) => String(b.outcome_id)));
  return `<article class="card">
    <div class="card-title-row"><div><span class="muted tiny">${esc(String(m.category || "DFL").toUpperCase())} · ${m.source === "lore" ? "LEAGUE LORE" : "COMMISSIONER SPECIAL"}</span><h3 class="card-heading" style="margin-top:3px">${esc(m.title)}</h3></div>${m.closes_at ? `<span class="pill">Closes ${esc(fmtTime(m.closes_at))}</span>` : ""}</div>
    ${m.lore_note ? `<p class="muted">${esc(m.lore_note)}</p>` : ""}
    <div style="display:grid;gap:8px;margin-top:10px">${outcomes.map((o) => `<button class="btn ghost" data-bet-outcome="${o.id}" style="display:flex;justify-content:space-between;align-items:center"><span>${esc(o.label)}${mine.has(String(o.id)) ? ` <small>· ticket open</small>` : ""}</span><strong>${fmtOdds(o.odds_american)}</strong></button>`).join("")}</div>
  </article>`;
}
