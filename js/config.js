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

export const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

// Shown in the header and the install prompt.
export const LEAGUE_NAME = "DFL HQ";

// Bump this when you change any file, so phones pick up the new version.
export const APP_VERSION = "1.0.0";
