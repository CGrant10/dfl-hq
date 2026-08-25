/*
  VIEW AS MEMBER.

  A commissioner needs to see the app the way everybody else sees it, and the
  old way to do that was to log out, look, and log back in. This is one tap in
  the top bar.

  The gate itself lives in supabase.js: while the preview is on, every
  privileged accessor answers false AND db() hands back the public client, so a
  write is refused by Postgres rather than merely hidden by the UI. Nothing in
  this file decides what is allowed - it only offers the switch and makes it
  impossible to forget it is on.
*/
import { canPreviewAsMember, isMemberPreview, setMemberPreview } from "./supabase.js";
import { renderRoute } from "./router.js";
import { toast } from "./ui.js";

const STYLE_ID = "dfl-member-preview-style";

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
.dfl-preview-toggle{display:none;align-items:center;gap:6px;min-height:32px;margin-left:auto;padding:5px 10px;border:1px solid var(--control-line,rgba(255,255,255,.28));border-radius:999px;background:var(--control-bg,rgba(255,255,255,.08));color:var(--text,#fff);font:900 10px/1 inherit;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap}
.dfl-preview-toggle.is-available{display:inline-flex}
.dfl-preview-toggle .dfl-preview-dot{width:7px;height:7px;border-radius:50%;background:var(--accent,#ffd400)}
.dfl-preview-toggle[aria-pressed="true"]{border-color:#ffd400;background:#ffd40021;color:#ffd400}
/* Impossible to leave on by accident: the whole app carries a marker while it
   is live, and the strip sits above everything the page can draw. */
body.is-member-preview{--dfl-preview-strip:26px}
body.is-member-preview::before{content:"Viewing as a member";position:fixed;z-index:9000;top:0;left:0;right:0;height:var(--dfl-preview-strip);display:grid;place-items:center;background:#ffd400;color:#08111d;font:900 10px/1 system-ui,inherit;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;pointer-events:none}
body.is-member-preview .topbar{margin-top:var(--dfl-preview-strip)}
@media(max-width:420px){.dfl-preview-toggle{padding:5px 8px}.dfl-preview-toggle .dfl-preview-label{display:none}}
`;
  document.head.appendChild(style);
}

function button() {
  return document.querySelector("[data-dfl-preview-toggle]");
}

function paint() {
  const node = button();
  if (!node) return;
  const available = canPreviewAsMember();
  const on = isMemberPreview();
  node.classList.toggle("is-available", available);
  node.setAttribute("aria-pressed", String(on));
  node.hidden = !available;
  node.querySelector(".dfl-preview-label").textContent = on ? "Member view" : "View as member";
  node.title = on
    ? "You are seeing the app as a member. Tap to get your commissioner tools back."
    : "See the app the way a member sees it. Your access is kept and one tap brings it back.";
  document.body.classList.toggle("is-member-preview", on);
}

function toggle() {
  if (!canPreviewAsMember()) return;
  const on = setMemberPreview(!isMemberPreview());
  paint();
  /* Every page reads the gates while it renders, so the current one has to be
     drawn again before any of this is visible. */
  void renderRoute();
  toast(on ? "Viewing as a member" : "Commissioner tools are back");
}

export function refreshMemberPreview() {
  ensureStyles();
  paint();
}

export function mountMemberPreview() {
  const bar = document.querySelector(".topbar-inner");
  const whoami = document.getElementById("whoami");
  if (!bar || button()) return refreshMemberPreview();
  ensureStyles();
  const node = document.createElement("button");
  node.type = "button";
  node.className = "dfl-preview-toggle";
  node.dataset.dflPreviewToggle = "";
  node.hidden = true;
  node.setAttribute("aria-pressed", "false");
  node.innerHTML = `<span class="dfl-preview-dot" aria-hidden="true"></span><span class="dfl-preview-label">View as member</span>`;
  node.addEventListener("click", toggle);
  bar.insertBefore(node, whoami || null);
  /* Selecting a different member can hand commissioner access over or take it
     away, so the toggle has to re-decide whether it belongs on screen. */
  window.addEventListener("dfl:pick-member", () => setTimeout(refreshMemberPreview, 0));
  refreshMemberPreview();
}
