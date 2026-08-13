// =====================================================================
// sections.js - what every editable table looks like, in one place.
// ---------------------------------------------------------------------
// These specs used to live inside pages/admin.js, which is why editing
// only existed on the Admin page. They are now their own module, so both
// consumers can share them:
//
//   inline.js       the Edit / Delete / Add buttons that appear beside
//                   content on the normal pages when an admin is signed in
//   crud.js         the full-table manager, still used by the Admin page
//                   for the two structural lists (members, rule tabs)
//
// Add a field here and it shows up in the inline dialog, the admin
// manager, and the save - all three.
//
// Spec shape:
//   table     the Postgres table
//   singular  "rule"      - used in headings: Add rule / Edit rule
//   plural    "rules"     - used in empty states
//   label(r)  a one-line name for the row, shown in delete confirmations
//   sub(r)    optional second line for the admin manager list
//   fields    see form.js
// =====================================================================

import { teamOptions } from "./teams.js";
import { themeKeys, themeLabel } from "./arena/sprites.js";

/** Every Arena theme, for the event editor. */
const themeOptions = () => themeKeys().map((k) => ({ value: k, label: themeLabel(k) }));

const THIS_YEAR = new Date().getFullYear();

export const SECTIONS = [
  {
    id: "announcements", tab: "News",
    table: "announcements", singular: "announcement", plural: "announcements",
    label: (r) => r.title,
    sub:   (r) => (r.content || "").slice(0, 90),
    fields: [
      { name: "title",   label: "Title",   type: "text",     required: true, placeholder: "Draft is set" },
      { name: "content", label: "Message", type: "textarea", placeholder: "Details for the league…" },
    ],
  },
  {
    id: "polls", tab: "Polls",
    table: "polls", singular: "poll", plural: "polls",
    label: (r) => r.question,
    sub:   (r) => (r.active ? "Open" : "Closed"),
    fields: [
      { name: "question", label: "Question", type: "text", required: true,
        placeholder: "Should we run a March Madness bracket?" },
      { name: "options",  label: "Options (one per line)", type: "list", required: true,
        placeholder: "Yes\nNo\nMaybe" },
      { name: "active",   label: "Poll is open for voting", type: "checkbox", default: true },
    ],
  },
  {
    id: "arena_events", tab: "Arena",
    table: "arena_events", singular: "Arena event", plural: "Arena events",
    label: (r) => r.name,
    sub:   (r) => `${r.theme} · ${r.status}`,
    fields: [
      { name: "name",        label: "Event name", type: "text", required: true,
        placeholder: "2026 Draft Order" },
      { name: "description", label: "What is this for", type: "textarea",
        placeholder: "Winner picks first. Loser brings the beer." },
      /* Read off the themes themselves rather than typed out again. This
         list had already drifted from arena/sprites.js - a theme added
         there was invisible here, so nobody could choose it. */
      { name: "theme",       label: "Racer theme", type: "select",
        options: themeOptions() },
      { name: "race_length", label: "Race length", type: "select",
        options: [
          { value: "short",  label: "Short (~12s)" },
          { value: "medium", label: "Medium (~22s)" },
          { value: "long",   label: "Long (~36s)" },
          { value: "custom", label: "Custom" },
        ], default: "medium" },
      { name: "length_ticks", label: "Custom length in ticks (25 = 1 second)", type: "number" },
      { name: "event_date",  label: "Date", type: "date" },
      { name: "notes",       label: "Notes", type: "textarea" },
    ],
  },
  {
    id: "golf_outings", tab: "Golf",
    table: "golf_outings", singular: "outing", plural: "outings",
    label: (r) => r.name,
    sub:   (r) => `${r.course || "course TBD"} · ${r.status}`,
    fields: [
      { name: "name",   label: "Outing name", type: "text", required: true,
        placeholder: "DFL Draft Party Golf 2026" },
      { name: "course", label: "Course", type: "text", placeholder: "Hawktree" },
      { name: "event_date", label: "Date", type: "date" },
      { name: "holes",  label: "Holes", type: "number", default: 18 },
      { name: "status", label: "Status", type: "select",
        options: [
          { value: "setup",  label: "Setup" },
          { value: "active", label: "Live" },
          { value: "final",  label: "Final" },
        ], default: "setup" },
      { name: "notes",  label: "Notes", type: "textarea" },
    ],
  },
  {
    id: "rules", tab: "Rules",
    table: "rules", singular: "rule", plural: "rules",
    order: "sort_order", asc: true,
    label: (r) => `${r.title || "(untitled)"}`,
    sub:   (r) => `${r.category} · #${r.sort_order}`,
    fields: [
      { name: "category",   label: "Section", type: "select", required: true,
        optionsFrom: { table: "rule_categories", value: "key",
                       label: "label", order: "sort_order" } },
      { name: "title",      label: "Heading", type: "text", placeholder: "Trade deadline" },
      { name: "content",    label: "Text",    type: "textarea", required: true },
      { name: "sort_order", label: "Order within the section", type: "number", default: 1 },
    ],
  },
  {
    id: "rule_categories", tab: "Rule tabs",
    table: "rule_categories", singular: "rule tab", plural: "rule tabs",
    order: "sort_order", asc: true,
    label: (r) => r.label,
    sub:   (r) => `id: ${r.key}`,
    fields: [
      { name: "label", label: "Tab name (rename this freely)", type: "text",
        required: true, placeholder: "Draft Rules" },
      { name: "key",   label: "Permanent id — do not change once rules use it",
        type: "text", required: true, placeholder: "draft" },
      { name: "sort_order", label: "Tab order", type: "number", default: 10 },
    ],
  },
  {
    id: "keepers", tab: "Keepers",
    table: "keepers", singular: "keeper", plural: "keepers",
    order: "year", asc: false,
    label: (r) => `${r.player} — ${r.team}`,
    sub:   (r) => `${r.year} · ${r.round_cost != null ? "Round " + r.round_cost : "no cost set"}`,
    fields: [
      { name: "team",       label: "Team",        type: "text",   required: true, placeholder: "Slaw Squad" },
      { name: "player",     label: "Player",      type: "text",   required: true, placeholder: "Christian McCaffrey" },
      { name: "round_cost", label: "Round cost",  type: "number", placeholder: "2" },
      { name: "year",       label: "Season",      type: "number", required: true, default: THIS_YEAR },
      { name: "notes",      label: "Notes",       type: "textarea" },
    ],
  },
  {
    id: "events", tab: "Events",
    table: "events", singular: "event", plural: "events",
    order: "event_date", asc: true,
    label: (r) => r.title,
    sub:   (r) => r.event_date,
    fields: [
      { name: "title",       label: "Title", type: "text", required: true, placeholder: "Draft night" },
      { name: "event_date",  label: "Date",  type: "date", required: true },
      { name: "description", label: "Details", type: "textarea" },
    ],
  },
  {
    id: "history", tab: "History",
    table: "history", singular: "history entry", plural: "history entries",
    order: "year", asc: false,
    label: (r) => `${r.year} ${r.category}: ${r.winner}`,
    sub:   (r) => (r.notes || "").slice(0, 90),
    fields: [
      { name: "year",     label: "Year",     type: "number", required: true, default: THIS_YEAR - 1 },
      { name: "category", label: "Category", type: "select", required: true,
        options: ["Champion", "Runner Up", "Award", "Record", "Moment"] },
      { name: "winner",   label: "Who / what", type: "text", required: true, placeholder: "Slaw Squad" },
      { name: "notes",    label: "Notes",      type: "textarea" },
    ],
  },
  {
    id: "side_events", tab: "Side Events",
    table: "side_events", singular: "side event", plural: "side events",
    label: (r) => r.title,
    sub:   (r) => `${r.kind} · ${r.status}`,
    fields: [
      { name: "title",       label: "Title", type: "text", required: true, placeholder: "March Madness bracket" },
      { name: "kind",        label: "Type",  type: "select",
        options: ["Bracket", "Pick'em", "Survivor", "Other"] },
      { name: "status",      label: "Status", type: "select",
        options: ["Open", "Closed", "Finished"] },
      { name: "description", label: "Details", type: "textarea" },
      { name: "link",        label: "Link (optional)", type: "text", placeholder: "https://…" },
    ],
  },
  {
    id: "members", tab: "Members",
    table: "members", singular: "member", plural: "members",
    order: "display_name", asc: true,
    label: (r) => `${r.display_name}${r.team_name ? " — " + r.team_name : ""}`,
    sub:   (r) => `${r.active ? "active" : "inactive"}${r.championships ? ` · ${r.championships}× champ` : ""}`,
    fields: [
      { name: "display_name",  label: "Name shown in the picker", type: "text", required: true },
      { name: "team_name",     label: "Fantasy team name", type: "text" },
      { name: "sleeper_user_id", label: "Sleeper account (links career stats)", type: "select",
        optionsFrom: { table: "sleeper_users", value: "sleeper_user_id",
                       label: "display_name", order: "display_name" } },
      { name: "joined_year",   label: "Joined the league in", type: "number" },
      { name: "championships", label: "Championships", type: "number", default: 0 },
      { name: "awards",        label: "Awards (one per line)", type: "textarea",
        placeholder: "Highest scorer 2025\nBest trade 2024" },
      { name: "favorite_team", label: "Favourite team (app colour)", type: "select",
        options: teamOptions() },
      { name: "profile_image", label: "Profile image URL (optional)", type: "text" },
      { name: "notes",         label: "Notes", type: "textarea" },
      { name: "active",        label: "Show in the member picker", type: "checkbox", default: true },
      { name: "sort_order",    label: "Order in the list", type: "number", default: 0 },
    ],
  },
];

/** The spec for a table, or null if that table is not editable this way. */
export function specFor(table) {
  return SECTIONS.find((s) => s.table === table) || null;
}
