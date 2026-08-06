// =====================================================================
// Polls - one vote per league name per poll.
//
// Everyone: vote once, then see the tallies. Closed polls always show
// results.
//
// Admins additionally get, inline on this page:
//   * who voted for each option
//   * an editor for the options themselves, after the poll is live
//   * open / close without leaving the page
//
// Permissions are unchanged for everyone else: the extras are hidden in
// the UI, and the database refuses the writes anyway.
// =====================================================================

import { db, insertRow, isAdmin } from "../supabase.js";
import { esc, empty, toArray, toast, errorBox } from "../ui.js";
import { getUsername } from "../store.js";

// Poll ids whose option editor is currently open.
const editing = new Set();

export async function render(view) {
  const username = getUsername();
  const admin = isAdmin();

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

  const head = `
    <header class="page-head">
      <h1>Polls</h1>
      <p class="page-sub">League votes. One vote each, and you can see where everyone landed.</p>
    </header>`;

  if (!polls.length) {
    view.innerHTML = head + empty("No polls yet. An admin can create one at Admin → Polls.");
    return;
  }

  const open   = polls.filter((p) => p.active);
  const closed = polls.filter((p) => !p.active);

  view.innerHTML = `
    ${head}
    ${username ? "" : `<div class="card note">
        <div class="card-body">Pick your name in the top right before voting.</div>
      </div>`}
    <div id="poll-list">
      ${open.length ? `
        <h2 class="section-title">Open<span class="count">${open.length}</span></h2>
        ${open.map((p) => pollCard(p, votes, username, admin)).join("")}` : ""}
      ${closed.length ? `
        <h2 class="section-title">Closed<span class="count">${closed.length}</span></h2>
        ${closed.map((p) => pollCard(p, votes, username, admin)).join("")}` : ""}
    </div>
  `;

  // #poll-list is rebuilt on every render, so this never doubles up.
  view.querySelector("#poll-list").addEventListener("click", (e) => {
    const voteBtn   = e.target.closest("button[data-poll]");
    const editBtn   = e.target.closest("button[data-edit-poll]");
    const cancelBtn = e.target.closest("button[data-cancel-poll]");
    const saveBtn   = e.target.closest("button[data-save-poll]");
    const toggleBtn = e.target.closest("button[data-toggle-poll]");

    if (voteBtn)   return castVote(view, voteBtn, username);
    if (editBtn)   { editing.add(editBtn.dataset.editPoll); return render(view); }
    if (cancelBtn) { editing.delete(cancelBtn.dataset.cancelPoll); return render(view); }
    if (saveBtn)   return saveOptions(view, saveBtn);
    if (toggleBtn) return togglePoll(view, toggleBtn);
  });
}

// ------------------------------- voting -------------------------------

async function castVote(view, btn, username) {
  if (!username) { toast("Pick your name first", true); return; }

  btn.disabled = true;
  try {
    await insertRow("votes", {
      poll_id: Number(btn.dataset.poll),
      username,
      answer: btn.dataset.answer,
    });
    toast("Vote counted");
    render(view);
  } catch (err) {
    btn.disabled = false;
    // 23505 = unique violation: this name already voted on this poll.
    toast(err.code === "23505" ? "You already voted on this poll" : err.message, true);
  }
}

// --------------------------- admin actions ----------------------------

async function saveOptions(view, btn) {
  const id = btn.dataset.savePoll;
  const box = view.querySelector(`#opts-${id}`);
  const options = box.value.split("\n").map((s) => s.trim()).filter(Boolean);

  if (!options.length) { toast("A poll needs at least one option", true); return; }

  btn.disabled = true;
  const { error } = await db().from("polls").update({ options }).eq("id", id);
  if (error) { toast(error.message, true); btn.disabled = false; return; }

  editing.delete(id);
  toast("Options updated");
  render(view);
}

