// =====================================================================
// Admin - Commissioner Access
// ---------------------------------------------------------------------
// The legacy shared Admin password remains the bootstrap/master key. This
// panel lets that master admin create or update per-member commissioner PINs
// and scoped permissions using the security-definer RPCs installed by
// commissioner_roles_schema.sql.
// =====================================================================

import { db } from "../supabase.js";
import { esc, toast } from "../ui.js";

const PERMISSIONS = [
  ["announcements", "Announcements"],
  ["calendar", "Calendar"],
  ["polls", "Polls"],
  ["keepers", "Keepers"],
  ["golf", "Golf"],
  ["sportsbook", "Sportsbook"],
  ["broadcast", "Broadcast / Stage"],
  ["fees", "Fees"],
  ["history", "History / Facts"],
  ["rules", "Rules"],
  ["members", "Members"],
  ["sleeper", "Sleeper Sync"],
];

export async function renderCommissionerPanel(root) {
  root.innerHTML = `<div class="card"><div class="card-body">Loading commissioner access…</div></div>`;

  let members = [];
  try {
    const { data, error } = await db().from("members")
      .select("id,display_name,team_name,active")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("display_name", { ascending: true });
    if (error) throw error;
    members = data || [];
  } catch (err) {
    root.innerHTML = `<div class="card note"><div class="card-body">${esc(err.message || "Could not load members")}</div></div>`;
    return;
  }

  if (!members.length) {
    root.innerHTML = `<div class="card"><div class="card-body">Add league members before assigning commissioner access.</div></div>`;
    return;
  }

  root.innerHTML = `
    <div class="section-head"><h2>Commissioner Access</h2></div>
    <div class="card note"><div class="card-body">
      Give a league member their own commissioner PIN and only the tools they should control.
      The Owner setting grants every permission and the ability to manage commissioner access.
    </div></div>

    <form class="card" id="commissioner-form">
      <label for="commissioner-member">League member</label>
      <select id="commissioner-member" required>
        ${members.map((m) => `<option value="${esc(m.id)}">${esc(m.display_name || m.team_name || `Member ${m.id}`)}</option>`).join("")}
      </select>

      <label for="commissioner-pin">New / reset PIN</label>
      <input id="commissioner-pin" type="password" inputmode="numeric" pattern="[0-9]*" minlength="4" required
        autocomplete="new-password" placeholder="At least 4 digits">
      <p class="muted">Saving always sets this member's PIN to the value above.</p>

      <label class="checkrow"><input type="checkbox" id="commissioner-owner"> <span><strong>Owner</strong><br><small class="muted">Full access, including managing commissioners.</small></span></label>

      <div class="section-head"><h3>Permissions</h3></div>
      <div class="checklist" id="commissioner-perms">
        ${PERMISSIONS.map(([key, label]) => `<label class="checkrow"><input type="checkbox" value="${esc(key)}"> <span>${esc(label)}</span></label>`).join("")}
      </div>

      <div class="row-end">
        <button type="button" class="btn danger ghost" id="commissioner-disable">Disable access</button>
        <button type="submit" class="btn">Save access</button>
      </div>
    </form>`;

  const form = root.querySelector("#commissioner-form");
  const member = root.querySelector("#commissioner-member");
  const pin = root.querySelector("#commissioner-pin");
  const owner = root.querySelector("#commissioner-owner");
  const permissionInputs = [...root.querySelectorAll("#commissioner-perms input[type=checkbox]")];

  const syncOwner = () => { permissionInputs.forEach((box) => { box.disabled = owner.checked; }); };
  owner.addEventListener("change", syncOwner);
  syncOwner();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const permissions = permissionInputs.filter((box) => box.checked).map((box) => box.value);
      const { error } = await db().rpc("save_commissioner", {
        target_member_id: Number(member.value),
        new_pin: pin.value,
        new_permissions: permissions,
        make_owner: owner.checked,
      });
      if (error) throw error;
      pin.value = "";
      toast(owner.checked ? "Owner access saved" : "Commissioner access saved");
    } catch (err) {
      toast(err.message || "Could not save commissioner access", true);
    } finally { submit.disabled = false; }
  });

  root.querySelector("#commissioner-disable").addEventListener("click", async () => {
    const chosen = members.find((m) => String(m.id) === String(member.value));
    const name = chosen?.display_name || chosen?.team_name || "this member";
    if (!confirm(`Disable commissioner access for ${name}?`)) return;
    try {
      const { error } = await db().rpc("disable_commissioner", { target_member_id: Number(member.value) });
      if (error) throw error;
      pin.value = "";
      owner.checked = false;
      permissionInputs.forEach((box) => { box.checked = false; });
      syncOwner();
      toast("Commissioner access disabled");
    } catch (err) { toast(err.message || "Could not disable commissioner access", true); }
  });
}
