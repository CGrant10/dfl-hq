// =====================================================================
// League Finances - read only for members, edited from Admin -> Finances
//
// Nothing on this page is a stored total. Prize pool, remaining balances,
// payment status and every summary figure are calculated here from the
// raw rows, so the numbers can never drift out of step with each other.
//
//   prize pool        = buy-in x number of teams
//   remaining         = amount due - amount paid
//   status            = paid / partial / unpaid
//   remaining balance = collected - expenses - payouts
// =====================================================================

import { db } from "../supabase.js";
import { esc, empty, money, fmtDate, errorBox } from "../ui.js";

let season = null;   // remembered while the app stays open

export async function render(view) {
  const [seasonsRes, paymentsRes, payoutsRes, expensesRes, compsRes] = await Promise.all([
    db().from("finance_seasons").select("*").order("season", { ascending: false }),
    db().from("finance_payments").select("*").order("owner_name", { ascending: true }),
    db().from("finance_payouts").select("*").order("sort_order", { ascending: true }),
    db().from("finance_expenses").select("*").order("expense_date", { ascending: true }),
    db().from("finance_competitions").select("*").order("name", { ascending: true }),
  ]);

  const err = seasonsRes.error || paymentsRes.error || payoutsRes.error ||
              expensesRes.error || compsRes.error;
  if (err) {
    view.innerHTML = `<h1>League Finances</h1>` + errorBox(err) +
      `<div class="card"><div class="card-body muted">If a table is missing, run
       <strong>finance_schema.sql</strong> in the Supabase SQL editor.</div></div>`;
    return;
  }

  const all = {
    seasons:  seasonsRes.data  || [],
    payments: paymentsRes.data || [],
    payouts:  payoutsRes.data  || [],
    expenses: expensesRes.data || [],
    comps:    compsRes.data    || [],
  };

  // Every season that appears anywhere, newest first.
  const years = [...new Set([
    ...all.seasons.map((r) => r.season),
    ...all.payments.map((r) => r.season),
    ...all.payouts.map((r) => r.season),
    ...all.expenses.map((r) => r.season),
    ...all.comps.map((r) => r.season),
  ])].sort((a, b) => b - a);

  if (!years.length) {
    view.innerHTML = `<h1>League Finances</h1>${empty(
      "No financial records yet. An admin can set the buy-in from Admin → Finances.")}`;
    return;
  }

  if (!years.includes(season)) season = years[0];

  view.innerHTML = `
    <h1>League Finances</h1>
    <div class="tabs" id="fin-years">
      ${years.map((y) => `<button data-year="${y}" class="${y === season ? "on" : ""}">${y}</button>`).join("")}
    </div>
    <div id="fin-body"></div>
  `;

  const body = view.querySelector("#fin-body");
  const paint = () => { body.innerHTML = seasonView(all, season); };

  view.querySelector("#fin-years").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-year]");
    if (!btn) return;
    season = Number(btn.dataset.year);
    view.querySelectorAll("#fin-years button")
        .forEach((b) => b.classList.toggle("on", Number(b.dataset.year) === season));
    paint();
  });

  paint();
}

// ---------------------------------------------------------------------
// One season
// ---------------------------------------------------------------------

function seasonView(all, year) {
  const cfg      = all.seasons.find((s) => s.season === year);
  const payments = all.payments.filter((r) => r.season === year);
  const payouts  = all.payouts.filter((r) => r.season === year);
  const expenses = all.expenses.filter((r) => r.season === year);
  const comps    = all.comps.filter((r) => r.season === year);

  const buyIn     = Number(cfg?.buy_in || 0);
  const teams     = payments.length;
  const prizePool = buyIn * teams;

  const expected  = sum(payments, "amount_due");
  const collected = sum(payments, "amount_paid");
  const owed      = expected - collected;
  const spent     = sum(expenses, "amount");
  const paidOut   = sum(payouts, "amount");
  const remaining = collected - spent - paidOut;

  return `
    ${buyInCard(buyIn, teams, prizePool)}
    ${summaryCard({ expected, collected, owed, spent, paidOut, remaining })}
    ${paymentsCard(payments)}
    ${payoutsCard(payouts, prizePool)}
    ${compsCard(comps)}
    ${expensesCard(expenses)}
    ${cfg?.notes ? `<div class="card"><div class="card-title">Notes</div>
                    <div class="card-body">${esc(cfg.notes)}</div></div>` : ""}
  `;
}

function buyInCard(buyIn, teams, prizePool) {
  return `
    <div class="card accent">
      <div class="card-title">League buy-in</div>
      <div class="statgrid">
        ${stat("Buy-in", money(buyIn))}
        ${stat("Teams", teams)}
        ${stat("Prize pool", money(prizePool))}
      </div>
      <div class="card-meta">Prize pool is buy-in × teams, calculated automatically.</div>
    </div>`;
}

function summaryCard(t) {
  const negative = t.remaining < 0;
  return `
    <div class="card">
      <div class="card-title">Financial summary</div>
      <div class="statgrid">
        ${stat("Dues expected", money(t.expected))}
        ${stat("Collected", money(t.collected))}
        ${stat("Outstanding", money(t.owed), t.owed > 0 ? "warn" : "")}
        ${stat("Expenses", money(t.spent))}
        ${stat("Payouts", money(t.paidOut))}
        ${stat("Balance", money(t.remaining), negative ? "bad" : "good")}
      </div>
      <div class="card-meta">
        Balance = collected − expenses − payouts.
        ${negative ? `<strong class="warntext">More has been committed than collected.</strong>` : ""}
      </div>
    </div>`;
}

// ------------------------------- dues --------------------------------

