// =====================================================================
// Polls - one vote per league name per poll. Results show after you vote
// (and always, for closed polls).
// =====================================================================

import { db, insertRow } from "../supabase.js";
import { esc, empty, toArray, toast, errorBox } from "../ui.js";
import { getUsername } from "../store.js";

export async function render(view) {
  const username = getUsername();

  const [pollsRes, votesRes] = await Promise.all([
    db().from("polls").select("*").order("created_at", { ascending: false }),
    db().from("votes").select("poll_id, username, answer"),
  ]);

  if (pollsRes.error || votesRes.error) {
    view.innerHTML = errorBox(pollsRes.error || votesRes.error);
    return;
  }

  const polls = pollsRes.data || [];
  const votes = votesRes.data || [];

  if (!polls.length) {
    view.innerHTML = `<h1>Polls</h1>${empty("No polls yet. An admin can create one on the Admin page.")}`;
    return;
  }

  const open   = polls.filter((p) => p.active);
  const closed = polls.filter((p) => !p.active);

  view.innerHTML = `
    <h1>Polls</h1>
    ${username ? "" : `<div class="card accent"><div class="card-body">Set your league name in the top right before voting.</div></div>`}
    <div id="poll-list">
      ${open.length ? `<div class="section-head"><h2>Open</h2></div>${open.map((p) => pollCard(p, votes, username)).join("")}` : ""}
      ${closed.length ? `<div class="section-head"><h2>Closed</h2></div>${closed.map((p) => pollCard(p, votes, username)).join("")}` : ""}
    </div>
  `;

  // One listener for every vote button. #poll-list is rebuilt on each
  // render, so the listener never gets attached twice.
  view.querySelector("#poll-list").addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-poll]");
    if (!btn) return;

    if (!username) { toast("Set your league name first", true); return; }

    btn.disabled = true;
    try {
      await insertRow("votes", {
        poll_id: Number(btn.dataset.poll),
        username,
        answer: btn.dataset.answer,
      });
      toast("Vote counted");
      render(view);                       // redraw with the new totals
    } catch (err) {
      btn.disabled = false;
      // 23505 = unique violation: this name already voted on this poll.
      toast(err.code === "23505" ? "You already voted on this poll" : err.message, true);
    }
  });
}

function pollCard(poll, allVotes, username) {
  const options   = toArray(poll.options);
  const votes     = allVotes.filter((v) => v.poll_id === poll.id);
  const myVote    = votes.find((v) => v.username === username);
  const showResults = !poll.active || !!myVote;

  return `
    <div class="card ${poll.active ? "accent" : ""}">
      <div class="card-title">${esc(poll.question)}</div>
      <div class="card-meta" style="margin:0 0 10px">
        ${poll.active ? `<span class="pill green">Open</span>` : `<span class="pill grey">Closed</span>`}
        · ${votes.length} vote${votes.length === 1 ? "" : "s"}
      </div>

      ${showResults ? results(options, votes, myVote) : ballot(poll, options)}

      ${myVote ? `<div class="card-meta">You voted: <strong>${esc(myVote.answer)}</strong></div>` : ""}
      ${votes.length ? `<div class="card-meta">Voted: ${esc(votes.map((v) => v.username).join(", "))}</div>` : ""}
    </div>`;
}

function ballot(poll, options) {
  if (!options.length) return `<div class="muted tiny">This poll has no options yet.</div>`;
  return options.map((opt) => `
    <button class="option" data-poll="${poll.id}" data-answer="${esc(opt)}">${esc(opt)}</button>
  `).join("");
}

function results(options, votes, myVote) {
  const total = votes.length || 1;
  // Include write-in answers that are no longer in the options list.
  const labels = [...new Set([...options, ...votes.map((v) => v.answer)])];

  return labels.map((label) => {
    const count = votes.filter((v) => v.answer === label).length;
    const pct   = Math.round((count / total) * 100);
    const mine  = myVote?.answer === label;
    return `
      <div class="result ${mine ? "mine" : ""}">
        <div class="result-top"><span>${esc(label)}</span><span>${count} · ${pct}%</span></div>
        <div class="bar"><span style="width:${pct}%"></span></div>
      </div>`;
  }).join("");
}