async function togglePoll(view, btn) {
  const id = btn.dataset.togglePoll;
  const active = btn.dataset.active === "true";
  btn.disabled = true;

  const { error } = await db().from("polls").update({ active: !active }).eq("id", id);
  if (error) { toast(error.message, true); btn.disabled = false; return; }

  toast(active ? "Poll closed" : "Poll reopened");
  render(view);
}

// ------------------------------ drawing -------------------------------

function pollCard(poll, allVotes, username, admin) {
  const options = toArray(poll.options);
  const votes   = allVotes.filter((v) => v.poll_id === poll.id);
  const myVote  = votes.find((v) => v.username === username);
  const showResults = !poll.active || !!myVote;
  const isEditing = editing.has(String(poll.id));

  return `
    <article class="card poll ${poll.active ? "is-open" : ""}">
      <header class="poll-head">
        <h3 class="poll-q">${esc(poll.question)}</h3>
        <div class="meta-row">
          <span class="pill ${poll.active ? "green" : "grey"}">${poll.active ? "Open" : "Closed"}</span>
          <span class="muted tiny">${votes.length} vote${votes.length === 1 ? "" : "s"}</span>
        </div>
      </header>

      ${isEditing
        ? optionEditor(poll, options)
        : showResults
          ? results(options, votes, myVote, admin)
          : ballot(poll, options)}

      ${myVote && !isEditing
        ? `<p class="poll-you">You voted <strong>${esc(myVote.answer)}</strong></p>` : ""}

      ${admin && !isEditing ? `
        <footer class="poll-admin">
          <span class="admin-tag">Admin</span>
          <button class="btn ghost small" data-edit-poll="${poll.id}">Edit options</button>
          <button class="btn ghost small" data-toggle-poll="${poll.id}" data-active="${poll.active}">
            ${poll.active ? "Close poll" : "Reopen"}
          </button>
        </footer>` : ""}
    </article>`;
}

function ballot(poll, options) {
  if (!options.length) return `<p class="muted tiny">This poll has no options yet.</p>`;
  return `<div class="ballot">${options.map((opt) => `
    <button class="option" data-poll="${poll.id}" data-answer="${esc(opt)}">
      <span>${esc(opt)}</span>
    </button>`).join("")}</div>`;
}

/**
 * Tallies. Admins also get the list of names under each option.
 * Answers that are no longer in the option list still appear, so votes
 * are never hidden just because an option was renamed or removed.
 */
function results(options, votes, myVote, admin) {
  const total = votes.length || 1;
  const labels = [...new Set([...options, ...votes.map((v) => v.answer)])];

  return `<div class="results">${labels.map((label) => {
    const forThis = votes.filter((v) => v.answer === label);
    const pct  = Math.round((forThis.length / total) * 100);
    const mine = myVote?.answer === label;
    const gone = !options.includes(label);

    return `
      <div class="result ${mine ? "mine" : ""}">
        <div class="result-top">
          <span>${esc(label)}${gone ? ` <span class="muted tiny">(removed)</span>` : ""}</span>
          <span class="result-n">${forThis.length} · ${pct}%</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        ${admin && forThis.length
          ? `<div class="voters">${forThis.map((v) =>
              `<span class="voter">${esc(v.username)}</span>`).join("")}</div>`
          : ""}
      </div>`;
  }).join("")}</div>`;
}

function optionEditor(poll, options) {
  return `
    <div class="poll-editor">
      <label for="opts-${poll.id}">Options, one per line</label>
      <textarea id="opts-${poll.id}" rows="${Math.max(3, options.length + 1)}">${esc(options.join("\n"))}</textarea>
      <p class="muted tiny">
        Renaming an option does not move the votes already cast under the old
        wording — those keep showing, marked as removed.
      </p>
      <div class="row-end">
        <button class="btn ghost small" data-cancel-poll="${poll.id}">Cancel</button>
        <button class="btn small" data-save-poll="${poll.id}">Save options</button>
      </div>
    </div>`;
}
