// =====================================================================
// DFL HQ - configuration
// ---------------------------------------------------------------------
// Paste your Supabase project values here.
// Find them at: Supabase dashboard -> Project Settings -> API
//
//   SUPABASE_URL       = "Project URL"
//   SUPABASE_ANON_KEY  = "anon / public" key
//
// The anon key is SAFE to publish. It is designed for browser apps, and
// Row Level Security (see schema.sql) is what actually protects your data.
// Never put the "service_role" key in here.
// =====================================================================

export const SUPABASE_URL = "https://rqavvpdbfdrwzalikkjg.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_I14JPQNBW-fhIwZ7WkBlAg_M9zolGNL";

// Shown in the header and the install prompt.
export const LEAGUE_NAME = "DFL HQ";

/*
  The league's first season.

  This matters because it is NOT where the data starts. The first two years
  were played on another app and nothing of them survives, so every figure
  computed from Sleeper - standings, records, champions - begins at
  FIRST_SYNCED_SEASON. The league's own age is counted from FOUNDED, so the
  app can say "10th season" without pretending it has ten seasons of stats.
*/
export const LEAGUE_FOUNDED = 2017;
export const FIRST_SYNCED_SEASON = 2019;

// Bump this when you change any file, so phones pick up the new version.
// MUST match CACHE_NAME in sw.js and version.txt - all three or none, or
// the in-app update button misfires.
export const APP_VERSION = "1.16.6";