function paymentsCard(rows) {
  if (!rows.length) {
    return `<div class="card"><div class="card-title">Dues</div>${empty("Nobody added yet.")}</div>`;
  }

  const paidCount = rows.filter((r) => statusOf(r).key === "paid").length;

  return `
    <div class="card">
      <div class="card-title">
        Dues <span class="pill ${paidCount === rows.length ? "green" : "grey"}">${paidCount}/${rows.length} paid</span>
      </div>
      <div class="tblwrap">
        <table class="tbl">
          <thead>
            <tr>
              <th>Owner</th><th>Team</th>
              <th class="num">Due</th><th class="num">Paid</th><th class="num">Left</th>
              <th>Status</th><th>Date</th><th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(paymentRow).join("")}
          </tbody>
        </table>
      </div>
    </div>`;
}

function paymentRow(r) {
  const s    = statusOf(r);
  const left = Number(r.amount_due || 0) - Number(r.amount_paid || 0);
  return `
    <tr>
      <td>${esc(r.owner_name)}</td>
      <td class="muted">${esc(r.team_name || "—")}</td>
      <td class="num">${money(r.amount_due)}</td>
      <td class="num">${money(r.amount_paid)}</td>
      <td class="num ${left > 0 ? "warntext" : ""}">${money(left)}</td>
      <td><span class="pill ${s.cls}">${s.label}</span></td>
      <td class="muted">${r.date_paid ? esc(fmtDate(r.date_paid)) : "—"}</td>
      <td class="muted">${esc(r.notes || "")}</td>
    </tr>`;
}

/** Paid / Partial / Unpaid, worked out from the two amounts. */
function statusOf(r) {
  const due  = Number(r.amount_due  || 0);
  const paid = Number(r.amount_paid || 0);
  if (paid >= due && due > 0) return { key: "paid",    label: "Paid",    cls: "green" };
  if (paid > 0)               return { key: "partial", label: "Partial", cls: "warn" };
  return { key: "unpaid", label: "Unpaid", cls: "red" };
}

// ------------------------------ payouts ------------------------------

function payoutsCard(rows, prizePool) {
  if (!rows.length) {
    return `<div class="card"><div class="card-title">Prize structure</div>${empty("No payouts set.")}</div>`;
  }

  const total = sum(rows, "amount");
  const left  = prizePool - total;

  return `
    <div class="card">
      <div class="card-title">Prize structure</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Payout</th><th>Winner</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${rows.map((p) => `
              <tr>
                <td>
                  ${esc(p.title)}
                  ${p.description ? `<div class="muted tiny">${esc(p.description)}</div>` : ""}
                </td>
                <td class="muted">${esc(p.winner || "—")}</td>
                <td class="num">${money(p.amount)}</td>
              </tr>`).join("")}
            <tr>
              <td colspan="2"><strong>Total payouts</strong></td>
              <td class="num"><strong>${money(total)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
      ${prizePool > 0 ? `<div class="card-meta">
        ${left === 0 ? "Payouts match the prize pool exactly."
          : left > 0 ? `${money(left)} of the prize pool is unallocated.`
          : `<span class="warntext">Payouts exceed the prize pool by ${money(-left)}.</span>`}
      </div>` : ""}
    </div>`;
}

// --------------------------- competitions ----------------------------

function compsCard(rows) {
  if (!rows.length) {
    return `<div class="card"><div class="card-title">Side competitions</div>${empty("None this season.")}</div>`;
  }

  return `
    <div class="card">
      <div class="card-title">Side competitions</div>
      ${rows.map((c) => {
        const pool = c.prize_pool != null
          ? Number(c.prize_pool)
          : Number(c.buy_in || 0) * Number(c.participants || 0);
        return `
          <div class="subcard">
            <div class="row" style="justify-content:space-between;align-items:baseline">
              <strong>${esc(c.name)}</strong>
              <span class="pill ${c.status === "Finished" ? "grey" : "green"}">${esc(c.status)}</span>
            </div>
            <div class="statgrid" style="margin:8px 0 4px">
              ${stat("Buy-in", money(c.buy_in))}
              ${stat("Players", c.participants)}
              ${stat("Pool", money(pool))}
            </div>
            ${c.winner ? `<div class="card-meta">Winner: <strong>${esc(c.winner)}</strong></div>` : ""}
            ${c.notes ? `<div class="muted tiny">${esc(c.notes)}</div>` : ""}
          </div>`;
      }).join("")}
    </div>`;
}

// ------------------------------ expenses -----------------------------

function expensesCard(rows) {
  if (!rows.length) {
    return `<div class="card"><div class="card-title">Expenses</div>${empty("Nothing spent yet.")}</div>`;
  }

  return `
    <div class="card">
      <div class="card-title">Expenses</div>
      <div class="tblwrap">
        <table class="tbl">
          <thead><tr><th>Item</th><th>Date</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${rows.map((x) => `
              <tr>
                <td>
                  ${esc(x.description)}
                  ${x.notes ? `<div class="muted tiny">${esc(x.notes)}</div>` : ""}
                </td>
                <td class="muted">${x.expense_date ? esc(fmtDate(x.expense_date)) : "—"}</td>
                <td class="num">${money(x.amount)}</td>
              </tr>`).join("")}
            <tr>
              <td colspan="2"><strong>Total</strong></td>
              <td class="num"><strong>${money(sum(rows, "amount"))}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>`;
}

// ------------------------------- bits --------------------------------

function stat(label, value, tone = "") {
  return `<div class="stat"><span class="stat-v ${tone}">${esc(value)}</span><span class="stat-l">${esc(label)}</span></div>`;
}

function sum(rows, key) {
  return rows.reduce((t, r) => t + Number(r[key] || 0), 0);
}
