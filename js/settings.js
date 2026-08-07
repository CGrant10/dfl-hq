// =====================================================================
// settings.js - league preferences that live in the database.
// ---------------------------------------------------------------------
// One key/value table, read once per page load. Anything a commissioner
// sets that is not really "content" belongs here: the dashboard logo
// today, hidden cards and similar next.
//
// A missing table is NOT an error. Somebody who has not run
// settings_schema.sql yet just gets the defaults, so the app keeps working
// and nothing has to be run in a particular order.
// =====================================================================

import { db } from "./supabase.js";

let cache = null;

/** All settings as a Map. Empty if the table is missing. */
export async function loadSettings({ force = false } = {}) {
  if (cache && !force) return cache;

  const { data, error } = await db().from("app_settings").select("key, value");
  if (error) {
    // Table not created yet, or unreadable - defaults are a fine answer.
    console.warn("Settings unavailable, using defaults:", error.message);
    cache = new Map();
    return cache;
  }

  cache = new Map((data || []).map((r) => [r.key, r.value]));
  return cache;
}

/** Write one setting. Admin only - the database enforces that. */
export async function saveSetting(key, value) {
  const { error } = await db().from("app_settings")
    .upsert({ key, value: value ?? "", updated_at: new Date().toISOString() },
            { onConflict: "key" });
  if (error) throw error;
  cache = null;                       // next read comes from the database
}

export const KEY_LOGO = "dashboard_logo";
